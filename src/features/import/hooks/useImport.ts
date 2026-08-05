import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export type EntityType = 'projects' | 'tasks' | 'milestones';

export interface ColumnMap {
    csvColumn: string;
    dbField: string;
}

export interface ImportResult {
    success: number;
    errors: number;
    total: number;
    errorMessages: string[];
}

export function useImport() {
    const [rows, setRows] = useState<Record<string, any>[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const parseFile = useCallback(async (file: File): Promise<void> => {
        setError(null);
        setLoading(true);

        try {
            const ext = file.name.split('.').pop()?.toLowerCase();

            if (ext === 'csv') {
                return new Promise((resolve, reject) => {
                    Papa.parse(file, {
                        header: true,
                        skipEmptyLines: true,
                        dynamicTyping: true,
                        complete: (results) => {
                            if (results.data && results.data.length > 0) {
                                setColumns(results.meta.fields || []);
                                setRows(results.data as Record<string, any>[]);
                            }
                            resolve();
                        },
                        error: (err) => {
                            setError(`CSV parse error: ${err.message}`);
                            reject(err);
                        },
                    });
                });
            } else if (ext === 'xlsx' || ext === 'xls') {
                const buffer = await file.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                if (!sheetName) {
                    throw new Error('No sheets found in workbook');
                }
                const sheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, any>[];
                if (json.length > 0) {
                    setColumns(Object.keys(json[0]));
                    setRows(json);
                }
            } else {
                throw new Error('Unsupported file format. Use .csv, .xlsx, or .xls');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to parse file');
        } finally {
            setLoading(false);
        }
    }, []);

    const clear = useCallback(() => {
        setRows([]);
        setColumns([]);
        setError(null);
    }, []);

    const importData = useCallback(async (
        entityType: EntityType,
        columnMap: ColumnMap[],
    ): Promise<ImportResult> => {
        setLoading(true);
        setError(null);
        const result: ImportResult = { success: 0, errors: 0, total: rows.length, errorMessages: [] };

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            for (const row of rows) {
                const record: Record<string, any> = {};

                for (const map of columnMap) {
                    const val = row[map.csvColumn];
                    if (val === '' || val === undefined) continue;
                    record[map.dbField] = val;
                }

                if (entityType === 'projects') {
                    record.created_by = user.id;
                    // generate a simple name if missing
                    if (!record.name) record.name = `Imported Project ${Date.now()}`;
                }
                if (entityType === 'tasks') {
                    record.created_by = user.id;
                    if (entityType === 'tasks' && !record.project_id) {
                        result.errors++;
                        result.errorMessages.push(`Task "${record.title || 'unnamed'}" skipped: missing project_id`);
                        continue;
                    }
                }
                if (entityType === 'milestones') {
                    record.created_by = user.id;
                }

                const { error: insertError } = await supabase
                    .from(entityType)
                    .insert(record);

                if (insertError) {
                    result.errors++;
                    result.errorMessages.push(insertError.message);
                } else {
                    result.success++;
                }
            }
        } catch (err: any) {
            setError(err.message || 'Import failed');
            result.errors = rows.length;
            result.errorMessages.push(err.message);
        } finally {
            setLoading(false);
        }

        return result;
    }, [rows]);

    return { rows, columns, loading, error, parseFile, clear, importData };
}

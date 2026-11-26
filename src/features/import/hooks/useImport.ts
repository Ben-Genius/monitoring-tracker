import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
// papaparse and read-excel-file load only when someone picks a file, so they
// stay out of the Projects page that hosts the import button.
import { rowsToRecords } from '../utils/rowsToRecords';

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
                const { default: Papa } = await import('papaparse');
                await new Promise<void>((resolve, reject) => {
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
            } else if (ext === 'xlsx') {
                // read-excel-file reads the first sheet; it loads only when a file is picked.
                const { readSheet } = await import('read-excel-file/browser');
                const { columns, records } = rowsToRecords(await readSheet(file));
                if (records.length > 0) {
                    setColumns(columns);
                    setRows(records);
                }
            } else if (ext === 'xls') {
                throw new Error('Old .xls files can’t be read. In Excel, choose File → Save As → Excel Workbook (.xlsx), or save as CSV, then try again.');
            } else {
                throw new Error('Unsupported file format. Use .csv or .xlsx.');
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

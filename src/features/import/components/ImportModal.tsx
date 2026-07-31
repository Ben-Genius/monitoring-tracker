import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useImport, EntityType, ColumnMap } from '../hooks/useImport';

const DB_FIELDS: Record<EntityType, { field: string; label: string; required?: boolean }[]> = {
    projects: [
        { field: 'name', label: 'Project Name', required: true },
        { field: 'description', label: 'Description' },
        { field: 'company_id', label: 'Company ID', required: true },
        { field: 'status', label: 'Status' },
        { field: 'service_type', label: 'Service Type' },
        { field: 'contract_value', label: 'Contract Value (GHS)' },
        { field: 'actual_cost', label: 'Actual Cost (GHS)' },
        { field: 'expected_handover', label: 'Expected Handover' },
        { field: 'start_date', label: 'Start Date' },
    ],
    tasks: [
        { field: 'title', label: 'Task Title', required: true },
        { field: 'description', label: 'Description' },
        { field: 'project_id', label: 'Project ID', required: true },
        { field: 'stage', label: 'Stage' },
        { field: 'priority', label: 'Priority' },
        { field: 'assignee_id', label: 'Assignee ID' },
        { field: 'due_date', label: 'Due Date' },
        { field: 'estimated_hours', label: 'Est. Hours' },
        { field: 'actual_hours', label: 'Actual Hours' },
    ],
    milestones: [
        { field: 'name', label: 'Milestone Name', required: true },
        { field: 'description', label: 'Description' },
        { field: 'project_id', label: 'Project ID', required: true },
        { field: 'due_date', label: 'Due Date' },
        { field: 'completed_date', label: 'Completed Date' },
        { field: 'status', label: 'Status' },
    ],
};

const ENTITY_LABELS: Record<EntityType, string> = {
    projects: 'Projects',
    tasks: 'Tasks',
    milestones: 'Milestones',
};

interface ImportModalProps {
    open: boolean;
    onClose: () => void;
    onComplete?: (result: { success: number; errors: number }) => void;
}

export function ImportModal({ open, onClose, onComplete }: ImportModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { rows, columns, loading, error, parseFile, clear, importData } = useImport();
    const [entityType, setEntityType] = useState<EntityType>('projects');
    const [columnMap, setColumnMap] = useState<ColumnMap[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [result, setResult] = useState<{ success: number; errors: number } | null>(null);

    useEffect(() => {
        if (open) {
            clear();
            setResult(null);
        }
    }, [open]);

    const handleFile = async (file: File) => {
        await parseFile(file);
        setResult(null);
    };

    useEffect(() => {
        if (columns.length > 0) {
            const fields = DB_FIELDS[entityType];
            const autoMap: ColumnMap[] = [];
            for (const col of columns) {
                const match = fields.find(f =>
                    f.label.toLowerCase() === col.toLowerCase() ||
                    f.field.toLowerCase() === col.toLowerCase()
                );
                if (match) {
                    autoMap.push({ csvColumn: col, dbField: match.field });
                }
            }
            setColumnMap(autoMap);
        } else {
            setColumnMap([]);
        }
    }, [columns, entityType]);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleImport = async () => {
        const r = await importData(entityType, columnMap);
        setResult({ success: r.success, errors: r.errors });
        if (r.errors === 0) {
            setTimeout(() => {
                onClose();
                onComplete?.({ success: r.success, errors: 0 });
            }, 1500);
        }
    };

    const previewRows = rows.slice(0, 5);

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Import Data</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Entity type */}
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Import into</span>
                        <div className="flex gap-1.5">
                            {(Object.keys(ENTITY_LABELS) as EntityType[]).map(type => (
                                <button
                                    key={type}
                                    onClick={() => { setEntityType(type); clear(); setResult(null); }}
                                    className={cn(
                                        'px-4 py-2 rounded-xl text-xs font-bold transition-all border',
                                        entityType === type
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                    )}
                                >
                                    {ENTITY_LABELS[type]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {!rows.length ? (
                        /* Upload area */
                        <div
                            onDrop={handleDrop}
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all',
                                dragOver
                                    ? 'border-primary bg-primary/5'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                            )}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                className="hidden"
                                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                            />
                            <Upload className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                Drop your CSV or Excel file here
                            </p>
                            <p className="text-xs text-slate-400 mt-1">or click to browse</p>
                        </div>
                    ) : (
                        /* Preview + mapping */
                        <div className="space-y-6">
                            {loading && (
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                    Parsing file...
                                </div>
                            )}

                            {!loading && (
                                <>
                                    {/* File summary */}
                                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                        <div className="flex items-center gap-2 text-sm">
                                            <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                                            <span className="font-semibold text-slate-600">{rows.length} rows</span>
                                            <Badge variant="outline" className="text-[9px]">{columns.length} columns</Badge>
                                        </div>
                                        <button
                                            onClick={clear}
                                            className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Column mapping */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Column Mapping</h4>
                                        {columnMap.map((map, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className="flex-1">
                                                    <select
                                                        value={map.csvColumn}
                                                        onChange={e => {
                                                            const updated = [...columnMap];
                                                            updated[i] = { ...updated[i], csvColumn: e.target.value };
                                                            setColumnMap(updated);
                                                        }}
                                                        className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                                    >
                                                        {columns.map(col => (
                                                            <option key={col} value={col}>{col}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />
                                                <div className="flex-1">
                                                    <select
                                                        value={map.dbField}
                                                        onChange={e => {
                                                            const updated = [...columnMap];
                                                            updated[i] = { ...updated[i], dbField: e.target.value };
                                                            setColumnMap(updated);
                                                        }}
                                                        className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                                                    >
                                                        {DB_FIELDS[entityType].map(f => (
                                                            <option key={f.field} value={f.field}>
                                                                {f.label}{f.required ? ' *' : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={() => setColumnMap(prev => prev.filter((_, j) => j !== i))}
                                                    className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                        {columnMap.length < columns.length && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    const unmapped = columns.find(c => !columnMap.find(m => m.csvColumn === c));
                                                    if (unmapped) {
                                                        setColumnMap(prev => [...prev, { csvColumn: unmapped, dbField: '' }]);
                                                    }
                                                }}
                                                className="text-xs font-bold text-slate-400"
                                            >
                                                + Map another column
                                            </Button>
                                        )}
                                    </div>

                                    {/* Preview */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preview ({previewRows.length} rows)</h4>
                                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-slate-800">
                                                        {columns.map(col => (
                                                            <th key={col} className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                                                {col}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {previewRows.map((row, i) => (
                                                        <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                                                            {columns.map(col => (
                                                                <td key={col} className="px-3 py-2 text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                                                                    {String(row[col] ?? '')}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-xs text-red-600">
                                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    {result && (
                                        <div className={cn(
                                            'flex items-center gap-2 p-3 rounded-xl text-sm font-semibold',
                                            result.errors === 0
                                                ? 'bg-green-50 text-green-600'
                                                : 'bg-amber-50 text-amber-600'
                                        )}>
                                            {result.errors === 0 ? (
                                                <><CheckCircle2 className="h-4 w-4" /> {result.success} rows imported successfully</>
                                            ) : (
                                                <><AlertCircle className="h-4 w-4" /> {result.success} imported, {result.errors} errors</>
                                            )}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex justify-end gap-3 pt-2">
                                        <Button variant="outline" onClick={clear} className="rounded-xl text-xs font-bold">
                                            Start over
                                        </Button>
                                        <Button
                                            onClick={handleImport}
                                            disabled={loading || columnMap.filter(m => m.dbField).length === 0}
                                            className="rounded-xl text-xs font-bold"
                                        >
                                            {loading ? 'Importing...' : `Import ${rows.length} rows`}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

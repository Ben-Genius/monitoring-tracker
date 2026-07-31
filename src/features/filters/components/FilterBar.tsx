import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { FilterRule, useFilters } from '../hooks/useFilters';

interface FilterBarProps<T extends Record<string, any>> {
    filters: ReturnType<typeof useFilters<T>>;
    sortOptions?: { label: string; field: string }[];
    searchPlaceholder?: string;
    className?: string;
    onFilterChange?: (filtered: T[]) => void;
}

const OPERATORS = [
    { label: 'Equals', value: 'eq' },
    { label: 'Not equals', value: 'neq' },
    { label: 'Contains', value: 'contains' },
    { label: 'Greater than', value: 'gt' },
    { label: 'Greater or equal', value: 'gte' },
    { label: 'Less than', value: 'lt' },
    { label: 'Less or equal', value: 'lte' },
    { label: 'Is in', value: 'in' },
] as const;

export function FilterBar<T extends Record<string, any>>({
    filters: f,
    sortOptions,
    searchPlaceholder = 'Search...',
    className,
}: FilterBarProps<T>) {
    const [showPanel, setShowPanel] = useState(false);
    const [newField, setNewField] = useState('');
    const [newOp, setNewOp] = useState<FilterRule['operator']>('contains');
    const [newVal, setNewVal] = useState('');

    const handleAdd = () => {
        if (!newField || !newVal.trim()) return;
        f.addFilter({ field: newField, operator: newOp, value: newVal });
        setNewField('');
        setNewOp('contains');
        setNewVal('');
    };

    return (
        <div className={cn('space-y-3', className)}>
            {/* Search + sort + filter toggle */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={f.search}
                        onChange={e => f.setSearch(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full h-9 pl-9 pr-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                </div>

                {sortOptions && (
                    <select
                        value={f.sort ? `${f.sort.field}-${f.sort.direction}` : ''}
                        onChange={e => {
                            if (!e.target.value) { f.setSort(null); return; }
                            const [field, direction] = e.target.value.split('-') as [string, 'asc' | 'desc'];
                            f.setSort({ field, direction });
                        }}
                        className="h-9 px-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    >
                        <option value="">Sort by...</option>
                        {sortOptions.map(opt => (
                            <optgroup key={opt.field} label={opt.label}>
                                <option value={`${opt.field}-asc`}>{opt.label} ↑</option>
                                <option value={`${opt.field}-desc`}>{opt.label} ↓</option>
                            </optgroup>
                        ))}
                    </select>
                )}

                <button
                    onClick={() => setShowPanel(!showPanel)}
                    className={cn(
                        'h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border',
                        showPanel || f.filters.length > 0
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    )}
                >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Filters
                    {f.activeCount > 0 && (
                        <span className="h-4 min-w-[16px] px-1 rounded-full bg-primary text-[9px] font-bold text-white flex items-center justify-center">
                            {f.activeCount}
                        </span>
                    )}
                </button>

                {(f.filters.length > 0 || f.search) && (
                    <button
                        onClick={f.clearFilters}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Filter panel */}
            {showPanel && (
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                    {/* Active filters */}
                    {f.filters.map((rule, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                            <select
                                value={rule.field}
                                onChange={e => {
                                    const def = f.filterDefMap[e.target.value];
                                    const op = def?.type === 'select' ? 'eq' as const : rule.operator;
                                    f.updateFilter(i, { ...rule, field: e.target.value, operator: op });
                                }}
                                className="h-8 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                            >
                                {f.filterDefs.map(def => (
                                    <option key={def.field} value={def.field}>{def.label}</option>
                                ))}
                            </select>

                            <select
                                value={rule.operator}
                                onChange={e => f.updateFilter(i, { ...rule, operator: e.target.value as FilterRule['operator'] })}
                                className="h-8 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                            >
                                {OPERATORS.map(op => (
                                    <option key={op.value} value={op.value}>{op.label}</option>
                                ))}
                            </select>

                            {f.filterDefMap[rule.field]?.type === 'select' && f.filterDefMap[rule.field].options ? (
                                <select
                                    value={rule.value}
                                    onChange={e => f.updateFilter(i, { ...rule, value: e.target.value })}
                                    className="h-8 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex-1"
                                >
                                    <option value="">Select...</option>
                                    {f.filterDefMap[rule.field].options!.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type={f.filterDefMap[rule.field]?.type === 'number' ? 'number' : 'text'}
                                    value={rule.value}
                                    onChange={e => f.updateFilter(i, { ...rule, value: e.target.value })}
                                    className="h-8 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex-1"
                                    placeholder="Value..."
                                />
                            )}

                            <button
                                onClick={() => f.removeFilter(i)}
                                className="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))}

                    {/* Add filter form */}
                    <div className="flex items-center gap-2 text-sm">
                        <select
                            value={newField}
                            onChange={e => setNewField(e.target.value)}
                            className="h-8 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                        >
                            <option value="">Add filter...</option>
                            {f.filterDefs.filter(d => !f.filters.find(r => r.field === d.field)).map(def => (
                                <option key={def.field} value={def.field}>{def.label}</option>
                            ))}
                        </select>

                        {newField && (
                            <>
                                <select
                                    value={newOp}
                                    onChange={e => setNewOp(e.target.value as FilterRule['operator'])}
                                    className="h-8 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                                >
                                    {OPERATORS.map(op => (
                                        <option key={op.value} value={op.value}>{op.label}</option>
                                    ))}
                                </select>

                                {f.filterDefMap[newField]?.type === 'select' && f.filterDefMap[newField].options ? (
                                    <select
                                        value={newVal}
                                        onChange={e => setNewVal(e.target.value)}
                                        className="h-8 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex-1"
                                    >
                                        <option value="">Select...</option>
                                        {f.filterDefMap[newField].options!.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type={f.filterDefMap[newField]?.type === 'number' ? 'number' : 'text'}
                                        value={newVal}
                                        onChange={e => setNewVal(e.target.value)}
                                        className="h-8 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex-1"
                                        placeholder="Value..."
                                    />
                                )}

                                <button
                                    onClick={handleAdd}
                                    disabled={!newVal.trim()}
                                    className="h-8 px-3 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

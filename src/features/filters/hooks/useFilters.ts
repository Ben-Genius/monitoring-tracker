import { useState, useMemo, useCallback } from 'react';

export interface FilterDef {
    field: string;
    label: string;
    type: 'text' | 'select' | 'number' | 'date' | 'boolean';
    options?: { label: string; value: string }[];
}

export interface FilterRule {
    field: string;
    operator: 'eq' | 'neq' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';
    value: string;
}

export interface SortRule {
    field: string;
    direction: 'asc' | 'desc';
}

export function useFilters<T extends Record<string, any>>(
    data: T[],
    filterDefs: FilterDef[],
    defaultSort?: SortRule,
) {
    const [filters, setFilters] = useState<FilterRule[]>([]);
    const [sort, setSort] = useState<SortRule | null>(defaultSort ?? null);
    const [search, setSearch] = useState('');

    const addFilter = useCallback((rule: FilterRule) => {
        setFilters(prev => [...prev, rule]);
    }, []);

    const removeFilter = useCallback((index: number) => {
        setFilters(prev => prev.filter((_, i) => i !== index));
    }, []);

    const updateFilter = useCallback((index: number, rule: FilterRule) => {
        setFilters(prev => prev.map((f, i) => i === index ? rule : f));
    }, []);

    const clearFilters = useCallback(() => {
        setFilters([]);
        setSearch('');
    }, []);

    const applyFilter = (item: T): boolean => {
        if (!filters.length) return true;
        return filters.every(rule => {
            const val = item[rule.field];
            if (val === null || val === undefined) return false;
            const strVal = String(val).toLowerCase();
            const ruleVal = rule.value.toLowerCase();

            switch (rule.operator) {
                case 'eq': return strVal === ruleVal;
                case 'neq': return strVal !== ruleVal;
                case 'contains': return strVal.includes(ruleVal);
                case 'gt': return Number(val) > Number(rule.value);
                case 'gte': return Number(val) >= Number(rule.value);
                case 'lt': return Number(val) < Number(rule.value);
                case 'lte': return Number(val) <= Number(rule.value);
                case 'in': return rule.value.split(',').map(v => v.trim().toLowerCase()).includes(strVal);
                default: return true;
            }
        });
    };

    const matchesSearch = (item: T): boolean => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return Object.values(item).some(v => {
            if (v === null || v === undefined) return false;
            return String(v).toLowerCase().includes(q);
        });
    };

    const filtered = useMemo(() => {
        let result = data.filter(item => applyFilter(item) && matchesSearch(item));

        if (sort) {
            result = [...result].sort((a, b) => {
                const aVal = a[sort.field];
                const bVal = b[sort.field];
                if (aVal == null) return 1;
                if (bVal == null) return -1;
                const cmp = typeof aVal === 'number'
                    ? aVal - bVal
                    : String(aVal).localeCompare(String(bVal));
                return sort.direction === 'desc' ? -cmp : cmp;
            });
        }

        return result;
    }, [data, filters, sort, search]);

    const filterDefMap = useMemo(() =>
        filterDefs.reduce((acc, d) => ({ ...acc, [d.field]: d }), {} as Record<string, FilterDef>),
        [filterDefs],
    );

    return {
        filters,
        setFilters,
        addFilter,
        removeFilter,
        updateFilter,
        clearFilters,
        sort,
        setSort,
        search,
        setSearch,
        filtered,
        filterDefs,
        filterDefMap,
        activeCount: filters.length + (search.trim() ? 1 : 0),
    };
}

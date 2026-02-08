import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CompanyState {
    selectedCompanyId: string; // 'all' or a UUID
    setSelectedCompanyId: (id: string) => void;
}

export const useCompanyStore = create<CompanyState>()(
    persist(
        (set) => ({
            selectedCompanyId: 'all',
            setSelectedCompanyId: (id: string) => set({ selectedCompanyId: id }),
        }),
        {
            name: 'company-storage',
        }
    )
);

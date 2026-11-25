import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * True while Enter is confirming an IME candidate (Chinese, Japanese, Korean
 * input) rather than meaning "submit". keyCode 229 covers Safari, which clears
 * isComposing before the confirming keydown reaches script.
 */
export function isImeComposing(e: { nativeEvent: KeyboardEvent; keyCode: number }): boolean {
    return e.nativeEvent.isComposing || e.keyCode === 229;
}

/** Short form for stat tiles: GHS 240.6M. */
export function formatCurrencyCompact(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'GHS',
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(amount);
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'GHS',
        minimumFractionDigits: 2,
    }).format(amount);
}

export function formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return formatDate(date);
}

// Default brand color: Orange (#F58220) and White
export const DEFAULT_BRAND_COLOR = '#F58220';

export interface CompanyTheme { primary: string; secondary: string; accent: string }

const DEFAULT_THEME: CompanyTheme = { primary: DEFAULT_BRAND_COLOR, secondary: '#EA580C', accent: '#FED7AA' };

/** Company colours come from the companies table (brand_* columns), loaded by useCompanies(). */
const companyThemes = new Map<string, CompanyTheme>();

interface BrandedCompany {
    name: string;
    brand_primary?: string | null;
    brand_secondary?: string | null;
    brand_accent?: string | null;
}

export function registerCompanyThemes(companies: BrandedCompany[]) {
    companyThemes.clear();
    for (const c of companies) {
        if (!c.brand_primary) continue;
        companyThemes.set(c.name, {
            primary: c.brand_primary,
            secondary: c.brand_secondary || DEFAULT_THEME.secondary,
            accent: c.brand_accent || DEFAULT_THEME.accent,
        });
    }
}

export function getCompanyTheme(companyName: string): CompanyTheme {
    const exact = companyThemes.get(companyName);
    if (exact) return exact;
    // Loose match on the first word ("Northbrook" finds "Northbrook LRD"), as before.
    const lower = companyName.toLowerCase();
    for (const [name, theme] of companyThemes) {
        if (lower.includes(name.toLowerCase().split(' ')[0])) return theme;
    }
    return DEFAULT_THEME;
}

export function getCompanyColor(companyName: string): string {
    return getCompanyTheme(companyName).primary;
}

export function getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
        low: '#64748b',
        medium: '#3b82f6',
        high: '#f59e0b',
        critical: '#ef4444',
    };
    return colors[priority] || '#64748b';
}

export function calculateProfitability(contractValue: number, actualCost: number): {
    percentage: number;
    status: 'healthy' | 'at_risk' | 'critical';
    profit: number;
} {
    const profit = contractValue - actualCost;
    const percentage = (profit / contractValue) * 100;

    let status: 'healthy' | 'at_risk' | 'critical';
    if (percentage >= 20) status = 'healthy';
    else if (percentage >= 5) status = 'at_risk';
    else status = 'critical';

    return { percentage, status, profit };
}

export function getDaysSinceUpdate(lastUpdated: string | Date): number {
    const now = new Date();
    const then = new Date(lastUpdated);
    return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

export function isTaskIdle(lastUpdated: string | Date, stage: string): boolean {
    if (stage === 'completed' || stage === 'talking_stage') return false;
    return getDaysSinceUpdate(lastUpdated) >= 2;
}

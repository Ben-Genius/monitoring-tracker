import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
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

export function getCompanyColor(companyName: string): string {
    const colors: Record<string, string> = {
        'MacWest': '#8B0000',
        'CypressEnergy': '#006837',
        'Northbrook LRD': '#1E3A8A',
    };
    // Case-insensitive fallback
    const key = Object.keys(colors).find(k => companyName.toLowerCase().includes(k.toLowerCase().split(' ')[0]));
    return (key ? colors[key] : null) || colors[companyName] || '#64748b';
}

export function getCompanyTheme(companyName: string) {
    const themes: Record<string, { primary: string; secondary: string; accent: string }> = {
        'MacWest': { primary: '#8B0000', secondary: '#000000', accent: '#FCA311' },
        'CypressEnergy': { primary: '#006837', secondary: '#F58220', accent: '#4ADE80' },
        'Northbrook LRD': { primary: '#1E3A8A', secondary: '#334155', accent: '#38BDF8' },
    };
    const key = Object.keys(themes).find(k => companyName.toLowerCase().includes(k.toLowerCase().split(' ')[0]));
    return (key ? themes[key] : null) || themes[companyName] || { primary: '#6366f1', secondary: '#475569', accent: '#818cf8' };
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

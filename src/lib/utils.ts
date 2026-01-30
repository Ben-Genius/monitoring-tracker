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
        Macwest: '#6366f1',
        Cypress: '#8b5cf6',
        Northbrook: '#ec4899',
    };
    return colors[companyName] || '#64748b';
}

export function getStageColor(stage: string): string {
    const colors: Record<string, string> = {
        talking_stage: '#94a3b8',
        yet_to_start: '#fbbf24',
        in_progress: '#3b82f6',
        blockers: '#ef4444',
        completed: '#10b981',
    };
    return colors[stage] || '#64748b';
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

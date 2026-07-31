import { cn } from '@/lib/utils';

interface ProgressBarProps {
    value: number;
    max?: number;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
    showLabel?: boolean;
    labelPosition?: 'inside' | 'right' | 'bottom';
    animated?: boolean;
    className?: string;
    barClassName?: string;
}

const sizeMap = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
};

const variantMap = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    primary: 'bg-primary',
};

export function ProgressBar({
    value,
    max = 100,
    size = 'md',
    variant = 'default',
    showLabel = false,
    labelPosition = 'right',
    animated = true,
    className,
    barClassName,
}: ProgressBarProps) {
    const pct = Math.min(Math.round((value / max) * 100), 100);

    const bar = (
        <div
            className={cn(
                'w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden',
                sizeMap[size],
                className,
            )}
        >
            <div
                className={cn(
                    variantMap[variant],
                    sizeMap[size],
                    'rounded-full transition-all duration-700 ease-spring',
                    animated && 'animate-progress-fill',
                    barClassName,
                )}
                style={{ width: `${pct}%` }}
            />
        </div>
    );

    if (!showLabel) return bar;

    const label = (
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums min-w-[2.5rem]">
            {pct}%
        </span>
    );

    if (labelPosition === 'inside') {
        return (
            <div className="relative w-full">
                <div
                    className={cn(
                        'w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden',
                        sizeMap[size],
                        className,
                    )}
                >
                    <div
                        className={cn(
                            variantMap[variant],
                            sizeMap[size],
                            'rounded-full transition-all duration-700 ease-spring flex items-center justify-end pr-1',
                            animated && 'animate-progress-fill',
                            barClassName,
                        )}
                        style={{ width: `${pct}%`, minWidth: pct > 15 ? '2.5rem' : '0' }}
                    >
                        {pct > 15 && (
                            <span className="text-[10px] font-bold text-white leading-none">
                                {pct}%
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (labelPosition === 'bottom') {
        return (
            <div className="space-y-1">
                {bar}
                <div className="flex justify-between text-xs">
                    <span className="text-slate-400">{value}/{max}</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{pct}%</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3">
            {bar}
            {label}
        </div>
    );
}

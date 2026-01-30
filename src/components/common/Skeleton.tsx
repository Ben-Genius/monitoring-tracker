import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'circle' | 'card' | 'text';
    width?: string | number;
    height?: string | number;
}

export function Skeleton({
    className,
    variant = 'default',
    width,
    height,
    style,
    ...props
}: SkeletonProps) {
    const baseStyles = 'animate-pulse bg-gray-200 rounded-md';

    let variantStyles = '';
    switch (variant) {
        case 'circle':
            variantStyles = 'rounded-full';
            break;
        case 'text':
            variantStyles = 'h-4 w-3/4 rounded';
            break;
        case 'card':
            variantStyles = 'h-[200px] w-full rounded-lg';
            break;
        default:
            variantStyles = '';
    }

    const computedStyle = {
        width: width,
        height: height,
        ...style
    };

    return (
        <div
            className={cn(baseStyles, variantStyles, className)}
            style={computedStyle}
            {...props}
        />
    );
}

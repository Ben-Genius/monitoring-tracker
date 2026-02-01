import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrawerProps {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
    width?: string;
    title?: string;
}

export function Drawer({ open, onClose, children, width = '600px', title }: DrawerProps) {
    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [open, onClose]);

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300",
                    open ? "opacity-100" : "opacity-0"
                )}
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <div
                className={cn(
                    "fixed top-0 right-0 h-full bg-white shadow-2xl z-50 flex flex-col",
                    "transition-transform duration-300 ease-out",
                    open ? "translate-x-0" : "translate-x-full"
                )}
                style={{ width: width }}
            >
                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-md transition-colors"
                            aria-label="Close drawer"
                        >
                            <X className="h-5 w-5 text-slate-500" />
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </div>
        </>
    );
}

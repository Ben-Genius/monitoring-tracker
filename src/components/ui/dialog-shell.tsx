import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogShellProps {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
}

/**
 * Accessible modal frame: labelled dialog role, Escape and backdrop close,
 * focus moved in on open, trapped while open, and returned on close.
 */
export function DialogShell({ open, onClose, title, description, children, className }: DialogShellProps) {
    const panel = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const descId = useId();
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!open) return;
        const opener = document.activeElement as HTMLElement | null;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        // Focus the first field rather than the close button, so typing can start at once.
        const items = () => [...(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
        (items().find(el => !el.dataset.dialogClose) ?? panel.current)?.focus();

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current(); return; }
            if (e.key !== 'Tab') return;
            const list = items();
            if (!list.length) return;
            const first = list[0], last = list[list.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflow;
            opener?.focus?.();
        };
    }, [open]);

    if (!open) return null;

    // Portal to <body> so the backdrop covers the sticky header and no scroll container offsets it.
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div
                ref={panel}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descId : undefined}
                tabIndex={-1}
                className={cn('flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[14px] border border-line bg-surface shadow-pop outline-none dark:border-slate-800 dark:bg-slate-900', className)}
            >
                <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4 dark:border-slate-800">
                    <div>
                        <h2 id={titleId} className="text-[18px] font-semibold text-ink dark:text-slate-100">{title}</h2>
                        {description && <p id={descId} className="mt-0.5 text-sm text-ink-muted dark:text-slate-400">{description}</p>}
                    </div>
                    <button
                        type="button"
                        data-dialog-close="true"
                        onClick={onClose}
                        aria-label="Close"
                        className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-ink-muted hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                        <X className="h-5 w-5" aria-hidden />
                    </button>
                </div>
                <div className="overflow-y-auto">{children}</div>
            </div>
        </div>,
        document.body
    );
}

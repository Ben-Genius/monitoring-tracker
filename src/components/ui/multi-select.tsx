import * as React from "react";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type MultiSelectOption = {
    value: string;
    label: string;
};

interface MultiSelectProps {
    options: MultiSelectOption[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    className?: string;
    /** Id for the text input, so a <label htmlFor> names it. */
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
}

/**
 * Searchable multi-select following the ARIA combobox + listbox pattern:
 * type to filter, arrows to move, Enter to toggle, Escape to close,
 * Backspace on an empty field removes the last choice.
 */
export function MultiSelect({
    options,
    selected,
    onChange,
    placeholder = "Select items...",
    className,
    id,
    "aria-describedby": describedBy,
    "aria-invalid": invalid,
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [active, setActive] = React.useState(0);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const autoId = React.useId();
    const listId = `${id ?? autoId}-list`;

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggle = (value: string) => {
        onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
    };

    const filteredOptions = options.filter(o => o.label.toLowerCase().includes(searchTerm.toLowerCase()));
    const selectedOptions = selected.map(v => options.find(o => o.value === v)).filter(Boolean) as MultiSelectOption[];
    React.useEffect(() => { setActive(0); }, [searchTerm, open]);

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!open) setOpen(true); else setActive(a => Math.min(a + 1, filteredOptions.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive(a => Math.max(a - 1, 0));
        } else if (e.key === "Enter") {
            if (open && filteredOptions[active]) { e.preventDefault(); toggle(filteredOptions[active].value); }
        } else if (e.key === "Escape") {
            if (open) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
        } else if (e.key === "Backspace" && !searchTerm && selected.length) {
            onChange(selected.slice(0, -1));
        }
    };

    const optionId = (i: number) => `${listId}-${i}`;

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <div
                className={cn(
                    "flex min-h-[44px] w-full flex-wrap items-center gap-1.5 rounded-[8px] border border-line bg-surface px-2.5 py-1.5 text-sm cursor-text dark:border-slate-700 dark:bg-slate-950",
                    open && "border-progress ring-2 ring-progress/20",
                    invalid && "border-blocked dark:border-red-400"
                )}
                onClick={() => { setOpen(true); inputRef.current?.focus(); }}
            >
                {selectedOptions.map(option => (
                    <span key={option.value} className="inline-flex h-7 items-center gap-1 rounded-[6px] bg-paper pl-2 pr-1 text-[13px] font-medium text-ink dark:bg-slate-800 dark:text-slate-100">
                        {option.label}
                        <button
                            type="button"
                            aria-label={`Remove ${option.label}`}
                            className="flex h-5 w-5 items-center justify-center rounded-[4px] text-ink-muted hover:bg-line hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-progress dark:text-slate-400 dark:hover:bg-slate-700"
                            onMouseDown={e => e.preventDefault()}
                            onClick={e => { e.stopPropagation(); toggle(option.value); }}
                        >
                            <X className="h-3 w-3" aria-hidden />
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    id={id}
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={open && filteredOptions[active] ? optionId(active) : undefined}
                    aria-describedby={describedBy}
                    aria-invalid={invalid || undefined}
                    className="h-7 min-w-[8rem] flex-1 bg-transparent text-ink outline-none placeholder:text-ink-muted dark:text-slate-100 dark:placeholder:text-slate-400"
                    placeholder={selected.length === 0 ? placeholder : "Add another…"}
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                />
            </div>

            {open && (
                <ul
                    id={listId}
                    role="listbox"
                    aria-multiselectable="true"
                    className="absolute top-full z-50 mt-1.5 max-h-[220px] w-full overflow-y-auto rounded-[8px] border border-line bg-surface p-1 shadow-pop dark:border-slate-700 dark:bg-slate-900"
                >
                    {filteredOptions.length === 0 ? (
                        <li className="p-2 text-center text-sm text-ink-muted dark:text-slate-400">No one matches “{searchTerm}”.</li>
                    ) : (
                        filteredOptions.map((option, i) => {
                            const isSelected = selected.includes(option.value);
                            return (
                                <li
                                    key={option.value}
                                    id={optionId(i)}
                                    role="option"
                                    aria-selected={isSelected}
                                    className={cn(
                                        "flex cursor-pointer select-none items-center rounded-[6px] px-2.5 py-2 text-sm text-ink dark:text-slate-100",
                                        i === active && "bg-paper dark:bg-slate-800",
                                        isSelected && "font-semibold"
                                    )}
                                    onMouseEnter={() => setActive(i)}
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => toggle(option.value)}
                                >
                                    <span className="flex-1 truncate">{option.label}</span>
                                    {isSelected && <Check className="ml-2 h-4 w-4 shrink-0" aria-hidden />}
                                </li>
                            );
                        })
                    )}
                </ul>
            )}
        </div>
    );
}

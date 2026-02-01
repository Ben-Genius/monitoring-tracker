import * as React from "react";
import { X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
}

export function MultiSelect({
    options,
    selected,
    onChange,
    placeholder = "Select items...",
    className,
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Handle click outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter((item) => item !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    const handleRemove = (value: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(selected.filter((item) => item !== value));
    };

    const filteredOptions = options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOptions = selected
        .map((value) => options.find((o) => o.value === value))
        .filter(Boolean) as MultiSelectOption[];

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <div
                className={cn(
                    "flex min-h-[40px] w-full flex-wrap items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-text hover:bg-slate-50 transition-colors",
                    open && "ring-2 ring-ring ring-offset-2"
                )}
                onClick={() => setOpen(true)}
            >
                <div className="flex flex-wrap gap-1.5 w-full">
                    {selectedOptions.length > 0 ? (
                        selectedOptions.map((option) => (
                            <Badge
                                key={option.value}
                                variant="secondary"
                                className="mr-1 mb-1 hover:bg-slate-200 pl-2 pr-1 py-0.5 h-6 flex items-center gap-1"
                            >
                                {option.label}
                                <button
                                    className="rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer hover:bg-slate-300 p-0.5"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleRemove(option.value, e as any);
                                        }
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    onClick={(e) => handleRemove(option.value, e)}
                                >
                                    <X className="h-3 w-3 text-muted-foreground" />
                                </button>
                            </Badge>
                        ))
                    ) : (
                        !open && <span className="text-muted-foreground">{placeholder}</span>
                    )}

                    {open && (
                        <input
                            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-[50px] h-6"
                            placeholder={selected.length === 0 ? placeholder : ""}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => setOpen(true)}
                            autoFocus
                        />
                    )}
                </div>
            </div>

            {open && (
                <div className="absolute top-full mt-2 z-50 px-1 py-1 w-full min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 bg-white max-h-[200px] overflow-y-auto">
                    {filteredOptions.length === 0 ? (
                        <p className="p-2 text-sm text-muted-foreground text-center">No results found.</p>
                    ) : (
                        filteredOptions.map((option) => {
                            const isSelected = selected.includes(option.value);
                            return (
                                <div
                                    key={option.value}
                                    className={cn(
                                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                                        isSelected && "bg-slate-50 font-medium"
                                    )}
                                    onClick={() => handleSelect(option.value)}
                                >
                                    <span className="flex-1 truncate">{option.label}</span>
                                    {isSelected && (
                                        <Check className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

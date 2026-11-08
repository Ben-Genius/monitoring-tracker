import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsContextType {
    value: string
    onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined)

const useTabs = () => {
    const context = React.useContext(TabsContext)
    if (!context) {
        throw new Error("Tabs components must be used within a Tabs component")
    }
    return context
}

// Pass `value` to control the selected tab from outside (for links that switch tabs);
// otherwise the tabs keep their own state, starting at `defaultValue`.
const Tabs = ({ children, defaultValue = '', value: controlled, className, onValueChange, style }: {
    children: React.ReactNode,
    defaultValue?: string,
    value?: string,
    className?: string,
    onValueChange?: (value: string) => void,
    style?: React.CSSProperties
}) => {
    const [internal, setInternal] = React.useState(defaultValue)
    const value = controlled ?? internal

    const handleValueChange = (newValue: string) => {
        if (controlled === undefined) setInternal(newValue)
        onValueChange?.(newValue)
    }

    return (
        <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
            <div className={cn("w-full", className)} style={style}>
                {children}
            </div>
        </TabsContext.Provider>
    )
}

// Arrow keys, Home and End move between tabs and select them (automatic activation).
function moveFocus(e: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const tabs = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])')];
    const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1
        : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].focus();
    tabs[next].click();
}

const TabsList = ({ children, className, style, label }: {
    children: React.ReactNode,
    className?: string,
    style?: React.CSSProperties,
    label?: string
}) => {
    return (
        <div role="tablist" aria-label={label} onKeyDown={moveFocus} className={cn("inline-flex items-center justify-center rounded-pill bg-muted p-1 text-muted-foreground", className)} style={style}>
            {children}
        </div>
    )
}

const TabsTrigger = ({ children, value, className, style }: {
    children: React.ReactNode,
    value: string,
    className?: string,
    style?: React.CSSProperties
}) => {
    const context = useTabs()
    const isActive = context.value === value

    return (
        <button
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => context.onValueChange(value)}
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-pill px-3 py-1.5 text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
                isActive ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50 active:scale-[0.97]",
                className
            )}
            style={style}
        >
            {children}
        </button>
    )
}

const TabsContent = ({ children, value, className, style }: {
    children: React.ReactNode,
    value: string,
    className?: string,
    style?: React.CSSProperties
}) => {
    const context = useTabs()
    if (value !== context.value) return null
    return <div role="tabpanel" className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 animate-fade-in", className)} style={style}>{children}</div>
}

export { Tabs, TabsList, TabsTrigger, TabsContent }

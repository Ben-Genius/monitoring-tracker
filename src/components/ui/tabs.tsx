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

const Tabs = ({ children, defaultValue, className, onValueChange, style }: {
    children: React.ReactNode,
    defaultValue: string,
    className?: string,
    onValueChange?: (value: string) => void,
    style?: React.CSSProperties
}) => {
    const [value, setValue] = React.useState(defaultValue)

    const handleValueChange = (newValue: string) => {
        setValue(newValue)
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

const TabsList = ({ children, className, style }: {
    children: React.ReactNode,
    className?: string,
    style?: React.CSSProperties
}) => {
    return (
        <div className={cn("inline-flex items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)} style={style}>
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
            onClick={() => context.onValueChange(value)}
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isActive ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50",
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
    return <div className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)} style={style}>{children}</div>
}

export { Tabs, TabsList, TabsTrigger, TabsContent }

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

const Tabs = ({ children, defaultValue, className, onValueChange }: {
    children: React.ReactNode,
    defaultValue: string,
    className?: string,
    onValueChange?: (value: string) => void
}) => {
    const [value, setValue] = React.useState(defaultValue)

    const handleValueChange = (newValue: string) => {
        setValue(newValue)
        onValueChange?.(newValue)
    }

    return (
        <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
            <div className={cn("w-full", className)}>
                {children}
            </div>
        </TabsContext.Provider>
    )
}

const TabsList = ({ children, className }: {
    children: React.ReactNode,
    className?: string
}) => {
    return (
        <div className={cn("inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className)}>
            {children}
        </div>
    )
}

const TabsTrigger = ({ children, value, className }: {
    children: React.ReactNode,
    value: string,
    className?: string
}) => {
    const context = useTabs()
    const isActive = context.value === value

    return (
        <button
            onClick={() => context.onValueChange(value)}
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isActive ? "bg-white text-foreground shadow-sm" : "hover:bg-white/50",
                className
            )}
        >
            {children}
        </button>
    )
}

const TabsContent = ({ children, value, className }: {
    children: React.ReactNode,
    value: string,
    className?: string
}) => {
    const context = useTabs()
    if (value !== context.value) return null
    return <div className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}>{children}</div>
}

export { Tabs, TabsList, TabsTrigger, TabsContent }

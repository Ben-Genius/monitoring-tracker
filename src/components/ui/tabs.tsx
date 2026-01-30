import * as React from "react"
import { cn } from "@/lib/utils"

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
        <div className={cn("w-full", className)}>
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child as React.ReactElement<any>, {
                        activeValue: value,
                        onValueChange: handleValueChange
                    })
                }
                return child
            })}
        </div>
    )
}

const TabsList = ({ children, className, activeValue, onValueChange }: {
    children: React.ReactNode,
    className?: string,
    activeValue?: string,
    onValueChange?: (value: string) => void
}) => {
    return (
        <div className={cn("inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className)}>
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child as React.ReactElement<any>, {
                        activeValue,
                        onValueChange
                    })
                }
                return child
            })}
        </div>
    )
}

const TabsTrigger = ({ children, value, className, activeValue, onValueChange }: {
    children: React.ReactNode,
    value: string,
    className?: string,
    activeValue?: string,
    onValueChange?: (value: string) => void
}) => {
    const isActive = activeValue === value
    return (
        <button
            onClick={() => onValueChange?.(value)}
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

const TabsContent = ({ children, value, activeValue, className }: {
    children: React.ReactNode,
    value: string,
    activeValue?: string,
    className?: string
}) => {
    if (value !== activeValue) return null
    return <div className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}>{children}</div>
}

export { Tabs, TabsList, TabsTrigger, TabsContent }

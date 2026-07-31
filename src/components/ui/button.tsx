import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:bg-primary-hover active:scale-[0.97]",
                destructive:
                    "bg-error text-white hover:bg-error/90 active:scale-[0.97]",
                outline:
                    "border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-[0.97]",
                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.97]",
                ghost: "hover:bg-accent hover:text-accent-foreground active:scale-[0.97]",
                link: "text-primary underline-offset-4 hover:underline",
                success: "bg-success text-white hover:bg-success/90 active:scale-[0.97]",
                warning: "bg-warning text-white hover:bg-warning/90 active:scale-[0.97]",
            },
            size: {
                default: "h-10 px-4 py-2 rounded-md",
                sm: "h-9 rounded-md px-3",
                lg: "h-11 rounded-md px-8",
                icon: "h-10 w-10 rounded-full",
                pill: "h-10 px-6 rounded-pill",
                "pill-sm": "h-8 px-4 rounded-pill text-xs",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }

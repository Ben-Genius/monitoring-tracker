import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-primary text-primary-foreground",
                secondary:
                    "border-transparent bg-secondary text-secondary-foreground",
                destructive:
                    "border-transparent bg-error text-white",
                outline: "text-foreground",
                success: "border-transparent bg-success text-white",
                warning: "border-transparent bg-warning text-white",
                talking: "border-transparent bg-talking text-white",
                yetToStart: "border-transparent bg-yetToStart text-white",
                inProgress: "border-transparent bg-inProgress text-white",
                blocker: "border-transparent bg-blocker text-white",
                completed: "border-transparent bg-completed text-white",
                macwest: "border-transparent bg-macwest text-white",
                cypress: "border-transparent bg-cypress text-white",
                northbrook: "border-transparent bg-northbrook text-white",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }

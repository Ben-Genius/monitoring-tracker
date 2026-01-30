import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
                secondary:
                    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive:
                    "border-transparent bg-error text-white hover:bg-error/80",
                outline: "text-foreground",
                success: "border-transparent bg-success text-white",
                warning: "border-transparent bg-warning text-white",
                // Task stages
                talking: "border-transparent bg-talking text-white",
                yetToStart: "border-transparent bg-yetToStart text-white",
                inProgress: "border-transparent bg-inProgress text-white",
                blocker: "border-transparent bg-blocker text-white",
                completed: "border-transparent bg-completed text-white",
                // Companies
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

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.985] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-neutral-900 text-white shadow-[0_16px_36px_-24px_rgba(23,120,242,0.9)] hover:bg-neutral-800",
        destructive:
          "bg-red-500 text-white shadow-[0_16px_36px_-24px_rgba(239,68,68,0.8)] hover:bg-red-600",
        outline:
          "border border-neutral-200 bg-white/70 text-neutral-700 shadow-none hover:bg-white hover:text-neutral-900",
        secondary:
          "bg-neutral-100 text-neutral-900 shadow-none hover:bg-neutral-200",
        ghost: "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }

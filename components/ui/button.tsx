import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Button — design-system variants.
 *
 * variant: default (primary) | secondary | accent | destructive | outline
 *          ghost | link | success | warning
 * size:    sm | default | lg | xl | icon | icon-sm | icon-lg
 *
 * All interactive primitives share the `interactive` feel:
 * 200ms ease-out transitions, active scale, visible focus ring.
 */
const buttonVariants = cva(
  "focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-all duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
        accent: "bg-accent text-accent-foreground hover:bg-accent/85 shadow-sm",
        destructive:
          "bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/30 text-white shadow-sm",
        success: "bg-success hover:bg-success/90 text-white shadow-sm",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm",
        outline:
          "border-border hover:bg-muted hover:text-foreground border bg-transparent shadow-sm",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 rounded-md px-3 text-xs",
        default: "h-10 px-4 py-2 text-sm",
        lg: "h-11 rounded-lg px-6 text-[0.95rem]",
        xl: "h-12 rounded-xl px-8 text-base",
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

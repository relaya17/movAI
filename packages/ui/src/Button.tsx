import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Renders the child element instead of a <button> (e.g. wrapping a <Link>). Radix `asChild` pattern. */
  asChild?: boolean;
  variant?: "primary" | "secondary";
}

/**
 * Base interactive control for the whole app. Every button in the product
 * should go through this component so focus-visible rings, contrast, and
 * disabled states (WCAG 2.1 AA - architecture plan §6) are consistent by
 * construction instead of re-implemented per screen.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, variant = "primary", className, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={twMerge(
          clsx(
            "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            variant === "primary" && "bg-brand-600 text-white hover:bg-brand-500",
            variant === "secondary" && "bg-transparent text-brand-600 border border-brand-600 hover:bg-brand-50"
          ),
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground/30",
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };



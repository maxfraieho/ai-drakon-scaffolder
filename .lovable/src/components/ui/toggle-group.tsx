"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { toggleVariants } from "@/components/ui/toggle";

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants>>({
size: "default",
variant: "default",
});

const ToggleGroup = React.forwardRef<
React.ElementRef<typeof ToggleGroupPrimitive.Root>,
React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
VariantProps<typeof toggleVariants>
>(({ className, variant, size, children, ...props }, ref) => (
<ToggleGroupPrimitive.Root
ref={ref}
className={cn("flex items-center justify-center gap-1", className)}
{...props}
>
<ToggleGroupContext.Provider value={{ variant, size
}}>{children}</ToggleGroupContext.Provider>
</ToggleGroupPrimitive.Root>
));

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<
React.ElementRef<typeof ToggleGroupPrimitive.Item>,
React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
VariantProps<typeof toggleVariants>
>(({ className, children, variant, size, ...props }, ref) => {
const context = React.useContext(ToggleGroupContext);

return (
<ToggleGroupPrimitive.Item
ref={ref}
className={cn(
toggleVariants({
variant: context.variant || variant,
size: context.size || size,
}),
className,
)}
{...props}
>
{children}
</ToggleGroupPrimitive.Item>
);
});

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
---
### components/ui/accordion.tsx
**Розмір:** 2,000 байт


import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
React.ElementRef<typeof AccordionPrimitive.Item>,
React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
<AccordionPrimitive.Item ref={ref} className={cn("border-b", className)} {...props} />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
React.ElementRef<typeof AccordionPrimitive.Trigger>,
React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
<AccordionPrimitive.Header className="flex">
<AccordionPrimitive.Trigger
ref={ref}
className={cn(
"flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline
text-left [&[data-state=open]>svg]:rotate-180",
className,
)}
{...props}
>
{children}
<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform
duration-200" />
</AccordionPrimitive.Trigger>
</AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
React.ElementRef<typeof AccordionPrimitive.Content>,
React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
<AccordionPrimitive.Content
ref={ref}
className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up
data-[state=open]:animate-accordion-down"
{...props}
>
<div className={cn("pb-4 pt-0", className)}>{children}</div>
</AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };


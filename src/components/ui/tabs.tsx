import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";
const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
React.ElementRef<typeof TabsPrimitive.List>,
React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
<TabsPrimitive.List
ref={ref}
className={cn(
"inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
className,
)}
{...props}
/>
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
React.ElementRef<typeof TabsPrimitive.Trigger>,
React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
<TabsPrimitive.Trigger
ref={ref}
className={cn(
"inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm
font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2
focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none
disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground
data-[state=active]:shadow",
className,
)}
{...props}
/>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
React.ElementRef<typeof TabsPrimitive.Content>,
React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
<TabsPrimitive.Content
ref={ref}
className={cn(
"mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
focus-visible:ring-offset-2",
className,
)}
{...props}
/>
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
---
### components/ui/input-otp.tsx
**Розмір:** 2,161 байт


import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { Minus } from "lucide-react";

import { cn } from "@/lib/utils";

const InputOTP = React.forwardRef<
React.ElementRef<typeof OTPInput>,
React.ComponentPropsWithoutRef<typeof OTPInput>
>(({ className, containerClassName, ...props }, ref) => (
<OTPInput
ref={ref}
containerClassName={cn(
"flex items-center gap-2 has-[:disabled]:opacity-50",
containerClassName,
)}
className={cn("disabled:cursor-not-allowed", className)}
{...props}
/>
));
InputOTP.displayName = "InputOTP";

const InputOTPGroup = React.forwardRef<
React.ElementRef<"div">,
React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
<div ref={ref} className={cn("flex items-center", className)} {...props} />
));
InputOTPGroup.displayName = "InputOTPGroup";

const InputOTPSlot = React.forwardRef<
React.ElementRef<"div">,
React.ComponentPropsWithoutRef<"div"> & { index: number }
>(({ index, className, ...props }, ref) => {
const inputOTPContext = React.useContext(OTPInputContext);
const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index];

return (
<div
ref={ref}
className={cn(
"relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm
shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
isActive && "z-10 ring-1 ring-ring",
className,
)}
{...props}
>
{char}
{hasFakeCaret && (
<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
<div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
</div>
)}
</div>
);
});
InputOTPSlot.displayName = "InputOTPSlot";

const InputOTPSeparator = React.forwardRef<
React.ElementRef<"div">,
React.ComponentPropsWithoutRef<"div">
>(({ ...props }, ref) => (
<div ref={ref} role="separator" {...props}>
<Minus />
</div>
));
InputOTPSeparator.displayName = "InputOTPSeparator";

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };


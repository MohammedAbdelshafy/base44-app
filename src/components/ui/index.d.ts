import * as React from "react"

declare module "@/components/ui/accordion" {
  export const Accordion: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const AccordionItem: React.FC<{ value: string } & React.HTMLAttributes<HTMLDivElement>>
  export const AccordionTrigger: React.FC<React.HTMLAttributes<HTMLButtonElement>>
  export const AccordionContent: React.FC<React.HTMLAttributes<HTMLDivElement>>
}

declare module "@/components/ui/alert-dialog" {
  export const AlertDialog: React.FC<{ children: React.ReactNode }>
  export const AlertDialogTrigger: React.FC<{ children: React.ReactNode }>
  export const AlertDialogContent: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const AlertDialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const AlertDialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const AlertDialogTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>>
  export const AlertDialogDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>>
  export const AlertDialogAction: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>>
  export const AlertDialogCancel: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>>
}

declare module "@/components/ui/badge" {
  interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "secondary" | "destructive" | "outline"
  }
  export const Badge: React.FC<BadgeProps>
}

declare module "@/components/ui/button" {
  interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
    size?: "default" | "sm" | "lg" | "icon"
    asChild?: boolean
  }
  export const Button: React.FC<ButtonProps>
}

declare module "@/components/ui/card" {
  export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>>
  export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>>
  export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>>
}

declare module "@/components/ui/checkbox" {
  interface CheckboxProps {
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
    disabled?: boolean
    id?: string
  }
  export const Checkbox: React.ForwardRefExoticComponent<CheckboxProps & React.RefAttributes<HTMLButtonElement>>
}

declare module "@/components/ui/dialog" {
  export const Dialog: React.FC<{ open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }>
  export const DialogTrigger: React.FC<{ children: React.ReactNode; asChild?: boolean }>
  export const DialogContent: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const DialogTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>>
  export const DialogDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>>
  export const DialogClose: React.FC<{ children: React.ReactNode; asChild?: boolean }>
}

declare module "@/components/ui/dropdown-menu" {
  export const DropdownMenu: React.FC<{ children: React.ReactNode }>
  export const DropdownMenuTrigger: React.FC<{ children: React.ReactNode; asChild?: boolean }>
  export const DropdownMenuContent: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const DropdownMenuItem: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const DropdownMenuCheckboxItem: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const DropdownMenuRadioItem: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const DropdownMenuLabel: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const DropdownMenuSeparator: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const DropdownMenuShortcut: React.FC<React.HTMLAttributes<HTMLSpanElement>>
  export const DropdownMenuGroup: React.FC<{ children: React.ReactNode }>
  export const DropdownMenuPortal: React.FC<{ children: React.ReactNode }>
  export const DropdownMenuSub: React.FC<{ children: React.ReactNode }>
  export const DropdownMenuSubContent: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const DropdownMenuSubTrigger: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const DropdownMenuRadioGroup: React.FC<{ value?: string; onValueChange?: (v: string) => void; children: React.ReactNode }>
}

declare module "@/components/ui/input" {
  interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
  export const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>
}

declare module "@/components/ui/label" {
  interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}
  export const Label: React.ForwardRefExoticComponent<LabelProps & React.RefAttributes<HTMLLabelElement>>
}

declare module "@/components/ui/select" {
  export const Select: React.FC<{ value?: string; onValueChange?: (v: string) => void; children: React.ReactNode; defaultValue?: string }>
  export const SelectGroup: React.FC<{ children: React.ReactNode }>
  export const SelectValue: React.FC<{ placeholder?: string }>
  export const SelectTrigger: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLButtonElement> & React.RefAttributes<HTMLButtonElement>>
  export const SelectContent: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const SelectLabel: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const SelectItem: React.FC<{ value: string; children: React.ReactNode; disabled?: boolean }>
  export const SelectSeparator: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const SelectScrollUpButton: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const SelectScrollDownButton: React.FC<React.HTMLAttributes<HTMLDivElement>>
}

declare module "@/components/ui/separator" {
  export const Separator: React.FC<React.HTMLAttributes<HTMLDivElement>>
}

declare module "@/components/ui/sheet" {
  export const Sheet: React.FC<{ open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }>
  export const SheetTrigger: React.FC<{ children: React.ReactNode; asChild?: boolean }>
  export const SheetContent: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const SheetHeader: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const SheetFooter: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const SheetTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>>
  export const SheetDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>>
  export const SheetClose: React.FC<{ children: React.ReactNode; asChild?: boolean }>
}

declare module "@/components/ui/skeleton" {
  export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>>
}

declare module "@/components/ui/switch" {
  interface SwitchProps {
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
    disabled?: boolean
    id?: string
  }
  export const Switch: React.ForwardRefExoticComponent<SwitchProps & React.RefAttributes<HTMLButtonElement>>
}

declare module "@/components/ui/table" {
  export const Table: React.FC<React.HTMLAttributes<HTMLTableElement>>
  export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>>
  export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>>
  export const TableFooter: React.FC<React.HTMLAttributes<HTMLTableSectionElement>>
  export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>>
  export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableHeaderCellElement>>
  export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableDataCellElement>>
  export const TableCaption: React.FC<React.HTMLAttributes<HTMLTableCaptionElement>>
}

declare module "@/components/ui/tabs" {
  export const Tabs: React.FC<{ value?: string; onValueChange?: (v: string) => void; children: React.ReactNode; defaultValue?: string }>
  export const TabsList: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const TabsTrigger: React.FC<React.HTMLAttributes<HTMLButtonElement> & { value: string }>
  export const TabsContent: React.FC<React.HTMLAttributes<HTMLDivElement> & { value: string }>
}

declare module "@/components/ui/textarea" {
  interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
  export const Textarea: React.ForwardRefExoticComponent<TextareaProps & React.RefAttributes<HTMLTextAreaElement>>
}

declare module "@/components/ui/toast" {
  export const Toast: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const ToastAction: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>>
  export const ToastClose: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>>
  export const ToastTitle: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const ToastDescription: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const ToastProvider: React.FC<{ children: React.ReactNode }>
  export const ToastViewport: React.FC<React.HTMLAttributes<HTMLDivElement>>
}

declare module "@/components/ui/toaster" {
  export const Toaster: React.FC
}

declare module "@/components/ui/tooltip" {
  export const TooltipProvider: React.FC<{ children: React.ReactNode; delayDuration?: number }>
  export const Tooltip: React.FC<{ children: React.ReactNode }>
  export const TooltipTrigger: React.FC<{ children: React.ReactNode; asChild?: boolean }>
  export const TooltipContent: React.FC<React.HTMLAttributes<HTMLDivElement>>
}

declare module "@/components/ui/avatar" {
  export const Avatar: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const AvatarImage: React.FC<React.ImgHTMLAttributes<HTMLImageElement>>
  export const AvatarFallback: React.FC<React.HTMLAttributes<HTMLDivElement>>
}

declare module "@/components/ui/popover" {
  export const Popover: React.FC<{ open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }>
  export const PopoverTrigger: React.FC<{ children: React.ReactNode; asChild?: boolean }>
  export const PopoverContent: React.FC<React.HTMLAttributes<HTMLDivElement>>
}

declare module "@/components/ui/command" {
  export const Command: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const CommandDialog: React.FC<{ children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }>
  export const CommandInput: React.ForwardRefExoticComponent<React.InputHTMLAttributes<HTMLInputElement> & React.RefAttributes<HTMLInputElement>>
  export const CommandList: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const CommandEmpty: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const CommandGroup: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const CommandSeparator: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const CommandItem: React.FC<React.HTMLAttributes<HTMLDivElement>>
  export const CommandShortcut: React.FC<React.HTMLAttributes<HTMLSpanElement>>
}

declare module "@/components/ui/scroll-area" {
  export const ScrollArea: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>
  export const ScrollBar: React.FC<React.HTMLAttributes<HTMLDivElement>>
}

declare module "@/components/ui/progress" {
  interface ProgressProps {
    value?: number
    className?: string
  }
  export const Progress: React.ForwardRefExoticComponent<ProgressProps & React.RefAttributes<HTMLDivElement>>
}

declare module "@/components/ui/slider" {
  interface SliderProps {
    value?: number[]
    onValueChange?: (value: number[]) => void
    min?: number
    max?: number
    step?: number
    className?: string
  }
  export const Slider: React.ForwardRefExoticComponent<SliderProps & React.RefAttributes<HTMLDivElement>>
}

declare module "@/components/ui/collapsible" {
  export const Collapsible: React.FC<{ open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }>
  export const CollapsibleTrigger: React.FC<{ children: React.ReactNode; asChild?: boolean }>
  export const CollapsibleContent: React.FC<React.HTMLAttributes<HTMLDivElement>>
}

declare module "@/components/ui/hover-card" {
  export const HoverCard: React.FC<{ openDelay?: number; closeDelay?: number; children: React.ReactNode }>
  export const HoverCardTrigger: React.FC<{ children: React.ReactNode; asChild?: boolean }>
  export const HoverCardContent: React.FC<React.HTMLAttributes<HTMLDivElement>>
}

declare module "@/components/ui/form" {
  export const Form: React.FC<{ children: React.ReactNode }>
}

declare module "@/components/ui/sonner" {
  export const Toaster: React.FC<{ position?: string; richColors?: boolean }>
}

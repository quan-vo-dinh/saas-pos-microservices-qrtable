export const inputClass = [
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors",
    "placeholder:text-muted-foreground",
    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20"
].join(" ");

export const buttonPrimaryClass = [
    "mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md",
    "bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs",
    "transition-colors hover:bg-primary/90",
    "disabled:pointer-events-none disabled:opacity-50"
].join(" ");

export const buttonOutlineClass = [
    "inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-input",
    "bg-background px-4 py-2 text-sm font-medium shadow-xs transition-colors",
    "hover:bg-accent hover:text-accent-foreground"
].join(" ");

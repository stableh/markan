import type { ComponentProps, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type EditorButtonProps = ComponentProps<typeof Button> & {
  active?: boolean
}

export function EditorButton({ active, className, ...props }: EditorButtonProps) {
  return (
    <Button
      variant="ghost"
      data-active={active ? 'true' : undefined}
      className={cn(
        'h-8 rounded-md border border-border/70 bg-secondary/70 px-3 text-xs font-medium text-muted-foreground shadow-none transition-[background-color,border-color,color,box-shadow,transform]',
        'hover:border-input hover:bg-muted hover:text-foreground',
        'active:translate-y-px',
        'disabled:border-transparent disabled:bg-transparent disabled:text-muted-foreground/45 disabled:opacity-100',
        'data-[active=true]:border-ring/70 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:shadow-[0_0_0_1px_rgba(47,140,255,0.22),0_8px_20px_rgba(47,140,255,0.2)]',
        className,
      )}
      {...props}
    />
  )
}

export function EditorIconButton({ active, className, ...props }: EditorButtonProps) {
  return (
    <EditorButton
      active={active}
      className={cn('size-8 min-w-8 p-0', className)}
      {...props}
    />
  )
}

export function ToolPaletteButton({
  active,
  className,
  children,
  ...props
}: EditorButtonProps) {
  return (
    <EditorButton
      active={active}
      className={cn(
        'size-8 min-w-8 border-transparent bg-transparent p-0',
        'hover:border-border hover:bg-muted/70',
        'data-[active=true]:border-input data-[active=true]:bg-muted data-[active=true]:text-foreground data-[active=true]:shadow-sm',
        'data-[active=true]:[&_svg]:text-ring',
        className,
      )}
      {...props}
    >
      {children}
    </EditorButton>
  )
}

export function InspectorInput({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn(
        'h-7 rounded-md border-input bg-background/75 px-2 text-xs text-foreground shadow-none',
        'hover:border-muted-foreground/45',
        'focus-visible:ring-2 focus-visible:ring-ring/45',
        'disabled:text-muted-foreground/55',
        className,
      )}
      {...props}
    />
  )
}

export function InspectorSelect({ className, ...props }: ComponentProps<typeof NativeSelect>) {
  return (
    <NativeSelect
      size="sm"
      className={cn(
        'h-7 rounded-md border-input bg-background/75 px-2 py-0 pr-6 text-xs leading-[26px] text-foreground shadow-none',
        'hover:border-muted-foreground/45 focus-visible:ring-2 focus-visible:ring-ring/45',
        className,
      )}
      {...props}
    />
  )
}

export function InspectorSlider({ className, ...props }: ComponentProps<typeof Slider>) {
  return (
    <Slider
      className={cn(
        '[&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-input',
        '[&_[data-slot=slider-range]]:bg-ring',
        '[&_[data-slot=slider-thumb]]:size-3.5 [&_[data-slot=slider-thumb]]:border-ring [&_[data-slot=slider-thumb]]:bg-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function PanelSeparator({ className, ...props }: ComponentProps<typeof Separator>) {
  return <Separator className={cn('bg-border/70', className)} {...props} />
}

export function EditorTooltip({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="border-border bg-popover text-popover-foreground shadow-xl">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

export { TooltipProvider }

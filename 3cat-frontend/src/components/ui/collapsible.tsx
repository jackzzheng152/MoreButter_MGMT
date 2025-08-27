"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface CollapsibleProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

interface CollapsibleTriggerProps {
  asChild?: boolean
  children: React.ReactNode
  className?: string
}

interface CollapsibleContentProps {
  children: React.ReactNode
  className?: string
}

const CollapsibleContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
} | null>(null)

const Collapsible: React.FC<CollapsibleProps> = ({ open = false, onOpenChange, children }) => {
  const [internalOpen, setInternalOpen] = React.useState(open)
  const isControlled = onOpenChange !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  React.useEffect(() => {
    if (isControlled) {
      setInternalOpen(open)
    }
  }, [open, isControlled])

  return (
    <CollapsibleContext.Provider value={{ open: isOpen, setOpen: setIsOpen }}>
      {children}
    </CollapsibleContext.Provider>
  )
}

const CollapsibleTrigger: React.FC<CollapsibleTriggerProps> = ({ asChild, children, className }) => {
  const context = React.useContext(CollapsibleContext)
  if (!context) throw new Error("CollapsibleTrigger must be used within Collapsible")

  const handleClick = () => {
    context.setOpen(!context.open)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: handleClick,
      className: cn(className, (children as React.ReactElement<any>).props.className)
    })
  }

  return (
    <button onClick={handleClick} className={className}>
      {children}
    </button>
  )
}

const CollapsibleContent: React.FC<CollapsibleContentProps> = ({ children, className }) => {
  const context = React.useContext(CollapsibleContext)
  if (!context) throw new Error("CollapsibleContent must be used within Collapsible")

  if (!context.open) return null

  return (
    <div className={cn("overflow-hidden", className)}>
      {children}
    </div>
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent } 
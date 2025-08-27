import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { BarChart3, Clock, FileText, Home, LayoutDashboard, Menu, Users, Wallet, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { UserNav } from "@/components/user-nav"
import { Outlet } from "react-router-dom"
import { Calculator } from "lucide-react"

export default function DashboardLayout() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const pathname = location.pathname

  const routes = [
    // {
    //   href: "/",
    //   label: "Dashboard",
    //   icon: <LayoutDashboard className="h-5 w-5" />,
    // },
    {
      href: "/team",
      label: "Team",
      icon: <Users className="h-5 w-5" />,
    },
    {
      href: "/payroll",
      label: "Payroll",
      icon: <Wallet className="h-5 w-5" />,
    },
    // {
    //   href: "/forms",
    //   label: "Forms",
    //   icon: <FileText className="h-5 w-5" />,
    // },
    // {
    //   href: "/reports",
    //   label: "Reports",
    //   icon: <BarChart3 className="h-5 w-5" />,
    // },
    {
      href: "/employee-update",
      label: "Employee Update",
      icon: <Users className="h-5 w-5" />,
    },
    {
      href: "/labor",
      label: "Labor",
      icon: <Clock className="h-5 w-5" />,
    },
    {
      href: "/sales",
      label: "Sales",
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      href: "/bonus-calculator",
      label: "Bonus Calculator",
      icon: <Calculator className="h-5 w-5" />,
    },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 sm:max-w-xs">
            <nav className="grid gap-6 text-lg font-medium">
              <Link to="/" className="flex items-center gap-2 text-lg font-semibold" onClick={() => setOpen(false)}>
                <Home className="h-6 w-6" />
                <span>3Cat Manager</span>
              </Link>
              {routes.map((route) => (
                <Link
                  key={route.href}
                  to={route.href}
                  className={cn(
                    "flex items-center gap-2 text-muted-foreground",
                    pathname === route.href && "text-foreground font-semibold",
                  )}
                  onClick={() => setOpen(false)}
                >
                  {route.icon}
                  {route.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Home className="h-6 w-6" />
          <span className="hidden md:inline">3Cat Manager</span>
        </Link>
        <nav className="hidden flex-1 items-center gap-6 md:flex">
          {routes.map((route) => (
            <Link
              key={route.href}
              to={route.href}
              className={cn(
                "flex items-center gap-2 text-sm font-medium text-muted-foreground",
                pathname === route.href && "text-foreground font-semibold",
              )}
            >
              {route.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <UserNav/>
        </div>
      </header>
      <main className="flex-1"><Outlet /></main>
    </div>
    
  )
}


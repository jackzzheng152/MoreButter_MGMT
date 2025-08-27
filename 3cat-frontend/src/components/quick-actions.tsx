import { Link } from "react-router-dom"
import { FileSpreadsheet, FileUp, Users, Wallet } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function QuickActions() {
  const actions = [
    {
      title: "Process Payroll",
      description: "Convert files to Gusto format",
      icon: <Wallet className="h-6 w-6" />,
      href: "/payroll",
    },
    {
      title: "Upload Files",
      description: "Add documents to the system",
      icon: <FileUp className="h-6 w-6" />,
      href: "/files/upload",
    },
    {
      title: "Team Management",
      description: "View and manage your team",
      icon: <Users className="h-6 w-6" />,
      href: "/team",
    },
    {
      title: "Export Reports",
      description: "Generate custom reports",
      icon: <FileSpreadsheet className="h-6 w-6" />,
      href: "/reports",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {actions.map((action) => (
        <Link key={action.title} to={action.href}>
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{action.title}</CardTitle>
              {action.icon}
            </CardHeader>
            <CardContent>
              <CardDescription>{action.description}</CardDescription>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}


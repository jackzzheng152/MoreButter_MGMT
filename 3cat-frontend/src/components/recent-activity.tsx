import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileCheck, FileText, UserPlus, Wallet } from "lucide-react"

export function RecentActivity() {
  const activities = [
    {
      icon: <Wallet className="h-4 w-4 text-blue-500" />,
      description: "Payroll processed for March",
      timestamp: "2 hours ago",
    },
    {
      icon: <FileText className="h-4 w-4 text-green-500" />,
      description: "New employee survey created",
      timestamp: "Yesterday",
    },
    {
      icon: <UserPlus className="h-4 w-4 text-purple-500" />,
      description: "New team member added",
      timestamp: "2 days ago",
    },
    {
      icon: <FileCheck className="h-4 w-4 text-orange-500" />,
      description: "Quarterly report generated",
      timestamp: "1 week ago",
    },
  ]

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest actions in your workspace</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="mt-0.5 rounded-full bg-muted p-1">{activity.icon}</div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">{activity.description}</p>
                <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


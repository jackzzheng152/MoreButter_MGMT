"use client"

import { CalendarDays, ChevronRight, Clock, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { PayPeriod } from "@/features/payroll processing/types/payroll-types"

interface PayPeriodCardProps {
  payPeriod: PayPeriod
  locationName: string
  onClick: () => void
  onDelete: () => void
}

export function PayPeriodCard({ payPeriod, locationName, onClick, onDelete }: PayPeriodCardProps) {
  function formatDate(dateString: string): string {
    let date: Date;
  
    // ISO format "yyyy-mm-dd"
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(year, month - 1, day);
    }
    // US format "m/d/yyyy" or "mm/dd/yyyy"
    else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
      const [month, day, year] = dateString.split('/').map(Number);
      date = new Date(year, month - 1, day);
    }
    // Fallback to built‑in parser (handles things like "2025-05-05T14:30:00Z", etc.)
    else {
      date = new Date(dateString);
    }
  
    // If parsing failed, just return the original string
    if (isNaN(date.getTime())) {
      return dateString;
    }
  
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day:   'numeric',
      year:  'numeric',
    });
  }


  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
      case "in-progress":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200"
      case "completed":
        return "bg-green-100 text-green-800 hover:bg-green-200"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending"
      case "in-progress":
        return "In Progress"
      case "completed":
        return "Completed"
      default:
        return status
    }
  }

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row md:items-center">
          <div className="flex flex-col p-4 md:p-6 cursor-pointer flex-grow" onClick={onClick}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{locationName} Pay Period</h3>
                  <Badge className={getStatusColor(payPeriod.status)}>{getStatusText(payPeriod.status)}</Badge>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <CalendarDays className="mr-1 h-4 w-4" />
                  <span>
                    {formatDate(payPeriod.startDate)} - {formatDate(payPeriod.endDate)}
                  </span>
                </div>
              </div>
              <div className="flex items-center mt-2 md:mt-0">
                <Clock className="mr-1 h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground mr-2">
                  {payPeriod.status === "completed" ? "Processed" : "Needs processing"}
                </span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>
          <div className="border-t md:border-t-0 md:border-l h-full flex items-center p-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Pay Period</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this pay period? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// src/components/CompensationChangeDetail.tsx
"use client"

import { useState } from "react"
import { ArrowLeft, CheckCircle, XCircle, FileText, User, Briefcase, Clock, MessageSquare, DollarSign, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { safeToFixed } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { CompensationChange } from "@/features/employee update/hooks/useCompensation"
import { Employee } from "@/features/employee update/hooks/useEmployees"
import type { ChangeEvent } from "react"

interface CompensationChangeDetailProps {
  change: CompensationChange;
  employee: Employee | undefined;
  onBack: () => void;
  onApprove: (change: CompensationChange) => void;
  onDeny: (change: CompensationChange, notes: string) => void;
}

export function CompensationChangeDetail({ 
  change, 
  employee,
  onBack, 
  onApprove, 
  onDeny 
}: CompensationChangeDetailProps) {
  const [isDenyDialogOpen, setIsDenyDialogOpen] = useState(false)
  const [denyReason, setDenyReason] = useState("")
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)

  // Helper function to format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Get employee name
  const employeeName = employee 
    ? `${employee.first_name} ${employee.last_name}`
    : `Employee #${change.employee_id}`;

  // Handle deny submission
  const handleDenySubmit = () => {
    if (!denyReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a reason for denying this update.",
        variant: "destructive",
      })
      return
    }

    onDeny(change, denyReason)
    setIsDenyDialogOpen(false)
    setDenyReason("")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Compensation Changes
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                  Compensation Update
                </Badge>
                {change.review_status === "pending" ? (
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                    Pending Review
                  </Badge>
                ) : change.review_status === "approved" ? (
                  <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Approved
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">
                    <XCircle className="mr-1 h-3 w-3" />
                    Denied
                  </Badge>
                )}
              </div>
              <CardTitle>Compensation Update for {employeeName}</CardTitle>
              <CardDescription>Submitted on {formatDate(change.created_at)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  Employee Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Name</p>
                    <p className="text-sm text-muted-foreground">{employeeName}</p>
                  </div>
                  {employee && (
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{employee.email}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">Employee ID</p>
                    <p className="text-sm text-muted-foreground">{change.employee_id}</p>
                  </div>
                  {employee && (
                    <div>
                      <p className="text-sm font-medium">BambooHR ID</p>
                      <p className="text-sm text-muted-foreground">{employee.bamboo_hr_id}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  Compensation Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">New Compensation</p>
                    <p className="text-sm text-muted-foreground">${safeToFixed(change.new_compensation)}/hr</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Effective Date</p>
                    <p className="text-sm text-muted-foreground">{new Date(change.effective_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {(change.position_name || change.status_name) && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-muted-foreground" />
                      Position Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {change.position_name && (
                        <div>
                          <p className="text-sm font-medium">Position</p>
                          <p className="text-sm text-muted-foreground">{change.position_name}</p>
                        </div>
                      )}
                      {change.status_name && (
                        <div>
                          <p className="text-sm font-medium">Employment Status</p>
                          <p className="text-sm text-muted-foreground">{change.status_name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {change.location_name && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      Location Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Location</p>
                        <p className="text-sm text-muted-foreground">{change.location_name}</p>
                      </div>
                      {change.location_id && (
                        <div>
                          <p className="text-sm font-medium">Location ID</p>
                          <p className="text-sm text-muted-foreground">{change.location_id}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  Reason for Update
                </h3>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">{change.reason || "No reason provided"}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  Submission Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {change.submitter_name && (
                    <div>
                      <p className="text-sm font-medium">Submitted By</p>
                      <p className="text-sm text-muted-foreground">
                        {change.submitter_name} {change.submitter_code ? `(Code: ${change.submitter_code})` : ""}
                      </p>
                    </div>
                  )}
                  {change.submission_id && (
                    <div>
                      <p className="text-sm font-medium">Submission ID</p>
                      <p className="text-sm text-muted-foreground">{change.submission_id}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">Change ID</p>
                    <p className="text-sm text-muted-foreground">{change.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Submission Date</p>
                    <p className="text-sm text-muted-foreground">{formatDate(change.created_at)}</p>
                  </div>
                  {change.processed !== undefined && (
                    <div>
                      <p className="text-sm font-medium">Processing Status</p>
                      <p className="text-sm text-muted-foreground">
                        {change.processed ? (
                          <span className="flex items-center text-green-600">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Processed
                          </span>
                        ) : (
                          <span className="flex items-center text-amber-600">
                            <Clock className="mr-1 h-3 w-3" />
                            Pending Processing
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {change.review_status !== "pending" && (
                <>
                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      Review Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {change.reviewed_by && (
                        <div>
                          <p className="text-sm font-medium">Reviewed By</p>
                          <p className="text-sm text-muted-foreground">{change.reviewed_by}</p>
                        </div>
                      )}
                      {change.reviewed_at && (
                        <div>
                          <p className="text-sm font-medium">Review Date</p>
                          <p className="text-sm text-muted-foreground">{formatDate(change.reviewed_at)}</p>
                        </div>
                      )}
                      {change.review_status === "denied" && change.review_notes && (
                        <div className="col-span-2">
                          <p className="text-sm font-medium">Denial Reason</p>
                          <div className="p-3 bg-muted rounded-md mt-1">
                            <p className="text-sm">{change.review_notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            {change.review_status === "pending" && (
              <CardFooter className="flex justify-end gap-2">
                <Dialog open={isDenyDialogOpen} onOpenChange={setIsDenyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <XCircle className="mr-2 h-4 w-4" />
                      Deny
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Deny Compensation Update</DialogTitle>
                      <DialogDescription>
                        Please provide a reason for denying this compensation update request.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Textarea
                        placeholder="Enter reason for denial..."
                        value={denyReason}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDenyReason(e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDenyDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={handleDenySubmit}>
                        Deny Update
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Approve Compensation Update</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to approve this compensation update request?
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Employee: {employeeName}</p>
                        <p className="text-sm font-medium">New Compensation: ${safeToFixed(change.new_compensation)}/hr</p>
                        <p className="text-sm font-medium">Effective Date: {new Date(change.effective_date).toLocaleDateString()}</p>
                        {change.position_name && <p className="text-sm font-medium">Position: {change.position_name}</p>}
                        {change.location_name && <p className="text-sm font-medium">Location: {change.location_name}</p>}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          onApprove(change)
                          setIsApproveDialogOpen(false)
                        }}
                      >
                        Confirm Approval
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
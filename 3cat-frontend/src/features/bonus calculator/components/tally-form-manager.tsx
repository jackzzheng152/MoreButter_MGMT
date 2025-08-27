"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import type { TimesheetEntry, TallyForm, TallyIssue } from "../types/timesheet"

interface TallyFormManagerProps {
  timesheetData: TimesheetEntry[]
  tallyForms: TallyForm[]
  onTallyFormSubmit: (tallyForm: TallyForm) => void
}

export function TallyFormManager({ timesheetData, tallyForms, onTallyFormSubmit }: TallyFormManagerProps) {
  const [showNewForm, setShowNewForm] = useState(false)
  const [newForm, setNewForm] = useState({
    date: "",
    shiftType: "morning" as "morning" | "night",
    submittedBy: "Manager",
    notes: "",
  })
  const [issues, setIssues] = useState<TallyIssue[]>([])

  // Get unique dates and shifts from timesheet data
  const availableShifts = Array.from(new Set(timesheetData.map((entry) => `${entry.date}-${entry.shiftType}`))).map(
    (key) => {
      const [date, shiftType] = key.split("-")
      return { date, shiftType: shiftType as "morning" | "night" }
    },
  )

  const addIssue = () => {
    setIssues([
      ...issues,
      {
        type: "other",
        severity: "minor",
        description: "",
        affectsEligibility: false,
      },
    ])
  }

  const updateIssue = (index: number, field: keyof TallyIssue, value: any) => {
    setIssues(issues.map((issue, i) => (i === index ? { ...issue, [field]: value } : issue)))
  }

  const removeIssue = (index: number) => {
    setIssues(issues.filter((_, i) => i !== index))
  }

  const submitTallyForm = () => {
    if (!newForm.date || !newForm.shiftType) return

    // Determine overall status based on issues
    const criticalIssues = issues.filter((issue) => issue.severity === "critical" && issue.affectsEligibility)
    const majorIssues = issues.filter((issue) => issue.severity === "major" && issue.affectsEligibility)

    let overallStatus: "eligible" | "ineligible" | "conditional" = "eligible"
    if (criticalIssues.length > 0) {
      overallStatus = "ineligible"
    } else if (majorIssues.length > 0) {
      overallStatus = "conditional"
    }

    const tallyForm: TallyForm = {
      id: `tally-${Date.now()}`,
      date: newForm.date,
      shiftType: newForm.shiftType,
      submittedBy: newForm.submittedBy,
      submittedAt: new Date().toISOString(),
      issues: [...issues],
      overallStatus,
      notes: newForm.notes,
    }

    onTallyFormSubmit(tallyForm)

    // Reset form
    setNewForm({
      date: "",
      shiftType: "morning",
      submittedBy: "Manager",
      notes: "",
    })
    setIssues([])
    setShowNewForm(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "eligible":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "ineligible":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "conditional":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* New Tally Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Shift Tally Forms</CardTitle>
              <CardDescription>Report issues that may affect shift bonus eligibility</CardDescription>
            </div>
            <Button onClick={() => setShowNewForm(!showNewForm)} variant={showNewForm ? "outline" : "default"}>
              <Plus className="mr-2 h-4 w-4" />
              {showNewForm ? "Cancel" : "New Tally Form"}
            </Button>
          </div>
        </CardHeader>

        {showNewForm && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date & Shift</Label>
                <Select
                  value={`${newForm.date}-${newForm.shiftType}`}
                  onValueChange={(value) => {
                    const [date, shiftType] = value.split("-")
                    setNewForm((prev) => ({ ...prev, date, shiftType: shiftType as "morning" | "night" }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableShifts.map((shift) => (
                      <SelectItem key={`${shift.date}-${shift.shiftType}`} value={`${shift.date}-${shift.shiftType}`}>
                        {shift.date} - {shift.shiftType === "morning" ? "Morning" : "Night"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Submitted By</Label>
                <Input
                  value={newForm.submittedBy}
                  onChange={(e) => setNewForm((prev) => ({ ...prev, submittedBy: e.target.value }))}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label>Actions</Label>
                <Button onClick={addIssue} variant="outline" className="w-full bg-transparent">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Issue
                </Button>
              </div>
            </div>

            {/* Issues List */}
            {issues.length > 0 && (
              <div className="space-y-4">
                <Label>Reported Issues</Label>
                {issues.map((issue, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Issue Type</Label>
                        <Select value={issue.type} onValueChange={(value) => updateIssue(index, "type", value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="understaffed">Understaffed</SelectItem>
                            <SelectItem value="equipment_failure">Equipment Failure</SelectItem>
                            <SelectItem value="supply_shortage">Supply Shortage</SelectItem>
                            <SelectItem value="customer_complaint">Customer Complaint</SelectItem>
                            <SelectItem value="safety_incident">Safety Incident</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Severity</Label>
                        <Select value={issue.severity} onValueChange={(value) => updateIssue(index, "severity", value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minor">Minor</SelectItem>
                            <SelectItem value="major">Major</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={issue.description}
                          onChange={(e) => updateIssue(index, "description", e.target.value)}
                          placeholder="Describe the issue"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Actions</Label>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={issue.affectsEligibility}
                            onCheckedChange={(checked) => updateIssue(index, "affectsEligibility", !!checked)}
                          />
                          <Label className="text-sm">Affects eligibility</Label>
                        </div>
                        <Button onClick={() => removeIssue(index)} variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={newForm.notes}
                onChange={(e) => setNewForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes about this shift..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={submitTallyForm} disabled={!newForm.date || !newForm.shiftType}>
                Submit Tally Form
              </Button>
              <Button onClick={() => setShowNewForm(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Existing Tally Forms */}
      <Card>
        <CardHeader>
          <CardTitle>Submitted Tally Forms</CardTitle>
          <CardDescription>Review all submitted tally forms and their impact on eligibility</CardDescription>
        </CardHeader>
        <CardContent>
          {tallyForms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tally forms submitted yet. Create one above to report shift issues.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issues</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Submitted At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tallyForms
                    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                    .map((form) => (
                      <TableRow key={form.id}>
                        <TableCell>{form.date}</TableCell>
                        <TableCell>
                          <Badge variant={form.shiftType === "morning" ? "default" : "outline"}>
                            {form.shiftType === "morning" ? "AM" : "PM"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(form.overallStatus)}
                            <Badge
                              variant={
                                form.overallStatus === "eligible"
                                  ? "default"
                                  : form.overallStatus === "ineligible"
                                    ? "destructive"
                                    : "outline"
                              }
                            >
                              {form.overallStatus}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {form.issues.map((issue, index) => (
                              <div key={index} className="text-sm">
                                <Badge variant="outline" className="mr-1">
                                  {issue.type.replace("_", " ")}
                                </Badge>
                                <span className="text-muted-foreground">({issue.severity})</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{form.submittedBy}</TableCell>
                        <TableCell>{new Date(form.submittedAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

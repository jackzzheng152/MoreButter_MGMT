"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Edit, Save, CheckCircle, XCircle } from "lucide-react"
import type { ShiftEligibility, TallyForm, TimesheetEntry } from "../types/timesheet"

interface ShiftEligibilityEditorProps {
  shiftEligibility: ShiftEligibility[]
  tallyForms: TallyForm[]
  timesheetData: TimesheetEntry[]
  onEligibilityUpdate: (eligibility: ShiftEligibility[]) => void
}

export function ShiftEligibilityEditor({
  shiftEligibility,
  tallyForms,
  timesheetData,
  onEligibilityUpdate,
}: ShiftEligibilityEditorProps) {
  const [editingShift, setEditingShift] = useState<ShiftEligibility | null>(null)
  const [editForm, setEditForm] = useState({
    isEligible: true,
    reason: "",
    manualOverride: false,
    overrideReason: "",
  })

  const openEditDialog = (shift: ShiftEligibility) => {
    setEditingShift(shift)
    setEditForm({
      isEligible: shift.isEligible,
      reason: shift.reason || "",
      manualOverride: shift.manualOverride || false,
      overrideReason: shift.overrideReason || "",
    })
  }

  const saveChanges = () => {
    if (!editingShift) return

    const updatedEligibility = shiftEligibility.map((shift) =>
      shift.date === editingShift.date && shift.shiftType === editingShift.shiftType
        ? {
            ...shift,
            isEligible: editForm.isEligible,
            reason: editForm.reason || undefined,
            manualOverride: editForm.manualOverride,
            overrideReason: editForm.overrideReason || undefined,
            lastUpdated: new Date().toISOString(),
            updatedBy: "Manager", // In real app, get from auth
          }
        : shift,
    )

    onEligibilityUpdate(updatedEligibility)
    setEditingShift(null)
  }

  const getShiftStats = (date: string, shiftType: "morning" | "night") => {
    const shiftEntries = timesheetData.filter((entry) => entry.date === date && entry.shiftType === shiftType)
    const totalHours = shiftEntries.reduce((sum, entry) => sum + entry.hoursWorked, 0)
    const totalPay = shiftEntries.reduce((sum, entry) => sum + entry.totalPay, 0)
    return {
      employeeCount: shiftEntries.length,
      totalHours: totalHours.toFixed(1),
      totalPay: totalPay.toFixed(2),
    }
  }

  const getTallyFormForShift = (date: string, shiftType: "morning" | "night") => {
    return tallyForms.find((form) => form.date === date && form.shiftType === shiftType)
  }

  const getStatusIcon = (isEligible: boolean, hasOverride?: boolean) => {
    if (hasOverride) {
      return <Edit className="h-4 w-4 text-blue-600" />
    }
    return isEligible ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    )
  }

  const eligibleCount = shiftEligibility.filter((s) => s.isEligible).length
  const ineligibleCount = shiftEligibility.filter((s) => !s.isEligible).length
  const overrideCount = shiftEligibility.filter((s) => s.manualOverride).length

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{shiftEligibility.length}</div>
            <div className="text-sm text-muted-foreground">Total Shifts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{eligibleCount}</div>
            <div className="text-sm text-muted-foreground">Eligible</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{ineligibleCount}</div>
            <div className="text-sm text-muted-foreground">Ineligible</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{overrideCount}</div>
            <div className="text-sm text-muted-foreground">Manual Overrides</div>
          </CardContent>
        </Card>
      </div>

      {/* Eligibility Table */}
      <Card>
        <CardHeader>
          <CardTitle>Shift Eligibility Management</CardTitle>
          <CardDescription>Review and edit bonus eligibility for each shift</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Tally Form</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shiftEligibility
                  .sort((a, b) => {
                    if (a.date !== b.date) return a.date.localeCompare(b.date)
                    return a.shiftType.localeCompare(b.shiftType)
                  })
                  .map((shift) => {
                    const stats = getShiftStats(shift.date, shift.shiftType)
                    const tallyForm = getTallyFormForShift(shift.date, shift.shiftType)

                    return (
                      <TableRow key={`${shift.date}-${shift.shiftType}`}>
                        <TableCell className="font-medium">{shift.date}</TableCell>
                        <TableCell>
                          <Badge variant={shift.shiftType === "morning" ? "default" : "outline"}>
                            {shift.shiftType === "morning" ? "AM" : "PM"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(shift.isEligible, shift.manualOverride)}
                            <Badge variant={shift.isEligible ? "default" : "destructive"}>
                              {shift.isEligible ? "Eligible" : "Ineligible"}
                            </Badge>
                            {shift.manualOverride && <Badge variant="outline">Override</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>{stats.employeeCount}</TableCell>
                        <TableCell>{stats.totalHours}h</TableCell>
                        <TableCell>
                          {tallyForm ? (
                            <Badge
                              variant={
                                tallyForm.overallStatus === "eligible"
                                  ? "default"
                                  : tallyForm.overallStatus === "ineligible"
                                    ? "destructive"
                                    : "outline"
                              }
                            >
                              {tallyForm.overallStatus}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {shift.reason || shift.overrideReason || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(shift.lastUpdated).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => openEditDialog(shift)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>
                                  Edit Shift Eligibility - {shift.date} {shift.shiftType === "morning" ? "AM" : "PM"}
                                </DialogTitle>
                                <DialogDescription>
                                  Modify the bonus eligibility status for this shift
                                </DialogDescription>
                              </DialogHeader>

                              <div className="space-y-4">
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={editForm.isEligible}
                                    onCheckedChange={(checked) =>
                                      setEditForm((prev) => ({ ...prev, isEligible: checked }))
                                    }
                                  />
                                  <Label>Eligible for bonuses</Label>
                                </div>

                                {!editForm.isEligible && (
                                  <div className="space-y-2">
                                    <Label>Reason for ineligibility</Label>
                                    <Textarea
                                      value={editForm.reason}
                                      onChange={(e) => setEditForm((prev) => ({ ...prev, reason: e.target.value }))}
                                      placeholder="Explain why this shift is not eligible for bonuses..."
                                      rows={3}
                                    />
                                  </div>
                                )}

                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={editForm.manualOverride}
                                    onCheckedChange={(checked) =>
                                      setEditForm((prev) => ({ ...prev, manualOverride: checked }))
                                    }
                                  />
                                  <Label>Manual override</Label>
                                </div>

                                {editForm.manualOverride && (
                                  <div className="space-y-2">
                                    <Label>Override reason</Label>
                                    <Textarea
                                      value={editForm.overrideReason}
                                      onChange={(e) =>
                                        setEditForm((prev) => ({ ...prev, overrideReason: e.target.value }))
                                      }
                                      placeholder="Explain the reason for manual override..."
                                      rows={3}
                                    />
                                  </div>
                                )}

                                <div className="flex gap-2">
                                  <Button onClick={saveChanges}>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Changes
                                  </Button>
                                  <Button variant="outline" onClick={() => setEditingShift(null)}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

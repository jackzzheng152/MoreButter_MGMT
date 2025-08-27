"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, AlertTriangle, Download, RefreshCw, Shield, Settings } from "lucide-react"
import type { ShiftEligibility, EmployeeEligibility, TimesheetEntry } from "../types/timesheet"
import { fetchTimesheetData } from "../lib/timesheet-api"
import { EligibilityManager } from "../components/eligibility-manager"
import { useTimesheetData, useEligibilityData, useAppConfig, useAppUI } from "../contexts/app-context"

// Hardcoded location data
const LOCATIONS = [
  { code: "CH", id: "435860", name: "Chino Hills" },
  { code: "TT", id: "438073", name: "Tustin" },
  { code: "KT", id: "442910", name: "Koreatown" },
  { code: "SG", id: "442908", name: "San Gabriel" },
  { code: "AC", id: "442909", name: "Arcadia" },
  { code: "RH", id: "442912", name: "Rowland Heights" },
] as const

export function TimesheetManager() {
  const { timesheetData, setTimesheetData } = useTimesheetData()
  const { shiftEligibility, setShiftEligibility, setEmployeeEligibility, employeeEligibility } = useEligibilityData()
  const { apiConfig, dateRange, shiftSettings, setApiConfig, setDateRange, setShiftSettings } = useAppConfig()
  const { isProcessing, setIsProcessing } = useAppUI()

  const [error, setError] = useState<string | null>(null)
  const [showShiftConfig, setShowShiftConfig] = useState(false)

  const loadTimesheetData = async () => {
    setIsProcessing(true)
    setError(null)
  
    try {
      console.log("Step 1: Fetching timesheet data with shift splitting...")
      const processedData = await fetchTimesheetData(
        apiConfig.apiKey,
        apiConfig.locationId,
        dateRange.startDate,
        dateRange.endDate,
        shiftSettings
      )
  
      setTimesheetData(processedData)
      
      console.log("Step 2: Reinitializing shift eligibility...")
      const newShiftEligibility = generateInitialEligibility(processedData)
      setShiftEligibility(newShiftEligibility) // Complete reset
      
      console.log("Step 3: Reinitializing employee eligibility...")
      const newEmployeeEligibility = initializeEmployeeEligibility(processedData)
      setEmployeeEligibility(newEmployeeEligibility) // Complete reset
  
      console.log("Timesheet loading and processing complete!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load timesheet data")
    } finally {
      setIsProcessing(false)
    }
  }
  
  const reapplyShiftSplitting = async () => {
    // Same logic for reapplying shift splits
    setIsProcessing(true)
    setError(null)
  
    try {
      console.log("Reapplying shift splitting with new settings...")
      
      const processedData = await fetchTimesheetData(
        apiConfig.apiKey,
        apiConfig.locationId,
        dateRange.startDate,
        dateRange.endDate,
        shiftSettings
      )
  
      setTimesheetData(processedData)
  
      // Complete reset of eligibility data
      const newShiftEligibility = generateInitialEligibility(processedData)
      setShiftEligibility(newShiftEligibility)
      
      const newEmployeeEligibility = initializeEmployeeEligibility(processedData)
      setEmployeeEligibility(newEmployeeEligibility)
  
      console.log("Shift splitting reapplied successfully!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reapply shift splitting")
    } finally {
      setIsProcessing(false)
    }
  }

  const generateInitialEligibility = (timesheet: any[]): ShiftEligibility[] => {
    const shifts = new Map<string, ShiftEligibility>()

    timesheet.forEach((entry) => {
      if (entry.shiftType === "unassigned") return

      const key = `${entry.date}-${entry.shiftType}`
      if (!shifts.has(key)) {
        shifts.set(key, {
          date: entry.date,
          shiftType: entry.shiftType,
          isEligible: true,
          lastUpdated: new Date().toISOString(),
          updatedBy: "System",
        })
      }
    })

    return Array.from(shifts.values())
  }

  const initializeEmployeeEligibility = useCallback((timesheetEntries: TimesheetEntry[]) => {
    if (timesheetEntries.length === 0) return []
  
    const eligibilityMap = new Map<string, EmployeeEligibility>()
  
    timesheetEntries.forEach((entry) => {
      if (entry.shiftType === "unassigned") return // Skip unassigned entries
  
      const key = `${entry.employeeId}-${entry.date}-${entry.shiftType}`
      if (!eligibilityMap.has(key)) {
        eligibilityMap.set(key, {
          employeeId: entry.employeeId,
          employeeName: entry.employeeName,
          date: entry.date,
          shiftType: entry.shiftType,
          isEligible: true,
          infractionIds: [],
          lastUpdated: new Date().toISOString(),
          updatedBy: "System",
        })
      }
    })
  
    return Array.from(eligibilityMap.values())
  }, []) // No dependencies since we pass timesheetEntries as parameter

  const handleEligibilityUpdate = (updatedEligibility: ShiftEligibility[]) => {
    setShiftEligibility(updatedEligibility)
  }

  const handleEmployeeEligibilityUpdate = useCallback(
    (updatedEligibility: EmployeeEligibility[]) => {
      console.log('📝 TimesheetManager: handleEmployeeEligibilityUpdate called')
      console.log('📝 Current employeeEligibility length:', employeeEligibility.length)
      console.log('📝 Updated eligibility length:', updatedEligibility.length)
      console.log('📝 Sample current:', employeeEligibility.slice(0, 2))
      console.log('📝 Sample updated:', updatedEligibility.slice(0, 2))
    console.trace('📝 Called from:')
      setEmployeeEligibility(updatedEligibility)
    },
    [setEmployeeEligibility],
)

  const handleShiftSettingChange = (field: string, value: string) => {
    setShiftSettings({ [field]: value })
  }

  const groupedTimesheet = (timesheetData || []).reduce(
    (acc, entry) => {
      if (entry.shiftType === "unassigned") return acc

      const key = `${entry.date}-${entry.shiftType}`
      if (!acc[key]) {
        acc[key] = {
          date: entry.date,
          shiftType: entry.shiftType,
          entries: [],
          totalHours: 0,
          totalPay: 0,
          employeeCount: 0,
        }
      }
      acc[key].entries.push(entry)
      acc[key].totalHours += entry.hoursWorked
      acc[key].totalPay += entry.totalPay
      acc[key].employeeCount++
      return acc
    },
    {} as Record<string, any>,
  )

  const eligibleShifts = (shiftEligibility || []).filter((e) => e.isEligible).length
  const ineligibleShifts = (shiftEligibility || []).filter((e) => !e.isEligible).length
  const unassignedEntries = timesheetData.filter((e) => e.shiftType === "unassigned").length

  const selectedLocation = LOCATIONS.find(loc => loc.id === apiConfig.locationId)

  return (
    <div className="space-y-6">
      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            7shifts Timesheet Integration
          </CardTitle>
          <CardDescription>Pull timesheet data with intelligent shift splitting and exact break timing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="locationId">Location</Label>
              <Select 
                value={apiConfig.locationId} 
                onValueChange={(value) => setApiConfig({ locationId: value })}
              >
                <SelectTrigger id="locationId">
                  <SelectValue placeholder="Select a location">
                    {selectedLocation ? `${selectedLocation.name} (${selectedLocation.code})` : "Select a location"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent position="popper">
                  {LOCATIONS.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{location.name}</span>
                        <span className="text-muted-foreground text-sm ml-4">
                          {location.code} • {location.id}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedLocation && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedLocation.name} ({selectedLocation.code})
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={loadTimesheetData} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Load Timesheet Data {selectedLocation ? `for ${selectedLocation.name}` : ''}
                </>
              )}
            </Button>
            <Button
              onClick={() => setShowShiftConfig(!showShiftConfig)}
              variant="outline"
            >
              <Settings className="mr-2 h-4 w-4" />
              {showShiftConfig ? "Hide" : "Configure"} Shift Splitting
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Shift Configuration */}
      {showShiftConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Shift Splitting Configuration
            </CardTitle>
            <CardDescription>Configure how to split swing shifts into morning and night segments with exact break timing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Split Method</Label>
                <Select
                  value={shiftSettings.splitMethod}
                  onValueChange={(value: "time-based" | "custom") => handleShiftSettingChange("splitMethod", value)}
                >
                  <SelectTrigger>
                    <SelectValue>
                        {shiftSettings.splitMethod === "time-based" ? "Time-based (Morning/Night)" : "Custom Split Time"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="time-based">Time-based (Morning/Night)</SelectItem>
                    <SelectItem value="custom">Custom Split Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {shiftSettings.splitMethod === "time-based" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Morning Shift Hours</Label>
                    <Select
                      value={shiftSettings.morningHours}
                      onValueChange={(value) => handleShiftSettingChange("morningHours", value)}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {shiftSettings.morningHours}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="06:00-14:00">6:00 AM - 2:00 PM</SelectItem>
                        <SelectItem value="07:00-15:00">7:00 AM - 3:00 PM</SelectItem>
                        <SelectItem value="08:00-16:00">8:00 AM - 4:00 PM</SelectItem>
                        <SelectItem value="05:00-13:00">5:00 AM - 1:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Night Shift Hours</Label>
                    <Select
                      value={shiftSettings.nightHours}
                      onValueChange={(value) => handleShiftSettingChange("nightHours", value)}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {shiftSettings.nightHours}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="14:00-23:00">2:00 PM - 11:00 PM</SelectItem>
                        <SelectItem value="15:00-24:00">3:00 PM - 12:00 AM</SelectItem>
                        <SelectItem value="16:00-01:00">4:00 PM - 1:00 AM</SelectItem>
                        <SelectItem value="13:00-22:00">1:00 PM - 10:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {shiftSettings.splitMethod === "custom" && (
                <div className="space-y-2">
                  <Label>Custom Split Time</Label>
                  <Input
                    type="time"
                    value={shiftSettings.customSplitTime}
                    onChange={(e) => handleShiftSettingChange("customSplitTime", e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Swing shifts will be split at this time, with breaks deducted from the exact period when they occur
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={reapplyShiftSplitting} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  "Apply New Settings"
                )}
              </Button>
              <Button onClick={() => setShowShiftConfig(false)} variant="outline">
                Done
              </Button>
            </div>

            <Alert>
              <AlertDescription>
                <strong>Intelligent Splitting:</strong> Swing shifts will be automatically split into separate morning and night entries. 
                Unpaid breaks will be deducted from the exact time period when they occur, not proportionally distributed.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {timesheetData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{Object.keys(groupedTimesheet).length}</div>
              <div className="text-sm text-muted-foreground">Assigned Shifts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{timesheetData.length - unassignedEntries}</div>
              <div className="text-sm text-muted-foreground">Employee Entries</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{eligibleShifts}</div>
              <div className="text-sm text-muted-foreground">Eligible Shifts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{ineligibleShifts}</div>
              <div className="text-sm text-muted-foreground">Ineligible Shifts</div>
            </CardContent>
          </Card>
          {unassignedEntries > 0 && (
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{unassignedEntries}</div>
                <div className="text-sm text-muted-foreground">Unassigned</div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Main Content Tabs */}
      {timesheetData.length > 0 && (
        <Tabs defaultValue="eligibility" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="eligibility" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Eligibility Management
            </TabsTrigger>
            <TabsTrigger value="timesheet">Processed Timesheet Data</TabsTrigger>
          </TabsList>

          <TabsContent value="eligibility" className="space-y-4">
            <EligibilityManager
              timesheetData={timesheetData.filter((e) => e.shiftType !== "unassigned")}
              shiftEligibility={shiftEligibility}
              employeeEligibility={employeeEligibility}
              onShiftEligibilityUpdate={handleEligibilityUpdate}
              onEmployeeEligibilityUpdate={handleEmployeeEligibilityUpdate}
            />
          </TabsContent>

          <TabsContent value="timesheet" className="space-y-4">
            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">
                    {timesheetData.reduce((sum, entry) => sum + entry.hoursWorked, 0).toFixed(1)}h
                  </div>
                  <div className="text-sm text-muted-foreground">Total Hours</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">
                    {timesheetData
                      .filter((entry) => entry.hoursWorked > 8)
                      .reduce((sum, entry) => sum + (entry.hoursWorked - 8), 0)
                      .toFixed(1)}
                    h
                  </div>
                  <div className="text-sm text-muted-foreground">Overtime Hours</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">
                    ${timesheetData.reduce((sum, entry) => sum + entry.totalPay, 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Payroll</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">
                    $
                    {(
                      timesheetData.reduce((sum, entry) => sum + entry.totalPay, 0) /
                      Math.max(
                        timesheetData.reduce((sum, entry) => sum + entry.hoursWorked, 0),
                        1,
                      )
                    ).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Hourly Rate</div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed breakdown by date and shift */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Summary</CardTitle>
                <CardDescription>
                  Hours and payroll breakdown by date and shift (with intelligent splitting)
                  {selectedLocation && ` • ${selectedLocation.name} (${selectedLocation.code})`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(groupedTimesheet).map(([key, summary]: [string, any]) => (
                    <div key={key} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{summary.date}</h3>
                        <Badge variant={summary.shiftType === "morning" ? "default" : "outline"}>
                          {summary.shiftType === "morning" ? "AM" : "PM"}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Employees:</span>
                          <span className="font-medium">{summary.employeeCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Hours:</span>
                          <span className="font-medium">{summary.totalHours.toFixed(1)}h</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Overtime:</span>
                          <span className="font-medium">
                            {summary.entries
                              .reduce((sum: number, entry: any) => sum + Math.max(0, entry.hoursWorked - 8), 0)
                              .toFixed(1)}
                            h
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Pay:</span>
                          <span className="font-medium">${summary.totalPay.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Rate:</span>
                          <span className="font-medium">
                            ${(summary.totalPay / Math.max(summary.totalHours, 1)).toFixed(2)}/hr
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Processed Timesheet Data</CardTitle>
                <CardDescription>
                  Timesheet entries with intelligent shift splitting and exact break timing deduction
                  {selectedLocation && ` • ${selectedLocation.name} (${selectedLocation.code})`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-[500px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead>Net Hours</TableHead>
                        <TableHead>Unpaid Breaks</TableHead>
                        <TableHead>Assigned Shift</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Pay</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timesheetData
                        .sort((a, b) => {
                          if (a.date !== b.date) return a.date.localeCompare(b.date)
                          return new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime()
                        })
                        .map((entry) => {
                          return (
                            <TableRow key={entry.id}>
                              <TableCell>{entry.date}</TableCell>
                              <TableCell className="font-medium">{entry.employeeName}</TableCell>
                              <TableCell>
                                <Badge variant={entry.isShiftLead ? "default" : "outline"}>{entry.role}</Badge>
                              </TableCell>
                              <TableCell>{new Date(entry.clockIn).toLocaleTimeString()}</TableCell>
                              <TableCell>{new Date(entry.clockOut).toLocaleTimeString()}</TableCell>
                              <TableCell>{entry.hoursWorked.toFixed(2)}h</TableCell>
                              <TableCell>
                                {entry.unpaidBreakHours ? (
                                  <Badge variant="outline">{entry.unpaidBreakHours.toFixed(2)}h</Badge>
                                ) : (
                                  <span className="text-muted-foreground">0h</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {entry.shiftType === "unassigned" ? (
                                  <Badge variant="outline">Unassigned</Badge>
                                ) : (
                                  <Badge variant={entry.shiftType === "morning" ? "default" : "outline"}>
                                    {entry.shiftType === "morning" ? "Morning" : "Night"}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>${entry.hourlyRate}/hr</TableCell>
                              <TableCell>${entry.totalPay.toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    entry.status === "approved"
                                      ? "default"
                                      : entry.status === "pending"
                                        ? "outline"
                                        : "destructive"
                                  }
                                >
                                  {entry.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
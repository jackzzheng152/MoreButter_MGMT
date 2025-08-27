"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Users, User, Search, CheckCircle, XCircle } from "lucide-react"
import type { TimesheetEntry, ShiftEligibility, EmployeeEligibility } from "../types/timesheet"

interface EligibilityManagerProps {
  timesheetData: TimesheetEntry[]
  shiftEligibility: ShiftEligibility[]
  employeeEligibility: EmployeeEligibility[]
  onShiftEligibilityUpdate: (eligibility: ShiftEligibility[]) => void
  onEmployeeEligibilityUpdate: (eligibility: EmployeeEligibility[]) => void
}

export function EligibilityManager({
  timesheetData,
  shiftEligibility,
  employeeEligibility,
  onShiftEligibilityUpdate,
  onEmployeeEligibilityUpdate,
}: EligibilityManagerProps) {
  // const [employeeEligibility, setEmployeeEligibility] = useState<EmployeeEligibility[]>([])
  const [selectedShifts, setSelectedShifts] = useState<Set<string>>(new Set())
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set()) // NEW: Track selected employees
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "employee" | "role">("date")
  const [filterRole, setFilterRole] = useState<string>("all")
  const [filterShift, setFilterShift] = useState<string>("all")
  const [filterEligibility, setFilterEligibility] = useState<string>("all")



  // Initialize employee eligibility from timesheet data only when needed
  // useEffect(() => {
  //   if (timesheetData.length === 0) return

  //   // Only initialize if we don't have employee eligibility data yet
  //   if (employeeEligibility.length === 0) {
  //     const newEligibility = initializeEmployeeEligibility()
  //     if (newEligibility.length > 0) {
  //       setEmployeeEligibility(newEligibility)
  //       // Don't call onEmployeeEligibilityUpdate here to avoid loops
  //     }
  //   }
  // }, [timesheetData.length, employeeEligibility.length, initializeEmployeeEligibility])

  // Separate effect to update parent when employee eligibility changes (but not during initialization)
  // useEffect(() => {
  //   console.log('⚡ EligibilityManager: useEffect triggered')
  //   console.log('⚡ timesheetData length:', timesheetData.length)
  //   console.log('⚡ Current employeeEligibility length:', employeeEligibility?.length || 0)
  //   if (employeeEligibility.length > 0) {
  //     // Use a timeout to avoid immediate re-renders
  //     const timeoutId = setTimeout(() => {
  //       onEmployeeEligibilityUpdate(employeeEligibility)
  //     }, 0)

  //     return () => clearTimeout(timeoutId)
  //   }
  // }, [employeeEligibility, onEmployeeEligibilityUpdate])

  const toggleShiftEligibility = (date: string, shiftType: "morning" | "night", isEligible: boolean) => {
    const updatedEligibility = shiftEligibility.map((shift) =>
      shift.date === date && shift.shiftType === shiftType
        ? {
            ...shift,
            isEligible,
            reason: !isEligible ? "Manually disabled" : undefined,
            lastUpdated: new Date().toISOString(),
            updatedBy: "Manager",
          }
        : shift,
    )
    onShiftEligibilityUpdate(updatedEligibility)
  }

  const toggleEmployeeEligibility = (
    employeeId: string,
    date: string,
    shiftType: "morning" | "night",
    isEligible: boolean,
  ) => {
    const updatedEligibility = [...employeeEligibility]

    // Find existing employee eligibility entry
    const existingIndex = updatedEligibility.findIndex(
      (emp) => emp.employeeId === employeeId && emp.date === date && emp.shiftType === shiftType,
    )

    if (existingIndex >= 0) {
      // Update existing entry
      updatedEligibility[existingIndex] = {
        ...updatedEligibility[existingIndex],
        isEligible,
        reason: !isEligible ? "Manually disabled" : undefined,
        lastUpdated: new Date().toISOString(),
        updatedBy: "Manager",
      }
    } else {
      // Create new entry if it doesn't exist
      const timesheetEntry = timesheetData.find(
        (entry) => entry.employeeId === employeeId && entry.date === date && entry.shiftType === shiftType,
      )

      if (timesheetEntry) {
        updatedEligibility.push({
          employeeId,
          employeeName: timesheetEntry.employeeName,
          date,
          shiftType,
          isEligible,
          reason: !isEligible ? "Manually disabled" : undefined,
          infractionIds: [],
          lastUpdated: new Date().toISOString(),
          updatedBy: "Manager",
        })
      }
    }

    onEmployeeEligibilityUpdate(updatedEligibility)
  }

  // BULK SHIFT OPERATIONS
  const handleBulkShiftUpdate = (makeEligible: boolean) => {
    const updatedEligibility = shiftEligibility.map((shift) => {
      const shiftKey = `${shift.date}-${shift.shiftType}`
      if (selectedShifts.has(shiftKey)) {
        return {
          ...shift,
          isEligible: makeEligible,
          reason: !makeEligible ? "Bulk update - manually disabled" : undefined,
          lastUpdated: new Date().toISOString(),
          updatedBy: "Manager",
        }
      }
      return shift
    })
    onShiftEligibilityUpdate(updatedEligibility)
    setSelectedShifts(new Set())
  }

  // NEW: BULK EMPLOYEE OPERATIONS
  const handleBulkEmployeeUpdate = (makeEligible: boolean) => {
    const updatedEligibility = [...employeeEligibility]

    selectedEmployees.forEach((employeeKey) => {
      const [employeeId, date, shiftType] = employeeKey.split('-')
      
      // Find existing employee eligibility entry
      const existingIndex = updatedEligibility.findIndex(
        (emp) => emp.employeeId === employeeId && emp.date === date && emp.shiftType === shiftType,
      )

      if (existingIndex >= 0) {
        // Update existing entry
        updatedEligibility[existingIndex] = {
          ...updatedEligibility[existingIndex],
          isEligible: makeEligible,
          reason: !makeEligible ? "Bulk update - manually disabled" : undefined,
          lastUpdated: new Date().toISOString(),
          updatedBy: "Manager",
        }
      } else {
        // Create new entry if it doesn't exist
        const timesheetEntry = timesheetData.find(
          (entry) => entry.employeeId === employeeId && entry.date === date && entry.shiftType === shiftType,
        )

        if (timesheetEntry) {
          updatedEligibility.push({
            employeeId,
            employeeName: timesheetEntry.employeeName,
            date,
            shiftType: shiftType as "morning" | "night",
            isEligible: makeEligible,
            reason: !makeEligible ? "Bulk update - manually disabled" : undefined,
            infractionIds: [],
            lastUpdated: new Date().toISOString(),
            updatedBy: "Manager",
          })
        }
      }
    })


    onEmployeeEligibilityUpdate(updatedEligibility)
    setSelectedEmployees(new Set()) // Clear selection after bulk update
  }

  // NEW: EMPLOYEE SELECTION FUNCTIONS
  const toggleEmployeeSelection = (employeeId: string, date: string, shiftType: "morning" | "night") => {
    const employeeKey = `${employeeId}-${date}-${shiftType}`
    const newSelection = new Set(selectedEmployees)
    
    if (newSelection.has(employeeKey)) {
      newSelection.delete(employeeKey)
    } else {
      newSelection.add(employeeKey)
    }
    
    setSelectedEmployees(newSelection)
  }

  const selectAllEmployees = () => {
    const filteredData = getFilteredTimesheetData()
    const allEmployeeKeys = filteredData.map(
      entry => `${entry.employeeId}-${entry.date}-${entry.shiftType}`
    )
    setSelectedEmployees(new Set(allEmployeeKeys))
  }

  const clearEmployeeSelection = () => {
    setSelectedEmployees(new Set())
  }

  // SHIFT SELECTION FUNCTIONS
  const toggleShiftSelection = (date: string, shiftType: "morning" | "night") => {
    const shiftKey = `${date}-${shiftType}`
    const newSelection = new Set(selectedShifts)
    if (newSelection.has(shiftKey)) {
      newSelection.delete(shiftKey)
    } else {
      newSelection.add(shiftKey)
    }
    setSelectedShifts(newSelection)
  }

  const selectAllShifts = () => {
    const allShiftKeys = shiftEligibility.map((shift) => `${shift.date}-${shift.shiftType}`)
    setSelectedShifts(new Set(allShiftKeys))
  }

  const clearSelection = () => {
    setSelectedShifts(new Set())
  }

  // Filter and sort data
  const getFilteredTimesheetData = () => {
    const filtered = timesheetData.filter((entry) => {
      if (entry.shiftType === "unassigned") return false // Skip unassigned entries

      const matchesSearch =
        searchTerm === "" ||
        entry.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.date.includes(searchTerm)

      const matchesRole = filterRole === "all" || entry.role === filterRole
      const matchesShift = filterShift === "all" || entry.shiftType === filterShift

      let matchesEligibility = true
      if (filterEligibility !== "all") {
        const empEligibility = getEmployeeEligibility(entry.employeeId, entry.date, entry.shiftType)
        const shiftElig = getShiftEligibility(entry.date, entry.shiftType)
        const isEligible = empEligibility?.isEligible !== false && shiftElig?.isEligible !== false
        matchesEligibility = filterEligibility === "eligible" ? isEligible : !isEligible
      }

      return matchesSearch && matchesRole && matchesShift && matchesEligibility
    })

    // Sort data
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "employee":
          return a.employeeName.localeCompare(b.employeeName)
    
        case "role":
          if (a.role !== b.role) return a.role.localeCompare(b.role)
          return a.employeeName.localeCompare(b.employeeName)
    
        case "date":
        default: {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          if (dateA.getTime() !== dateB.getTime()) return dateA.getTime() - dateB.getTime();
          if (a.shiftType !== b.shiftType) return a.shiftType.localeCompare(b.shiftType);
          return a.employeeName.localeCompare(b.employeeName);
        }
      }
    })

    return filtered
  }

  const getShiftEligibility = (date: string, shiftType: "morning" | "night") => {
    return shiftEligibility.find((s) => s.date === date && s.shiftType === shiftType)
  }

  const getEmployeeEligibility = (employeeId: string, date: string, shiftType: "morning" | "night") => {
    return employeeEligibility.find((e) => e.employeeId === employeeId && e.date === date && e.shiftType === shiftType)
  }

  const getStatusIcon = (isEligible: boolean) => {
    return isEligible ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    )
  }

  // Get unique values for filters
  const availableRoles = Array.from(
    new Set(timesheetData.filter((entry) => entry.shiftType !== "unassigned").map((entry) => entry.role)),
  )

  const ineligibleEmployees = employeeEligibility.filter((emp) => !emp.isEligible).length
  const ineligibleShifts = shiftEligibility.filter((shift) => !shift.isEligible).length

  const filteredData = getFilteredTimesheetData()

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{Object.keys(shiftEligibility).length}</div>
            <div className="text-sm text-muted-foreground">Total Shifts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {shiftEligibility.filter((s) => s.isEligible).length}
            </div>
            <div className="text-sm text-muted-foreground">Eligible Shifts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{ineligibleEmployees}</div>
            <div className="text-sm text-muted-foreground">Ineligible Employees</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-800">{ineligibleShifts}</div>
            <div className="text-sm text-muted-foreground">Ineligible Shifts</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Management Tabs */}
      <Tabs defaultValue="shift-level" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="shift-level" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Shift-Level Eligibility
          </TabsTrigger>
          <TabsTrigger value="employee-level" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Employee-Level Eligibility
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shift-level" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shift-Level Eligibility Management</CardTitle>
              <CardDescription>Manage bonus eligibility for entire shifts due to operational issues</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Bulk Actions */}
              {selectedShifts.size > 0 && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {selectedShifts.size} shift{selectedShifts.size > 1 ? "s" : ""} selected
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleBulkShiftUpdate(true)} variant="outline">
                        Make Eligible
                      </Button>
                      <Button size="sm" onClick={() => handleBulkShiftUpdate(false)} variant="destructive">
                        Make Ineligible
                      </Button>
                      <Button size="sm" onClick={clearSelection} variant="ghost">
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedShifts.size === shiftEligibility.length}
                          onCheckedChange={(checked) => (checked ? selectAllShifts() : clearSelection())}
                        />
                      </TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Employees</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Toggle</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shiftEligibility
                      .sort((a, b) => {
                        if (a.date !== b.date) return a.date.localeCompare(b.date)
                        return a.shiftType.localeCompare(b.shiftType)
                      })
                      .map((shift) => {
                        const shiftEmployees = timesheetData.filter(
                          (entry) => entry.date === shift.date && entry.shiftType === shift.shiftType,
                        )
                        const shiftKey = `${shift.date}-${shift.shiftType}`

                        return (
                          <TableRow key={shiftKey}>
                            <TableCell>
                              <Checkbox
                                checked={selectedShifts.has(shiftKey)}
                                onCheckedChange={() => toggleShiftSelection(shift.date, shift.shiftType)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{shift.date}</TableCell>
                            <TableCell>
                              <Badge variant={shift.shiftType === "morning" ? "default" : "outline"}>
                                {shift.shiftType === "morning" ? "AM" : "PM"}
                              </Badge>
                            </TableCell>
                            <TableCell>{shiftEmployees.length}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(shift.isEligible)}
                                <Badge variant={shift.isEligible ? "default" : "destructive"}>
                                  {shift.isEligible ? "Eligible" : "Ineligible"}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={shift.isEligible}
                                onCheckedChange={(checked) =>
                                  toggleShiftEligibility(shift.date, shift.shiftType, checked)
                                }
                              />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(shift.lastUpdated).toLocaleDateString()}
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

        <TabsContent value="employee-level" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employee-Level Eligibility Management</CardTitle>
              <CardDescription>Manage individual employee bonus eligibility within shifts</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search and Filter Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search employees, roles, dates..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger>
                      <SelectValue>
                        {sortBy}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="role">Role</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Filter Role</Label>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger>
                      <SelectValue>
                        {filterRole}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="all">All Roles</SelectItem>
                      {availableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Filter Shift</Label>
                  <Select value={filterShift} onValueChange={setFilterShift}>
                    <SelectTrigger>
                      <SelectValue>
                        {filterShift}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="all">All Shifts</SelectItem>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Filter Eligibility</Label>
                  <Select value={filterEligibility} onValueChange={setFilterEligibility}>
                    <SelectTrigger>
                      <SelectValue>
                        {filterEligibility}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="eligible">Eligible Only</SelectItem>
                      <SelectItem value="ineligible">Ineligible Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* NEW: Bulk Employee Actions */}
              {selectedEmployees.size > 0 && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {selectedEmployees.size} employee{selectedEmployees.size > 1 ? "s" : ""} selected
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleBulkEmployeeUpdate(true)} className="bg-green-600 hover:bg-green-700">
                        Make Eligible
                      </Button>
                      <Button size="sm" onClick={() => handleBulkEmployeeUpdate(false)} variant="destructive">
                        Make Ineligible
                      </Button>
                      <Button size="sm" onClick={clearEmployeeSelection} variant="ghost">
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground mb-4">
                Showing {filteredData.length} of {timesheetData.filter((e) => e.shiftType !== "unassigned").length}{" "}
                entries
              </div>

              <div className="rounded-md border max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedEmployees.size === filteredData.length && filteredData.length > 0}
                          onCheckedChange={(checked) => (checked ? selectAllEmployees() : clearEmployeeSelection())}
                        />
                      </TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Toggle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((entry) => {
                      const empEligibility = getEmployeeEligibility(entry.employeeId, entry.date, entry.shiftType as "morning" | "night")
                      const shiftElig = getShiftEligibility(entry.date, entry.shiftType as "morning" | "night")
                      const isEligible = empEligibility?.isEligible !== false && shiftElig?.isEligible !== false
                      const employeeKey = `${entry.employeeId}-${entry.date}-${entry.shiftType}`

                      return (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedEmployees.has(employeeKey)}
                              onCheckedChange={() => toggleEmployeeSelection(entry.employeeId, entry.date, entry.shiftType as "morning" | "night")}
                            />
                          </TableCell>
                          <TableCell>{entry.date}</TableCell>
                          <TableCell>
                            <Badge variant={entry.shiftType === "morning" ? "default" : "outline"}>
                              {entry.shiftType === "morning" ? "AM" : "PM"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{entry.employeeName}</TableCell>
                          <TableCell>
                            <Badge variant={entry.isShiftLead ? "default" : "outline"}>{entry.role}</Badge>
                          </TableCell>
                          <TableCell>{entry.hoursWorked}h</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(isEligible)}
                              <Badge variant={isEligible ? "default" : "destructive"}>
                                {isEligible ? "Eligible" : "Ineligible"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={empEligibility?.isEligible !== false}
                              onCheckedChange={(checked) => {
                                console.log("checked", checked)
                                toggleEmployeeEligibility(
                                  entry.employeeId,
                                  entry.date,
                                  entry.shiftType as "morning" | "night",
                                  checked
                                )
                              }}
                              disabled={shiftElig?.isEligible === false}
                              className={`
                                data-[state=checked]:bg-green-500 
                                data-[state=unchecked]:bg-gray-300 
                                disabled:opacity-50 disabled:cursor-not-allowed
                              `}
                            />
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
    </div>
  )
}
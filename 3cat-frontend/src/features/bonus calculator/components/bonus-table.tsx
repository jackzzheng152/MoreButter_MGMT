"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Filter } from "lucide-react"
import { useBonusData } from "../contexts/app-context"

export function BonusTable() {
  const { bonusAllocations, filteredAllocations, setFilteredAllocations } = useBonusData()
  const [dayFilters, setDayFilters] = useState<
    Array<{
      date: string
      enabled: boolean
      reason?: string
      minDrinks?: number
      minEmployees?: number
    }>
  >([])
  const [showFilters, setShowFilters] = useState(false)
  const [filterCriteria, setFilterCriteria] = useState({
    minDrinksPerShift: 10,
    minEmployeesPerShift: 2,
    excludeWeekends: false,
  })

  // Initialize day filters when data loads
  useEffect(() => {
    if (bonusAllocations.length > 0 && dayFilters.length === 0) {
      const uniqueDates = [...new Set(bonusAllocations.map((a) => a.date))]
      const initialFilters = uniqueDates.map((date) => ({
        date,
        enabled: true,
        reason: undefined,
        minDrinks: undefined,
        minEmployees: undefined,
      }))
      setDayFilters(initialFilters)
    }
  }, [bonusAllocations, dayFilters.length])

  // Apply day filters and update context
  useEffect(() => {
    const filtered = bonusAllocations.filter((allocation) => {
      const dayFilter = dayFilters.find((f) => f.date === allocation.date)
      return dayFilter?.enabled !== false
    })
    setFilteredAllocations(filtered)
  }, [bonusAllocations, dayFilters])

  if (bonusAllocations.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No bonus data available. Please calculate bonuses first.</p>
        </CardContent>
      </Card>
    )
  }



  const toggleDayFilter = (date: string, enabled: boolean, reason?: string) => {
    setDayFilters((prev) => prev.map((filter) => (filter.date === date ? { ...filter, enabled, reason } : filter)))
  }

  const applyAutomaticFilters = () => {
    const updatedFilters = dayFilters.map((filter) => {
      const dayAllocations = bonusAllocations.filter((a) => a.date === filter.date)
      const morningShift = dayAllocations.filter((a) => a.shiftType === "morning")
      const nightShift = dayAllocations.filter((a) => a.shiftType === "night")

      let shouldDisable = false
      let reason = ""

      // Check minimum drinks criteria
      const morningDrinks = morningShift[0]?.drinkCount || 0
      const nightDrinks = nightShift[0]?.drinkCount || 0

      if (morningDrinks < filterCriteria.minDrinksPerShift && morningDrinks > 0) {
        shouldDisable = true
        reason = `Morning shift: ${morningDrinks} drinks (min: ${filterCriteria.minDrinksPerShift})`
      }

      if (nightDrinks < filterCriteria.minDrinksPerShift && nightDrinks > 0) {
        shouldDisable = true
        reason = reason
          ? `${reason}; Night shift: ${nightDrinks} drinks`
          : `Night shift: ${nightDrinks} drinks (min: ${filterCriteria.minDrinksPerShift})`
      }

      // Check minimum employees criteria
      if (morningShift.length < filterCriteria.minEmployeesPerShift && morningShift.length > 0) {
        shouldDisable = true
        reason = reason
          ? `${reason}; Morning: ${morningShift.length} employees`
          : `Morning: ${morningShift.length} employees (min: ${filterCriteria.minEmployeesPerShift})`
      }

      if (nightShift.length < filterCriteria.minEmployeesPerShift && nightShift.length > 0) {
        shouldDisable = true
        reason = reason
          ? `${reason}; Night: ${nightShift.length} employees`
          : `Night: ${nightShift.length} employees (min: ${filterCriteria.minEmployeesPerShift})`
      }

      // Check weekend exclusion
      if (filterCriteria.excludeWeekends) {
        const date = new Date(filter.date)
        const dayOfWeek = date.getDay()
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          shouldDisable = true
          reason = reason ? `${reason}; Weekend` : "Weekend excluded"
        }
      }

      return {
        ...filter,
        enabled: !shouldDisable,
        reason: shouldDisable ? reason : undefined,
      }
    })

    setDayFilters(updatedFilters)
  }

  const totalFilteredBonus = filteredAllocations.reduce((sum, a) => sum + a.bonusAmount, 0)
  const totalFilteredHours = filteredAllocations.reduce((sum, a) => sum + a.hoursWorked, 0)
  const averageBonusPerHour = totalFilteredHours > 0 ? totalFilteredBonus / totalFilteredHours : 0
  const excludedDays = dayFilters.filter((f) => !f.enabled).length

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Day Filtering & Criteria</CardTitle>
              <CardDescription>Exclude days that don't meet bonus criteria</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? "Hide" : "Show"} Filters
            </Button>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Min Drinks per Shift</Label>
                <Input
                  type="number"
                  value={filterCriteria.minDrinksPerShift}
                  onChange={(e) =>
                    setFilterCriteria((prev) => ({ ...prev, minDrinksPerShift: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Min Employees per Shift</Label>
                <Input
                  type="number"
                  value={filterCriteria.minEmployeesPerShift}
                  onChange={(e) =>
                    setFilterCriteria((prev) => ({ ...prev, minEmployeesPerShift: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Weekend Handling</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="exclude-weekends"
                    checked={filterCriteria.excludeWeekends}
                    onCheckedChange={(checked) =>
                      setFilterCriteria((prev) => ({ ...prev, excludeWeekends: !!checked }))
                    }
                  />
                  <Label htmlFor="exclude-weekends">Exclude weekends</Label>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={applyAutomaticFilters} variant="secondary">
                Apply Criteria Filters
              </Button>
              <Button
                onClick={() => setDayFilters((prev) => prev.map((f) => ({ ...f, enabled: true, reason: undefined })))}
                variant="outline"
              >
                Enable All Days
              </Button>
            </div>

            {/* Day-by-day toggles */}
            <div className="space-y-2">
              <Label>Manual Day Selection:</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {dayFilters.map((filter) => (
                  <div key={filter.date} className="flex items-center space-x-2 p-2 border rounded">
                    <Checkbox
                      checked={filter.enabled}
                      onCheckedChange={(checked) => toggleDayFilter(filter.date, !!checked)}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{filter.date}</div>
                      {filter.reason && <div className="text-xs text-red-600">{filter.reason}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">${totalFilteredBonus.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Total Bonuses</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{totalFilteredHours.toFixed(1)}h</div>
            <div className="text-sm text-muted-foreground">Total Hours</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">${averageBonusPerHour.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Avg Bonus/Hour</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{excludedDays}</div>
            <div className="text-sm text-muted-foreground">Excluded Days</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pro Rata Bonus Allocation Results</CardTitle>
          <CardDescription>
            Showing {filteredAllocations.length} allocations across {dayFilters.filter((f) => f.enabled).length} active
            days - Distributed proportionally by hours worked
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-[600px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead className="w-[80px]">Shift</TableHead>
                  <TableHead className="w-[150px]">Employee</TableHead>
                  <TableHead className="w-[100px]">Role</TableHead>
                  <TableHead className="w-[80px] text-center">Hours</TableHead>
                  <TableHead className="w-[80px] text-center">% of Shift</TableHead>
                  <TableHead className="w-[80px] text-center">Drinks</TableHead>
                  <TableHead className="w-[100px] text-center">Pool</TableHead>
                  <TableHead className="w-[100px] text-right">Bonus</TableHead>
                  <TableHead className="w-[80px] text-right">$/Hour</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAllocations
                  .sort((a, b) => {
                    // Sort by date, then shift type, then employee name
                    if (a.date !== b.date) return a.date.localeCompare(b.date)
                    if (a.shiftType !== b.shiftType) return a.shiftType.localeCompare(b.shiftType)
                    return a.employeeName.localeCompare(b.employeeName)
                  })
                  .map((allocation, index) => {
                    const bonusPerHour =
                      allocation.hoursWorked > 0 ? allocation.bonusAmount / allocation.hoursWorked : 0
                    const hoursPercentage =
                      allocation.totalShiftHours && allocation.totalShiftHours > 0
                        ? (allocation.hoursWorked / allocation.totalShiftHours) * 100
                        : 0

                    return (
                      <TableRow key={index} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{allocation.date}</TableCell>
                        <TableCell>
                          <Badge variant={allocation.shiftType === "morning" ? "default" : "outline"}>
                            {allocation.shiftType === "morning" ? "AM" : "PM"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{allocation.employeeName}</TableCell>
                        <TableCell>
                          <Badge variant="default">{allocation.role}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{allocation.hoursWorked}h</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{hoursPercentage.toFixed(1)}%</Badge>
                        </TableCell>
                        <TableCell className="text-center">{allocation.drinkCount}</TableCell>
                        <TableCell className="text-center">${allocation.bonusPool.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold">${allocation.bonusAmount.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-green-600">${bonusPerHour.toFixed(2)}</TableCell>
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

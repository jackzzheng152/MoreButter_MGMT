"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, FileText, DollarSign } from "lucide-react"
import { calculateTotalBonuses, getEmployeeBonusSummary } from "../lib/bonus-utils"
import { useBonusData, useTimesheetData, useAppConfig } from "../contexts/app-context"

// Location mapping for store codes
const LOCATION_CODES = {
  "435860": "CH", // Chino Hills
  "438073": "TT", // Tustin
  "442910": "KT", // Koreatown
  "442908": "SG", // San Gabriel
  "442909": "AC", // Arcadia
  "442912": "RH", // Rowland Heights
} as const

export function ExportButton() {
  const { bonusAllocations, filteredAllocations } = useBonusData()
  const { timesheetData } = useTimesheetData()
  const { dateRange, apiConfig } = useAppConfig()

  // Use filtered data if available, otherwise use all data
  const dataToExport = filteredAllocations || bonusAllocations

  // Generate filename components
  const getFilenameComponents = () => {
    const storeCode = LOCATION_CODES[apiConfig.locationId as keyof typeof LOCATION_CODES] || "UNK"
    const startDate = dateRange.startDate.replace(/-/g, "")
    const endDate = dateRange.endDate.replace(/-/g, "")
    const datePeriod = startDate === endDate ? startDate : `${startDate}-${endDate}`
    
    return { storeCode, datePeriod }
  }

  const exportToCSV = () => {
    if (dataToExport.length === 0) return

    const { storeCode, datePeriod } = getFilenameComponents()

    const headers = [
      "Date",
      "Shift (AM/PM)",
      "Employee",
      "Role",
      "Hours Worked",
      "Multiplier",
      "Adjusted Hours",
      "Drinks",
      "Bonus Pool",
      "Bonus Amount",
    ]
    const csvContent = [
      headers.join(","),
      ...dataToExport
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date)
          if (a.shiftType !== b.shiftType) return a.shiftType.localeCompare(b.shiftType)
          return a.employeeName.localeCompare(b.employeeName)
        })
        .map((allocation) =>
          [
            allocation.date,
            allocation.shiftType === "morning" ? "AM" : "PM",
            allocation.employeeName,
            allocation.role,
            allocation.hoursWorked,
            allocation.multiplier,
            allocation.adjustedHours,
            allocation.drinkCount,
            allocation.bonusPool.toFixed(2),
            allocation.bonusAmount.toFixed(2),
          ].join(","),
        ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `bonus-allocations-${storeCode}-${datePeriod}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const exportSummaryReport = () => {
    if (dataToExport.length === 0) return

    const { storeCode, datePeriod } = getFilenameComponents()

    // Create summary by employee
    const employeeSummary = getEmployeeBonusSummary(dataToExport)

    // Create summary by date and shift
    const shiftSummary = dataToExport.reduce(
      (acc, allocation) => {
        const key = `${allocation.date}-${allocation.shiftType}`
        if (!acc[key]) {
          acc[key] = {
            date: allocation.date,
            shift: allocation.shiftType === "morning" ? "AM" : "PM",
            drinks: allocation.drinkCount,
            bonusPool: allocation.bonusPool,
            employees: 0,
            totalBonus: 0,
          }
        }
        acc[key].employees++
        acc[key].totalBonus += allocation.bonusAmount
        return acc
      },
      {} as Record<string, any>,
    )

    const headers = [
      "Type",
      "Date/Employee",
      "Shift/Shifts",
      "Drinks/Total Bonus",
      "Employees/Bonus Pool",
      "Total Bonus",
    ]
    const csvContent = [
      headers.join(","),
      "SHIFT SUMMARY",
      ...Object.values(shiftSummary).map((summary: any) =>
        ["Shift", summary.date, summary.shift, summary.drinks, summary.employees, summary.totalBonus.toFixed(2)].join(
          ",",
        ),
      ),
      "",
      "EMPLOYEE SUMMARY",
      ...Object.entries(employeeSummary).map(([employee, data]) =>
        ["Employee", employee, data.shifts, data.totalBonus.toFixed(2), "", ""].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `bonus-summary-${storeCode}-${datePeriod}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const exportGustoFormat = () => {
    if (dataToExport.length === 0) return

    const { storeCode, datePeriod } = getFilenameComponents()

    // Create a map to lookup employee IDs from timesheet data
    const employeeIdMap = new Map()
    timesheetData.forEach(entry => {
      employeeIdMap.set(entry.employeeName, entry.employeeId)
    })

    // Group bonus allocations by employee and sum their bonuses
    const employeeBonuses = new Map()
    
    dataToExport.forEach((allocation) => {
      const employeeName = allocation.employeeName
      const employeeId = employeeIdMap.get(employeeName) || 'UNKNOWN_ID'
      
      if (employeeBonuses.has(employeeName)) {
        employeeBonuses.get(employeeName).totalBonus += allocation.bonusAmount
      } else {
        // Parse name into first and last name
        const nameParts = employeeName.trim().split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''
        
        employeeBonuses.set(employeeName, {
          lastName,
          firstName,
          employeeId,
          totalBonus: allocation.bonusAmount
        })
      }
    })

    const headers = [
      "last_name",
      "first_name", 
      "gusto_employee_id",
      "custom_earning_special_bonus"
    ]

    const csvContent = [
      headers.join(","),
      ...Array.from(employeeBonuses.values())
        .sort((a, b) => a.lastName.localeCompare(b.lastName))
        .map((employee) =>
          [
            `"${employee.lastName}"`,
            `"${employee.firstName}"`,
            employee.employeeId,
            employee.totalBonus.toFixed(2)
          ].join(",")
        ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `gusto-bonus-import-${storeCode}-${datePeriod}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const totalBonuses = calculateTotalBonuses(dataToExport)
  const employeeSummary = getEmployeeBonusSummary(dataToExport)

  if (bonusAllocations.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No bonus data available to export.</p>
        </CardContent>
      </Card>
    )
  }

  const filteredCount = dataToExport.length
  const totalCount = bonusAllocations.length
  const isFiltered = filteredCount !== totalCount

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
          <CardDescription>
            {isFiltered
              ? `Exporting ${filteredCount} filtered allocations (${totalCount - filteredCount} excluded)`
              : `Exporting all ${totalCount} bonus allocations`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={exportToCSV} className="w-full" size="lg">
              <Download className="mr-2 h-4 w-4" />
              Export Detailed CSV
            </Button>
            <Button onClick={exportSummaryReport} variant="outline" className="w-full" size="lg">
              <FileText className="mr-2 h-4 w-4" />
              Export Summary Report
            </Button>
            <Button onClick={exportGustoFormat} variant="outline" className="w-full" size="lg">
              <DollarSign className="mr-2 h-4 w-4" />
              Gusto Export
            </Button>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Gusto export format: last_name, first_name, gusto_employee_id, custom_earning_special_bonus
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export Summary</CardTitle>
          <CardDescription>Overview of data being exported</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">${totalBonuses.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total Bonuses</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{Object.keys(employeeSummary).length}</div>
              <div className="text-sm text-muted-foreground">Employees</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{filteredCount}</div>
              <div className="text-sm text-muted-foreground">Allocations</div>
            </div>
          </div>

          {isFiltered && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> {totalCount - filteredCount} allocations have been excluded based on your day
                filtering criteria.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employee Summary</CardTitle>
          <CardDescription>Bonus totals by employee (filtered data)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {Object.entries(employeeSummary)
              .sort(([, a], [, b]) => b.totalBonus - a.totalBonus)
              .map(([employee, data]) => (
                <div key={employee} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <span className="font-medium">{employee}</span>
                    <span className="text-sm text-muted-foreground ml-2">({data.shifts} shifts)</span>
                  </div>
                  <span className="font-bold">${data.totalBonus.toFixed(2)}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
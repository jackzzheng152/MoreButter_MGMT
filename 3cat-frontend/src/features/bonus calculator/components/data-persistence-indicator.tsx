"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Download, Upload, CheckCircle, AlertCircle } from "lucide-react"
import { useOrderData, useTimesheetData, useEligibilityData, useBonusData, useAppConfig, useAppUI } from "../contexts/app-context"

export function DataPersistenceIndicator() {
  const { orderData } = useOrderData()
  const { timesheetData } = useTimesheetData()
  const { shiftEligibility, employeeEligibility } = useEligibilityData()
  const { bonusAllocations } = useBonusData()
  const { bonusRate, shiftSettings, apiConfig, dateRange } = useAppConfig()
  const { clearAllData } = useAppUI()
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

  // Monitor state changes to update save status
  useEffect(() => {
    setSaveStatus("saving")
    const timeoutId = setTimeout(() => {
      setSaveStatus("saved")
      setLastSaved(new Date())
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [orderData, timesheetData, shiftEligibility, employeeEligibility, bonusAllocations])

  const exportData = () => {
    try {
      const dataToExport = {
        orderData,
        timesheetData,
        shiftEligibility,
        employeeEligibility,
        tallyForms: [], // TODO: Add tally forms hook
        employeeInfractions: [], // TODO: Add infractions hook
        bonusAllocations,
        bonusRate,
        shiftSettings,
        apiConfig,
        dateRange,
        exportedAt: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `bonus-allocation-backup-${new Date().toISOString().split("T")[0]}.json`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export data:", error)
    }
  }

  const importData = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const importedData = JSON.parse(e.target?.result as string)
            // You would dispatch actions to load the imported data
            console.log("Imported data:", importedData)
            alert("Data import functionality would be implemented here")
          } catch (error) {
            console.error("Failed to import data:", error)
            alert("Failed to import data. Please check the file format.")
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const getDataSummary = () => {
    return {
      orders: orderData.length,
      timesheetEntries: timesheetData.length,
      shifts: shiftEligibility.length,
      employees: new Set(timesheetData.map((e: any) => e.employeeId)).size,
      infractions: 0, // TODO: Add infractions hook
      tallyForms: 0, // TODO: Add tally forms hook
      bonusAllocations: bonusAllocations.length,
    }
  }

  const summary = getDataSummary()
  const hasData = Object.values(summary).some((count) => count > 0)

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {saveStatus === "saving" && <AlertCircle className="h-4 w-4 text-yellow-600 animate-pulse" />}
              {saveStatus === "saved" && <CheckCircle className="h-4 w-4 text-green-600" />}
              {saveStatus === "error" && <AlertCircle className="h-4 w-4 text-red-600" />}
              <span className="text-sm font-medium">
                {saveStatus === "saving" && "Saving..."}
                {saveStatus === "saved" && "Data Saved"}
                {saveStatus === "error" && "Save Error"}
                {saveStatus === "idle" && "Ready"}
              </span>
              {lastSaved && (
                <span className="text-xs text-muted-foreground">Last saved: {lastSaved.toLocaleTimeString()}</span>
              )}
            </div>

            {hasData && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">{summary.orders} orders</Badge>
                <Badge variant="outline">{summary.timesheetEntries} timesheet</Badge>
                <Badge variant="outline">{summary.bonusAllocations} bonuses</Badge>
                <Badge variant="outline">{summary.infractions} infractions</Badge>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportData} disabled={!hasData}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={importData}>
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={() => clearAllData()} disabled={!hasData}>
              <Trash2 className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

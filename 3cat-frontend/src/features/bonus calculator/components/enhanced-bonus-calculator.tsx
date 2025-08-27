"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, Calculator, DollarSign } from "lucide-react"
import { countDrinksByShift } from "../lib/csv-parser"
import { calculateBonusesFromTimesheet } from "../lib/bonus-calculations"
import {
  useOrderData,
  useTimesheetData,
  useEligibilityData,
  useBonusData,
  useAppConfig,
  useAppUI,
} from "../contexts/app-context"

export function EnhancedBonusCalculator() {
  const { orderData } = useOrderData()
  const { timesheetData } = useTimesheetData()
  const { shiftEligibility, employeeEligibility } = useEligibilityData()
  const { setBonusAllocations } = useBonusData()
  const { bonusRate, shiftSettings, setBonusRate } = useAppConfig()
  const { isProcessing, setIsProcessing } = useAppUI()

  const [error, setError] = useState<string | null>(null)
  const [drinkCounts, setDrinkCounts] = useState<Record<string, { morning: number; night: number }>>({})

  useEffect(() => {
    if (orderData.length > 0) {
      const counts = countDrinksByShift(orderData, shiftSettings)
      setDrinkCounts(counts)
    }
  }, [orderData, shiftSettings])

  const handleCalculate = async () => {
    if (orderData.length === 0) {
      setError("Please upload orders data first")
      return
    }

    if (timesheetData.length === 0) {
      setError("Please load timesheet data first")
      return
    }

    setError(null)
    setIsProcessing(true)

    try {
      console.log("Calculating bonuses with pro rata distribution...")
      console.log("Order data:", orderData.length, "entries")
      console.log("Timesheet data:", timesheetData.length, "entries")
      console.log("Shift eligibility:", shiftEligibility.length, "entries")
      console.log("Employee eligibility:", employeeEligibility.length, "entries")
      console.log("Drink counts:", drinkCounts)

      // Calculate bonuses using timesheet data and eligibility
      const bonusAllocations = calculateBonusesFromTimesheet(
        drinkCounts,
        timesheetData,
        shiftEligibility,
        employeeEligibility,
      )

      console.log("Calculated bonus allocations:", bonusAllocations)
      setBonusAllocations(bonusAllocations)

      if (bonusAllocations.length === 0) {
        setError("No bonus allocations calculated. Check eligibility settings and data.")
      }
    } catch (err) {
      console.error("Pro rata bonus calculation error:", err)
      setError(err instanceof Error ? err.message : "Failed to calculate bonuses")
    } finally {
      setIsProcessing(false)
    }
  }

  // Calculate summary statistics
  const totalDrinks = Object.values(drinkCounts).reduce((sum, counts) => sum + counts.morning + counts.night, 0)
  const totalBonusPool = totalDrinks * bonusRate
  const eligibleShifts = shiftEligibility.filter((s) => s.isEligible).length
  const eligibleEmployees = employeeEligibility.filter((e) => e.isEligible).length

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Pro Rata Bonus Calculator
          </CardTitle>
          <CardDescription>Distribute bonus pool proportionally based on hours worked per shift</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bonus Rate per Drink</Label>
              <Input
                type="number"
                step="0.01"
                value={bonusRate}
                onChange={(e) => setBonusRate(Number(e.target.value))}
                placeholder="0.12"
              />
              <p className="text-sm text-muted-foreground">Amount in dollars per drink for bonus pool</p>
            </div>
            <div className="space-y-2">
              <Label>Current Shift Configuration</Label>
              <div className="p-3 border rounded-md bg-muted/50">
                <div className="text-sm">
                  <div className="font-medium">
                    Method: {shiftSettings.splitMethod === "time-based" ? "Time-based" : "Custom Split"}
                  </div>
                  {shiftSettings.splitMethod === "time-based" ? (
                    <>
                      <div>Morning: {shiftSettings.morningHours.replace("-", " - ").replace(":", ":")}</div>
                      <div>Night: {shiftSettings.nightHours.replace("-", " - ").replace(":", ":")}</div>
                    </>
                  ) : (
                    <div>Split Time: {shiftSettings.customSplitTime}</div>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Configure shift splitting in the Timesheet tab</p>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              <strong>Pro Rata Distribution:</strong> The bonus pool for each shift is distributed proportionally based
              on hours worked. An employee who works 8 hours gets twice the bonus of someone who works 4 hours in the
              same shift.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      {Object.keys(drinkCounts).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{totalDrinks}</div>
              <div className="text-sm text-muted-foreground">Total Drinks</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">${totalBonusPool.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total Bonus Pool</div>
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
              <div className="text-2xl font-bold text-green-600">{eligibleEmployees}</div>
              <div className="text-sm text-muted-foreground">Eligible Employees</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Breakdown */}
      {Object.keys(drinkCounts).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pro Rata Distribution Breakdown</CardTitle>
            <CardDescription>
              Daily breakdown showing proportional bonus distribution based on hours worked
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(drinkCounts).map(([date, counts]) => {
                const morningShiftEligible =
                  shiftEligibility.find((s) => s.date === date && s.shiftType === "morning")?.isEligible !== false

                const nightShiftEligible =
                  shiftEligibility.find((s) => s.date === date && s.shiftType === "night")?.isEligible !== false

                const morningEmployees = timesheetData.filter(
                  (e) => e.date === date && e.shiftType === "morning" && !e.isTrainee,
                )

                const nightEmployees = timesheetData.filter(
                  (e) => e.date === date && e.shiftType === "night" && !e.isTrainee,
                )

                const morningEligibleEmployees = employeeEligibility.filter(
                  (e) => e.date === date && e.shiftType === "morning" && e.isEligible,
                )

                const nightEligibleEmployees = employeeEligibility.filter(
                  (e) => e.date === date && e.shiftType === "night" && e.isEligible,
                )

                const morningTotalHours = morningEmployees
                  .filter((emp) => morningEligibleEmployees.some((eligible) => eligible.employeeId === emp.employeeId))
                  .reduce((sum, emp) => sum + emp.hoursWorked, 0)

                const nightTotalHours = nightEmployees
                  .filter((emp) => nightEligibleEmployees.some((eligible) => eligible.employeeId === emp.employeeId))
                  .reduce((sum, emp) => sum + emp.hoursWorked, 0)

                const morningBonusPool = counts.morning * bonusRate
                const nightBonusPool = counts.night * bonusRate

                return (
                  <div key={date} className="border rounded-lg p-4">
                    <h3 className="font-medium mb-3">{date}</h3>

                    {/* Morning Shift */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Morning:</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={morningShiftEligible ? "default" : "destructive"}>
                            {morningShiftEligible ? "Eligible" : "Ineligible"}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Drinks:</span>
                          <span className="font-medium">{counts.morning}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Employees:</span>
                          <span className="font-medium">
                            {morningEligibleEmployees.length}/{morningEmployees.length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Hours:</span>
                          <span className="font-medium">{morningTotalHours.toFixed(1)}h</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pool:</span>
                          <span className="font-medium">
                            ${morningShiftEligible ? morningBonusPool.toFixed(2) : "0.00"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rate per Hour:</span>
                          <span className="font-medium text-green-600">
                            $
                            {morningShiftEligible && morningTotalHours > 0
                              ? (morningBonusPool / morningTotalHours).toFixed(2)
                              : "0.00"}
                            /hr
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Night Shift */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Night:</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={nightShiftEligible ? "default" : "destructive"}>
                            {nightShiftEligible ? "Eligible" : "Ineligible"}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Drinks:</span>
                          <span className="font-medium">{counts.night}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Employees:</span>
                          <span className="font-medium">
                            {nightEligibleEmployees.length}/{nightEmployees.length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Hours:</span>
                          <span className="font-medium">{nightTotalHours.toFixed(1)}h</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pool:</span>
                          <span className="font-medium">
                            ${nightShiftEligible ? nightBonusPool.toFixed(2) : "0.00"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rate per Hour:</span>
                          <span className="font-medium text-green-600">
                            $
                            {nightShiftEligible && nightTotalHours > 0
                              ? (nightBonusPool / nightTotalHours).toFixed(2)
                              : "0.00"}
                            /hr
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Calculate Button */}
      <Card>
        <CardContent className="p-6">
          <Button
            onClick={handleCalculate}
            disabled={isProcessing || orderData.length === 0 || timesheetData.length === 0}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating Pro Rata Bonuses...
              </>
            ) : (
              <>
                <DollarSign className="mr-2 h-4 w-4" />
                Calculate Bonuses with Pro Rata Distribution
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Bonus pool distributed proportionally based on hours worked per shift
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

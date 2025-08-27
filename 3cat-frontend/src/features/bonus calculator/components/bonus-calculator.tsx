"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Settings, Calculator, Clock } from "lucide-react"
import type { ShiftSplitSettings } from "../types/bonus"
import { countDrinksByShift } from "../lib/csv-parser"
import { fetchShiftData, calculateBonuses } from "../lib/bonus-calculations"
import { useOrderData, useBonusData, useAppConfig, useAppUI } from "../contexts/app-context"

export function BonusCalculator() {
  const { orderData } = useOrderData()
  const { setBonusAllocations } = useBonusData()
  const { shiftSettings, setShiftSettings } = useAppConfig()
  const { isProcessing, setIsProcessing } = useAppUI()

  const [apiKey] = useState("demo-api-key")
  const [locationId] = useState("location-123")
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

    setError(null)
    setIsProcessing(true)

    try {
      // Get date range from orders
      const dates = Object.keys(drinkCounts)
      if (dates.length === 0) {
        throw new Error("No valid dates found in order data")
      }

      const startDate = dates.sort()[0]
      const endDate = dates.sort()[dates.length - 1]

      console.log("Calculating bonuses for date range:", startDate, "to", endDate)
      console.log("Drink counts:", drinkCounts)

      // Fetch shift data (using mock data for demo)
      const fetchedShiftData = await fetchShiftData(apiKey, locationId, startDate, endDate, dates)
      console.log("Fetched shift data:", fetchedShiftData)

      // Calculate bonuses
      const bonusAllocations = calculateBonuses(drinkCounts, fetchedShiftData)
      console.log("Calculated bonus allocations:", bonusAllocations)
      setBonusAllocations(bonusAllocations)

      if (bonusAllocations.length === 0) {
        setError("No bonus allocations calculated. Please check your data and shift settings.")
      }
    } catch (err) {
      console.error("Bonus calculation error:", err)
      setError(err instanceof Error ? err.message : "Failed to calculate bonuses")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleShiftSettingChange = (field: keyof ShiftSplitSettings, value: string) => {
    setShiftSettings({ [field]: value })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Shift Configuration
          </CardTitle>
          <CardDescription>Configure how to split shifts throughout the day</CardDescription>
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
                  Orders before this time = Morning shift, after = Night shift
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            7shifts API Configuration
          </CardTitle>
          <CardDescription>Using mock data for demonstration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="locationId">Location ID</Label>
              <Input
                id="locationId"
                placeholder="location-123"
                value={locationId}
                disabled
              />
            </div>
          </div>
          <Alert>
            <AlertDescription>
              Currently using mock data to demonstrate functionality. Replace with real API credentials when ready.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {Object.keys(drinkCounts).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Drink Count Summary</CardTitle>
            <CardDescription>Drinks counted per shift from uploaded orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(drinkCounts).map(([date, counts]) => (
                <div key={date} className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">{date}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Morning:</span>
                      <span className="font-medium">{counts.morning} drinks</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Night:</span>
                      <span className="font-medium">{counts.night} drinks</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span>Total:</span>
                      <span className="font-medium">{counts.morning + counts.night} drinks</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Morning Pool: ${(counts.morning * 0.12).toFixed(2)}
                      <br />
                      Night Pool: ${(counts.night * 0.12).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-6">
          <Button
            onClick={handleCalculate}
            disabled={isProcessing || orderData.length === 0}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating Bonuses...
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                Calculate Bonuses with Mock Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

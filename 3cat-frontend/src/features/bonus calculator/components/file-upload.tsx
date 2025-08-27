"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, FileText, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { OrderData } from "../types/bonus"
import { parseCSV, validateOrderData } from "../lib/csv-parser"
import { useOrderData, useAppUI } from "../contexts/app-context"

export function FileUpload() {
  const { orderData, setOrderData } = useOrderData()
  const { isProcessing, setIsProcessing } = useAppUI()
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<OrderData[]>([])

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      setError(null)
      setIsProcessing(true)
      setUploadedFile(file)

      try {
        const parsedData = await parseCSV(file)
        const validatedData = validateOrderData(parsedData)

        console.log("Parsed CSV data:", validatedData.slice(0, 3))
        setPreviewData(validatedData.slice(0, 5)) // Show first 5 rows as preview
        setOrderData(validatedData)
      } catch (err) {
        console.error("CSV parsing error:", err)
        setError(err instanceof Error ? err.message : "Failed to parse CSV file")
      } finally {
        setIsProcessing(false)
      }
    },
    [setOrderData, setIsProcessing],
  )

  

  // Use existing data for preview if available
  const displayData = previewData.length > 0 ? previewData : orderData.slice(0, 5)

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="space-y-4">
              <p className="text-lg">Upload your orders CSV file</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button variant="outline" asChild>
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    Select CSV File
                    <input
                      id="csv-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isProcessing}
                    />
                  </label>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {uploadedFile && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">{uploadedFile.name}</span>
              <span className="text-xs text-muted-foreground">({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {displayData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-2">
              Data Preview ({orderData.length > 0 ? `${orderData.length} total orders` : "First 5 rows"})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Customer</th>
                    <th className="text-left p-2">Drinks</th>
                    <th className="text-left p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.map((row, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{row.date}</td>
                      <td className="p-2">{row.time}</td>
                      <td className="p-2">{row.customer}</td>
                      <td className="p-2">{row.drinkCount}</td>
                      <td className="p-2">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}



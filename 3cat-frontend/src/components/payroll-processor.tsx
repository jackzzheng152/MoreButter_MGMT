import type React from "react"

import { useState } from "react"
import { AlertCircle, ArrowRight, Check, Download, FileSpreadsheet, Upload } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { safeToFixed } from "@/lib/utils"

export function PayrollProcessor() {
  const [files, setFiles] = useState<File[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isProcessed, setIsProcessed] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
      setIsProcessed(false)
    }
  }

  const processFiles = () => {
    setIsProcessing(true)

    // Simulate processing delay
    setTimeout(() => {
      // Mock data for preview
      setPreviewData([
        {
          employee: "John Smith",
          employeeId: "EMP001",
          regularHours: 80,
          overtimeHours: 5,
          grossPay: 3200.0,
          netPay: 2560.0,
        },
        {
          employee: "Jane Doe",
          employeeId: "EMP002",
          regularHours: 80,
          overtimeHours: 0,
          grossPay: 4000.0,
          netPay: 3200.0,
        },
        {
          employee: "Robert Johnson",
          employeeId: "EMP003",
          regularHours: 72,
          overtimeHours: 0,
          grossPay: 2880.0,
          netPay: 2304.0,
        },
        {
          employee: "Sarah Williams",
          employeeId: "EMP004",
          regularHours: 80,
          overtimeHours: 10,
          grossPay: 3800.0,
          netPay: 3040.0,
        },
      ])

      setIsProcessing(false)
      setIsProcessed(true)
    }, 2000)
  }

  const downloadTemplate = () => {
    // In a real app, this would generate and download a CSV file
    alert("Template would download in a real application")
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Payroll File Processor</CardTitle>
        <CardDescription>Convert your payroll data files to Gusto-compatible format</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upload">Upload Files</TabsTrigger>
            <TabsTrigger value="preview" disabled={!isProcessed}>
              Preview Data
            </TabsTrigger>
            <TabsTrigger value="export" disabled={!isProcessed}>
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="grid w-full gap-2">
              <Label htmlFor="payroll-files">Upload Payroll Files</Label>
              <div className="border rounded-lg p-8 flex flex-col items-center justify-center gap-4">
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                <div className="flex flex-col items-center gap-1 text-center">
                  <p className="text-sm font-medium">Drag and drop your files here or click to browse</p>
                  <p className="text-xs text-muted-foreground">Supports CSV, Excel, and text files</p>
                </div>
                <Input id="payroll-files" type="file" multiple className="hidden" onChange={handleFileChange} />
                <Button variant="outline" onClick={() => document.getElementById("payroll-files")?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Select Files
                </Button>
              </div>

              {files.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Selected Files:</h3>
                  <ul className="space-y-2">
                    {files.map((file, index) => (
                      <li key={index} className="text-sm flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        {file.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {files.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <Button onClick={processFiles} disabled={isProcessing}>
                    {isProcessing ? "Processing..." : "Process Files"}
                    {!isProcessing && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </div>
              )}

              {isProcessed && (
                <Alert className="mt-4 bg-green-50 border-green-200">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Processing Complete</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Your files have been processed successfully. You can now preview and export the data.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Regular Hours</TableHead>
                    <TableHead>Overtime Hours</TableHead>
                    <TableHead className="text-right">Gross Pay</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.employee}</TableCell>
                      <TableCell>{row.employeeId}</TableCell>
                      <TableCell>{row.regularHours}</TableCell>
                      <TableCell>{row.overtimeHours}</TableCell>
                      <TableCell className="text-right">${safeToFixed(row.grossPay)}</TableCell>
                      <TableCell className="text-right">${safeToFixed(row.netPay)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Export Options</AlertTitle>
              <AlertDescription>
                Choose the format for your Gusto import file. Make sure to review the data before importing.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-base">Gusto Import Template</CardTitle>
                  <CardDescription>Standard Gusto CSV format</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button className="w-full" onClick={downloadTemplate}>
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV
                  </Button>
                </CardFooter>
              </Card>

              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-base">Excel Format</CardTitle>
                  <CardDescription>Detailed spreadsheet with formulas</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button className="w-full" variant="outline" onClick={downloadTemplate}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Excel
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}


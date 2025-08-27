"use client"

import { FileUpload } from "../features/bonus calculator/components/file-upload"
import { EnhancedBonusCalculator } from "../features/bonus calculator/components/enhanced-bonus-calculator"
import { BonusTable } from "../features/bonus calculator/components/bonus-table"
import { ExportButton } from "../features/bonus calculator/components/export-button"
import { DataPersistenceIndicator } from "../features/bonus calculator/components/data-persistence-indicator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TimesheetManager } from "../features/bonus calculator/components/timesheet-manager"
import { AppProvider, useAppUI, useOrderData, useTimesheetData } from "../features/bonus calculator/contexts/app-context"

function BonusAllocationToolContent() {
  const { orderData } = useOrderData()
  const { timesheetData } = useTimesheetData()
  const { currentTab, setCurrentTab } = useAppUI()

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Bonus Allocation Tool</h1>
        <p className="text-muted-foreground">
          Upload orders CSV and automatically calculate shift bonuses based on drink output
        </p>
      </div>

      <DataPersistenceIndicator />

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="upload">Upload Orders</TabsTrigger>
          <TabsTrigger value="timesheet">Timesheet</TabsTrigger>
          <TabsTrigger value="calculate">Calculate Bonuses</TabsTrigger>
          <TabsTrigger value="results">View Results</TabsTrigger>
          <TabsTrigger value="export">Export Data</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Orders CSV</CardTitle>
              <CardDescription>
                Upload your orders CSV file to begin bonus calculations
                {orderData.length > 0 && (
                  <span className="ml-2 text-green-600">✓ {orderData.length} orders loaded</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timesheet" className="space-y-4">
          <TimesheetManager />
        </TabsContent>

        <TabsContent value="calculate" className="space-y-4">
          {timesheetData.length > 0 ? (
            <EnhancedBonusCalculator />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Please load timesheet data first to use the bonus calculator.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <BonusTable />
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <ExportButton />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function BonusAllocationTool() {
  return (
    <AppProvider>
      <BonusAllocationToolContent />
    </AppProvider>
  )
}

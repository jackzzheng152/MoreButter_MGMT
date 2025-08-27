"use client"

import { useState } from "react"

import { FileSpreadsheet, Plus, Filter, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PayPeriodCard } from "./pay-period-card"
import { PayPeriodDetail } from "./pay-period-detail"
import { AddPayPeriodDialog } from "./add-pay-period-dialog"
import type { PayPeriod, StoreLocation } from "../types/payroll-types"
import { usePayPeriods } from "../hooks/usePayPeriods"

export function PayrollProcessor() {
  // Updated locations with actual location IDs
  const locations: StoreLocation[] = [
    { id: "ch", name: "3Cat - CH", locationId: "435860" },
    { id: "kt", name: "3Cat - KT", locationId: "442910" },
    { id: "ac", name: "3Cat - AC", locationId: "442909" },
    { id: "rh", name: "3Cat - RH", locationId: "442912" },
    { id: "tt", name: "3Cat - TT", locationId: "438073" },
    { id: "sg", name: "3Cat - SG", locationId: "442908" },
    { id: "MP", name: "MP Manufacturer", locationId: "469356" },
  ]

  const [selectedLocation, setSelectedLocation] = useState<string>(locations[0].id)
  const [selectedPayPeriod, setSelectedPayPeriod] = useState<PayPeriod | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  // Use the updated hook with React Query for better caching and state management
  const { 
    payPeriods, 
    allPayPeriods,
    isLoading, 
    isError,
    error,
    isFetched,
    addPayPeriod, 
    updatePayPeriod, 
    deletePayPeriod,
    isCreating,
    isUpdating,
    isDeleting,
    getPayPeriodById,
    getPayPeriodsByStatus,
    refreshPayPeriods,
    debugState
  } = usePayPeriods(selectedLocation)

  console.log("this is the getPayPeriodById", getPayPeriodById)
  console.log("this is allPayPeriods", allPayPeriods)

  const handleAddPayPeriod = async (newPayPeriod: PayPeriod) => {
    try {
      await addPayPeriod(newPayPeriod)
      console.log('Pay period added successfully')
      // Close the dialog after successful creation
      setIsAddDialogOpen(false)
    } catch (error) {
      console.error('Failed to add pay period:', error)
      // You could show a toast notification here
    }
  }

  const handleDeletePayPeriod = async (id: string) => {
    try {
      // Optional: Add confirmation dialog
      if (window.confirm('Are you sure you want to delete this pay period?')) {
        await deletePayPeriod(id)
        console.log('Pay period deleted successfully')
      }
    } catch (error) {
      console.error('Failed to delete pay period:', error)
    }
  }

  const handleUpdatePayPeriod = async (updatedPayPeriod: PayPeriod) => {
    try {
      await updatePayPeriod(updatedPayPeriod.id, updatedPayPeriod)
      setSelectedPayPeriod(null)
      console.log('Pay period updated successfully')
    } catch (error) {
      console.error('Failed to update pay period:', error)
    }
  }

  // Handle location change - this will trigger a new query
  const handleLocationChange = (newLocation: string) => {
    setSelectedLocation(newLocation)
    // Clear selected pay period if it doesn't belong to the new location
    if (selectedPayPeriod && selectedPayPeriod.location !== newLocation) {
      setSelectedPayPeriod(null)
    }
  }

  // Debug function to help with troubleshooting
  const handleDebug = () => {
    debugState()
  }

  if (selectedPayPeriod) {
    return (
      <PayPeriodDetail
        payPeriod={selectedPayPeriod}
        onBack={() => setSelectedPayPeriod(null)}
        onUpdate={handleUpdatePayPeriod}
        locationName={locations.find((loc) => loc.id === selectedPayPeriod.location)?.name || ""}
        locationId={selectedPayPeriod.locationId}
        locations={locations}
      />
    )
  }

  if (isLoading && !isFetched) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading pay periods...</p>
        </div>
      </div>
    )
  }

  if (isError && error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Pay Periods</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'An error occurred while loading pay periods.'}
          </AlertDescription>
        </Alert>
        <div className="flex justify-center gap-2">
          <Button onClick={refreshPayPeriods} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
          {process.env.NODE_ENV === 'development' && (
            <Button onClick={handleDebug} variant="ghost" size="sm">
              Debug Info
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Pay Periods</h2>
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-md">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedLocation} onValueChange={handleLocationChange}>
              <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent position="popper">
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Show pay period statistics */}
          {isFetched && payPeriods.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {payPeriods.length} pay period{payPeriods.length !== 1 ? 's' : ''}
              {getPayPeriodsByStatus('pending').length > 0 && (
                <span className="ml-2 text-yellow-600">
                  • {getPayPeriodsByStatus('pending').length} pending
                </span>
              )}
              {getPayPeriodsByStatus('in-progress').length > 0 && (
                <span className="ml-2 text-blue-600">
                  • {getPayPeriodsByStatus('in-progress').length} in progress
                </span>
              )}
            </div>
          )}
          
          {/* Show loading indicators for mutations */}
          {(isCreating || isUpdating || isDeleting) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
              {isCreating && "Creating..."}
              {isUpdating && "Updating..."}
              {isDeleting && "Deleting..."}
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={refreshPayPeriods} 
            variant="outline" 
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            disabled={isCreating}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Pay Period
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {payPeriods.length > 0 ? (
          payPeriods.map((period) => (
            <PayPeriodCard
              key={period.id}
              payPeriod={period}
              onClick={() => setSelectedPayPeriod(period)}
              onDelete={() => handleDeletePayPeriod(period.id)}
              locationName={locations.find((loc) => loc.id === period.location)?.name || ""}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted/50 p-4 mb-4">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Pay Periods Found</h3>
            <p className="text-muted-foreground max-w-md mb-4">
              {isFetched 
                ? `There are no pay periods for ${locations.find(loc => loc.id === selectedLocation)?.name} yet. Create a new pay period to get started.`
                : 'Loading pay periods...'
              }
            </p>
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              disabled={isCreating}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Pay Period
            </Button>
          </div>
        )}
      </div>

      <AddPayPeriodDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAdd={handleAddPayPeriod}
        locations={locations}
        defaultLocation={selectedLocation}
      />
    </div>
  )
}
"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { DateSelector } from './DateSelector';
import { LocationSelector } from '../../labor/components/labor/LocationSelector';
import { SalesSummary } from './SalesSummary';
import { SalesUploadSection } from './SalesUploadSection';
import { salesApi } from '../api/salesApi';

interface SalesDashboardProps {
  defaultLocationId?: number;
}

export const SalesDashboard: React.FC<SalesDashboardProps> = ({ defaultLocationId = 435860 }) => {
  // State management
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [locationId, setLocationId] = useState<number | undefined>(defaultLocationId);
  const [selectedLocationName, setSelectedLocationName] = useState<string>('');
  const [salesData, setSalesData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle location change
  const handleLocationChange = (newLocationId: number) => {
    setLocationId(newLocationId);
  };

  // Handle location change with name
  const handleLocationChangeWithName = (newLocationId: number, _newSevenshiftLocationId?: string, locationName?: string) => {
    setLocationId(newLocationId);
    setSelectedLocationName(locationName || '');
  };

  // Handle date change from upload section
  const handleDateChange = (startDate: Date, endDate: Date) => {
    setSelectedDate(startDate);
    setStartDate(startDate);
    setEndDate(endDate);
  };

  // Fetch sales data when date changes
  const fetchSalesData = async (startDateParam?: Date, endDateParam?: Date) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const start = startDateParam || startDate;
      const end = endDateParam || endDate;
      const startFormatted = format(start, 'yyyy-MM-dd');
      const endFormatted = format(end, 'yyyy-MM-dd');
      
      const data = await salesApi.getSalesSummary(startFormatted, endFormatted, locationId);
      setSalesData(data); // This will be null if no data exists
    } catch (err: any) {
      console.error('Error fetching sales data:', err);
      setError(err.response?.data?.detail || 'Failed to fetch sales data');
      setSalesData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle date range change
  const handleDateRangeChange = (newStartDate: Date, newEndDate: Date) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    fetchSalesData(newStartDate, newEndDate);
  };

  // Load sales data when date or location changes
  useEffect(() => {
    fetchSalesData();
  }, [startDate, endDate, locationId]);

  // Handle refresh button click
  const handleRefresh = () => {
    fetchSalesData();
  };

  // Handle delete button click
  const handleDelete = async () => {
    if (!locationId) {
      setError('Please select a location');
      return;
    }

    setIsDeleting(true);
    setError(null);
    
    try {
      const startFormatted = format(startDate, 'yyyy-MM-dd');
      const endFormatted = format(endDate, 'yyyy-MM-dd');
      
      await salesApi.deleteSalesData(startFormatted, endFormatted, locationId);
      
      // Clear the sales data after successful deletion
      setSalesData(null);
      
      // Show success message (you could add a toast notification here)
      console.log('Sales data deleted successfully');
      
    } catch (err: any) {
      console.error('Error deleting sales data:', err);
      setError(err.response?.data?.detail || 'Failed to delete sales data');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900">Sales Summary</h1>
        <p className="text-lg text-gray-600">
          {startDate.getTime() === endDate.getTime() 
            ? format(startDate, "MMMM d, yyyy")
            : `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`
          }
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <DateSelector
          selectedDate={selectedDate}
          startDate={startDate}
          endDate={endDate}
          onDateChange={setSelectedDate}
          onDateRangeChange={handleDateRangeChange}
          showDateRange={true}
        />
        
        <LocationSelector
          selectedLocationId={locationId}
          onLocationChange={handleLocationChange}
          onLocationChangeWithName={handleLocationChangeWithName}
          defaultLocationId={defaultLocationId}
        />

        <Button onClick={handleRefresh} disabled={isLoading} size="sm">
          {isLoading ? "Loading..." : "Refresh"}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isLoading || isDeleting}>
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete all sales data for{" "}
                <span className="font-semibold">
                  {startDate.getTime() === endDate.getTime() 
                    ? format(startDate, "MMMM d, yyyy")
                    : `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`
                  }
                </span>{" "}
                at{" "}
                <span className="font-semibold">{selectedLocationName || "the selected location"}</span>?
                <br /><br />
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Sales Summary */}
      {salesData ? (
        <SalesSummary data={salesData} />
      ) : isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-500">Loading sales data...</div>
        </div>
      ) : !error && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-800">
            No sales data available for {startDate.getTime() === endDate.getTime() 
              ? format(startDate, 'MMMM d, yyyy')
              : `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
            }. Upload a Snackpass CSV file to view sales data.
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Section */}
      <SalesUploadSection 
        selectedDate={selectedDate}
        locationId={locationId}
        onDataUploaded={(data) => setSalesData(data)}
        onRefresh={(startDate, endDate) => fetchSalesData(startDate, endDate)}
        onDateChange={handleDateChange}
      />

      {/* Collapsible Sections */}
      <div className="space-y-4">
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4 h-auto">
              <span className="text-lg font-semibold">Category Sales</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-gray-500">Category sales breakdown will be displayed here.</p>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4 h-auto">
              <span className="text-lg font-semibold">Provider Sales</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-gray-500">Provider sales breakdown will be displayed here.</p>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4 h-auto">
              <span className="text-lg font-semibold">Item Sales</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-gray-500">Item sales breakdown will be displayed here.</p>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}; 
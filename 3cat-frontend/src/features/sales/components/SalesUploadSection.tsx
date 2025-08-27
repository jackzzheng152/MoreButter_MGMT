import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { salesApi } from '../api/salesApi';
import api from '@/lib/axios';
import { DateValidationDialog } from './DateValidationDialog';
import { ExistingDataDialog } from './ExistingDataDialog';

interface Location {
  location_id: number;
  location_name: string;
  location_code: string;
  sevenshift_location_id?: string;
}

interface SalesUploadSectionProps {
  selectedDate: Date;
  locationId?: number;
  onDataUploaded: (data: any) => void;
  onRefresh?: (startDate?: Date, endDate?: Date) => void;
  onDateChange?: (startDate: Date, endDate: Date) => void;
}

export const SalesUploadSection: React.FC<SalesUploadSectionProps> = ({
  selectedDate,
  locationId,
  onDataUploaded,
  onRefresh,
  onDateChange,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [periodStartDate, setPeriodStartDate] = useState<Date>(selectedDate);
  const [periodEndDate, setPeriodEndDate] = useState<Date>(selectedDate);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  
  // Date validation dialog state
  const [showDateValidationDialog, setShowDateValidationDialog] = useState(false);
  const [dateValidationData, setDateValidationData] = useState<any>(null);
  
  // Existing data dialog state
  const [showExistingDataDialog, setShowExistingDataDialog] = useState(false);
  const [existingDataInfo, setExistingDataInfo] = useState<any>(null);

  // Fetch locations on component mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setIsLoadingLocations(true);
        const response = await api.get('/employees/locations');
        setLocations(response.data);
      } catch (err) {
        console.error('Failed to fetch locations:', err);
      } finally {
        setIsLoadingLocations(false);
      }
    };

    fetchLocations();
  }, []);

  // Update internal date state when selectedDate prop changes
  // Only update on initial load or when dates are the same
  useEffect(() => {
    // Only sync if this is the initial load (both dates are the same as selectedDate)
    const isInitialLoad = periodStartDate.getTime() === selectedDate.getTime() && 
                         periodEndDate.getTime() === selectedDate.getTime();
    
    if (isInitialLoad) {
      setPeriodStartDate(selectedDate);
      setPeriodEndDate(selectedDate);
    }
  }, [selectedDate]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setUploadStatus('idle');
      setErrorMessage('');
    } else {
      setErrorMessage('Please select a valid CSV file.');
      setUploadStatus('error');
    }
  };

  const handleUpload = async () => {
    if (!file || !locationId) {
      setErrorMessage('Please select a file and ensure location is selected.');
      setUploadStatus('error');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');

    try {
      const result = await salesApi.uploadSnackpassFile(
        file,
        'custom', // Use 'custom' for start/end date range
        format(periodStartDate, 'yyyy-MM-dd'),
        format(periodEndDate, 'yyyy-MM-dd'),
        locationId!
      );

      // Check if there's a date validation error
      if (!result.success && result.validation_error) {
        setDateValidationData(result.date_validation);
        setShowDateValidationDialog(true);
        setIsUploading(false);
        return;
      }
      
      // Check if there's an existing data error
      if (!result.success && result.existing_data_error) {
        setExistingDataInfo(result.existing_data);
        setShowExistingDataDialog(true);
        setIsUploading(false);
        return;
      }

      setUploadStatus('success');
      
      // After successful upload, update the selected date to match the uploaded data
      if (onDateChange) {
        onDateChange(periodStartDate, periodEndDate);
      }
      
      // After successful upload, refresh the data for the uploaded date range
      if (onRefresh) {
        onRefresh(periodStartDate, periodEndDate);
      }
      
      // Reset file input
      setFile(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      setErrorMessage('Failed to upload file. Please try again.');
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDateValidationConfirm = async (newStartDate: Date, newEndDate: Date) => {
    if (!file || !locationId) return;

    setIsUploading(true);
    setShowDateValidationDialog(false);

    try {
      // Update the date range
      setPeriodStartDate(newStartDate);
      setPeriodEndDate(newEndDate);

      // Upload with the new date range and skip validation
      const result = await salesApi.uploadSnackpassFile(
        file,
        'custom',
        format(newStartDate, 'yyyy-MM-dd'),
        format(newEndDate, 'yyyy-MM-dd'),
        locationId!,
        false // Skip date validation since we already validated
      );

      // Check if there's an existing data error
      if (!result.success && result.existing_data_error) {
        setExistingDataInfo(result.existing_data);
        setShowExistingDataDialog(true);
        setIsUploading(false);
        return;
      }

      setUploadStatus('success');
      
      // After successful upload, update the selected date to match the uploaded data
      if (onDateChange) {
        onDateChange(newStartDate, newEndDate);
      }
      
      // After successful upload, refresh the data for the new date range
      if (onRefresh) {
        onRefresh(newStartDate, newEndDate);
      }
      
      // Reset file input
      setFile(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      setErrorMessage('Failed to upload file. Please try again.');
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDateValidationCancel = () => {
    setShowDateValidationDialog(false);
    setDateValidationData(null);
    setIsUploading(false);
  };

  const handleExistingDataOverwrite = async () => {
    if (!file || !locationId) return;

    setIsUploading(true);
    setShowExistingDataDialog(false);

    try {
      const result = await salesApi.uploadSnackpassFile(
        file,
        'custom',
        format(periodStartDate, 'yyyy-MM-dd'),
        format(periodEndDate, 'yyyy-MM-dd'),
        locationId!,
        false, // Skip date validation
        true   // Overwrite existing data
      );

      setUploadStatus('success');
      
      // After successful upload, update the selected date to match the uploaded data
      if (onDateChange) {
        onDateChange(periodStartDate, periodEndDate);
      }
      
      if (onRefresh) {
        onRefresh(periodStartDate, periodEndDate);
      }
      
      setFile(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      setErrorMessage('Failed to upload file. Please try again.');
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleExistingDataAppend = async () => {
    if (!file || !locationId) return;

    setIsUploading(true);
    setShowExistingDataDialog(false);

    try {
      const result = await salesApi.uploadSnackpassFile(
        file,
        'custom',
        format(periodStartDate, 'yyyy-MM-dd'),
        format(periodEndDate, 'yyyy-MM-dd'),
        locationId!,
        false, // Skip date validation
        false, // Don't overwrite
        true   // Append mode
      );

      setUploadStatus('success');
      
      // After successful upload, update the selected date to match the uploaded data
      if (onDateChange) {
        onDateChange(periodStartDate, periodEndDate);
      }
      
      if (onRefresh) {
        onRefresh(periodStartDate, periodEndDate);
      }
      
      setFile(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      setErrorMessage('Failed to upload file. Please try again.');
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleExistingDataCancel = () => {
    setShowExistingDataDialog(false);
    setExistingDataInfo(null);
    setIsUploading(false);
  };



  return (
    <Card className="border border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Snackpass Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Start Date
            </Label>
            <Input
              type="date"
              value={format(periodStartDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                const [year, month, day] = e.target.value.split('-').map(Number);
                // Create date in local timezone to avoid timezone issues
                const newDate = new Date(year, month - 1, day, 12, 0, 0, 0);
                setPeriodStartDate(newDate);
              }}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              End Date
            </Label>
            <Input
              type="date"
              value={format(periodEndDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                const [year, month, day] = e.target.value.split('-').map(Number);
                // Create date in local timezone to avoid timezone issues
                const newDate = new Date(year, month - 1, day, 12, 0, 0, 0);
                setPeriodEndDate(newDate);
              }}
              className="w-full"
            />
          </div>
        </div>

        {/* File Upload */}
        <div className="space-y-3">
          <Label htmlFor="file-upload" className="text-sm font-medium text-gray-700">
            Select Snackpass CSV File
          </Label>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <div className="h-10 border border-gray-300 rounded-md bg-white flex items-center justify-center hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2 text-gray-700">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm font-medium">Choose File</span>
                </div>
              </div>
            </div>
            {file && (
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex items-center gap-2 h-10"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* File Info */}
        {file && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <FileText className="w-4 h-4 text-gray-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        )}

        {/* Upload Status */}
        {uploadStatus === 'success' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              File uploaded successfully! Sales data has been updated for {format(periodStartDate, 'MMM d, yyyy')} to {format(periodEndDate, 'MMM d, yyyy')}.
            </AlertDescription>
          </Alert>
        )}

        {uploadStatus === 'error' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Date Validation Dialog */}
        {showDateValidationDialog && dateValidationData && (
          <DateValidationDialog
            isOpen={showDateValidationDialog}
            onClose={() => setShowDateValidationDialog(false)}
            onConfirm={handleDateValidationConfirm}
            onCancel={handleDateValidationCancel}
            currentStartDate={periodStartDate}
            currentEndDate={periodEndDate}
            csvMinDate={dateValidationData.csv_min_date}
            csvMaxDate={dateValidationData.csv_max_date}
            totalOrders={dateValidationData.total_orders}
          />
        )}

        {/* Existing Data Dialog */}
        {showExistingDataDialog && existingDataInfo && (
          <ExistingDataDialog
            isOpen={showExistingDataDialog}
            onClose={() => setShowExistingDataDialog(false)}
            onOverwrite={handleExistingDataOverwrite}
            onAppend={handleExistingDataAppend}
            existingData={existingDataInfo}
            selectedStartDate={periodStartDate}
            selectedEndDate={periodEndDate}
          />
        )}

      </CardContent>
    </Card>
  );
}; 
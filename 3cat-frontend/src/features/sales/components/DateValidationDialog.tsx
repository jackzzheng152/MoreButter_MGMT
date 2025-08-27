import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Calendar, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface DateValidationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newStartDate: Date, newEndDate: Date) => void;
  onCancel: () => void;
  currentStartDate: Date;
  currentEndDate: Date;
  csvMinDate: string;
  csvMaxDate: string;
  totalOrders: number;
}

export const DateValidationDialog: React.FC<DateValidationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  currentStartDate,
  currentEndDate,
  csvMinDate,
  csvMaxDate,
  totalOrders
}) => {
  // Parse CSV dates properly to avoid timezone issues
  const parseDateString = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  };

  // Calculate the intersection of selected range and CSV range
  const csvStartDate = parseDateString(csvMinDate);
  const csvEndDate = parseDateString(csvMaxDate);
  
  // Check if there's any overlap between selected range and CSV range
  const hasOverlap = currentStartDate <= csvEndDate && csvStartDate <= currentEndDate;
  
  let suggestedStart, suggestedEnd;
  
  if (hasOverlap) {
    // If there's overlap, use the intersection
    suggestedStart = new Date(Math.max(currentStartDate.getTime(), csvStartDate.getTime()));
    suggestedEnd = new Date(Math.min(currentEndDate.getTime(), csvEndDate.getTime()));
  } else {
    // If no overlap, use the CSV range as the suggestion
    suggestedStart = csvStartDate;
    suggestedEnd = csvEndDate;
  }

  const [newStartDate, setNewStartDate] = useState<Date>(suggestedStart);
  const [newEndDate, setNewEndDate] = useState<Date>(suggestedEnd);

  const handleConfirm = () => {
    onConfirm(newStartDate, newEndDate);
  };

  const handleCancel = () => {
    onCancel();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Date Range Mismatch
          </DialogTitle>
                  <DialogDescription>
          The CSV file doesn't contain data for the entire selected date range. Would you like to update the date range to match the actual data in the CSV?
        </DialogDescription>
      </DialogHeader>

            <div className="space-y-6 pt-4">
        <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              CSV contains {totalOrders} orders from {format(parseDateString(csvMinDate), 'MMM d, yyyy')} to {format(parseDateString(csvMaxDate), 'MMM d, yyyy')}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Current Start Date</label>
              <div className="flex items-center gap-2 p-2 bg-gray-100 rounded border">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{format(currentStartDate, 'MMM d, yyyy')}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Current End Date</label>
              <div className="flex items-center gap-2 p-2 bg-gray-100 rounded border">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{format(currentEndDate, 'MMM d, yyyy')}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">New Start Date</label>
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-700">{format(newStartDate, 'MMM d, yyyy')}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">New End Date</label>
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-700">{format(newEndDate, 'MMM d, yyyy')}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 pt-6">
          <Button variant="outline" onClick={handleCancel}>
            Cancel Upload
          </Button>
          <Button onClick={handleConfirm} className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Update Date Range & Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 
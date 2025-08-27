import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Trash2, Plus, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { ExistingDataInfo } from '../types/sales';

interface ExistingDataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOverwrite: () => void;
  onAppend: () => void;
  existingData: ExistingDataInfo;
  selectedStartDate: Date;
  selectedEndDate: Date;
}

export const ExistingDataDialog: React.FC<ExistingDataDialogProps> = ({
  isOpen,
  onClose,
  onOverwrite,
  onAppend,
  existingData,
  selectedStartDate,
  selectedEndDate
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Existing Data Found
          </DialogTitle>
          <DialogDescription>
            Data already exists for the selected date range. Choose how you want to handle the existing data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Found {existingData.total_existing_orders} existing orders for {format(selectedStartDate, 'MMM d, yyyy')} to {format(selectedEndDate, 'MMM d, yyyy')}
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Existing Data by Date:</h4>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {existingData.existing_dates.map((dateInfo, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">{dateInfo.formatted_date}</span>
                  </div>
                  <span className="text-sm text-gray-600">{dateInfo.count} orders</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Choose an option:</h4>
              <div className="space-y-2 text-sm text-blue-700">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  <span><strong>Overwrite:</strong> Delete all existing data and replace with new CSV data</span>
                </div>
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span><strong>Append:</strong> Keep existing data and add new CSV data (duplicates may occur)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 pt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" onClick={onAppend} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Append Data
          </Button>
          <Button onClick={onOverwrite} className="flex items-center gap-2 bg-red-600 hover:bg-red-700">
            <Trash2 className="w-4 h-4" />
            Overwrite Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 
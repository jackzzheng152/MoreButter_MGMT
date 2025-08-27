import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, RefreshCw, CheckCircle } from "lucide-react";

interface SalesUploadSectionProps {
  weekStart: string;
  weekDisplayText: string;
  salesDataManager: any;
}

export const SalesUploadSection: React.FC<SalesUploadSectionProps> = ({
  weekStart,
  weekDisplayText,
  salesDataManager,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const result = await salesDataManager.uploadMutation.mutateAsync({
        file: selectedFile,
        weekStart: weekStart,
      });
      setUploadResult(result);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Sales Data Management for {weekDisplayText}
        </CardTitle>
        <CardDescription>
          Upload Snackpass data to automatically populate hourly sales
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium">Upload Snackpass Data</h4>
                <p className="text-sm text-gray-600">
                  Upload CSV export from Snackpass to automatically populate hourly sales
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  disabled={salesDataManager.isUploading}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("file-upload")?.click()}
                  disabled={salesDataManager.isUploading}
                >
                  {salesDataManager.isUploading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {salesDataManager.isUploading ? "Processing..." : "Select CSV"}
                </Button>

                {selectedFile && (
                  <Button
                    onClick={handleUpload}
                    disabled={salesDataManager.isUploading}
                    size="sm"
                  >
                    Upload for Week
                  </Button>
                )}
              </div>
            </div>

            {selectedFile && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Selected file: <strong>{selectedFile.name}</strong>
                </AlertDescription>
              </Alert>
            )}

            {uploadResult && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Successfully processed: <strong>{uploadResult.data.filename}</strong>
                  <div className="mt-2 text-xs">
                    Total sales imported: ${uploadResult.data.summary.total_weekly_sales.toLocaleString()}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};
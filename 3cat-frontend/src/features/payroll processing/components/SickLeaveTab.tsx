import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Calendar, Download, FileText, Info, RefreshCw, Check, X, Bug } from 'lucide-react';
import { format } from 'date-fns';
import { useSickLeaveQuery } from '../hooks/useSickLeaveQuery';
import { safeToFixed } from "@/lib/utils";


interface SickLeaveTabProps {
  companyId: number;
  locationId: number;
  payPeriodStart: string;
  payPeriodEnd: string;
  employees: any[];
  onApplySickLeave: (employeeId: number, sickLeaveHours: number) => void;
}

interface SickLeaveEntry {
    id: number;
    userId: number;
    employeeId: string;
    employeeName: string;
    gustoId: string;
    date: string;
    hours: number;
    category: string;
    status: number;
    isApplied: boolean;
  }

export const SickLeaveTab: React.FC<SickLeaveTabProps> = ({
  companyId,
  locationId,
  payPeriodStart,
  payPeriodEnd,
  employees,
  onApplySickLeave
}) => {
  // Use the React Query hook for sick leave data
  const {
    sickLeaveEntries,
    totalHoursByEmployee,
    isLoading,
    isError,
    error,
    getStatusLabel,
    updateSickLeaveStatus,
    applySickLeave,
    unapplySickLeave,
    refreshSickLeaveData,
    debugState,
    
  } = useSickLeaveQuery(
    companyId,
    locationId,
    payPeriodStart,
    payPeriodEnd,
    employees
  );
  
  // State for selected entries (for bulk operations if needed)
  const [selectedEntries, setSelectedEntries] = useState<Record<string, boolean>>({});
  
  // Toggle selection of a leave entry
  const toggleSelectEntry = (entryId: string) => {
    setSelectedEntries(prev => ({
      ...prev,
      [entryId]: !prev[entryId]
    }));
  };
  
  // Toggle select all entries
  const toggleSelectAll = () => {
    const allSelected = sickLeaveEntries.length > 0 && 
      sickLeaveEntries.every(entry => selectedEntries[entry.id]);
    
    const newSelections: Record<string, boolean> = {};
    sickLeaveEntries.forEach(entry => {
      newSelections[entry.id] = !allSelected;
    });
    
    setSelectedEntries(newSelections);
  };
  
  // Apply sick leave hours to payroll
  const applySickLeaveToPayroll = () => {
    const employeesWithLeave: string[] = [];
    
    Object.entries(totalHoursByEmployee).forEach(([gustoId, hours]) => {
      // Find employee by Gusto ID
      const employee = employees.find(emp => emp.gustoId === gustoId);
      if (employee) {
        employeesWithLeave.push(employee.name);
        onApplySickLeave(employee.id, hours);
      }
    });
    
    // Show confirmation
    if (employeesWithLeave.length > 0) {
      alert(`Applied sick leave hours to ${employeesWithLeave.length} employees: ${employeesWithLeave.join(', ')}`);
    } else {
      alert('No eligible sick leave hours to apply to payroll.');
    }
  };
  
  // Approve selected sick leave entries
  const approveSelectedEntries = () => {
    const selectedIds = Object.entries(selectedEntries)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => parseInt(id));
    
    if (selectedIds.length === 0) {
      alert('Please select at least one entry to approve.');
      return;
    }
    
    // Confirm with user
    if (confirm(`Are you sure you want to approve ${selectedIds.length} sick leave entries?`)) {
      let processed = 0;
      
      selectedIds.forEach(timeOffId => {
        updateSickLeaveStatus({ 
          timeOffId, 
          status: 1, // Approved
          message: 'Approved via payroll system' 
        }, {
          onSuccess: () => {
            processed++;
            if (processed === selectedIds.length) {
              // Clear selections when all are processed
              setSelectedEntries({});
              alert(`Successfully approved ${selectedIds.length} entries.`);
            }
          }
        });
      });
    }
  };
  
  // Download sick leave report as CSV
  const downloadSickLeaveReport = () => {
    // Create CSV content
    const headers = ['Employee', 'Gusto ID', 'Date', 'Hours', 'Status'];
    const rows = sickLeaveEntries.map(entry => [
      entry.employeeName,
      entry.gustoId,
      entry.date,
      entry.hours,
      getStatusLabel(entry.status)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sick_leave_report_${payPeriodStart}_to_${payPeriodEnd}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  // Group entries by employee for summary
  const entriesByEmployee: Record<string, any[]> = {};
  sickLeaveEntries.forEach(entry => {
    if (!entriesByEmployee[entry.gustoId]) {
      entriesByEmployee[entry.gustoId] = [];
    }
    entriesByEmployee[entry.gustoId].push(entry);
  });
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };
  
  // Get status badge color
  const getStatusBadgeVariant = (status: number) => {
    switch (status) {
      case 0: return "default";  // Pending
      case 1: return "default";  // Approved
      case 2: return "destructive"; // Denied
      case 3: return "outline";   // Canceled
      default: return "default";
    }
  };
  
  // Count total entries and hours
  const totalEntries = sickLeaveEntries.length;
  const totalApprovedHours = sickLeaveEntries
    .filter(entry => entry.status === 1)
    .reduce((sum, entry) => sum + entry.hours, 0);
  
  const selectedCount = Object.values(selectedEntries).filter(Boolean).length;
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
        <p className="text-lg">Loading sick leave data...</p>
      </div>
    );
  }
  
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Sick Leave Data</AlertTitle>
        <AlertDescription>
          {error?.message || 'Failed to load sick leave data. Please try again or contact support.'}
        </AlertDescription>
      </Alert>
    );
  }

  const handleApplySickLeave = (entry: SickLeaveEntry) => {
    console.log(`Applying sick leave for ${entry.employeeName} on ${entry.date}`);
    
    // Apply to local storage
    applySickLeave(entry.id, entry.date);
    
    // Find relevant employee and apply sick leave hours
    const employee = employees.find(emp => emp.gustoId === entry.gustoId);
    if (employee) {
      // Recalculate hours for this employee - you can choose whether to just apply
      // this entry's hours or recalculate the total based on all applied entries
      onApplySickLeave(employee.id, entry.hours);
    }
  };
  
  // Unapply a single sick leave entry
  const handleUnapplySickLeave = (entry: SickLeaveEntry) => {
    console.log(`Unapplying sick leave for ${entry.employeeName} on ${entry.date}`);
    
    // Unapply from local storage
    unapplySickLeave(entry.id, entry.date);
    
    // Find relevant employee
    const employee = employees.find(emp => emp.gustoId === entry.gustoId);
    if (employee) {
      // For a simple implementation - just subtract these hours
      // This assumes your employee object has a sickLeaveHours property
      if (employee.sickLeaveHours && employee.sickLeaveHours >= entry.hours) {
        onApplySickLeave(employee.id, employee.sickLeaveHours - entry.hours);
      } else {
        // If no hours to subtract, set to 0
        onApplySickLeave(employee.id, 0);
      }
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 rounded-lg mb-4">
        <h3 className="text-lg font-medium mb-2">Sick Leave Management</h3>
        <p className="text-sm text-muted-foreground">
          View and manage sick leave for employees during this pay period. Approved sick leave can be applied 
          to employee payroll as paid time off.
        </p>
      </div>
      <div className="flex justify-end mb-4">
        <Button 
            onClick={refreshSickLeaveData} 
            variant="outline"
            className="mr-2 flex items-center gap-2"
            disabled={isLoading}
        >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
        
        <Button 
            onClick={debugState} 
            variant="outline" 
            size="sm"
            className="text-gray-600"
        >
            <Bug className="h-4 w-4 mr-2" />
            Debug
        </Button>
       </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-muted-foreground mr-2" />
              <div className="text-2xl font-bold">{totalEntries}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-muted-foreground mr-2" />
              <div className="text-2xl font-bold">{safeToFixed(totalApprovedHours, 2)}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Employees with Sick Leave</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Info className="h-5 w-5 text-muted-foreground mr-2" />
              <div className="text-2xl font-bold">{Object.keys(entriesByEmployee).length}</div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="select-all"
            checked={sickLeaveEntries.length > 0 && sickLeaveEntries.every(entry => selectedEntries[entry.id])}
            onCheckedChange={toggleSelectAll}
          />
          <label 
            htmlFor="select-all" 
            className="text-sm font-medium cursor-pointer"
          >
            Select All
          </label>
          {selectedCount > 0 && (
            <span className="text-sm text-muted-foreground">
              ({selectedCount} selected)
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          {selectedCount > 0 && (
            <Button 
              onClick={approveSelectedEntries} 
              variant="outline"
              className="border-green-500 text-green-600 hover:bg-green-50"
              disabled={false}
            >
              
              Approve Selected
            </Button>
          )}
          
          <Button onClick={downloadSickLeaveReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
          
          <Button 
            onClick={applySickLeaveToPayroll} 
            variant="default" 
            className="bg-blue-600 hover:bg-blue-700"
          >
            Apply to Payroll
          </Button>
        </div>
      </div>
      
      {/* Main Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <span className="sr-only">Select</span>
              </TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Gusto ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Applied</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sickLeaveEntries.length > 0 ? (
              sickLeaveEntries.map((entry) => {
                const entryKey = `${entry.id}_${entry.date}`;
                const isSelected = selectedEntries[entryKey] || false;
                
                return (
                  <TableRow key={entryKey}>
                    <TableCell>
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectEntry(`${entry.id}_${entry.date}`)}
                        aria-label={`Select sick leave for ${entry.employeeName}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{entry.employeeName}</TableCell>
                    <TableCell>{entry.gustoId}</TableCell>
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                        {entry.hours}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(entry.status)}>
                        {getStatusLabel(entry.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {entry.isApplied ? (
                        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                          <Check className="h-3 w-3 mr-1" />
                          Applied
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.status === 1 && (
                        <>
                          {entry.isApplied ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-500 border-red-200 hover:bg-red-50"
                              onClick={() => handleUnapplySickLeave(entry)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Unapply
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-green-600"
                              onClick={() => handleApplySickLeave(entry)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Apply
                            </Button>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                  No sick leave entries found for this pay period
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Employee Summary Section */}
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">Sick Leave Summary by Employee</h3>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Gusto ID</TableHead>
                <TableHead className="text-right">Total Hours</TableHead>
                <TableHead className="text-right">Applied Hours</TableHead>
                <TableHead>Pay Period</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(entriesByEmployee).length > 0 ? (
                Object.entries(entriesByEmployee).map(([gustoId, entries]) => {
                  const employee = entries[0]; // Get employee info from first entry
                  const totalHours = entries
                    .filter(entry => entry.status === 1) // Only count approved entries
                    .reduce((sum, entry) => sum + entry.hours, 0);
                  
                  const appliedHours = entries
                    .filter(entry => entry.status === 1 && entry.isApplied) // Only applied + approved
                    .reduce((sum, entry) => sum + entry.hours, 0);
                  
                  const allApplied = totalHours > 0 && totalHours === appliedHours;
                  
                  return (
                    <TableRow key={gustoId}>
                      <TableCell className="font-medium">{employee.employeeName}</TableCell>
                      <TableCell>{gustoId}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                          {safeToFixed(totalHours, 2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={allApplied ? "default" : "outline"} className={
                          allApplied 
                            ? "" 
                            : "bg-yellow-50 text-yellow-600 border-yellow-200"
                        }>
                          {safeToFixed(appliedHours, 2)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(payPeriodStart)} - {formatDate(payPeriodEnd)}
                      </TableCell>
                      <TableCell>
                        {/* {totalHours > 0 && !allApplied && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-green-600"
                            onClick={() => handleApplyAllForEmployee(gustoId)}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Apply All
                          </Button>
                        )} */}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No employees with sick leave in this period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Check, X, Save, CheckCircle, ArrowUpDown } from "lucide-react";
import { TimesheetEntry } from '../types/timePunch';
import { Employee } from '../types/employees';
import { useBreakPenaltiesQuery } from '../hooks/useBreakPenaltiesQuery';
import { useSort, sortData } from "@/lib/sortUtils";
import { safeToFixed } from "@/lib/utils";

interface BreakPenaltiesTabProps {
  timesheet: TimesheetEntry[];
  employees: Employee[];
  onApplyPenalty: (employeeId: number, breakHourPay: number) => void;
}

export const BreakPenaltiesTab: React.FC<BreakPenaltiesTabProps> = ({
  timesheet,
  employees,
  onApplyPenalty,
}) => {
  // Use React Query hook for break penalties management
  const {
    penalties,
    storedPenalties,
    isLoading,
    applyPenalty,
    unapplyPenalty,
    isApplying,
    isUnapplying
  } = useBreakPenaltiesQuery(timesheet, employees);
  
  // Local state for UI
  const [selectedPenalties, setSelectedPenalties] = useState<Record<string, boolean>>({});
  
  // Add sorting state
  const { sortConfig, handleSort } = useSort('employeeName');

  // Function to toggle selection of a penalty
  const toggleSelectPenalty = (penalty: any) => {
    const penaltyKey = `${penalty.gustoId}_${penalty.date}`;
    setSelectedPenalties(prev => ({
      ...prev,
      [penaltyKey]: !prev[penaltyKey]
    }));
  };
  
  // Function to select or deselect all penalties
  const toggleSelectAll = () => {
    const allSelected = penalties.every(penalty => {
      const penaltyKey = `${penalty.gustoId}_${penalty.date}`;
      return selectedPenalties[penaltyKey];
    });
    
    const newSelection: Record<string, boolean> = {};
    penalties.forEach(penalty => {
      const penaltyKey = `${penalty.gustoId}_${penalty.date}`;
      newSelection[penaltyKey] = !allSelected;
    });
    
    setSelectedPenalties(newSelection);
  };
  
  // Handler for applying a penalty
  const handleApplyPenalty = (penalty: any) => {
    // Call the mutation
    applyPenalty(penalty, {
      // This is an optional onSuccess callback that can be used if needed
      onSuccess: (result) => {
        // Find the employee and apply the penalty via the passed callback
        const employee = employees.find(emp => emp.gustoId === penalty.gustoId);
        console.log("this is employee within handleApplyPenalty", employee);
        if (employee && onApplyPenalty) {
          onApplyPenalty(employee.id, result.employeeUpdate.totalPenaltyHours);
        }
      }
    });
  };

  // Handler for unapplying a penalty
  const handleUnapplyPenalty = (penalty: any) => {
    // Call the mutation
    unapplyPenalty(penalty, {
      // This is an optional onSuccess callback
      onSuccess: (result) => {
        // Find the employee and update via the passed callback
        const employee = employees.find(emp => emp.gustoId === penalty.gustoId);
        if (employee && onApplyPenalty) {
          onApplyPenalty(employee.id, result.employeeUpdate.totalPenaltyHours);
        }
      }
    });
  };

  // Batch apply selected penalties
  const confirmSelectedPenalties = () => {
    penalties.forEach(penalty => {
      const penaltyKey = `${penalty.gustoId}_${penalty.date}`;
      if (selectedPenalties[penaltyKey]) {
        handleApplyPenalty(penalty);
      }
    });
    
    // Clear selections after applying
    setSelectedPenalties({});
  };
  
  
  // Check if no employees are matched yet
  const noEmployeesYet = employees.length === 0;
  
  // Count selections and applied penalties
  const selectedCount = Object.values(selectedPenalties).filter(Boolean).length;
  const appliedCount = storedPenalties.filter(p => p.isApplied).length;
  const totalCount = penalties.length;
  
  // Sort the penalties
  const sortedPenalties = React.useMemo(() => {
    return sortData(penalties, sortConfig, (penalty, key) => {
      switch (key) {
        case 'employeeName':
          return penalty.employeeName;
        case 'gustoId':
          return penalty.gustoId;
        case 'date':
          // Convert MM/DD/YYYY to YYYY-MM-DD for proper date sorting
          const [month, day, year] = penalty.date.split('/');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        case 'clockIn':
        case 'clockOut':
          // Convert time to 24-hour format for proper sorting
          const time = penalty[key].toUpperCase();
          // Extract the period (AM/PM) from the end
          const period = time.slice(-2);
          // Get the time part without AM/PM
          const timeStr = time.slice(0, -2);
          let [hours, minutes] = timeStr.split(':').map(Number);
          
          // Handle AM/PM conversion
          if (period === 'PM' && hours !== 12) {
            hours += 12;
          } else if (period === 'AM' && hours === 12) {
            hours = 0;
          }
          
          // Convert to minutes since midnight for proper sorting
          return hours * 60 + minutes;
        case 'totalHours':
        case 'breakRequired':
        case 'breakTaken':
        case 'penaltyHours':
          return penalty[key];
        case 'status':
          return penalty.isApplied ? 'Applied' : 'Pending';
        default:
          return '';
      }
    });
  }, [penalties, sortConfig]);

  return (
    <div className="space-y-4">
      <div className="p-4 bg-amber-50 rounded-lg mb-4">
        <h3 className="text-lg font-medium mb-2">Break Hour Penalties</h3>
        <p className="text-sm text-muted-foreground">
          Employees are required to take 30 minutes of break for every 5 hours worked. 
          Those who don't take adequate breaks are subject to break hour penalties.
        </p>
      </div>

      {/* Debug button (can be removed in production) */}
      
      {noEmployeesYet && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Employees Not Yet Matched</AlertTitle>
          <AlertDescription>
            Employees haven't been matched yet. You can still review and select penalties now, 
            and they will be automatically applied when employees are matched in Step 3.
          </AlertDescription>
        </Alert>
      )}
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <p>Loading break penalties...</p>
        </div>
      ) : (
        <>
          {/* Batch Actions and Summary */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="select-all"
                checked={penalties.length > 0 && selectedCount === totalCount}
                onCheckedChange={toggleSelectAll}
              />
              <label 
                htmlFor="select-all" 
                className="text-sm font-medium cursor-pointer"
              >
                Select All
              </label>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="font-medium">{appliedCount}</span> of <span className="font-medium">{totalCount}</span> penalties applied
              </div>
              
              {selectedCount > 0 && (
                <Button 
                  variant="default"
                  onClick={confirmSelectedPenalties}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isApplying}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Confirm {selectedCount} Selected
                </Button>
              )}
            </div>
          </div>
          
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <span className="sr-only">Select</span>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('employeeName')}
                  >
                    <div className="flex items-center">
                      Employee
                      {sortConfig.key === 'employeeName' && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('gustoId')}
                  >
                    <div className="flex items-center">
                      Gusto ID
                      {sortConfig.key === 'gustoId' && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center">
                      Date
                      {sortConfig.key === 'date' && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('clockIn')}
                  >
                    <div className="flex items-center">
                      Clock In
                      {sortConfig.key === 'clockIn' && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('clockOut')}
                  >
                    <div className="flex items-center">
                      Clock Out
                      {sortConfig.key === 'clockOut' && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-200 text-right"
                    onClick={() => handleSort('totalHours')}
                  >
                    <div className="flex items-center justify-end">
                      Total Hours
                      {sortConfig.key === 'totalHours' && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-200 text-right"
                    onClick={() => handleSort('breakRequired')}
                  >
                    <div className="flex items-center justify-end">
                      Break Required
                      {sortConfig.key === 'breakRequired' && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-200 text-right"
                    onClick={() => handleSort('breakTaken')}
                  >
                    <div className="flex items-center justify-end">
                      Break Taken
                      {sortConfig.key === 'breakTaken' && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-200 text-right"
                    onClick={() => handleSort('penaltyHours')}
                  >
                    <div className="flex items-center justify-end">
                      Penalty Hours
                      {sortConfig.key === 'penaltyHours' && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      {sortConfig.key === 'status' && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPenalties.map((penalty, index) => {
                  const penaltyKey = `${penalty.gustoId}_${penalty.date}`;
                  const isSelected = selectedPenalties[penaltyKey] || false;
                  
                  // Check if this penalty is already applied in storedPenalties
                  const storedPenalty = storedPenalties.find(
                    p => p.gustoId === penalty.gustoId && p.date === penalty.date
                  );
                  const isApplied = storedPenalty?.isApplied || false;
                  
                  return (
                    <TableRow key={`${penalty.gustoId}_${penalty.date}_${index}`}>
                      <TableCell>
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectPenalty(penalty)}
                          aria-label={`Select penalty for ${penalty.employeeName}`}
                        />
                      </TableCell>
                      <TableCell>{penalty.employeeName}</TableCell>
                      <TableCell>{penalty.gustoId}</TableCell>
                      <TableCell>{penalty.date}</TableCell>
                      <TableCell>{penalty.clockIn}</TableCell>
                      <TableCell>{penalty.clockOut}</TableCell>
                                                      <TableCell className="text-right">{safeToFixed(penalty.totalHours, 2)}</TableCell>
                                <TableCell className="text-right">{safeToFixed(penalty.breakRequired, 2)}</TableCell>
                                <TableCell className="text-right">{safeToFixed(penalty.breakTaken, 2)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">
                          {safeToFixed(penalty.penaltyHours, 2)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isApplied ? (
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
                        {isApplied ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-500 border-red-200 hover:bg-red-50"
                            onClick={() => handleUnapplyPenalty(penalty)}
                            disabled={isUnapplying}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Unapply
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-green-600"
                            onClick={() => handleApplyPenalty(penalty)}
                            disabled={isApplying}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Apply
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {penalties.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-6 text-muted-foreground">
                      No break hour penalties detected
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {selectedCount > 0 && (
            <div className="flex justify-end mt-4">
              <Button 
                variant="default"
                onClick={confirmSelectedPenalties}
                className="bg-green-600 hover:bg-green-700"
                disabled={isApplying}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm {selectedCount} Selected Penalties
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
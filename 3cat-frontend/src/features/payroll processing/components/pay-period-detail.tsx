"use client"

import React from "react"
import Papa from "papaparse"
import { useState, useRef, useEffect } from "react"
import { ArrowLeft, CheckCircle, Download, FileSpreadsheet, Upload, AlertCircle, Edit, RefreshCw, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { PayPeriod, StoreLocation } from "@/features/payroll processing/types/payroll-types"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { TimeSheet } from "@/features/payroll processing/components/time-sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEmployeeMatching } from '../hooks/useEmployeeData';
import { usePersistedState } from "../hooks/usePersistedState";
import { BreakPenaltiesTab } from './break-penalties-tab';
import { PendingPenalty } from '../hooks/useBreakPenaltiesQuery';
import { SickLeaveTab } from './SickLeaveTab';
import { useSort, sortData } from "@/lib/sortUtils";
import { safeToFixed } from "@/lib/utils";
import { config } from "@/lib/config";

type Employee = {
  id: number
  name: string
  jobTitle: string
  regularHours: number
  overtimeHours: number
  doubleOvertimeHours: number
  tips: number
  hourlyRate: number
  scheduledHours?: number
  gustoId: string
  selected: boolean
  isEditing?: boolean
  breakHourPay: number
  isEditingBreak?: boolean
  sickLeaveHours: number
}

// Mock timesheet entry
type TimesheetEntry = {
  id: string
  employeeName: string
  gustoId: string
  date: string
  clockIn: string
  clockOut: string
  breakDuration: number
  totalHours: number
  isOvertime: boolean
  overtime_hours: number
  double_ot_hours: number
  regular_hours: number
}



// Job title options
const JOB_TITLES = ["Store Manager", "Assistant Manager", "Shift Lead", "Barista", "Trainee"]

interface PayPeriodDetailProps {
  payPeriod: PayPeriod
  locationName: string
  locationId: string // Add this prop
  locations: StoreLocation[] // Add this prop to access location data
  onBack: () => void
  onUpdate: (updatedPayPeriod: PayPeriod) => void
}

// Add this function before the component
const calculateTotalPay = (employee: Employee): number => {
  const regularPay = employee.regularHours * employee.hourlyRate;
  const overtimePay = employee.overtimeHours * (employee.hourlyRate * 1.5);
  const doubleOvertimePay = employee.doubleOvertimeHours * (employee.hourlyRate * 2);
  return regularPay + overtimePay + doubleOvertimePay + employee.tips;
};

export function PayPeriodDetail({ 
  payPeriod, 
  locationName, 
  locationId, 
  onBack, 
  onUpdate 
}: PayPeriodDetailProps) {
  // Define the steps in the workflow
  const STEPS = {
    UPLOAD_TIPS: 1,
    PULL_TIMESHEET: 2,
    PULL_EMPLOYEE_DATA: 3,
    CREATE_EXPORT: 4,
  }

  const [currentStep, setCurrentStep] = useState<number>(
    payPeriod.status === "completed"
      ? STEPS.CREATE_EXPORT
      : payPeriod.status === "in-progress"
        ? STEPS.PULL_TIMESHEET
        : STEPS.UPLOAD_TIPS,
  )
  const [tipsUploaded, setTipsUploaded] = useState(payPeriod.status !== "pending")
  const [timesheetLoaded, setTimesheetLoaded] = useState(
     payPeriod.status === "completed"
  )
  const [employeeDataLoaded, setEmployeeDataLoaded] = useState(payPeriod.status === "completed")
  const [exportReady, setExportReady] = useState(payPeriod.status === "completed")


  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tipFiles, setTipFiles] = useState<File[]>([])
  const [fileTips, setFileTips] = usePersistedState<{date:string,amount:number}[]>(
    "payPeriodFileTips",
    []
  );
  const [persistedTimesheet, setPersistedTimesheet] = usePersistedState<TimesheetEntry[]>(
    "payPeriodTimesheet", 
    []
  );

  // Inside the PayPeriodDetail component, add this state
  const [pendingBreakPenalties, setPendingBreakPenalties] = usePersistedState<PendingPenalty[]>(
    "pendingBreakPenalties(pay-period-detail)", 
    []
  );

  console.log("this is setPendingBreakPenalties", setPendingBreakPenalties)

  // Mock timesheet data
  const [timesheet, setTimesheet] = useState<TimesheetEntry[]>([])

  // Mock employee data
  const [employees, setEmployees] = useState<Employee[]>([])

  
  // Update payPeriod status when step changes
  useEffect(() => {
    let newStatus = payPeriod.status

    if (currentStep > STEPS.UPLOAD_TIPS && newStatus === "pending") {
      newStatus = "pending"
    }

    if (currentStep === STEPS.CREATE_EXPORT && exportReady) {
      newStatus = "pending"
    }

    if (newStatus !== payPeriod.status) {
      const updatedPayPeriod = { ...payPeriod, status: newStatus }
      onUpdate(updatedPayPeriod)
    }
  }, [currentStep, exportReady])




  
  function formatDate(dateString: string): string {
    let date: Date;
  
    // ISO format "yyyy-mm-dd"
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(year, month - 1, day);
    }
    // US format "m/d/yyyy" or "mm/dd/yyyy"
    else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
      const [month, day, year] = dateString.split('/').map(Number);
      date = new Date(year, month - 1, day);
    }
    // Fallback to built‑in parser (handles things like "2025-05-05T14:30:00Z", etc.)
    else {
      date = new Date(dateString);
    }
  
    // If parsing failed, just return the original string
    if (isNaN(date.getTime())) {
      return dateString;
    }
  
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day:   'numeric',
      year:  'numeric',
    });
  }

  const handleTipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setTipFiles(files)
  
    // parse & aggregate across all files
    const sums: Record<string, number> = {}
    let done = 0
  
    files.forEach(file => {
      Papa.parse<Record<string,string>>(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h : string) => h.trim(),
        complete: ({ data } : { data: Record<string,string>[] }) => {
          data.forEach(row => {
            const date = row.Date?.trim()
            const tip  = row.Tips || row["Tip Amount"] || ""
            const amt  = parseFloat(tip.replace(/[^0-9.]/g, "")) || 0
            if (date) sums[date] = (sums[date]||0) + amt
          })
          done += 1
          if (done === files.length) {
            const arr = Object.entries(sums)
              .map(([date,amount]) => ({ date, amount }))
              .sort((a,b)=>new Date(a.date).getTime() - new Date(b.date).getTime())
            setFileTips(arr)
          }
        },
        
      })
    })
  }

  const uploadTips = () => {
    if (tipFiles.length === 0) return

    // Simulate processing
    setTimeout(() => {
      setTipsUploaded(true)
    //   setCurrentStep(STEPS.PULL_TIMESHEET)
    }, 1000)
  }

  const pullTimesheet = () => {
    // Simulate API call to 7shift
    setTimeout(() => {
      setTimesheetLoaded(true)
      
    }, 1500)
  }

  // const pullEmployeeData = () => {
  //   // Simulate pulling employee data
  //   setTimeout(() => {
  //     setEmployeeDataLoaded(true)
      
  //   }, 1500)
  // }

  const calculateTips = async () => {
    try {
      console.log("Starting tip calculations inside function");
      
      // Use persistedTimesheet instead of timesheet
      const timesheetData = persistedTimesheet;
      
      // Check if timesheet data is available
      if (!timesheetData || timesheetData.length === 0) {
        alert("No timesheet data found. Please ensure timesheet data is loaded in Step 2.");
        throw new Error("Timesheet data missing");
      }
      
      // Define which job titles are eligible for tips
      const tipEligibleTitles = ["Store Manager", "Assistant Store Manager", "Shift Lead", "Barista", "Barista Trainer"];
      
      // Initialize tips accumulator for each employee
      const employeeTipsAccumulator: Record<number, number> = {};
      employees.forEach(emp => {
        employeeTipsAccumulator[emp.id] = 0;
      });
      
      // Process each day's tips separately
      const dailyTipsToProcess = fileTips;
      
      // Track days processed for debugging
      let daysWithDistributedTips = 0;
      
      console.log(`Processing ${dailyTipsToProcess.length} days of tips`);
      
      // For each day with tips
      dailyTipsToProcess.forEach(dayTip => {
        if (dayTip.amount <= 0) {
          return;
        }
        
        // Normalize date format to YYYY-MM-DD for comparison
        let dateFormatted;
        try {
          if (dayTip.date.includes('/')) {
            // Handle MM/DD/YYYY format
            const [month, day, year] = dayTip.date.split('/').map(part => parseInt(part, 10));
            dateFormatted = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          } else {
            // Assume already in YYYY-MM-DD format
            dateFormatted = dayTip.date;
          }
        } catch (e) {
          console.error(`Error formatting date ${dayTip.date}:`, e);
          return; // Skip this day if date formatting fails
        }
        
        console.log(`Processing tips for ${dateFormatted}: $${dayTip.amount}`);
        
        // Find shifts for this day and normalize dates for comparison
        const shiftsForDay = timesheetData.filter(entry => {
          let entryDate;
          try {
            if (entry.date.includes('/')) {
              const [month, day, year] = entry.date.split('/').map(part => parseInt(part, 10));
              entryDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            } else {
              entryDate = entry.date;
            }
            return entryDate === dateFormatted;
          } catch (e) {
            console.error(`Error processing entry date ${entry.date}:`, e);
            return false;
          }
        });
        
        
        // Find eligible employees who worked that day
        const eligibleShifts = shiftsForDay
          .map(shift => {
            const employee = employees.find(emp => emp.gustoId === shift.gustoId);
            return {
              shift,
              employee,
              isEligible: employee && tipEligibleTitles.includes(employee.jobTitle),
              hours: shift.totalHours
            };
          })
          .filter(item => item.isEligible);
        
        
        // If no eligible employees worked that day, skip tip distribution
        if (eligibleShifts.length === 0) {
          console.log(`No eligible employees worked on ${dateFormatted}, skipping`);
          return;
        }
        
        // Calculate total eligible hours for the day
        const totalHoursForDay = eligibleShifts.reduce((sum, item) => sum + item.hours, 0);
        
        if (totalHoursForDay <= 0) {
          console.log(`No eligible hours worked on ${dateFormatted}, skipping tip distribution`);
          return;
        }
        

        console.log("this is the eligibleShifts", eligibleShifts);
        // Distribute tips proportionally based on hours worked
        eligibleShifts.forEach(item => {
          if (!item.employee) return;
          const tipShare = (item.hours / totalHoursForDay) * dayTip.amount;
          employeeTipsAccumulator[item.employee.id] = 
            (employeeTipsAccumulator[item.employee.id] || 0) + tipShare;
        });
        daysWithDistributedTips++;
      });
      

      
      // If no tips were distributed at all, show an alert
      if (daysWithDistributedTips === 0) {
        console.warn("No tips were distributed for any day!");
        alert("No tips were distributed. This may be because no eligible employees were found working on days with tips.");
      }
      
      // Calculate total tips available
      const totalTipsAvailable = fileTips.reduce((sum, d) => sum + d.amount, 0);
      
      // Get employees who should receive tips (have accumulated tips > 0)
      const employeesWithTips = employees.filter(emp => (employeeTipsAccumulator[emp.id] || 0) > 0);
      
      // First pass: round down all tip amounts
      const initialRoundedTips = employeesWithTips.map(emp => ({
        ...emp,
        tips: Math.floor((employeeTipsAccumulator[emp.id] || 0) * 100) / 100
      }));
      
      // Calculate how much we've allocated so far
      const totalAllocatedSoFar = initialRoundedTips.reduce((sum, emp) => sum + emp.tips, 0);
      
      // Calculate the difference (this will be positive, representing leftover cents)
      const roundingDifference = totalTipsAvailable - totalAllocatedSoFar;
      
      // Distribute the leftover cents fairly among all employees
      const centsToDistribute = Math.round(roundingDifference * 100);
      const employeesCount = employeesWithTips.length;
      
      if (centsToDistribute > 0 && employeesCount > 0) {
        // Calculate how many cents each employee should get
        const baseCentsPerEmployee = Math.floor(centsToDistribute / employeesCount);
        const extraCents = centsToDistribute % employeesCount;
        
        // Distribute the extra cents to the first few employees
        initialRoundedTips.forEach((emp, index) => {
          const extraCent = index < extraCents ? 1 : 0;
          emp.tips += (baseCentsPerEmployee + extraCent) / 100;
        });
      }
      
      // Update employees with the fair distribution
      const updatedEmployees = employees.map(emp => {
        const employeeWithTips = initialRoundedTips.find(e => e.id === emp.id);
        if (employeeWithTips) {
          return { ...emp, tips: employeeWithTips.tips };
        } else {
          return { ...emp, tips: 0 };
        }
      });
      
      const totalAllocated = updatedEmployees.reduce((sum, emp) => sum + emp.tips, 0);
      
      // Verify the totals match (should be very close to 0)
      if (Math.abs(totalTipsAvailable - totalAllocated) > 0.01) {
        console.warn("Warning: Tip allocation totals don't match exactly. This may indicate a rounding issue.");
      }
      
      // Update state
      setEmployees(updatedEmployees);
      
      // Store in localStorage as backup
      try {
        localStorage.setItem('employeesWithTips', JSON.stringify(updatedEmployees));
        console.log("Saved employees with tips to localStorage");
      } catch (e) {
        console.error("Failed to save employees to localStorage:", e);
      }
      

      return updatedEmployees; // Return the updated employees for chaining
      
    } catch (error) {
      console.error("Error calculating tips:", error);
      alert("An error occurred during tip calculation. See console for details.");
      throw error; // Re-throw to be caught by outer handler
    }
  };

  const toggleSelectEmployee = (id: number) => {
    setEmployees(employees.map((emp) => (emp.id === id ? { ...emp, selected: !emp.selected } : emp)))
  }

  const toggleSelectAll = () => {
    const allSelected = employees.every((emp) => emp.selected)
    setEmployees(employees.map((emp) => ({ ...emp, selected: !allSelected })))
  }

  const updateEmployeeJobTitle = (id: number, jobTitle: string) => {
    setEmployees(employees.map((emp) => (emp.id === id ? { ...emp, jobTitle, isEditing: false } : emp)))
  }

  // Add a function to toggle break hours editing state
  // const toggleEditBreakHours = (id: number) => {
  //   setEmployees(employees.map((emp) => 
  //     emp.id === id ? { ...emp, isEditingBreak: !emp.isEditingBreak } : emp
  //   ));
  // };

  // Add a function to update break hours
  // const updateBreakHourPay = (id: number, breakHourPay: number) => {
  //   setEmployees(employees.map((emp) => 
  //     emp.id === id ? { ...emp, breakHourPay, isEditingBreak: false } : emp
  //   ));
  // };
  // Find issues for accuracy check
  // const findIssues = () => {
  //   const issues = []

  //   for (const emp of employees) {
  //     // Check for overtime (>8 hours per day)
  //     if (emp.overtimeHours > 0) {
  //       issues.push({
  //         type: "overtime",
  //         employee: emp.name,
  //         description: `${emp.overtimeHours} hours of overtime`,
  //       })
  //     }

  //     // Check for deviation from scheduled hours
  //     if (emp.scheduledHours && Math.abs(emp.regularHours + emp.overtimeHours - emp.scheduledHours) >= 3) {
  //       issues.push({
  //         type: "deviation",
  //         employee: emp.name,
  //         description: `${Math.abs(emp.regularHours + emp.overtimeHours - emp.scheduledHours)} hours deviation from scheduled hours`,
  //       })
  //     }
  //   }

  //   return issues
  // }

  // Find timesheet issues
  const findTimesheetIssues = () => {
    const issues = []

    // Check for missing clock-ins/outs
    const employeesByDay = new Map()

    for (const entry of timesheet) {
      const key = `${entry.gustoId}-${entry.date}`
      if (!employeesByDay.has(key)) {
        employeesByDay.set(key, [])
      }
      employeesByDay.get(key).push(entry)
    }

    // Check for overtime entries
    for (const entry of timesheet) {
      if (entry.isOvertime) {
        issues.push({
          type: "overtime",
          employee: entry.employeeName,
          description: `Overtime on ${formatDate(entry.date)}: ${entry.totalHours} hours`,
        })
      }
    }

    return issues
  }


  const timesheetIssues = findTimesheetIssues()

  const exportSelectedToCSV = () => {
    const selectedEmployees = employees.filter((emp) => emp.selected);
    
    if (selectedEmployees.length === 0) {
      alert("Please select at least one employee to export");
      return;
    }

    function formatMMDDYY(dateString: string) {
      const [year, month, day] = dateString.split('-').map(Number);
      const two = (n: number) => n.toString().padStart(2, '0');
      return `${two(month)}${two(day)}${year.toString().slice(-2)}`;
    }
    
    const start = formatMMDDYY(payPeriod.startDate);
    const end   = formatMMDDYY(payPeriod.endDate);
    
    // Format the data for Gusto import
    const csvData = selectedEmployees.map(emp => ({
      last_name: emp.name.split(' ').slice(1).join(' '), // Assuming format is "First Last"
      first_name: emp.name.split(' ')[0].slice(0,-1),
      gusto_employee_id: emp.gustoId,
      regular_hours: safeToFixed(emp.regularHours, 2),
      overtime_hours: safeToFixed(emp.overtimeHours, 2),
      double_overtime_hours: safeToFixed(emp.doubleOvertimeHours, 2) || "0.00", // May need to add this property
      custom_earning_break_hour_pay: safeToFixed((emp.breakHourPay*emp.hourlyRate), 2) || "0.00", // Added field for break hour penalty
      sick_hours: emp.sickLeaveHours || 0, // Added field for sick leave hours
      paycheck_tips: safeToFixed(emp.tips, 2)
    }));

    // Convert to CSV string
    const header = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(obj => Object.values(obj).join(','));
    const csv = [header, ...rows].join('\n');
    
    // Create downloadable link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Sway_GustoImport_${locationName}(${start}-${end}).csv`);
    document.body.appendChild(link);
    
    // Trigger download and cleanup
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Get step title
  const getStepTitle = (step: number) => {
    switch (step) {
      case STEPS.UPLOAD_TIPS:
        return "Upload tip spreadsheets"
      case STEPS.PULL_TIMESHEET:
        return "Pull timesheet from 7shift"
      case STEPS.PULL_EMPLOYEE_DATA:
        return "Match employees & set job titles"
      case STEPS.CREATE_EXPORT:
        return "Create Gusto export"
      default:
        return "Unknown step"
    }
  }
  // Add a function to handle applying break penalties
  // Add this improved handleApplyBreakPenalty function to your PayPeriodDetail component
  const handleApplyBreakPenalty = (employeeId: number, breakHourPay: number) => {
    console.log(`=== DEBUG: handleApplyBreakPenalty called ===`);
    console.log(`employeeId: ${employeeId}, breakHourPay: ${breakHourPay}`);
    
    // Find the employee
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) {
      console.error(`Employee with ID ${employeeId} not found`);
      return;
    }
    
    // Update the employees array with the new break hour pay
    setEmployees(prevEmployees => {
      const updatedEmployees = prevEmployees.map(emp => {
        if (emp.id === employeeId) {
          return { ...emp, breakHourPay };
        }
        return emp;
      });
      
      // Save to localStorage as backup
      try {
        localStorage.setItem('employeesBackup', JSON.stringify(updatedEmployees));
      } catch (e) {
        console.error("Failed to save employees to localStorage:", e);
      }
      
      return updatedEmployees;
    });
  };

  // Add this function to your PayPeriodDetail component:
  // const applyBreakPenalties = () => {
  //   // Get the queryClient
  //   const queryClient = useQueryClient();
    
  //   // Get stored penalties from React Query cache
  //   const storedPenalties = queryClient.getQueryData<PendingPenalty[]>(['storedBreakPenalties']) || [];
    
  //   if (storedPenalties.length === 0) {
  //     alert("No break penalties found to apply.");
  //     return;
  //   }
    
  //   // Create a map to accumulate penalties by gustoId
  //   const penaltyByGustoId: Record<string, number> = {};
    
  //   // Sum up all applied penalties by gustoId
  //   storedPenalties.forEach(penalty => {
  //     if (penalty.isApplied) {
  //       if (!penaltyByGustoId[penalty.gustoId]) {
  //         penaltyByGustoId[penalty.gustoId] = 0;
  //       }
  //       penaltyByGustoId[penalty.gustoId] += penalty.penaltyHours;
  //     }
  //   });
    
  //   // Only update if we have penalties to apply
  //   if (Object.keys(penaltyByGustoId).length > 0) {
  //     const updatedEmployees = employees.map(emp => {
  //       const penaltyHours = penaltyByGustoId[emp.gustoId] || 0;
  //       return {
  //         ...emp,
  //         breakHourPay: penaltyHours
  //       };
  //     });
      
  //     setEmployees(updatedEmployees);
  //     alert(`Applied break penalties to ${Object.keys(penaltyByGustoId).length} employees.`);
  //   } else {
  //     alert("No applied penalties found. Check the Break Penalties tab to confirm penalties.");
  //   }
  // };

  const handleApplySickLeave = (employeeId: number, sickLeaveHours: number) => {
    console.log(`Applying ${sickLeaveHours} sick leave hours for employee ${employeeId}`);
    
    // Update the employees array with the sick leave hours
    setEmployees(prevEmployees => {
      const updatedEmployees = prevEmployees.map(emp => {
        if (emp.id === employeeId) {
          return {
            ...emp,
            // You can decide how to store sick leave hours in your employee object
            // Option 1: Add a new field
            sickLeaveHours: sickLeaveHours || 0,
            // Option 2: Add to regular hours (depends on your business logic)
            // regularHours: emp.regularHours + sickLeaveHours
          };
        }
        return emp;
      });
      
      // Save to localStorage as backup
      try {
        console.log("Saving employees sick leave to localStorage");
        localStorage.setItem('employeesBackup', JSON.stringify(updatedEmployees));
      } catch (e) {
        console.error("Failed to save employees to localStorage:", e);
      }
      
      return updatedEmployees;
    });
  };

  const { 
    employees: employeeMatches, 
    loading, 
    error, 
    matchEmployees, 
    toggleEditEmployee : toggleEmployeeEdit,
    updateJobTitle 
  } = useEmployeeMatching(persistedTimesheet);
    
  console.log(toggleEmployeeEdit)
  console.log(employeeMatches)

  // Add two separate sorting states
  const { sortConfig: sortConfig, handleSort: handleSort } = useSort('name');

  // Add sorted employees memo that handles both sort configurations
  const sortedEmployees = React.useMemo(() => {
    // Use sortConfig for the main table
    return sortData(employees, sortConfig, (employee: Employee, key: string) => {
      switch (key) {
        case 'name':
        case 'employeeName': // Handle both name formats
          return employee.name;
        case 'gustoId':
          return employee.gustoId;
        case 'jobTitle':
          return employee.jobTitle;
        case 'hourlyRate':
          return employee.hourlyRate;
        case 'regularHours':
          return employee.regularHours;
        case 'overtimeHours':
          return employee.overtimeHours;
        case 'doubleOvertimeHours':
          return employee.doubleOvertimeHours;
        case 'breakHourPay':
          return employee.breakHourPay;
        case 'sickLeaveHours':
          return employee.sickLeaveHours;
        case 'totalHours':
          return employee.regularHours + employee.overtimeHours + employee.doubleOvertimeHours;
        case 'tipEligible':
          const isTipEligible = employee.jobTitle !== "Trainee" && employee.jobTitle !== "New Employee";
          return isTipEligible ? "Yes" : "No";
        case 'tips':
          return employee.tips;
        case 'breakHourPayAmount':
          return employee.breakHourPay * employee.hourlyRate;
        case 'totalPay':
          const regularPay = employee.regularHours * employee.hourlyRate;
          const overtimePay = employee.overtimeHours * employee.hourlyRate * 1.5;
          const doubleOvertimePay = employee.doubleOvertimeHours * employee.hourlyRate * 2;
          return regularPay + overtimePay + doubleOvertimePay + employee.tips + (employee.breakHourPay * employee.hourlyRate) + (employee.sickLeaveHours > 0 ? employee.sickLeaveHours * employee.hourlyRate : 0);
        default:
          return '';
      }
    });
  }, [employees, sortConfig]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{locationName} Pay Period</h2>
            <p className="text-muted-foreground">
              {formatDate(payPeriod.startDate)} - {formatDate(payPeriod.endDate)}
            </p>
          </div>
        </div>

        <Select
          value={currentStep.toString()}
          onValueChange={(value) => {
            const step = Number.parseInt(value)
            // Only allow navigation to steps that are available
            if (step === STEPS.PULL_TIMESHEET && !tipsUploaded) return
            if (step === STEPS.PULL_EMPLOYEE_DATA && !timesheetLoaded) return
            if (step === STEPS.CREATE_EXPORT && !employeeDataLoaded) return
            setCurrentStep(step)
          }}
        >
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select step">
                {getStepTitle(currentStep)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value={STEPS.UPLOAD_TIPS.toString()}>
              <div className="flex items-center gap-2">
                <span>Step 1:</span> Upload tip spreadsheets
                {tipsUploaded && <CheckCircle className="h-3 w-3 text-green-500" />}
              </div>
            </SelectItem>
            <SelectItem value={STEPS.PULL_TIMESHEET.toString()} disabled={!tipsUploaded}>
              <div className="flex items-center gap-2">
                <span>Step 2:</span> Pull timesheet from 7shift
                {timesheetLoaded && <CheckCircle className="h-3 w-3 text-green-500" />}
              </div>
            </SelectItem>
            <SelectItem value={STEPS.PULL_EMPLOYEE_DATA.toString()} disabled={!timesheetLoaded}>
              <div className="flex items-center gap-2">
                <span>Step 3:</span> Match employees & set job titles
                {employeeDataLoaded && <CheckCircle className="h-3 w-3 text-green-500" />}
              </div>
            </SelectItem>
            <SelectItem value={STEPS.CREATE_EXPORT.toString()} disabled={!employeeDataLoaded}>
              <div className="flex items-center gap-2">
                <span>Step 4:</span> Create Gusto export
                {exportReady && <CheckCircle className="h-3 w-3 text-green-500" />}
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>
                Step {currentStep} of 4: {getStepTitle(currentStep)}
              </CardTitle>
              <CardDescription>
                {currentStep === STEPS.UPLOAD_TIPS && "Upload daily tip spreadsheets to begin processing payroll"}
                {currentStep === STEPS.PULL_TIMESHEET && "Pull timesheet data from 7shift for this pay period"}
                {currentStep === STEPS.PULL_EMPLOYEE_DATA && "Match employees and set job titles for tip distribution"}
                {currentStep === STEPS.CREATE_EXPORT && "Review and export payroll data to Gusto"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Progress value={(currentStep / 4) * 100} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Upload Tips</span>
                <span>Pull Timesheet</span>
                <span>Employee Data</span>
                <span>Export</span>
              </div>
            </div>

            {/* Step 1: Upload Tips */}
            {currentStep === STEPS.UPLOAD_TIPS && (
              <div className="space-y-6">
                {!tipsUploaded ? (
                  <div className="space-y-4">
                    <div className="border rounded-lg p-6 flex flex-col items-center justify-center gap-4">
                      <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                      <div className="flex flex-col items-center gap-1 text-center">
                        <p className="text-sm font-medium">Upload daily tip spreadsheets</p>
                        <p className="text-xs text-muted-foreground">Supports CSV and Excel files</p>
                      </div>
                      <Input
                        ref={fileInputRef}
                        id="tip-files"
                        type="file"
                        className="hidden"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleTipFileChange}
                        multiple
                      />
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" />
                        Select Files
                      </Button>
                    </div>
                    

                    {tipFiles.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-3 border rounded-md">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4" />
                            <span className="text-sm">{tipFiles.length} file(s) selected</span>
                          </div>
                          <Button onClick={uploadTips}>Upload</Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {tipFiles.map((file, index) => (
                            <div key={index} className="truncate">
                              {file.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Tip Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fileTips.map((day) => (
                                <TableRow key={day.date}>
                                <TableCell>{formatDate(day.date)}</TableCell>
                                <TableCell className="text-right">
                                    ${safeToFixed(day.amount, 2)}
                                </TableCell>
                                </TableRow>
                            ))}

                            <TableRow>
                                <TableCell className="font-medium">Total</TableCell>
                                <TableCell className="text-right font-medium">
                                $
                                {safeToFixed(
                                    fileTips.length
                                    ? fileTips.reduce((sum, d) => sum + d.amount, 0)
                                    : 0,
                                    2
                                )}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex justify-end">
                      <Button  type="button" onClick={() => setCurrentStep(STEPS.PULL_TIMESHEET)}>Continue to Next Step</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Pull Timesheet */}
            {currentStep === STEPS.PULL_TIMESHEET && (
              <div className="space-y-6">
                {!timesheetLoaded ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Pull Timesheet Data</AlertTitle>
                      <AlertDescription>
                        This will fetch all timesheet data from 7shift for the selected pay period.
                      </AlertDescription>
                    </Alert>
                    <Button onClick={pullTimesheet}>Pull Timesheet Data</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Tabs defaultValue="timesheet-data">
                    <TabsList>
                      <TabsTrigger value="timesheet-data">Timesheet Data</TabsTrigger>
                      <TabsTrigger value="break-penalties">Break Penalties</TabsTrigger>
                      <TabsTrigger value="sick-leave">Sick Leave</TabsTrigger>
                      <TabsTrigger value="timesheet-issues">
                        Issues
                        {timesheetIssues.length > 0 && (
                          <Badge variant="destructive" className="ml-2">
                            {timesheetIssues.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="timesheet-summary">Summary</TabsTrigger>
                    </TabsList>

                      <TabsContent value="timesheet-data" className="space-y-4 mt-4">
                        {/* Replace the existing table with the TimeSheet component */}
                        <TimeSheet 
                          startDate={payPeriod.startDate} 
                          endDate={payPeriod.endDate}
                          locationId={parseInt(locationId)} // Convert string to number and use passed locationId
                          onDataLoaded={(shiftData) => {
                            const newTimesheet = shiftData.map((shift, idx) => ({
                              id: `ts${idx}`,
                              employeeName: shift.user_name,
                              gustoId: shift.employee_id,
                              date: shift.clocked_in_date_pacific,
                              clockIn: shift.clocked_in_pacific,
                              clockOut: shift.clocked_out_pacific,
                              breakDuration: shift.unpaid_break_hours, // Now shows unpaid breaks in hours
                              totalHours: shift.net_worked_hours,
                              isOvertime: shift.overtime_hours > 0 || shift.double_ot_hours > 0,
                              overtime_hours: shift.overtime_hours,
                              double_ot_hours: shift.double_ot_hours,
                              regular_hours: shift.regular_hours
                            }));
                            
                            setTimesheet(newTimesheet);
                            // Set the timesheet as loaded since we have data now
                            setTimesheetLoaded(true);
                            setPersistedTimesheet(newTimesheet);
                          }}
                        />

                        <div className="flex justify-end">
                          <Button onClick={() => setCurrentStep(STEPS.PULL_EMPLOYEE_DATA)}>
                            Continue to Next Step
                          </Button>
                        </div>  
                      </TabsContent>
                      <TabsContent value="break-penalties" className="space-y-4 mt-4">
                        <BreakPenaltiesTab 
                          timesheet={persistedTimesheet}
                          employees={employees}
                          onApplyPenalty={handleApplyBreakPenalty}
                        />
                      </TabsContent>
                      <TabsContent value="sick-leave" className="space-y-4 mt-4">
                        <SickLeaveTab
                          companyId={config.sevenShifts.companyId} // Use configuration
                          locationId={parseInt(locationId)} // You can use the location from props or hardcode it
                          payPeriodStart={payPeriod.startDate}
                          payPeriodEnd={payPeriod.endDate}
                          employees={employees}
                          onApplySickLeave={handleApplySickLeave}
                        />
                      </TabsContent>
                      <TabsContent value="timesheet-issues" className="space-y-4 mt-4">
                        {timesheetIssues.length > 0 ? (
                          <div className="space-y-4">
                            {timesheetIssues.map((issue, index) => (
                              <Alert key={index} variant={issue.type === "overtime" ? "default" : "destructive"}>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>{issue.employee}</AlertTitle>
                                <AlertDescription>{issue.description}</AlertDescription>
                              </Alert>
                            ))}

                            <div className="flex justify-end">
                              <Button onClick={() => setCurrentStep(STEPS.PULL_EMPLOYEE_DATA)}>
                                Continue to Next Step
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                            <h3 className="text-lg font-medium mb-2">No Issues Found</h3>
                            <p className="text-muted-foreground max-w-md mb-4">
                              All timesheet entries look good. No significant issues detected.
                            </p>

                            <Button onClick={() => setCurrentStep(STEPS.PULL_EMPLOYEE_DATA)}>
                              Continue to Next Step
                            </Button>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="timesheet-summary" className="space-y-4 mt-4">
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h3 className="text-sm font-medium mb-2">Timesheet Summary</h3>
                              <div className="space-y-1">
                                <div className="flex justify-between gap-8">
                                  <span className="text-sm">Total Entries:</span>
                                  <span className="text-sm font-medium">{timesheet.length}</span>
                                </div>
                                <div className="flex justify-between gap-8">
                                  <span className="text-sm">Total Employees:</span>
                                  <span className="text-sm font-medium">
                                    {new Set(timesheet.map((entry) => entry.gustoId)).size}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-8">
                                  <span className="text-sm">Total Hours:</span>
                                  <span className="text-sm font-medium">
                                    {safeToFixed(timesheet.reduce((sum, entry) => sum + entry.totalHours, 0), 1)}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-8">
                                  <span className="text-sm">Overtime Hours:</span>
                                  <span className="text-sm font-medium">
                                    {safeToFixed(timesheet
                                      .filter((entry) => entry.overtime_hours > 0 || entry.double_ot_hours > 0)
                                      .reduce((sum, entry) => sum + entry.overtime_hours + entry.double_ot_hours, 0),
                                      2)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div>
                              <h3 className="text-sm font-medium mb-2">Hours by Employee</h3>
                              <div className="space-y-1">
                                {Array.from(new Set(timesheet.map((entry) => entry.gustoId))).map((gustoId) => {
                                  const employeeEntries = timesheet.filter((entry) => entry.gustoId === gustoId)
                                  const employeeName = employeeEntries[0].employeeName
                                  const totalHours = employeeEntries.reduce((sum, entry) => sum + entry.totalHours, 0)

                                  return (
                                    <div key={gustoId} className="flex justify-between gap-8">
                                      <span className="text-sm">{employeeName}:</span>
                                      <span className="text-sm font-medium">{safeToFixed(totalHours, 2)} hrs</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button onClick={() => setCurrentStep(STEPS.PULL_EMPLOYEE_DATA)}>
                            Continue to Next Step
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>
            )}

            

            {/* Step 3: Match Employees & Set Job Titles */}
            {currentStep === STEPS.PULL_EMPLOYEE_DATA && (
              <div className="space-y-6">
                {!employeeDataLoaded ? (
                  <div className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Employee Data</AlertTitle>
                      <AlertDescription>
                        Match employees from timesheet with your records and confirm job titles for tip distribution.
                      </AlertDescription>
                    </Alert>

                    <div className="flex justify-center py-4">
                      <Button 
                        onClick={async () => {
                          try {
                            // Use the hook's matchEmployees function
                            const matchedEmployees = await matchEmployees();
                            console.log("Matched employees before applying penalties:", 
                              matchedEmployees.map((e: Employee) => ({name: e.name, gustoId: e.gustoId})));
                            
                            if (matchedEmployees.length > 0) {
                              const penaltyByGustoId: Record<string, number> = {};
                              
                              console.log("Current pendingBreakPenalties:", pendingBreakPenalties);
                              
                              pendingBreakPenalties.forEach(penalty => {
                                console.log(`Processing penalty for ${penalty.gustoId}: ${penalty.penaltyHours} hours, isApplied: ${penalty.isApplied}`);
                                if (penalty.isApplied) {
                                  if (!penaltyByGustoId[penalty.gustoId]) {
                                    penaltyByGustoId[penalty.gustoId] = 0;
                                  }
                                  penaltyByGustoId[penalty.gustoId] += penalty.penaltyHours;
                                }
                              });
                        
                              console.log("Calculated penaltyByGustoId:", penaltyByGustoId);
                              
                              // Map new employees with penalties
                              const employeesWithPenalties = matchedEmployees.map((emp: Employee) => {
                                const breakHourPay = penaltyByGustoId[emp.gustoId] || 0;
                                console.log(`Setting breakHourPay for ${emp.name} (${emp.gustoId}): ${breakHourPay}`);
                                return {
                                  ...emp,
                                  tips: 0,
                                  breakHourPay,
                                  scheduledHours: emp.regularHours + emp.overtimeHours
                                };
                              });
                              
                              console.log("Employees with penalties applied:", 
                                employeesWithPenalties.map((e: Employee) => ({
                                  name: e.name, 
                                  gustoId: e.gustoId, 
                                  breakHourPay: e.breakHourPay
                                })));
                                
                              setEmployees(employeesWithPenalties);
                              setEmployeeDataLoaded(true);
                            }
                          } catch (error) {
                            console.error("Error matching employees:", error);
                          }
                        }}
                        disabled={!timesheetLoaded || loading}
                      >
                        {loading ? (
                          <>
                            <span className="mr-2">Matching...</span>
                            <span className="animate-spin">⏳</span>  
                          </>
                        ) : (
                          "Match Employees"
                        )}
                      </Button>
                    </div>
                    
                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-end mb-2">
                      <Button 
                        variant="outline"
                        onClick={async () => {
                          try {

                            // Use the hook's matchEmployees function
                            const matchedEmployees = await matchEmployees();
                            if (matchedEmployees.length > 0) {
                              // Preserve tips values from existing employees if possible
                              
                              const updatedEmployees = matchedEmployees.map((newEmp: Employee) => {
                                const existingEmp = employees.find(emp => emp.gustoId === newEmp.gustoId);
                                return {
                                  ...newEmp,
                                  tips: existingEmp?.tips || 0,
                                  breakHourPay: 0,
                                  scheduledHours: newEmp.regularHours + newEmp.overtimeHours
                                };
                              });
                              setEmployees(updatedEmployees);
                            }
                          } catch (error) {
                            console.error("Error rematching employees:", error);
                          } 
                        }}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="mr-2">Rematching...</span>
                            <span className="animate-spin">⏳</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Rematch Employees
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">
                              <Checkbox
                                checked={employees.every((emp) => emp.selected)}
                                onCheckedChange={toggleSelectAll}
                                aria-label="Select all employees"
                              />
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-200"
                              onClick={() => handleSort('name')}
                            >
                              <div className="flex items-center">
                                Employee
                                {sortConfig.key === 'name' && (
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
                              onClick={() => handleSort('jobTitle')}
                            >
                              <div className="flex items-center">
                                Job Title
                                {sortConfig.key === 'jobTitle' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-200 text-right"
                              onClick={() => handleSort('hourlyRate')}
                            >
                              <div className="flex items-center justify-end">
                                Hourly Rate
                                {sortConfig.key === 'hourlyRate' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-200 text-right"
                              onClick={() => handleSort('regularHours')}
                            >
                              <div className="flex items-center justify-end">
                                Regular Hours
                                {sortConfig.key === 'regularHours' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-200 text-right"
                              onClick={() => handleSort('overtimeHours')}
                            >
                              <div className="flex items-center justify-end">
                                Overtime Hours
                                {sortConfig.key === 'overtimeHours' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-200 text-right"
                              onClick={() => handleSort('doubleOvertimeHours')}
                            >
                              <div className="flex items-center justify-end">
                                Double Overtime Hours
                                {sortConfig.key === 'doubleOvertimeHours' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-200 text-right"
                              onClick={() => handleSort('breakHourPay')}
                            >
                              <div className="flex items-center justify-end">
                                Break Hour
                                {sortConfig.key === 'breakHourPay' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-200 text-right"
                              onClick={() => handleSort('sickLeaveHours')}
                            >
                              <div className="flex items-center justify-end">
                                Sick Leave Hours
                                {sortConfig.key === 'sickLeaveHours' && (
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
                              onClick={() => handleSort('tipEligible')}
                            >
                              <div className="flex items-center justify-end">
                                Tip Eligible
                                {sortConfig.key === 'tipEligible' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-200 text-right"
                              onClick={() => handleSort('tips')}
                            >
                              <div className="flex items-center justify-end">
                                Tips
                                {sortConfig.key === 'tips' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-200 text-right"
                              onClick={() => handleSort('breakHourPayAmount')}
                            >
                              <div className="flex items-center justify-end">
                                Break Hour Pay
                                {sortConfig.key === 'breakHourPayAmount' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-200 text-right"
                              onClick={() => handleSort('totalPay')}
                            >
                              <div className="flex items-center justify-end">
                                Total Pay
                                {sortConfig.key === 'totalPay' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}
                              </div>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedEmployees.map((employee) => {
                            const isTipEligible = employee.jobTitle !== "Trainee" && employee.jobTitle !== "New Employee";
                            const totalPay = calculateTotalPay(employee);
                            
                            return (
                              <TableRow key={employee.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={employee.selected}
                                    onCheckedChange={() => toggleSelectEmployee(employee.id)}
                                    aria-label={`Select ${employee.name}`}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">{employee.name}</TableCell>
                                <TableCell>{employee.gustoId}</TableCell>
                                <TableCell>
                                  {employee.isEditing ? (
                                    <Select
                                      defaultValue={employee.jobTitle}
                                      onValueChange={(value) => {
                                        // Use the hook's updateJobTitle function
                                        updateJobTitle(employee.id.toString(), value);
                                        // Also update our local state to maintain compatibility
                                        updateEmployeeJobTitle(employee.id, value);
                                      }}
                                    >
                                      <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Select job title">
                                          {employee.jobTitle}
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent position="popper">
                                        {JOB_TITLES.map((title) => (
                                          <SelectItem key={title} value={title}>
                                            {title}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <span>{employee.jobTitle}</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">{safeToFixed(employee.hourlyRate, 2)}</TableCell>
                                <TableCell className="text-right">{safeToFixed(employee.regularHours, 2)}</TableCell>
                                <TableCell className="text-right">{safeToFixed(employee.overtimeHours, 2)}</TableCell>
                                <TableCell className="text-right">{safeToFixed(employee.doubleOvertimeHours, 2)}</TableCell>
                                <TableCell className="text-right">
                                  {employee.breakHourPay > 0 ? (
                                    <div>
                                      <span className="font-medium">{safeToFixed(employee.breakHourPay, 2)}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end">
                                      0.00
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {employee.sickLeaveHours > 0 ? (
                                    <div>
                                      <span className="font-medium">{safeToFixed(employee.sickLeaveHours, 2)}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end">
                                      0.00
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">{safeToFixed((employee.regularHours + employee.overtimeHours + employee.doubleOvertimeHours), 2)}</TableCell>
                                <TableCell className="text-right">
                                  <Badge variant={isTipEligible ? "default" : "outline"}>
                                    {isTipEligible ? "Yes" : "No"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">${safeToFixed(employee.tips, 2)}</TableCell>
                                <TableCell className="text-right">${safeToFixed((employee.breakHourPay * employee.hourlyRate), 2)}</TableCell>
                                <TableCell className="text-right font-medium">${safeToFixed(totalPay, 2)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            localStorage.setItem('employeesBackup', JSON.stringify(employees));
                            // Call calculateTips and wait for it to complete
                            await calculateTips();
                            setExportReady(true);
                            setCurrentStep(STEPS.CREATE_EXPORT);
                          } catch (error) {
                            console.error("❌ Error in main try/catch:", error);
                            if (error instanceof Error) {
                              alert("Error calculating tips: " + error.message);
                            } else {
                              alert("Unknown error calculating tips.");
                            }
                          }
                        }}
                      >
                        Calculate Tip Distribution
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Create Gusto Export */}
            {currentStep === STEPS.CREATE_EXPORT && (
              <div className="space-y-6">
                {employeeDataLoaded && (
                  
                  <div className="space-y-4">
                    {/* Tip Allocation Section */}
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h3 className="text-lg font-medium mb-2">Tip Allocation</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Tips are allocated proportionally based on hours worked. Only eligible employees (non-Trainee positions) receive tips.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium">Total Tips: ${fileTips.length > 0 
                          ? safeToFixed(fileTips.reduce((sum, d) => sum + d.amount, 0), 2) 
                          : "0.00"}</div>
                          <div className="text-sm mt-1">
                            {fileTips.length > 0 ? `From ${fileTips.length} daily tip entries` : "No daily tips uploaded"}
                          </div>
                        </div>
                        <div className="flex justify-end">
                        <Button 
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              localStorage.setItem('employeesBackup', JSON.stringify(employees));
                              // Call calculateTips and wait for it to complete
                              await calculateTips();
                              setExportReady(true);
                              setCurrentStep(STEPS.CREATE_EXPORT);
                            } catch (error) {
                              console.error("❌ Error in main try/catch:", error);
                              if (error instanceof Error) {
                                alert("Error calculating tips: " + error.message);
                              } else {
                                alert("Unknown error calculating tips.");
                              }
                            }
                          }}
                        >
                          Calculate Tip Distribution
                        </Button>
                        </div>
                      </div>
                    </div>
                    
                    
                    <div className="p-4 bg-amber-50 rounded-lg mb-4">
                      <h3 className="text-lg font-medium mb-2">Break Hour Penalties</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Break hour penalties are applied when employees don't take adequate breaks.
                        These penalties are stored and applied across sessions.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="text-sm mt-1">
                            Current Break Penalties: ${safeToFixed(employees.reduce((sum, emp) => sum + (emp.breakHourPay || 0), 0), 2)}
                          </div>
                        <div className="flex justify-end gap-2">
                          <Button 
                            type="button"
                            onClick={() => {
                              // Navigate back to the timesheet tab to review break penalties
                              setCurrentStep(STEPS.PULL_TIMESHEET);
                              
                              // Use setTimeout to ensure the step change is processed before trying to set the tab
                              setTimeout(() => {
                                // Select the break penalties tab programmatically
                                const breakPenaltiesTab = document.querySelector('[value="break-penalties"]');
                                if (breakPenaltiesTab && breakPenaltiesTab instanceof HTMLElement) {
                                  breakPenaltiesTab.click();
                                }
                              }, 100);
                            }} 
                            variant="outline"
                            className="text-amber-600 border-amber-300 hover:bg-amber-50"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Review Break Penalties
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">
                              <Checkbox
                                checked={employees.every((emp) => emp.selected)}
                                onCheckedChange={toggleSelectAll}
                                aria-label="Select all employees"
                              />
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-gray-200" onClick={() => handleSort('name')}>Employee{sortConfig.key === 'name' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}</TableHead>
                            <TableHead className="cursor-pointer hover:bg-gray-200" onClick={() => handleSort('gustoId')}>Gusto ID{sortConfig.key === 'gustoId' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}</TableHead>
                            <TableHead className="cursor-pointer hover:bg-gray-200" onClick={() => handleSort('jobTitle')}>Job Title{sortConfig.key === 'jobTitle' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}</TableHead>
                            <TableHead className="cursor-pointer hover:bg-gray-200 text-right" onClick={() => handleSort('hourlyRate')}>Hourly Rate{sortConfig.key === 'hourlyRate' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}</TableHead>
                            <TableHead className="cursor-pointer hover:bg-gray-200 text-right" onClick={() => handleSort('regularHours')}>Regular Hours{sortConfig.key === 'regularHours' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}</TableHead>
                            <TableHead className="cursor-pointer hover:bg-gray-200 text-right" onClick={() => handleSort('overtimeHours')}>Overtime Hours{sortConfig.key === 'overtimeHours' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}</TableHead>
                            <TableHead className="cursor-pointer hover:bg-gray-200 text-right" onClick={() => handleSort('doubleOvertimeHours')}>Double Overtime Hours{sortConfig.key === 'doubleOvertimeHours' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}</TableHead>
                            <TableHead className="cursor-pointer hover:bg-gray-200 text-right" onClick={() => handleSort('breakHourPay')}>Break Hour{sortConfig.key === 'breakHourPay' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}</TableHead>
                            <TableHead className="cursor-pointer hover:bg-gray-200 text-right" onClick={() => handleSort('sickLeaveHours')}>Sick Leave Hours{sortConfig.key === 'sickLeaveHours' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}</TableHead>
                            <TableHead className="cursor-pointer hover:bg-gray-200 text-right" onClick={() => handleSort('totalHours')}>Total Hours{sortConfig.key === 'totalHours' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}</TableHead>
                            <TableHead className="cursor-pointer hover:bg-gray-200 text-right" onClick={() => handleSort('tipEligible')}>Tip Eligible{sortConfig.key === 'tipEligible' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}</TableHead>
                            <TableHead className="cursor-pointer hover:bg-gray-200 text-right" onClick={() => handleSort('tips')}>Tips{sortConfig.key === 'tips' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}</TableHead>
                            <TableHead className="cursor-pointer hover:bg-gray-200 text-right" onClick={() => handleSort('breakHourPayAmount')}>Break Hour Pay{sortConfig.key === 'breakHourPayAmount' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}</TableHead>
                            <TableHead className="cursor-pointer hover:bg-gray-200 text-right" onClick={() => handleSort('totalPay')}>Total Pay{sortConfig.key === 'totalPay' && (
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                )}</TableHead>
                            
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedEmployees.map((employee) => {
                            const hourlyRate = employee.hourlyRate;
                            const regularPay = employee.regularHours * employee.hourlyRate;
                            const overtimePay = employee.overtimeHours * employee.hourlyRate * 1.5;
                            const doubleOvertimePay = employee.doubleOvertimeHours * employee.hourlyRate * 2;
                            const totalPay = regularPay + overtimePay + doubleOvertimePay + employee.tips + (employee.breakHourPay * employee.hourlyRate) + (employee.sickLeaveHours > 0 ? employee.sickLeaveHours * employee.hourlyRate : 0);
                            const isTipEligible = employee.jobTitle !== "Trainee" && employee.jobTitle !== "New Employee";

                            return (
                              <TableRow key={employee.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={employee.selected}
                                    onCheckedChange={() => toggleSelectEmployee(employee.id)}
                                    aria-label={`Select ${employee.name}`}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">{employee.name}</TableCell>
                                <TableCell>{employee.gustoId}</TableCell>
                                <TableCell>{employee.jobTitle}</TableCell>
                                <TableCell className="text-right">{safeToFixed(hourlyRate, 2)}</TableCell>
                                <TableCell className="text-right">{safeToFixed(employee.regularHours, 2)}</TableCell>
                                <TableCell className="text-right">{safeToFixed(employee.overtimeHours, 2)}</TableCell>
                                <TableCell className="text-right">{safeToFixed(employee.doubleOvertimeHours, 2)}</TableCell>
                                <TableCell className="text-right">
                                  {employee.breakHourPay > 0 ? (
                                    <div>
                                      <span className="font-medium">{safeToFixed(employee.breakHourPay, 2)}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end">
                                      0.00
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {employee.sickLeaveHours > 0 ? (
                                    <div>
                                      <span className="font-medium">{safeToFixed(employee.sickLeaveHours, 2)}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end">
                                      0.00
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">{safeToFixed((employee.regularHours + employee.overtimeHours + employee.doubleOvertimeHours), 2)}</TableCell>
                                <TableCell className="text-right">
                                  <Badge variant={isTipEligible ? "default" : "outline"}>
                                    {isTipEligible ? "Yes" : "No"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {isTipEligible ? `$${safeToFixed(employee.tips, 2)}` : "Not eligible"}
                                </TableCell>
                                <TableCell className="text-right">${safeToFixed((employee.breakHourPay * employee.hourlyRate), 2)}</TableCell>
                                <TableCell className="text-right">${safeToFixed(totalPay, 2)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-medium">Payroll Summary</h3>
                          <p className="text-sm text-muted-foreground">
                            {locationName} • {formatDate(payPeriod.startDate)} - {formatDate(payPeriod.endDate)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between gap-8">
                            <span className="text-sm">Total Regular Hours:</span>
                            <span className="text-sm font-medium">
                              {safeToFixed(employees.filter(emp => emp.selected).reduce((sum, emp) => sum + emp.regularHours, 0), 2)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-8">
                            <span className="text-sm">Total Overtime Hours:</span>
                            <span className="text-sm font-medium">
                              {safeToFixed(employees.filter(emp => emp.selected).reduce((sum, emp) => sum + emp.overtimeHours, 0), 2)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-8">
                            <span className="text-sm">Total Double Overtime Hours:</span>
                            <span className="text-sm font-medium">
                              {safeToFixed(employees.filter(emp => emp.selected).reduce((sum, emp) => sum + emp.doubleOvertimeHours, 0), 2)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-8">
                            <span className="text-sm">Total Tips:</span>
                            <span className="text-sm font-medium">${fileTips.length > 0 
                            ? safeToFixed(fileTips.reduce((sum, d) => sum + d.amount, 0), 2) 
                            : "0.00"}</span>
                          </div>
                          <div className="flex justify-between gap-8">
                            <span className="text-sm">Allocated Tips:</span>
                                                          <span className="text-sm font-medium">
                                ${safeToFixed(employees.filter(emp => emp.selected).reduce((sum, emp) => sum + emp.tips, 0), 2)}
                              </span>
                          </div>
                          <div className="flex justify-between gap-8">
                            <span className="text-sm">Total Gross Pay:</span>
                                                          <span className="text-sm font-medium">
                                $
                                {safeToFixed(employees
                                  .filter(emp => emp.selected)
                                  .reduce((sum, emp) => {
                                    const regularPay = emp.regularHours * emp.hourlyRate;
                                    const overtimePay = emp.overtimeHours * emp.hourlyRate * 1.5;
                                    const doubleOvertimePay = emp.doubleOvertimeHours * emp.hourlyRate * 2;
                                    const sickLeavePay = emp.sickLeaveHours > 0 ? emp.sickLeaveHours * emp.hourlyRate : 0;
                                    const breakHourPay = emp.breakHourPay > 0 ? emp.breakHourPay * emp.hourlyRate : 0;
                                    return sum + regularPay + overtimePay + doubleOvertimePay + emp.tips + breakHourPay + sickLeavePay;
                                  }, 0), 2)}
                              </span>
                          </div>
                          <div className="flex justify-between gap-8">
                            <span className="text-sm">Total Break Penalties Hours:</span>
                                                          <span className="text-sm font-medium">
                                {safeToFixed(employees.filter(emp => emp.selected).reduce((sum, emp) => sum + (emp.breakHourPay || 0), 0), 2)}
                              </span>
                          </div>
                          <div className="flex justify-between gap-8">
                            <span className="text-sm">Total Sick Leave Hours:</span>
                                                          <span className="text-sm font-medium">
                                {safeToFixed(employees.filter(emp => emp.selected).reduce((sum, emp) => sum + (emp.sickLeaveHours || 0), 0), 2)}
                              </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={exportSelectedToCSV}>
                        <Download className="mr-2 h-4 w-4" />
                        Export Selected to CSV
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
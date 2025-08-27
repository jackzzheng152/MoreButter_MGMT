// features/payroll-processing/hooks/useEmployeeData.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { TimePunch } from "../types/timePunch";
import { useState } from 'react';
import { matchEmployeesWithTimesheet, updateEmployeeJobTitle } from '../api/employeeAPI';


// Type definitions
export interface Employee {
    id: string;
    name: string;
    jobTitle: string;
    gustoId: string;
    regularHours: number;
    overtimeHours: number;
    hourlyRate: number;
    selected: boolean;
    isEditing: boolean;
    doubleOvertimeHours: number;
    breakHourPay: number;
    isEditingBreak: boolean;
  }

interface TimesheetEntry {
    id: string;
    employeeName: string;
    gustoId: string;
    date: string;
    clockIn: string;
    clockOut: string;
    breakDuration: number;
    totalHours: number;
    isOvertime: boolean;
    regular_hours: number;
    overtime_hours: number;
    double_ot_hours: number;
  }

export interface UpdateEmployeeTitleParams {
  employeeId: string;
  jobTitle: string;
}

// Hook to match employees from timesheet data
export const useMatchEmployees = (timeShiftData: TimePunch[]) => {
  return useQuery({

    queryKey: ["matched-employees", timeShiftData.map(t => t.user_id).join(',')],
    queryFn: async () => {
      // Extract unique user IDs from the timesheet data
      const userIds = [...new Set(timeShiftData.map(t => t.user_id))];
      
      if (userIds.length === 0) {
        return [];
      }
      
      const res = await api.post("/employees/match", {
        user_ids: userIds
      });
      return res.data;
    },
    enabled: timeShiftData.length > 0
  });
};

// Hook to fetch job titles
export const useJobTitles = () => {
  return useQuery({
    queryKey: ["job-titles"],
    queryFn: async () => {
      const res = await api.get("/employees/job-titles?department_id=1");
      return res.data;
    }
  });
};

// Hook to update an employee's job title
export const useUpdateEmployeeJobTitle = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ employeeId, jobTitle }: UpdateEmployeeTitleParams) => {
      const res = await api.patch(`/employees/${employeeId}`, {
        job_title: jobTitle
      });
      return res.data;
    },
    onSuccess: () => {
      // Invalidate the employees query to refetch data after an update
      queryClient.invalidateQueries({ queryKey: ["matched-employees"] });
    }
  });
};

export const useEmployeeMatching = (timesheet: TimesheetEntry[]) => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
  

    const matchEmployees = async () => {
      
      try {
        
        setLoading(true);
        setError(null);

        // Extract unique user IDs from timesheet

        const userIds = [...new Set(timesheet.map(entry => entry.gustoId))];
        // Call the API
        const matchedEmployeesData = await matchEmployeesWithTimesheet(userIds);
        // Transform the response into the format your component expects
        const matchedEmployees = matchedEmployeesData.map((emp: Employee) => ({
          id: emp.id,
          name: emp.name,
          jobTitle: emp.jobTitle,
          gustoId: emp.gustoId,
          // For regularHours - directly use the regular_hours field
          regularHours: timesheet
          .filter(t => t.gustoId === emp.gustoId)
          .reduce((sum, t) => sum + t.regular_hours, 0),
          overtimeHours: timesheet
          .filter(t => t.gustoId === emp.gustoId)
          .reduce((sum, t) => sum + t.overtime_hours, 0),
          doubleOvertimeHours: timesheet
          .filter(t => t.gustoId === emp.gustoId)
          .reduce((sum, t) => sum + t.double_ot_hours, 0),
          hourlyRate: emp.hourlyRate, // Default rate
          selected: true,
          isEditing: false
        }));
        
        setEmployees(matchedEmployees);
        return matchedEmployees;
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred matching employees");
        return [];
      } finally {
        setLoading(false);
      }
    };
  
    const toggleEditEmployee = (id: string) => {
      setEmployees(employees.map(emp => 
        emp.id === id ? { ...emp, isEditing: !emp.isEditing } : emp
      ));
    };
  
    const updateJobTitle = async (id: string, jobTitle: string) => {
      try {
        await updateEmployeeJobTitle(id, jobTitle);
        setEmployees(employees.map(emp => 
          emp.id === id ? { ...emp, jobTitle, isEditing: false } : emp
        ));
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred updating job title");
      }
    };
  
    return {
      employees,
      loading,
      error,
      matchEmployees,
      toggleEditEmployee,
      updateJobTitle
    };
  };
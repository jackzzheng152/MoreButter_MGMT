// src/features/employee update/hooks/useEmployees.ts
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

export type Employee = {
  employee_id: number;
  email: string;
  bamboo_hr_id: string;
  first_name: string;
  last_name: string;
  id: number;
  // Add other employee fields as needed
};

export const useEmployees = () => 
  useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await api.get("/employees");
      return res.data as Employee[];
    },
  });

// Get an employee by ID
export const useEmployee = (employeeId: number | null) => 
  useQuery({
    queryKey: ["employee", employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      const res = await api.get(`/employees/${employeeId}`);
      return res.data as Employee;
    },
    enabled: !!employeeId,
  });
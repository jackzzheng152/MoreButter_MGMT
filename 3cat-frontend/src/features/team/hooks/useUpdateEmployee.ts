// src/hooks/useUpdateEmployee.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateEmployee } from "../api/employeeApi";
import { EmployeeUpdate } from "../types/employee";

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employee_id,
      data,
    }: {
      employee_id: number;
      data: EmployeeUpdate;
    }) => {
      return updateEmployee(employee_id, data).then((res) => res.data);
    },
    onSuccess: (variables) => {
      // Invalidate and refetch employees data
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      
      // Optionally, you can also update the cache optimistically
      // This provides immediate UI feedback before the refetch completes
      queryClient.setQueryData(["employees"], (oldData: any) => {
        if (!oldData) return oldData;
        
        return oldData.map((employee: any) => 
          employee.id === variables.employee_id 
            ? { ...employee, ...variables.data }
            : employee
        );
      });
    },
    onError: (error) => {
      console.error("Failed to update employee:", error);
    },
  });
}
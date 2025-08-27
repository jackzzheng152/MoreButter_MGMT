// src/hooks/useCompensation.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";



// Define types based on the actual API response
export type CompensationChange = {
  id: number;
  employee_id: number;
  new_compensation: number;
  effective_date: string;
  reason: string;
  title_id: number;
  created_at: string;
  processed: boolean;
  submission_id: string | null;
  form_id: string | null;
  event_id: string | null;
  submitter_name: string | null;
  submitter_code: string | null;
  review_status: "pending" | "approved" | "denied";
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  location_id: string | null;
  location_name: string | null;
  position_id: string | null;
  position_name: string | null;
  status_id: string | null;
  status_name: string | null;
};

// Fetch all pending compensation changes
export const usePendingCompensations = () => 
  useQuery({
    queryKey: ["compensation", "pending"],
    queryFn: async () => {
      const res = await api.get("/tally/compensation/pending");
      return res.data as CompensationChange[];
    },
  });

// Fetch a specific compensation change
export const useCompensationDetails = (changeId: string | number | null) => 
  useQuery({
    queryKey: ["compensation", changeId],
    queryFn: async () => {
      if (!changeId) return null;
      const res = await api.get(`/tally/compensation/pending/${changeId}`);
      return res.data as CompensationChange;
    },
    enabled: !!changeId, // Only fetch when we have a changeId
  });

// Update the hook to accept reviewer information
export const useApproveCompensation = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
      mutationFn: async ({ changeId, reviewer }: { changeId: string | number, reviewer: string }) => {
        const res = await api.post(`/tally/compensation/pending/${changeId}/approve`, {
          reviewer: reviewer
        });
        return res.data;
      },
      onSuccess: () => {
        // Invalidate relevant queries to refetch data
        queryClient.invalidateQueries({ queryKey: ["compensation", "pending"] });
      },
    });
  };

export const useDenyCompensation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      changeId, 
      notes, 
      reviewer 
    }: { 
      changeId: string | number, 
      notes: string,
      reviewer: string 
    }) => {
      const res = await api.post(`/tally/compensation/pending/${changeId}/deny`, { 
        notes: notes,
        reviewer: reviewer 
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compensation", "pending"] });
    },
  });
};

// Process all approved compensation changes
export const useProcessApprovedCompensations = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const res = await api.post(`/tally/compensation/pending/process`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compensation", "pending"] });
    },
  });
};

// Fetch compensation logs for a specific employee
export const useEmployeeCompensationLogs = (employeeId: string | number | null) => 
  useQuery({
    queryKey: ["compensation", "logs", employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      const res = await api.get(`/compensation/logs/employee/${employeeId}`);
      return res.data;
    },
    enabled: !!employeeId,
  });
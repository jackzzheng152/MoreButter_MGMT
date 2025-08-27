import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";

// Fetch all pending compensation changes
export const usePendingCompensationList = () => 
  useQuery({
    queryKey: ["pending-compensation"],
    queryFn: async () => {
      const res = await api.get("/tally/compensation/pending");
      return res.data;
    },
  });

// Fetch details of a specific pending compensation change
export const usePendingCompensationDetails = (changeId: string | number | null) => 
  useQuery({
    queryKey: ["pending-compensation", changeId],
    queryFn: async () => {
      if (!changeId) return null;
      const res = await api.get(`/tally/compensation/pending/${changeId}`);
      return res.data;
    },
    enabled: !!changeId, // Only run the query if changeId exists
  });

// Approve a pending compensation change
export const useApproveCompensation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (changeId: string | number) => {
      const res = await api.post(`/tally/compensation/pending/${changeId}/approve`);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["pending-compensation"] });
    },
  });
};

// Deny a pending compensation change
export const useDenyCompensation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ changeId, reason }: { changeId: string | number, reason?: string }) => {
      const res = await api.post(`/tally/compensation/pending/${changeId}/deny`, { reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-compensation"] });
    },
  });
};

// Process all approved compensation changes
export const useProcessApprovedCompensation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const res = await api.post(`/tally/compensation/pending/process`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-compensation"] });
    },
  });
};

// Process Tally webhook (if you need to trigger this manually)
export const useProcessTallyWebhook = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (webhookData: any) => {
      const res = await api.post(`/tally/webhooks/tally/compensation`, webhookData);
      return res.data;
    },
    onSuccess: () => {
      // You might want to invalidate multiple queries here
      queryClient.invalidateQueries({ queryKey: ["pending-compensation"] });
    },
  });
};
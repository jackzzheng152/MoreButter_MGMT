// src/hooks/useFormSubmissions.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";

// Types from your existing component
export type FormField = {
  key: string;
  label: string;
  type: string;
  value: string | string[];
  options?: { id: string; text: string }[];
};

export type FormSubmission = {
  responseId: string;
  submissionId: string;
  respondentId: string;
  formId: string;
  formName: string;
  createdAt: string;
  fields: FormField[];
  status: "pending" | "approved" | "denied";
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
};

// Fetch all form submissions
export const useFormSubmissions = () => 
  useQuery({
    queryKey: ["form-submissions"],
    queryFn: async () => {
      const res = await api.get("/tally/compensation/pending");
      return res.data as FormSubmission[];
    },
  });

// Fetch a specific form submission
export const useFormSubmissionDetails = (submissionId: string | null) => 
  useQuery({
    queryKey: ["form-submission", submissionId],
    queryFn: async () => {
      if (!submissionId) return null;
      const res = await api.get(`/tally/compensation/pending/${submissionId}`);
      return res.data as FormSubmission;
    },
    enabled: !!submissionId, // Only fetch when we have a submissionId
  });

// Approve a form submission
export const useApproveFormSubmission = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (submissionId: string) => {
      const res = await api.post(`/tally/compensation/pending/${submissionId}/approve`);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["form-submissions"] });
    },
  });
};

// Deny a form submission
export const useDenyFormSubmission = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ submissionId, notes }: { submissionId: string, notes: string }) => {
      const res = await api.post(`/tally/compensation/pending/${submissionId}/deny`, { notes });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-submissions"] });
    },
  });
};

// Process all approved submissions
export const useProcessApprovedSubmissions = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const res = await api.post(`/tally/compensation/pending/process`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-submissions"] });
    },
  });
};
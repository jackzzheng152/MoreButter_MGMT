import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface FormField {
  label: string
  value: string | string[]
  type: string
  options?: Array<{ id: string; text: string }>
}

export interface FormSubmission {
  submissionId: string
  formId: string
  formName: string
  status: 'pending' | 'approved' | 'denied'
  fields: FormField[]
  createdAt: string
  reviewedBy?: string
  reviewedAt?: string
  reviewNotes?: string
}

export function useFormSubmissions() {
  return useQuery<FormSubmission[]>({
    queryKey: ['formSubmissions'],
    queryFn: async () => {
      const response = await fetch('/api/compensation/pending')
      if (!response.ok) throw new Error('Failed to fetch submissions')
      return response.json()
    }
  })
}

export function useApproveFormSubmission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (submissionId: string) => {
      const response = await fetch(`/api/compensation/pending/${submissionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewer: 'Current User' })
      })
      if (!response.ok) throw new Error('Failed to approve submission')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formSubmissions'] })
    }
  })
}

export function useDenyFormSubmission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ submissionId, notes }: { submissionId: string; notes: string }) => {
      const response = await fetch(`/api/compensation/pending/${submissionId}/deny`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewer: 'Current User', notes })
      })
      if (!response.ok) throw new Error('Failed to deny submission')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formSubmissions'] })
    }
  })
} 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface CompensationChange {
  id: number
  employee_id: number
  form_id?: string
  submission_id?: string
  submitter_name?: string
  new_compensation: number
  effective_date: string
  position_name?: string
  location_name?: string
  reason?: string
  review_status: 'pending' | 'approved' | 'denied'
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
  processed: boolean
  created_at: string
}

export function usePendingCompensations() {
  return useQuery<CompensationChange[]>({
    queryKey: ['compensationChanges'],
    queryFn: async () => {
      const response = await fetch('/api/compensation/pending')
      if (!response.ok) throw new Error('Failed to fetch compensation changes')
      return response.json()
    }
  })
}

export function useApproveCompensation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (changeId: number) => {
      const response = await fetch(`/api/compensation/pending/${changeId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewer: 'Current User' })
      })
      if (!response.ok) throw new Error('Failed to approve compensation change')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensationChanges'] })
    }
  })
}

export function useDenyCompensation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ changeId, notes }: { changeId: number; notes: string }) => {
      const response = await fetch(`/api/compensation/pending/${changeId}/deny`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewer: 'Current User', notes })
      })
      if (!response.ok) throw new Error('Failed to deny compensation change')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensationChanges'] })
    }
  })
} 
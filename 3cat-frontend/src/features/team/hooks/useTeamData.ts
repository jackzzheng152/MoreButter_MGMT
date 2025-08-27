// src/hooks/useTeamData.ts
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import api from "@/lib/axios";
import { EmployeeApiResponse, EmployeeWithUIFields, JobTitle, Location } from "../types/employee";

// Hook to fetch raw employees data
export const useEmployees = () =>
  useQuery<EmployeeApiResponse[]>({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await api.get("/employees");
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

// Hook to fetch job titles
export const useJobTitles = () =>
  useQuery<JobTitle[]>({
    queryKey: ["job-titles"],
    queryFn: async () => {
      const res = await api.get("/employees/job-titles?department_id=1");
      return res.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (job titles change less frequently)
    retry: 3,
  });

// Hook to fetch locations
export const useLocations = () =>
  useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await api.get("/employees/locations");
      return res.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (locations change less frequently)
    retry: 3,
  });

// Helper function to transform API data to UI data
export const transformEmployeeData = (
  employees: EmployeeApiResponse[]
): EmployeeWithUIFields[] => {
  return employees
    .filter((emp) => emp && emp.id)
    .map((emp) => ({
      ...emp,
      name: `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim(),
      initials: `${emp.first_name?.[0] ?? ""}${emp.last_name?.[0] ?? ""}`.toUpperCase(),
      avatar: "/placeholder.svg?height=40&width=40",
    }));
};

// Combined hook that fetches all data and transforms it
export const useTeamData = () => {
  const employeesQuery = useEmployees();
  const jobTitlesQuery = useJobTitles();
  const locationsQuery = useLocations();

  const isLoading = employeesQuery.isLoading || jobTitlesQuery.isLoading || locationsQuery.isLoading;
  const isError = employeesQuery.isError || jobTitlesQuery.isError || locationsQuery.isError;
  const error = employeesQuery.error || jobTitlesQuery.error || locationsQuery.error;

  // Transform employee data when all queries are successful - memoized to prevent recreating array
  const transformedEmployees = useMemo(() => {
    if (!employeesQuery.data) return [];
    return transformEmployeeData(employeesQuery.data);
  }, [employeesQuery.data]);

  // Memoize job titles and locations to prevent recreating arrays
  const memoizedJobTitles = useMemo(() => jobTitlesQuery.data ?? [], [jobTitlesQuery.data]);
  const memoizedLocations = useMemo(() => locationsQuery.data ?? [], [locationsQuery.data]);

  return {
    employees: transformedEmployees,
    jobTitles: memoizedJobTitles,
    locations: memoizedLocations,
    isLoading,
    isError,
    error,
    // Individual query states for granular control if needed
    employeesQuery,
    jobTitlesQuery,
    locationsQuery,
  };
};
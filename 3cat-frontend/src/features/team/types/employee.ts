// src/types/employee.ts

// Base employee interface matching your database schema
export interface Employee {
  employee_id: number;
  email: string;
  bamboo_hr_id: string | null;
  first_name: string;
  last_name: string;
  department: string;
  created_at: string;
  updated_at: string;
  department_id: number;
  current_level_id: number;
  current_title_id: number;
  location_id: number;
  manager_id: number;
  phone: string | null;
  current_compensation: number | null;
  gusto_id: string | null;
  sevenshift_id: string | null;
  punch_id: string | null;
  status: string;
}

// Raw employee data from API (matching your current EmployeeData interface)
export interface EmployeeApiResponse {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  current_title_id: string | null;
  location_id: number | null;
  status: string;
  bamboo_hr_id: string | null;
  sevenshift_id: string | null;
  gusto_id: string | null;
  punch_id: string | null;
  created_at: string;
  current_compensation: number | null;
  hourlyRate: number | null;
}

// Enhanced employee interface with UI display fields
export interface EmployeeWithUIFields extends EmployeeApiResponse {
  name: string;
  initials: string;
  avatar: string;
}

// Job Title interface
export interface JobTitle {
  title_id: number;
  title_name: string;
}

// Location interface
export interface Location {
  location_id: number;
  location_code: string;
  location_name: string;
}

// Employee creation interface
export interface EmployeeCreate {
  email: string;
  bamboo_hr_id?: string;
  first_name: string;
  last_name: string;
  department?: string;
  department_id?: number;
  current_level_id?: number;
  current_title_id?: number;
  location_id?: number;
  manager_id?: number;
  phone?: string;
  current_compensation?: number;
  gusto_id?: string;
  sevenshift_id?: string;
  punch_id?: string;
  status?: string;
}

// Employee update interface
export interface EmployeeUpdate {
  bamboo_hr_id?: string | null;
  sevenshift_id?: string | null;
  current_compensation?: number | null;
  email?: string;
  first_name?: string;
  last_name?: string;
  department?: string;
  current_title_id?: number | null;
  current_level_id?: number | null;
  location_id?: number | null;
  department_id?: number | null;
  pay_rate?: number | null;
  punch_id?: string | null;
  gusto_id?: string | null;
  status?: "Active" | "On Leave" | "Inactive" | "Part-Time" | "Full-Time" | "Terminated";
}
import axios from "axios";
import { EmployeeUpdate } from "../types/employee";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const updateEmployee = (employee_id: number, data: EmployeeUpdate) => {
  return axios.put(`${API_BASE_URL}/employees/${employee_id}`, data);
};

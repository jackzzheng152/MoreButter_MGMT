// features/payroll-processing/api/employeeApi.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Function to match employees with timesheet data
export const matchEmployeesWithTimesheet = async (userIds: string[]) => {
  try {
    userIds = userIds.filter(id => id !== null);
    console.log("UserIds: ", userIds);
    const response = await axios.post(`${API_BASE_URL}/employees/match`, {
      user_ids: userIds
    });
    return response.data;
  } catch (error) {
    console.error("Error matching employees:", error);
    throw error;
  }
};

// Function to update employee job title
export const updateEmployeeJobTitle = async (employeeId: string, jobTitle: string) => {
  try {
    const response = await axios.patch(`/api/employees/${employeeId}`, {
      job_title: jobTitle
    });
    return response.data;
  } catch (error) {
    console.error("Error updating employee job title:", error);
    throw error;
  }
};
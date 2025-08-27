import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Function to remove employee from BambooHR
export const removeFromBambooHR = async (bambooHrId: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/platforms/bamboohr/remove`, {
      bamboo_hr_id: bambooHrId
    });
    return {
      success: true,
      message: response.data.message
    };
  } catch (error: any) {
    console.error('Error removing employee from BambooHR:', error);
    return {
      success: false,
      message: error.response?.data?.detail || 'Failed to remove employee from BambooHR'
    };
  }
};

// Function to remove employee from 7shifts
export const removeFrom7Shifts = async (sevenShiftId: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/platforms/7shifts/remove`, {
      seven_shift_id: sevenShiftId
    });
    return {
      success: true,
      message: response.data.message
    };
  } catch (error: any) {
    console.error('Error removing employee from 7shifts:', error);
    return {
      success: false,
      message: error.response?.data?.detail || 'Failed to remove employee from 7shifts'
    };
  }
}; 
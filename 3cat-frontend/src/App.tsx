import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import FormsPage from './pages/Home'
import DashboardLayout from './components/dashboard-layout'
import { PasscodeProtection } from './components/PasscodeProtection'
import './App.css'
import { TeamManagement } from './features/team/components/team-management'
import { PayrollProcessor } from './features/payroll processing/components/payroll-processor'
import { FormSubmissions } from './features/employee update/components/form-submissions'
import { EmployeeDetailsPage } from './pages/employee-details'; 
import LaborPage from './pages/labor';
import SalesPage from './pages/sales';
import BonusCalculatorPage from './pages/bonus-calculator';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated (stored in sessionStorage)
    const authenticated = sessionStorage.getItem('mgmt-3cat-authenticated');
    if (authenticated === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handlePasscodeCorrect = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem('mgmt-3cat-authenticated', 'true');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PasscodeProtection onPasscodeCorrect={handlePasscodeCorrect} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route path="dashboard" element={<FormsPage />} />
          <Route path="team" element={<TeamManagement />} />
          <Route path="payroll" element={<PayrollProcessor />} />
          <Route path="employee-update" element={<FormSubmissions />} />
          <Route path="/employee-details/:id" element={<EmployeeDetailsPage />} />
          <Route path="/labor" element={<LaborPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/bonus-calculator" element={<BonusCalculatorPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
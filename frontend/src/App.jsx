import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Vitals from './pages/Vitals';
import PatientProfile from './pages/PatientProfile';
import Inventory from './pages/Inventory';
import PatientRegistration from './pages/PatientRegistration';
import AdminLogin from './pages/AdminLogin';
import MedicineEntry from './pages/MedicineEntry';

function App() {
  return (
    <Router>
      <Routes>
        {/* Login is the landing page */}
        <Route path="/" element={<AdminLogin />} />
        <Route path="/login" element={<AdminLogin />} />

        {/* Protected routes wrapped in Layout */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Navigate to="/vitals" replace />} />
          <Route path="/vitals" element={<Vitals />} />
          <Route path="/patient" element={<PatientProfile />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/register" element={<PatientRegistration />} />
          <Route path="/medicine-entry" element={<MedicineEntry />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

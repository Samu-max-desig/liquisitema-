import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/Login/Login";
import AdminDashboard from "../pages/AdminDashboard/AdminDashboard";
import DomiciliarioDashboard from "../pages/DomiciliarioDashboard/DomiciliarioDashboard";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/domiciliario" element={<DomiciliarioDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;

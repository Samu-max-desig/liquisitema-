import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/Login/Login";
import AdminDashboard from "../pages/AdministradorPrincipal/AdminDashboard/AdminDashboard";
import DomiciliarioDashboard from "../pages/DomiciliarioDashboard/DomiciliarioDashboard";
import ConfiguracionAdmin from "../pages/AdministradorPrincipal/Configuracion/ConfiguracionAdmin";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/admin" element={<AdminDashboard />} />

        <Route path="/domiciliario" element={<DomiciliarioDashboard />} />

        <Route path="/configuracion-admin" element={<ConfiguracionAdmin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;

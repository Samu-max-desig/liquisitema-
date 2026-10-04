import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login/Login";
import AdminDashboard from "../pages/AdministradorPrincipal/AdminDashboard/AdminDashboard";
import DomiciliarioDashboard from "../pages/DomiciliarioDashboard/DomiciliarioDashboard";
import ConfiguracionAdmin from "../pages/AdministradorPrincipal/Configuracion/ConfiguracionAdmin";
import { AuthProvider, useAuth } from "../context/AuthContext";

function RutaProtegida({ children, rolesPermitidos }) {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return <div>Cargando sesión...</div>;
  }

  if (!usuario) {
    return <Navigate to="/" replace />;
  }

  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    if (usuario.rol === "admin" || usuario.rol === "super_admin") {
      return <Navigate to="/admin" replace />;
    }

    return <Navigate to="/domiciliario" replace />;
  }

  return children;
}

function RutaLogin() {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return <div>Cargando sesión...</div>;
  }

  if (usuario) {
    if (usuario.rol === "admin" || usuario.rol === "super_admin") {
      return <Navigate to="/admin" replace />;
    }

    return <Navigate to="/domiciliario" replace />;
  }

  return <Login />;
}

function AppRoutes() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RutaLogin />} />

          <Route
            path="/admin"
            element={
              <RutaProtegida rolesPermitidos={["admin", "super_admin"]}>
                <AdminDashboard />
              </RutaProtegida>
            }
          />

          <Route
            path="/domiciliario"
            element={
              <RutaProtegida rolesPermitidos={["domiciliario"]}>
                <DomiciliarioDashboard />
              </RutaProtegida>
            }
          />

          <Route
            path="/configuracion-admin"
            element={
              <RutaProtegida rolesPermitidos={["admin", "super_admin"]}>
                <ConfiguracionAdmin />
              </RutaProtegida>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default AppRoutes;

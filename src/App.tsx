import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardFinanciero from './views/DashboardFinanciero';
import ModuloHR from './views/ModuloHR';
import ModuloArmeria from './views/ModuloArmeria';
import OperacionesCampo from './views/OperacionesCampo';
import ClienteCRM from './views/ClienteCRM';
import ModuloUsuarios from './views/ModuloUsuarios';
import ChangePassword from './views/ChangePassword';
import ModuloContratos from './views/ModuloContratos';
import ModuloERP from './views/ModuloERP';
import ModuloCompras from './views/ModuloCompras';
import Login from './views/Login';
import { Configuracion } from './views/Configuracion';
import PortalEmpleado from './views/PortalEmpleado';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/change-password" element={<ChangePassword />} />
          </Route>

          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>

            {/* ADMIN ONLY */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="usuarios" element={<ModuloUsuarios />} />
            </Route>

            {/* ADMIN, FINANCE */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'FINANCE']} />}>
              <Route index element={<DashboardFinanciero />} />
              <Route path="erp" element={<ModuloERP />} />
              <Route path="compras" element={<ModuloCompras />} />
              <Route path="settings" element={<Configuracion />} />
            </Route>

            {/* ADMIN, OPERATIONS */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'OPERATIONS']} />}>
              <Route path="hr" element={<ModuloHR />} />
              <Route path="armeria" element={<ModuloArmeria />} />
              <Route path="operaciones" element={<OperacionesCampo />} />
            </Route>

            {/* ADMIN ONLY (Contracts are sensitive) */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="contratos" element={<ModuloContratos />} />
            </Route>

            {/* GUARD / EMPLOYEES / ADMIN */}
            <Route element={<ProtectedRoute allowedRoles={['GUARD', 'ADMIN', 'FINANCE', 'OPERATIONS']} />}>
              <Route path="mi-portal" element={<PortalEmpleado />} />
            </Route>

            {/* ADMIN, CLIENT */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'CLIENT']} />}>
              <Route path="crm" element={<ClienteCRM />} />
            </Route>

          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

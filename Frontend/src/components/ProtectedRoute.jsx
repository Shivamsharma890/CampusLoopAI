import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
export default function ProtectedRoute() {
  return useAuth().isAuthenticated ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace />
  );
}

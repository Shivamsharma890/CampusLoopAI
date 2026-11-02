import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Landing from "./pages/Landing.jsx";
import { Login, Register } from "./pages/Auth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Marketplace from "./pages/Marketplace.jsx";
import AddItem from "./pages/AddItem.jsx";
import { MyRequests, IncomingRequests } from "./pages/Requests.jsx";
import Assistant from "./pages/Assistant.jsx";
import ItemDetails from "./pages/ItemDetails.jsx";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import MyListings from "./pages/MyListings.jsx";
function Guest({ children }) {
  return useAuth().isAuthenticated ? <Navigate to="/app" replace /> : children;
}
function LoginPage() {
  const loc = useLocation();
  useEffect(() => {
    if (loc.state?.registered)
      history.replaceState({}, document.title, loc.pathname);
  }, [loc]);
  return <Login />;
}
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/login"
        element={
          <Guest>
            <LoginPage />
          </Guest>
        }
      />
      <Route
        path="/register"
        element={
          <Guest>
            <Register />
          </Guest>
        }
      />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="add-item" element={<AddItem />} />
          <Route path="my-listings" element={<MyListings />} />
          <Route path="my-requests" element={<MyRequests />} />
          <Route path="borrow-requests" element={<IncomingRequests />} />
          <Route path="assistant" element={<Assistant />} />
        </Route>
        <Route path="/items/:itemId" element={<Layout />}>
          <Route index element={<ItemDetails />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

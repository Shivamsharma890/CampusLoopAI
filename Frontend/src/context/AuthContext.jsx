import { createContext, useContext, useMemo, useState } from "react";
import {
  clearSession,
  endpoints,
  storedUser,
  token,
  setSession,
} from "../services/api.js";
const C = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(storedUser);
  const [access, setAccess] = useState(token);
  const login = async (p) => {
    const d = await endpoints.login(p);
    const t = d?.access_token || d?.token;
    if (!t) throw Error("Login response did not include an access token.");
    const u = d?.user || { email: p.email };
    setSession(t, u);
    setAccess(t);
    setUser(u);
    return d;
  };
  const register = (p) => endpoints.register(p);
  const logout = () => {
    clearSession();
    setAccess(null);
    setUser(null);
  };
  const value = useMemo(
    () => ({
      user,
      access,
      isAuthenticated: !!access,
      login,
      register,
      logout,
    }),
    [user, access],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}
export const useAuth = () => useContext(C);

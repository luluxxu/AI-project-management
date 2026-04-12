// Auth context: stores JWT token + user info, exposes login/logout helpers
import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Persist token and user across page refreshes via localStorage
  const [token, setToken] = useState(() => localStorage.getItem("taskpilot-token"));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("taskpilot-user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = (newToken, newUser) => {
    localStorage.setItem("taskpilot-token", newToken);
    localStorage.setItem("taskpilot-user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("taskpilot-token");
    localStorage.removeItem("taskpilot-user");
    localStorage.removeItem("taskpilot-active-ws");
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === "Admin";

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

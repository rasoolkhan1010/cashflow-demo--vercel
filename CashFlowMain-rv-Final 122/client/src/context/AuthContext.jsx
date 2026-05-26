// export const useAuth = () => useContext(AuthContext);
import React, { useState, useEffect, useContext, createContext } from "react";
import api from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem("token") || null,
  );
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedToken = localStorage.getItem("token");

        if (!storedToken) {
          setLoading(false);
          return;
        }

        let storedUser = null;

        try {
          storedUser = JSON.parse(localStorage.getItem("user"));
        } catch {}

        if (storedUser) {
          setUser(storedUser);
        } else {
          const freshUser = await api.me();
          setUser(freshUser);
          localStorage.setItem("user", JSON.stringify(freshUser));
        }

        setToken(storedToken);
      } catch (err) {
        console.error("Session validation failed:", err.message);
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  const login = (data) => {
    if (!data?.token || !data?.user) {
      console.error("Invalid login response");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setToken(null);
    setUser(null);

    // Optional: hard redirect (recommended for clean state)
    window.location.href = "/";
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

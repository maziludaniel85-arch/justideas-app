import { useEffect } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useGetProfil } from "@workspace/api-client-react";
import { useLocation } from "wouter";

export function useAuth() {
  const [, setLocation] = useLocation();
  const { data: profil, isLoading, error, refetch } = useGetProfil({
    query: {
      retry: false,
    },
  });

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("justideas_token"));
  }, []);

  const login = (token: string) => {
    localStorage.setItem("justideas_token", token);
    refetch();
  };

  const logout = () => {
    localStorage.removeItem("justideas_token");
    setLocation("/autentificare");
    window.location.reload();
  };

  return {
    profil,
    isLoading,
    error,
    login,
    logout,
    isAuthenticated: !!profil,
  };
}

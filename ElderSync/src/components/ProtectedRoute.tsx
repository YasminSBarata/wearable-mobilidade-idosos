import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";
import { getSupabaseClient } from "../utils/supabase/client";

export function ProtectedRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();

    const checkAuth = async () => {
      console.log("ProtectedRoute: Verificando autenticação...");

      // O Supabase gerencia a sessão automaticamente
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      console.log("ProtectedRoute: Sessão:", {
        hasSession: !!session,
        hasUser: !!session?.user,
        error,
      });

      if (error || !session) {
        console.log("ProtectedRoute: Sem sessão válida");
        setIsAuthenticated(false);
      } else {
        console.log(
          "ProtectedRoute: ✅ Sessão válida, usuário:",
          session.user.email,
        );
        setIsAuthenticated(true);
      }
    };

    // Verificar sessão inicial
    checkAuth();

    // Listener para mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("ProtectedRoute: Auth state changed:", event);
      if (event === "SIGNED_OUT" || !session) {
        setIsAuthenticated(false);
      } else if (session) {
        setIsAuthenticated(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#29D68B]"></div>
          <p className="mt-4 text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log("ProtectedRoute: ❌ Não autenticado, redirecionando para /");
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
}

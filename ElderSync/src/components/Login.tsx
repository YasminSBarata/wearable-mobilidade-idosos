import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { getSupabaseClient } from "../utils/supabase/client";
import logo from "../assets/logo.png";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = getSupabaseClient();

      console.log("Tentando fazer login com:", email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Erro ao fazer login:", error);

        // Mensagens de erro específicas
        if (error.message.includes("Invalid login credentials")) {
          setError(
            "E-mail ou senha incorretos. Verifique seus dados ou crie uma conta.",
          );
        } else if (error.message.includes("Email not confirmed")) {
          setError("E-mail não confirmado. Verifique sua caixa de entrada.");
        } else if (error.message.includes("Too many requests")) {
          setError(
            "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
          );
        } else {
          setError(error.message || "Erro ao fazer login. Tente novamente.");
        }
        setLoading(false);
        return;
      }

      console.log("Login bem-sucedido:", data);

      if (data?.session) {
        // O Supabase automaticamente gerencia a sessão no storage interno
        // Apenas salvar o email para referência
        localStorage.setItem("user_email", email);
        console.log("Sessão criada com sucesso, usuário:", data.user?.email);

        console.log("Navegando para dashboard...");
        navigate("/dashboard");
      } else {
        setError("Sessão não foi criada. Tente novamente.");
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Erro completo ao fazer login:", err);
      setError(
        err.message ||
          "Erro ao fazer login. Verifique seus dados e tente novamente.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <div className="flex flex-col items-center gap-4">
            <div className="bg-[#272727] p-4 rounded-xl">
              <img src={logo} alt="ElderSync" className="h-16" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900">ElderSync</h1>
              <p className="text-gray-600 mt-2">Monitoramento de Pacientes</p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#29D68B] text-white hover:bg-[#24c07d] h-11 text-base font-semibold"
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Não tem uma conta?{" "}
              <Link
                to="/signup"
                className="text-[#29D68B] hover:text-[#24c07d] font-semibold"
              >
                Cadastre-se
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

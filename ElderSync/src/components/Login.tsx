import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { getSupabaseClient } from "../utils/supabase/client";
import logo from "../assets/Logo.svg";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

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

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
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

      if (data?.session) {
        localStorage.setItem("user_email", email);
        navigate("/dashboard");
      } else {
        setError("Sessão não foi criada. Tente novamente.");
        setLoading(false);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      console.error("[Login] Erro", errorMessage);
      setError(
        errorMessage ||
          "Erro ao fazer login. Verifique seus dados e tente novamente.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 bg-[#272727] p-4 rounded-xl">
            <img src={logo} alt="ElderSync" className="h-16" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">ElderSync</h1>
          <p className="text-gray-600 mt-2">Monitoramento de Pacientes</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <Label htmlFor="email" className="block mb-2">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="password" className="block mb-2">
              Senha
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            variant="success"
            size="lg"
            className="w-full"
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
      </div>
    </div>
  );
}

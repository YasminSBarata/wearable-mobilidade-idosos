import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { getSupabaseClient } from "../utils/supabase/client";
import logo from "../assets/Logo.svg";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (password.length < 6) {
        throw new Error("A senha deve ter no mínimo 6 caracteres.");
      }

      if (!email.includes("@")) {
        throw new Error("Por favor, insira um e-mail válido.");
      }

      if (name.trim().length < 2) {
        throw new Error("Por favor, insira um nome válido.");
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseAnonKey}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (
          data.error?.includes("User already registered") ||
          data.error?.includes("already been registered")
        ) {
          throw new Error(
            "Este e-mail já está cadastrado. Faça login ou use outro e-mail.",
          );
        } else if (data.error?.includes("Password should be at least")) {
          throw new Error("A senha deve ter no mínimo 6 caracteres.");
        } else if (data.error?.includes("invalid email")) {
          throw new Error("E-mail inválido. Verifique e tente novamente.");
        } else {
          throw new Error(
            data.error || "Erro ao criar conta. Tente novamente.",
          );
        }
      }

      if (data.access_token && data.refresh_token) {
        const supabase = getSupabaseClient();
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        if (sessionError) {
          throw new Error(
            "Conta criada, mas não foi possível iniciar sessão. Tente fazer login.",
          );
        }

        localStorage.setItem("user_email", email);
        navigate("/dashboard");
      } else {
        throw new Error(
          "Conta criada, mas não foi possível fazer login automaticamente. Tente fazer login.",
        );
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      console.error("[Signup] Erro", errorMessage);
      setError(
        errorMessage ||
          "Erro ao criar conta. Verifique seus dados e tente novamente.",
      );
    } finally {
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
          <h1 className="text-3xl font-bold text-gray-900">Criar Conta</h1>
          <p className="text-gray-600 mt-2">ElderSync - Cadastro</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
          <div>
            <Label htmlFor="name" className="block mb-2">
              Nome Completo
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              required
            />
          </div>

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
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
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
            {loading ? "Criando conta..." : "Criar Conta"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Já tem uma conta?{" "}
            <Link
              to="/"
              className="text-[#29D68B] hover:text-[#24c07d] font-semibold"
            >
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate, Link } from "react-router";
import logo from "../assets/logo.png";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";

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
      // Validações no frontend
      if (password.length < 6) {
        throw new Error("A senha deve ter no mínimo 6 caracteres.");
      }

      if (!email.includes("@")) {
        throw new Error("Por favor, insira um e-mail válido.");
      }

      if (name.trim().length < 2) {
        throw new Error("Por favor, insira um nome válido.");
      }

      console.log("Iniciando signup para:", email);

      const response = await fetch(
        `${supabaseUrl}/functions/v1/make-server-ba5f214e/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ email, password, name }),
        },
      );

      const data = await response.json();
      console.log("Resposta do signup:", response.status, data);

      if (!response.ok) {
        console.error("Erro no signup:", data);

        // Mensagens de erro específicas
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

      console.log("Conta criada com sucesso:", data);

      // Configurar sessão no Supabase client e salvar tokens
      if (data.access_token && data.refresh_token) {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        localStorage.setItem("user_email", email);
        console.log("Tokens salvos no localStorage");

        // Pequeno delay para garantir que o localStorage foi atualizado
        await new Promise((resolve) => setTimeout(resolve, 100));

        navigate("/dashboard");
      } else {
        throw new Error(
          "Conta criada, mas não foi possível fazer login automaticamente. Tente fazer login.",
        );
      }
    } catch (err: any) {
      console.error("Erro completo ao criar conta:", err);
      setError(
        err.message ||
          "Erro ao criar conta. Verifique seus dados e tente novamente.",
      );
    } finally {
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
              <h1 className="text-3xl font-bold text-gray-900">Criar Conta</h1>
              <p className="text-gray-600 mt-2">ElderSync - Cadastro</p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                required
                className="h-11"
              />
            </div>

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
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
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
        </CardContent>
      </Card>
    </div>
  );
}

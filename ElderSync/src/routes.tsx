import { createBrowserRouter, Navigate, useNavigate, useParams } from "react-router";
import { Login } from "./components/Login";
import { Signup } from "./components/Signup";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PatientsPage } from "./components/PatientsPage";
import { PatientProfilePage } from "./components/PatientProfilePage";
import { SessionHistoryPage } from "./components/SessionHistoryPage";

function NewSessionPlaceholder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center max-w-sm">
        <p className="text-lg font-semibold text-gray-800 mb-2">Nova Sessão</p>
        <p className="text-sm text-gray-500 mb-6">
          Formulário de avaliação SPPB + TUG em desenvolvimento (Fase 4).
        </p>
        <button
          onClick={() => navigate(`/patients/${id}`)}
          className="text-sm text-[#29D68B] hover:underline"
        >
          ← Voltar ao perfil
        </button>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Login,
  },
  {
    path: "/signup",
    Component: Signup,
  },
  {
    path: "/dashboard",
    element: <Navigate to="/patients" replace />,
  },
  {
    path: "/patients",
    element: <ProtectedRoute />,
    children: [
      {
        index: true,
        Component: PatientsPage,
      },
    ],
  },
  {
    path: "/patients/:id",
    element: <ProtectedRoute />,
    children: [
      {
        index: true,
        Component: PatientProfilePage,
      },
    ],
  },
  {
    path: "/patients/:id/session/new",
    element: <ProtectedRoute />,
    children: [
      {
        index: true,
        Component: NewSessionPlaceholder,
      },
    ],
  },
  {
    path: "/patients/:id/sessions",
    element: <ProtectedRoute />,
    children: [
      {
        index: true,
        Component: SessionHistoryPage,
      },
    ],
  },
]);

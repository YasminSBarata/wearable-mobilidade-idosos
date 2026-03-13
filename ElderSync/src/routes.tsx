import { createBrowserRouter, Navigate, useParams } from "react-router";
import { Login } from "./components/Login";
import { Signup } from "./components/Signup";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PatientsPage } from "./components/PatientsPage";
import { PatientProfilePage } from "./components/PatientProfilePage";
import { SessionHistoryPage } from "./components/SessionHistoryPage";
import { NewSessionForm } from "./components/NewSessionForm";

function NewSessionPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <NewSessionForm patientId={id} />;
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
        Component: NewSessionPage,
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

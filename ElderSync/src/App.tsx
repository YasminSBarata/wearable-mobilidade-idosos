import { RouterProvider } from "react-router";
//fornece contexto de roteamente para toda a aplicação, permitindo navegação entre páginas sem recarregar a página inteira.
// Ele é configurado com as rotas definidas no arquivo routes.tsx, que mapeia caminhos para componentes específicos (Login, Signup, ProtectedRoute).
import { router } from "./routes";
//objetos de rota definidos em routes.tsx, que mapeiam caminhos para componentes específicos (Login, Signup, ProtectedRoute).

function App() {
  return <RouterProvider router={router} />;
}

export default App;

"use client";

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SessionContextProvider, useSession } from './components/SessionContextProvider';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NovaProposta from './pages/NovaProposta';
import ConfiguracoesEmpresa from './pages/ConfiguracoesEmpresa';
import Catalogo from './pages/Catalogo';
import { Toaster } from 'react-hot-toast';

// Componente de rota privada
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useSession();

  if (loading) {
    return React.createElement('div', {
      className: "flex justify-center items-center min-h-screen bg-gray-100"
    }, "Carregando...");
  }

  return session ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return React.createElement(Router, null,
    React.createElement(SessionContextProvider, null,
      React.createElement(Toaster, null),
      React.createElement(Routes, null,
        React.createElement(Route, { path: "/login", element: React.createElement(Login) }),
        React.createElement(Route, { path: "/", element: React.createElement(Navigate, { to: "/dashboard" }) }),
        React.createElement(Route,
          { path: "/dashboard",
            element: React.createElement(PrivateRoute, null, React.createElement(Dashboard)) },
        ),
        React.createElement(Route,
          { path: "/nova-proposta",
            element: React.createElement(PrivateRoute, null, React.createElement(NovaProposta)) },
        ),
        React.createElement(Route,
          { path: "/configuracoes-empresa",
            element: React.createElement(PrivateRoute, null, React.createElement(ConfiguracoesEmpresa)) },
        ),
        React.createElement(Route,
          { path: "/catalogo",
            element: React.createElement(PrivateRoute, null, React.createElement(Catalogo)) },
        )
      )
    )
  );
}

export default App;
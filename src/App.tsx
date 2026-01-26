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
    return <div className="flex justify-center items-center min-h-screen bg-gray-100">Carregando...</div>;
  }

  return session ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <SessionContextProvider>
        <Toaster /> {/* Adiciona o Toaster para notificações */}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/nova-proposta"
            element={
              <PrivateRoute>
                <NovaProposta />
              </PrivateRoute>
            }
          />
          <Route
            path="/configuracoes-empresa"
            element={
              <PrivateRoute>
                <ConfiguracoesEmpresa />
              </PrivateRoute>
            }
          />
          <Route
            path="/catalogo"
            element={
              <PrivateRoute>
                <Catalogo />
              </PrivateRoute>
            }
          />
        </Routes>
      </SessionContextProvider>
    </Router>
  );
}

export default App;
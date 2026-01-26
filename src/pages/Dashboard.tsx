"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../components/SessionContextProvider';
import { Button } from '../components/ui/button'; // Assumindo que shadcn/ui Button existe

const Dashboard = () => {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen bg-gray-100">Carregando...</div>;
  }

  if (!session) {
    navigate('/login');
    return null;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <header className="flex justify-between items-center py-4 px-6 bg-white shadow-md rounded-lg mb-6">
        <img src="/new-grid-logo.png" alt="New Grid Distribuidora Logo" className="h-10" />
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <Button onClick={handleLogout} variant="destructive">Sair</Button>
      </header>

      <main className="container mx-auto">
        <div className="flex justify-end mb-6">
          <Button onClick={() => navigate('/nova-proposta')} className="bg-blue-600 hover:bg-blue-700 text-white">
            Nova Proposta
          </Button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Propostas Criadas</h2>
          <p className="text-gray-600">Lista de propostas virá aqui...</p>
          {/* Placeholder para a lista de propostas */}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';

const ConfiguracoesEmpresa = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <header className="flex items-center py-4 px-6 bg-white shadow-md rounded-lg mb-6">
        <Button onClick={() => navigate('/dashboard')} variant="outline" className="mr-4">Voltar</Button>
        <h1 className="text-2xl font-bold text-gray-800">Configurações da Empresa</h1>
      </header>
      <main className="container mx-auto bg-white p-6 rounded-lg shadow-md">
        <p className="text-gray-600">Formulário de configurações da empresa virá aqui...</p>
      </main>
    </div>
  );
};

export default ConfiguracoesEmpresa;
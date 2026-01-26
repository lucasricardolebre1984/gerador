"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';

const ConfiguracoesEmpresa = () => {
  const navigate = useNavigate();
  return React.createElement('div', {
    className: "min-h-screen bg-gray-100 p-6"
  },
    React.createElement('header', {
      className: "flex items-center py-4 px-6 bg-white shadow-md rounded-lg mb-6"
    },
      React.createElement(Button, {
        onClick: () => navigate('/dashboard'),
        variant: "outline",
        className: "mr-4"
      }, "Voltar"),
      React.createElement('h1', {
        className: "text-2xl font-bold text-gray-800"
      }, "Configurações da Empresa")
    ),
    React.createElement('main', {
      className: "container mx-auto bg-white p-6 rounded-lg shadow-md"
    },
      React.createElement('p', {
        className: "text-gray-600"
      }, "Formulário de configurações da empresa virá aqui...")
    )
  );
};

export default ConfiguracoesEmpresa;
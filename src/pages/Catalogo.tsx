"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';

const Catalogo = () => {
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
      }, "Catálogo de Produtos")
    ),
    React.createElement('main', {
      className: "container mx-auto bg-white p-6 rounded-lg shadow-md"
    },
      React.createElement('p', {
        className: "text-gray-600"
      }, "Área para upload e gerenciamento do catálogo via planilha Excel...")
    )
  );
};

export default Catalogo;
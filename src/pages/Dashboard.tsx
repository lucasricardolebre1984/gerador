"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../components/SessionContextProvider';
import { Button } from '../components/ui/button';
import { supabase } from '../integrations/supabase/client';

const Dashboard = () => {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  if (loading) {
    return React.createElement('div', {
      className: "flex justify-center items-center min-h-screen bg-gray-100"
    }, "Carregando...");
  }

  if (!session) {
    navigate('/login');
    return null;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return React.createElement('div', {
    className: "min-h-screen bg-gray-100 p-6"
  },
    React.createElement('header', {
      className: "flex justify-between items-center py-4 px-6 bg-white shadow-md rounded-lg mb-6"
    },
      React.createElement('img', {
        src: "/new-grid-logo.png",
        alt: "New Grid Distribuidora Logo",
        className: "h-10"
      }),
      React.createElement('h1', {
        className: "text-2xl font-bold text-gray-800"
      }, "Dashboard"),
      React.createElement(Button, {
        onClick: handleLogout,
        variant: "destructive"
      }, "Sair")
    ),
    React.createElement('main', {
      className: "container mx-auto"
    },
      React.createElement('div', {
        className: "flex justify-end mb-6"
      },
        React.createElement(Button, {
          onClick: () => navigate('/nova-proposta'),
          className: "bg-blue-600 hover:bg-blue-700 text-white"
        }, "Nova Proposta")
      ),
      React.createElement('div', {
        className: "bg-white p-6 rounded-lg shadow-md"
      },
        React.createElement('h2', {
          className: "text-xl font-semibold mb-4 text-gray-700"
        }, "Propostas Criadas"),
        React.createElement('p', {
          className: "text-gray-600"
        }, "Lista de propostas virá aqui..."),
        React.createElement(React.Fragment, null, "Placeholder para a lista de propostas")
      )
    )
  );
};

export default Dashboard;
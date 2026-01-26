"use client";

import React, { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../components/SessionContextProvider';

const Login = () => {
  const navigate = useNavigate();
  const { session, loading } = useSession();

  useEffect(() => {
    if (session) {
      navigate('/dashboard');
    }
  }, [session, navigate]);

  if (loading) {
    return React.createElement('div', {
      className: "flex justify-center items-center min-h-screen bg-gray-100"
    }, "Carregando...");
  }

  return React.createElement('div', {
    className: "min-h-screen flex items-center justify-center bg-gray-100 p-4"
  },
    React.createElement('div', {
      className: "w-full max-w-md bg-white p-8 rounded-lg shadow-md"
    },
      React.createElement('h2', {
        className: "text-2xl font-bold text-center mb-6 text-gray-800"
      }, "Login"),
      React.createElement(Auth, {
        supabaseClient: supabase,
        providers: [],
        appearance: {
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: '#007bff',
                brandAccent: '#0056b3',
              },
            },
          },
        },
        theme: "light",
        redirectTo: window.location.origin + '/dashboard'
      })
    )
  );
};

export default Login;
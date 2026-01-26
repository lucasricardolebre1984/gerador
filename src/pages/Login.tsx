"use client";

import React from 'react';
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
    return <div className="flex justify-center items-center min-h-screen bg-gray-100">Carregando...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Login</h2>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#007bff', // Azul elétrico
                  brandAccent: '#0056b3', // Azul mais escuro para acentos
                },
              },
            },
          }}
          theme="light"
          redirectTo={window.location.origin + '/dashboard'}
        />
      </div>
    </div>
  );
};

export default Login;
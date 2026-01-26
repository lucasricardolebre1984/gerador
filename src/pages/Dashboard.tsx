"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../components/SessionContextProvider';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';

interface Proposal {
  id: string;
  client_name: string;
  proposal_date: string;
  system_power_kwp: number;
  total_value: number;
}

const Dashboard = () => {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingProposals, setLoadingProposals] = useState(true);

  useEffect(() => {
    if (!loading && !session) {
      navigate('/login');
    }
  }, [session, loading, navigate]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchProposals();
    }
  }, [session]);

  const fetchProposals = async () => {
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('id, client_name, proposal_date, system_power_kwp, total_value')
        .eq('user_id', session?.user?.id)
        .order('proposal_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setProposals(data || []);
    } catch (error: any) {
      showError('Erro ao carregar propostas');
      console.error(error);
    } finally {
      setLoadingProposals(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleDownloadPDF = async (proposalId: string) => {
    // Implementar download de PDF salvo
    showError('Funcionalidade em desenvolvimento');
  };

  const handleDuplicateProposal = async (proposalId: string) => {
    navigate(`/nova-proposta?duplicate=${proposalId}`);
  };

  const filteredProposals = proposals.filter(p =>
    p.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || loadingProposals) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-dark">
        <div className="text-primary text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark text-foreground">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur-sm border-b border-border shadow-lg">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/new-grid-logo.png"
              alt="New Grid Distribuidora"
              className="h-12"
            />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session?.user?.email}
            </span>
            <Button onClick={handleLogout} variant="destructive" size="sm">
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <Button
            onClick={() => navigate('/nova-proposta')}
            className="bg-primary hover:bg-primary/90 text-background font-semibold px-8 py-6 text-lg shadow-lg"
          >
            + Nova Proposta
          </Button>
          <Button
            onClick={() => navigate('/catalogo')}
            variant="outline"
            className="border-primary/50 hover:bg-primary/10"
          >
            Gerenciar Catálogo
          </Button>
          <Button
            onClick={() => navigate('/configuracoes-empresa')}
            variant="outline"
            className="border-secondary/50 hover:bg-secondary/10"
          >
            Configurações
          </Button>
        </div>

        {/* Proposals Table */}
        <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border shadow-xl">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">
                Propostas Recentes
              </h2>
              <Input
                placeholder="Buscar por cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs bg-background/50 border-border"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Potência
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Valor Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProposals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      {searchTerm ? 'Nenhuma proposta encontrada' : 'Nenhuma proposta criada ainda'}
                    </td>
                  </tr>
                ) : (
                  filteredProposals.map((proposal) => (
                    <tr
                      key={proposal.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(proposal.proposal_date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        {proposal.client_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 rounded-full bg-primary/20 text-primary">
                          {proposal.system_power_kwp} kWp
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary">
                        R$ {proposal.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadPDF(proposal.id)}
                            className="border-primary/50 hover:bg-primary/10"
                          >
                            Baixar PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDuplicateProposal(proposal.id)}
                            className="border-secondary/50 hover:bg-secondary/10"
                          >
                            Duplicar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
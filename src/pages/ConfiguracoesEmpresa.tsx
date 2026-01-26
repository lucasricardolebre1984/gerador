"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { supabase } from '../integrations/supabase/client';
import { useSession } from '../components/SessionContextProvider';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';

const ConfiguracoesEmpresa = () => {
  const navigate = useNavigate();
  const { session } = useSession();
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    general_conditions: '',
    payment_terms: '',
    logo_url: '',
  });

  useEffect(() => {
    if (userId) {
      fetchCompanySettings();
    }
  }, [userId]);

  const fetchCompanySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setFormData(data);
        if (data.logo_url) {
          setLogoPreview(data.logo_url);
        }
      }
    } catch (error: any) {
      showError('Erro ao carregar configurações');
      console.error(error);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSave = async () => {
    if (!userId) {
      showError('Usuário não autenticado');
      return;
    }

    if (!formData.name || !formData.cnpj) {
      showError('Preencha pelo menos Nome e CNPJ');
      return;
    }

    setLoading(true);
    const loadingId = showLoading('Salvando configurações...');

    try {
      let logoUrl = formData.logo_url;

      // Upload da logo se houver
      if (logoFile) {
        const fileName = `${userId}_${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('company-logos')
          .upload(fileName, logoFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('company-logos')
          .getPublicUrl(fileName);

        logoUrl = urlData.publicUrl;
      }

      // Verificar se já existe configuração
      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existing) {
        // Update
        const { error } = await supabase
          .from('company_settings')
          .update({
            ...formData,
            logo_url: logoUrl,
          })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('company_settings')
          .insert({
            user_id: userId,
            ...formData,
            logo_url: logoUrl,
          });

        if (error) throw error;
      }

      dismissToast(loadingId);
      showSuccess('Configurações salvas com sucesso!');
      fetchCompanySettings();
    } catch (error: any) {
      dismissToast(loadingId);
      showError(`Erro ao salvar: ${error.message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark text-foreground">
      <header className="bg-card/50 backdrop-blur-sm border-b border-border shadow-lg">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="border-border"
          >
            ← Voltar
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Configurações da Empresa
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-3xl">
        <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border shadow-xl p-6 space-y-6">
          {/* Logo Upload */}
          <div>
            <Label htmlFor="logo">Logo da Empresa</Label>
            <div className="mt-2 flex items-center gap-4">
              {logoPreview && (
                <img
                  src={logoPreview}
                  alt="Logo Preview"
                  className="h-20 w-20 object-contain bg-white rounded p-2"
                />
              )}
              <Input
                id="logo"
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleLogoChange}
                className="bg-background/50 border-border"
              />
            </div>
          </div>

          {/* Company Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name">Razão Social / Nome Fantasia *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="New Grid Distribuidora Ltda"
                className="bg-background/50 border-border"
              />
            </div>

            <div>
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={handleInputChange}
                placeholder="00.000.000/0000-00"
                className="bg-background/50 border-border"
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="(00) 00000-0000"
                className="bg-background/50 border-border"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address">Endereço Completo</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Rua, número, bairro"
                className="bg-background/50 border-border"
              />
            </div>

            <div>
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="São Paulo"
                className="bg-background/50 border-border"
              />
            </div>

            <div>
              <Label htmlFor="state">Estado (UF)</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={handleInputChange}
                placeholder="SP"
                maxLength={2}
                className="bg-background/50 border-border"
              />
            </div>
          </div>

          {/* Conditions */}
          <div>
            <Label htmlFor="general_conditions">Condições Gerais</Label>
            <Textarea
              id="general_conditions"
              value={formData.general_conditions}
              onChange={handleInputChange}
              placeholder="Frete CIF incluso para áreas urbanas. Entrega em até 7 dias após compensação do pagamento..."
              rows={6}
              className="bg-background/50 border-border"
            />
          </div>

          <div>
            <Label htmlFor="payment_terms">Forma de Pagamento Padrão</Label>
            <Textarea
              id="payment_terms"
              value={formData.payment_terms}
              onChange={handleInputChange}
              placeholder="50% antecipado + 50% na entrega"
              rows={3}
              className="bg-background/50 border-border"
            />
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-background font-semibold"
          >
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ConfiguracoesEmpresa;
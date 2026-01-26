"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { supabase } from '../integrations/supabase/client';
import { useSession } from '../components/SessionContextProvider';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import * as XLSX from 'xlsx';
import { generateProposalPDF } from '../utils/pdfGenerator';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface ProposalItem {
  product_id: string | null;
  name: string;
  description: string;
  price: number;
  quantity: number;
  total: number;
}

const NovaProposta = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useSession();
  const userId = session?.user?.id;

  // Modo: 'manual' ou 'excel'
  const [mode, setMode] = useState<'manual' | 'excel'>('manual');

  // Dados do cliente
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientState, setClientState] = useState('');
  
  // Dados do orçamento
  const [proposalDate, setProposalDate] = useState(new Date().toISOString().split('T')[0]);
  const [validityDays, setValidityDays] = useState('1');
  const [roofType, setRoofType] = useState('');
  const [systemPower, setSystemPower] = useState('');

  // Produtos e itens
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<ProposalItem[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [manualTotalValue, setManualTotalValue] = useState<string>('');

  // Excel
  const [excelFile, setExcelFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchActiveCatalogProducts();
    }
  }, [userId]);

  useEffect(() => {
    const calculatedTotal = selectedProducts.reduce((sum, item) => sum + item.total, 0);
    setTotalValue(calculatedTotal);
  }, [selectedProducts]);

  const fetchActiveCatalogProducts = async () => {
    try {
      const { data: activeCatalog } = await supabase
        .from('catalogs')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (!activeCatalog) return;

      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('catalog_id', activeCatalog.id);

      setAvailableProducts(products || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    const loadingId = showLoading('Analisando planilha...');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        throw new Error('Planilha vazia');
      }

      const headers = jsonData[0].map((h: any) => String(h).toLowerCase().trim());
      const items: ProposalItem[] = [];

      const productColIndex = headers.findIndex(h => 
        h.includes('produto') || h.includes('item') || h.includes('descrição')
      );
      const qtyColIndex = headers.findIndex(h => 
        h.includes('qtd') || h.includes('quantidade')
      );

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        const productName = productColIndex >= 0 ? String(row[productColIndex] || '') : String(row[0] || '');
        const quantity = qtyColIndex >= 0 ? Number(row[qtyColIndex]) || 1 : 1;

        if (productName) {
          items.push({
            product_id: null,
            name: productName,
            description: productName,
            price: 0,
            quantity: quantity,
            total: 0,
          });
        }
      }

      setSelectedProducts(items);
      dismissToast(loadingId);
      showSuccess(`${items.length} itens importados`);
    } catch (error: any) {
      dismissToast(loadingId);
      showError(`Erro ao processar Excel: ${error.message}`);
    }
  };

  const handleAddProduct = (productId: string) => {
    const product = availableProducts.find(p => p.id === productId);
    if (!product) return;

    const existing = selectedProducts.find(item => item.product_id === productId);
    if (existing) {
      setSelectedProducts(prev =>
        prev.map(item =>
          item.product_id === productId
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        )
      );
    } else {
      setSelectedProducts(prev => [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          quantity: 1,
          total: product.price,
        },
      ]);
    }
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    setSelectedProducts(prev =>
      prev.map((item, idx) =>
        idx === index
          ? { ...item, quantity: quantity, total: quantity * item.price }
          : item
      )
    );
  };

  const handleRemoveProduct = (index: number) => {
    setSelectedProducts(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveProposal = async () => {
    if (!userId) {
      showError('Usuário não autenticado');
      return;
    }

    if (!clientName || !clientAddress || !clientCity || !clientState || !roofType || !systemPower) {
      showError('Preencha todos os campos obrigatórios');
      return;
    }

    if (selectedProducts.length === 0) {
      showError('Adicione pelo menos um produto');
      return;
    }

    setLoading(true);
    const loadingId = showLoading('Salvando proposta...');

    try {
      const finalTotalValue = manualTotalValue ? parseFloat(manualTotalValue) : totalValue;

      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .insert({
          user_id: userId,
          client_name: clientName,
          client_address: clientAddress,
          client_city: clientCity,
          client_state: clientState,
          proposal_date: proposalDate,
          validity_days: parseInt(validityDays),
          roof_type: roofType,
          system_power_kwp: parseFloat(systemPower),
          total_value: finalTotalValue,
          status: 'pending',
        })
        .select()
        .single();

      if (proposalError) throw proposalError;

      const proposalItemsToInsert = selectedProducts.map(item => ({
        proposal_id: proposal.id,
        product_id: item.product_id,
        product_name: item.name,
        product_description: item.description,
        product_price_snapshot: item.price,
        quantity: item.quantity,
        item_total: item.total,
      }));

      const { error: itemsError } = await supabase
        .from('proposal_items')
        .insert(proposalItemsToInsert);

      if (itemsError) throw itemsError;

      // Gerar PDF
      await generateProposalPDF({
        proposalId: proposal.id,
        userId,
        clientName,
        clientAddress,
        clientCity,
        clientState,
        proposalDate,
        validityDays: parseInt(validityDays),
        roofType,
        systemPower: parseFloat(systemPower),
        items: selectedProducts,
        totalValue: finalTotalValue,
      });

      dismissToast(loadingId);
      showSuccess('Proposta salva com sucesso!');
      navigate('/dashboard');
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
            Nova Proposta
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-5xl">
        <form onSubmit={(e) => { e.preventDefault(); handleSaveProposal(); }}>
          {/* Dados do Cliente */}
          <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border shadow-xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Dados do Cliente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="clientName">Nome do Cliente *</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                  className="bg-background/50 border-border"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="clientAddress">Endereço Completo *</Label>
                <Input
                  id="clientAddress"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  required
                  className="bg-background/50 border-border"
                />
              </div>
              <div>
                <Label htmlFor="clientCity">Cidade *</Label>
                <Input
                  id="clientCity"
                  value={clientCity}
                  onChange={(e) => setClientCity(e.target.value)}
                  required
                  className="bg-background/50 border-border"
                />
              </div>
              <div>
                <Label htmlFor="clientState">Estado (UF) *</Label>
                <Input
                  id="clientState"
                  value={clientState}
                  onChange={(e) => setClientState(e.target.value)}
                  required
                  maxLength={2}
                  className="bg-background/50 border-border"
                />
              </div>
            </div>
          </div>

          {/* Dados do Orçamento */}
          <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border shadow-xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Dados do Orçamento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="proposalDate">Data do Orçamento</Label>
                <Input
                  id="proposalDate"
                  type="date"
                  value={proposalDate}
                  onChange={(e) => setProposalDate(e.target.value)}
                  className="bg-background/50 border-border"
                />
              </div>
              <div>
                <Label htmlFor="validityDays">Validade (dias úteis)</Label>
                <Input
                  id="validityDays"
                  type="number"
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                  className="bg-background/50 border-border"
                />
              </div>
              <div>
                <Label htmlFor="roofType">Tipo de Estrutura/Telhado *</Label>
                <Input
                  id="roofType"
                  value={roofType}
                  onChange={(e) => setRoofType(e.target.value)}
                  placeholder="Ex: Colonial, Metálico"
                  required
                  className="bg-background/50 border-border"
                />
              </div>
              <div>
                <Label htmlFor="systemPower">Potência do Sistema (kWp) *</Label>
                <Input
                  id="systemPower"
                  type="number"
                  step="0.01"
                  value={systemPower}
                  onChange={(e) => setSystemPower(e.target.value)}
                  required
                  className="bg-background/50 border-border"
                />
              </div>
            </div>
          </div>

          {/* Modo de Entrada */}
          <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border shadow-xl p-6 mb-6">
            <div className="flex gap-4 mb-4">
              <Button
                type="button"
                onClick={() => setMode('manual')}
                variant={mode === 'manual' ? 'default' : 'outline'}
                className={mode === 'manual' ? 'bg-primary text-background' : ''}
              >
                Modo Manual
              </Button>
              <Button
                type="button"
                onClick={() => setMode('excel')}
                variant={mode === 'excel' ? 'default' : 'outline'}
                className={mode === 'excel' ? 'bg-secondary text-background' : ''}
              >
                Upload Excel
              </Button>
            </div>

            {mode === 'excel' && (
              <div>
                <Label htmlFor="excelFile">Planilha de Produtos (.xlsx)</Label>
                <Input
                  id="excelFile"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="bg-background/50 border-border"
                />
              </div>
            )}

            {mode === 'manual' && availableProducts.length > 0 && (
              <div>
                <Label>Adicionar Produto do Catálogo</Label>
                <select
                  onChange={(e) => handleAddProduct(e.target.value)}
                  className="w-full h-10 rounded-md border border-border bg-background/50 px-3 py-2"
                >
                  <option value="">Selecione um produto</option>
                  {availableProducts.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - R$ {product.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Lista de Produtos */}
          {selectedProducts.length > 0 && (
            <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border shadow-xl p-6 mb-6">
              <h3 className="font-semibold mb-4">Produtos Selecionados</h3>
              <div className="space-y-2">
                {selectedProducts.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 p-3 bg-background/30 rounded-lg border border-border"
                  >
                    <div className="flex-grow">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        R$ {item.price.toFixed(2)}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value) || 1)}
                      className="w-20 bg-background border-border"
                    />
                    <p className="font-semibold w-32 text-right text-primary">
                      R$ {item.total.toFixed(2)}
                    </p>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveProduct(idx)}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-4 mt-4 pt-4 border-t border-border">
                <p className="text-lg font-bold">
                  Total Calculado: R$ {totalValue.toFixed(2)}
                </p>
                <div className="w-48">
                  <Label htmlFor="manualTotal">Editar Total</Label>
                  <Input
                    id="manualTotal"
                    type="number"
                    step="0.01"
                    placeholder="Opcional"
                    value={manualTotalValue}
                    onChange={(e) => setManualTotalValue(e.target.value)}
                    className="bg-background border-border text-right"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Botão Salvar */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-background font-semibold py-6 text-lg"
          >
            {loading ? 'Gerando Proposta...' : 'Gerar Proposta'}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default NovaProposta;
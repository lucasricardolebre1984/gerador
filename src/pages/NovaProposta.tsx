"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { supabase } from '../integrations/supabase/client';
import { useSession } from '../components/SessionContextProvider';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  catalog_id: string;
}

interface ProposalItem {
  product_id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  total: number;
}

interface CompanySettings {
  name: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  general_conditions: string;
  payment_terms: string;
  logo_url?: string;
}

const NovaProposta = () => {
  const navigate = useNavigate();
  const { session } = useSession();
  const userId = session?.user?.id;

  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientState, setClientState] = useState('');
  const [proposalDate, setProposalDate] = useState(new Date().toISOString().split('T')[0]);
  const [validityDays, setValidityDays] = useState('30');
  const [roofType, setRoofType] = useState('');
  const [systemPower, setSystemPower] = useState('');
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<ProposalItem[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [manualTotalValue, setManualTotalValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const fetchActiveCatalogProducts = async () => {
      const { data: activeCatalog, error: catalogError } = await supabase
        .from('catalogs')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (catalogError || !activeCatalog) {
        showError('Nenhum catálogo ativo encontrado. Por favor, ative um catálogo.');
        return;
      }

      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('catalog_id', activeCatalog.id);

      if (productsError) {
        showError('Erro ao carregar produtos do catálogo.');
        console.error(productsError);
        return;
      }
      setAvailableProducts(products || []);
    };

    fetchActiveCatalogProducts();
  }, [userId]);

  useEffect(() => {
    const calculatedTotal = selectedProducts.reduce((sum, item) => sum + item.total, 0);
    setTotalValue(calculatedTotal);
  }, [selectedProducts]);

  const handleAddProduct = (productId: string) => {
    const product = availableProducts.find(p => p.id === productId);
    if (product) {
      const existingItem = selectedProducts.find(item => item.product_id === productId);
      if (existingItem) {
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
    }
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setSelectedProducts(prev =>
      prev.map(item =>
        item.product_id === productId
          ? { ...item, quantity: quantity, total: quantity * item.price }
          : item
      )
    );
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(item => item.product_id !== productId));
  };

  const generateProposalPdf = async (proposalId: string) => {
    if (!userId) {
      showError('Usuário não autenticado.');
      return;
    }

    const loadingToastId = showLoading('Gerando PDF...');

    try {
      const { data: companySettings, error: companyError } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (companyError || !companySettings) {
        showError('Configurações da empresa não encontradas. Por favor, configure-as primeiro.');
        dismissToast(loadingToastId);
        return;
      }

      const doc = new jsPDF('p', 'mm', 'a4');
      let yOffset = 10;
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();

      // Helper para adicionar texto
      const addText = (text: string, x: number, y: number, size: number, style: 'normal' | 'bold' = 'normal', align: 'left' | 'center' | 'right' = 'left') => {
        doc.setFont('helvetica', style);
        doc.setFontSize(size);
        doc.text(text, x, y, { align: align });
      };

      // Logo da New Grid Distribuidora (placeholder ou real se existir)
      if (companySettings.logo_url) {
        const img = new Image();
        img.src = companySettings.logo_url;
        await new Promise((resolve) => {
          img.onload = () => {
            const imgWidth = 40; // Largura fixa para o logo
            const imgHeight = (img.height * imgWidth) / img.width;
            doc.addImage(img, 'PNG', margin, yOffset, imgWidth, imgHeight);
            yOffset += imgHeight + 5;
            resolve(null);
          };
          img.onerror = () => {
            console.warn("Failed to load company logo, using placeholder.");
            addText('New Grid Distribuidora', margin, yOffset + 10, 18, 'bold');
            yOffset += 20;
            resolve(null);
          };
        });
      } else {
        addText('New Grid Distribuidora', margin, yOffset + 10, 18, 'bold');
        yOffset += 20;
      }

      yOffset += 10; // Espaço após o logo/título

      // Título da Proposta
      addText('PROPOSTA COMERCIAL', pageWidth / 2, yOffset, 24, 'bold', 'center');
      yOffset += 15;

      // Dados da Empresa
      addText('DADOS DA EMPRESA', margin, yOffset, 14, 'bold');
      yOffset += 7;
      addText(`Nome: ${companySettings.name}`, margin, yOffset, 10);
      yOffset += 5;
      addText(`CNPJ: ${companySettings.cnpj}`, margin, yOffset, 10);
      yOffset += 5;
      addText(`Endereço: ${companySettings.address}, ${companySettings.city} - ${companySettings.state}`, margin, yOffset, 10);
      yOffset += 10;

      // Dados do Cliente
      addText('DADOS DO CLIENTE', margin, yOffset, 14, 'bold');
      yOffset += 7;
      addText(`Nome: ${clientName}`, margin, yOffset, 10);
      yOffset += 5;
      addText(`Endereço: ${clientAddress}, ${clientCity} - ${clientState}`, margin, yOffset, 10);
      yOffset += 10;

      // Dados do Orçamento
      addText('DADOS DO ORÇAMENTO', margin, yOffset, 14, 'bold');
      yOffset += 7;
      addText(`Data do Orçamento: ${new Date(proposalDate).toLocaleDateString('pt-BR')}`, margin, yOffset, 10);
      yOffset += 5;
      addText(`Validade: ${validityDays} dias`, margin, yOffset, 10);
      yOffset += 5;
      addText(`Tipo de Telhado: ${roofType}`, margin, yOffset, 10);
      yOffset += 5;
      addText(`Potência do Sistema: ${systemPower} kWp`, margin, yOffset, 10);
      yOffset += 10;

      // Tabela de Itens
      addText('ITENS DA PROPOSTA', margin, yOffset, 14, 'bold');
      yOffset += 7;

      const tableColumn = ["Item", "Descrição", "Preço Unitário", "Qtd", "Total"];
      const tableRows = selectedProducts.map(item => [
        item.name,
        item.description,
        `R$ ${item.price.toFixed(2)}`,
        item.quantity,
        `R$ ${item.total.toFixed(2)}`,
      ]);

      (doc as any).autoTable({
        startY: yOffset,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: '#007bff', textColor: '#ffffff', fontStyle: 'bold' },
        margin: { left: margin, right: margin },
        didDrawPage: function (data: any) {
          yOffset = data.cursor.y + 10;
        }
      });

      // Valor Total Destacado
      yOffset += 5;
      addText(`VALOR TOTAL: R$ ${parseFloat(manualTotalValue || totalValue.toFixed(2)).toFixed(2)}`, pageWidth - margin, yOffset, 16, 'bold', 'right');
      yOffset += 15;

      // Condições Gerais
      addText('CONDIÇÕES GERAIS', margin, yOffset, 14, 'bold');
      yOffset += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const splitGeneralConditions = doc.splitTextToSize(companySettings.general_conditions, pageWidth - 2 * margin);
      doc.text(splitGeneralConditions, margin, yOffset);
      yOffset += (splitGeneralConditions.length * 5) + 10; // Ajuste de linha

      // Forma de Pagamento Padrão
      addText('FORMA DE PAGAMENTO', margin, yOffset, 14, 'bold');
      yOffset += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const splitPaymentTerms = doc.splitTextToSize(companySettings.payment_terms, pageWidth - 2 * margin);
      doc.text(splitPaymentTerms, margin, yOffset);
      yOffset += (splitPaymentTerms.length * 5) + 10;

      doc.save(`proposta_${clientName.replace(/\s/g, '_')}_${proposalDate}.pdf`);
      showSuccess('PDF gerado com sucesso!');
    } catch (error) {
      showError('Erro ao gerar PDF.');
      console.error('Erro ao gerar PDF:', error);
    } finally {
      dismissToast(loadingToastId);
    }
  };

  const handleSaveProposal = async () => {
    if (!userId) {
      showError('Usuário não autenticado.');
      return;
    }

    if (!clientName || !clientAddress || !clientCity || !clientState || !roofType || !systemPower || selectedProducts.length === 0) {
      showError('Por favor, preencha todos os campos obrigatórios e adicione pelo menos um produto.');
      return;
    }

    setLoading(true);
    const loadingToastId = showLoading('Salvando proposta...');

    try {
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
          total_value: parseFloat(manualTotalValue || totalValue.toFixed(2)),
          status: 'pending', // Status inicial
        })
        .select()
        .single();

      if (proposalError || !proposal) {
        throw proposalError || new Error('Erro ao salvar a proposta.');
      }

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

      if (itemsError) {
        throw itemsError;
      }

      showSuccess('Proposta salva com sucesso!');
      await generateProposalPdf(proposal.id); // Gerar PDF após salvar
      navigate('/dashboard');
    } catch (error: any) {
      showError(`Erro ao salvar proposta: ${error.message || error.toString()}`);
      console.error('Erro ao salvar proposta:', error);
    } finally {
      setLoading(false);
      dismissToast(loadingToastId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <header className="flex items-center py-4 px-6 bg-white shadow-md rounded-lg mb-6">
        <Button onClick={() => navigate('/dashboard')} variant="outline" className="mr-4">Voltar</Button>
        <h1 className="text-2xl font-bold text-gray-800">Nova Proposta</h1>
      </header>
      <main className="container mx-auto bg-white p-6 rounded-lg shadow-md">
        <form onSubmit={(e) => { e.preventDefault(); handleSaveProposal(); }}>
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Dados do Cliente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="clientName">Nome do Cliente</Label>
              <Input id="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="clientAddress">Endereço Completo</Label>
              <Input id="clientAddress" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="clientCity">Cidade</Label>
              <Input id="clientCity" value={clientCity} onChange={(e) => setClientCity(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="clientState">Estado</Label>
              <Input id="clientState" value={clientState} onChange={(e) => setClientState(e.target.value)} required />
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-4 text-gray-700">Dados do Orçamento</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="proposalDate">Data do Orçamento</Label>
              <Input id="proposalDate" type="date" value={proposalDate} onChange={(e) => setProposalDate(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="validityDays">Validade (dias)</Label>
              <Input id="validityDays" type="number" value={validityDays} onChange={(e) => setValidityDays(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="roofType">Tipo de Telhado</Label>
              <Input id="roofType" value={roofType} onChange={(e) => setRoofType(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="systemPower">Potência do Sistema (kWp)</Label>
              <Input id="systemPower" type="number" step="0.01" value={systemPower} onChange={(e) => setSystemPower(e.target.value)} required />
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-4 text-gray-700">Itens da Proposta</h2>
          <div className="mb-6">
            <Label htmlFor="productSelect">Adicionar Produto</Label>
            <div className="flex gap-2">
              <Select onValueChange={handleAddProduct}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - R$ {product.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedProducts.length > 0 && (
            <div className="mb-6 border rounded-md p-4">
              <h3 className="font-medium mb-3">Produtos Selecionados:</h3>
              {selectedProducts.map(item => (
                <div key={item.product_id} className="flex items-center justify-between gap-4 py-2 border-b last:border-b-0">
                  <div className="flex-grow">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-gray-600">R$ {item.price.toFixed(2)}</p>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(item.product_id, parseInt(e.target.value))}
                    className="w-20 text-center"
                  />
                  <p className="font-semibold w-24 text-right">R$ {item.total.toFixed(2)}</p>
                  <Button variant="destructive" size="sm" onClick={() => handleRemoveProduct(item.product_id)}>Remover</Button>
                </div>
              ))}
              <div className="flex justify-end items-center mt-4 pt-4 border-t">
                <p className="text-lg font-bold mr-4">Total Calculado: R$ {totalValue.toFixed(2)}</p>
                <Label htmlFor="manualTotal" className="sr-only">Valor Total Manual</Label>
                <Input
                  id="manualTotal"
                  type="number"
                  step="0.01"
                  placeholder="Editar Total Manualmente"
                  value={manualTotalValue || ''}
                  onChange={(e) => setManualTotalValue(e.target.value)}
                  className="w-48 text-right"
                />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
            {loading ? 'Gerando Proposta...' : 'Gerar Proposta'}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default NovaProposta;
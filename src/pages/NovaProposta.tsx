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
    const calculatedTotal = selectedProducts.reduce((sum: number, item: ProposalItem) => sum + item.total, 0);
    setTotalValue(calculatedTotal);
  }, [selectedProducts]);

  const handleAddProduct = (productId: string) => {
    const product = availableProducts.find((p: Product) => p.id === productId);
    if (product) {
      const existingItem = selectedProducts.find((item: ProposalItem) => item.product_id === productId);
      if (existingItem) {
        setSelectedProducts(prev =>
          prev.map((item: ProposalItem) =>
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
      prev.map((item: ProposalItem) =>
        item.product_id === productId
          ? { ...item, quantity: quantity, total: quantity * item.price }
          : item
      )
    );
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter((item: ProposalItem) => item.product_id !== productId));
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
            const imgWidth = 40;
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

      yOffset += 10;

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
      const tableRows = selectedProducts.map((item: ProposalItem) => [
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
      yOffset += (splitGeneralConditions.length * 5) + 10;

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
          status: 'pending',
        })
        .select()
        .single();

      if (proposalError || !proposal) {
        throw proposalError || new Error('Erro ao salvar a proposta.');
      }

      const proposalItemsToInsert = selectedProducts.map((item: ProposalItem) => ({
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
      await generateProposalPdf(proposal.id);
      navigate('/dashboard');
    } catch (error: any) {
      showError(`Erro ao salvar proposta: ${error.message || error.toString()}`);
      console.error('Erro ao salvar proposta:', error);
    } finally {
      setLoading(false);
      dismissToast(loadingToastId);
    }
  };

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
      }, "Nova Proposta")
    ),
    React.createElement('main', {
      className: "container mx-auto bg-white p-6 rounded-lg shadow-md"
    },
      React.createElement('form', {
        onSubmit: (e: React.FormEvent) => {
          e.preventDefault();
          handleSaveProposal();
        }
      },
        React.createElement('h2', {
          className: "text-xl font-semibold mb-4 text-gray-700"
        }, "Dados do Cliente"),
        React.createElement('div', {
          className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
        },
          React.createElement('div', null,
            React.createElement(Label, {
              htmlFor: "clientName"
            }, "Nome do Cliente"),
            React.createElement(Input, {
              id: "clientName",
              value: clientName,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setClientName(e.target.value),
              required: true
            })
          ),
          React.createElement('div', null,
            React.createElement(Label, {
              htmlFor: "clientAddress"
            }, "Endereço Completo"),
            React.createElement(Input, {
              id: "clientAddress",
              value: clientAddress,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setClientAddress(e.target.value),
              required: true
            })
          ),
          React.createElement('div', null,
            React.createElement(Label, {
              htmlFor: "clientCity"
            }, "Cidade"),
            React.createElement(Input, {
              id: "clientCity",
              value: clientCity,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setClientCity(e.target.value),
              required: true
            })
          ),
          React.createElement('div', null,
            React.createElement(Label, {
              htmlFor: "clientState"
            }, "Estado"),
            React.createElement(Input, {
              id: "clientState",
              value: clientState,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setClientState(e.target.value),
              required: true
            })
          )
        ),
        React.createElement('h2', {
          className: "text-xl font-semibold mb-4 text-gray-700"
        }, "Dados do Orçamento"),
        React.createElement('div', {
          className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
        },
          React.createElement('div', null,
            React.createElement(Label, {
              htmlFor: "proposalDate"
            }, "Data do Orçamento"),
            React.createElement(Input, {
              id: "proposalDate",
              type: "date",
              value: proposalDate,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setProposalDate(e.target.value),
              required: true
            })
          ),
          React.createElement('div', null,
            React.createElement(Label, {
              htmlFor: "validityDays"
            }, "Validade (dias)"),
            React.createElement(Input, {
              id: "validityDays",
              type: "number",
              value: validityDays,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValidityDays(e.target.value),
              required: true
            })
          ),
          React.createElement('div', null,
            React.createElement(Label, {
              htmlFor: "roofType"
            }, "Tipo de Telhado"),
            React.createElement(Input, {
              id: "roofType",
              value: roofType,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setRoofType(e.target.value),
              required: true
            })
          ),
          React.createElement('div', null,
            React.createElement(Label, {
              htmlFor: "systemPower"
            }, "Potência do Sistema (kWp)"),
            React.createElement(Input, {
              id: "systemPower",
              type: "number",
              step: "0.01",
              value: systemPower,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setSystemPower(e.target.value),
              required: true
            })
          )
        ),
        React.createElement('h2', {
          className: "text-xl font-semibold mb-4 text-gray-700"
        }, "Itens da Proposta"),
        React.createElement('div', {
          className: "mb-6"
        },
          React.createElement(Label, {
            htmlFor: "productSelect"
          }, "Adicionar Produto"),
          React.createElement('div', {
            className: "flex gap-2"
          },
            React.createElement(Select, {
              onChange: (e: React.ChangeEvent<HTMLSelectElement>) => handleAddProduct(e.target.value)
            },
              React.createElement(SelectTrigger, {
                className: "w-full"
              },
                React.createElement(SelectValue, {
                  placeholder: "Selecione um produto"
                })
              ),
              React.createElement(SelectContent, null,
                availableProducts.map((product: Product) =>
                  React.createElement(SelectItem, {
                    key: product.id,
                    value: product.id
                  },
                    `${product.name} - R$ ${product.price.toFixed(2)}`
                  )
                )
              )
            )
          )
        ),
        selectedProducts.length > 0 && React.createElement('div', {
          className: "mb-6 border rounded-md p-4"
        },
          React.createElement('h3', {
            className: "font-medium mb-3"
          }, "Produtos Selecionados:"),
          selectedProducts.map((item: ProposalItem) =>
            React.createElement('div', {
              key: item.product_id,
              className: "flex items-center justify-between gap-4 py-2 border-b last:border-b-0"
            },
              React.createElement('div', {
                className: "flex-grow"
              },
                React.createElement('p', {
                  className: "font-semibold"
                }, item.name),
                React.createElement('p', {
                  className: "text-sm text-gray-600"
                }, `R$ ${item.price.toFixed(2)}`)
              ),
              React.createElement(Input, {
                type: "number",
                min: "1",
                value: item.quantity,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleQuantityChange(item.product_id, parseInt(e.target.value)),
                className: "w-20 text-center"
              }),
              React.createElement('p', {
                className: "font-semibold w-24 text-right"
              }, `R$ ${item.total.toFixed(2)}`),
              React.createElement(Button, {
                variant: "destructive",
                size: "sm",
                onClick: () => handleRemoveProduct(item.product_id)
              }, "Remover")
            )
          ),
          React.createElement('div', {
            className: "flex justify-end items-center mt-4 pt-4 border-t"
          },
            React.createElement('p', {
              className: "text-lg font-bold mr-4"
            }, `Total Calculado: R$ ${totalValue.toFixed(2)}`),
            React.createElement(Label, {
              htmlFor: "manualTotal",
              className: "sr-only"
            }, "Valor Total Manual"),
            React.createElement(Input, {
              id: "manualTotal",
              type: "number",
              step: "0.01",
              placeholder: "Editar Total Manualmente",
              value: manualTotalValue || '',
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setManualTotalValue(e.target.value),
              className: "w-48 text-right"
            })
          )
        ),
        React.createElement(Button, {
          type: "submit",
          className: "w-full bg-blue-600 hover:bg-blue-700 text-white",
          disabled: loading
        }, loading ? 'Gerando Proposta...' : 'Gerar Proposta')
      )
    )
  );
};

export default NovaProposta;
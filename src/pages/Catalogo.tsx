"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { supabase } from '../integrations/supabase/client';
import { useSession } from '../components/SessionContextProvider';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import * as XLSX from 'xlsx';

interface Catalog {
  id: string;
  name: string;
  uploaded_at: string;
  is_active: boolean;
}

interface Product {
  name: string;
  description: string;
  quantity?: number;
  price?: number;
}

const Catalogo = () => {
  const navigate = useNavigate();
  const { session } = useSession();
  const userId = session?.user?.id;

  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [catalogName, setCatalogName] = useState('');
  const [parsedProducts, setParsedProducts] = useState<Product[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchCatalogs();
    }
  }, [userId]);

  const fetchCatalogs = async () => {
    try {
      const { data, error } = await supabase
        .from('catalogs')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setCatalogs(data || []);
    } catch (error: any) {
      showError('Erro ao carregar catálogos');
      console.error(error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCatalogName(file.name.replace('.xlsx', ''));
    }
  };

  const parseExcel = async () => {
    if (!selectedFile) {
      showError('Selecione um arquivo Excel');
      return;
    }

    const loadingId = showLoading('Analisando planilha...');

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        throw new Error('Planilha vazia ou sem dados');
      }

      // Assumir que a primeira linha são os cabeçalhos
      const headers = jsonData[0].map((h: any) => String(h).toLowerCase().trim());
      const products: Product[] = [];

      // Tentar identificar colunas automaticamente
      const productColIndex = headers.findIndex(h => 
        h.includes('produto') || h.includes('item') || h.includes('descrição') || h.includes('descricao')
      );
      const qtyColIndex = headers.findIndex(h => 
        h.includes('qtd') || h.includes('quantidade') || h.includes('qty')
      );
      const priceColIndex = headers.findIndex(h => 
        h.includes('preço') || h.includes('preco') || h.includes('valor') || h.includes('price')
      );

      // Processar linhas de dados
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        const product: Product = {
          name: productColIndex >= 0 ? String(row[productColIndex] || '') : String(row[0] || ''),
          description: productColIndex >= 0 ? String(row[productColIndex] || '') : String(row[0] || ''),
          quantity: qtyColIndex >= 0 ? Number(row[qtyColIndex]) || 0 : 0,
          price: priceColIndex >= 0 ? Number(row[priceColIndex]) || 0 : 0,
        };

        if (product.name) {
          products.push(product);
        }
      }

      if (products.length === 0) {
        throw new Error('Nenhum produto encontrado na planilha');
      }

      setParsedProducts(products);
      setShowPreview(true);
      dismissToast(loadingId);
      showSuccess(`${products.length} produtos encontrados!`);
    } catch (error: any) {
      dismissToast(loadingId);
      showError(`Erro ao analisar Excel: ${error.message}`);
      console.error(error);
    }
  };

  const handleSaveCatalog = async () => {
    if (!userId || parsedProducts.length === 0) {
      showError('Nenhum produto para salvar');
      return;
    }

    const loadingId = showLoading('Salvando catálogo...');

    try {
      // Desativar todos os catálogos anteriores
      await supabase
        .from('catalogs')
        .update({ is_active: false })
        .eq('user_id', userId);

      // Criar novo catálogo
      const { data: catalog, error: catalogError } = await supabase
        .from('catalogs')
        .insert({
          user_id: userId,
          name: catalogName || 'Catálogo Importado',
          is_active: true,
        })
        .select()
        .single();

      if (catalogError) throw catalogError;

      // Inserir produtos
      const productsToInsert = parsedProducts.map(p => ({
        catalog_id: catalog.id,
        name: p.name,
        description: p.description,
        price: p.price || 0,
      }));

      const { error: productsError } = await supabase
        .from('products')
        .insert(productsToInsert);

      if (productsError) throw productsError;

      dismissToast(loadingId);
      showSuccess('Catálogo salvo com sucesso!');
      
      // Resetar formulário
      setSelectedFile(null);
      setParsedProducts([]);
      setShowPreview(false);
      setCatalogName('');
      fetchCatalogs();
    } catch (error: any) {
      dismissToast(loadingId);
      showError(`Erro ao salvar catálogo: ${error.message}`);
      console.error(error);
    }
  };

  const handleActivateCatalog = async (catalogId: string) => {
    try {
      await supabase
        .from('catalogs')
        .update({ is_active: false })
        .eq('user_id', userId);

      await supabase
        .from('catalogs')
        .update({ is_active: true })
        .eq('id', catalogId);

      showSuccess('Catálogo ativado!');
      fetchCatalogs();
    } catch (error: any) {
      showError('Erro ao ativar catálogo');
      console.error(error);
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
            Gerenciar Catálogo
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Upload Section */}
        <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border shadow-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Importar Nova Planilha</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="catalogName">Nome do Catálogo</Label>
              <Input
                id="catalogName"
                value={catalogName}
                onChange={(e) => setCatalogName(e.target.value)}
                placeholder="Ex: Catálogo Janeiro 2026"
                className="bg-background/50 border-border"
              />
            </div>

            <div>
              <Label htmlFor="excelFile">Arquivo Excel (.xlsx)</Label>
              <Input
                id="excelFile"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="bg-background/50 border-border"
              />
            </div>

            <Button
              onClick={parseExcel}
              disabled={!selectedFile}
              className="bg-primary hover:bg-primary/90 text-background"
            >
              Analisar Planilha
            </Button>
          </div>
        </div>

        {/* Preview Section */}
        {showPreview && parsedProducts.length > 0 && (
          <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border shadow-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Pré-visualização ({parsedProducts.length} produtos)
            </h2>
            
            <div className="overflow-x-auto max-h-96 mb-4">
              <table className="w-full">
                <thead className="sticky top-0 bg-muted/30">
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left text-sm font-medium">Produto</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Qtd</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Preço</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsedProducts.slice(0, 10).map((product, idx) => (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="px-4 py-2 text-sm">{product.name}</td>
                      <td className="px-4 py-2 text-sm">{product.quantity || '-'}</td>
                      <td className="px-4 py-2 text-sm">
                        {product.price ? `R$ ${product.price.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedProducts.length > 10 && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  ... e mais {parsedProducts.length - 10} produtos
                </p>
              )}
            </div>

            <Button
              onClick={handleSaveCatalog}
              className="bg-secondary hover:bg-secondary/90 text-background"
            >
              Salvar Catálogo
            </Button>
          </div>
        )}

        {/* Catalogs List */}
        <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border shadow-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Catálogos Salvos</h2>
          
          <div className="space-y-2">
            {catalogs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum catálogo salvo ainda
              </p>
            ) : (
              catalogs.map((catalog) => (
                <div
                  key={catalog.id}
                  className="flex items-center justify-between p-4 bg-background/30 rounded-lg border border-border hover:bg-background/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{catalog.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(catalog.uploaded_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {catalog.is_active ? (
                      <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">
                        Ativo
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleActivateCatalog(catalog.id)}
                        className="border-primary/50 hover:bg-primary/10"
                      >
                        Ativar
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Catalogo;
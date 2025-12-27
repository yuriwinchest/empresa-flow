import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useCompany } from "@/contexts/CompanyContext";
import { supabaseTatica } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ImportResults {
  categories: { imported: number; errors: number };
  clients: { imported: number; errors: number };
  suppliers: { imported: number; errors: number };
  accountsPayable: { imported: number; errors: number };
  accountsReceivable: { imported: number; errors: number };
}

export default function ImportacaoOmie() {
  const { selectedCompany } = useCompany();
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResults | null>(null);
  
  const [files, setFiles] = useState({
    categories: null as File | null,
    clientsSuppliers: null as File | null,
    accountsPayable: null as File | null,
    accountsReceivable: null as File | null,
  });

  const handleFileChange = (type: keyof typeof files) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFiles(prev => ({ ...prev, [type]: file }));
  };

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file, 'UTF-8');
    });
  };

  const handleImport = async () => {
    if (!selectedCompany?.id) {
      toast.error("Selecione uma empresa para importar os dados");
      return;
    }

    const hasAnyFile = Object.values(files).some(f => f !== null);
    if (!hasAnyFile) {
      toast.error("Selecione pelo menos um arquivo para importar");
      return;
    }

    setIsImporting(true);
    setProgress(10);
    setResults(null);

    try {
      const payload: Record<string, string | undefined> = {
        companyId: selectedCompany.id,
      };

      setProgress(20);

      if (files.categories) {
        payload.categories = await readFileContent(files.categories);
      }
      setProgress(35);

      if (files.clientsSuppliers) {
        payload.clientsSuppliers = await readFileContent(files.clientsSuppliers);
      }
      setProgress(50);

      if (files.accountsPayable) {
        payload.accountsPayable = await readFileContent(files.accountsPayable);
      }
      setProgress(65);

      if (files.accountsReceivable) {
        payload.accountsReceivable = await readFileContent(files.accountsReceivable);
      }
      setProgress(80);

      console.log('Sending import request...');
      
      const { data, error } = await supabaseTatica.functions.invoke('import-omie-data', {
        body: payload
      });

      setProgress(100);

      if (error) {
        console.error('Import error:', error);
        toast.error(`Erro na importação: ${error.message}`);
        return;
      }

      if (data?.success) {
        setResults(data.results);
        toast.success("Importação concluída com sucesso!");
      } else {
        toast.error(data?.error || "Erro desconhecido na importação");
      }

    } catch (error) {
      console.error('Import exception:', error);
      toast.error("Erro ao processar importação");
    } finally {
      setIsImporting(false);
    }
  };

  const renderResultBadge = (imported: number, errors: number) => {
    if (imported === 0 && errors === 0) return null;
    
    return (
      <div className="flex items-center gap-2 text-sm">
        {imported > 0 && (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            {imported} importados
          </span>
        )}
        {errors > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <XCircle className="h-4 w-4" />
            {errors} erros
          </span>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Importação Omie</h1>
          <p className="text-muted-foreground">
            Importe dados do sistema Omie para o sistema Tática
          </p>
        </div>

        {!selectedCompany && (
          <Alert variant="destructive">
            <AlertTitle>Empresa não selecionada</AlertTitle>
            <AlertDescription>
              Selecione uma empresa no menu superior antes de importar os dados.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Categorias
              </CardTitle>
              <CardDescription>
                Arquivo: Omie_Categorias.csv
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange('categories')}
                  disabled={isImporting}
                />
                {files.categories && (
                  <p className="text-sm text-muted-foreground">
                    {files.categories.name}
                  </p>
                )}
                {results && renderResultBadge(results.categories.imported, results.categories.errors)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Clientes e Fornecedores
              </CardTitle>
              <CardDescription>
                Arquivo: Omie_Clientes_Fornecedors.csv
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange('clientsSuppliers')}
                  disabled={isImporting}
                />
                {files.clientsSuppliers && (
                  <p className="text-sm text-muted-foreground">
                    {files.clientsSuppliers.name}
                  </p>
                )}
                {results && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Clientes:</div>
                    {renderResultBadge(results.clients.imported, results.clients.errors)}
                    <div className="text-sm font-medium">Fornecedores:</div>
                    {renderResultBadge(results.suppliers.imported, results.suppliers.errors)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Contas a Pagar
              </CardTitle>
              <CardDescription>
                Arquivo: Omie_Contas_Pagar.csv
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange('accountsPayable')}
                  disabled={isImporting}
                />
                {files.accountsPayable && (
                  <p className="text-sm text-muted-foreground">
                    {files.accountsPayable.name}
                  </p>
                )}
                {results && renderResultBadge(results.accountsPayable.imported, results.accountsPayable.errors)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Contas a Receber
              </CardTitle>
              <CardDescription>
                Arquivo: Omie_Contas_Receber.csv
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange('accountsReceivable')}
                  disabled={isImporting}
                />
                {files.accountsReceivable && (
                  <p className="text-sm text-muted-foreground">
                    {files.accountsReceivable.name}
                  </p>
                )}
                {results && renderResultBadge(results.accountsReceivable.imported, results.accountsReceivable.errors)}
              </div>
            </CardContent>
          </Card>
        </div>

        {isImporting && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processando importação...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button 
            onClick={handleImport} 
            disabled={isImporting || !selectedCompany}
            size="lg"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Iniciar Importação
              </>
            )}
          </Button>
        </div>

        {results && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-700">Importação Concluída</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">{results.categories.imported}</div>
                  <div className="text-sm text-muted-foreground">Categorias</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">{results.clients.imported}</div>
                  <div className="text-sm text-muted-foreground">Clientes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">{results.suppliers.imported}</div>
                  <div className="text-sm text-muted-foreground">Fornecedores</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">{results.accountsPayable.imported}</div>
                  <div className="text-sm text-muted-foreground">Contas a Pagar</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">{results.accountsReceivable.imported}</div>
                  <div className="text-sm text-muted-foreground">Contas a Receber</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

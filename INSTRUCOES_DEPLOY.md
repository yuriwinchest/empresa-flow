
# 🚀 Instruções de Deploy (Atualização do Sistema)

Você acabou de receber o pacote `app_update.zip` que contém todas as refatorações recentes:
1. Módulo de Faturamento (Novo)
2. Módulo de Clientes (Refatorado)
3. Módulo de Finanças > Contas a Receber (Refatorado)

## 📋 Passo a Passo para Deploy na VPS

1. **Upload**: Envie o arquivo `app_update.zip` para a pasta `/root` da sua VPS.
   - Via SCP: `scp app_update.zip root@seu-ip:/root/`
   - Ou via FileZilla/WinSCP.

2. **Acesso SSH**: Conecte-se na VPS.
   `ssh root@seu-ip`

3. **Executar Deploy**:
   Se você já enviou o arquivo `deploy_app.sh` atualizado (que está no zip), extraia-o primeiro ou rode os comandos manualmente:

   ```bash
   # 1. Instalar Unzip (caso não tenha)
   yum install unzip -y

   # 2. Limpar versão anterior (opcional mas recomendado)
   rm -rf /var/www/empresa-flow/src
   
   # 3. Extrair novos arquivos
   unzip -o /root/app_update.zip -d /var/www/empresa-flow

   # 4. Ir para a pasta
   cd /var/www/empresa-flow

   # 5. Instalar dependências novas (Zod, etc)
   npm install

   # 6. Build da Aplicação
   npm run build

   # 7. Reiniciar PM2
   pm2 restart company-flow || pm2 restart empresa-flow
   ```

## ✅ Mudanças Importantes

- As tabelas `invoices` e `invoice_items` foram criadas no Supabase.
- A aplicação agora usa `BillingService` e `FinanceService` reais.

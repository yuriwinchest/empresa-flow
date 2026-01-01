# Documentação da Infraestrutura - Empresa Flow

## Visão Geral
Este projeto está hospedado em uma VPS (Hostinger) rodando **AlmaLinux 9**.
A arquitetura foi migrada de um modelo "Backend as a Service" (Supabase Cloud) para **Self-Hosted** (Hospedagem Própria na VPS).

## 1. Banco de Dados e Backend (Supabase Self-Hosted)
Em vez de depender do Supabase Cloud (externo), instalamos a stack completa do Supabase dentro da VPS utilizando **Podman (Docker)**.

*   **Tecnologia**: Docker Compose (via Podman).
*   **Localização**: `/root/supabase`
*   **Banco de Dados**: PostgreSQL 17 (Container: `supabase-db`).
    *   Persistência: Os dados ficam salvos em volumes locais (`/root/supabase/volumes/db/data`).
    *   Segurança: O banco roda isolado em container, acessível apenas pela rede interna do Docker ou pela API.
*   **API (Kong/PostgREST)**: Roda na porta **8000**.
*   **Painel (Studio)**: Roda na porta **3000** (padrão) ou configurável.

### Por que Container (Docker)?
Utilizamos Containers para garantir que todas as dependências do Supabase (Autenticação, Realtime, Storage, Meta, Banco) rodem nas versões exatas exigidas, sem conflitar com o sistema operacional da VPS. Isso facilita backups, atualizações e garante que o ambiente de desenvolvimento seja igual ao de produção.

## 2. Aplicação Frontend (Vite/React)
A aplicação foi construída e está servida como arquivos estáticos.

*   **Localização**: `/var/www/empresa-flow`
*   **Gerenciador de Processos**: **PM2** (Mantém o site online).
*   **Porta**: **3001** (Alterada para não conflitar com o Painel do Supabase).
*   **Conexão**: O Frontend conecta-se à API do Supabase Local (`http://srv1233855.hstgr.cloud:8000`).

## 3. Segurança e Otimização
*   **Firewall**: Portas 3001 (App) e 8000 (API) liberadas no firewall.
*   **UUID ("Unit")**: O banco utiliza UUIDs para chaves primárias, garantindo unicidade global e dificultando enumeração de IDs (segurança).
*   **Proxy Reverso**: Recomenda-se configurar Apache/Nginx (cPanel) para apontar o domínio principal (Porta 80) para a porta 3001 localmente.

## Comandos Úteis (VPS)
*   **Reiniciar Supabase**: `cd /root/supabase && podman-compose restart`
*   **Logs da App**: `pm2 logs empresa-flow`
*   **Verificar Containers**: `podman ps`

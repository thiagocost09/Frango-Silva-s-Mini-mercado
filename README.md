# Silva's Frango Assado

Aplicação web para montar pedidos de retirada do Silva's Frango Assado. O frontend é React/Vite e o backend escolhido foi Node.js com Express, porque encaixa direto no stack exportado pelo Stitch/AI Studio e permite servir API e web app no mesmo deploy.

## Rodar localmente

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie `.env.example` para `.env` e ajuste telefone/endereço se quiser.

3. Rode frontend e backend juntos:

   ```bash
   npm run dev:full
   ```

   Frontend: `http://localhost:3000`  
   API: `http://localhost:3333/api`

## Produção

```bash
npm run build
npm start
```

O Express serve os arquivos de `dist/` e mantém as rotas da API no mesmo domínio.

## Publicar no Render com Supabase grátis

Este projeto já inclui `render.yaml` para criar um Web Service Node no Render usando o plano grátis. Os dados persistentes ficam no Supabase, não no disco do Render.

### 1. Criar o banco no Supabase

1. Crie um projeto em `https://supabase.com`.
2. Abra `SQL Editor`.
3. Cole e execute o conteúdo de `supabase/schema.sql`.
4. Em `Project Settings > Data API`, copie o `Project URL`.
5. Em `Project Settings > API Keys`, copie a `service_role` ou `secret` key. Use essa chave apenas no Render, nunca no frontend.

### 2. Configurar o Render

1. Suba este projeto para um repositório no GitHub.
2. No Render, crie um novo `Blueprint` apontando para esse repositório.
3. O Render vai ler `render.yaml`.
4. Configure as variáveis secretas:

   ```text
   ADMIN_PASSWORD=troque-esta-senha
   SUPABASE_URL=https://SEU-PROJETO.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-ou-secret
   ```

O `render.yaml` já configura:

```text
Build Command: npm ci && npm run build
Start Command: npm start
Plan: free
```

Na primeira inicialização com Supabase vazio, o backend copia o cardápio e os horários padrão de `data/` para o banco. Depois disso, pedidos, produtos, horários, estoque e fotos ficam salvos no Supabase.

## Painel Admin

Com a aplicação rodando, acesse:

```text
http://localhost:3000/admin
```

A senha padrão local está em `.env.example`:

```text
ADMIN_PASSWORD="admin123"
```

Troque essa senha no arquivo `.env` antes de publicar o projeto.

O painel administrativo permite:

- acompanhar pedidos recentes e mudar status;
- exportar relatório CSV de pedidos;
- editar, cadastrar, remover e repor estoque de produtos;
- adicionar e remover horários de retirada.

## API

- `GET /api/health`
- `GET /api/menu`
- `GET /api/time-slots`
- `POST /api/orders`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:orderNumber/status`
- `GET /api/admin/menu`
- `POST /api/admin/menu`
- `PATCH /api/admin/menu/:id`
- `DELETE /api/admin/menu/:id`
- `GET /api/admin/time-slots`
- `POST /api/admin/time-slots`
- `DELETE /api/admin/time-slots/:time`
- `GET /api/orders/:orderNumber?phone=11999999999`

Em produção, os dados são gravados no Supabase quando `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão configurados. Localmente, se essas variáveis ficarem vazias, o backend usa os arquivos JSON em `data/`.

O backend recalcula preços pelo cardápio do servidor, valida telefone, horário e quantidade, e retorna o número real do pedido usado na tela final.

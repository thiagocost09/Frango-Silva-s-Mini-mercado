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

## Publicar no Render

Este projeto já inclui `render.yaml` para criar um Web Service Node no Render.

1. Suba este projeto para um repositório no GitHub.
2. No Render, crie um novo Blueprint ou Web Service apontando para esse repositório.
3. Use os comandos:

   ```text
   Build Command: npm ci && npm run build
   Start Command: npm start
   ```

4. Configure as variáveis de ambiente:

   ```text
   NODE_ENV=production
   TZ=America/Sao_Paulo
   DATA_DIR=/var/data
   STORE_NAME=Silva's Frango Assado
   STORE_ADDRESS=Avenida Paraguassú 2038, Bairro Mariluz, Imbé-RS
   STORE_WHATSAPP=5551998859501
   ADMIN_PASSWORD=troque-esta-senha
   ```

5. Anexe um disco persistente no caminho `/var/data`. Sem esse disco, os pedidos salvos em JSON podem ser perdidos quando o serviço reiniciar ou for redeployado.

Na primeira inicialização com `DATA_DIR=/var/data`, o backend copia o cardápio e os horários padrão de `data/` para o disco persistente e cria `orders.json` vazio.

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

Os pedidos são gravados em `data/orders.json`. O backend recalcula preços pelo cardápio do servidor, valida telefone, horário e quantidade, e retorna o número real do pedido usado na tela final.

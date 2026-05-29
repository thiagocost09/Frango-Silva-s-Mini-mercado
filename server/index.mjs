import 'dotenv/config';

import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

const app = express();
const PORT = Number(process.env.PORT || 3333);
const TIME_ZONE = process.env.TZ || 'America/Sao_Paulo';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const seedDataDir = path.join(rootDir, 'data');
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : seedDataDir;
const menuFile = path.join(dataDir, 'menu.json');
const timeSlotsFile = path.join(dataDir, 'time-slots.json');
const ordersFile = path.join(dataDir, 'orders.json');
const seedMenuFile = path.join(seedDataDir, 'menu.json');
const seedTimeSlotsFile = path.join(seedDataDir, 'time-slots.json');
const distDir = path.join(rootDir, 'dist');
const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const useSupabase = Boolean(supabaseUrl && supabaseServiceRoleKey);

const store = {
  name: process.env.STORE_NAME || "Silva's Frango Assado",
  address: process.env.STORE_ADDRESS || 'Avenida Paraguassú 2038, Bairro Mariluz, Imbé-RS',
  whatsapp: onlyDigits(process.env.STORE_WHATSAPP || '5551998859501'),
  currency: 'BRL',
};

app.disable('x-powered-by');
app.use(express.json({ limit: '6mb' }));

app.use((req, res, next) => {
  if (process.env.CORS_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  }

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'rotisserie-craft-api',
    storage: useSupabase ? 'supabase' : 'json',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/config', (_req, res) => {
  res.json({ store });
});

app.get('/api/menu', async (_req, res, next) => {
  try {
    const menu = await readJson(menuFile, []);
    res.json(menu.filter((item) => item.available !== false && stockOf(item) > 0));
  } catch (error) {
    next(error);
  }
});

app.get('/api/time-slots', async (req, res, next) => {
  try {
    const slots = await readJson(timeSlotsFile, []);
    const date = isDateString(req.query.date) ? req.query.date : today();

    res.json({
      date,
      slots: slots.map((time) => ({
        time,
        available: true,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/orders', requireAdmin, async (_req, res, next) => {
  try {
    const orders = await readJson(ordersFile, []);
    res.json([...orders].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/menu', requireAdmin, async (_req, res, next) => {
  try {
    res.json(await readJson(menuFile, []));
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/menu', requireAdmin, async (req, res, next) => {
  try {
    const menu = await readJson(menuFile, []);
    const item = normalizeMenuPayload(req.body, {
      id: crypto.randomUUID(),
      available: true,
      stock: 0,
    });

    menu.push(item);
    await writeJson(menuFile, menu);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/admin/menu/:id', requireAdmin, async (req, res, next) => {
  try {
    const menu = await readJson(menuFile, []);
    const itemIndex = menu.findIndex((item) => item.id === req.params.id);

    if (itemIndex === -1) {
      throw httpError(404, 'Produto não encontrado.');
    }

    menu[itemIndex] = normalizeMenuPayload(req.body, menu[itemIndex]);
    await writeJson(menuFile, menu);
    res.json(menu[itemIndex]);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/menu/:id', requireAdmin, async (req, res, next) => {
  try {
    const menu = await readJson(menuFile, []);
    const nextMenu = menu.filter((item) => item.id !== req.params.id);

    if (nextMenu.length === menu.length) {
      throw httpError(404, 'Produto não encontrado.');
    }

    await writeJson(menuFile, nextMenu);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/time-slots', requireAdmin, async (_req, res, next) => {
  try {
    res.json(await readJson(timeSlotsFile, []));
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/time-slots', requireAdmin, async (req, res, next) => {
  try {
    const time = normalizeTimeSlot(req.body?.time);
    const slots = await readJson(timeSlotsFile, []);

    if (slots.includes(time)) {
      throw httpError(409, 'Horário já cadastrado.');
    }

    const nextSlots = [...slots, time].sort();
    await writeJson(timeSlotsFile, nextSlots);
    res.status(201).json(nextSlots);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/time-slots/:time', requireAdmin, async (req, res, next) => {
  try {
    const time = normalizeTimeSlot(req.params.time);
    const slots = await readJson(timeSlotsFile, []);
    const nextSlots = slots.filter((slot) => slot !== time);

    if (nextSlots.length === slots.length) {
      throw httpError(404, 'Horário não encontrado.');
    }

    await writeJson(timeSlotsFile, nextSlots);
    res.json(nextSlots);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/admin/orders/:orderNumber/status', requireAdmin, async (req, res, next) => {
  try {
    const status = validateStatus(req.body?.status);
    const orders = await readJson(ordersFile, []);
    const orderIndex = orders.findIndex((order) => order.orderNumber === req.params.orderNumber);

    if (orderIndex === -1) {
      throw httpError(404, 'Pedido não encontrado.');
    }

    orders[orderIndex] = {
      ...orders[orderIndex],
      status,
      updatedAt: new Date().toISOString(),
    };

    await writeJson(ordersFile, orders);
    res.json(orders[orderIndex]);
  } catch (error) {
    next(error);
  }
});

app.post('/api/orders', async (req, res, next) => {
  try {
    const menu = await readJson(menuFile, []);
    const slots = await readJson(timeSlotsFile, []);
    const orders = await readJson(ordersFile, []);
    const order = buildOrder(req.body, menu, slots, orders);
    const nextMenu = decrementStock(menu, order.items);

    orders.push(order);
    await writeJson(menuFile, nextMenu);
    await writeJson(ordersFile, orders);

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

app.get('/api/orders/:orderNumber', async (req, res, next) => {
  try {
    const orders = await readJson(ordersFile, []);
    const phone = typeof req.query.phone === 'string' ? onlyDigits(req.query.phone) : '';
    const order = orders.find((item) => item.orderNumber === req.params.orderNumber);

    if (!order) {
      throw httpError(404, 'Pedido não encontrado.');
    }

    if (phone && onlyDigits(order.customer.phone) !== phone) {
      throw httpError(403, 'Telefone não confere com o pedido informado.');
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

app.use('/api', (_req, _res, next) => {
  next(httpError(404, 'Rota da API não encontrada.'));
});

if (fsSync.existsSync(distDir)) {
  app.use(express.static(distDir));
}

app.get('*', (_req, res) => {
  const indexFile = path.join(distDir, 'index.html');

  if (fsSync.existsSync(indexFile)) {
    res.sendFile(indexFile);
    return;
  }

  res
    .status(404)
    .send('Frontend não compilado. Execute "npm run build" antes de "npm start", ou use "npm run dev:full" no desenvolvimento.');
});

app.use((error, _req, res, _next) => {
  const status = Number(error.statusCode || error.status || 500);

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    error: status >= 500 ? 'Erro interno do servidor.' : error.message,
  });
});

await ensureDataFiles();

app.listen(PORT, () => {
  console.log(`Silva's Frango Assado API listening on http://localhost:${PORT}`);
});

async function ensureDataFiles() {
  if (useSupabase) {
    await ensureSupabaseData();
    return;
  }

  await fs.mkdir(dataDir, { recursive: true });

  await ensureJsonFile(menuFile, [], seedMenuFile);
  await ensureJsonFile(timeSlotsFile, [], seedTimeSlotsFile);
  await ensureJsonFile(ordersFile, []);
}

async function ensureJsonFile(targetFile, fallback, seedFile) {
  if (fsSync.existsSync(targetFile)) {
    return;
  }

  if (seedFile && fsSync.existsSync(seedFile) && path.resolve(seedFile) !== path.resolve(targetFile)) {
    await fs.copyFile(seedFile, targetFile);
    return;
  }

  await writeJson(targetFile, fallback);
}

async function readJson(file, fallback) {
  if (useSupabase) {
    return readSupabaseData(file, fallback);
  }

  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }

    throw error;
  }
}

async function writeJson(file, data) {
  if (useSupabase) {
    await writeSupabaseData(file, data);
    return;
  }

  const tempFile = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tempFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await fs.rename(tempFile, file);
}

async function ensureSupabaseData() {
  const [menu, slots] = await Promise.all([
    readSupabaseMenu(),
    readSupabaseTimeSlots(),
  ]);

  if (menu.length === 0 && fsSync.existsSync(seedMenuFile)) {
    await writeSupabaseMenu(JSON.parse(await fs.readFile(seedMenuFile, 'utf8')));
  }

  if (slots.length === 0 && fsSync.existsSync(seedTimeSlotsFile)) {
    await writeSupabaseTimeSlots(JSON.parse(await fs.readFile(seedTimeSlotsFile, 'utf8')));
  }
}

async function readSupabaseData(file, fallback) {
  if (isDataFile(file, menuFile)) {
    return readSupabaseMenu();
  }

  if (isDataFile(file, timeSlotsFile)) {
    return readSupabaseTimeSlots();
  }

  if (isDataFile(file, ordersFile)) {
    return readSupabaseOrders();
  }

  return fallback;
}

async function writeSupabaseData(file, data) {
  if (isDataFile(file, menuFile)) {
    await writeSupabaseMenu(data);
    return;
  }

  if (isDataFile(file, timeSlotsFile)) {
    await writeSupabaseTimeSlots(data);
    return;
  }

  if (isDataFile(file, ordersFile)) {
    await writeSupabaseOrders(data);
    return;
  }

  throw httpError(500, 'Arquivo de dados não mapeado para o Supabase.');
}

async function readSupabaseMenu() {
  const rows = await supabaseRequest('/menu_items?select=*&order=sort_order.asc,name.asc');
  return rows.map(menuRowToItem);
}

async function writeSupabaseMenu(menu) {
  await replaceSupabaseTable(
    'menu_items',
    'id',
    menu.map((item, index) => menuItemToRow(item, index)),
  );
}

async function readSupabaseTimeSlots() {
  const rows = await supabaseRequest('/time_slots?select=time&order=time.asc');
  return rows.map((row) => row.time);
}

async function writeSupabaseTimeSlots(slots) {
  await replaceSupabaseTable(
    'time_slots',
    'time',
    slots.map((time) => ({ time })),
  );
}

async function readSupabaseOrders() {
  const rows = await supabaseRequest('/orders?select=*&order=created_at.asc');
  return rows.map(orderRowToOrder);
}

async function writeSupabaseOrders(orders) {
  await replaceSupabaseTable('orders', 'id', orders.map(orderToRow));
}

async function replaceSupabaseTable(table, key, rows) {
  await supabaseRequest(`/${table}?${key}=not.is.null`, {
    method: 'DELETE',
    headers: {
      Prefer: 'return=minimal',
    },
  });

  if (rows.length === 0) {
    return;
  }

  await supabaseRequest(`/${table}`, {
    method: 'POST',
    headers: {
      Prefer: 'return=minimal',
    },
    body: rows,
  });
}

async function supabaseRequest(pathname, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1${pathname}`, {
    method: options.method || 'GET',
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || data?.error || response.statusText || 'Falha ao acessar o Supabase.';
    throw httpError(response.status, `Supabase: ${message}`);
  }

  return data;
}

function menuRowToItem(row) {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    description: row.description,
    image: row.image,
    category: row.category,
    tag: row.tag || undefined,
    available: row.available !== false,
    stock: Number(row.stock || 0),
  };
}

function menuItemToRow(item, sortOrder = 0) {
  return {
    id: item.id,
    name: item.name,
    price: item.price,
    description: item.description,
    image: item.image,
    category: item.category,
    tag: item.tag || null,
    available: item.available !== false,
    stock: stockOf(item),
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
  };
}

function orderRowToOrder(row) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    customer: row.customer,
    pickupDate: row.pickup_date,
    pickupTime: row.pickup_time,
    items: row.items,
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    payment: row.payment,
    store: row.store,
    notes: row.notes || '',
    whatsappUrl: row.whatsapp_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function orderToRow(order) {
  return {
    id: order.id,
    order_number: order.orderNumber,
    status: order.status,
    customer: order.customer,
    pickup_date: order.pickupDate,
    pickup_time: order.pickupTime,
    items: order.items,
    subtotal: order.subtotal,
    total: order.total,
    payment: order.payment,
    store: order.store,
    notes: order.notes || '',
    whatsapp_url: order.whatsappUrl,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  };
}

function isDataFile(file, targetFile) {
  return path.resolve(file) === path.resolve(targetFile);
}

function buildOrder(payload, menu, slots, orders) {
  if (!payload || typeof payload !== 'object') {
    throw httpError(400, 'Envie os dados do pedido em JSON.');
  }

  const customer = validateCustomer(payload.customer);
  const pickupTime = validatePickupTime(payload.pickupTime, slots);
  const items = validateItems(payload.items, menu);
  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const orderNumber = nextOrderNumber(orders);
  const createdAt = new Date().toISOString();
  const notes = typeof payload.notes === 'string' ? payload.notes.trim().slice(0, 500) : '';

  return {
    id: crypto.randomUUID(),
    orderNumber,
    status: 'confirmed',
    customer,
    pickupDate: today(),
    pickupTime,
    items: items.map(({ lineTotalCents, ...item }) => item),
    subtotal: centsToMoney(subtotalCents),
    total: centsToMoney(subtotalCents),
    payment: {
      method: 'pickup',
      status: 'pending',
      label: 'Pague na retirada',
    },
    store,
    notes,
    whatsappUrl: whatsappUrl({
      orderNumber,
      customer,
      pickupTime,
      items: items.map(({ lineTotalCents, ...item }) => item),
      total: centsToMoney(subtotalCents),
    }),
    createdAt,
    updatedAt: createdAt,
  };
}

function requireAdmin(req, _res, next) {
  const configuredPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const receivedPassword = req.get('x-admin-password') || '';

  if (receivedPassword !== configuredPassword) {
    next(httpError(401, 'Senha de administrador inválida.'));
    return;
  }

  next();
}

function validateStatus(status) {
  const allowedStatuses = ['confirmed', 'preparing', 'ready', 'completed', 'cancelled'];

  if (!allowedStatuses.includes(status)) {
    throw httpError(400, 'Status inválido.');
  }

  return status;
}

function normalizeMenuPayload(payload, currentItem) {
  const merged = {
    ...currentItem,
    ...payload,
  };

  const name = cleanText(merged.name);
  const description = cleanText(merged.description);
  const category = cleanText(merged.category);
  const image = cleanText(merged.image);
  const price = Number(merged.price);
  const stock = Number(merged.stock);
  const tag = cleanText(merged.tag || '');

  if (name.length < 2 || name.length > 120) {
    throw httpError(400, 'Nome do produto deve ter entre 2 e 120 caracteres.');
  }

  if (description.length < 3 || description.length > 500) {
    throw httpError(400, 'Descrição do produto deve ter entre 3 e 500 caracteres.');
  }

  if (category.length < 2 || category.length > 80) {
    throw httpError(400, 'Categoria inválida.');
  }

  if (!Number.isFinite(price) || price <= 0 || price > 9999) {
    throw httpError(400, 'Preço inválido.');
  }

  if (!Number.isInteger(stock) || stock < 0 || stock > 9999) {
    throw httpError(400, 'Estoque deve ser um número inteiro entre 0 e 9999.');
  }

  return {
    id: String(merged.id),
    name,
    price: centsToMoney(moneyToCents(price)),
    description,
    image: image || 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&q=80&w=800',
    category,
    tag: tag || undefined,
    available: Boolean(merged.available),
    stock,
  };
}

function normalizeTimeSlot(value) {
  const time = String(value || '').trim();

  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw httpError(400, 'Horário deve estar no formato HH:mm.');
  }

  const [hours, minutes] = time.split(':').map(Number);

  if (hours > 23 || minutes > 59) {
    throw httpError(400, 'Horário inválido.');
  }

  return time;
}

function decrementStock(menu, orderItems) {
  const quantities = new Map(orderItems.map((item) => [item.id, item.quantity]));

  return menu.map((item) => {
    const quantity = quantities.get(item.id) || 0;

    if (!quantity) {
      return item;
    }

    return {
      ...item,
      stock: Math.max(0, stockOf(item) - quantity),
    };
  });
}

function stockOf(item) {
  return Number.isInteger(Number(item.stock)) ? Number(item.stock) : 999;
}

function cleanText(value) {
  return String(value || '').trim();
}

function validateCustomer(customer) {
  if (!customer || typeof customer !== 'object') {
    throw httpError(400, 'Informe nome e telefone do cliente.');
  }

  const name = typeof customer.name === 'string' ? customer.name.trim() : '';
  const phoneDigits = onlyDigits(customer.phone || '');

  if (name.length < 2 || name.length > 120) {
    throw httpError(400, 'Nome deve ter entre 2 e 120 caracteres.');
  }

  if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    throw httpError(400, 'Telefone deve ter DDD e 10 ou 11 dígitos.');
  }

  return {
    name,
    phone: formatBrazilPhone(phoneDigits),
  };
}

function validatePickupTime(pickupTime, slots) {
  if (typeof pickupTime !== 'string' || !slots.includes(pickupTime)) {
    throw httpError(400, 'Horário de retirada inválido.');
  }

  return pickupTime;
}

function validateItems(rawItems, menu) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw httpError(400, 'Adicione ao menos um item ao pedido.');
  }

  const menuById = new Map(menu.filter((item) => item.available !== false && stockOf(item) > 0).map((item) => [item.id, item]));
  const quantities = new Map();

  for (const rawItem of rawItems) {
    const id = String(rawItem?.id || '').trim();
    const quantity = Number(rawItem?.quantity);

    if (!menuById.has(id)) {
      throw httpError(400, `Item indisponível ou inexistente: ${id || 'sem id'}.`);
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw httpError(400, 'Cada item deve ter quantidade entre 1 e 20.');
    }

    quantities.set(id, (quantities.get(id) || 0) + quantity);
  }

  return [...quantities.entries()].map(([id, quantity]) => {
    if (quantity > 20) {
      throw httpError(400, 'Quantidade máxima por item é 20.');
    }

    const menuItem = menuById.get(id);
    const priceCents = moneyToCents(menuItem.price);

    if (quantity > stockOf(menuItem)) {
      throw httpError(400, `Estoque insuficiente para ${menuItem.name}.`);
    }

    return {
      id: menuItem.id,
      name: menuItem.name,
      description: menuItem.description,
      image: menuItem.image,
      category: menuItem.category,
      price: centsToMoney(priceCents),
      quantity,
      lineTotal: centsToMoney(priceCents * quantity),
      lineTotalCents: priceCents * quantity,
    };
  });
}

function nextOrderNumber(orders) {
  const dateKey = today().replaceAll('-', '');
  const sequence = orders.filter((order) => order.orderNumber?.startsWith(`SF-${dateKey}`)).length + 1;
  return `SF-${dateKey}-${String(sequence).padStart(4, '0')}`;
}

function whatsappUrl(order) {
  const text = encodeURIComponent(whatsappMessage(order));
  return `https://wa.me/${store.whatsapp}?text=${text}`;
}

function whatsappMessage(order) {
  const items = order.items
    .map((item) => `- ${item.quantity}x ${item.name} (${formatCurrency(item.lineTotal)})`)
    .join('\n');

  return [
    `Olá! Segue o resumo do meu pedido #${order.orderNumber}:`,
    '',
    `Nome: ${order.customer.name}`,
    `Horário de retirada: ${order.pickupTime}`,
    '',
    'Itens:',
    items,
    '',
    `Total: ${formatCurrency(order.total)}`,
  ].join('\n');
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function isDateString(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function onlyDigits(value) {
  return String(value).replace(/\D/g, '');
}

function formatBrazilPhone(digits) {
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
}

function moneyToCents(value) {
  return Math.round(Number(value) * 100);
}

function centsToMoney(value) {
  return Number((value / 100).toFixed(2));
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

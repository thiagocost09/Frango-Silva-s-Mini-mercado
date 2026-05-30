import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CalendarClock,
  Download,
  Edit3,
  HelpCircle,
  ImagePlus,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings,
  ShoppingCart,
  Trash2,
  Utensils,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  createAdminMenuItem,
  createAdminTimeSlot,
  deleteAdminMenuItem,
  deleteAdminTimeSlot,
  getAdminMenu,
  getAdminOrders,
  getAdminTimeSlots,
  updateAdminMenuItem,
  updateAdminOrderStatus,
} from '../api';
import { BRAND_ADMIN_SUBTITLE, BRAND_LOGO, BRAND_NAME, BRAND_SHORT_NAME } from '../brand';
import { ConfirmedOrder, MenuItem, OrderStatus } from '../types';

type AdminSection = 'dashboard' | 'orders' | 'inventory' | 'products' | 'slots';
type OrderStatusFilter = 'all' | 'late' | OrderStatus;

interface LoadAdminDataOptions {
  silent?: boolean;
  notifyNewOrders?: boolean;
}

interface ProductFormState {
  id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  image: string;
  stock: string;
  tag: string;
  available: boolean;
}

const EMPTY_PRODUCT: ProductFormState = {
  id: '',
  name: '',
  description: '',
  price: '',
  category: 'Principal',
  image: '',
  stock: '0',
  tag: '',
  available: true,
};

const ORDER_PAGE_SIZE = 20;

const STATUSES: Array<{ value: OrderStatus; label: string }> = [
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'ready', label: 'Pronto' },
  { value: 'completed', label: 'Finalizado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const ORDER_FILTERS: Array<{ value: OrderStatusFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'late', label: 'Atrasados' },
  ...STATUSES,
];

const STATUS_STYLES: Record<OrderStatus, string> = {
  confirmed: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-yellow-100 text-yellow-900',
  ready: 'bg-green-100 text-green-800',
  completed: 'bg-stone-100 text-stone-600',
  cancelled: 'bg-red-100 text-red-800',
};

const NAV_ITEMS: Array<{ id: AdminSection; label: string; icon: React.ElementType }> = [
  { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { id: 'orders', label: 'Pedidos', icon: ListOrdered },
  { id: 'inventory', label: 'Estoque', icon: Package },
  { id: 'products', label: 'Produtos', icon: Utensils },
  { id: 'slots', label: 'Horários', icon: CalendarClock },
];

export const AdminPanel: React.FC = () => {
  const [password, setPassword] = useState(() => localStorage.getItem('rotisserie-admin-password') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(password));
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [orders, setOrders] = useState<ConfirmedOrder[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>('all');
  const [selectedOrderDate, setSelectedOrderDate] = useState(() => todayDateInputValue());
  const [orderPage, setOrderPage] = useState(1);
  const [now, setNow] = useState(() => Date.now());
  const [productForm, setProductForm] = useState<ProductFormState>(EMPTY_PRODUCT);
  const [newTime, setNewTime] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('silvas-admin-order-sound') !== 'off');
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const hasLoadedOrdersRef = useRef(false);

  const loadAdminData = async (nextPassword = password, options: LoadAdminDataOptions = {}) => {
    if (!options.silent) {
      setIsLoading(true);
      setError('');
    }

    try {
      const [nextOrders, nextMenu, nextSlots] = await Promise.all([
        getAdminOrders(nextPassword),
        getAdminMenu(nextPassword),
        getAdminTimeSlots(nextPassword),
      ]);
      const newOrders = hasLoadedOrdersRef.current
        ? nextOrders.filter((order) => !knownOrderIdsRef.current.has(order.id))
        : [];

      knownOrderIdsRef.current = new Set(nextOrders.map((order) => order.id));
      hasLoadedOrdersRef.current = true;

      if (options.notifyNewOrders && newOrders.length > 0) {
        setNotice(newOrders.length === 1 ? 'Novo pedido recebido.' : `${newOrders.length} novos pedidos recebidos.`);

        if (soundEnabled) {
          void playOrderNotification();
        }
      }

      setOrders(nextOrders);
      setMenuItems(nextMenu);
      setTimeSlots(nextSlots);
      setIsAuthenticated(true);
      localStorage.setItem('rotisserie-admin-password', nextPassword);
    } catch (loadError) {
      if (!options.silent) {
        setError(errorMessage(loadError));
        setIsAuthenticated(false);
      }
    } finally {
      if (!options.silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (password) {
      void loadAdminData(password);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !password) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void loadAdminData(password, { silent: true, notifyNewOrders: true });
    }, 20_000);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, password, soundEnabled]);

  const dateOrders = useMemo(() => (
    orders.filter((order) => order.pickupDate === selectedOrderDate)
  ), [orders, selectedOrderDate]);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return dateOrders.filter((order) => {
      const matchesStatus = orderStatusFilter === 'all'
        || (orderStatusFilter === 'late' ? isLateOrder(order, now) : order.status === orderStatusFilter);
      const matchesQuery = !normalizedQuery
        || order.orderNumber.toLowerCase().includes(normalizedQuery)
        || order.customer.name.toLowerCase().includes(normalizedQuery)
        || order.customer.phone.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [dateOrders, now, orderStatusFilter, query]);

  const filteredMenu = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery || activeSection === 'orders') {
      return menuItems;
    }

    return menuItems.filter((item) => (
      item.name.toLowerCase().includes(normalizedQuery)
      || item.category.toLowerCase().includes(normalizedQuery)
    ));
  }, [activeSection, menuItems, query]);

  const totals = useMemo(() => {
    const activeOrders = dateOrders.filter((order) => order.status !== 'cancelled');
    const pendingOrders = dateOrders.filter((order) => isPendingOrder(order)).length;
    const lateOrders = dateOrders.filter((order) => isLateOrder(order, now)).length;

    return {
      totalOrders: dateOrders.length,
      pendingOrders,
      lateOrders,
      readyOrders: dateOrders.filter((order) => order.status === 'ready').length,
      revenue: activeOrders.reduce((sum, order) => sum + order.total, 0),
      lowStock: menuItems.filter((item) => stockOf(item) <= 10).length,
    };
  }, [dateOrders, menuItems, now]);

  useEffect(() => {
    setOrderPage(1);
  }, [activeSection, orderStatusFilter, query, selectedOrderDate]);

  const orderPageCount = Math.max(1, Math.ceil(filteredOrders.length / ORDER_PAGE_SIZE));
  const currentOrderPage = Math.min(orderPage, orderPageCount);
  const paginatedOrders = filteredOrders.slice(
    (currentOrderPage - 1) * ORDER_PAGE_SIZE,
    currentOrderPage * ORDER_PAGE_SIZE,
  );
  const recentOrders = activeSection === 'orders' ? paginatedOrders : filteredOrders.slice(0, 4);

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    if (soundEnabled) {
      void unlockOrderNotificationSound();
    }
    void loadAdminData(password, { notifyNewOrders: true });
  };

  const handleLogout = () => {
    localStorage.removeItem('rotisserie-admin-password');
    setPassword('');
    setOrders([]);
    setMenuItems([]);
    setTimeSlots([]);
    knownOrderIdsRef.current = new Set();
    hasLoadedOrdersRef.current = false;
    setIsAuthenticated(false);
  };

  const handleToggleSound = () => {
    setSoundEnabled((enabled) => {
      const nextEnabled = !enabled;
      localStorage.setItem('silvas-admin-order-sound', nextEnabled ? 'on' : 'off');

      if (nextEnabled) {
        void unlockOrderNotificationSound().then(() => playOrderNotification());
      }

      return nextEnabled;
    });
  };

  const handleStatusChange = async (order: ConfirmedOrder, status: OrderStatus) => {
    setUpdatingOrder(order.orderNumber);
    setError('');

    try {
      const updatedOrder = await updateAdminOrderStatus(order.orderNumber, status, password);
      setOrders((currentOrders) => currentOrders.map((currentOrder) => (
        currentOrder.id === updatedOrder.id ? updatedOrder : currentOrder
      )));
    } catch (updateError) {
      setError(errorMessage(updateError));
    } finally {
      setUpdatingOrder('');
    }
  };

  const handlePrintTicket = (order: ConfirmedOrder) => {
    const ticketWindow = window.open('', 'silvas-frango-ticket', 'width=420,height=720');

    if (!ticketWindow) {
      setError('Permita pop-ups no navegador para imprimir o ticket.');
      return;
    }

    ticketWindow.document.open();
    ticketWindow.document.write(buildTicketHtml(order));
    ticketWindow.document.close();
    ticketWindow.focus();

    window.setTimeout(() => {
      ticketWindow.print();
    }, 250);
  };

  const handleProductSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProduct(true);
    setError('');
    setNotice('');

    const payload = productFromForm(productForm);

    try {
      if (productForm.id) {
        const updatedItem = await updateAdminMenuItem({ ...payload, id: productForm.id }, password);
        setMenuItems((currentItems) => currentItems.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
        setNotice('Produto atualizado.');
      } else {
        const createdItem = await createAdminMenuItem(payload, password);
        setMenuItems((currentItems) => [...currentItems, createdItem]);
        setNotice('Produto cadastrado.');
      }

      setProductForm(EMPTY_PRODUCT);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSavingProduct(false);
    }
  };

  const handleEditProduct = (item: MenuItem) => {
    setProductForm({
      id: item.id,
      name: item.name,
      description: item.description,
      price: String(item.price),
      category: item.category,
      image: item.image,
      stock: String(stockOf(item)),
      tag: item.tag || '',
      available: item.available !== false,
    });
    setActiveSection('products');
  };

  const handleRestock = async (item: MenuItem, amount: number) => {
    try {
      const updatedItem = await updateAdminMenuItem({ ...item, stock: Math.max(0, stockOf(item) + amount) }, password);
      setMenuItems((currentItems) => currentItems.map((currentItem) => (
        currentItem.id === updatedItem.id ? updatedItem : currentItem
      )));
    } catch (restockError) {
      setError(errorMessage(restockError));
    }
  };

  const handleDeleteProduct = async (item: MenuItem) => {
    if (!window.confirm(`Remover ${item.name}?`)) {
      return;
    }

    try {
      await deleteAdminMenuItem(item.id, password);
      setMenuItems((currentItems) => currentItems.filter((currentItem) => currentItem.id !== item.id));
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    }
  };

  const handleAddTime = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      const nextSlots = await createAdminTimeSlot(newTime, password);
      setTimeSlots(nextSlots);
      setNewTime('');
    } catch (timeError) {
      setError(errorMessage(timeError));
    }
  };

  const handleDeleteTime = async (time: string) => {
    try {
      const nextSlots = await deleteAdminTimeSlot(time, password);
      setTimeSlots(nextSlots);
    } catch (timeError) {
      setError(errorMessage(timeError));
    }
  };

  const handleExport = () => {
    const csv = [
      ['Pedido', 'Cliente', 'Telefone', 'Retirada', 'Status', 'Total'].join(','),
      ...orders.map((order) => [
        order.orderNumber,
        order.customer.name,
        order.customer.phone,
        order.pickupTime,
        statusLabel(order.status),
        order.total.toFixed(2),
      ].map(csvCell).join(',')),
    ].join('\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `rotisserie-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#fff8c9] flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="w-full max-w-md bg-white border border-yellow-200 rounded-xl p-8 shadow-[0_4px_20px_rgba(229,9,20,0.12)]">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-16 h-14 rounded-xl bg-brand-yellow overflow-hidden border-2 border-primary-rustic">
              <img src={BRAND_LOGO} alt={BRAND_NAME} className="w-full h-full object-cover object-top" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-stone-900">Painel Administrativo</h1>
              <p className="text-sm text-slate-500">{BRAND_NAME}</p>
            </div>
          </div>

          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2" htmlFor="admin-password">
            Senha
          </label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full h-14 px-4 bg-brand-yellow-soft border border-yellow-200 rounded-lg focus:ring-primary-rustic focus:border-primary-rustic outline-none"
            placeholder="Digite a senha do admin"
            required
          />

          {error && <p className="text-sm font-medium text-red-700 mt-4">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-6 w-full bg-primary-rustic text-white h-14 rounded-lg font-bold shadow-[0_4px_20px_rgba(229,9,20,0.18)] active:scale-95 transition-all disabled:opacity-60"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#fff8c9] text-stone-900"
      onClickCapture={() => {
        if (soundEnabled) {
          void unlockOrderNotificationSound();
        }
      }}
    >
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-brand-yellow-soft border-r-4 border-primary-rustic flex-col p-4 z-40 text-sm">
        <div className="mb-8 px-4">
          <div className="w-full h-24 rounded-xl overflow-hidden border-2 border-primary-rustic bg-brand-yellow mb-3">
            <img src={BRAND_LOGO} alt={BRAND_NAME} className="w-full h-full object-cover object-top" />
          </div>
          <h2 className="font-black text-brand-black text-xl tracking-tight">{BRAND_SHORT_NAME}</h2>
          <p className="text-slate-700 text-xs">{BRAND_ADMIN_SUBTITLE}</p>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => (
            <SidebarButton
              key={item.id}
              active={activeSection === item.id}
              icon={item.icon}
              label={item.label}
              onClick={() => setActiveSection(item.id)}
            />
          ))}
        </nav>

        <div className="mt-auto space-y-1 pt-4 border-t border-yellow-300">
          <button
            onClick={handleExport}
            className="w-full mb-4 bg-primary-rustic text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(229,9,20,0.16)] active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            Exportar relatório
          </button>
          <SidebarButton active={false} icon={Settings} label="Configurações" onClick={() => setActiveSection('dashboard')} />
          <SidebarButton active={false} icon={HelpCircle} label="Suporte" onClick={() => setActiveSection('dashboard')} />
          <div className="mt-4 flex items-center gap-3 px-4 py-2 bg-white rounded-xl shadow-sm border border-yellow-200">
            <div className="w-8 h-8 rounded-full bg-primary-rustic text-white flex items-center justify-center text-xs font-bold">SF</div>
            <div>
              <p className="text-xs font-bold text-slate-900">Administrador</p>
              <p className="text-[10px] text-slate-500">Acesso principal</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="lg:ml-64 min-h-screen">
        <header className="bg-brand-yellow border-b-4 border-primary-rustic flex justify-between items-center w-full px-4 md:px-8 py-4 sticky top-0 z-30 shadow-[0_4px_20px_rgba(229,9,20,0.14)]">
          <div>
            <div className="flex items-center gap-3">
              <img src={BRAND_LOGO} alt={BRAND_NAME} className="h-14 w-20 rounded-lg object-cover object-top border-2 border-primary-rustic bg-white" />
              <h1 className="text-xl md:text-4xl font-black text-brand-black tracking-tight italic">{BRAND_NAME}</h1>
            </div>
            <div className="lg:hidden flex flex-wrap gap-2 mt-3">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${activeSection === item.id ? 'bg-primary-rustic text-white' : 'bg-white text-slate-700'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <div className="relative">
              <Bell className="w-5 h-5 text-slate-400" />
              {totals.pendingOrders > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-600 rounded-full border-2 border-white" />}
            </div>
            <button
              onClick={handleToggleSound}
              className={`h-10 w-10 rounded-lg border border-yellow-300 bg-white flex items-center justify-center hover:text-primary-rustic ${
                soundEnabled ? 'text-primary-rustic' : 'text-slate-400'
              }`}
              aria-label={soundEnabled ? 'Desativar som de novos pedidos' : 'Ativar som de novos pedidos'}
              title={soundEnabled ? 'Som ligado' : 'Som desligado'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-brand-black font-bold">Pedido online</span>
              <ShoppingCart className="w-5 h-5 text-primary-rustic" />
            </div>
            <button
              onClick={() => loadAdminData(password, { notifyNewOrders: true })}
              className="h-10 w-10 rounded-lg border border-yellow-300 bg-white text-slate-600 flex items-center justify-center hover:text-primary-rustic"
              aria-label="Atualizar"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="h-10 w-10 rounded-lg border border-yellow-300 bg-white text-slate-600 flex items-center justify-center hover:text-primary-rustic"
              aria-label="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-stone-900">Painel da Loja</h2>
              <p className="text-slate-600">Gerencie pedidos, estoque, produtos e horários do dia.</p>
            </div>
            <div className="flex overflow-x-auto bg-stone-100 p-1 rounded-xl">
              {NAV_ITEMS.slice(2).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`px-5 py-2 rounded-lg font-bold whitespace-nowrap ${activeSection === item.id ? 'bg-white text-primary-rustic shadow-sm' : 'text-slate-500 hover:text-primary-rustic'}`}
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => setActiveSection('orders')}
                className={`px-5 py-2 rounded-lg font-bold whitespace-nowrap ${activeSection === 'orders' ? 'bg-white text-primary-rustic shadow-sm' : 'text-slate-500 hover:text-primary-rustic'}`}
              >
                Pedidos recentes
              </button>
            </div>
          </div>

          {(error || notice) && (
            <div className={`mb-6 rounded-lg px-4 py-3 text-sm font-bold ${error ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-green-50 text-green-800 border border-green-100'}`}>
              {error || notice}
            </div>
          )}

          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
            <Metric label="Pedidos" value={String(totals.totalOrders)} />
            <Metric label="Pendentes" value={String(totals.pendingOrders)} />
            <Metric label="Atrasados" value={String(totals.lateOrders)} />
            <Metric label="Prontos" value={String(totals.readyOrders)} />
            <Metric label="Receita" value={formatCurrency(totals.revenue)} />
          </section>

          <section className="grid grid-cols-12 gap-6">
            {(activeSection === 'dashboard' || activeSection === 'inventory') && (
              <InventoryPanel
                items={filteredMenu}
                query={query}
                onQueryChange={setQuery}
                onEdit={handleEditProduct}
                onRestock={handleRestock}
                onDelete={handleDeleteProduct}
                onNew={() => {
                  setProductForm(EMPTY_PRODUCT);
                  setActiveSection('products');
                }}
              />
            )}

            {(activeSection === 'dashboard' || activeSection === 'slots') && (
              <PickupSlotsPanel
                timeSlots={timeSlots}
                newTime={newTime}
                onNewTimeChange={setNewTime}
                onAddTime={handleAddTime}
                onDeleteTime={handleDeleteTime}
              />
            )}

            {(activeSection === 'dashboard' || activeSection === 'orders') && (
              <OrdersPanel
                orders={recentOrders}
                query={query}
                onQueryChange={setQuery}
                selectedDate={selectedOrderDate}
                onSelectedDateChange={setSelectedOrderDate}
                onTodayClick={() => setSelectedOrderDate(todayDateInputValue())}
                statusFilter={orderStatusFilter}
                onStatusFilterChange={setOrderStatusFilter}
                isFullList={activeSection === 'orders'}
                page={currentOrderPage}
                pageCount={orderPageCount}
                pageSize={ORDER_PAGE_SIZE}
                filteredCount={filteredOrders.length}
                totalCount={dateOrders.length}
                pendingCount={totals.pendingOrders}
                lateCount={totals.lateOrders}
                now={now}
                onPreviousPage={() => setOrderPage((page) => Math.max(1, page - 1))}
                onNextPage={() => setOrderPage((page) => Math.min(orderPageCount, page + 1))}
                updatingOrder={updatingOrder}
                onStatusChange={handleStatusChange}
                onPrintTicket={handlePrintTicket}
              />
            )}

            {(activeSection === 'dashboard' || activeSection === 'products') && (
              <ProductFormPanel
                form={productForm}
                isSaving={savingProduct}
                onFormChange={setProductForm}
                onSubmit={handleProductSubmit}
                onCancel={() => setProductForm(EMPTY_PRODUCT)}
              />
            )}
          </section>
        </div>

        <footer className="mt-12 w-full py-10 px-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 max-w-7xl mx-auto text-xs uppercase tracking-widest text-slate-500">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-lg font-bold text-slate-900 italic">{BRAND_NAME}</span>
            <p>© 2026 {BRAND_NAME}. Todos os direitos reservados.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <button className="hover:text-red-600 transition-colors">Política de privacidade</button>
            <button className="hover:text-red-600 transition-colors">Termos de uso</button>
            <button className="hover:text-red-600 transition-colors">Contato</button>
          </div>
        </footer>
      </main>
    </div>
  );
};

const SidebarButton: React.FC<{
  active: boolean;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}> = ({ active, icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-transform duration-200 hover:translate-x-1 ${
      active ? 'bg-primary-rustic text-white font-bold' : 'text-slate-700 hover:bg-white'
    }`}
  >
    <Icon className="w-5 h-5" />
    <span>{label}</span>
  </button>
);

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(229,9,20,0.10)] border border-yellow-200 p-5">
    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
    <p className="text-2xl font-black text-slate-900 mt-2">{value}</p>
  </div>
);

const InventoryPanel: React.FC<{
  items: MenuItem[];
  query: string;
  onQueryChange: (query: string) => void;
  onEdit: (item: MenuItem) => void;
  onRestock: (item: MenuItem, amount: number) => void;
  onDelete: (item: MenuItem) => void;
  onNew: () => void;
}> = ({ items, query, onQueryChange, onEdit, onRestock, onDelete, onNew }) => (
  <div className="col-span-12 bg-white rounded-xl shadow-[0_4px_20px_rgba(229,9,20,0.10)] overflow-hidden border border-yellow-200">
    <div className="p-5 md:p-6 border-b border-yellow-200 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between bg-brand-yellow-soft/60">
      <h3 className="text-lg font-black flex items-center gap-2">
        <Package className="w-5 h-5 text-primary-rustic" />
        Estoque atual
      </h3>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="bg-white border border-yellow-200 rounded-lg text-sm pl-9 pr-4 py-2.5 focus:ring-primary-rustic focus:border-primary-rustic outline-none"
            placeholder="Buscar produto..."
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>
        <button
          onClick={onNew}
          className="bg-primary-rustic text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Novo produto
        </button>
      </div>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[760px]">
        <thead className="bg-brand-yellow-soft/40 text-slate-600 uppercase text-[10px] tracking-widest border-b border-yellow-200">
          <tr>
            <th className="px-6 py-4">Produto</th>
            <th className="px-6 py-4">Categoria</th>
            <th className="px-6 py-4 text-center">Estoque</th>
            <th className="px-6 py-4 text-center">Preço</th>
            <th className="px-6 py-4 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-yellow-100">
          {items.map((item) => {
            const stock = stockOf(item);
            const stockPercent = Math.min(100, Math.round((stock / 50) * 100));
            const isLow = stock <= 10;

            return (
              <tr key={item.id} className="hover:bg-yellow-50/60 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-yellow-soft flex items-center justify-center overflow-hidden shrink-0">
                      <img className="w-full h-full object-cover" src={item.image} alt={item.name} />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">{item.name}</span>
                      {item.available === false && <p className="text-xs text-red-700 font-bold">Indisponível</p>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">{item.category}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex flex-col items-center">
                    <span className={`text-sm font-bold ${isLow ? 'text-red-600' : 'text-slate-900'}`}>{stock} un.</span>
                    <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div className={`${isLow ? 'bg-red-500' : 'bg-green-500'} h-full`} style={{ width: `${stockPercent}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center font-bold text-slate-900">{formatCurrency(item.price)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => onEdit(item)} className="p-2 text-slate-400 hover:text-primary-rustic transition-colors" aria-label="Editar produto">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(item)} className="p-2 text-slate-400 hover:text-red-600 transition-colors" aria-label="Remover produto">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRestock(item, 10)}
                      className={`${isLow ? 'bg-red-700' : 'bg-orange-600'} text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90`}
                    >
                      {isLow ? 'Repor urgente' : 'Repor'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

const PickupSlotsPanel: React.FC<{
  timeSlots: string[];
  newTime: string;
  onNewTimeChange: (time: string) => void;
  onAddTime: (event: React.FormEvent) => void;
  onDeleteTime: (time: string) => void;
}> = ({ timeSlots, newTime, onNewTimeChange, onAddTime, onDeleteTime }) => (
  <div className="col-span-12 md:col-span-5 bg-white rounded-xl shadow-[0_4px_20px_rgba(229,9,20,0.10)] border border-yellow-200 overflow-hidden">
    <div className="p-6 border-b border-yellow-200 bg-brand-yellow-soft/60">
      <h3 className="text-lg font-black flex items-center gap-2">
        <CalendarClock className="w-5 h-5 text-primary-rustic" />
        Gerenciar Horários
      </h3>
    </div>
    <div className="p-6">
      <form onSubmit={onAddTime} className="mb-6">
        <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="pickup-time">Cadastrar Novo Horário</label>
        <div className="flex gap-2">
          <input
            id="pickup-time"
            className="flex-1 bg-white border border-yellow-200 rounded-lg px-4 py-2.5 focus:ring-primary-rustic focus:border-primary-rustic transition-all text-sm outline-none"
            type="time"
            value={newTime}
            onChange={(event) => onNewTimeChange(event.target.value)}
            required
          />
          <button className="bg-primary-rustic text-white px-6 py-2.5 rounded-lg font-bold hover:bg-red-800 transition-colors active:scale-95 text-sm">
            Adicionar
          </button>
        </div>
      </form>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-3">Horários Disponíveis</label>
        <div className="flex flex-wrap gap-2">
          {timeSlots.map((time) => (
            <div key={time} className="group flex items-center gap-2 bg-brand-yellow-soft border border-yellow-200 px-3 py-1.5 rounded-full text-slate-700 text-sm font-bold hover:border-primary-rustic transition-colors">
              <span>{time}</span>
              <button onClick={() => onDeleteTime(time)} className="text-slate-400 hover:text-red-600 flex items-center" aria-label={`Remover horário ${time}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-4 italic font-medium">
          Os horários de retirada são exibidos para o cliente durante a finalização da compra.
        </p>
      </div>
    </div>
  </div>
);

const OrdersPanel: React.FC<{
  orders: ConfirmedOrder[];
  query: string;
  onQueryChange: (query: string) => void;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  onTodayClick: () => void;
  statusFilter: OrderStatusFilter;
  onStatusFilterChange: (status: OrderStatusFilter) => void;
  isFullList: boolean;
  page: number;
  pageCount: number;
  pageSize: number;
  filteredCount: number;
  totalCount: number;
  pendingCount: number;
  lateCount: number;
  now: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  updatingOrder: string;
  onStatusChange: (order: ConfirmedOrder, status: OrderStatus) => void;
  onPrintTicket: (order: ConfirmedOrder) => void;
}> = ({
  orders,
  query,
  onQueryChange,
  selectedDate,
  onSelectedDateChange,
  onTodayClick,
  statusFilter,
  onStatusFilterChange,
  isFullList,
  page,
  pageCount,
  pageSize,
  filteredCount,
  totalCount,
  pendingCount,
  lateCount,
  now,
  onPreviousPage,
  onNextPage,
  updatingOrder,
  onStatusChange,
  onPrintTicket,
}) => (
  <div className={`${isFullList ? 'col-span-12' : 'col-span-12 md:col-span-7'} bg-white rounded-xl shadow-[0_4px_20px_rgba(229,9,20,0.10)] border border-yellow-200 overflow-hidden`}>
    <div className="p-6 border-b border-yellow-200 bg-brand-yellow-soft/60 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-primary-rustic" />
            {isFullList ? 'Pedidos' : 'Pedidos recentes'}
          </h3>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">
            {formatDateLabel(selectedDate)} · {pendingCount} pendentes · {lateCount} atrasados · {filteredCount} exibidos de {totalCount}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => onSelectedDateChange(event.target.value || todayDateInputValue())}
              className="w-full sm:w-40 bg-white border border-yellow-200 rounded-lg text-sm px-3 py-2 font-bold text-slate-600 outline-none focus:ring-primary-rustic focus:border-primary-rustic"
              aria-label="Filtrar pedidos por data"
            />
            <button
              onClick={onTodayClick}
              className="px-3 py-2 bg-white border border-yellow-200 rounded-lg text-xs font-bold text-slate-600 hover:text-primary-rustic hover:border-primary-rustic"
            >
              Hoje
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full sm:w-56 bg-white border border-yellow-200 rounded-lg text-sm pl-9 pr-4 py-2 focus:ring-primary-rustic focus:border-primary-rustic outline-none"
              placeholder="Buscar pedido..."
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as OrderStatusFilter)}
            className="bg-white border border-yellow-200 rounded-lg text-sm px-3 py-2 font-bold text-slate-600 outline-none focus:ring-primary-rustic focus:border-primary-rustic"
          >
            {ORDER_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>{filter.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
    <ul className="divide-y divide-yellow-100">
      {orders.length === 0 ? (
        <li className="p-8 text-center text-slate-500">Nenhum pedido encontrado.</li>
      ) : (
        orders.map((order) => {
          const late = isLateOrder(order, now);

          return (
            <li key={order.id} className={`p-4 transition-colors ${late ? 'bg-red-50/70 hover:bg-red-50' : 'hover:bg-yellow-50/60'}`}>
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${late ? 'bg-red-600 text-white' : 'bg-red-50 text-primary-rustic'}`}>
                    {initials(order.customer.name)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{order.customer.name}</p>
                    <p className="text-xs text-slate-500">{order.customer.phone}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-slate-400 uppercase">Retirada</p>
                  <p className={`font-bold ${late ? 'text-red-700' : 'text-primary-rustic'}`}>{formatPickupLabel(order)}</p>
                </div>
              </div>
              <div className="bg-brand-yellow-soft/70 p-3 rounded-lg flex items-center justify-between gap-4 mb-3">
                <p className="text-xs font-medium text-slate-600 line-clamp-2">{order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')}</p>
                <span className="text-sm font-black text-slate-900 whitespace-nowrap">{formatCurrency(order.total)}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider w-fit ${STATUS_STYLES[order.status]}`}>
                    {statusLabel(order.status)}
                  </span>
                  {late && (
                    <span className="px-3 py-1 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider w-fit">
                      Atrasado
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onPrintTicket(order)}
                    className="px-3 py-1.5 bg-white border border-yellow-200 text-slate-700 text-xs font-bold rounded-lg hover:text-primary-rustic hover:border-primary-rustic transition-colors inline-flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Ticket
                  </button>
                  {order.status !== 'ready' && order.status !== 'completed' && (
                    <button
                      onClick={() => onStatusChange(order, 'ready')}
                      disabled={updatingOrder === order.orderNumber}
                      className="px-4 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      Marcar pronto
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button
                      onClick={() => onStatusChange(order, 'completed')}
                      disabled={updatingOrder === order.orderNumber}
                      className="px-4 py-1.5 bg-primary-rustic text-white text-xs font-bold rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
                    >
                      Confirmar retirada
                    </button>
                  )}
                  <select
                    value={order.status}
                    disabled={updatingOrder === order.orderNumber}
                    onChange={(event) => onStatusChange(order, event.target.value as OrderStatus)}
                    className="px-3 py-1.5 bg-white border border-yellow-200 rounded-lg text-xs font-bold text-slate-600 outline-none"
                  >
                    {STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </li>
          );
        })
      )}
    </ul>
    {isFullList && (
      <div className="border-t border-yellow-200 bg-white px-6 py-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-slate-500">
          Página {page} de {pageCount} · {pageSize} pedidos por página
        </p>
        <div className="flex gap-2">
          <button
            onClick={onPreviousPage}
            disabled={page <= 1}
            className="px-4 py-2 rounded-lg border border-yellow-200 text-sm font-bold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-primary-rustic"
          >
            Anterior
          </button>
          <button
            onClick={onNextPage}
            disabled={page >= pageCount}
            className="px-4 py-2 rounded-lg border border-yellow-200 text-sm font-bold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-primary-rustic"
          >
            Próxima
          </button>
        </div>
      </div>
    )}
  </div>
);

const ProductFormPanel: React.FC<{
  form: ProductFormState;
  isSaving: boolean;
  onFormChange: (form: ProductFormState) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
}> = ({ form, isSaving, onFormChange, onSubmit, onCancel }) => {
  const [imageError, setImageError] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setImageError('');
    setIsProcessingImage(true);

    try {
      const image = await imageFileToDataUrl(file);
      onFormChange({ ...form, image });
    } catch (error) {
      setImageError(errorMessage(error));
    } finally {
      setIsProcessingImage(false);
    }
  };

  return (
    <div className="col-span-12 md:col-span-5 bg-white rounded-xl shadow-[0_4px_20px_rgba(229,9,20,0.10)] border border-yellow-200 overflow-hidden">
    <div className="p-6 border-b border-yellow-200 bg-brand-yellow-soft/60">
      <h3 className="text-lg font-black flex items-center gap-2">
        <Plus className="w-5 h-5 text-primary-rustic" />
        {form.id ? 'Editar produto' : 'Adicionar produto'}
      </h3>
    </div>
    <form onSubmit={onSubmit} className="p-6 space-y-4">
      <Field label="Nome do produto">
        <input
          className="admin-input"
          placeholder="Ex: Frango com Mel"
          type="text"
          value={form.name}
          onChange={(event) => onFormChange({ ...form, name: event.target.value })}
          required
        />
      </Field>
      <Field label="Descrição">
        <textarea
          className="admin-input min-h-24"
          placeholder="Descreva os sabores e ingredientes..."
          value={form.description}
          onChange={(event) => onFormChange({ ...form, description: event.target.value })}
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Preço (R$)">
          <input
            className="admin-input"
            placeholder="0.00"
            step="0.01"
            type="number"
            value={form.price}
            onChange={(event) => onFormChange({ ...form, price: event.target.value })}
            required
          />
        </Field>
        <Field label="Estoque">
          <input
            className="admin-input"
            placeholder="0"
            type="number"
            value={form.stock}
            onChange={(event) => onFormChange({ ...form, stock: event.target.value })}
            required
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Categoria">
          <select
            className="admin-input"
            value={form.category}
            onChange={(event) => onFormChange({ ...form, category: event.target.value })}
          >
            <option>Principal</option>
            <option>Acompanhamento</option>
            <option>Sobremesa</option>
            <option>Bebida</option>
          </select>
        </Field>
        <Field label="Tag">
          <input
            className="admin-input"
            placeholder="Ex: MAIS PEDIDO"
            value={form.tag}
            onChange={(event) => onFormChange({ ...form, tag: event.target.value })}
          />
        </Field>
      </div>
      <div>
        <span className="block text-sm font-bold text-slate-700 mb-2">Foto do produto</span>
        <div className="rounded-xl border border-yellow-200 bg-brand-yellow-soft/40 p-3">
          {form.image && (
            <div className="mb-3 aspect-video overflow-hidden rounded-lg bg-white border border-yellow-200">
              <img src={form.image} alt={form.name || 'Produto'} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="flex-1 h-12 rounded-lg bg-white border border-yellow-300 text-primary-rustic font-bold text-sm flex items-center justify-center gap-2 cursor-pointer hover:border-primary-rustic transition-colors">
              <ImagePlus className="w-4 h-4" />
              {isProcessingImage ? 'Preparando foto...' : form.image ? 'Trocar foto' : 'Escolher foto'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageChange}
                className="sr-only"
                disabled={isProcessingImage}
              />
            </label>
            {form.image && (
              <button
                type="button"
                onClick={() => onFormChange({ ...form, image: '' })}
                className="h-12 px-4 rounded-lg border border-yellow-300 bg-white text-slate-600 font-bold text-sm hover:text-primary-rustic"
              >
                Remover
              </button>
            )}
          </div>
          {imageError && <p className="mt-2 text-xs font-bold text-red-700">{imageError}</p>}
        </div>
      </div>
      <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
        <input
          type="checkbox"
          checked={form.available}
          onChange={(event) => onFormChange({ ...form, available: event.target.checked })}
          className="rounded border-yellow-200 text-primary-rustic focus:ring-primary-rustic"
        />
        Produto disponível no cardápio
      </label>
      <div className="flex gap-3">
        <button
          className="flex-1 bg-primary-rustic text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(229,9,20,0.20)] hover:bg-red-800 transition-colors active:scale-95 disabled:opacity-60"
          type="submit"
          disabled={isSaving || isProcessingImage}
        >
          {isSaving ? 'Salvando...' : form.id ? 'Salvar produto' : 'Cadastrar produto'}
        </button>
        {form.id && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-3 rounded-xl border border-yellow-200 text-slate-600 font-bold hover:text-primary-rustic"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="block text-sm font-bold text-slate-700 mb-1">{label}</span>
    {children}
  </label>
);

const PRODUCT_IMAGE_MAX_EDGE = 1200;
const PRODUCT_IMAGE_QUALITY = 0.82;
const PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function imageFileToDataUrl(file: File) {
  if (!PRODUCT_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Escolha uma imagem em JPG, PNG ou WebP.');
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadBrowserImage(objectUrl);
    const size = scaledImageSize(image.naturalWidth || image.width, image.naturalHeight || image.height);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Não foi possível preparar a foto.');
    }

    canvas.width = size.width;
    canvas.height = size.height;
    context.drawImage(image, 0, 0, size.width, size.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (nextBlob) => (nextBlob ? resolve(nextBlob) : reject(new Error('Não foi possível preparar a foto.'))),
        'image/jpeg',
        PRODUCT_IMAGE_QUALITY,
      );
    });

    return blobToDataUrl(blob);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadBrowserImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível ler a foto escolhida.'));
    image.src = src;
  });
}

function scaledImageSize(width: number, height: number) {
  const scale = Math.min(1, PRODUCT_IMAGE_MAX_EDGE / Math.max(width, height));

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível salvar a foto.'));
    reader.readAsDataURL(blob);
  });
}

let orderNotificationAudioContext: AudioContext | null = null;

function getOrderNotificationAudioContext() {
  const AudioContextConstructor = window.AudioContext
    || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) {
    return null;
  }

  orderNotificationAudioContext ??= new AudioContextConstructor();
  return orderNotificationAudioContext;
}

async function unlockOrderNotificationSound() {
  try {
    const context = getOrderNotificationAudioContext();

    if (context?.state === 'suspended') {
      await context.resume();
    }
  } catch {
    // Browsers may block audio until the next direct user gesture.
  }
}

async function playOrderNotification() {
  try {
    const context = getOrderNotificationAudioContext();

    if (!context) {
      return;
    }

    if (context.state === 'suspended') {
      await context.resume();
    }

    playNotificationTone(context, 880, 0, 0.14);
    playNotificationTone(context, 1174.66, 0.16, 0.18);
  } catch {
    // Sound is a convenience; a blocked audio context should not affect the admin.
  }
}

function playNotificationTone(context: AudioContext, frequency: number, startOffset: number, duration: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + startOffset;
  const end = start + duration;

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.16, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(end + 0.03);
}

function productFromForm(form: ProductFormState): Omit<MenuItem, 'id'> {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    price: Number(form.price),
    category: form.category.trim(),
    image: form.image.trim(),
    stock: Number(form.stock),
    tag: form.tag.trim(),
    available: form.available,
  };
}

function stockOf(item: MenuItem) {
  return Number.isInteger(Number(item.stock)) ? Number(item.stock) : 0;
}

function todayDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number);

  if (![year, month, day].every(Number.isFinite)) {
    return 'Data selecionada';
  }

  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function isPendingOrder(order: ConfirmedOrder) {
  return order.status === 'confirmed' || order.status === 'preparing';
}

function isLateOrder(order: ConfirmedOrder, now = Date.now()) {
  if (order.status === 'completed' || order.status === 'cancelled') {
    return false;
  }

  const pickupAt = pickupDateTime(order);
  return Boolean(pickupAt && now > pickupAt.getTime());
}

function pickupDateTime(order: ConfirmedOrder) {
  const [year, month, day] = order.pickupDate.split('-').map(Number);
  const [hour, minute] = order.pickupTime.split(':').map(Number);

  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    return null;
  }

  return new Date(year, month - 1, day, hour, minute);
}

function formatPickupLabel(order: ConfirmedOrder) {
  const pickupAt = pickupDateTime(order);

  if (!pickupAt) {
    return order.pickupTime;
  }

  return `${pickupAt.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })} às ${order.pickupTime}`;
}

function statusLabel(status: OrderStatus) {
  return STATUSES.find((item) => item.value === status)?.label || status;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] || 'R'}${parts[1]?.[0] || 'C'}`.toUpperCase();
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function buildTicketHtml(order: ConfirmedOrder) {
  const printedAt = new Date();
  const pickupAt = pickupDateTime(order);
  const pickupLabel = pickupAt
    ? `${pickupAt.toLocaleDateString('pt-BR')} ${order.pickupTime}`
    : order.pickupTime;
  const items = order.items.map((item) => `
    <div class="item">
      <div class="item-name">${escapeHtml(`${item.quantity} - ${item.name}`)}</div>
      <div class="item-total">${escapeHtml(formatCurrency(item.lineTotal))}</div>
    </div>
  `).join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Ticket ${escapeHtml(order.orderNumber)}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 4mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: #fff;
      color: #000;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      font-weight: 900;
      line-height: 1.3;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .ticket {
      width: 72mm;
      margin: 0 auto;
    }

    h1 {
      margin: 0 0 8px;
      text-align: center;
      font-size: 16px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .center {
      text-align: center;
    }

    .row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin: 2px 0;
      font-weight: 900;
    }

    .separator {
      border-top: 2px dashed #000;
      margin: 8px 0;
    }

    .item {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      margin: 5px 0;
      font-weight: 900;
    }

    .item-name {
      overflow-wrap: anywhere;
      font-weight: 900;
    }

    .item-total {
      white-space: nowrap;
      text-align: right;
      font-weight: 900;
    }

    .total {
      font-size: 15px;
      font-weight: 900;
    }

    .muted {
      font-size: 12px;
      font-weight: 900;
    }

    @media screen {
      body {
        padding: 16px;
      }

      .ticket {
        border: 1px solid #ddd;
        padding: 12px;
      }
    }
  </style>
</head>
<body>
  <main class="ticket">
    <h1>${escapeHtml(order.store?.name || BRAND_NAME)}</h1>
    <div class="separator"></div>
    <div class="row">
      <span>Pedido</span>
      <strong>#${escapeHtml(order.orderNumber)}</strong>
    </div>
    <div class="row">
      <span>Data</span>
      <span>${escapeHtml(formatTicketDateTime(printedAt))}</span>
    </div>
    <div class="row">
      <span>Retirada</span>
      <span>${escapeHtml(pickupLabel)}</span>
    </div>
    <div class="separator"></div>
    <div class="center muted">ITENS</div>
    ${items}
    <div class="separator"></div>
    <div class="row total">
      <span>Total</span>
      <span>${escapeHtml(formatCurrency(order.total))}</span>
    </div>
    <div class="separator"></div>
    <div class="center muted">Impresso pelo painel administrativo</div>
  </main>
</body>
</html>`;
}

function formatTicketDateTime(date: Date) {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(value: string) {
  const replacements: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return value.replace(/[&<>"']/g, (char) => replacements[char]);
}

function csvCell(value: string) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível concluir a ação.';
}

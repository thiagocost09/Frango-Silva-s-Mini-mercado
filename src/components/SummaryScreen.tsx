import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, Clock, Info, MapPin, MessageSquare, Phone, ShoppingBag, User } from 'lucide-react';
import { BRAND_NAME, BRAND_WHATSAPP } from '../brand';
import { ConfirmedOrder } from '../types';

const STORE_ADDRESS = 'Avenida Paraguassú 2038, Bairro Mariluz, Imbé-RS';

interface SummaryScreenProps {
  order: ConfirmedOrder;
  onBackToMenu: () => void;
}

export const SummaryScreen: React.FC<SummaryScreenProps> = ({ order, onBackToMenu }) => {
  const pickupName = order.store.name?.includes('Rotisserie') ? BRAND_NAME : order.store.name || BRAND_NAME;
  const pickupAddress = isOldPlaceholderAddress(order.store.address) ? STORE_ADDRESS : order.store.address;
  const whatsappUrl = buildWhatsappUrl(order);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-20 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-8 flex justify-center"
      >
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
      </motion.div>

      <h1 className="text-4xl md:text-5xl font-black text-stone-800 mb-4">Pedido Confirmado!</h1>
      <p className="text-lg text-stone-500 mb-8 max-w-xl mx-auto">
        Tudo certo, {order.customer.name}! Seu frango assado está reservado e começará a ser preparado em breve.
      </p>

      <div className="flex flex-col sm:flex-row justify-center gap-3 mb-12">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="bg-[#25D366] hover:bg-[#128C7E] text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95"
        >
          <MessageSquare className="w-6 h-6" />
          Enviar resumo no WhatsApp
        </a>
        <button
          onClick={onBackToMenu}
          className="bg-white border border-stone-200 text-stone-700 px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all hover:border-primary-rustic hover:text-primary-rustic"
        >
          <ArrowLeft className="w-5 h-5" />
          Novo pedido
        </button>
      </div>

      <div className="bg-white rounded-3xl rustic-shadow border border-stone-100 overflow-hidden mb-12">
        <div className="bg-color-surface-warm px-8 py-4 border-b border-stone-100 flex flex-col sm:flex-row gap-2 justify-between items-center">
          <span className="font-bold text-primary-rustic">Número do Pedido: #{order.orderNumber}</span>
          <span className="text-xs font-black text-stone-400 uppercase tracking-widest">{order.payment.label}</span>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
              <MapPin className="w-3 h-3" /> Onde retirar
            </h3>
            <div className="space-y-1">
              <p className="font-bold text-stone-800">{pickupName}</p>
              <p className="text-stone-500 text-sm">{pickupAddress || STORE_ADDRESS}</p>
            </div>

            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-3 h-3" /> Quando
            </h3>
            <div className="flex gap-8">
              <div>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tighter">Data</p>
                <p className="font-bold text-stone-800">{formatDate(order.pickupDate)}</p>
              </div>
              <div>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tighter">Horário</p>
                <p className="font-bold text-stone-800">{order.pickupTime}</p>
              </div>
            </div>

            <div className="pt-6 border-t border-stone-100">
              <div className="bg-brand-yellow-soft text-brand-black p-4 rounded-xl flex items-start gap-4 border border-yellow-200">
                <Info className="w-5 h-5 text-primary-rustic mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-sm mb-1">{order.payment.label}</p>
                  <p className="text-[12px] opacity-80 leading-snug">
                    O pagamento será processado diretamente no balcão no momento da retirada.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
              <User className="w-3 h-3" /> Seus dados
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-stone-600">
                <User className="w-4 h-4 text-stone-300" />
                <span className="text-sm font-medium">{order.customer.name}</span>
              </div>
              <div className="flex items-center gap-2 text-stone-600">
                <Phone className="w-4 h-4 text-stone-300" />
                <span className="text-sm font-medium">{order.customer.phone}</span>
              </div>
            </div>

            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag className="w-3 h-3" /> Resumo
            </h3>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-4 text-sm">
                  <span className="text-stone-500">{item.quantity}x {item.name}</span>
                  <span className="font-bold text-stone-800 whitespace-nowrap">R$ {item.lineTotal.toFixed(2).replace('.', ',')}</span>
                </div>
              ))}
              <div className="pt-4 border-t border-stone-100 flex justify-between items-center text-lg">
                <span className="font-bold text-stone-800">Total a pagar</span>
                <span className="font-black text-primary-rustic">R$ {order.total.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
  });
}

function isOldPlaceholderAddress(value?: string) {
  return !value
    || value.includes('Rua do Alecrim')
    || value.includes('Nova Petrópolis')
    || value === 'Retirada no balcão';
}

function buildWhatsappUrl(order: ConfirmedOrder) {
  return `https://wa.me/${BRAND_WHATSAPP}?text=${encodeURIComponent(buildWhatsappMessage(order))}`;
}

function buildWhatsappMessage(order: ConfirmedOrder) {
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

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

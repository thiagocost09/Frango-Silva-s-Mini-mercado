import React from 'react';
import { motion } from 'motion/react';
import { ShoppingCart } from 'lucide-react';
import { MenuItem } from '../types';

interface MenuScreenProps {
  items: MenuItem[];
  isLoading: boolean;
  error: string;
  onRetry: () => void;
  onAddToCart: (item: MenuItem) => void;
  cartCount: number;
  cartTotal: number;
  cartQuantities: Record<string, number>;
  onViewCart: () => void;
}

export const MenuScreen: React.FC<MenuScreenProps> = ({
  items,
  isLoading,
  error,
  onRetry,
  onAddToCart,
  cartCount,
  cartTotal,
  cartQuantities,
  onViewCart,
}) => {
  return (
    <div className="py-8 md:py-12 px-4 md:px-8">
      <section className="mb-12 max-w-7xl mx-auto">
        {isLoading && <MenuSkeleton />}

        {!isLoading && error && (
          <div className="bg-white border border-stone-100 rounded-2xl p-8 text-center rustic-shadow max-w-xl mx-auto">
            <h2 className="text-2xl font-black text-stone-800 mb-3">Não foi possível carregar o menu</h2>
            <p className="text-stone-500 mb-6">{error}</p>
            <button
              onClick={onRetry}
              className="bg-primary-rustic text-white px-8 py-4 rounded-xl font-bold shadow-[0_4px_0_0_#92030f] active:shadow-none active:translate-y-[2px] transition-all"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item, index) => {
              const stock = stockOf(item);
              const selectedQuantity = cartQuantities[item.id] || 0;
              const availableStock = Math.max(0, stock - selectedQuantity);
              const isSoldOut = availableStock <= 0;

              return (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl rustic-shadow overflow-hidden group hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {item.tag && (
                      <div className="absolute top-4 left-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${
                          item.tag === 'SPICY' ? 'bg-primary-rustic text-white' : 'bg-brand-yellow text-brand-black border border-primary-rustic'
                        }`}>
                          {item.tag}
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-4 right-4 max-w-[calc(100%-2rem)]">
                      <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black shadow-sm border ${stockBadgeClass(availableStock)}`}>
                        {stockLabel(availableStock)}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 md:p-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start mb-3">
                      <h3 className="text-xl font-bold text-stone-800 leading-tight">{item.name}</h3>
                      <span className="text-xl font-bold text-primary-rustic whitespace-nowrap">
                        R$ {item.price.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    <p className="text-stone-500 text-sm mb-5 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="mb-6 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black border ${stockBadgeClass(availableStock)}`}>
                        {stockLabel(availableStock)}
                      </span>
                      {selectedQuantity > 0 && (
                        <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-500">
                          {selectedQuantity} no pedido
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onAddToCart(item)}
                      disabled={isSoldOut}
                      className={`w-full py-4 rounded-xl font-bold transition-all ${
                        isSoldOut
                          ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
                          : 'bg-primary-rustic text-white shadow-[0_4px_0_0_#92030f] active:shadow-none active:translate-y-[2px]'
                      }`}
                    >
                      {isSoldOut ? 'Limite atingido' : 'Adicionar ao Pedido'}
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </section>

      {cartCount > 0 && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 md:px-8 py-4"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4 md:gap-8">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Itens</span>
                <span className="text-lg font-bold text-stone-800">{cartCount}</span>
              </div>
              <div className="h-10 w-px bg-stone-200 hidden sm:block"></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Total</span>
                <span className="text-lg font-bold text-primary-rustic">R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
            <button 
              onClick={onViewCart}
              className="bg-primary-rustic text-white px-8 md:px-12 py-4 rounded-xl font-bold shadow-[0_4px_0_0_#92030f] active:shadow-none active:translate-y-[2px] transition-all flex items-center gap-2"
            >
              Ver pedido
              <ShoppingCart className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

const MenuSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="bg-white rounded-2xl rustic-shadow overflow-hidden">
        <div className="aspect-[4/3] bg-stone-100 animate-pulse" />
        <div className="p-6 space-y-4">
          <div className="h-5 bg-stone-100 rounded animate-pulse" />
          <div className="h-16 bg-stone-100 rounded animate-pulse" />
          <div className="h-14 bg-stone-100 rounded-xl animate-pulse" />
        </div>
      </div>
    ))}
  </div>
);

function stockOf(item: MenuItem) {
  const stock = Number(item.stock);
  return Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0;
}

function stockLabel(stock: number) {
  if (stock <= 0) {
    return 'Esgotado';
  }

  if (stock === 1) {
    return '1 un. disponível';
  }

  return `${stock} un. disponíveis`;
}

function stockBadgeClass(stock: number) {
  if (stock <= 0) {
    return 'bg-stone-100 text-stone-500 border-stone-200';
  }

  if (stock <= 5) {
    return 'bg-red-50 text-primary-rustic border-red-200';
  }

  return 'bg-brand-yellow text-brand-black border-primary-rustic';
}

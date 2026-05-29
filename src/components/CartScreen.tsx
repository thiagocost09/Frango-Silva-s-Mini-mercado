import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Plus, Minus } from 'lucide-react';
import { CartItem } from '../types';
import { StepIndicator } from './Common';

interface CartScreenProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onNext: () => void;
}

export const CartScreen: React.FC<CartScreenProps> = ({ items, onUpdateQuantity, onNext }) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
      <StepIndicator current={1} />
      
      <div className="mt-8 mb-24">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-stone-800">Seu Pedido</h1>
        </div>

        <div className="space-y-6">
          {items.map((item) => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white shadow-sm rounded-2xl overflow-hidden flex border border-stone-100 group transition-all hover:rustic-shadow"
            >
              <div className="w-24 h-24 md:w-32 md:h-32 shrink-0">
                <img className="w-full h-full object-cover" src={item.image} alt={item.name} />
              </div>
              <div className="p-4 md:p-6 flex flex-col justify-between flex-grow">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="text-base md:text-lg font-bold text-stone-800">{item.name}</h3>
                    <span className="text-primary-rustic font-bold text-sm md:text-base">R$ {item.price.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <p className="text-stone-400 text-xs md:text-sm mt-1 line-clamp-2">
                    {item.description}
                  </p>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-3 bg-stone-50 rounded-lg p-1">
                    <button 
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      className="p-1 hover:bg-white rounded-md transition-colors text-stone-400"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-stone-700 min-w-[20px] text-center text-sm">{item.quantity}</span>
                    <button 
                       onClick={() => onUpdateQuantity(item.id, 1)}
                      className="p-1 hover:bg-white rounded-md transition-colors text-stone-400"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Floating Summary Footer */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 md:px-8 py-4"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none mb-1">Subtotal</span>
              <span className="text-sm font-medium text-stone-500">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="h-10 w-px bg-stone-200 hidden sm:block"></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none mb-1">Total</span>
              <span className="text-lg md:text-xl font-black text-primary-rustic">R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
          <button 
            onClick={onNext}
            className="bg-primary-rustic text-white px-8 md:px-12 py-4 rounded-xl font-bold shadow-[0_4px_0_0_#92030f] active:shadow-none active:translate-y-[2px] transition-all flex items-center gap-2"
          >
            Concluir
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Calendar, Check, Info } from 'lucide-react';
import { CartItem, TimeSlot } from '../types';
import { StepIndicator } from './Common';

interface TimeScreenProps {
  timeSlots: TimeSlot[];
  pickupDate: string;
  selectedTime: string;
  isSubmitting: boolean;
  error: string;
  onSelect: (time: string) => void;
  onNext: () => void;
  cartItems: CartItem[];
}

export const TimeScreen: React.FC<TimeScreenProps> = ({
  timeSlots,
  pickupDate,
  selectedTime,
  isSubmitting,
  error,
  onSelect,
  onNext,
  cartItems,
}) => {
  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
      <StepIndicator current={3} />

      <div className="mt-8 mb-24">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-stone-800 mb-2">Escolha o Horário de Retirada</h1>
          <p className="text-lg text-stone-500 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-stone-400" />
            Para {formatPickupDate(pickupDate)}
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {timeSlots.map((slot) => {
            const isSelected = selectedTime === slot.time;

            return (
              <button
                key={slot.time}
                disabled={!slot.available || isSubmitting}
                onClick={() => onSelect(slot.time)}
                className={`p-6 border-2 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95 ${
                  isSelected
                    ? 'border-primary-rustic bg-primary-rustic/5 ring-4 ring-primary-rustic/5'
                    : 'border-stone-100 bg-white hover:border-primary-rustic/30 hover:rustic-shadow'
                } ${!slot.available ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <span className={`text-2xl font-black ${isSelected ? 'text-primary-rustic' : 'text-stone-800'}`}>
                  {slot.time}
                </span>
                {isSelected && (
                  <span className="text-[10px] font-bold text-primary-rustic uppercase tracking-widest flex items-center gap-1">
                    <Check className="w-3 h-3" /> Selecionado
                  </span>
                )}
                {!slot.available && (
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                    Esgotado
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-6 bg-red-50 text-red-900 border border-red-100 rounded-xl px-5 py-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedTime && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 md:px-8 py-4"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none mb-1">Total do pedido</span>
                <span className="text-lg font-black text-primary-rustic">R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>
              <button
                disabled={isSubmitting}
                onClick={onNext}
                className="bg-primary-rustic text-white px-8 md:px-12 py-4 rounded-xl font-bold shadow-[0_4px_0_0_#92030f] active:shadow-none active:translate-y-[2px] transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Confirmando...' : 'Concluir'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function formatPickupDate(value: string) {
  if (!value) {
    return 'hoje';
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
  });
}

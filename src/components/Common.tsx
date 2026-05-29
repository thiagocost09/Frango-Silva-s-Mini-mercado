import React from 'react';
import { ChevronLeft, Lock } from 'lucide-react';
import { BRAND_LOGO, BRAND_NAME } from '../brand';
import { CheckoutStep } from '../types';

interface HeaderProps {
  currentStep: CheckoutStep;
  onGoBack?: () => void;
  cartCount: number;
}

export const Header: React.FC<HeaderProps> = ({ currentStep, onGoBack }) => {
  const isCheckout = ['id', 'time', 'summary', 'cart'].includes(currentStep);

  return (
    <header className="relative bg-brand-yellow border-b-4 border-primary-rustic shadow-sm h-20 w-full font-display">
      <div className="flex justify-between items-center px-4 md:px-8 h-full w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          {onGoBack && currentStep !== 'menu' && currentStep !== 'summary' && (
            <button
              onClick={onGoBack}
              className="p-2 hover:bg-stone-100 rounded-full transition-colors md:hidden"
              aria-label="Voltar"
            >
              <ChevronLeft className="w-5 h-5 text-primary-rustic" />
            </button>
          )}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => window.location.reload()}
          >
            <img
              src={BRAND_LOGO}
              alt={BRAND_NAME}
              className="h-12 w-16 rounded-lg object-cover object-top border-2 border-primary-rustic bg-white"
            />
            <span className="text-lg md:text-2xl font-black tracking-tight text-brand-black">
              {BRAND_NAME}
            </span>
          </div>
        </div>

        {!isCheckout ? (
          <nav className="hidden md:flex items-center gap-8">
            <a className="text-brand-black font-bold border-b-2 border-primary-rustic pb-1" href="#">Menu</a>
          </nav>
        ) : (
          <div className="hidden md:flex items-center gap-4 text-stone-600">
            <Lock className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-bold">Pagamento Seguro</span>
          </div>
        )}

        <div className="hidden md:flex items-center" />
      </div>
    </header>
  );
};

export const StepIndicator: React.FC<{ current: number }> = ({ current }) => (
  <div className="mb-8 md:mb-12 flex items-center justify-center w-full max-w-3xl mx-auto px-4">
    <div className="flex items-center w-full">
      <StepBubble index={1} label="Carrinho" current={current} />
      <StepLine active={current > 1} />
      <StepBubble index={2} label="Identificação" current={current} />
      <StepLine active={current > 2} />
      <StepBubble index={3} label="Horário" current={current} />
      <StepLine active={current > 3} />
      <StepBubble index={4} label="Resumo" current={current} />
    </div>
  </div>
);

const StepBubble: React.FC<{ index: number; label: string; current: number }> = ({ index, label, current }) => (
  <div className="flex flex-col items-center">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${current >= index ? 'bg-primary-rustic border-primary-rustic text-white' : 'bg-white border-stone-200 text-stone-300'}`}>
      {current > index ? '✓' : index}
    </div>
    <span className={`mt-2 text-[10px] md:text-xs font-bold uppercase tracking-wider ${current >= index ? 'text-primary-rustic' : 'text-stone-300'}`}>
      {label}
    </span>
  </div>
);

const StepLine: React.FC<{ active: boolean }> = ({ active }) => (
  <div className={`flex-grow h-0.5 mx-2 md:mx-4 transition-colors ${active ? 'bg-primary-rustic' : 'bg-stone-200'}`} />
);

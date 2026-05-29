import React from 'react';
import { ArrowRight, Phone, ShoppingBasket } from 'lucide-react';
import { UserInfo } from '../types';
import { StepIndicator } from './Common';

interface IdScreenProps {
  userInfo: UserInfo;
  onUpdate: (info: UserInfo) => void;
  onNext: () => void;
}

export const IdScreen: React.FC<IdScreenProps> = ({ userInfo, onUpdate, onNext }) => {
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');

    if (digits.length <= 11) {
      let masked = digits;
      if (digits.length > 0) masked = `(${digits.slice(0, 2)}`;
      if (digits.length > 2) masked += `) ${digits.slice(2, 7)}`;
      if (digits.length > 7) masked += `-${digits.slice(7, 11)}`;
      return masked;
    }

    return value.slice(0, 15);
  };

  const isPhoneValid = userInfo.phone.replace(/\D/g, '').length === 11;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (userInfo.name && isPhoneValid) {
      onNext();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
      <StepIndicator current={2} />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start mt-8">
        <div className="md:col-span-7 lg:col-span-6 space-y-8">
          <div className="bg-white rounded-3xl p-6 md:p-10 rustic-shadow border border-stone-100">
            <p className="text-lg text-stone-500 mb-10">Informe seus dados para prosseguirmos com seu pedido.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest px-1" htmlFor="nome">
                  Nome Completo
                </label>
                <input
                  required
                  className="w-full h-16 px-6 bg-color-surface-warm border border-stone-200 rounded-xl focus:ring-4 focus:ring-primary-rustic/10 focus:border-primary-rustic outline-none transition-all font-medium placeholder:text-stone-300"
                  id="nome"
                  value={userInfo.name}
                  onChange={(event) => onUpdate({ ...userInfo, name: event.target.value })}
                  placeholder="Como podemos te chamar?"
                  type="text"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest px-1" htmlFor="phone">
                  Telefone / WhatsApp
                </label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300">
                    <Phone className="w-5 h-5" />
                  </span>
                  <input
                    required
                    className="w-full h-16 pl-14 pr-6 bg-color-surface-warm border border-stone-200 rounded-xl focus:ring-4 focus:ring-primary-rustic/10 focus:border-primary-rustic outline-none transition-all font-medium placeholder:text-stone-300"
                    id="phone"
                    value={userInfo.phone}
                    onChange={(event) => onUpdate({ ...userInfo, phone: formatPhone(event.target.value) })}
                    placeholder="(00) 00000-0000"
                    type="tel"
                  />
                </div>
                {userInfo.phone.length > 0 && !isPhoneValid && (
                  <p className="text-xs text-primary-rustic font-medium px-1">Digite um celular válido com DDD (11 dígitos).</p>
                )}
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={!userInfo.name || !isPhoneValid}
                  className="w-full bg-primary-dark hover:bg-primary-rustic text-white h-16 rounded-xl font-bold text-lg shadow-[0_4px_0_0_#410003] active:translate-y-[2px] active:shadow-[0_2px_0_0_#410003] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Concluir
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="hidden md:block md:col-span-5 lg:col-span-6 sticky top-28">
          <div className="relative rounded-3xl overflow-hidden aspect-[4/5] rustic-shadow group">
            <img
              src="https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&q=80&w=800"
              alt="Frango assado dourado"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-10">
              <h3 className="text-4xl font-black text-white mb-2">Assado no Ponto</h3>
              <p className="text-white/80 text-lg">Utilizamos temperos artesanais e lenha selecionada para garantir o sabor autêntico do campo.</p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-brand-yellow-soft rounded-2xl flex items-center gap-4 border border-yellow-200">
            <div className="p-3 bg-brand-yellow rounded-full">
              <ShoppingBasket className="w-6 h-6 text-brand-black" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-primary-rustic uppercase tracking-widest">Resumo do Pedido</p>
              <p className="font-bold text-brand-black">Seu frango assado está quase pronto!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

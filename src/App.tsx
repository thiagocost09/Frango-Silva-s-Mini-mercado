/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { createOrder, getMenu, getTimeSlots } from './api';
import { CartItem, CheckoutStep, ConfirmedOrder, MenuItem, TimeSlot, UserInfo } from './types';
import { Header } from './components/Common';
import { AdminPanel } from './components/AdminPanel';
import { MenuScreen } from './components/MenuScreen';
import { CartScreen } from './components/CartScreen';
import { IdScreen } from './components/IdScreen';
import { TimeScreen } from './components/TimeScreen';
import { SummaryScreen } from './components/SummaryScreen';

export default function App() {
  const isAdminRoute = window.location.pathname.startsWith('/admin');
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('menu');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [pickupDate, setPickupDate] = useState<string>('');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string>('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: '', phone: '' });
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrder | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string>('');

  const loadCatalog = useCallback(async () => {
    setIsLoadingCatalog(true);
    setCatalogError('');

    try {
      const [menu, slotsResponse] = await Promise.all([getMenu(), getTimeSlots()]);
      setMenuItems(menu);
      setTimeSlots(slotsResponse.slots);
      setPickupDate(slotsResponse.date);
    } catch (error) {
      setCatalogError(errorMessage(error));
    } finally {
      setIsLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const cartCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);
  const cartTotal = useMemo(() => cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cartItems]);
  const cartQuantities = useMemo<Record<string, number>>(() => (
    cartItems.reduce<Record<string, number>>((quantities, item) => {
      quantities[item.id] = item.quantity;
      return quantities;
    }, {})
  ), [cartItems]);

  const handleAddToCart = (item: MenuItem) => {
    setCartItems((prev) => {
      const stock = stockOf(item);

      if (stock <= 0) {
        return prev;
      }

      const existing = prev.find((cartItem) => cartItem.id === item.id);

      if (existing) {
        return prev.map((cartItem) => (
          cartItem.id === item.id ? { ...cartItem, quantity: Math.min(stock, cartItem.quantity + 1) } : cartItem
        ));
      }

      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCartItems((prev) => {
      const updated = prev
        .map((item) => {
          if (item.id === id) {
            return { ...item, quantity: Math.min(stockOf(item), Math.max(0, item.quantity + delta)) };
          }

          return item;
        })
        .filter((item) => item.quantity > 0);

      if (updated.length === 0) {
        setCurrentStep('menu');
      }

      return updated;
    });
  };

  const handleSubmitOrder = async () => {
    setOrderError('');

    if (!selectedTime) {
      setOrderError('Escolha um horário de retirada.');
      return;
    }

    if (cartItems.length === 0) {
      setOrderError('Adicione ao menos um item ao pedido.');
      setCurrentStep('menu');
      return;
    }

    setIsSubmittingOrder(true);

    try {
      const order = await createOrder({
        customer: userInfo,
        pickupTime: selectedTime,
        items: cartItems.map(({ id, quantity }) => ({ id, quantity })),
      });

      setConfirmedOrder(order);
      setCurrentStep('summary');
    } catch (error) {
      setOrderError(errorMessage(error));
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const goBack = () => {
    const steps: CheckoutStep[] = ['menu', 'cart', 'id', 'time', 'summary'];
    const currentIndex = steps.indexOf(currentStep);
    setOrderError('');

    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const resetOrder = () => {
    setCartItems([]);
    setUserInfo({ name: '', phone: '' });
    setSelectedTime('');
    setConfirmedOrder(null);
    setOrderError('');
    setCurrentStep('menu');
  };

  const renderScreen = () => {
    switch (currentStep) {
      case 'menu':
        return (
          <MenuScreen
            items={menuItems}
            isLoading={isLoadingCatalog}
            error={catalogError}
            onRetry={loadCatalog}
            onAddToCart={handleAddToCart}
            cartCount={cartCount}
            cartTotal={cartTotal}
            cartQuantities={cartQuantities}
            onViewCart={() => setCurrentStep('cart')}
          />
        );
      case 'cart':
        return (
          <CartScreen
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onNext={() => setCurrentStep('id')}
          />
        );
      case 'id':
        return (
          <IdScreen
            userInfo={userInfo}
            onUpdate={setUserInfo}
            onNext={() => setCurrentStep('time')}
          />
        );
      case 'time':
        return (
          <TimeScreen
            cartItems={cartItems}
            timeSlots={timeSlots}
            pickupDate={pickupDate}
            selectedTime={selectedTime}
            isSubmitting={isSubmittingOrder}
            error={orderError}
            onSelect={setSelectedTime}
            onNext={handleSubmitOrder}
          />
        );
      case 'summary':
        return confirmedOrder ? (
          <SummaryScreen
            order={confirmedOrder}
            onBackToMenu={resetOrder}
          />
        ) : null;
      default:
        return null;
    }
  };

  if (isAdminRoute) {
    return <AdminPanel />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fff8c9]">
      <Header
        currentStep={currentStep}
        onGoBack={goBack}
        cartCount={cartCount}
      />

      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Algo deu errado. Tente novamente.';
}

function stockOf(item: MenuItem) {
  const stock = Number(item.stock);
  return Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0;
}

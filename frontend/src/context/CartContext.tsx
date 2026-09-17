import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@/utils/storage';

export interface CartProduct {
  id: string;
  title: string;
  price: string;
  category?: string;
  craft_type?: string;
  image_url?: string;
  artisan_id?: string;
  artisan_name?: string;
  units?: number;
}

export interface CartItem {
  id: string; // cart item unique id or product id
  product: CartProduct;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (product: CartProduct, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  isCartLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const CART_STORAGE_KEY = '@artisan_cart_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartLoading, setIsCartLoading] = useState(true);

  // Load persisted cart on startup
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setCart(parsed);
          }
        }
      } catch (err) {
        console.warn('[CartContext] Failed to load cart from storage:', err);
      } finally {
        setIsCartLoading(false);
      }
    })();
  }, []);

  // Save cart to storage whenever it changes
  const persistCart = async (newCart: CartItem[]) => {
    setCart(newCart);
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newCart));
    } catch (err) {
      console.warn('[CartContext] Failed to save cart to storage:', err);
    }
  };

  const addToCart = (product: CartProduct, quantity: number = 1) => {
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    let updated: CartItem[];

    if (existingIndex >= 0) {
      updated = cart.map((item, index) =>
        index === existingIndex
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      updated = [
        ...cart,
        {
          id: `${product.id}-${Date.now()}`,
          product,
          quantity: Math.max(1, quantity),
        },
      ];
    }
    persistCart(updated);
  };

  const removeFromCart = (productId: string) => {
    const updated = cart.filter((item) => item.product.id !== productId);
    persistCart(updated);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const updated = cart.map((item) =>
      item.product.id === productId ? { ...item, quantity } : item
    );
    persistCart(updated);
  };

  const clearCart = () => {
    persistCart([]);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const cartTotal = cart.reduce((sum, item) => {
    const rawPrice = item.product.price ? item.product.price.replace(/[^0-9.]/g, '') : '0';
    const numPrice = parseFloat(rawPrice) || 0;
    return sum + numPrice * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        cartTotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

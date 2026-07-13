import { createContext, useContext, ReactNode, useEffect } from "react";
import { useCart, CartItem } from "@/hooks/useCart";
import { useAuthContext } from "@/contexts/AuthContext";

interface CartContextType {
  items: CartItem[];
  isLoading: boolean;
  addItem: (productId: string, quantity?: number, options?: { packagingOptionId?: string | null }) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  subtotal: number;
  itemCount: number;
  refetch: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuthContext();
  const cart = useCart(user?.id ?? null);

  // Sync local cart when user logs in
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      cart.syncLocalCartToSupabase(user.id).then(() => {
        cart.refetch();
      });
    }
  }, [isAuthenticated, user?.id]);

  return (
    <CartContext.Provider value={cart}>
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCartContext must be used within a CartProvider");
  }
  return context;
}

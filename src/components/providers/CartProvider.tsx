"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem, Product } from "@/lib/types";

interface CartValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (p: Product, opts: { size: string | null; color: string | null; qty?: number }) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  wishlist: number[];
  toggleWishlist: (id: number) => void;
  inWishlist: (id: number) => boolean;
  hydrated: boolean;
}

const CartContext = createContext<CartValue | null>(null);
const CART_KEY = "celine.cart.v1";
const WISH_KEY = "celine.wishlist.v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [isOpen, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Hydrate from localStorage after mount (server render has no storage).
    try {
      const c = localStorage.getItem(CART_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (c) setItems(JSON.parse(c));
      const w = localStorage.getItem(WISH_KEY);
      if (w) setWishlist(JSON.parse(w));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(WISH_KEY, JSON.stringify(wishlist));
    } catch {}
  }, [wishlist, hydrated]);

  const add = useCallback<CartValue["add"]>((p, { size, color, qty = 1 }) => {
    const key = `${p.id}|${size ?? ""}|${color ?? ""}`;
    setItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i));
      return [
        ...prev,
        { key, productId: p.id, slug: p.slug, name: p.name, price: p.price, image: p.images[0], size, color, qty },
      ];
    });
    setOpen(true);
  }, []);

  const remove = useCallback((key: string) => setItems((prev) => prev.filter((i) => i.key !== key)), []);
  const setQty = useCallback(
    (key: string, qty: number) =>
      setItems((prev) => (qty <= 0 ? prev.filter((i) => i.key !== key) : prev.map((i) => (i.key === key ? { ...i, qty } : i)))),
    [],
  );
  const clear = useCallback(() => setItems([]), []);
  const toggleWishlist = useCallback(
    (id: number) => setWishlist((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [],
  );

  const value = useMemo<CartValue>(
    () => ({
      items,
      count: items.reduce((s, i) => s + i.qty, 0),
      subtotal: items.reduce((s, i) => s + i.qty * i.price, 0),
      add,
      remove,
      setQty,
      clear,
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      wishlist,
      toggleWishlist,
      inWishlist: (id) => wishlist.includes(id),
      hydrated,
    }),
    [items, isOpen, wishlist, add, remove, setQty, clear, toggleWishlist, hydrated],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

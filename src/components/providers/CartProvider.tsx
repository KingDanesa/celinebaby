"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem, Product } from "@/lib/types";
import { refreshPromoAction } from "@/lib/actions/promo";

export interface AppliedPromo {
  code: string;
  percent: number;
}

interface CartValue {
  items: CartItem[];
  count: number;
  /** Goods before any discount. */
  subtotal: number;
  /** Promo code applied in the cart; re-checked by the server when the order is placed. */
  promo: AppliedPromo | null;
  setPromo: (p: AppliedPromo | null) => void;
  discount: number;
  /** What the customer pays for the goods. */
  total: number;
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
const PROMO_KEY = "celine.promo.v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [isOpen, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [promo, setPromo] = useState<AppliedPromo | null>(null);

  useEffect(() => {
    // Hydrate from localStorage after mount (server render has no storage).
    try {
      const c = localStorage.getItem(CART_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (c) setItems(JSON.parse(c));
      const w = localStorage.getItem(WISH_KEY);
      if (w) setWishlist(JSON.parse(w));
      const pr = localStorage.getItem(PROMO_KEY);
      if (pr) {
        const saved: AppliedPromo = JSON.parse(pr);
        setPromo(saved);
        // The code may have expired or changed since it was applied.
        refreshPromoAction(saved.code)
          .then((fresh) => {
            if (fresh === false) setPromo(null);
            else if (fresh && fresh.percent !== saved.percent) setPromo(fresh);
          })
          .catch(() => {});
      }
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

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (promo) localStorage.setItem(PROMO_KEY, JSON.stringify(promo));
      else localStorage.removeItem(PROMO_KEY);
    } catch {}
  }, [promo, hydrated]);

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
  const clear = useCallback(() => {
    setItems([]);
    setPromo(null);
  }, []);
  const toggleWishlist = useCallback(
    (id: number) => setWishlist((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [],
  );

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const discount = promo ? Math.round((subtotal * promo.percent) / 100) : 0;

  const value = useMemo<CartValue>(
    () => ({
      items,
      count: items.reduce((s, i) => s + i.qty, 0),
      subtotal,
      promo,
      setPromo,
      discount,
      total: subtotal - discount,
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
    [items, subtotal, promo, discount, isOpen, wishlist, add, remove, setQty, clear, toggleWishlist, hydrated],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

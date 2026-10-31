"use client";

import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";

interface PaymentObject {
  invoiceId: string;
  backLink: string;
  failureBackLink: string;
  postLink: string;
  failurePostLink: string;
  language: string;
  description: string;
  accountId: string;
  terminal: string;
  amount: number;
  currency: string;
  auth: unknown;
  email?: string;
  phone?: string;
}

declare global {
  interface Window {
    halyk?: { pay: (p: PaymentObject & { cardSave?: boolean }) => void };
  }
}

export function HalykWidget({ scriptUrl, payment, labels }: { scriptUrl: string; payment: PaymentObject; labels: { open: string; opening: string } }) {
  const [ready, setReady] = useState(false);
  const [opening, setOpening] = useState(false);
  const opened = useRef(false);

  useEffect(() => {
    if (document.querySelector(`script[src="${scriptUrl}"]`)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- external script already present
      setReady(true);
      return;
    }
    const s = document.createElement("script");
    s.src = scriptUrl;
    s.async = true;
    s.onload = () => setReady(true);
    document.body.appendChild(s);
  }, [scriptUrl]);

  const open = () => {
    if (!window.halyk) return;
    setOpening(true);
    window.halyk.pay({ ...payment, cardSave: false });
    setTimeout(() => setOpening(false), 4000);
  };

  useEffect(() => {
    if (ready && !opened.current) {
      opened.current = true;
      const id = setTimeout(open, 400);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <button type="button" onClick={open} disabled={!ready || opening} className="btn-primary mt-7 px-8">
      <Lock className="h-4 w-4" /> {opening ? labels.opening : labels.open}
    </button>
  );
}

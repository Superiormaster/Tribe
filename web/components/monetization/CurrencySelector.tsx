"use client";

import { Check, ChevronDown, Coins } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
} from "@/utils/monetization/constants/monetization";

import type { CurrencyCode } from "@/utils/monetization/formatCurrency";

interface CurrencySelectorProps {
  value?: CurrencyCode;
  onChange?: (currency: CurrencyCode) => void;
  disabled?: boolean;
  className?: string;
}

export default function CurrencySelector({
  value = DEFAULT_CURRENCY,
  onChange,
  disabled = false,
  className = "",
}: CurrencySelectorProps) {
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCurrency =
    SUPPORTED_CURRENCIES.find(
      (currency) => currency.code === value
    ) ?? SUPPORTED_CURRENCIES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener(
        "mousedown",
        handleClickOutside
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, [open]);

  const handleSelect = (currency: CurrencyCode) => {
    if (disabled) return;

    onChange?.(currency);
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          "inline-flex h-10 items-center gap-2",
          "rounded-xl border border-white/[0.08]",
          "bg-[#121212] px-3.5",
          "text-sm font-medium text-white",
          "transition-all",
          "hover:border-[#FFD84D]/30",
          "hover:bg-[#1A1A1A]",
          "focus:outline-none",
          "focus:ring-2 focus:ring-[#FFD84D]/20",
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer",
        ].join(" ")}
      >
        <Coins className="h-4 w-4 text-[#FFD84D]" />

        <span>{selectedCurrency.code}</span>

        <ChevronDown
          className={[
            "h-4 w-4 text-white/40 transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select currency"
          className={[
            "absolute right-0 z-50 mt-2 min-w-[210px]",
            "overflow-hidden rounded-2xl",
            "border border-white/[0.08]",
            "bg-[#121212]",
            "p-1.5",
            "shadow-2xl shadow-black/40",
          ].join(" ")}
        >
          {SUPPORTED_CURRENCIES.map((currency) => {
            const selected = currency.code === value;

            return (
              <button
                key={currency.code}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() =>
                  handleSelect(currency.code)
                }
                className={[
                  "flex w-full items-center gap-3",
                  "rounded-xl px-3 py-2.5",
                  "text-left",
                  "transition-colors",
                  selected
                    ? "bg-[#FFD84D]/10"
                    : "hover:bg-white/[0.05]",
                ].join(" ")}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-sm font-semibold text-[#FFD84D]">
                  {currency.symbol}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-white">
                    {currency.code}
                  </span>

                  <span className="block text-xs text-white/40">
                    {currency.name}
                  </span>
                </span>

                {selected && (
                  <Check className="h-4 w-4 shrink-0 text-[#FFD84D]" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
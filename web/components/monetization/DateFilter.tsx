"use client";

import { CalendarDays, ChevronDown, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  REVENUE_PERIODS,
  type RevenuePeriod,
} from "@/utils/monetization/constants/monetization";

interface DateFilterProps {
  value?: RevenuePeriod;
  onChange?: (period: RevenuePeriod) => void;
  disabled?: boolean;
  className?: string;
}

export default function DateFilter({
  value = "30d",
  onChange,
  disabled = false,
  className = "",
}: DateFilterProps) {
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const selectedPeriod =
    REVENUE_PERIODS.find((period) => period.key === value) ??
    REVENUE_PERIODS.find((period) => period.key === "30d")!;

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

  const handleSelect = (period: RevenuePeriod) => {
    if (disabled) return;

    onChange?.(period);
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
        <CalendarDays className="h-4 w-4 text-[#FFD84D]" />

        <span>{selectedPeriod.label}</span>

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
          aria-label="Select date range"
          className={[
            "absolute right-0 z-50 mt-2 min-w-[150px]",
            "overflow-hidden rounded-2xl",
            "border border-white/[0.08]",
            "bg-[#121212]",
            "p-1.5",
            "shadow-2xl shadow-black/40",
          ].join(" ")}
        >
          {REVENUE_PERIODS.map((period) => {
            const selected = period.key === value;

            return (
              <button
                key={period.key}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() =>
                  handleSelect(period.key)
                }
                className={[
                  "flex w-full items-center justify-between",
                  "rounded-xl px-3 py-2.5",
                  "text-left text-sm",
                  "transition-colors",
                  selected
                    ? "bg-[#FFD84D]/10 text-[#FFD84D]"
                    : "text-white/70 hover:bg-white/[0.05] hover:text-white",
                ].join(" ")}
              >
                <span>{period.label}</span>

                {selected && (
                  <Check className="h-4 w-4 text-[#FFD84D]" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Stripe zero-decimal currencies — amounts are stored in whole units, not cents. */
const ZERO_DECIMAL = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

export function formatMoney(amountMinor: number, currency = "USD") {
  const code = (currency || "USD").toUpperCase();
  const zero = ZERO_DECIMAL.has(code);
  const value = zero ? amountMinor : amountMinor / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    maximumFractionDigits: zero || amountMinor % 100 === 0 ? 0 : 2,
  }).format(value);
}

/** Price label for services/events — free offerings never show "$0". */
export function formatPrice(cents: number, currency = "USD") {
  if (!cents || cents <= 0) return "Free";
  return formatMoney(cents, currency);
}

export function bookingReference() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `#${n}`;
}

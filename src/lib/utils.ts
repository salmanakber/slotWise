import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
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

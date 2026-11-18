/** Currencies commonly supported for Stripe Connect booking charges. */
export const SITE_CURRENCIES = [
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "CAD", label: "Canadian Dollar (CA$)" },
  { code: "AUD", label: "Australian Dollar (A$)" },
  { code: "NZD", label: "New Zealand Dollar (NZ$)" },
  { code: "SGD", label: "Singapore Dollar (S$)" },
  { code: "HKD", label: "Hong Kong Dollar (HK$)" },
  { code: "JPY", label: "Japanese Yen (¥)" },
  { code: "INR", label: "Indian Rupee (₹)" },
  { code: "PKR", label: "Pakistani Rupee (Rs)" },
  { code: "AED", label: "UAE Dirham (د.إ)" },
  { code: "SAR", label: "Saudi Riyal (﷼)" },
  { code: "CHF", label: "Swiss Franc (CHF)" },
  { code: "SEK", label: "Swedish Krona (kr)" },
  { code: "NOK", label: "Norwegian Krone (kr)" },
  { code: "DKK", label: "Danish Krone (kr)" },
  { code: "MXN", label: "Mexican Peso (MX$)" },
  { code: "BRL", label: "Brazilian Real (R$)" },
] as const;

export type SiteCurrencyCode = (typeof SITE_CURRENCIES)[number]["code"];

export function isSupportedCurrency(code: string): code is SiteCurrencyCode {
  return SITE_CURRENCIES.some((c) => c.code === code.toUpperCase());
}

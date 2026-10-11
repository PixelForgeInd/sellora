import type { Product } from "./types";

export function formatCurrency(value: number | string, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function formatMoney(
  value: Product["price"],
  currency = "INR",
  unit = "piece",
): string {
  if (value == null || value === "") {
    return "Price on request";
  }

  return `${formatCurrency(value, currency)} / ${unit}`;
}

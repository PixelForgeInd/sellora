import type { Product } from "./types";

export function formatMoney(
  value: Product["price"],
  currency = "INR",
  unit = "piece",
): string {
  if (value == null || value === "") {
    return "Price on request";
  }

  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));

  return `${formatted} / ${unit}`;
}

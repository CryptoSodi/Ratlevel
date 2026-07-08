import type { PlayerSettings } from "@ratlevel/domain";

const KG_TO_LB = 2.20462;

export function kgToDisplay(kg: number, units: PlayerSettings["units"]): number {
  return units === "imperial" ? Math.round(kg * KG_TO_LB * 10) / 10 : Math.round(kg * 10) / 10;
}

export function displayToKg(value: number, units: PlayerSettings["units"]): number {
  return units === "imperial" ? Math.round((value / KG_TO_LB) * 100) / 100 : value;
}

export function weightUnit(units: PlayerSettings["units"]): string {
  return units === "imperial" ? "lb" : "kg";
}

export function formatWeight(kg: number, units: PlayerSettings["units"]): string {
  return `${kgToDisplay(kg, units).toLocaleString()} ${weightUnit(units)}`;
}

export function formatVolume(kg: number, units: PlayerSettings["units"]): string {
  const value = units === "imperial" ? kg * KG_TO_LB : kg;
  if (value >= 1000) {
    return `${(Math.round(value / 100) / 10).toLocaleString()}k ${weightUnit(units)}`;
  }
  return `${Math.round(value).toLocaleString()} ${weightUnit(units)}`;
}

export function formatRelativeDay(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const startOfDay = (input: Date) =>
    new Date(input.getFullYear(), input.getMonth(), input.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: "short" });
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

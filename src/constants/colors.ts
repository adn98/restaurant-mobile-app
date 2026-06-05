import { TableStatus } from "@/types";

export const COLORS = {
  primary: "#F97316",
  primaryDark: "#C2410C",
  primaryLight: "#FFF7ED",
  primaryMid: "#FDBA74",
  ink: "#111827",
  slate: "#475569",
  blue: "#2563EB",
  blueLight: "#EFF6FF",
  green: "#16A34A",
  greenLight: "#ECFDF3",
  gray: "#94A3B8",
  grayLight: "#F8FAFC",
  purple: "#7C3AED",
  purpleLight: "#F5F3FF",
  yellow: "#F59E0B",
  yellowLight: "#FFFBEB",
  danger: "#EF4444",
  bg: "#F4F1EA",
  panel: "#FBFAF7",
  warmLine: "#E7DED2",
  espresso: "#2B2118",
  white: "#FFFFFF",
  text: "#111827",
  textSec: "#667085",
  border: "#E6E0D8",
};

export const TABLE_STATUS_COLORS: Record<
  TableStatus,
  { bg: string; fg: string; bd: string; label: string; dot: string }
> = {
  empty: {
    bg: COLORS.white,
    fg: COLORS.slate,
    bd: "#E8E0D6",
    label: "Empty",
    dot: "#CBD5E1",
  },
  active: {
    bg: "#FFF1E7",
    fg: COLORS.primaryDark,
    bd: COLORS.primary,
    label: "Active",
    dot: COLORS.primary,
  },
  bill: {
    bg: COLORS.blueLight,
    fg: COLORS.blue,
    bd: COLORS.blue,
    label: "Bill Ready",
    dot: COLORS.blue,
  },
  paid: {
    bg: "#F1F5F9",
    fg: COLORS.slate,
    bd: COLORS.gray,
    label: "Paid",
    dot: COLORS.gray,
  },
};

export const TABLE_STATUS_ACCENTS: Record<TableStatus, { fill: string; text: string; tint: string }> = {
  empty: {
    fill: "#F8FAFC",
    text: COLORS.slate,
    tint: "#EEF2F6",
  },
  active: {
    fill: COLORS.primary,
    text: COLORS.white,
    tint: COLORS.primaryLight,
  },
  bill: {
    fill: COLORS.blue,
    text: COLORS.white,
    tint: COLORS.blueLight,
  },
  paid: {
    fill: COLORS.slate,
    text: COLORS.white,
    tint: "#F1F5F9",
  },
};

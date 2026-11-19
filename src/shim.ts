export { useState, useEffect, useMemo, useRef, useCallback, useReducer, Fragment } from "react";
const dark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
const L = {
  kind: "light",
  bg: { base: "#ffffff", subtle: "#f4f5f7", elevated: "#ffffff" },
  text: { primary: "#16181d", secondary: "#5b6170", tertiary: "#8a90a0", onColor: "#ffffff", onPrimary: "#ffffff", accent: "#2f6fe0", success: "#1f8a4c", warning: "#b7791f", danger: "#d23b3b", accentDeep: "#1d4fb0", successDeep: "#146c39", warningDeep: "#8a5a12", dangerDeep: "#a52626" },
  fill: { primary: "#16181d", primaryHover: "#2a2d35", secondary: "#eef0f3", secondaryHover: "#e3e6ea", hover: "#f1f3f5", pressed: "#e6e9ed", accent: "#2f6fe0", controlChecked: "#2f6fe0", accentSubtle: "#e7effd", successSubtle: "#e6f5ec", warningSubtle: "#fdf3e1", dangerSubtle: "#fdeaea" },
  border: { subtle: "#e7e9ee", weak: "#dfe2e8", default: "#d3d7df", strong: "#a9afbb", focus: "#2f6fe0" },
};
const D = {
  kind: "dark",
  bg: { base: "#141519", subtle: "#1d1f25", elevated: "#1a1c21" },
  text: { primary: "#eceef2", secondary: "#a6acb9", tertiary: "#7c8291", onColor: "#ffffff", onPrimary: "#141519", accent: "#7aa7ff", success: "#4fc184", warning: "#e5b35a", danger: "#ff7a7a", accentDeep: "#a9c5ff", successDeep: "#7fd8a6", warningDeep: "#f0cb88", dangerDeep: "#ffa5a5" },
  fill: { primary: "#eceef2", primaryHover: "#d8dbe1", secondary: "#262931", secondaryHover: "#2e323b", hover: "#23262d", pressed: "#2b2f37", accent: "#3d7bf0", controlChecked: "#3d7bf0", accentSubtle: "#1e2b45", successSubtle: "#173325", warningSubtle: "#3a2e17", dangerSubtle: "#3d1d1f" },
  border: { subtle: "#262930", weak: "#2c3038", default: "#363a44", strong: "#555b68", focus: "#7aa7ff" },
};
const theme: any = { ...(dark ? D : L), font: { family: '-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif', mono: "monospace" }, radius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 } };
export function useGrokTheme(): any { return theme; }

"use client";

import { useEffect } from "react";
import { startInvestigation } from "./decode-engine";

// Keep the archive server-rendered; activate browser-only APIs after hydration.
// The returned cleanup also makes React Strict Mode and Fast Refresh safe.
export default function InvestigationController() {
  useEffect(() => startInvestigation(), []);
  return null;
}

import type { AppView } from "../types/analysis";

export const navigationItems: Array<{ id: AppView; label: string; short: string }> = [
  { id: "overview", label: "Overview", short: "OV" },
  { id: "run", label: "Run Lab", short: "RN" },
  { id: "pages", label: "Pages", short: "PG" },
  { id: "findings", label: "Findings", short: "FD" },
  { id: "tests", label: "Tests", short: "TS" },
  { id: "report", label: "Report", short: "RP" },
  { id: "history", label: "History", short: "HS" },
  { id: "compare", label: "Compare", short: "CP" },
  { id: "profile", label: "Profile", short: "PF" },
];

import type { ModeMapping } from "@/agentMode/session/types";

export function buildCursorModeMapping(): ModeMapping {
  return {
    kind: "setMode",
    canonical: {
      default: "agent",
      plan: "plan",
      auto: "ask",
    },
    readOnlyModeId: "ask",
  };
}

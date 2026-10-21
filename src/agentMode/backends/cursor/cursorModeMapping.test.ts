import { buildCursorModeMapping } from "./cursorModeMapping";

describe("cursorModeMapping", () => {
  describe("buildCursorModeMapping()", () => {
    it("maps Copilot modes onto Cursor ACP agent, plan, and ask", () => {
      expect(buildCursorModeMapping()).toEqual({
        kind: "setMode",
        canonical: { default: "agent", plan: "plan", auto: "ask" },
        readOnlyModeId: "ask",
      });
    });
  });
});

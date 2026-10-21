import { CursorBackendDescriptor } from "./descriptor";

describe("descriptor", () => {
  describe("CursorBackendDescriptor", () => {
    describe("wire", () => {
      it("encodes a selection without effort as the bare model id", () => {
        expect(
          CursorBackendDescriptor.wire.encode({ baseModelId: "composer-2", effort: null })
        ).toBe("composer-2");
      });

      it("decodes a bracketed effort so a later CLI catalog needs no change", () => {
        expect(CursorBackendDescriptor.wire.decode("composer-2[high]")).toEqual({
          selection: { baseModelId: "composer-2", effort: "high" },
          provider: null,
        });
      });
    });

    describe("getModeMapping()", () => {
      it("exposes Cursor ACP mode ids", () => {
        expect(CursorBackendDescriptor.getModeMapping?.(null, null)?.canonical).toEqual({
          default: "agent",
          plan: "plan",
          auto: "ask",
        });
      });
    });
  });
});

import { getSettings, resetSettings, setSettings } from "@/settings/model";
import { CursorBackend } from "./CursorBackend";
import { resolveCursorCliPath } from "./cursorPath";

jest.mock("./cursorPath", () => ({
  resolveCursorCliPath: jest.fn(),
}));

jest.mock("@/logger", () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

const mockedResolve = jest.mocked(resolveCursorCliPath);

function useCursorSettings(cursor?: Record<string, unknown>): void {
  setSettings({
    agentMode: {
      ...getSettings().agentMode,
      activeBackend: "cursor",
      backends: cursor ? { cursor } : {},
    },
  });
}

describe("CursorBackend", () => {
  describe("CursorBackend", () => {
    describe("buildSpawnDescriptor()", () => {
      beforeEach(() => {
        resetSettings();
        mockedResolve.mockReset();
        mockedResolve.mockReturnValue("/usr/local/bin/agent");
        useCursorSettings({ binaryPath: "/usr/local/bin/agent" });
      });

      it("spawns the Cursor CLI with acp and the vault as the working directory", async () => {
        const desc = await new CursorBackend().buildSpawnDescriptor({ vaultBasePath: "/vault" });

        expect(desc.command).toBe("/usr/local/bin/agent");
        expect(desc.args).toEqual(["acp"]);
        expect(desc.cwd).toBe("/vault");
      });

      it("refuses to start when no Cursor CLI path is resolved", async () => {
        mockedResolve.mockReturnValue(null);

        await expect(
          new CursorBackend().buildSpawnDescriptor({ vaultBasePath: "/vault" })
        ).rejects.toThrow("Cursor CLI path not configured");
      });
    });
  });
});

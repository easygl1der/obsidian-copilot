import { cursorBinarySearchDirs, resolveCursorBinary } from "./cursorBinaryResolver";

function unixFs(existing: string[]) {
  const present = new Set(existing);
  return {
    existsSync: (p: string) => present.has(p),
    readFileSync: () => "",
    readdirSync: () => [],
  };
}

describe("cursorBinaryResolver", () => {
  describe("resolveCursorBinary()", () => {
    it("returns a user override when that file exists", () => {
      expect(
        resolveCursorBinary({
          override: "/opt/agent",
          homeDir: "/home/zero",
          platform: "linux",
          env: {},
          fs: unixFs(["/opt/agent"]),
        })
      ).toBe("/opt/agent");
    });

    it("prefers ~/.local/bin/agent when no override is set", () => {
      expect(
        resolveCursorBinary({
          homeDir: "/home/zero",
          platform: "linux",
          env: {},
          fs: unixFs(["/home/zero/.local/bin/agent"]),
        })
      ).toBe("/home/zero/.local/bin/agent");
    });

    it("returns null when no known candidate exists", () => {
      expect(
        resolveCursorBinary({
          homeDir: "/home/zero",
          platform: "linux",
          env: {},
          fs: unixFs([]),
        })
      ).toBeNull();
    });
  });

  describe("cursorBinarySearchDirs()", () => {
    it("lists parent directories of the unix search candidates", () => {
      const dirs = cursorBinarySearchDirs({
        homeDir: "/home/zero",
        platform: "linux",
        env: {},
        fs: unixFs([]),
      });

      expect(dirs).toContain("/home/zero/.local/bin");
    });
  });
});

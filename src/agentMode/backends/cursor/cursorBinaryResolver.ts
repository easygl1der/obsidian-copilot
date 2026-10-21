import { WELL_KNOWN_BIN_DIRS } from "@/utils/binaryPath";
import { requireNodeModule } from "@/utils/desktopRuntime";
import { nodeToolBinDirCandidates, type NodeToolFs } from "@/utils/nodeToolBinDirs";

export type CursorBinaryResolverFs = NodeToolFs;

export interface CursorBinaryResolverInput {
  override?: string;
  homeDir: string;
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  fs: CursorBinaryResolverFs;
}

export const CURSOR_BINARY_NAMES = ["agent", "cursor-agent"] as const;

export function resolveCursorBinary(input: CursorBinaryResolverInput): string | null {
  const { override, fs } = input;
  if (override && fs.existsSync(override)) return override;

  for (const candidate of binaryCandidates(input)) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export function cursorBinarySearchDirs(input: CursorBinaryResolverInput): string[] {
  const path = requireNodeModule<typeof import("node:path")>("path");
  const pathImpl = input.platform === "win32" ? path.win32 : path.posix;
  return Array.from(
    new Set(
      binaryCandidates(input)
        .filter((candidate): candidate is string => Boolean(candidate))
        .map((candidate) => pathImpl.dirname(candidate))
    )
  );
}

function binaryCandidates(input: CursorBinaryResolverInput): Array<string | null> {
  return input.platform === "win32" ? windowsCandidates(input) : unixCandidates(input);
}

function unixCandidates(input: CursorBinaryResolverInput): Array<string | null> {
  const posix = requireNodeModule<typeof import("node:path")>("path").posix;
  const dirs = [...nodeToolBinDirCandidates(input), ...WELL_KNOWN_BIN_DIRS];
  const out: Array<string | null> = [posix.join(input.homeDir, ".local", "bin", "agent")];
  for (const dir of dirs) {
    for (const name of CURSOR_BINARY_NAMES) {
      out.push(posix.join(dir, name));
    }
  }
  return out;
}

function windowsCandidates(input: CursorBinaryResolverInput): Array<string | null> {
  const win = requireNodeModule<typeof import("node:path")>("path").win32;
  const { homeDir, env } = input;
  const localAppData = env.LOCALAPPDATA ?? win.join(homeDir, "AppData", "Local");
  const out: Array<string | null> = [
    win.join(homeDir, ".local", "bin", "agent.exe"),
    win.join(localAppData, "cursor-agent", "agent.exe"),
    win.join(localAppData, "Programs", "cursor", "agent.exe"),
  ];
  for (const dir of nodeToolBinDirCandidates(input)) {
    for (const name of CURSOR_BINARY_NAMES) {
      out.push(win.join(dir, `${name}.exe`));
    }
  }
  return out;
}

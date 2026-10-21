import { requireNodeModule } from "@/utils/desktopRuntime";
import { detectBinary } from "@/utils/detectBinary";
import type { CopilotSettings } from "@/settings/model";
import {
  CURSOR_BINARY_NAMES,
  cursorBinarySearchDirs,
  resolveCursorBinary,
} from "./cursorBinaryResolver";

function resolverEnv(): Omit<Parameters<typeof resolveCursorBinary>[0], "override"> {
  const fs = requireNodeModule<typeof import("node:fs")>("fs");
  const os = requireNodeModule<typeof import("node:os")>("os");
  return {
    homeDir: os.homedir(),
    platform: process.platform,
    env: process.env,
    fs: {
      existsSync: (p) => fs.existsSync(p),
      readFileSync: (p, encoding) => fs.readFileSync(p, encoding),
      readdirSync: (p) => fs.readdirSync(p),
    },
  };
}

export function resolveCursorCliPath(settings: CopilotSettings): string | null {
  const override = settings.agentMode?.backends?.cursor?.binaryPath;
  return resolveCursorBinary({ ...resolverEnv(), override });
}

export async function detectCursorCliPath(): Promise<string | null> {
  const fromKnownLocations = resolveCursorBinary(resolverEnv());
  if (fromKnownLocations) return fromKnownLocations;
  for (const name of CURSOR_BINARY_NAMES) {
    const fromPath = await detectBinary(name);
    if (fromPath) return fromPath;
  }
  return null;
}

export function cursorCliDetectionSearchDirs(): string[] {
  return cursorBinarySearchDirs(resolverEnv());
}

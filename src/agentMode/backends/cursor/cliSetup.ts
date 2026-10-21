import { terminalSignInCommand } from "@/agentMode/backends/shared/terminalSignInCommand";

export const CURSOR_INSTALL_COMMAND = "curl https://cursor.com/install -fsS | bash";

export function cursorBinaryPathPlaceholder(platform: NodeJS.Platform): string {
  return platform === "win32" ? "C:\\path\\to\\agent.exe" : "/absolute/path/to/agent";
}

export function cursorSignInCommand(
  binaryPath: string | undefined,
  envOverrides: Record<string, string> | undefined,
  platform: NodeJS.Platform
): string | null {
  return terminalSignInCommand({
    binaryPath,
    args: ["login"],
    profileVariables: [],
    envOverrides,
    platform,
  });
}

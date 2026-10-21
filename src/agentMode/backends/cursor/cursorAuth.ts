import type { BackendAuth, BackendAuthStatus } from "@/agentMode/session/types";
import { sanitizeBuiltinSkillEnvOverrides } from "@/agentMode/backends/shared/builtinSkillEnv";
import { signInWithCli, signOutWithCli } from "@/agentMode/backends/shared/cliSignIn";
import { logWarn } from "@/logger";
import { requireNodeModule } from "@/utils/desktopRuntime";
import type { CopilotSettings } from "@/settings/model";
import { resolveCursorCliPath } from "./cursorPath";

const STATUS_TIMEOUT_MS = 10_000;

function cursorChildEnv(settings: CopilotSettings): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...sanitizeBuiltinSkillEnvOverrides(settings.agentMode?.backends?.cursor?.envOverrides),
  };
}

function hasCursorCredential(env: NodeJS.ProcessEnv): boolean {
  return Boolean(env.CURSOR_API_KEY?.trim() || env.CURSOR_AUTH_TOKEN?.trim());
}

async function readCursorAuthStatus(
  cursorPath: string,
  env: NodeJS.ProcessEnv
): Promise<BackendAuthStatus> {
  if (hasCursorCredential(env)) return { signedIn: true };
  const { execFile } = requireNodeModule<typeof import("node:child_process")>("child_process");
  const { promisify } = requireNodeModule<typeof import("node:util")>("util");
  const execFileAsync = promisify(execFile);
  try {
    const { stdout } = await execFileAsync(cursorPath, ["status"], {
      timeout: STATUS_TIMEOUT_MS,
      env,
    });
    return parseCursorStatus(stdout);
  } catch (error) {
    const stdout = (error as { stdout?: unknown }).stdout;
    if (typeof stdout === "string" && stdout.trim()) {
      return parseCursorStatus(stdout);
    }
    logWarn("[AgentMode] Cursor auth status probe failed", error);
    return { signedIn: false };
  }
}

function parseCursorStatus(stdout: string): BackendAuthStatus {
  const text = stdout.trim();
  if (!text) return { signedIn: false };
  try {
    const parsed = JSON.parse(text) as {
      loggedIn?: boolean;
      signedIn?: boolean;
      email?: string;
      account?: string;
    };
    const signedIn = parsed.loggedIn === true || parsed.signedIn === true;
    const label =
      typeof parsed.email === "string"
        ? parsed.email
        : typeof parsed.account === "string"
          ? parsed.account
          : undefined;
    return { signedIn, ...(signedIn && label ? { label } : {}) };
  } catch {
    const signedOut = /not (signed|logged) in|unauthenticated|logged out/i.test(text);
    if (signedOut) return { signedIn: false };
    const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (/signed in|logged in|authenticated/i.test(text)) {
      return { signedIn: true, ...(emailMatch ? { label: emailMatch[0] } : {}) };
    }
    return { signedIn: false };
  }
}

export const cursorAuth: BackendAuth = {
  getProbeKey(settings) {
    return requireNodeModule<typeof import("node:crypto")>("crypto")
      .createHash("sha256")
      .update(
        JSON.stringify([
          resolveCursorCliPath(settings),
          Object.entries(cursorChildEnv(settings)).sort(([a], [b]) => a.localeCompare(b)),
        ])
      )
      .digest("hex");
  },
  async getStatus(settings) {
    const cursorPath = resolveCursorCliPath(settings);
    if (!cursorPath) return { signedIn: false };
    return readCursorAuthStatus(cursorPath, cursorChildEnv(settings));
  },
  async signIn(settings, handlers) {
    const cursorPath = resolveCursorCliPath(settings);
    if (!cursorPath) return { signedIn: false };
    const env = cursorChildEnv(settings);
    const status = await signInWithCli(
      cursorPath,
      ["login"],
      env,
      async () => toCliStatus(await readCursorAuthStatus(cursorPath, env)),
      handlers
    ).done;
    return { signedIn: status.loggedIn, label: status.label };
  },
  async signOut(settings, options) {
    const cursorPath = resolveCursorCliPath(settings);
    if (!cursorPath) throw new Error("Install the Cursor CLI before signing out.");
    const env = cursorChildEnv(settings);
    const status = await signOutWithCli(
      cursorPath,
      ["logout"],
      env,
      async () => toCliStatus(await readCursorAuthStatus(cursorPath, env)),
      options
    );
    return { signedIn: status.loggedIn, label: status.label };
  },
};

function toCliStatus(status: BackendAuthStatus): { loggedIn: boolean; label?: string } {
  return { loggedIn: status.signedIn, label: status.label };
}

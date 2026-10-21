import { getSettings } from "@/settings/model";
import { AcpBackend, AcpSpawnDescriptor } from "@/agentMode/acp/types";
import { buildSimpleSpawnDescriptor } from "@/agentMode/backends/shared/simpleBinaryBackend";
import {
  buildBuiltinSkillEnv,
  sanitizeBuiltinSkillEnvOverrides,
} from "@/agentMode/backends/shared/builtinSkillEnv";
import { bindCursorClientExtensions } from "./cursorAcpExtensions";
import { resolveCursorCliPath } from "./cursorPath";

export class CursorBackend implements AcpBackend {
  readonly id = "cursor" as const;
  readonly displayName = "Cursor";
  readonly authenticateMethodId = "cursor_login";
  readonly clientCapabilitiesMeta = { parameterizedModelPicker: true };

  constructor(private readonly clientVersion = "") {}

  bindClientExtensions = bindCursorClientExtensions;

  async buildSpawnDescriptor(ctx: { vaultBasePath: string }): Promise<AcpSpawnDescriptor> {
    const settings = getSettings();
    const binaryPath = resolveCursorCliPath(settings);
    const descriptor = buildSimpleSpawnDescriptor(
      binaryPath ?? undefined,
      "Cursor CLI path not configured. Open Agent Mode settings and detect or set the `agent` binary.",
      sanitizeBuiltinSkillEnvOverrides(settings.agentMode?.backends?.cursor?.envOverrides),
      await buildBuiltinSkillEnv(this.clientVersion, ctx.vaultBasePath)
    );
    return {
      ...descriptor,
      args: ["acp"],
      cwd: ctx.vaultBasePath,
    };
  }
}

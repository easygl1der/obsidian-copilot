import { resolveEffort } from "@/lib/model-effort";
import type CopilotPlugin from "@/main";
import { requireNodeModule } from "@/utils/desktopRuntime";
import { validateExecutableFile } from "@/utils/detectBinary";
import {
  subscribeToSettingsChange,
  updateAgentModeBackendFields,
  type CopilotSettings,
  type CursorBackendSettings,
} from "@/settings/model";
import { agentOriginEnabledModelEntries } from "@/agentMode/backends/shared/agentEnabledModels";
import { simpleBinaryBackendProcess } from "@/agentMode/backends/shared/simpleBinaryBackend";
import { urlDestination } from "@/modelManagement";
import type { Destination } from "@/types/destination";
import type {
  BackendDescriptor,
  BackendProcess,
  EnabledModelEntry,
  InstallState,
  ModelSelection,
  ModelSelectionSession,
  ModelWireCodec,
} from "@/agentMode/session/types";
import { CursorBackend } from "./CursorBackend";
import { cursorAuth } from "./cursorAuth";
import { CursorInstallModal } from "./CursorInstallModal";
import CursorLogo from "./logo.svg";
import { CursorSettingsPanel } from "./CursorSettingsPanel";
import { buildCursorModeMapping } from "./cursorModeMapping";
import {
  cursorCliDetectionSearchDirs,
  detectCursorCliPath,
  resolveCursorCliPath,
} from "./cursorPath";

const ABSENT_INSTALL_STATE: InstallState = Object.freeze({ kind: "absent" });
const READY_INSTALL_STATE: InstallState = Object.freeze({ kind: "ready", source: "custom" });

export function updateCursorFields(partial: Partial<CursorBackendSettings>): void {
  updateAgentModeBackendFields("cursor", partial);
}

export { cursorCliDetectionSearchDirs, detectCursorCliPath, resolveCursorCliPath };

const cursorWire: ModelWireCodec = {
  encode: (selection: ModelSelection) =>
    selection.effort ? `${selection.baseModelId}[${selection.effort}]` : selection.baseModelId,
  decode: (wireId: string) => {
    const match = /^(.*)\[([^\]]+)\]$/.exec(wireId);
    if (!match) return { selection: { baseModelId: wireId, effort: null }, provider: null };
    return { selection: { baseModelId: match[1], effort: match[2] }, provider: null };
  },
};

export const CursorBackendDescriptor: BackendDescriptor = {
  id: "cursor",
  auth: cursorAuth,
  displayName: "Cursor",
  Icon: CursorLogo,
  selfHostable: false,
  routesCopilotModels: false,
  setupDescription:
    "Cursor models, billed to your Cursor account. Runs `agent acp` on this machine.",
  skillsProjectDir: ".cursor/skills",
  crossDiscoveredAgents: [],
  restartOnManagedSkillsChange: false,
  restartOnProviderConfigChange: false,
  restartOnSystemPromptChange: false,
  summarizesSessionTitle: false,
  agentProductName: "Cursor Agent",
  wire: cursorWire,
  showModelDescriptions: true,

  getEnabledModelEntries(settings: CopilotSettings): EnabledModelEntry[] {
    return [
      ...agentOriginEnabledModelEntries(settings, "cursor", (wireId) => cursorWire.decode(wireId)),
    ];
  },

  dataDestination(settings: CopilotSettings): Destination {
    const overrides = settings.agentMode?.backends?.cursor?.envOverrides;
    const baseUrl = overrides?.CURSOR_API_BASE_URL || process.env.CURSOR_API_BASE_URL;
    if (baseUrl) return urlDestination(baseUrl, "The server set in CURSOR_API_BASE_URL");
    return { kind: "cloud", label: "Cursor" };
  },

  getInstallState(settings: CopilotSettings): InstallState {
    const path = resolveCursorCliPath(settings);
    if (!path) return ABSENT_INSTALL_STATE;
    const fs = requireNodeModule<typeof import("node:fs")>("fs");
    return fs.existsSync(path) ? READY_INSTALL_STATE : ABSENT_INSTALL_STATE;
  },

  getResolvedBinaryPath(settings: CopilotSettings): string | null {
    return resolveCursorCliPath(settings);
  },

  subscribeInstallState(_plugin: CopilotPlugin, cb: () => void): () => void {
    return subscribeToSettingsChange((prev, next) => {
      if (
        prev.agentMode?.backends?.cursor?.binaryPath !==
          next.agentMode?.backends?.cursor?.binaryPath ||
        prev.agentMode?.backends?.cursor?.envOverrides !==
          next.agentMode?.backends?.cursor?.envOverrides
      ) {
        cb();
      }
    });
  },

  openInstallUI(plugin: CopilotPlugin): void {
    new CursorInstallModal(plugin.app).open();
  },

  async applySelection(session: ModelSelectionSession, selection: ModelSelection): Promise<void> {
    const currentBase = session.getState()?.model?.current.baseModelId;
    if (currentBase !== selection.baseModelId) {
      await session.applyModelWireId(selection.baseModelId);
    }
    const model = session.getState()?.model;
    const apply = model?.apply;
    const effort = resolveEffort(
      selection.effort,
      model?.availableModels.find((entry) => entry.baseModelId === selection.baseModelId)
        ?.effortOptions
    );
    if (apply?.kind === "setConfigOption" && apply.effortConfigId && effort !== null) {
      await session.setConfigOption(apply.effortConfigId, effort);
    }
  },

  createBackendProcess(args): BackendProcess {
    return simpleBinaryBackendProcess(args, new CursorBackend(args.clientVersion));
  },

  SettingsPanel: CursorSettingsPanel,

  getModeMapping() {
    return buildCursorModeMapping();
  },
};

export async function saveCursorBinaryPath(path: string): Promise<string | null> {
  const err = await validateExecutableFile(path);
  if (err) return err;
  updateCursorFields({ binaryPath: path });
  return null;
}

export function clearCursorBinaryPath(): void {
  updateCursorFields({ binaryPath: undefined });
}

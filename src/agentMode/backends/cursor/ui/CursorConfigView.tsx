import {
  CURSOR_INSTALL_COMMAND,
  cursorBinaryPathPlaceholder,
} from "@/agentMode/backends/cursor/cliSetup";
import { BinaryPathSetting } from "@/agentMode/backends/shared/BinaryPathSetting";
import { ConfigDialogShell, ConfigSection } from "@/agentMode/backends/shared/ui/ConfigDialogShell";
import { CommandBlock } from "@/agentMode/backends/shared/ui/SetupSteps";
import type { InstallState } from "@/agentMode/session/types";
import {
  AuthenticationSection,
  type AuthenticationState,
} from "@/agentMode/backends/shared/ui/AuthenticationSection";
import React from "react";

export interface CursorConfigViewProps {
  state: InstallState;
  binaryPath: string;
  hasPersistedPath: boolean;
  onSavePath: (path: string) => Promise<string | null>;
  onClearPath: () => void;
  detect: () => Promise<string | null>;
  searchedDirs: () => string[];
  auth: AuthenticationState;
  onClose: () => void;
}

export const CursorConfigView: React.FC<CursorConfigViewProps> = ({
  state,
  binaryPath,
  hasPersistedPath,
  onSavePath,
  onClearPath,
  detect,
  searchedDirs,
  auth,
  onClose,
}) => (
  <ConfigDialogShell
    authStatus={auth.status}
    title="Configure Cursor"
    state={state}
    onClose={onClose}
  >
    <ConfigSection title="Cursor CLI binary">
      <p className="tw-my-0 tw-text-sm tw-text-muted">
        Copilot runs <code>agent acp</code> on this machine. Auto-detect checks the usual install
        locations for <code>agent</code> and <code>cursor-agent</code>.
      </p>
      <BinaryPathSetting
        binaryName="agent"
        placeholder={cursorBinaryPathPlaceholder(process.platform)}
        initialPath={binaryPath}
        hasPersistedPath={hasPersistedPath}
        notFoundHint="Cursor CLI not found in known install locations. Run the install command below, then click Auto-detect again."
        onSave={onSavePath}
        onClear={onClearPath}
        persistOnAutoDetect
        detect={detect}
        searchedDirs={searchedDirs}
      />
    </ConfigSection>

    <ConfigSection title="Install Cursor CLI">
      <CommandBlock command={CURSOR_INSTALL_COMMAND} />
    </ConfigSection>
    <AuthenticationSection
      ready={state.kind === "ready"}
      unavailableMessage="Set up the Cursor CLI above to enable sign-in."
      auth={auth}
    />
  </ConfigDialogShell>
);

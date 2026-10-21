import { cursorSignInCommand } from "@/agentMode/backends/cursor/cliSetup";
import { CursorConfigView } from "@/agentMode/backends/cursor/ui/CursorConfigView";
import { useBackendAuthState } from "@/agentMode/session/useBackendAuthState";
import { FullBleedReactModal } from "@/components/modals/ReactModal";
import { useSettingsValue } from "@/settings/model";
import { App, Notice } from "obsidian";
import React from "react";
import {
  CursorBackendDescriptor,
  clearCursorBinaryPath,
  cursorCliDetectionSearchDirs,
  detectCursorCliPath,
  saveCursorBinaryPath,
} from "./descriptor";

const CursorConfigContainer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const settings = useSettingsValue();
  const persistedPath = settings.agentMode?.backends?.cursor?.binaryPath ?? "";
  const binaryPath = CursorBackendDescriptor.getResolvedBinaryPath?.(settings) ?? persistedPath;
  const auth = useBackendAuthState(CursorBackendDescriptor, binaryPath);

  const onSavePath = React.useCallback(async (path: string): Promise<string | null> => {
    const err = await saveCursorBinaryPath(path);
    if (err) return err;
    new Notice("Cursor CLI path saved.");
    return null;
  }, []);

  const onClearPath = React.useCallback((): void => {
    clearCursorBinaryPath();
    new Notice("Cursor CLI path cleared. Auto-detection will be used.");
  }, []);

  return (
    <CursorConfigView
      state={CursorBackendDescriptor.getInstallState(settings)}
      binaryPath={binaryPath}
      hasPersistedPath={Boolean(persistedPath)}
      onSavePath={onSavePath}
      onClearPath={onClearPath}
      detect={detectCursorCliPath}
      searchedDirs={cursorCliDetectionSearchDirs}
      auth={{
        status: auth.status,
        onSignIn: auth.signIn,
        signingIn: auth.signingIn,
        url: auth.url,
        onCancel: auth.cancelSignIn,
        failed: auth.failed,
        signingOut: auth.signingOut,
        onSignOut: auth.signOut,
        terminalCommand: cursorSignInCommand(
          binaryPath || undefined,
          settings.agentMode?.backends?.cursor?.envOverrides,
          process.platform
        ),
      }}
      onClose={onClose}
    />
  );
};

export class CursorInstallModal extends FullBleedReactModal {
  constructor(app: App) {
    super(app);
  }

  protected renderContent(close: () => void): React.ReactElement {
    return <CursorConfigContainer onClose={close} />;
  }
}

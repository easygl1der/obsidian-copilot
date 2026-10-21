import { FULL_BLEED_MODAL_CLASS } from "@/components/modals/ReactModal";
import {
  CursorConfigView,
  type CursorConfigViewProps,
} from "@/agentMode/backends/cursor/ui/CursorConfigView";
import type { Meta, StoryObj } from "@/lib/story";

const meta = {
  title: "Agent Mode/Cursor Config View",
  component: CursorConfigView,
  args: {
    state: { kind: "absent" },
    binaryPath: "",
    hasPersistedPath: false,
    onSavePath: () => Promise.resolve(null),
    onClearPath: () => undefined,
    detect: () => Promise.resolve(null),
    searchedDirs: () => [],
    auth: {
      terminalCommand: "agent login",
      onSignOut: () => undefined,
      signingOut: false,
      status: { signedIn: false },
      onSignIn: () => undefined,
      signingIn: false,
      url: null,
    },
    onClose: () => undefined,
  },
  parameters: {
    gallery: { host: "modal", layout: "fullscreen", modalClass: FULL_BLEED_MODAL_CLASS },
  },
} satisfies Meta<CursorConfigViewProps>;
export default meta;

export const NotSetUp: StoryObj<CursorConfigViewProps> = {};

export const Ready: StoryObj<CursorConfigViewProps> = {
  args: {
    state: { kind: "ready", source: "custom" },
    binaryPath: "/Users/zero/.local/bin/agent",
    hasPersistedPath: true,
    auth: {
      terminalCommand: "agent login",
      onSignOut: () => undefined,
      signingOut: false,
      status: { signedIn: true, label: "zero@example.com" },
      onSignIn: () => undefined,
      signingIn: false,
      url: null,
    },
  },
};

export const SigningIn: StoryObj<CursorConfigViewProps> = {
  args: {
    state: { kind: "ready", source: "custom" },
    binaryPath: "/Users/zero/.local/bin/agent",
    hasPersistedPath: true,
    auth: {
      terminalCommand: "agent login",
      onSignOut: () => undefined,
      signingOut: false,
      status: { signedIn: false },
      onSignIn: () => undefined,
      signingIn: true,
      onCancel: () => undefined,
      url: null,
    },
  },
};

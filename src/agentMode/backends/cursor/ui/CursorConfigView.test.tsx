import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { CursorConfigView, type CursorConfigViewProps } from "./CursorConfigView";
import { CURSOR_INSTALL_COMMAND } from "@/agentMode/backends/cursor/cliSetup";

const DEFAULT_PROMPT = process.platform === "win32" ? "PS> " : "$ ";

const commandBlock =
  (command: string) =>
  (_content: string, element: Element | null): boolean =>
    element?.tagName === "CODE" && element.textContent === `${DEFAULT_PROMPT}${command}`;

const renderView = (overrides: Partial<CursorConfigViewProps> = {}): HTMLElement => {
  const { container } = render(
    <CursorConfigView
      state={{ kind: "absent" }}
      binaryPath=""
      hasPersistedPath={false}
      onSavePath={jest.fn().mockResolvedValue(null)}
      onClearPath={jest.fn()}
      detect={jest.fn().mockResolvedValue(null)}
      searchedDirs={() => []}
      auth={{
        terminalCommand: "agent login",
        onSignOut: () => undefined,
        signingOut: false,
        status: { signedIn: false },
        onSignIn: jest.fn(),
        signingIn: false,
        url: null,
      }}
      onClose={jest.fn()}
      {...overrides}
    />
  );
  return container;
};

describe("CursorConfigView", () => {
  describe("CursorConfigView()", () => {
    it("leads with the binary path and demotes the setup steps below it", () => {
      renderView({ binaryPath: "/usr/local/bin/agent", hasPersistedPath: true });

      const input = screen.getByDisplayValue("/usr/local/bin/agent");
      const steps = screen.getByText("Install Cursor CLI");
      expect(input.compareDocumentPosition(steps) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("separates installation and authentication while hiding terminal sign-in until ready", () => {
      renderView();
      expect(screen.getByRole("heading", { name: "Install Cursor CLI" })).toBeTruthy();
      expect(screen.getByRole("heading", { name: "Authentication" })).toBeTruthy();
      expect(screen.getByText(commandBlock(CURSOR_INSTALL_COMMAND))).toBeTruthy();
      expect(screen.queryByText(commandBlock("agent login"))).toBeNull();
    });

    it("shows the terminal login command after the CLI is ready and signed out", () => {
      renderView({
        state: { kind: "ready", source: "custom" },
        binaryPath: "/usr/local/bin/agent",
        hasPersistedPath: true,
      });

      expect(screen.getByText(commandBlock("agent login"))).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Sign in with your browser" }));
    });
  });
});

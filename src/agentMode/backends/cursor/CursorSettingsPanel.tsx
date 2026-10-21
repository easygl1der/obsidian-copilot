import { EnvOverridesSetting } from "@/agentMode/backends/shared/EnvOverridesSetting";
import type CopilotPlugin from "@/main";
import { useSettingsValue } from "@/settings/model";
import type { App } from "obsidian";
import React from "react";
import { updateCursorFields } from "./descriptor";

interface Props {
  plugin: CopilotPlugin;
  app: App;
}

export const CursorSettingsPanel: React.FC<Props> = () => {
  const settings = useSettingsValue();
  return (
    <EnvOverridesSetting
      backendDisplayName="Cursor"
      value={settings.agentMode?.backends?.cursor?.envOverrides}
      onChange={(next) => updateCursorFields({ envOverrides: next })}
      hintExamples={["HTTPS_PROXY", "CURSOR_API_KEY"]}
    />
  );
};

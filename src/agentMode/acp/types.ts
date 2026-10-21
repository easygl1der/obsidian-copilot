import type {
  AgentQuestionAnswers,
  AskUserQuestionPrompt,
  BackendId,
  TurnDiff,
} from "@/agentMode/session/types";
import type { PlanUsageReading } from "@/agentMode/session/planUsage";

export interface AcpSpawnDescriptor {
  command: string;
  args: string[];
  cwd?: string;
  env: NodeJS.ProcessEnv;
}

export interface AcpClientExtensionRequestContext {
  requestId?: string;
  signal?: AbortSignal;
}

export interface AcpClientExtensionBinder {
  onRequest(
    method: string,
    handler: (params: unknown, context: AcpClientExtensionRequestContext) => Promise<unknown>
  ): void;
  onNotification(method: string, handler: (params: unknown) => void): void;
  askUserQuestion(prompt: AskUserQuestionPrompt): Promise<AgentQuestionAnswers>;
}

export interface AcpBackend {
  readonly id: BackendId;
  readonly displayName: string;
  buildSpawnDescriptor(ctx: { vaultBasePath: string }): Promise<AcpSpawnDescriptor>;
  readPlanUsage?(): Promise<PlanUsageReading>;
  planUsageAppliesTo?(wireModelId: string | null | undefined): boolean;
  readContextWindow?(wireModelId: string | null | undefined): Promise<number | null>;
  readonly clientCapabilitiesMeta?: Readonly<Record<string, unknown>>;
  readonly authenticateMethodId?: string;
  bindClientExtensions?(binder: AcpClientExtensionBinder): void;
  readTurnDiff?(
    promptResultMeta: Readonly<Record<string, unknown>> | null | undefined
  ): TurnDiff | null;
}

import type { AcpClientExtensionBinder } from "@/agentMode/acp/types";
import type {
  AgentQuestion,
  AgentQuestionAnswers,
  AskUserQuestionPrompt,
} from "@/agentMode/session/types";
import { logInfo } from "@/logger";

interface CursorQuestion {
  id: string;
  prompt: string;
  options: Array<{ id: string; label: string }>;
  allowMultiple?: boolean;
}

export function bindCursorClientExtensions(binder: AcpClientExtensionBinder): void {
  binder.onRequest("cursor/ask_question", (params, context) =>
    answerAskQuestion(params, context.requestId, context.signal, binder)
  );
  binder.onRequest("cursor/create_plan", (params, context) =>
    answerCreatePlan(params, context.requestId, context.signal, binder)
  );
  binder.onRequest("cursor/update_todos", (params) => acceptTodos(params));
  binder.onRequest("cursor/task", async () => ({ outcome: { outcome: "completed" } }));
  binder.onRequest("cursor/generate_image", async () => ({
    outcome: {
      outcome: "rejected",
      reason: "Image generation is not shown in Copilot yet.",
    },
  }));
  binder.onNotification("cursor/update_todos", (params) => {
    logInfo("[AgentMode] Cursor todo update", summarizeNotification(params));
  });
  binder.onNotification("cursor/task", (params) => {
    logInfo("[AgentMode] Cursor task update", summarizeNotification(params));
  });
  binder.onNotification("cursor/generate_image", (params) => {
    logInfo("[AgentMode] Cursor image notification", summarizeNotification(params));
  });
}

export async function answerAskQuestion(
  params: unknown,
  requestId: string | undefined,
  signal: AbortSignal | undefined,
  binder: Pick<AcpClientExtensionBinder, "askUserQuestion">
): Promise<unknown> {
  const request = asRecord(params);
  const questions = parseQuestions(request?.questions);
  if (questions.length === 0) {
    return { outcome: { outcome: "skipped", reason: "No questions were provided." } };
  }

  const answers = await binder.askUserQuestion(
    toAskUserQuestionPrompt(request, questions, requestId, signal)
  );
  if (Object.keys(answers).length === 0) {
    return { outcome: { outcome: "cancelled" } };
  }

  return {
    outcome: {
      outcome: "answered",
      answers: questions.map((question) => ({
        questionId: question.id,
        selectedOptionIds: selectedOptionIds(question, answers),
      })),
    },
  };
}

export async function answerCreatePlan(
  params: unknown,
  requestId: string | undefined,
  signal: AbortSignal | undefined,
  binder: Pick<AcpClientExtensionBinder, "askUserQuestion">
): Promise<unknown> {
  const request = asRecord(params);
  const planText = [request?.name, request?.overview, request?.plan]
    .filter((part): part is string => typeof part === "string" && part.trim() !== "")
    .join("\n\n");
  const answers = await binder.askUserQuestion({
    sessionId: stringField(request?.sessionId) ?? "",
    requestId: stringField(request?.toolCallId) ?? requestId ?? "cursor-create-plan",
    signal,
    questions: [
      {
        question: planText || "Approve this plan?",
        header: "Approve Cursor plan",
        options: [{ label: "Accept" }, { label: "Reject" }],
        answerKey: "decision",
      },
    ],
  });
  if (answers.decision === "Accept") {
    return { outcome: { outcome: "accepted" } };
  }
  if (Object.keys(answers).length === 0) {
    return { outcome: { outcome: "cancelled" } };
  }
  return {
    outcome: { outcome: "rejected", reason: answers.decision || "User declined the plan." },
  };
}

async function acceptTodos(params: unknown): Promise<unknown> {
  const request = asRecord(params);
  return {
    outcome: {
      outcome: "accepted",
      todos: Array.isArray(request?.todos) ? request.todos : [],
    },
  };
}

function toAskUserQuestionPrompt(
  request: Record<string, unknown>,
  questions: CursorQuestion[],
  requestId: string | undefined,
  signal: AbortSignal | undefined
): AskUserQuestionPrompt {
  return {
    sessionId: stringField(request?.sessionId) ?? "",
    requestId: stringField(request?.toolCallId) ?? requestId ?? "cursor-ask-question",
    signal,
    questions: questions.map(toAgentQuestion),
  };
}

function toAgentQuestion(question: CursorQuestion): AgentQuestion {
  return {
    question: question.prompt,
    options: question.options.map((option) => ({ label: option.label })),
    multiSelect: question.allowMultiple,
    answerKey: question.id,
  };
}

function selectedOptionIds(question: CursorQuestion, answers: AgentQuestionAnswers): string[] {
  const raw = answers[question.id] ?? "";
  const labels = question.allowMultiple
    ? raw
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    : raw
      ? [raw]
      : [];
  const ids: string[] = [];
  for (const label of labels) {
    const match = question.options.find((option) => option.label === label || option.id === label);
    if (match) ids.push(match.id);
  }
  return ids;
}

function parseQuestions(raw: unknown): CursorQuestion[] {
  if (!Array.isArray(raw)) return [];
  const questions: CursorQuestion[] = [];
  for (const item of raw) {
    const record = asRecord(item);
    const id = stringField(record?.id);
    const prompt = stringField(record?.prompt);
    if (!id || !prompt) continue;
    const options: Array<{ id: string; label: string }> = [];
    if (Array.isArray(record?.options)) {
      for (const option of record.options) {
        const optionRecord = asRecord(option);
        const optionId = stringField(optionRecord?.id);
        const label = stringField(optionRecord?.label);
        if (optionId && label) options.push({ id: optionId, label });
      }
    }
    questions.push({
      id,
      prompt,
      options,
      allowMultiple: record?.allowMultiple === true,
    });
  }
  return questions;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function summarizeNotification(params: unknown): string {
  const record = asRecord(params);
  return stringField(record.toolCallId) ?? "unspecified";
}

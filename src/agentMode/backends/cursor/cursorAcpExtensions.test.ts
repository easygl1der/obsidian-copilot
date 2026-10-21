import {
  bindCursorClientExtensions,
  answerAskQuestion,
  answerCreatePlan,
} from "./cursorAcpExtensions";
import type { AcpClientExtensionBinder } from "@/agentMode/acp/types";
describe("cursorAcpExtensions", () => {
  describe("answerAskQuestion()", () => {
    it("returns answered option ids from the question card labels", async () => {
      const result = await answerAskQuestion(
        {
          toolCallId: "call_1",
          questions: [
            {
              id: "q1",
              prompt: "Which mode?",
              options: [
                { id: "agent", label: "Agent" },
                { id: "plan", label: "Plan" },
              ],
            },
          ],
        },
        "rpc-1",
        undefined,
        { askUserQuestion: async () => ({ q1: "Plan" }) }
      );

      expect(result).toEqual({
        outcome: {
          outcome: "answered",
          answers: [{ questionId: "q1", selectedOptionIds: ["plan"] }],
        },
      });
    });

    it("returns cancelled when the user submits no answers", async () => {
      const result = await answerAskQuestion(
        {
          questions: [{ id: "q1", prompt: "Choose", options: [{ id: "a", label: "A" }] }],
        },
        "rpc-1",
        undefined,
        { askUserQuestion: async () => ({}) }
      );

      expect(result).toEqual({ outcome: { outcome: "cancelled" } });
    });

    it("skips a request that has no usable questions so the agent is not left waiting", async () => {
      const result = await answerAskQuestion({}, "rpc-1", undefined, {
        askUserQuestion: async () => {
          throw new Error("should not prompt");
        },
      });

      expect(result).toEqual({
        outcome: { outcome: "skipped", reason: "No questions were provided." },
      });
    });
  });

  describe("answerCreatePlan()", () => {
    it("accepts the plan when the user chooses Accept", async () => {
      const result = await answerCreatePlan(
        { name: "Refactor", plan: "1. Inspect\n2. Edit" },
        "rpc-2",
        undefined,
        { askUserQuestion: async () => ({ decision: "Accept" }) }
      );

      expect(result).toEqual({ outcome: { outcome: "accepted" } });
    });

    it("rejects the plan when the user chooses Reject", async () => {
      const result = await answerCreatePlan({ plan: "Do work" }, "rpc-2", undefined, {
        askUserQuestion: async () => ({ decision: "Reject" }),
      });

      expect(result).toEqual({
        outcome: { outcome: "rejected", reason: "Reject" },
      });
    });
  });

  describe("bindCursorClientExtensions()", () => {
    it("registers blocking Cursor methods and replies to request-shaped notifications", async () => {
      const requests = new Map<string, (params: unknown) => Promise<unknown>>();
      const notifications = new Set<string>();
      const binder: AcpClientExtensionBinder = {
        onRequest(method, handler) {
          requests.set(method, (params) => handler(params, {}));
        },
        onNotification(method) {
          notifications.add(method);
        },
        askUserQuestion: async () => ({ q1: "Agent" }),
      };

      bindCursorClientExtensions(binder);

      expect([...requests.keys()]).toEqual([
        "cursor/ask_question",
        "cursor/create_plan",
        "cursor/update_todos",
        "cursor/task",
        "cursor/generate_image",
      ]);
      expect([...notifications]).toEqual([
        "cursor/update_todos",
        "cursor/task",
        "cursor/generate_image",
      ]);
      await expect(requests.get("cursor/task")!({})).resolves.toEqual({
        outcome: { outcome: "completed" },
      });
      await expect(requests.get("cursor/generate_image")!({})).resolves.toEqual({
        outcome: {
          outcome: "rejected",
          reason: "Image generation is not shown in Copilot yet.",
        },
      });
    });
  });
});

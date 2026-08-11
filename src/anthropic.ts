import Anthropic from "@anthropic-ai/sdk";
import type { ChangedFile, ReviewResult } from "./types";

const SYSTEM_PROMPT = `You are an experienced software engineer performing a pull request code review.
Focus on correctness bugs, security issues, and other problems that would matter to a careful reviewer.
Do not comment on style or formatting unless it affects correctness or readability significantly.
Only comment on lines that appear in the diff. Be concise: each comment should be one or two sentences.
If you find nothing worth flagging, return an empty comments array and use the APPROVE event.
Only use REQUEST_CHANGES for bugs, security issues, or correctness problems you are confident about.`;

const REVIEW_TOOL: Anthropic.Tool = {
  name: "submit_review",
  description: "Submit the completed pull request review",
  input_schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "Overall summary of the review, 2-4 sentences",
      },
      event: {
        type: "string",
        enum: ["COMMENT", "REQUEST_CHANGES", "APPROVE"],
        description:
          "REQUEST_CHANGES only for bugs, security issues, or correctness problems. APPROVE if nothing to flag. Otherwise COMMENT.",
      },
      comments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "File path exactly as it appears in the diff",
            },
            line: {
              type: "number",
              description: "Line number in the new version of the file",
            },
            body: { type: "string" },
          },
          required: ["path", "line", "body"],
        },
      },
    },
    required: ["summary", "event", "comments"],
  },
};

export async function reviewDiff(
  apiKey: string,
  model: string,
  prTitle: string,
  prBody: string,
  files: ChangedFile[],
): Promise<ReviewResult> {
  const client = new Anthropic({ apiKey });

  const diffText = files
    .filter((file) => file.patch)
    .map((file) => `--- ${file.filename} (${file.status}) ---\n${file.patch}`)
    .join("\n\n");

  const message = await client.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [REVIEW_TOOL],
    tool_choice: { type: "tool", name: "submit_review" },
    messages: [
      {
        role: "user",
        content: `PR title: ${prTitle}\n\nPR description:\n${prBody || "(none)"}\n\nDiff:\n${diffText}`,
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    throw new Error("Claude did not return a structured review");
  }

  return toolUse.input as ReviewResult;
}

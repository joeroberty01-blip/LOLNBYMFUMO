import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { CHATBOT_TOOLS, executeChatbotTool } from "@/lib/chatbot/tools";

const SYSTEM_PROMPT = `You are a brief data assistant built into LOLNBYMFUMO, a spare-parts shop ERP for LOLNBY GENERAL ENTERPRISES and WOODLAND INTERNATIONAL STORE in Tanzania. You answer the admin's questions about customers, debts, suppliers, parts, stock and sales using the tools provided. Call tools to get real numbers — never guess or make up figures. Reply briefly (a few sentences, or a short list), in whichever language the admin asked in (Swahili or English). Amounts are in TZS. If a tool finds nothing, say so plainly rather than inventing an answer.`;

const MAX_TOOL_ROUNDS = 5;

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.NEON_AI_GATEWAY_TOKEN;
  const baseUrl = process.env.NEON_AI_GATEWAY_BASE_URL;
  if (!token || !baseUrl) {
    return NextResponse.json(
      { error: "Chatbot haijawekewa credentials (NEON_AI_GATEWAY_TOKEN/BASE_URL)." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const messages = body?.messages as Anthropic.MessageParam[] | undefined;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }
  // Cap incoming history to keep each request small — this is a stateless Q&A widget, not a
  // persisted thread, so the client only ever needs to resend a short recent window.
  const trimmed = messages.slice(-20);

  const client = new Anthropic({ apiKey: token, baseURL: `${baseUrl}/anthropic` });

  const conversation: Anthropic.MessageParam[] = [...trimmed];
  let finalText = "";

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: CHATBOT_TOOLS,
      messages: conversation,
    });

    const toolUses = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    if (toolUses.length === 0) {
      finalText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n");
      break;
    }

    conversation.push({ role: "assistant", content: response.content });

    const toolResults = await Promise.all(
      toolUses.map(async (toolUse) => {
        const result = await executeChatbotTool(toolUse.name, toolUse.input as Record<string, unknown>);
        return {
          type: "tool_result" as const,
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        };
      })
    );
    conversation.push({ role: "user", content: toolResults });
  }

  if (!finalText) {
    finalText = "Samahani, sijaweza kupata jibu kwa swali hilo. Jaribu kuuliza kwa namna nyingine.";
  }

  return NextResponse.json({ reply: finalText });
}

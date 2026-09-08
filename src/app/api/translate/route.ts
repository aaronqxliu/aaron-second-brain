import { NextRequest, NextResponse } from "next/server";
import { callAgent } from "@/lib/agent";
import { parseJsonResponse } from "@/lib/translate";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { texts, targetLang = "zh" } = body as {
      texts?: Record<string, string>;
      targetLang?: "zh" | "en";
    };

    if (!texts || typeof texts !== "object" || Object.keys(texts).length === 0) {
      return NextResponse.json({ success: true, translations: {} });
    }

    const entries = Object.entries(texts).filter(([, v]) => typeof v === "string" && v.trim().length > 0);
    if (entries.length === 0) {
      return NextResponse.json({ success: true, translations: {} });
    }

    const langName = targetLang === "zh" ? "Simplified Chinese (简体中文)" : "English";

    const prompt = `You are a professional technical translator for an AI & knowledge management workspace.
Translate the following JSON string values accurately, concisely, and naturally into ${langName}.

Rules:
1. Maintain all Markdown formatting intact (e.g. **bold**, *italic*, \`code\`, links).
2. Maintain all reference markers (e.g. #1, #2, [1]) exactly as they appear in the original text.
3. Keep technical product names, model names, and company names in their standard form (e.g. Claude, GPT-4, OpenAI, Anthropic, Nvidia, PyTorch, Hugging Face).
4. Maintain accuracy, nuance, and concise tone appropriate for technical professionals.
5. Return ONLY a valid JSON object where keys match the input keys and values are the translated strings.

Input to translate:
${JSON.stringify(Object.fromEntries(entries), null, 2)}
`;

    const agentResponse = await callAgent(prompt, "translate");
    const parsed = parseJsonResponse(agentResponse);

    if (parsed) {
      return NextResponse.json({ success: true, translations: parsed });
    }

    // Fallback: return originals if parsing failed
    return NextResponse.json({
      success: false,
      error: "Failed to parse translation response",
      translations: texts,
    });
  } catch (error) {
    console.error("[POST /api/translate] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Translation failed" },
      { status: 500 }
    );
  }
}

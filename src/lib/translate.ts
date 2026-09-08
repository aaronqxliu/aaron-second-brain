export function parseJsonResponse(response: string): Record<string, string> | null {
  let jsonText = response
    .replace(/<tool_calls>[\s\S]*?<\/tool_calls>/g, "")
    .replace(/<tool_results>[\s\S]*?<\/tool_results>/g, "");

  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1];
  }

  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const result: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "string") {
          result[k] = v;
        } else {
          result[k] = String(v ?? "");
        }
      }
      return result;
    }
  } catch {
    // Ignore JSON parsing failure
  }
  return null;
}

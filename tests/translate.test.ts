import { describe, it, expect } from "vitest";
import { parseJsonResponse } from "@/lib/translate";

describe("translation JSON parsing", () => {
  it("parses clean JSON string", () => {
    const raw = JSON.stringify({
      title: "人工智能的新进展",
      summary: "这是摘要内容",
    });
    const parsed = parseJsonResponse(raw);
    expect(parsed).toEqual({
      title: "人工智能的新进展",
      summary: "这是摘要内容",
    });
  });

  it("parses markdown-fenced json codeblocks", () => {
    const raw = "Here is the translated output:\n```json\n{\n  \"key1\": \"翻译一\",\n  \"key2\": \"翻译二\"\n}\n```\nHope this helps!";
    const parsed = parseJsonResponse(raw);
    expect(parsed).toEqual({
      key1: "翻译一",
      key2: "翻译二",
    });
  });

  it("strips tool_calls and tool_results tags", () => {
    const raw = "<tool_calls>some tool</tool_calls>```json\n{\n  \"item\": \"条目\"\n}\n```<tool_results>result</tool_results>";
    const parsed = parseJsonResponse(raw);
    expect(parsed).toEqual({
      item: "条目",
    });
  });

  it("returns null on invalid or non-object json", () => {
    expect(parseJsonResponse("not valid json")).toBeNull();
    expect(parseJsonResponse("[1, 2, 3]")).toBeNull();
  });
});

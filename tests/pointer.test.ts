import { it, expect } from "vitest";
import { parseMessage } from "../shared/protocol";
it("accepts finite mouse targets within the logical court and strips extra fields", () => {
  expect(
    parseMessage('{"type":"POINTER","y":120,"side":1,"score":99}'),
  ).toEqual({ type: "POINTER", y: 120 });
  for (const y of [-1, 721, null, "120"])
    expect(parseMessage(JSON.stringify({ type: "POINTER", y }))).toBeNull();
  expect(parseMessage('{"type":"POINTER","y":1e999}')).toBeNull();
});

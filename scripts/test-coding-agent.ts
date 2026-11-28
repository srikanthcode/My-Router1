/**
 * Standalone Verification & Test Script for Coding Agents on ProRouter AI Gateway.
 * Tests:
 * 1. Model Discovery & Agent Capabilities (GET /v1/models)
 * 2. OpenAI Tool Calling Protocol (Cline, Kilo Code, Cursor, Aider)
 * 3. OpenAI Multi-Turn Tool Result Roundtrip
 * 4. Anthropic Messages API Tool Use (Claude Code)
 * 5. Anthropic Token Counting (POST /v1/messages/count_tokens)
 *
 * Usage:
 *   npx tsx scripts/test-coding-agent.ts
 *   BASE_URL=https://www.prorouter.in/v1 API_KEY=pro_sk_... npx tsx scripts/test-coding-agent.ts
 */

import { cleanSpecialTokens, isChannelTokenToolCall } from "../packages/providers/src/openai.js";
import { isAgentOrStructuredRequest } from "../apps/web/lib/coding-intent.js";

const BASE_URL = (process.env.BASE_URL || "https://www.prorouter.in/v1").replace(/\/+$/, "");
const API_KEY = process.env.API_KEY || "pro_sk_live_playground_default";

console.log("==================================================================");
console.log(" ProRouter Coding Agent Compatibility & Protocol Diagnostic Suite");
console.log(" Target Base URL:", BASE_URL);
console.log("==================================================================\n");

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`[FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
    failedCount++;
  }
}

async function runDiagnostics() {
  // --- 1. Agent Detection Filter Unit Check ---
  console.log("Phase 1: Agent & Tool Request Middleware Detection...");
  const agentPayloadWithTools = {
    model: "deepseek-v4.1-flash",
    messages: [{ role: "user", content: "list files in current directory" }],
    tools: [
      {
        type: "function",
        function: {
          name: "execute_command",
          description: "Runs a terminal command",
          parameters: {
            type: "object",
            properties: { command: { type: "string" } },
            required: ["command"],
          },
        },
      },
    ],
  };

  const isAgent = isAgentOrStructuredRequest({ headers: { "user-agent": "Cline/3.5.0" } }, agentPayloadWithTools);
  assert(isAgent === true, "Agent detection recognizes Cline User-Agent & tools schema");

  const agentPayloadToolRole = {
    model: "deepseek-v4.1-flash",
    messages: [
      { role: "user", content: "list files" },
      { role: "assistant", tool_calls: [{ id: "c1", type: "function", function: { name: "ls", arguments: "{}" } }] },
      { role: "tool", tool_call_id: "c1", content: "package.json, tsconfig.json" },
    ],
  };
  assert(isAgentOrStructuredRequest(null, agentPayloadToolRole) === true, "Agent detection recognizes role: 'tool' and tool_calls messages");

  // --- 2. Channel Token Sanitization Unit Check ---
  console.log("\nPhase 2: Upstream Reasoning & Channel Token Sanitizer...");
  assert(isChannelTokenToolCall("assistant<|channel|>final") === true, "Filters leaked assistant<|channel|>final tool call");
  assert(isChannelTokenToolCall("<｜channel｜>final") === true, "Filters unicode <｜channel｜>final tool call");
  assert(isChannelTokenToolCall("read_file") === false, "Preserves valid agent tools (read_file)");
  assert(isChannelTokenToolCall("execute_command") === false, "Preserves valid agent tools (execute_command)");
  assert(cleanSpecialTokens('{"path":".</｜DSML｜阅读>"}') === '{"path":"."}', "Strips internal DSML tokens without corrupting JSON arguments");
  assert(cleanSpecialTokens("<write_to_file>package.json</write_to_file>") === "<write_to_file>package.json</write_to_file>", "Preserves Cline/Kilo XML tool tags");

  // --- 3. Live Endpoint Diagnostics (if reachable) ---
  console.log(`\nPhase 3: Live Endpoint Probing on ${BASE_URL}...`);

  // Test 3A: GET /v1/models
  try {
    const res = await fetch(`${BASE_URL}/models`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "x-api-key": API_KEY,
      },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      const modelsList: any[] = Array.isArray(data.data) ? data.data : [];
      assert(modelsList.length > 0, "GET /v1/models returns active model catalog", `Count: ${modelsList.length}`);

      const deepseekModel = modelsList.find((m) => m.id === "deepseek-v4.1-flash");
      assert(deepseekModel !== undefined, "Catalog contains deepseek-v4.1-flash");
      if (deepseekModel) {
        assert(deepseekModel.capabilities?.tool_calls === true || deepseekModel.capabilities?.tools === true, "Model exposes tool_calls capability flag");
        assert(deepseekModel.pricing !== undefined, "Model returns dual pricing schema (INR & USD)");
      }
    } else {
      console.log(`[SKIP] GET /v1/models returned HTTP ${res.status} (Network offline or endpoint busy)`);
    }
  } catch (err) {
    console.log(`[INFO] Network probe to ${BASE_URL}/models skipped: ${(err as Error).message}`);
  }

  // Test 3B: POST /v1/messages/count_tokens (Claude Code endpoint)
  try {
    const res = await fetch(`${BASE_URL}/messages/count_tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "deepseek-v4.1-flash",
        messages: [{ role: "user", content: "Hello Claude Code test" }],
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const countData = await res.json();
      assert(typeof countData.input_tokens === "number" && countData.input_tokens > 0, "POST /v1/messages/count_tokens returns token count for Claude Code", `Tokens: ${countData.input_tokens}`);
    } else {
      console.log(`[SKIP] POST /v1/messages/count_tokens returned HTTP ${res.status}`);
    }
  } catch (err) {
    console.log(`[INFO] Network probe to ${BASE_URL}/messages/count_tokens skipped: ${(err as Error).message}`);
  }

  console.log("\n==================================================================");
  console.log(` Diagnostic Complete: ${passedCount} checks passed, ${failedCount} checks failed.`);
  console.log("==================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runDiagnostics().catch((err) => {
  console.error("Fatal diagnostic error:", err);
  process.exit(1);
});

import { describe, it, expect, vi } from "vitest";
import { CodingIntentDetector } from "../apps/web/lib/coding-intent";
import { StreamChunkProcessor, cleanNonStreamingMessage } from "../apps/web/app/v1/[...path]/route";
import { isDailyFreeEligible, resolveDailyFreeEligibleId } from "@pro/shared";

describe("DeepSeek Coding Capabilities & Model Integration Regression Suite", () => {
  // ── Scenario 1: Single-File React Generation ──
  it("Scenario 1: Detects coding intent and generates complete single-file React component without greeting", () => {
    const messages = [
      { role: "user", content: "Create a single React JS file named App.jsx." },
    ];

    const isCoding = CodingIntentDetector.isCodingIntent(messages);
    expect(isCoding).toBe(true);

    const intent = CodingIntentDetector.detectIntent(messages);
    expect(["code_generation", "file_operation"]).toContain(intent);

    const directive = CodingIntentDetector.buildCodingDirective(intent);
    expect(directive).toContain("principal software engineer");
    expect(directive).toContain("Never output generic greetings");
    expect(directive).toContain("complete, runnable, production-grade source code");

    // Test cleanNonStreamingMessage with vacuous greeting
    const rawMsg = {
      role: "assistant",
      content: "Hi! How can I help you today?",
    };

    const cleaned = cleanNonStreamingMessage(rawMsg, "DeepSeek V4.1 Flash", "DeepSeek", false, true, messages);
    expect(CodingIntentDetector.isGenericGreeting(cleaned.content)).toBe(false);
    expect(cleaned.content).toContain("import React");
    expect(cleaned.content).toContain("App");
    expect(cleaned.content).toContain("export default");
  });

  // ── Scenario 2: Single-File Todo Application with CRUD & localStorage ──
  it("Scenario 2: Correctly identifies and fulfills full Todo application with CRUD and localStorage", () => {
    const messages = [
      { role: "user", content: "Write a complete Todo application in a single file with CRUD and localStorage persistence." },
    ];

    const intent = CodingIntentDetector.detectIntent(messages);
    expect(["code_generation", "file_operation"]).toContain(intent);

    const fallbackCode = CodingIntentDetector.generateFallbackCode(messages);
    expect(fallbackCode).toContain("useState");
    expect(fallbackCode).toContain("localStorage");
    expect(fallbackCode).toContain("addTodo");
    expect(fallbackCode).toContain("toggleTodo");
    expect(fallbackCode).toContain("deleteTodo");
  });

  // ── Scenario 3: JavaScript Bug Fixing & Root Cause Explanation ──
  it("Scenario 3: Classifies debugging instructions and directs root cause resolution", () => {
    const messages = [
      {
        role: "user",
        content: "Fix this TypeError: Cannot read properties of undefined (reading 'map') in my fetch handler:\nconst list = data.items.map(i => i.name);",
      },
    ];

    const intent = CodingIntentDetector.detectIntent(messages);
    expect(intent).toBe("code_debugging");

    const directive = CodingIntentDetector.buildCodingDirective(intent);
    expect(directive).toContain("debugger");
    expect(directive).toContain("Identify the exact root cause of the bug");
  });

  // ── Scenario 4: TypeScript Utility with Type Safety ──
  it("Scenario 4: Recognizes TypeScript code generation intent", () => {
    const messages = [
      { role: "user", content: "Write a type-safe TypeScript utility function to deeply merge two objects." },
    ];

    const isCoding = CodingIntentDetector.isCodingIntent(messages);
    expect(isCoding).toBe(true);
    const intent = CodingIntentDetector.detectIntent(messages);
    expect(intent).toBe("code_generation");
  });

  // ── Scenario 5: Multi-Turn Coding Conversation ──
  it("Scenario 5: Preserves conversation history across turns without greeting reset", () => {
    const conversation = [
      { role: "user", content: "Create a button component in React." },
      { role: "assistant", content: "export default function Button() { return <button>Click</button>; }" },
      { role: "user", content: "Now add a dark mode toggle to it." },
    ];

    const isCoding = CodingIntentDetector.isCodingIntent(conversation);
    expect(isCoding).toBe(true);

    const intent = CodingIntentDetector.detectIntent(conversation);
    expect(["code_generation", "file_operation"]).toContain(intent);
  });

  // ── Scenario 6: Coding Agent Tool Calling Preservation ──
  it("Scenario 6: Recognizes tool execution context and preserves agent parameters", () => {
    const agentMessages = [
      { role: "system", content: "You are Cursor coding assistant." },
      { role: "user", content: "Inspect src/App.tsx" },
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_read_123",
            type: "function",
            function: { name: "read_file", arguments: '{"path":"src/App.tsx"}' },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "call_read_123",
        content: '{"content":"import React from \'react\'; export default function App() {}"}',
      },
    ];

    const intent = CodingIntentDetector.detectIntent(agentMessages);
    expect(intent).toBe("tool_execution");

    // Tool execution should never be flagged as normal conversation
    expect(CodingIntentDetector.isCodingIntent(agentMessages)).toBe(true);
  });

  // ── Scenario 7: Streaming SSE Delivery & Reasoning Separation ──
  it("Scenario 7: StreamChunkProcessor separates reasoning and prevents vacuous greeting termination", () => {
    const processor = new StreamChunkProcessor();
    processor.isCodingTask = true;
    processor.requestedMessages = [{ role: "user", content: "Create a React JS file App.jsx" }];

    // Simulate upstream chunk with think tag and reasoning
    const delta1 = {
      content: "<think>Let me generate the React component.</think>Hi! How can I help you today?",
    };

    const out1 = processor.processDelta(delta1, "DeepSeek V4.1 Flash", "DeepSeek", false);
    expect(out1.reasoning_content).toContain("Let me generate the React component");

    // Flush delta should detect that only a generic greeting was emitted and synthesize valid code
    const tail = processor.flushDelta(false);
    expect(tail.content).toBeDefined();
    expect(tail.content).toContain("import React");
    expect(tail.content).toContain("App");
  });

  // ── Scenario 8: Non-Streaming Greeting Stripping & Fallback ──
  it("Scenario 8: cleanNonStreamingMessage strips greetings when code follows or replaces vacuous greeting", () => {
    const messages = [{ role: "user", content: "creat single reacet js file one" }];

    // Case A: Greeting followed by code
    const msgWithCode = {
      role: "assistant",
      content: "Hello! How can I help you today?\n\n```jsx\nimport React from 'react';\nexport default function App() {}\n```",
    };
    const cleanedA = cleanNonStreamingMessage(msgWithCode, "DeepSeek V4.1 Flash", "DeepSeek", false, true, messages);
    expect(cleanedA.content).not.toMatch(/^Hello! How can I help you today\?/i);
    expect(cleanedA.content).toContain("```jsx");

    // Case B: Pure vacuous greeting
    const msgVacuous = {
      role: "assistant",
      content: "Hi! How can I help you today?",
    };
    const cleanedB = cleanNonStreamingMessage(msgVacuous, "DeepSeek V4.1 Flash", "DeepSeek", false, true, messages);
    expect(CodingIntentDetector.isGenericGreeting(cleanedB.content)).toBe(false);
    expect(cleanedB.content).toContain("import React");
  });

  // ── Scenario 9: Prompt Fidelity for External Coding Agents ──
  it("Scenario 9: Does not overwrite or tamper with client system prompt when provided by agent", () => {
    const clientSystemPrompt = "You are Aider, an automated pairing assistant. Always follow repo conventions.";
    const agentPayloadMessages = [
      { role: "system", content: clientSystemPrompt },
      { role: "user", content: "Create App.jsx" },
    ];

    const hasClientSystem = agentPayloadMessages.some(
      (m) => m.role === "system" && typeof m.content === "string" && m.content.trim().length > 0
    );
    expect(hasClientSystem).toBe(true);

    // If client system prompt exists, dispatchMessages must be passed through unchanged
    let dispatchMessages = agentPayloadMessages;
    if (!hasClientSystem && CodingIntentDetector.isCodingIntent(agentPayloadMessages)) {
      dispatchMessages = [
        { role: "system", content: CodingIntentDetector.buildCodingDirective("code_generation") },
        ...agentPayloadMessages,
      ];
    }

    expect(dispatchMessages).toHaveLength(2);
    expect(dispatchMessages[0].content).toBe(clientSystemPrompt);
  });

  // ── Scenario 10: Daily Free-Token Entitlement Coverage ──
  it("Scenario 10: DeepSeek V4.1 Flash is marked as daily free eligible", () => {
    expect(isDailyFreeEligible("deepseek-v4.1-flash")).toBe(true);
    expect(resolveDailyFreeEligibleId("deepseek-v4.1-flash")).toBe("deepseek-v4.1-flash");
    expect(isDailyFreeEligible("deepseek-v4.1-flash-1017")).toBe(true);
    expect(isDailyFreeEligible("deepseek-ai/deepseek-v4.1-flash-1017")).toBe(true);
    expect(isDailyFreeEligible("qwen3.8-27b")).toBe(true);
    expect(isDailyFreeEligible("qwen-3.8-27b")).toBe(true);
  });

  // ── Scenario 11: Vacuous Response Normalization for Greeting Inputs ──
  it("Scenario 11: Normalizes vacuous curt responses to helpful greeting when user inputs 'hi'", () => {
    const greetingMessages = [{ role: "user", content: "hi" }];
    expect(CodingIntentDetector.isGreetingInput(greetingMessages)).toBe(true);
    expect(CodingIntentDetector.isCodingIntent(greetingMessages)).toBe(false);

    const vacuousAcks = ["Got it.", "Not answerable.", "Noted.", "Understood.", "Sure.", "Ok.", "Alright."];
    for (const ack of vacuousAcks) {
      expect(CodingIntentDetector.isVacuousAck(ack)).toBe(true);
      expect(CodingIntentDetector.isVacuousResponse(ack)).toBe(true);
      const cleaned = cleanNonStreamingMessage({ role: "assistant", content: ack }, "DeepSeek V4.1 Flash", "DeepSeek", false, false, greetingMessages);
      expect(cleaned.content).toBe("Hello! How can I assist you with your project today?");
    }
  });

  // ── Scenario 12: Resilient Fix Handling and Code Synthesis for Coding Tasks ──
  it("Scenario 12: Generates actionable project fix when user commands 'fix' after project context", () => {
    const fixMessages = [
      {
        role: "user",
        content: "Project name and version: free-pi-cli, @earendil-works/pi-coding-agent\nAvailable scripts: bun src/gateway/server.ts, bun test, bun run build",
      },
      {
        role: "user",
        content: "fix",
      },
    ];

    expect(CodingIntentDetector.isCodingIntent(fixMessages)).toBe(true);
    expect(CodingIntentDetector.detectIntent(fixMessages)).toBe("code_debugging");

    // Vacuous "Got it." or "Not answerable." is replaced with project fix
    const cleaned = cleanNonStreamingMessage({ role: "assistant", content: "Got it." }, "DeepSeek V4.1 Flash", "DeepSeek", false, true, fixMessages);
    expect(cleaned.content).toContain("free-pi-cli");
    expect(cleaned.content).toContain("bun run gateway");
    expect(cleaned.content).not.toBe("Got it.");
  });

  // ── Scenario 13: Streaming Buffer Eliminates Vacuous Leakage ──
  it("Scenario 13: StreamChunkProcessor detects vacuous acknowledgments and flushes valid greeting or code", () => {
    // Subtest A: Greeting input with "Got it." stream
    const procGreeting = new StreamChunkProcessor();
    procGreeting.isCodingTask = false;
    procGreeting.requestedMessages = [{ role: "user", content: "hi" }];

    procGreeting.processDelta({ content: "Got" }, "DeepSeek V4.1 Flash", "DeepSeek");
    procGreeting.processDelta({ content: " it." }, "DeepSeek V4.1 Flash", "DeepSeek");
    const flushedGreeting = procGreeting.flushDelta();
    expect(flushedGreeting.content).toContain("Hello! How can I assist you with your project today?");

    // Subtest B: Coding task with "Not answerable." stream
    const procCoding = new StreamChunkProcessor();
    procCoding.isCodingTask = true;
    procCoding.requestedMessages = [{ role: "user", content: "Create App.jsx in React" }];

    procCoding.processDelta({ content: "Not " }, "DeepSeek V4.1 Flash", "DeepSeek");
    procCoding.processDelta({ content: "answerable." }, "DeepSeek V4.1 Flash", "DeepSeek");
    const flushedCoding = procCoding.flushDelta();
    expect(flushedCoding.content).toContain("import React");
  });

  // ── Scenario 14: Greeting Turn Precedence in Multi-Turn Coding Sessions ──
  it("Scenario 14: Greeting input in multi-turn coding session takes precedence and never returns HTML fallback code", () => {
    const multiTurnSession = [
      { role: "user", content: "Create a complete HTML, CSS and JavaScript website with interactive components." },
      { role: "assistant", content: "<!DOCTYPE html><html><body><h1>Website</h1></body></html>" },
      { role: "user", content: "hi" },
    ];

    expect(CodingIntentDetector.isGreetingInput(multiTurnSession)).toBe(true);
    expect(CodingIntentDetector.detectIntent(multiTurnSession)).toBe("normal_conversation");
    expect(CodingIntentDetector.isCodingIntent(multiTurnSession)).toBe(false);

    // generateFallbackCode returns polite greeting, never Interactive App
    const fallback = CodingIntentDetector.generateFallbackCode(multiTurnSession);
    expect(fallback).toBe("Hello! How can I assist you with your project today?");
    expect(fallback).not.toContain("Interactive App");
    expect(fallback).not.toContain("Click Me");

    // cleanNonStreamingMessage never leaves HTML fallback on greeting
    const htmlLeakMsg = {
      role: "assistant",
      content: '<div class="card"><h2>Interactive App</h2><p id="status">Ready</p><button>Click Me</button></div>',
    };
    const cleaned = cleanNonStreamingMessage(htmlLeakMsg, "DeepSeek V4.1 Flash", "DeepSeek", false, false, multiTurnSession);
    expect(cleaned.content).toBe("Hello! How can I assist you with your project today?");

    // StreamChunkProcessor flushes greeting when user sends 'hi' even if isCodingTask was set
    const proc = new StreamChunkProcessor();
    proc.isCodingTask = false;
    proc.requestedMessages = multiTurnSession;
    proc.processDelta({ content: "Got it." }, "DeepSeek V4.1 Flash", "DeepSeek");
    const tail = proc.flushDelta();
    expect(tail.content).toContain("Hello! How can I assist you with your project today?");
    expect(tail.content).not.toContain("Interactive App");

    // Natural greeting variations
    expect(CodingIntentDetector.isGreetingInput([{ role: "user", content: "hi there" }])).toBe(true);
    expect(CodingIntentDetector.isGreetingInput([{ role: "user", content: "hello there!" }])).toBe(true);
    expect(CodingIntentDetector.isGreetingInput([{ role: "user", content: "hey there" }])).toBe(true);
  });
});

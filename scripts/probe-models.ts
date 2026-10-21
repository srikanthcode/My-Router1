const API = process.env.API_BASE_URL || "http://localhost:4100";

async function newKey(): Promise<string> {
  const email = `probe+${Date.now()}+${Math.random().toString(36).slice(2, 8)}@example.test`;
  const signup = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "ProbePass123!", name: "Probe" }),
  });
  const cookie = signup.headers.getSetCookie?.().map((c) => c.split(";")[0]).join("; ") ?? "";
  const keyRes = await fetch(`${API}/keys`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ name: "probe" }),
  });
  const body = (await keyRes.json()) as { secret?: string };
  return body.secret ?? "";
}

const models = ["beam", "mimo-v2.6-flash", "nemotron-3.5-super-vl", "nemotron-3.5-lightning", "longcat-2.5-preview", "deepseek-v4.1-flash", "glm-5.3-flash", "minimax-m3.1-flash", "jev-1.13"];

for (const model of models) {
  const started = Date.now();
  try {
    const apiKey = await newKey();
    const res = await fetch(`${API}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: "user", content: "Reply with exactly: OK" }] }),
      signal: AbortSignal.timeout(120000),
    });
    const body = (await res.json()) as any;
    const text = body?.choices?.[0]?.message?.content ?? body?.error?.message ?? JSON.stringify(body);
    const provider = body?.uno?.provider ?? "-";
    console.log(`${model.padEnd(24)} HTTP ${res.status} ${String(Date.now() - started).padStart(6)}ms  via=${provider}  ${String(text).slice(0, 50)}`);
  } catch (e) {
    console.log(`${model.padEnd(24)} ERROR ${(e as Error).message}`);
  }
}

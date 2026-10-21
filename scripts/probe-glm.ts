const API = process.env.API_BASE_URL || "http://localhost:4100";

async function newKey(): Promise<string> {
  const email = `probe+${Date.now()}+${Math.random().toString(36).slice(2, 8)}@example.test`;
  const s = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "ProbePass123!", name: "Probe" }),
  });
  const cookie = s.headers.getSetCookie?.().map((c) => c.split(";")[0]).join("; ") ?? "";
  const k = await fetch(`${API}/keys`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ name: "probe" }) });
  return ((await k.json()) as { secret?: string }).secret ?? "";
}

for (let i = 0; i < 3; i++) {
  const key = await newKey();
  const started = Date.now();
  const res = await fetch(`${API}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "glm-5.3-flash", messages: [{ role: "user", content: "Reply with exactly: OK" }] }),
    signal: AbortSignal.timeout(120000),
  });
  const b = (await res.json()) as any;
  console.log(`glm-5.3-flash  HTTP ${res.status}  ${Date.now() - started}ms  via=${b?.uno?.provider ?? "-"}  trace=${JSON.stringify(b?.uno?.route ?? [])}`);
}

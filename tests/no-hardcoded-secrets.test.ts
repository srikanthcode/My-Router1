import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["apps/api/src", "apps/web/app", "apps/web/lib", "packages"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs"]);
const ALLOWED_DIRS = new Set(["node_modules", ".next", "dist", ".git", "__tests__"]);

function walk(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ALLOWED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (EXTENSIONS.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

const SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "prefixed API token literal", regex: /["'](?:sk-|rqly_|gsk_|or-|sk-or-)[A-Za-z0-9_-]{12,}["']/ },
  { name: "provider key literal", regex: /\b(?:NABH|REQUESTY|GATEWAY|GROQ|OPENROUTER)_[A-Z_]*(?:KEY|TOKEN)S?\s*=\s*["'][^"']{20,}["']/ },
  { name: "hardcoded bearer literal", regex: /["']Bearer\s+[A-Za-z0-9._-]{24,}["']/ },
  { name: "razorpay key literal", regex: /["']rzp_(?:test|live)_[A-Za-z0-9]{8,}["']/ },
  { name: "razorpay secret assignment", regex: /\bkey[_-]?secret\s*[:=]\s*["'][^"']{8,}["']/i },
];

describe("no hardcoded provider credentials", () => {
  it("contains no credential literals in shipped source", () => {
    const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)));
    expect(files.length).toBeGreaterThan(0);
    const violations: string[] = [];
    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      for (const { name, regex } of SECRET_PATTERNS) {
        if (regex.test(source)) violations.push(`${path.relative(ROOT, file)}: ${name}`);
      }
    }
    expect(violations).toEqual([]);
  });
});

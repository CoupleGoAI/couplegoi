#!/usr/bin/env python3
"""
PostToolUse hook: static security check on Write and Edit tool calls.

Fires after every Write or Edit. Extracts the written content from
tool_input, runs pattern checks, and appends any findings to the
tool response output so Claude sees them inline.

Severity levels:
  BLOCK — definitive violation, must be fixed
  WARN  — potential issue, needs attention
"""
import sys
import json
import re

# ── File extensions we care about ────────────────────────────────────────────
CHECKED_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx"}

# ── Paths that generate too many false positives ──────────────────────────────
SKIP_PATH_FRAGMENTS = [
    "tokens.ts",          # design tokens — intentional hex strings
    "__tests__",          # test files may have mock secrets
    ".test.",
    ".spec.",
    "node_modules",
]

# ── BLOCK patterns ────────────────────────────────────────────────────────────
BLOCK_PATTERNS = [
    (
        r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}',
        "Hardcoded JWT token literal",
    ),
    (
        r'''(?:apiKey|api_key|secret|password|privateKey|private_key)\s*[=:]\s*['"][A-Za-z0-9+/=_\-]{16,}['"]''',
        "Hardcoded credential assigned to sensitive variable",
    ),
    (
        r'supabase\.functions\.invoke\(',
        "Forbidden: supabase.functions.invoke() — use plain fetch() with explicit Authorization + apikey headers",
    ),
    (
        r'''console\s*\.\s*(?:log|warn|error)\s*\(.*?(?:token|password|secret|session|apiKey|api_key|authHeader|access_token|refresh_token)''',
        "Sensitive value logged to console",
    ),
    (
        r'''AsyncStorage\s*\.\s*setItem\s*\(\s*['"].*?(?:token|secret|password|session|auth)''',
        "Secret stored in AsyncStorage — use expo-secure-store",
    ),
    (
        r'''(?:MMKV|mmkv).*?(?:set|write)\s*\(.*?(?:token|secret|password|session|auth)''',
        "Secret stored in MMKV — use expo-secure-store",
    ),
]

# ── WARN patterns ─────────────────────────────────────────────────────────────
WARN_PATTERNS = [
    (
        r'//\s*@ts-ignore',
        "TypeScript suppression (@ts-ignore) — fix the type error instead",
    ),
    (
        r':\s*any\b',
        "Explicit `any` type — use a specific type or unknown",
    ),
    (
        r'\bas\s+any\b',
        "`as any` cast — use a discriminated union or typed assertion",
    ),
    (
        r'\bas\s+unknown\s+as\b',
        "Double cast (as unknown as) — likely hiding a type mismatch",
    ),
    (
        r'''import\s+.*\s+from\s+['"](?:@data|../data|../../data|src/data)''',
        "Direct data-layer import — screens and components must go through hooks",
    ),
    (
        r'catch\s*\(\s*\)\s*\{',
        "Empty catch block — silent error swallowing hides security events",
    ),
    (
        r'catch\s*\(\s*\w+\s*\)\s*\{\s*\}',
        "Empty catch block — silent error swallowing hides security events",
    ),
]


def should_skip(file_path: str) -> bool:
    if not any(file_path.endswith(ext) for ext in CHECKED_EXTENSIONS):
        return True
    return any(frag in file_path for frag in SKIP_PATH_FRAGMENTS)


def run_checks(content: str, file_path: str) -> list[dict]:
    findings = []

    for pattern, message in BLOCK_PATTERNS:
        for match in re.finditer(pattern, content, re.IGNORECASE | re.DOTALL):
            line_num = content[: match.start()].count("\n") + 1
            findings.append(
                {
                    "severity": "BLOCK",
                    "file": file_path,
                    "line": line_num,
                    "snippet": match.group(0)[:80].replace("\n", " "),
                    "message": message,
                }
            )

    for pattern, message in WARN_PATTERNS:
        for match in re.finditer(pattern, content, re.IGNORECASE):
            line_num = content[: match.start()].count("\n") + 1
            findings.append(
                {
                    "severity": "WARN",
                    "file": file_path,
                    "line": line_num,
                    "snippet": match.group(0)[:80].replace("\n", " "),
                    "message": message,
                }
            )

    return findings


def format_findings(findings: list[dict], file_path: str) -> str:
    if not findings:
        return ""

    blocks = [f for f in findings if f["severity"] == "BLOCK"]
    warns = [f for f in findings if f["severity"] == "WARN"]

    verdict = "BLOCK" if blocks else "WARN"
    lines = [f"\n\n🔒 SECURITY-CHECK [{verdict}] — {file_path}"]

    for f in blocks:
        lines.append(f"  [BLOCK] L{f['line']}: {f['message']}")
        lines.append(f"          ↳ `{f['snippet']}`")

    for f in warns:
        lines.append(f"  [WARN]  L{f['line']}: {f['message']}")
        lines.append(f"          ↳ `{f['snippet']}`")

    if blocks:
        lines.append("\n  ⛔ BLOCK-level findings must be resolved before this task is complete.")

    return "\n".join(lines)


def main() -> None:
    raw = sys.stdin.read()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        sys.stdout.write(raw)
        return

    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {})

    if tool_name == "Write":
        file_path = tool_input.get("file_path", "")
        content = tool_input.get("content", "")
    elif tool_name == "Edit":
        file_path = tool_input.get("file_path", "")
        content = tool_input.get("new_string", "")
    else:
        sys.stdout.write(raw)
        return

    if should_skip(file_path) or not content:
        sys.stdout.write(raw)
        return

    findings = run_checks(content, file_path)
    warning_text = format_findings(findings, file_path)

    if warning_text:
        # Append to tool_response output so Claude sees it inline
        tool_response = data.get("tool_response", {})
        existing = tool_response.get("output", "")
        tool_response["output"] = existing + warning_text
        data["tool_response"] = tool_response

    sys.stdout.write(json.dumps(data))


if __name__ == "__main__":
    main()

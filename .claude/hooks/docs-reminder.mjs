// Claude Code PostToolUse hook (Edit / Write / MultiEdit): after a change to application code, remind Claude to keep
// the Documentation module current in the same change (CLAUDE.md, "Documentation rule"). Never blocks anything.
// Reads the hook payload (JSON) from stdin; prints a JSON hook result only when the edited file is application code.

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { raw += chunk; });
process.stdin.on("end", () => {
  let file = "";
  try {
    const payload = JSON.parse(raw || "{}");
    file = String(payload?.tool_input?.file_path || payload?.tool_response?.filePath || "");
  } catch {
    process.exit(0);
  }
  const p = file.replace(/\\/g, "/").toLowerCase();
  const isAppCode = p.includes("/frontend/src/") || p.includes("/backend/src/");
  const isDocs = p.includes("/frontend/src/modules/documentation/");
  if (!isAppCode || isDocs) process.exit(0);

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext:
        "Documentation rule (CLAUDE.md): this edit touched application code. If it changes a screen, field, status, " +
        "business rule, workflow or backend capability, update frontend/src/modules/documentation/content " +
        "(guide.js for screens, backend.js for backend capabilities, flowcharts.js for workflows) in this same change, " +
        "then run `npm run docs:check` in frontend. New menu screens must get a SCREEN_GUIDE entry."
    }
  }));
});

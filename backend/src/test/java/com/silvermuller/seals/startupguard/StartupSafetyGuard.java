package com.silvermuller.seals.startupguard;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Static checks that ordinary startup never resets or deletes existing data (docs/startup-data-rules.md).
 *
 * An unsafe statement is accepted only when the line(s) directly above it carry
 * "startup-guard: allow &lt;reason&gt;" with a real reason. Limits: only SQL in startup SQL files and string literals in
 * startup methods (plus the same-class methods they call) are inspected; SQL built at runtime from variables or
 * executed in other classes is not seen. New startup hooks are caught by the reviewed-component registry instead.
 */
public final class StartupSafetyGuard {

    public static final String ALLOW = "startup-guard: allow";
    public static final String BULK_MARKER = "-- startup-guard: bulk-seed-when-empty ";
    static final int MIN_REASON_LENGTH = 15;

    public record Violation(String where, String problem) {
        @Override public String toString() { return where + ": " + problem; }
    }

    private StartupSafetyGuard() {}

    // ------------------------------------------------------------------ SQL scripts

    /**
     * One statement as Spring's ScriptUtils would execute it, with the allow reason and the seed policy
     * ("system" or "once", plus its reason) taken from the comments directly above it.
     */
    public record Statement(int line, String sql, String allowReason, String policy, String policyReason) {}

    public static final String SEED_POLICY = "seed-policy:";

    private static final Pattern UNSAFE_SQL = Pattern.compile(
            "^DELETE\\b|^TRUNCATE\\b|^UPDATE\\b|^DROP\\s+(TABLE|SCHEMA|DATABASE|SEQUENCE|VIEW|MATERIALIZED|TYPE|FUNCTION)\\b"
                    + "|\\bDROP\\s+COLUMN\\b|\\bALTER\\s+COLUMN\\s+\\S+\\s+(SET\\s+DATA\\s+)?TYPE\\b|\\bON\\s+CONFLICT\\b.*\\bDO\\s+UPDATE\\b");

    /** Splits on ';' outside quotes and comments, like Spring's ScriptUtils. */
    public static List<Statement> statements(String script) {
        List<Statement> out = new ArrayList<>();
        StringBuilder sql = new StringBuilder();
        List<String> comments = new ArrayList<>();
        int line = 1, start = -1, prevNewline = -1;
        char quote = 0;
        for (int i = 0; i < script.length(); i++) {
            char c = script.charAt(i);
            if (quote == 0 && script.startsWith("--", i)) {
                int end = script.indexOf('\n', i);
                if (end < 0) end = script.length();
                if (sql.toString().isBlank()) comments.add(script.substring(i, end));
                i = end - 1;
                continue;
            }
            if (c == '\n') {
                line++;
                // an empty line between a comment and the statement detaches the comment
                if (quote == 0 && sql.toString().isBlank() && script.substring(prevNewline + 1, i).isBlank()) comments.clear();
                prevNewline = i;
            }
            if (quote == 0 && (c == '\'' || c == '"')) quote = c;
            else if (quote == c) quote = 0;
            if (quote == 0 && c == ';') {
                out.add(statement(start, sql.toString().trim(), comments));
                sql.setLength(0);
                comments.clear();
                start = -1;
                continue;
            }
            if (start < 0 && !Character.isWhitespace(c)) start = line;
            sql.append(c);
        }
        if (!sql.toString().isBlank()) out.add(statement(start, sql.toString().trim(), comments));
        return out;
    }

    private static Statement statement(int line, String sql, List<String> comments) {
        String policy = null, policyReason = null;
        String marker = after(comments, SEED_POLICY);
        if (marker != null) {
            String[] parts = marker.split("\\s+", 2);
            policy = parts[0].toLowerCase(Locale.ROOT);
            policyReason = parts.length > 1 ? parts[1].trim() : "";
        }
        return new Statement(line, sql, after(comments, ALLOW), policy, policyReason);
    }

    private static String after(List<String> comments, String token) {
        for (String c : comments) {
            int at = c.indexOf(token);
            if (at >= 0) return c.substring(at + token.length()).trim();
        }
        return null;
    }

    private static String norm(String sql) {
        return sql.replaceAll("\\s+", " ").trim().toUpperCase(Locale.ROOT);
    }

    private static String head(String sql) {
        String n = norm(sql);
        int sp = n.indexOf(' ');
        return sp < 0 ? n : n.substring(0, sp);
    }

    /** null if allowed, otherwise the reason it is not. */
    private static String allowProblem(Statement s) {
        if (s.allowReason() == null) return "";
        if (s.allowReason().length() < MIN_REASON_LENGTH) return " (allow reason too short: \"" + s.allowReason() + "\")";
        return null;
    }

    private static void unsafe(List<Violation> out, String file, Statement s, String what) {
        String p = allowProblem(s);
        if (p != null) out.add(new Violation(file + ":" + s.line(), what + p + " -> " + preview(s.sql())));
    }

    /** schema.sql: DDL only. Seed rows belong in seed-data.sql, data changes in StartupDataMigrations. */
    public static List<Violation> checkSchemaScript(String file, String script) {
        List<Violation> out = new ArrayList<>();
        String previous = "";
        for (Statement s : statements(script)) {
            String h = head(s.sql());
            boolean doTail = previous.equals("DO") && h.equals("END");
            previous = h;
            if (doTail) {
                continue; // the rest of a DO block Spring would also split off; already reported
            } else if (h.equals("DO")) {
                out.add(new Violation(file + ":" + s.line(), "DO $$ blocks are split on ';' by Spring and fail; use plain SQL"));
            } else if (h.equals("INSERT") || h.equals("SELECT")) {
                out.add(new Violation(file + ":" + s.line(), "data statement in a DDL-only script; move it to seed-data.sql -> " + preview(s.sql())));
            } else if (UNSAFE_SQL.matcher(norm(s.sql())).find()) {
                unsafe(out, file, s, "destructive or data-changing statement in schema script");
            } else if (!h.equals("CREATE") && !h.equals("ALTER") && !h.equals("COMMENT")) {
                unsafe(out, file, s, "unexpected statement type " + h + " in schema script");
            }
        }
        return out;
    }

    /**
     * seed-data.sql: every statement only adds rows and declares its policy.
     *   seed-policy: system &lt;reason&gt;  the code depends on the row: insert if missing (DO NOTHING / WHERE NOT EXISTS).
     *   seed-policy: once               user-managed default: must check and record public.app_seed_registry,
     *                                   otherwise a row the user deleted would be re-created on the next start.
     */
    public static List<Violation> checkSeedScript(String file, String script) {
        List<Violation> out = new ArrayList<>();
        for (Statement s : statements(script)) {
            String n = norm(s.sql());
            String h = head(s.sql());
            boolean inserts = h.equals("INSERT") || (h.equals("WITH") && n.contains(" INSERT INTO "));
            if (!inserts || n.matches(".*(^|[ (])(UPDATE [\\w.\"]+ SET|DELETE FROM|TRUNCATE)\\b.*")) {
                unsafe(out, file, s, "seed scripts may only INSERT missing rows");
            } else if (n.matches(".*\\bON CONFLICT\\b.*\\bDO UPDATE\\b.*")) {
                unsafe(out, file, s, "ON CONFLICT DO UPDATE overwrites existing rows on every start; use DO NOTHING");
            } else if (s.policy() == null) {
                unsafe(out, file, s, "declare '-- " + SEED_POLICY + " system <reason>' or '-- " + SEED_POLICY + " once' above the statement");
            } else if (s.policy().equals("system")) {
                if (s.policyReason().length() < MIN_REASON_LENGTH) {
                    unsafe(out, file, s, "system seed needs a reason: what in the code depends on these rows");
                } else if (!n.matches(".*\\bON CONFLICT\\b.*\\bDO NOTHING\\b.*") && !n.contains("WHERE NOT EXISTS")) {
                    unsafe(out, file, s, "seed INSERT must use ON CONFLICT ... DO NOTHING or WHERE NOT EXISTS");
                }
            } else if (s.policy().equals("once")) {
                boolean checksRegistry = n.contains("NOT EXISTS (SELECT 1 FROM PUBLIC.APP_SEED_REGISTRY");
                boolean recordsKey = n.contains("INSERT INTO PUBLIC.APP_SEED_REGISTRY");
                boolean noOverwrite = n.matches(".*\\bON CONFLICT\\b.*\\bDO NOTHING\\b.*");
                if (!h.equals("WITH") || !checksRegistry || !recordsKey || !noOverwrite) {
                    unsafe(out, file, s, "once seed must skip keys already in app_seed_registry and record its keys, "
                            + "or a row the user deleted is re-created on the next start");
                }
            } else {
                unsafe(out, file, s, "unknown seed policy '" + s.policy() + "' (use system or once)");
            }
        }
        return out;
    }

    /** UTF-8 text that was mis-read as cp1252 and stored again (how the garbled "Bought-Out Parts" category arose). */
    private static final Pattern GARBLED_UTF8 = Pattern.compile(
            "Ã[\u0080-¿ŒœŠšŸŽž–—‘’‚“”•€]"
                    + "|â€|ðŸ|Â[ -¿]");

    /** Startup scripts must be valid UTF-8 without garbled sequences such as "ðŸ" or "Â°". */
    public static List<Violation> checkEncoding(String file, byte[] bytes) {
        List<Violation> out = new ArrayList<>();
        String text;
        try {
            text = StandardCharsets.UTF_8.newDecoder().decode(java.nio.ByteBuffer.wrap(bytes)).toString();
        } catch (java.nio.charset.CharacterCodingException e) {
            out.add(new Violation(file, "not valid UTF-8"));
            return out;
        }
        Matcher m = GARBLED_UTF8.matcher(text);
        while (m.find()) {
            int line = lineOf(text, m.start());
            String around = text.substring(Math.max(0, m.start() - 20), Math.min(text.length(), m.end() + 10)).replace('\n', ' ');
            out.add(new Violation(file + ":" + line, "garbled UTF-8 (text saved through a cp1252 read) -> " + around));
        }
        return out;
    }

    /** A bulk seed file: runs only when its table is empty, so it may only insert rows (and move a sequence). */
    public static List<Violation> checkBulkSeedScript(String file, String script, String expectedTable) {
        List<Violation> out = new ArrayList<>();
        String first = script.lines().findFirst().orElse("");
        if (!first.equals(BULK_MARKER + expectedTable)) {
            out.add(new Violation(file + ":1", "first line must be \"" + BULK_MARKER + expectedTable + "\""));
        }
        for (Statement s : statements(script)) {
            String h = head(s.sql());
            boolean ok = h.equals("INSERT") || (h.equals("SELECT") && norm(s.sql()).startsWith("SELECT SETVAL("));
            if (!ok) unsafe(out, file, s, "bulk seed files may only INSERT rows (schema belongs in schema.sql)");
        }
        return out;
    }

    // ------------------------------------------------------------------ Java startup hooks

    private static final Pattern HOOK_MARKERS = Pattern.compile(
            "implements[^{]*\\b(ApplicationRunner|CommandLineRunner|ApplicationListener|SmartLifecycle|InitializingBean)\\b"
                    + "|@PostConstruct\\b|@EventListener\\b|@Bean[\\s\\S]{0,200}?\\b(CommandLineRunner|ApplicationRunner)\\s+\\w+\\s*\\(");

    /** Relative path (with '/') of every Java source file that registers a startup hook. */
    public static Set<String> discoverStartupHooks(Path root) throws IOException {
        Set<String> hooks = new java.util.TreeSet<>();
        try (Stream<Path> files = Files.walk(root)) {
            for (Path p : (Iterable<Path>) files.filter(f -> f.toString().endsWith(".java") || f.toString().endsWith(".java.txt"))::iterator) {
                String masked = mask(Files.readString(p, StandardCharsets.UTF_8)).masked();
                if (HOOK_MARKERS.matcher(masked).find()) hooks.add(root.relativize(p).toString().replace('\\', '/'));
            }
        }
        return hooks;
    }

    private static final Pattern UNSAFE_JAVA_SQL = Pattern.compile(
            "\\bDELETE\\s+FROM\\b|\\bTRUNCATE\\b|\\bUPDATE\\s+[\\w.\"]+(\\s+\\w+)?\\s+SET\\b|\\bDROP\\s+(TABLE|SCHEMA|DATABASE|SEQUENCE|VIEW)\\b"
                    + "|\\bDROP\\s+COLUMN\\b|\\bALTER\\s+COLUMN\\s+\\S+\\s+(SET\\s+DATA\\s+)?TYPE\\b|\\bDO\\s+UPDATE\\b",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern UNSAFE_JAVA_CALL = Pattern.compile("\\.(deleteAll\\w*|deleteBy\\w*|deleteById|delete|truncate)\\s*\\(");
    // possessive runs: a per-character alternation recurses once per character and overflows on long argument lists
    private static final Pattern METHOD_DECL = Pattern.compile("\\b(\\w+)\\s*\\((?:[^()]++|\\([^()]*+\\))*+\\)\\s*(throws\\s+[\\w.,\\s]+)?\\{");
    /** A same-class call "name(" or a method reference "::name". */
    private static final Pattern CALL = Pattern.compile("(?<![.\\w])(\\w+)\\s*\\(|::(\\w+)");
    private static final Set<String> NOT_METHODS = Set.of("if", "for", "while", "switch", "catch", "synchronized", "try",
            "else", "do", "return", "new", "super", "this");

    /** Unsafe SQL literals or delete calls reachable from the startup methods of one source file. */
    public static List<Violation> checkStartupJava(String file, String source) {
        Masked m = mask(source);
        Map<String, List<int[]>> methods = methods(m.masked());
        Set<int[]> todo = new LinkedHashSet<>(startupBodies(m.masked(), methods));
        Set<String> seen = new LinkedHashSet<>();
        List<int[]> bodies = new ArrayList<>();
        while (!todo.isEmpty()) {
            int[] b = todo.iterator().next();
            todo.remove(b);
            if (!seen.add(b[0] + ":" + b[1])) continue;
            bodies.add(b);
            Matcher call = CALL.matcher(m.masked().substring(b[0], b[1]));
            while (call.find()) {
                String callee_name = call.group(1) != null ? call.group(1) : call.group(2);
                for (int[] callee : methods.getOrDefault(callee_name, List.of())) {
                    if (!seen.contains(callee[0] + ":" + callee[1])) todo.add(callee);
                }
            }
        }
        String[] lines = source.split("\n", -1);
        Map<Integer, String> findings = new TreeMap<>();
        Map<Integer, String> inserts = new TreeMap<>();
        for (int[] b : bodies) {
            for (Literal lit : m.literalGroups(b[0], b[1])) {
                Matcher u = UNSAFE_JAVA_SQL.matcher(lit.text());
                if (u.find()) findings.putIfAbsent(lit.offset(), "startup SQL changes or deletes existing rows -> " + preview(lit.text()));
                Matcher ins = INSERT_JAVA.matcher(lit.text());
                if (ins.find() && !INSERT_EXEMPT.contains(ins.group(1).toLowerCase(Locale.ROOT).replace("public.", ""))) {
                    inserts.putIfAbsent(lit.offset(), "startup INSERT re-creates rows the user deleted unless it is seeded once "
                            + "through SeedRegistry (seed-policy: once) or is system data (seed-policy: system <reason>) -> " + preview(lit.text()));
                }
            }
            Matcher c = UNSAFE_JAVA_CALL.matcher(m.masked().substring(b[0], b[1]));
            while (c.find()) findings.putIfAbsent(b[0] + c.start(), "startup code deletes rows via ." + c.group(1) + "(...)");
        }
        boolean usesRegistry = m.masked().contains("SeedRegistry");
        List<Violation> out = new ArrayList<>();
        for (Map.Entry<Integer, String> f : findings.entrySet()) {
            int lineNo = lineOf(source, f.getKey());
            String reason = marker(lines, lineNo, ALLOW);
            if (reason != null && reason.length() >= MIN_REASON_LENGTH) continue;
            String extra = reason == null ? "" : " (allow reason too short: \"" + reason + "\")";
            out.add(new Violation(file + ":" + lineNo, f.getValue() + extra));
        }
        for (Map.Entry<Integer, String> f : inserts.entrySet()) {
            int lineNo = lineOf(source, f.getKey());
            String allow = marker(lines, lineNo, ALLOW);
            String policy = marker(lines, lineNo, SEED_POLICY);
            if (allow != null && allow.length() >= MIN_REASON_LENGTH) continue;
            if (policy != null && policy.startsWith("once") && usesRegistry) continue;
            if (policy != null && policy.startsWith("system") && policy.substring(6).trim().length() >= MIN_REASON_LENGTH) continue;
            String extra = policy != null && policy.startsWith("once") && !usesRegistry ? " (seed-policy: once, but the class never uses SeedRegistry)" : "";
            out.add(new Violation(file + ":" + lineNo, f.getValue() + extra));
        }
        return out;
    }

    private static final Pattern INSERT_JAVA = Pattern.compile("\\bINSERT\\s+INTO\\s+([\\w.\"]+)", Pattern.CASE_INSENSITIVE);
    /** Bookkeeping tables written by the startup machinery itself. */
    private static final Set<String> INSERT_EXEMPT = Set.of("app_seed_registry", "app_data_migration");

    /** Text after the marker on the statement's line or the 3 lines above it, or null. */
    private static String marker(String[] lines, int lineNo, String token) {
        String found = null;
        for (int l = Math.max(1, lineNo - 3); l <= lineNo; l++) {
            int at = lines[l - 1].indexOf(token);
            if (at >= 0) found = lines[l - 1].substring(at + token.length()).trim();
        }
        return found;
    }

    private static List<int[]> startupBodies(String masked, Map<String, List<int[]>> methods) {
        List<int[]> out = new ArrayList<>();
        boolean runner = Pattern.compile("implements[^{]*\\b(ApplicationRunner|CommandLineRunner)\\b").matcher(masked).find();
        Matcher d = METHOD_DECL.matcher(masked);
        while (d.find()) {
            String name = d.group(1);
            if (NOT_METHODS.contains(name)) continue;
            int bodyStart = d.end() - 1;
            int prevEnd = Math.max(masked.lastIndexOf(';', d.start()), Math.max(masked.lastIndexOf('}', d.start()), masked.lastIndexOf('{', d.start())));
            String preamble = masked.substring(prevEnd + 1, d.start());
            boolean hook = preamble.contains("@PostConstruct") || preamble.contains("@EventListener")
                    || (preamble.contains("@Bean") && preamble.matches("(?s).*\\b(CommandLineRunner|ApplicationRunner)\\b.*"))
                    || (runner && name.equals("run") && d.group(0).matches("(?s).*(ApplicationArguments|String\\s*\\.\\.\\.|String\\[]).*"))
                    || name.equals("onApplicationEvent") || name.equals("afterPropertiesSet");
            if (hook) out.add(new int[] {bodyStart, matchBrace(masked, bodyStart)});
        }
        return out;
    }

    private static Map<String, List<int[]>> methods(String masked) {
        Map<String, List<int[]>> out = new LinkedHashMap<>();
        Matcher d = METHOD_DECL.matcher(masked);
        while (d.find()) {
            String name = d.group(1);
            if (NOT_METHODS.contains(name)) continue;
            String before = masked.substring(Math.max(0, d.start() - 6), d.start());
            if (before.contains("new ") || before.trim().endsWith(".")) continue;
            int bodyStart = d.end() - 1;
            out.computeIfAbsent(name, k -> new ArrayList<>()).add(new int[] {bodyStart, matchBrace(masked, bodyStart)});
        }
        return out;
    }

    private static int matchBrace(String masked, int open) {
        int depth = 0;
        for (int i = open; i < masked.length(); i++) {
            if (masked.charAt(i) == '{') depth++;
            else if (masked.charAt(i) == '}' && --depth == 0) return i;
        }
        return masked.length();
    }

    private static int lineOf(String s, int offset) {
        int line = 1;
        for (int i = 0; i < offset && i < s.length(); i++) if (s.charAt(i) == '\n') line++;
        return line;
    }

    // ------------------------------------------------------------------ Java lexing

    record Literal(int offset, int end, String text) {}

    record Masked(String masked, List<Literal> literals) {
        /** String literals in [from, to), with adjacent literals joined by '+' merged into one. */
        List<Literal> literalGroups(int from, int to) {
            List<Literal> out = new ArrayList<>();
            Literal cur = null;
            for (Literal l : literals) {
                if (l.offset() < from || l.end() > to) continue;
                if (cur != null && masked.substring(cur.end(), l.offset()).matches("[\\s+]*")) {
                    cur = new Literal(cur.offset(), l.end(), cur.text() + l.text());
                } else {
                    if (cur != null) out.add(cur);
                    cur = l;
                }
            }
            if (cur != null) out.add(cur);
            return out;
        }
    }

    /** Blanks comments and string/char literal contents (keeping offsets and newlines) and records the literals. */
    static Masked mask(String src) {
        StringBuilder out = new StringBuilder(src.length());
        List<Literal> lits = new ArrayList<>();
        int i = 0;
        while (i < src.length()) {
            int end;
            if (src.startsWith("//", i)) {
                end = src.indexOf('\n', i);
                if (end < 0) end = src.length();
            } else if (src.startsWith("/*", i)) {
                end = src.indexOf("*/", i + 2);
                end = end < 0 ? src.length() : end + 2;
            } else if (src.startsWith("\"\"\"", i)) {
                end = src.indexOf("\"\"\"", i + 3);
                end = end < 0 ? src.length() : end + 3;
                lits.add(new Literal(i, end, src.substring(i + 3, Math.max(i + 3, end - 3))));
            } else if (src.charAt(i) == '"' || src.charAt(i) == '\'') {
                char q = src.charAt(i);
                end = i + 1;
                while (end < src.length() && src.charAt(end) != q && src.charAt(end) != '\n') end += src.charAt(end) == '\\' ? 2 : 1;
                end = Math.min(end + 1, src.length());
                if (q == '"') lits.add(new Literal(i, end, src.substring(i + 1, Math.max(i + 1, end - 1))));
            } else {
                out.append(src.charAt(i++));
                continue;
            }
            for (int k = i; k < end; k++) out.append(src.charAt(k) == '\n' ? '\n' : ' ');
            i = end;
        }
        return new Masked(out.toString(), lits);
    }

    private static String preview(String s) {
        String one = s.replaceAll("\\s+", " ").trim();
        return one.length() > 110 ? one.substring(0, 110) + "..." : one;
    }
}

// Commits changes in this project automatically, so work is never lost.
//
//   node scripts/auto-commit.mjs --claude
//       Run by Claude Code after each of its turns (see .claude/settings.json).
//       Commits everything that changed.
//   node scripts/auto-commit.mjs --message "Admin: saved WeddingSnap" --only src/data/projects.json public/images/work/uploads
//       Run by the admin after a save. Commits only the files it names, so
//       unrelated work in progress isn't swept into the commit.
//
// It does nothing when nothing changed, outside a Git repository, or in the
// middle of a merge or rebase. It refuses to commit anything that looks like a
// secret (.env files, keys), even if .gitignore misses one.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const fromClaude = args.includes("--claude");
const message = args.includes("--message") ? args[args.indexOf("--message") + 1] : null;
const only = args.includes("--only") ? args.slice(args.indexOf("--only") + 1).filter((a) => !a.startsWith("--")) : null;

const git = (...parts) => execFileSync("git", parts, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const quietly = (fn) => {
  try {
    return fn();
  } catch {
    return null;
  }
};

if (quietly(() => git("rev-parse", "--is-inside-work-tree")) !== "true") process.exit(0);
const gitDir = join(root, git("rev-parse", "--git-dir"));
if (["MERGE_HEAD", "rebase-merge", "rebase-apply", "CHERRY_PICK_HEAD"].some((f) => existsSync(join(gitDir, f)))) process.exit(0);

const pathspec = only?.length ? ["--", ...only] : [];
if (!git("status", "--porcelain", ...pathspec)) process.exit(0);

git("add", "-A", ...pathspec);
const staged = git("diff", "--cached", "--name-only").split("\n").filter(Boolean);
if (staged.length === 0) process.exit(0);

// Never commit secrets, whatever .gitignore says.
const secret = staged.filter((f) => /(^|\/)\.env|\.pem$|\.key$|id_rsa|credentials/i.test(f));
if (secret.length) {
  git("reset", "-q", "--", ...secret);
  console.error(`auto-commit: left out ${secret.join(", ")} (looks like a secret)`);
  if (secret.length === staged.length) process.exit(0);
}

const files = git("diff", "--cached", "--name-only").split("\n").filter(Boolean);
const names = files.map((f) => f.split("/").pop());
const summary = `${names.slice(0, 4).join(", ")}${names.length > 4 ? ` and ${names.length - 4} more` : ""}`;
const subject = message ?? `Auto-save: ${summary}`;
const body = [subject, "", `Changed: ${files.join(", ")}`.slice(0, 2000)];
if (fromClaude) body.push("", "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>");

git("commit", "-q", "-m", body.join("\n"));
console.log(`auto-commit: ${git("log", "-1", "--format=%h %s")}`);

// Lets `node --test` run the project's TypeScript directly (see `npm test`).
// Node needs two things the app's bundler does for it: the "@/..." shortcut
// for src/, file extensions on imports ("./machine" -> "./machine.ts"), and
// JSON imports marked as JSON.
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

const src = new URL("../src/", import.meta.url);

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.endsWith(".json")) {
      const resolved = next(specifier.startsWith("@/") ? new URL(specifier.slice(2), src).href : specifier, context);
      return { ...resolved, importAttributes: { ...resolved.importAttributes, type: "json" } };
    }
    const local = specifier.startsWith("@/") || specifier.startsWith(".");
    if (local && !/\.[a-z]+$/.test(specifier)) {
      const base = specifier.startsWith("@/") ? new URL(specifier.slice(2), src) : new URL(specifier, context.parentURL);
      for (const extension of [".ts", ".tsx"]) {
        if (existsSync(fileURLToPath(base.href + extension))) return next(base.href + extension, context);
      }
    }
    return next(specifier, context);
  },
});

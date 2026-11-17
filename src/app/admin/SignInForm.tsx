"use client";
import { useActionState } from "react";
import { signIn, type FormState } from "./actions";

export default function SignInForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});

  return (
    <form action={action} className="glass mx-auto mt-10 max-w-sm rounded-3xl p-8">
      <p className="font-accent text-xs text-gold">(Admin)</p>
      <h1 className="mt-3 font-display text-3xl">Sign in</h1>
      <label className="mt-8 block">
        <span className="font-accent text-[11px] text-cream/60">Password</span>
        <input
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          className="mt-2 w-full rounded-xl border border-cream/15 bg-ink/50 px-4 py-3 outline-none transition-colors focus:border-gold"
        />
      </label>
      {state.error && <p role="alert" className="mt-3 text-sm text-flame">{state.error}</p>}
      <button type="submit" disabled={pending} className="roll-plain btn-gloss mt-6 w-full rounded-full px-6 py-3 font-accent text-sm disabled:opacity-60">
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}

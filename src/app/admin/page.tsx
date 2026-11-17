import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { adminEnabled, hasPassword, isSignedIn } from "@/lib/admin/auth";
import { readProjects } from "@/lib/admin/store";
import AdminEditor from "./AdminEditor";
import SignInForm from "./SignInForm";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminPage() {
  if (!adminEnabled) notFound();
  return (
    <Suspense fallback={<p className="text-cream/60">Loading…</p>}>
      <Gate />
    </Suspense>
  );
}

// Reads the session and the latest projects file on every request.
async function Gate() {
  await connection();

  if (!hasPassword()) {
    return (
      <div className="glass mx-auto max-w-lg rounded-3xl p-8">
        <h1 className="font-display text-3xl">Set an admin password</h1>
        <p className="mt-4 text-sm leading-relaxed text-cream/75">
          Create a file named <code className="text-gold">.env.local</code> in the project folder containing{" "}
          <code className="text-gold">ADMIN_PASSWORD=your-password</code> (at least 8 characters), then restart{" "}
          <code className="text-gold">npm run dev</code>.
        </p>
      </div>
    );
  }

  if (!(await isSignedIn())) return <SignInForm />;
  return <AdminEditor projects={await readProjects()} />;
}

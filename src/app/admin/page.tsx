import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { editorEnabled, hasPassword, isSignedIn, MIN_PASSWORD, onLiveSite } from "@/lib/admin/auth";
import { readProjects } from "@/lib/admin/store";
import AdminEditor from "./AdminEditor";
import AdminTabs from "./AdminTabs";
import SignInForm from "./SignInForm";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-cream/60">Loading…</p>}>
      <Gate />
    </Suspense>
  );
}

// Reads the session (and, on your computer, the latest projects file) on every request.
async function Gate() {
  await connection();

  if (!hasPassword()) {
    // Without a password the live site has no admin at all.
    if (onLiveSite) notFound();
    return (
      <div className="glass mx-auto max-w-lg rounded-3xl p-8">
        <h1 className="font-display text-3xl">Set an admin password</h1>
        <p className="mt-4 text-sm leading-relaxed text-cream/75">
          Create a file named <code className="text-gold">.env.local</code> in the project folder containing{" "}
          <code className="text-gold">ADMIN_PASSWORD=your-password</code> (at least {MIN_PASSWORD} characters), then restart{" "}
          <code className="text-gold">npm run dev</code>.
        </p>
      </div>
    );
  }

  if (!(await isSignedIn())) return <SignInForm />;
  // The project editor saves files into the project, so it only runs on your computer.
  if (!editorEnabled) redirect("/admin/visitors");
  return (
    <>
      <AdminTabs current="projects" />
      <AdminEditor projects={await readProjects()} />
    </>
  );
}

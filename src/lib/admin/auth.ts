import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Signing in works wherever ADMIN_PASSWORD is set: on your computer
// (.env.local) and on the live site (the project's settings on Vercel), where
// only the Visitors tab is available.
// Editing projects only works on your computer (`npm run dev`): saving writes
// files into the project, which the live site can't do.
export const onLiveSite = process.env.NODE_ENV === "production";
export const editorEnabled = !onLiveSite;

const COOKIE = "admin_session";
const MAX_AGE = 60 * 60 * 8; // 8 hours

const password = () => process.env.ADMIN_PASSWORD ?? "";
// The live site's sign-in page can be found by anyone, so its password must be longer.
export const MIN_PASSWORD = onLiveSite ? 12 : 8;
export const hasPassword = () => password().length >= MIN_PASSWORD;

const digest = (value: string) => createHmac("sha256", "admin-compare").update(value).digest();
const sign = (expires: number) => createHmac("sha256", password()).update(`admin:${expires}`).digest("hex");

// Constant-time comparison, so response timing can't leak the password.
export function passwordMatches(input: string) {
  return hasPassword() && timingSafeEqual(digest(input), digest(password()));
}

export async function startSession() {
  const expires = Date.now() + MAX_AGE * 1000;
  (await cookies()).set(COOKIE, `${expires}.${sign(expires)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: onLiveSite, // only ever sent over https on the live site
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/** Whether this request comes from a signed-in admin. Changing the password signs everyone out. */
export async function isSignedIn() {
  if (!hasPassword()) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [expiresText, signature] = value.split(".");
  const expires = Number(expiresText);
  if (!Number.isFinite(expires) || expires < Date.now() || !signature) return false;
  const expected = Buffer.from(sign(expires));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

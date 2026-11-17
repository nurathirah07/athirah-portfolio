import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// The admin only exists while running `npm run dev` on your own computer.
// Saving writes files into the project, which a published site can't do.
export const adminEnabled = process.env.NODE_ENV !== "production";

const COOKIE = "admin_session";
const MAX_AGE = 60 * 60 * 8; // 8 hours

const password = () => process.env.ADMIN_PASSWORD ?? "";
export const hasPassword = () => password().length >= 8;

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
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isSignedIn() {
  if (!adminEnabled || !hasPassword()) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [expiresText, signature] = value.split(".");
  const expires = Number(expiresText);
  if (!Number.isFinite(expires) || expires < Date.now() || !signature) return false;
  const expected = Buffer.from(sign(expires));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

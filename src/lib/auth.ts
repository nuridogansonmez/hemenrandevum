import { createHash } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "hemenrandevum_session";

function tokenFromPassword(password: string): string {
  return createHash("sha256").update(`hemenrandevum-admin::${password}`).digest("hex");
}

export function getExpectedToken(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD env variable is required");
  }
  return tokenFromPassword(password);
}

export function verifyPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return password === expected;
}

export async function isAuthenticated(): Promise<boolean> {
  const store = cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    return token === getExpectedToken();
  } catch {
    return false;
  }
}

export function setAuthCookie() {
  const store = cookies();
  store.set(COOKIE_NAME, getExpectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.SECURE_COOKIE === "true",
  });
}

export function clearAuthCookie() {
  const store = cookies();
  store.delete(COOKIE_NAME);
}

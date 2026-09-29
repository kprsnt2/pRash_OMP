export const AUTH_COOKIE = 'prash_auth_token';

export function getExpectedPassword(): string {
  return process.env.APP_PASSWORD || process.env.APP_PASSCODE || 'prash2026';
}

/** Constant-time comparison to protect against timing attacks */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Compute SHA-256 token of the password with salt */
export async function createTokenForPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`omnichat::salt::${password}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Check if provided token matches the expected password token */
export async function verifyAuthToken(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const expected = await createTokenForPassword(getExpectedPassword());
  return safeEqual(token, expected);
}

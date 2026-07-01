export function getAdminPassword(): string {
  const configured = process.env.ADMIN_PASSWORD?.trim();
  return configured || "tv-admin";
}

export function isValidAdminPassword(password: string | null | undefined): boolean {
  const normalized = password?.trim();
  if (!normalized) return false;
  return normalized === getAdminPassword();
}

export function getAdminPasswordFromRequest(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice(7).trim();
    if (token) return token;
  }

  const headerPassword = request.headers.get("x-admin-password")?.trim();
  if (headerPassword) return headerPassword;

  return null;
}

export function isAuthorizedAdminRequest(
  request: Request,
  bodyPassword?: string | null
): boolean {
  const fromBody = bodyPassword?.trim();
  if (fromBody && isValidAdminPassword(fromBody)) return true;
  return isValidAdminPassword(getAdminPasswordFromRequest(request));
}

export function adminAuthHeaders(password: string): Record<string, string> {
  const trimmed = password.trim();
  return {
    Authorization: `Bearer ${trimmed}`,
    "x-admin-password": trimmed,
  };
}

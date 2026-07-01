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
  const headerPassword = request.headers.get("x-admin-password");
  if (headerPassword) return headerPassword;

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7);
  }

  return null;
}

export function isAuthorizedAdminRequest(request: Request): boolean {
  return isValidAdminPassword(getAdminPasswordFromRequest(request));
}

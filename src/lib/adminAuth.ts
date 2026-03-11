const ADMIN_SESSION_KEY = 'kitchen_admin_session';

interface AdminSession {
  email: string;
  grantedAt: number; // timestamp ms
}

// Session valid for 8 hours
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export function getAdminSession(): AdminSession | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const session: AdminSession = JSON.parse(raw);
    if (Date.now() - session.grantedAt > SESSION_TTL_MS) {
      clearAdminSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function setAdminSession(email: string) {
  const session: AdminSession = { email, grantedAt: Date.now() };
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}

export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export function isAdminEmail(email: string): boolean {
  const adminEmails = (import.meta.env.VITE_ADMIN_EMAIL ?? '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

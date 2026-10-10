"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const SessionContext = createContext({
  user: null,
  loading: true,
  refresh: async () => {},
  setUser: () => {}
});

// Loads the logged-in user once and shares it with the navbar and every page.
export default function SessionProvider({ children }) {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        setUser(null);
        return null;
      }
      const data = await response.json();
      setUser(data.user);
      return data.user;
    } catch {
      // Network hiccup: keep whatever we already know.
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-check on every page change so role or status changes show up quickly.
  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  return (
    <SessionContext.Provider value={{ user, loading, refresh, setUser }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}

/**
 * For pages that need a login. Sends visitors to the login page, and people
 * without one of `roles` back to the dashboard. Returns `ready` once it is safe to render.
 */
export function useRequireUser({ roles } = {}) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = session;
  const allowed = Boolean(user) && (!roles || roles.includes(user.role));

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (!allowed) router.replace("/dashboard");
  }, [loading, user, allowed, router, pathname]);

  return { ...session, ready: !loading && allowed };
}

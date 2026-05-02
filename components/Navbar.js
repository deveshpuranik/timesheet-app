"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/timesheet", label: "Timesheet" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/export", label: "Export" }
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const isHome = pathname === "/";

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });

        if (!response.ok) {
          if (active) setUser(null);
          return;
        }

        const data = await response.json();
        if (active) setUser(data.user);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadUser();
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 36);
    }

    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled || !isHome
          ? "border-b border-primary/10 bg-linen/85 shadow-sm backdrop-blur-2xl"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Mruda Eco Village logo"
              className="h-12 w-12 rounded-full bg-white/85 object-contain p-1.5 shadow-sm"
            />
            <span>
              <span
                className={`block font-serif text-xl font-medium leading-none transition-colors ${
                  isHome && !scrolled ? "text-white" : "text-primary"
                }`}
              >
                Mruda Eco Village
              </span>
              <span
                className={`mt-1 block text-[9px] font-bold uppercase tracking-[0.36em] transition-colors ${
                  isHome && !scrolled ? "text-white/75" : "text-secondary"
                }`}
              >
                Hotel Operations
              </span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`line-reveal rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.28em] transition ${
                  pathname === item.href
                    ? "bg-secondary text-white"
                    : isHome && !scrolled
                      ? "text-white/90 hover:bg-white/10"
                      : "text-primary/75 hover:bg-primary/5 hover:text-primary"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div
          className={`flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between ${
            isHome && !scrolled ? "border-white/20" : "border-primary/10"
          }`}
        >
          <p
            className={`text-xs font-light tracking-wide ${
              isHome && !scrolled ? "text-white/75" : "text-primary/60"
            }`}
          >
            {loading
              ? "Checking session..."
              : user
                ? `Signed in as ${user.name} (${user.role})`
                : "Welcome to Mruda Eco Village"}
          </p>

          {user ? (
            <button
              onClick={handleLogout}
              className={`btn-smooth w-fit rounded-full border px-5 py-2 text-[10px] font-bold uppercase tracking-[0.28em] ${
                isHome && !scrolled
                  ? "border-white/30 bg-white/10 text-white hover:bg-white hover:text-primary"
                  : "border-primary/10 bg-white/70 text-primary hover:border-secondary/30 hover:bg-secondary hover:text-white"
              }`}
              type="button"
            >
              Logout
            </button>
          ) : (
            <div className="flex gap-2">
              <Link
                href="/login"
                className="btn-smooth rounded-full bg-secondary px-5 py-2 text-[10px] font-bold uppercase tracking-[0.28em] text-white hover:bg-primary"
              >
                Login
              </Link>
              <Link
                href="/register"
                className={`btn-smooth rounded-full border px-5 py-2 text-[10px] font-bold uppercase tracking-[0.28em] ${
                  isHome && !scrolled
                    ? "border-white/30 bg-white/10 text-white hover:bg-white hover:text-primary"
                    : "border-primary/10 bg-white/70 text-primary hover:border-secondary/30 hover:bg-secondary hover:text-white"
                }`}
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

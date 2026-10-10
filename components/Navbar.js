"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import NotificationBell from "@/components/NotificationBell";
import { useSession } from "@/components/SessionProvider";
import { buttonClass } from "@/components/ui/kit";

const navItems = [
  { href: "/timesheet", label: "Timesheet" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leave", label: "Leave" },
  { href: "/export", label: "Export" },
  { href: "/people", label: "People", roles: ["admin"] }
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, setUser } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const isHome = pathname === "/";
  const light = isHome && !scrolled; // white text over the home page photo

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 36);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  const links = user ? navItems.filter((item) => !item.roles || item.roles.includes(user.role)) : [];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        light ? "bg-transparent" : "border-b border-primary/10 bg-linen/95 backdrop-blur"
      }`}
    >
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <img
              src="/logo.png"
              alt="Mruda Eco Village logo"
              className="h-10 w-10 rounded-full bg-white object-contain p-1"
            />
            <span className={`font-serif text-lg font-medium leading-none ${light ? "text-white" : "text-primary"}`}>
              Mruda Eco Village
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {links.map((item) => (
              <NavLink key={item.href} item={item} active={pathname === item.href} light={light} />
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {loading ? null : user ? (
              <>
                <NotificationBell light={light} />
                <div className="hidden text-right leading-tight sm:block">
                  <p className={`text-sm font-medium ${light ? "text-white" : "text-primary"}`}>{user.name}</p>
                  <p className={`text-xs capitalize ${light ? "text-white/70" : "text-primary/50"}`}>{user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  type="button"
                  className={
                    light
                      ? "rounded-lg border border-white/40 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white hover:text-primary"
                      : buttonClass("outline", "sm")
                  }
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={buttonClass("primary", "sm")}>
                  Log in
                </Link>
                <Link
                  href="/register"
                  className={
                    light
                      ? "rounded-lg border border-white/40 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white hover:text-primary"
                      : buttonClass("outline", "sm")
                  }
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Phones: the same links in a row that scrolls sideways */}
        {links.length > 0 ? (
          <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
            {links.map((item) => (
              <NavLink key={item.href} item={item} active={pathname === item.href} light={light} />
            ))}
          </div>
        ) : null}
      </nav>
    </header>
  );
}

function NavLink({ item, active, light }) {
  let tone = "text-primary/65 hover:bg-primary/5 hover:text-primary";
  if (active) tone = "bg-primary text-white";
  else if (light) tone = "text-white/90 hover:bg-white/15";

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition ${tone}`}
    >
      {item.label}
    </Link>
  );
}

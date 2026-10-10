"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJson, postJson } from "@/lib/fetchJson";

const POLL_INTERVAL_MS = 60000;

function timeAgo(value) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default function NotificationBell({ light = false }) {
  const router = useRouter();
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await fetchJson("/api/notifications");
      setNotifications(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {
      // Quietly try again on the next poll.
    }
  }, []);

  // Check for new notifications every minute, and whenever the tab is looked at again.
  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_INTERVAL_MS);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function markRead(body) {
    try {
      const data = await postJson("/api/notifications", body, "PATCH");
      setUnread(data.unread || 0);
      setNotifications((current) =>
        current.map((item) => (body.all || item._id === body.id ? { ...item, read: true } : item))
      );
    } catch {
      // Not critical.
    }
  }

  function openNotification(item) {
    if (!item.read) markRead({ id: item._id });
    setOpen(false);
    if (item.link) router.push(item.link);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          if (!open) load();
        }}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full transition ${
          light ? "text-white hover:bg-white/15" : "text-primary/70 hover:bg-primary/5 hover:text-primary"
        }`}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9" />
        </svg>
        {unread > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-primary/10 bg-white shadow-luxury">
          <div className="flex items-center justify-between border-b border-primary/10 px-4 py-3">
            <p className="text-sm font-semibold text-primary">Notifications</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => markRead({ all: true })}
                className="text-xs font-medium text-secondary hover:text-primary"
              >
                Mark all as read
              </button>
            ) : null}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-primary/50">
              Nothing yet. New signups, leave requests and remarks appear here.
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-primary/5 overflow-y-auto">
              {notifications.map((item) => (
                <li key={item._id}>
                  <button
                    type="button"
                    onClick={() => openNotification(item)}
                    className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-primary/5 ${
                      item.read ? "" : "bg-secondary/5"
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        item.read ? "bg-transparent" : "bg-secondary"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-primary">{item.title}</span>
                      {item.message ? (
                        <span className="mt-0.5 block text-sm text-primary/60">{item.message}</span>
                      ) : null}
                      <span className="mt-1 block text-xs text-primary/40">{timeAgo(item.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

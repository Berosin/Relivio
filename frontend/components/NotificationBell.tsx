"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";

const POLL_INTERVAL_MS = 20_000;

type Notification = {
  id: string;
  kind: string;
  target_type: "fund" | "campaign";
  target_address: string;
  message: string;
  read: boolean;
  created_at: string;
};

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationBell() {
  const { address, isConnected } = useAccount();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  async function load() {
    if (!address) return;
    try {
      const res = await fetch(`/api/notifications?wallet=${address}`);
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Silent — the bell just won't update this cycle.
    }
  }

  useEffect(() => {
    if (!address) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function markAllRead() {
    if (!address || unreadCount === 0) return;
    setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address }),
      });
    } catch {
      // Best-effort — next poll will resync the true state either way.
    }
  }

  if (!isConnected) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        aria-expanded={open}
        className="btn-shine relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-white text-black transition-colors hover:bg-black hover:text-white"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="card absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto p-3 shadow-[0_12px_32px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium text-neutral-500 underline decoration-dotted underline-offset-4 transition-colors hover:text-white"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {notifications.length === 0 && (
              <p className="text-xs text-neutral-600">
                No notifications yet — watch a fund or campaign to get updates here.
              </p>
            )}
            {notifications.map((n) => (
              <Link
                key={n.id}
                href={n.target_type === "fund" ? `/funds/${n.target_address}` : `/campaigns/${n.target_address}`}
                onClick={() => setOpen(false)}
                className={`block rounded-lg border p-2.5 transition-colors ${
                  n.read
                    ? "border-white/10 bg-white/[0.03] hover:border-white/20"
                    : "border-white/20 bg-white/[0.06] hover:border-white/30"
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white" />}
                  <div className={n.read ? "min-w-0 text-neutral-400" : "min-w-0 text-neutral-100"}>
                    <p className="text-xs leading-snug">{n.message}</p>
                    <p className="mt-1 text-[11px] text-neutral-600">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
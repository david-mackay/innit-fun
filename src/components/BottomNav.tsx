"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function BottomNav() {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState({
    unreadMessages: 0,
    pendingRequests: 0,
    total: 0,
  });

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch("/api/notifications/counts");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchCounts();
  }, []);

  return (
    <div className="fixed bottom-0 left-0 w-full bg-slate-950 border-t border-slate-800 pb-safe z-50">
      <div className="flex justify-around items-center h-16">
        <Link
          href="/feed"
          className={`flex flex-col items-center gap-1 w-full h-full justify-center transition-colors ${
            isActive("/feed") || pathname === "/"
              ? "text-indigo-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-bold uppercase tracking-wider">
            Feed
          </span>
        </Link>

        <Link
          href="/messages"
          className={`relative flex flex-col items-center gap-1 w-full h-full justify-center transition-colors ${
            isActive("/messages")
              ? "text-indigo-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <div className="relative">
            <span className="text-xl">💬</span>
            {notifications.total > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] text-white">
                {notifications.total > 9 ? "9+" : notifications.total}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">
            Messages
          </span>
        </Link>

        <Link
          href="/profile"
          className={`flex flex-col items-center gap-1 w-full h-full justify-center transition-colors ${
            isActive("/profile")
              ? "text-indigo-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-bold uppercase tracking-wider">
            Profile
          </span>
        </Link>
      </div>
    </div>
  );
}

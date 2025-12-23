"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface User {
  id: string;
  displayName?: string;
  avatarUrl?: string;
  walletAddress: string;
}

interface DiscoveryUser extends User {
  mutualFriends: number;
}

export function FriendsList() {
  const [friends, setFriends] = useState<User[]>([]);
  const [discovery, setDiscovery] = useState<DiscoveryUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/friends")
      .then((res) => res.json())
      .then((data) => {
        if (data.friends) setFriends(data.friends);
        if (data.discovery) setDiscovery(data.discovery);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-4">
        <div className="w-16 h-16 rounded-full bg-slate-800 animate-pulse"></div>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* My Friends (Stories Style) */}
      <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar px-1">
        {friends.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full py-4 text-slate-500 text-sm italic border border-dashed border-slate-800 rounded-xl">
            <p>No friends yet.</p>
          </div>
        ) : (
          friends.map((friend) => (
            <Link
              href={`/u/${friend.id}`}
              key={friend.id}
              className="flex flex-col items-center min-w-[72px] group cursor-pointer"
            >
              <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 group-hover:scale-105 transition-transform">
                <img
                  src={
                    friend.avatarUrl ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`
                  }
                  className="w-16 h-16 rounded-full border-2 border-black object-cover bg-slate-800"
                  alt={friend.displayName || "Friend"}
                />
              </div>
              <span className="text-xs text-slate-300 mt-2 truncate w-20 text-center font-medium">
                {friend.displayName || "Friend"}
              </span>
            </Link>
          ))
        )}
      </div>

      {/* Discovery */}
      {discovery.length > 0 && (
        <div className="border-t border-slate-800 pt-4">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3 px-1">
            People You May Know
          </h3>
          <div className="space-y-3">
            {discovery.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-800"
              >
                <Link
                  href={`/u/${user.id}`}
                  className="flex items-center gap-3"
                >
                  <img
                    src={
                      user.avatarUrl ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`
                    }
                    className="w-10 h-10 rounded-full bg-slate-800 object-cover"
                  />
                  <div>
                    <p className="text-sm font-bold text-white">
                      {user.displayName || "Unknown"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {user.mutualFriends} mutual friends
                    </p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

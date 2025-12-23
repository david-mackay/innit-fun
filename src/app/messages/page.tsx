"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { BottomNav } from "@/components/BottomNav";

interface User {
  id: string;
  displayName?: string;
  avatarUrl?: string;
}

interface Conversation {
  user: User;
  lastMessage: {
    content?: string;
    mediaUrl?: string;
    amount?: string;
    createdAt: string;
    isRead?: boolean;
    senderId?: string;
  };
}

interface FriendRequest {
  id: string;
  user1: User; // Requester
  createdAt: string;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [convRes, reqRes] = await Promise.all([
        fetch("/api/messages"),
        fetch("/api/friends/request"),
      ]);

      if (convRes.ok) {
        const data = await convRes.json();
        if (data.conversations) setConversations(data.conversations);
      }
      if (reqRes.ok) {
        const data = await reqRes.json();
        if (data.requests) setRequests(data.requests);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRequestAction = async (
    requesterId: string,
    action: "accept" | "reject"
  ) => {
    try {
      await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: requesterId, action }),
      });
      // Optimistic remove
      setRequests(requests.filter((r) => r.user1.id !== requesterId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 pb-24">
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <h1 className="text-xl font-bold">Messages</h1>
      </header>

      <div className="p-4 space-y-6">
        {/* Friend Requests */}
        {requests.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Friend Requests
            </h3>
            <div className="space-y-2">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        req.user1.avatarUrl ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user1.id}`
                      }
                      className="w-10 h-10 rounded-full bg-slate-800"
                    />
                    <span className="font-bold text-sm">
                      {req.user1.displayName || "Unknown"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleRequestAction(req.user1.id, "accept")
                      }
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-full font-bold"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() =>
                        handleRequestAction(req.user1.id, "reject")
                      }
                      className="bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs px-3 py-1.5 rounded-full"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conversations */}
        <div>
          {requests.length > 0 && (
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Conversations
            </h3>
          )}

          {loading ? (
            <div className="text-center text-slate-500 py-8">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-slate-500 py-8 italic">
              No messages yet.
            </div>
          ) : (
            conversations.map((conv) => (
              <Link
                key={conv.user.id}
                href={`/messages/${conv.user.id}`}
                className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-900/50 transition-colors"
              >
                <div className="relative">
                  <img
                    src={
                      conv.user.avatarUrl ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.user.id}`
                    }
                    className="w-12 h-12 rounded-full object-cover bg-slate-800"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3
                      className={`font-bold truncate ${
                        conv.lastMessage.isRead === false
                          ? "text-white"
                          : "text-slate-300"
                      }`}
                    >
                      {conv.user.displayName || "Unknown"}
                    </h3>
                    <span className="text-[10px] text-slate-500">
                      {formatDistanceToNow(
                        new Date(conv.lastMessage.createdAt),
                        { addSuffix: true }
                      )}
                    </span>
                  </div>
                  <p
                    className={`text-sm truncate ${
                      conv.lastMessage.isRead === false
                        ? "text-white font-medium"
                        : "text-slate-500"
                    }`}
                  >
                    {conv.lastMessage.amount
                      ? `💸 Sent ${conv.lastMessage.amount} SOL`
                      : conv.lastMessage.mediaUrl
                      ? "📷 Image"
                      : conv.lastMessage.content}
                  </p>
                </div>
                {conv.lastMessage.isRead === false && (
                  <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></div>
                )}
              </Link>
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

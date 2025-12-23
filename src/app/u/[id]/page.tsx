"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { PostCard } from "@/components/PostCard";
import { PostComposer } from "@/components/PostComposer";
import { BottomNav } from "@/components/BottomNav";

interface UserProfile {
  id: string;
  walletAddress: string;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const { user } = useWalletAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"wall" | "featured">("wall");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Friend Status
  const [friendStatus, setFriendStatus] = useState<
    "none" | "friends" | "pending_sent" | "pending_received"
  >("none");
  const [friendLoading, setFriendLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadProfile();
      loadPosts();
      if (user) loadFriendStatus();
    }
  }, [userId, user]);

  const loadProfile = async () => {
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    const res = await fetch(`/api/posts/wall/${userId}`);
    const data = await res.json();
    if (data.posts) {
      setPosts(data.posts);
    }
  };

  const loadFriendStatus = async () => {
    try {
      const res = await fetch(`/api/friends/check/${userId}`);
      const data = await res.json();
      if (data.status === "sent") setFriendStatus("pending_sent");
      else if (data.status === "received") setFriendStatus("pending_received");
      else setFriendStatus(data.status);
    } catch (err) {
      console.error(err);
    } finally {
      setFriendLoading(false);
    }
  };

  const handleAddFriend = async () => {
    setFriendLoading(true);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId }),
      });
      if (res.ok) {
        setFriendStatus("pending_sent");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFriendLoading(false);
    }
  };

  const handleAccept = async () => {
    setFriendLoading(true);
    try {
      const res = await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId, action: "accept" }),
      });
      if (res.ok) {
        setFriendStatus("friends");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFriendLoading(false);
    }
  };

  if (loading)
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  if (!profile)
    return <div className="p-8 text-center text-slate-500">User not found</div>;

  const visiblePosts =
    activeTab === "featured"
      ? posts.filter((p) => p.isFeatured)
      : posts.filter(
          (p) =>
            p.targetUserId === userId ||
            (!p.targetUserId && p.userId === userId && !p.isFeatured)
        );

  return (
    <div className="max-w-xl mx-auto pb-24 px-4 pt-6">
      {/* Profile Header */}
      <div className="bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-800 mb-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-xl"></div>

        <div className="relative z-10">
          <div className="inline-block relative mb-4">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                className="w-28 h-28 rounded-full object-cover border-4 border-slate-800 shadow-2xl"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-slate-800 flex items-center justify-center text-4xl border-4 border-slate-700">
                👻
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">
            {profile.displayName || "Anonymous"}
          </h1>
          <p className="text-xs text-slate-500 font-mono mb-4">
            {profile.walletAddress.slice(0, 6)}...
            {profile.walletAddress.slice(-4)}
          </p>

          {profile.bio && (
            <p className="text-slate-300 italic max-w-sm mx-auto text-sm leading-relaxed">
              "{profile.bio}"
            </p>
          )}

          <div className="mt-4 flex justify-center gap-3">
            {friendStatus === "friends" ? (
              <Link
                href={`/messages/${userId}`}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-6 py-2 rounded-full transition-colors flex items-center gap-2"
              >
                <span>💬</span> Message
              </Link>
            ) : friendStatus === "pending_sent" ? (
              <button
                disabled
                className="bg-slate-700 text-slate-300 text-sm font-bold px-6 py-2 rounded-full cursor-default"
              >
                Requested 🕒
              </button>
            ) : friendStatus === "pending_received" ? (
              <button
                onClick={handleAccept}
                disabled={friendLoading}
                className="bg-green-600 hover:bg-green-500 text-white text-sm font-bold px-6 py-2 rounded-full"
              >
                Accept Request
              </button>
            ) : (
              <button
                onClick={handleAddFriend}
                disabled={friendLoading}
                className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold px-6 py-2 rounded-full transition-colors"
              >
                Add Friend +
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab("wall")}
          className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wide transition-colors ${
            activeTab === "wall"
              ? "text-indigo-400 border-b-2 border-indigo-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Wall
        </button>
        <button
          onClick={() => setActiveTab("featured")}
          className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wide transition-colors ${
            activeTab === "featured"
              ? "text-yellow-400 border-b-2 border-yellow-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Featured ★
        </button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === "wall" && (
          <div className="mb-8">
            <p className="text-xs text-slate-500 mb-2 uppercase font-bold tracking-wide">
              Write on {profile.displayName || "their"}'s Wall
            </p>
            <PostComposer
              onPostCreated={(p) => setPosts([p, ...posts])}
              targetUserId={userId}
            />
          </div>
        )}

        {visiblePosts.length === 0 ? (
          <div className="text-center py-10 text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
            <p className="text-lg mb-2">
              {activeTab === "featured" ? "★" : "📝"}
            </p>
            <p>Nothing here yet.</p>
          </div>
        ) : (
          visiblePosts.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={user?.id} />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { PostCard } from "@/components/PostCard";
import { BottomNav } from "@/components/BottomNav";

export default function SinglePostPage() {
  const { id } = useParams();
  const { user, status } = useWalletAuth();
  const router = useRouter();

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      // If unauthed, maybe redirect to invite/public page?
      // But this page is protected.
      // Let's allow the fetch to decide (it returns 403 or 404).
      // Actually, if unauthed, user can't see private details.
    }
  }, [status]);

  useEffect(() => {
    if (id && user) {
      fetch(`/api/posts/${id}`)
        .then((res) => {
          if (res.status === 403)
            throw new Error(
              "Access Denied. You must be friends with the host or an attendee."
            );
          if (res.status === 404) throw new Error("Post not found");
          return res.json();
        })
        .then((data) => {
          if (data.post) setPost(data.post);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } else if (status === "unauthenticated") {
      setLoading(false);
      setError("Please sign in to view this post.");
    }
  }, [id, user, status]);

  if (loading)
    return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-slate-100 pb-24">
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-xl">
          ←
        </button>
        <h1 className="font-bold">Post</h1>
      </header>

      <div className="max-w-xl mx-auto p-4">
        {error ? (
          <div className="text-center py-10 bg-slate-900 rounded-xl border border-red-900/30 text-red-400">
            <p>{error}</p>
            {status === "unauthenticated" && (
              <button
                onClick={() => router.push("/auth")}
                className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-full font-bold text-sm"
              >
                Sign In
              </button>
            )}
          </div>
        ) : (
          post && <PostCard post={post} currentUserId={user?.id} />
        )}
      </div>

      <BottomNav />
    </div>
  );
}

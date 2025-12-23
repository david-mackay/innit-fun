"use client";

import { useEffect, useState } from "react";
import { PostComposer } from "./PostComposer";
import { PostCard } from "./PostCard";
import { FriendsList } from "./FriendsList";
import { useWalletAuth } from "@/hooks/useWalletAuth";

export function Feed() {
  const { user } = useWalletAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allCaughtUp, setAllCaughtUp] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/posts?limit=50");
      const data = await res.json();
      if (data.posts) {
        setPosts(data.posts);
        if (data.posts.length < 50) {
          setAllCaughtUp(true);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleNewPost = (post: any) => {
    setPosts([post, ...posts]);
  };

  if (loading && posts.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">Loading vibes...</div>
    );
  }

  return (
    <div className="max-w-xl mx-auto pb-20">
      <FriendsList />
      <div className="my-6 border-b border-slate-800"></div>

      <PostComposer onPostCreated={handleNewPost} />

      <div className="space-y-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} currentUserId={user?.id} />
        ))}
      </div>

      {allCaughtUp && (
        <div className="text-center py-10">
          <p className="text-2xl mb-2">✨</p>
          <h3 className="text-xl font-bold text-white mb-1">
            You're all caught up on the vibe
          </h3>
          <p className="text-slate-500 text-sm">
            Go touch grass or make some new friends.
          </p>
        </div>
      )}
    </div>
  );
}


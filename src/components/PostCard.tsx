"use client";

import { useState, useRef, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { ImageUpload } from "./ImageUpload";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { GifPicker } from "./GifPicker";
import { StackCarousel } from "./StackCarousel";

const VIBE_STYLES: Record<string, string> = {
  chill:
    "bg-gradient-to-br from-blue-900/40 to-purple-900/40 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]",
  energy:
    "bg-gradient-to-br from-orange-900/40 to-red-900/40 border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.1)]",
  love: "bg-gradient-to-br from-pink-900/40 to-rose-900/40 border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.1)]",
  nature:
    "bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]",
  magic:
    "bg-gradient-to-br from-indigo-900/40 to-violet-900/40 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]",
  sad: "bg-gradient-to-br from-slate-800/60 to-gray-800/60 border-slate-600/30 shadow-[0_0_15px_rgba(148,163,184,0.1)]",
};

interface PostCardProps {
  post: any;
  currentUserId?: string;
}

export function PostCard({ post, currentUserId }: PostCardProps) {
  const { user } = useWalletAuth();
  const [localStacks, setLocalStacks] = useState(post.stacks || []);
  const [showStackUpload, setShowStackUpload] = useState(false);
  const [loadingStack, setLoadingStack] = useState(false);
  const [isFeatured, setIsFeatured] = useState(post.isFeatured);
  const [featureLoading, setFeatureLoading] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Attendance State
  const [attendees, setAttendees] = useState(post.attendees || []);
  const amIGoing = attendees.some((a: any) => a.userId === user?.id);
  const [attendLoading, setAttendLoading] = useState(false);

  // Reaction State
  const [localReactions, setLocalReactions] = useState(post.reactions || []);
  const [reacting, setReacting] = useState(false);
  const hasReacted = localReactions.some(
    (r: any) => r.userId === user?.id && r.emoji === "❤️"
  );

  // Share State
  const [shareLoading, setShareLoading] = useState(false);

  // Stack Viewer State
  const [viewingStackIndex, setViewingStackIndex] = useState<number | null>(
    null
  );
  // Removed scrollContainerRef as it's now handled in StackCarousel

  // GIF Comment State
  const [comments, setComments] = useState(post.comments || []); // Needs backend support first
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [loadingComment, setLoadingComment] = useState(false);
  const gifPickerRef = useRef<HTMLDivElement>(null);

  const vibeStyle = VIBE_STYLES[post.vibe] || VIBE_STYLES.chill;
  const isExpired = post.expiresAt && new Date(post.expiresAt) < new Date();

  // Close GIF picker on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        gifPickerRef.current &&
        !gifPickerRef.current.contains(event.target as Node)
      ) {
        setShowGifPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch comments on mount if not provided (simple implementation)
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch(`/api/posts/${post.id}/comments`);
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments);
        }
      } catch (err) {
        console.error("Failed to fetch comments", err);
      }
    };
    // Only fetch if we suspect there are comments or just once on load
    fetchComments();
  }, [post.id]);

  // Permission Logic
  const canFeature = post.targetUserId
    ? currentUserId === post.targetUserId
    : currentUserId === post.userId;

  const canDelete =
    currentUserId === post.userId || currentUserId === post.targetUserId;

  if (isExpired || isDeleted) return null;

  const handleStackUpload = async (url: string) => {
    setLoadingStack(true);
    try {
      const res = await fetch("/api/posts/stack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, mediaUrl: url }),
      });
      const data = await res.json();
      if (data.stack) {
        setLocalStacks([...localStacks, data.stack]);
        setShowStackUpload(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStack(false);
    }
  };

  const toggleFeature = async () => {
    setFeatureLoading(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/feature`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !isFeatured }),
      });
      const data = await res.json();
      if (data.post) {
        setIsFeatured(data.post.isFeatured);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFeatureLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setIsDeleted(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAttendance = async () => {
    if (!user) return;
    setAttendLoading(true);
    const newStatus = amIGoing ? "not_going" : "going";

    try {
      const res = await fetch(`/api/posts/${post.id}/attend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        // Optimistic update
        if (newStatus === "going") {
          setAttendees([
            ...attendees,
            { userId: user.id, user: { ...user, avatarUrl: user.avatarUrl } },
          ]); // Using minimal user object
        } else {
          setAttendees(attendees.filter((a: any) => a.userId !== user.id));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAttendLoading(false);
    }
  };

  const handleShare = async () => {
    setShareLoading(true);
    try {
      // Generate invite code
      const res = await fetch("/api/invites", { method: "POST" });
      const data = await res.json();
      if (data.invite) {
        const url = `${window.location.origin}/invite/${data.invite.code}?event=${post.id}`;
        await navigator.clipboard.writeText(url);
        alert("Invite link copied! Share it with a friend.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create invite link");
    } finally {
      setShareLoading(false);
    }
  };

  const handleReaction = async () => {
    if (!user || reacting) return;
    setReacting(true);

    // Optimistic
    if (hasReacted) {
      setLocalReactions(
        localReactions.filter((r: any) => r.userId !== user.id)
      );
    } else {
      setLocalReactions([...localReactions, { userId: user.id, emoji: "❤️" }]);
    }

    try {
      await fetch(`/api/posts/${post.id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji: "❤️" }),
      });
    } catch (err) {
      console.error(err);
      // Revert on error? Skipping for simplicity in MVP
    } finally {
      setReacting(false);
    }
  };

  const handleGifSelect = async (
    gif: any,
    e: React.SyntheticEvent<HTMLElement, Event>
  ) => {
    e.preventDefault();
    if (!user) return;

    setLoadingComment(true);
    setShowGifPicker(false);

    try {
      const mediaUrl = gif.images.fixed_height.url; // Use fixed height for better list display
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaUrl }),
      });

      const data = await res.json();
      if (data.comment) {
        setComments([data.comment, ...comments]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComment(false);
    }
  };

  const openStackViewer = (index: number) => {
    setViewingStackIndex(index);
    // document.body.style.overflow = "hidden"; // Prevent background scroll
  };

  const closeStackViewer = () => {
    setViewingStackIndex(null);
    // document.body.style.overflow = "auto";
  };

  // BROADCAST CARD
  if (post.type === "broadcast") {
    return (
      <div className="mb-4 text-sm text-slate-400 bg-slate-900/30 p-3 rounded-lg flex items-center justify-between gap-3 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="text-xl">📣</div>
          <div>
            <div className="flex gap-1">
              <span className="font-bold text-white">
                {post.author.displayName}
              </span>
              <span>
                {post.content
                  .replace(post.author.displayName, "")
                  .replace("...", "")}
              </span>
            </div>
            {post.referencePost && (
              <p className="text-xs text-indigo-400 mt-1">
                RE: {post.referencePost.content?.substring(0, 30) || "Event"}
              </p>
            )}
          </div>
        </div>
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleteLoading}
            className="text-slate-500 hover:text-red-400 px-2"
          >
            {deleteLoading ? "..." : "🗑️"}
          </button>
        )}
      </div>
    );
  }

  // STANDARD / EVENT CARD
  return (
    <div
      className={`relative rounded-xl p-5 mb-6 border backdrop-blur-sm ${vibeStyle} transition-all hover:scale-[1.01]`}
    >
      {/* Featured Badge */}
      {isFeatured && (
        <div className="absolute -top-3 -right-3 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full shadow-lg z-10">
          ⭐ Featured
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        {post.author.avatarUrl ? (
          <img
            src={post.author.avatarUrl}
            alt="Avatar"
            className="w-10 h-10 rounded-full object-cover border border-white/10"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg">
            👻
          </div>
        )}

        <div>
          <h3 className="font-bold text-white text-sm">
            {post.author.displayName || "Unknown"}
            {post.targetUserId && (
              <span className="text-slate-400 font-normal"> ▸ Wall</span>
            )}
          </h3>
          <p className="text-xs text-slate-400">
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            {post.expiresAt && (
              <span className="ml-2 text-orange-400/80">⏳ Expiring</span>
            )}
          </p>
        </div>
      </div>

      <p className="text-slate-100 text-lg mb-3 leading-relaxed whitespace-pre-wrap">
        {post.content}
      </p>

      {post.mediaUrl && (
        <div className="rounded-lg overflow-hidden mb-3 border border-white/5">
          <img
            src={post.mediaUrl}
            alt="Post media"
            className="w-full h-auto max-h-96 object-cover"
          />
        </div>
      )}

      {post.type === "event" && post.eventDate && (
        <div className="bg-black/30 rounded-xl p-4 mb-3 border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/10 rounded-lg flex flex-col items-center justify-center text-white border border-white/10">
              <span className="text-xs font-bold uppercase">
                {new Date(post.eventDate).toLocaleString("default", {
                  month: "short",
                })}
              </span>
              <span className="text-lg font-bold">
                {new Date(post.eventDate).getDate()}
              </span>
            </div>
            <div>
              <p className="font-bold text-white">
                {new Date(post.eventDate).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-sm text-slate-300">
                📍 {post.eventLocation || "TBD"}
              </p>
            </div>
          </div>

          {/* Attendance UI */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div className="flex -space-x-2">
              {attendees.slice(0, 5).map((a: any) => (
                <img
                  key={a.userId}
                  src={
                    a.user?.avatarUrl ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.userId}`
                  }
                  className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800"
                  title={a.user?.displayName || "Friend"}
                />
              ))}
              {attendees.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] text-white">
                  +{attendees.length - 5}
                </div>
              )}
              {attendees.length === 0 && (
                <span className="text-xs text-slate-500 py-1">
                  Be the first to go!
                </span>
              )}
            </div>

            <div className="flex gap-2">
              {/* Share Button (Only for events) */}
              <button
                onClick={handleShare}
                disabled={shareLoading}
                className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all text-lg"
                title="Share Event"
              >
                {shareLoading ? "..." : "📤"}
              </button>

              <button
                onClick={handleAttendance}
                disabled={attendLoading}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                  amIGoing
                    ? "bg-green-500/20 text-green-400 border border-green-500/50"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {amIGoing ? "✓ Going" : "+ I'm Going"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stacks Display */}
      {localStacks.length > 0 && (
        <div className="mt-3 bg-black/20 rounded-lg p-2 flex gap-2 overflow-x-auto hide-scrollbar">
          {localStacks.map((stack: any, index: number) => (
            <div
              key={stack.id}
              className="flex-shrink-0 relative w-16 h-16 rounded overflow-hidden group cursor-pointer hover:ring-2 ring-indigo-500/50 transition-all"
              onClick={() => openStackViewer(index)}
            >
              <img
                src={stack.mediaUrl}
                alt="Stack"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <img
                  src={stack.user?.avatarUrl}
                  className="w-6 h-6 rounded-full border border-white"
                  title={stack.user?.displayName}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-3 relative">
        <div className="flex gap-4">
          <button
            onClick={handleReaction}
            className={`transition-colors flex items-center gap-1 text-sm ${
              hasReacted
                ? "text-pink-500"
                : "text-slate-400 hover:text-pink-400"
            }`}
          >
            {hasReacted ? "❤️" : "🤍"} {localReactions.length || 0}
          </button>

          {/* GIF Comment Button */}
          <div className="relative" ref={gifPickerRef}>
            <button
              onClick={() => setShowGifPicker(!showGifPicker)}
              className={`transition-colors flex items-center gap-1 text-sm ${
                showGifPicker
                  ? "text-indigo-400"
                  : "text-slate-400 hover:text-indigo-400"
              }`}
            >
              <span>💬</span> GIF
            </button>

            {showGifPicker && (
              <div className="absolute bottom-full left-0 mb-2 w-[320px] h-[400px] z-50 shadow-2xl rounded-xl animate-in fade-in zoom-in-95 duration-200">
                <GifPicker
                  onSelect={handleGifSelect}
                  searchTerm={post.vibe || ""}
                />
              </div>
            )}
          </div>

          <ImageUpload
            onUpload={handleStackUpload}
            label="📚 Stack"
            className="!flex-row !justify-start !gap-0"
          >
            <div className="text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1 text-sm cursor-pointer">
              {loadingStack ? "..." : "📚 Stack"}
            </div>
          </ImageUpload>
        </div>

        <div className="flex gap-3">
          {canFeature && (
            <button
              onClick={toggleFeature}
              disabled={featureLoading}
              className={`text-sm flex items-center gap-1 transition-colors ${
                isFeatured
                  ? "text-yellow-400"
                  : "text-slate-500 hover:text-yellow-400"
              }`}
            >
              {featureLoading ? "..." : isFeatured ? "★ Featured" : "☆ Feature"}
            </button>
          )}

          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="text-slate-500 hover:text-red-400 text-sm flex items-center"
              title="Delete Post"
            >
              {deleteLoading ? "..." : "🗑️"}
            </button>
          )}
        </div>
      </div>

      {/* Comments List */}
      {comments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
          {comments.slice(0, 3).map((comment: any) => (
            <div key={comment.id} className="flex gap-3 group">
              <img
                src={
                  comment.user?.avatarUrl ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`
                }
                className="w-8 h-8 rounded-full border border-white/10 flex-shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-300">
                    {comment.user?.displayName || "Unknown"}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <div className="rounded-lg overflow-hidden inline-block border border-white/10 max-w-[200px]">
                  <img
                    src={comment.mediaUrl}
                    className="w-full h-auto"
                    alt="GIF comment"
                  />
                </div>
              </div>
            </div>
          ))}
          {comments.length > 3 && (
            <button className="text-xs text-slate-500 hover:text-indigo-400 w-full text-left pl-11">
              View all {comments.length} comments...
            </button>
          )}
        </div>
      )}

      {/* Full Screen Stack Viewer Modal */}
      {viewingStackIndex !== null && (
        <StackCarousel
          stacks={localStacks}
          initialIndex={viewingStackIndex}
          onClose={closeStackViewer}
        />
      )}
    </div>
  );
}

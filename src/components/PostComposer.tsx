"use client";

import { useState, useRef, useEffect } from "react";
import { ImageUpload } from "./ImageUpload";

const VIBES = [
  {
    id: "chill",
    label: "Chill",
    color: "from-blue-500/20 to-purple-500/20 border-blue-500/50",
  },
  {
    id: "energy",
    label: "Energy",
    color: "from-orange-500/20 to-red-500/20 border-orange-500/50",
  },
  {
    id: "love",
    label: "Love",
    color: "from-pink-500/20 to-rose-500/20 border-pink-500/50",
  },
  {
    id: "nature",
    label: "Nature",
    color: "from-green-500/20 to-emerald-500/20 border-green-500/50",
  },
  {
    id: "magic",
    label: "Magic",
    color: "from-indigo-500/20 to-violet-500/20 border-indigo-500/50",
  },
  {
    id: "sad",
    label: "Melancholy",
    color: "from-slate-500/20 to-gray-500/20 border-slate-500/50",
  },
];

const EXPIRY_OPTIONS = [
  { label: "1h", fullLabel: "1 Hour", value: 60 * 60 * 1000 },
  { label: "24h", fullLabel: "24 Hours", value: 24 * 60 * 60 * 1000 },
  { label: "∞", fullLabel: "Forever", value: 0 },
];

interface PostComposerProps {
  onPostCreated: (post: any) => void;
  targetUserId?: string; // Optional: If posting to a wall
}

export function PostComposer({
  onPostCreated,
  targetUserId,
}: PostComposerProps) {
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [vibe, setVibe] = useState(VIBES[0]);
  const [expiry, setExpiry] = useState(EXPIRY_OPTIONS[2]); // Default forever
  const [type, setType] = useState<"text" | "image" | "event">("text");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [showVibeGrid, setShowVibeGrid] = useState(false);
  const [showExpiryMenu, setShowExpiryMenu] = useState(false);

  const expiryRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        expiryRef.current &&
        !expiryRef.current.contains(event.target as Node)
      ) {
        setShowExpiryMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async () => {
    if (!content && !mediaUrl) return;

    setLoading(true);
    try {
      const expiresAt =
        expiry.value > 0
          ? new Date(Date.now() + expiry.value).toISOString()
          : null;

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          mediaUrl,
          vibe: vibe.id,
          type: type === "event" ? "event" : mediaUrl ? "image" : type,
          expiresAt,
          eventDate: type === "event" ? eventDate : null,
          eventLocation: type === "event" ? eventLocation : null,
          targetUserId, // Pass targetUserId
        }),
      });

      const data = await res.json();
      if (data.post) {
        onPostCreated(data.post);
        // Reset
        setContent("");
        setMediaUrl(null);
        setType("text");
        setEventDate("");
        setEventLocation("");
        setShowVibeGrid(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`relative bg-gradient-to-br ${vibe.color} p-4 rounded-xl border mb-6 transition-all duration-500`}
    >
      {/* Expiry Picker (Top Right) */}
      <div className="absolute top-3 right-3 z-20" ref={expiryRef}>
        <button
          onClick={() => setShowExpiryMenu(!showExpiryMenu)}
          className="flex items-center gap-1 bg-black/20 hover:bg-black/40 text-white/80 hover:text-white px-2 py-1 rounded-full text-xs font-medium transition-colors border border-white/10"
          title="Post Expiration"
        >
          {expiry.label === "∞" ? (
            <span className="text-sm leading-none">∞</span>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{expiry.label}</span>
            </>
          )}
        </button>

        {showExpiryMenu && (
          <div className="absolute right-0 top-full mt-2 w-32 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
            {EXPIRY_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => {
                  setExpiry(opt);
                  setShowExpiryMenu(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                  expiry.value === opt.value
                    ? "text-indigo-400 bg-slate-800/50"
                    : "text-slate-300"
                }`}
              >
                <span>{opt.fullLabel}</span>
                {opt.label === "∞" && <span className="text-sm">∞</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4 pr-12">
        {" "}
        {/* pr-12 to avoid overlap with expiry button */}
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={targetUserId ? "Write on wall..." : "What's the vibe?"}
          className="w-full bg-transparent text-xl text-white placeholder-slate-400 focus:outline-none"
        />
      </div>

      {mediaUrl && (
        <div className="relative mb-4 rounded-lg overflow-hidden group">
          <img
            src={mediaUrl}
            alt="Preview"
            className="w-full max-h-64 object-cover"
          />
          <button
            onClick={() => setMediaUrl(null)}
            className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>
      )}

      {type === "event" && (
        <div className="flex flex-col gap-3 mb-4 bg-black/20 p-3 rounded-lg border border-white/10">
          <div className="relative">
            <label className="text-xs text-white/70 font-bold uppercase tracking-wider mb-1 block">
              When
            </label>
            <div className="flex items-center gap-2 bg-black/20 rounded px-3 py-2 border border-white/10 relative">
              <span className="text-lg">📅</span>
              <span className="text-sm text-white/90">
                {eventDate
                  ? new Date(eventDate).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "Pick a date & time"}
              </span>
              {/* Invisible native input covering the container for trigger */}
              <input
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                onClick={(e) => {
                  // Force picker to open on click (especially for desktop)
                  try {
                    e.currentTarget.showPicker();
                  } catch (err) {
                    console.log("Browser doesn't support showPicker", err);
                  }
                }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/70 font-bold uppercase tracking-wider mb-1 block">
              Where
            </label>
            <div className="flex items-center gap-2 bg-black/20 rounded px-3 py-2 border border-white/10">
              <span className="text-lg">📍</span>
              <input
                type="text"
                placeholder="Add location"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                className="bg-transparent text-white text-sm w-full focus:outline-none placeholder-white/50"
              />
            </div>
          </div>
        </div>
      )}

      {/* Vibe Grid Toggle */}
      <div className="mb-3">
        <button
          onClick={() => setShowVibeGrid(!showVibeGrid)}
          className="text-xs text-white/70 hover:text-white flex items-center gap-1 bg-black/20 px-2 py-1 rounded-full w-fit"
        >
          <div
            className={`w-3 h-3 rounded-full bg-gradient-to-br ${vibe.color}`}
          ></div>
          {vibe.label} Vibe
          <span className="text-[10px]">▼</span>
        </button>

        {showVibeGrid && (
          <div className="grid grid-cols-3 gap-2 mt-2 bg-black/40 p-2 rounded-lg animate-in fade-in zoom-in-95 duration-200">
            {VIBES.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setVibe(v);
                  setShowVibeGrid(false);
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                  vibe.id === v.id
                    ? "border-white bg-white/10"
                    : "border-transparent hover:bg-white/5"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full mb-1 bg-gradient-to-br ${v.color}`}
                ></div>
                <span className="text-[10px] text-white">{v.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ImageUpload
              onUpload={setMediaUrl}
              label="📷"
              className="!flex-row" // Override flex-col
            />
          </div>

          <button
            onClick={() => setType(type === "event" ? "text" : "event")}
            className={`text-xl transition-colors ${
              type === "event"
                ? "text-indigo-300"
                : "text-slate-400 hover:text-white"
            }`}
            title="Event"
          >
            📅
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || (!content && !mediaUrl)}
          className="bg-white/10 hover:bg-white/20 text-white px-6 py-1.5 rounded-full text-sm font-bold transition-colors disabled:opacity-50"
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  );
}

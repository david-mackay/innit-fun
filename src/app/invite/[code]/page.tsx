"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";

interface PublicProfile {
  id: string;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
}

interface PublicEvent {
  id: string;
  content: string;
  mediaUrl?: string;
  eventDate?: string;
  vibe: string;
}

export default function InviteLandingPage() {
  const { code } = useParams();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");

  const { user, isAuthenticated, authenticate } = useWalletAuth();
  const { open } = useAppKit();
  const { isConnected } = useAppKitAccount();
  const router = useRouter();

  const [invite, setInvite] = useState<{
    code: string;
    creator: PublicProfile;
  } | null>(null);

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (code) {
      fetch(`/api/invites/${code}`)
        .then((res) => {
          if (!res.ok) throw new Error("Invite invalid or expired");
          return res.json();
        })
        .then((data) => setInvite(data.invite))
        .catch((err) => setError(err.message));
    }
  }, [code]);

  useEffect(() => {
    if (eventId) {
      fetch(`/api/public/events/${eventId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.event) setEvent(data.event);
        })
        .catch(console.error);
    }
  }, [eventId]);

  const handleAccept = async () => {
    // If not connected to wallet, open wallet modal
    if (!isConnected) {
      open();
      return;
    }

    // If connected but not authenticated (signed in), trigger sign in
    if (!isAuthenticated) {
      await authenticate();
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/invites/${code}`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to accept");

      if (eventId) {
        router.push(`/post/${eventId}`);
      } else {
        router.push("/feed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
      setProcessing(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
        <h1 className="text-2xl font-bold text-red-500 mb-2">Oops!</h1>
        <p className="text-slate-400">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 text-indigo-400 hover:text-indigo-300"
        >
          Go Home
        </button>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="p-8 text-center text-slate-500">Loading invite...</div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center space-y-6">
        {/* Creator Info */}
        <div className="relative inline-block">
          {invite.creator.avatarUrl ? (
            <img
              src={invite.creator.avatarUrl}
              alt="Creator"
              className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-indigo-500 shadow-glow"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-slate-800 mx-auto flex items-center justify-center border-4 border-indigo-500">
              👻
            </div>
          )}
          <div className="absolute bottom-0 right-0 bg-indigo-500 text-white text-xs px-2 py-1 rounded-full border border-slate-900">
            INVITE
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {event
              ? `Join ${invite.creator.displayName || "a friend"} at an event`
              : `Join ${invite.creator.displayName || "a friend"} on Innit`}
          </h1>
          <p className="text-slate-400">
            {event
              ? "You've been invited to an event. Connect to RSVP and see details."
              : "You've been invited to connect directly. Join the circle to see their posts and vibes."}
          </p>
        </div>

        {/* Event Preview Card */}
        {event && (
          <div className="bg-black/30 rounded-xl p-4 border border-white/10 text-left">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex flex-col items-center justify-center text-white border border-white/10 shrink-0">
                {event.eventDate && (
                  <>
                    <span className="text-xs font-bold uppercase">
                      {new Date(event.eventDate).toLocaleString("default", {
                        month: "short",
                      })}
                    </span>
                    <span className="text-lg font-bold">
                      {new Date(event.eventDate).getDate()}
                    </span>
                  </>
                )}
              </div>
              <div>
                <h3 className="font-bold text-white line-clamp-2">
                  {event.content}
                </h3>
                {event.eventDate && (
                  <p className="text-sm text-indigo-300 mt-1">
                    {new Date(event.eventDate).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {invite.creator.bio && !event && (
          <div className="bg-slate-800/50 p-4 rounded-lg italic text-slate-300">
            "{invite.creator.bio}"
          </div>
        )}

        <button
          onClick={handleAccept}
          disabled={processing}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
        >
          {processing
            ? "Connecting..."
            : isAuthenticated
            ? "Accept & Join"
            : "Sign In / Sign Up"}
        </button>
      </div>
    </div>
  );
}

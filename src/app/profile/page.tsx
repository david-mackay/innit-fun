"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { useAppKit } from "@reown/appkit/react";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

import { useWalletAuth } from "@/hooks/useWalletAuth";
import { ImageUpload } from "@/components/ImageUpload";
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

interface Invite {
    id: string;
    code: string;
    expiresAt: string | null;
    status: string;
    createdAt: string;
}

export default function ProfilePage() {
  const { user, status } = useWalletAuth();
  const router = useRouter();
  const { open } = useAppKit();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    bio: "",
    avatarUrl: "",
  });
  
  const [activeTab, setActiveTab] = useState<"wall" | "featured">("wall");
  const [posts, setPosts] = useState<any[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadInvites();
      fetchBalance();
    }
  }, [user]);

  const fetchBalance = async () => {
    if (!user?.walletAddress) return;
    try {
      let rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
      const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

      if (!rpcUrl) {
        if (apiKey) {
          rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
        } else {
          rpcUrl = "https://api.mainnet-beta.solana.com";
        }
      } else if (
        rpcUrl.includes("helius") &&
        !rpcUrl.includes("api-key") &&
        apiKey
      ) {
        rpcUrl = `${rpcUrl}/?api-key=${apiKey}`;
      }

      const connection = new Connection(rpcUrl);
      const publicKey = new PublicKey(user.walletAddress);
      const lamports = await connection.getBalance(publicKey);
      setBalance(lamports / LAMPORTS_PER_SOL);
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    }
  };

  useEffect(() => {
      if (user?.id) {
          loadPosts();
      }
  }, [user?.id, activeTab]);

  const loadProfile = async () => {
    const res = await fetch("/api/users/profile");
    const data = await res.json();
    if (data.user) {
        setProfile(data.user);
        setFormData({
            displayName: data.user.displayName || "",
            bio: data.user.bio || "",
            avatarUrl: data.user.avatarUrl || "",
        });
    }
  };

  const loadInvites = async () => {
      const res = await fetch("/api/invites");
      const data = await res.json();
      if (data.invites) setInvites(data.invites);
  };

  const loadPosts = async () => {
      if (!user) return;
      const res = await fetch(`/api/posts/wall/${user.id}`);
      const data = await res.json();
      if (data.posts) {
          setPosts(data.posts);
      }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.user) {
        setProfile(data.user);
        setIsEditing(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateInvite = async () => {
    try {
      const res = await fetch("/api/invites", { method: "POST" });
      const data = await res.json();
      if (data.invite) {
        setInvites([data.invite, ...invites]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const revokeInvite = async (code: string) => {
      try {
          await fetch(`/api/invites/${code}`, { method: "DELETE" });
          setInvites(invites.filter(i => i.code !== code));
      } catch (err) {
          console.error(err);
      }
  };

  if (status === "checking" || !profile) {
    return <div className="p-8 text-center text-slate-500">Loading profile...</div>;
  }

  const wallPosts = posts.filter(p => p.targetUserId === user!.id && !p.isFeatured); 
  
  const visiblePosts = activeTab === "featured" 
    ? posts.filter(p => p.isFeatured)
    : posts.filter(p => p.targetUserId === user!.id || (!p.targetUserId && p.userId === user!.id && !p.isFeatured)); 

  return (
    <div className="max-w-xl mx-auto pb-24 px-4 pt-6">
      
      {/* Profile Header */}
      <div className="bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-800 mb-8 text-center relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-pink-500/20 to-indigo-500/20 blur-xl"></div>
         
         <div className="relative z-10">
            {!isEditing ? (
                <>
                    <div className="inline-block relative mb-4">
                        {profile.avatarUrl ? (
                            <img src={profile.avatarUrl} className="w-28 h-28 rounded-full object-cover border-4 border-slate-800 shadow-2xl" />
                        ) : (
                            <div className="w-28 h-28 rounded-full bg-slate-800 flex items-center justify-center text-4xl border-4 border-slate-700">👻</div>
                        )}
                         <button 
                            onClick={() => setIsEditing(true)}
                            className="absolute bottom-0 right-0 bg-slate-700 p-2 rounded-full text-white hover:bg-indigo-500 transition-colors shadow-lg"
                        >
                            ✏️
                        </button>
                    </div>
                    
                    <h1 className="text-2xl font-bold text-white mb-1">{profile.displayName || "Anonymous"}</h1>
                    <p className="text-xs text-slate-500 font-mono mb-2">
                      {profile.walletAddress.slice(0, 6)}...
                      {profile.walletAddress.slice(-4)}
                    </p>

                    <div className="flex items-center justify-center gap-4 mb-4">
                      {balance !== null && (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-full px-4 py-1 text-sm font-bold text-yellow-400">
                          {balance.toFixed(4)} SOL
                        </div>
                      )}
                      <button
                        onClick={() => open()}
                        className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs px-3 py-1.5 rounded-full font-bold border border-indigo-500/30 transition-colors"
                      >
                        Manage Wallet
                      </button>
                    </div>

                    {profile.bio && (
                        <p className="text-slate-300 italic max-w-sm mx-auto text-sm leading-relaxed">
                            "{profile.bio}"
                        </p>
                    )}
                </>
            ) : (
                <div className="space-y-4 text-left animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-center mb-4">
                        <ImageUpload 
                            onUpload={(url) => setFormData(prev => ({ ...prev, avatarUrl: url }))}
                            label="Change Photo"
                        />
                    </div>
                    <input
                        type="text"
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Display Name"
                    />
                    <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 h-24"
                        placeholder="Your bio..."
                    />
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setIsEditing(false)} className="text-slate-400 px-4 py-2">Cancel</button>
                        <button onClick={handleUpdate} disabled={loading} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold">
                            {loading ? "Saving..." : "Save"}
                        </button>
                    </div>
                </div>
            )}
         </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 mb-6">
          <button 
            onClick={() => setActiveTab("wall")}
            className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wide transition-colors ${activeTab === "wall" ? "text-indigo-400 border-b-2 border-indigo-400" : "text-slate-500 hover:text-slate-300"}`}
          >
              Wall
          </button>
          <button 
             onClick={() => setActiveTab("featured")}
             className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wide transition-colors ${activeTab === "featured" ? "text-yellow-400 border-b-2 border-yellow-400" : "text-slate-500 hover:text-slate-300"}`}
          >
              Featured ★
          </button>
      </div>

      {/* Content */}
      <div className="space-y-6">
          {activeTab === "wall" && (
             <div className="mb-8">
                 <PostComposer onPostCreated={(p) => setPosts([p, ...posts])} targetUserId={user?.id} />
             </div>
          )}

          {visiblePosts.length === 0 ? (
              <div className="text-center py-10 text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                  <p className="text-lg mb-2">{activeTab === "featured" ? "★" : "📝"}</p>
                  <p>Nothing here yet.</p>
              </div>
          ) : (
              visiblePosts.map(post => (
                  <PostCard key={post.id} post={post} currentUserId={user?.id} />
              ))
          )}
      </div>

      {/* Invites Section (Bottom) */}
      <div className="mt-12 pt-8 border-t border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Manage Invites</h3>
            <button 
                onClick={generateInvite}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-full font-bold"
            >
                + Create New
            </button>
          </div>
          
          <div className="space-y-3">
              {invites.length === 0 ? (
                  <p className="text-slate-500 text-sm">No active invites.</p>
              ) : (
                  invites.map(invite => (
                      <div key={invite.id} className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-800">
                          <div>
                            <code className="text-indigo-400 font-mono text-sm">{invite.code}</code>
                            <p className="text-[10px] text-slate-500 mt-1">
                                {invite.expiresAt ? `Expires ${formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })}` : "Never expires"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                             <button 
                                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/invite/${invite.code}`)}
                                className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded"
                             >
                                 Copy
                             </button>
                             <button 
                                onClick={() => revokeInvite(invite.code)}
                                className="text-red-400 hover:text-red-300 text-xs px-2 py-1 bg-slate-800 rounded"
                             >
                                 Revoke
                             </button>
                          </div>
                      </div>
                  ))
              )}
          </div>
      </div>
      
      <BottomNav />
    </div>
  );
}

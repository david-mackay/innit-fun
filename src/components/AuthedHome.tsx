"use client";

import { useRouter } from "next/navigation";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import Link from "next/link";

import { reownAppKit } from "@/context/appkit";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { Feed } from "@/components/Feed";
import { BottomNav } from "@/components/BottomNav";

export function AuthedHome() {
  const router = useRouter();
  const walletAuth = useWalletAuth();
  const { open } = useAppKit();
  const account = useAppKitAccount();

  const handleDisconnect = async () => {
    // Clear app session + disconnect the underlying Reown connection.
    await walletAuth.logout();
    await reownAppKit.disconnect("solana").catch(() => {});
    router.replace("/auth");
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 pb-20">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 to-indigo-500 bg-clip-text text-transparent">
          Innit
        </h1>
        <div className="flex items-center gap-3">
          <button
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs hover:bg-red-900/50 hover:text-red-400 transition-colors"
            onClick={handleDisconnect}
            title="Disconnect"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="px-4 py-6">
        <Feed />
      </div>

      <BottomNav />
    </div>
  );
}

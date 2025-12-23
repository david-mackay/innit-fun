"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppKitAccount } from "@reown/appkit/react";

import { useWalletAuth } from "@/hooks/useWalletAuth";
import { CustomConnectModal } from "@/components/auth/CustomConnectModal";

export default function AuthPage() {
  const router = useRouter();
  const walletAuth = useWalletAuth();
  const { isConnected } = useAppKitAccount();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (walletAuth.status === "authenticated") {
      router.replace("/");
    }
  }, [walletAuth.status, router]);

  const isLoading =
    walletAuth.status === "checking" || walletAuth.status === "authenticating";

  const handleSignIn = () => {
    if (!isConnected) {
      setShowModal(true);
    } else if (walletAuth.status === "unauthenticated") {
      walletAuth.authenticate();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 rounded-lg space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Welcome to Innit</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            The social layer. Connect to continue.
          </p>
        </div>

        {walletAuth.error && (
          <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-200">
            {walletAuth.error}
          </div>
        )}

        <button
          onClick={handleSignIn}
          className="w-full px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? "Connecting…" : "Connect / Sign Up"}
        </button>

        <p className="text-xs text-zinc-500 dark:text-zinc-500 text-center">
          By connecting, you agree to our Terms of Service.
        </p>
      </div>

      <CustomConnectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}


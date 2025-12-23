"use client";

import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { useEffect, useState } from "react";

export function CustomConnectModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { open } = useAppKit();
  const { isConnected } = useAppKitAccount();
  const [activeTab, setActiveTab] = useState<"social" | "wallet">("social");

  // Close custom modal if connected
  useEffect(() => {
    if (isConnected) {
      onClose();
    }
  }, [isConnected, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className="w-full max-w-sm bg-[#0a0a0a] border border-slate-800/60 rounded-[2rem] shadow-[0_0_50px_rgba(99,102,241,0.1)] overflow-hidden relative animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Neon Glow Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-indigo-500 rounded-b-full shadow-[0_0_20px_rgba(99,102,241,0.5)]" />

        {/* Header */}
        <div className="p-8 pb-4 text-center">
          <h2 className="text-2xl font-bold bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent mb-2">
            Innit
          </h2>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
            Social Layer
          </p>
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-slate-600 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-1 mx-6 mb-6 bg-slate-900/50 rounded-xl border border-slate-800/50">
          <button
            onClick={() => setActiveTab("social")}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${
              activeTab === "social"
                ? "bg-slate-800 text-white shadow-lg"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Social
          </button>
          <button
            onClick={() => setActiveTab("wallet")}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${
              activeTab === "wallet"
                ? "bg-slate-800 text-white shadow-lg"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Wallet
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-8 space-y-3 min-h-[200px]">
          {activeTab === "social" ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
              <button
                onClick={() => open({ view: "Connect" })}
                className="w-full group relative overflow-hidden bg-white text-black font-bold py-3.5 rounded-xl hover:scale-[1.02] transition-all duration-200"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <div className="flex items-center justify-center gap-3">
                  <span className="text-lg">✉️</span>
                  <span>Email</span>
                </div>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => open({ view: "Connect" })}
                  className="bg-slate-900/50 border border-slate-800 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 hover:border-slate-700"
                >
                  <span className="text-lg">G</span> Google
                </button>
                <button
                  onClick={() => open({ view: "Connect" })}
                  className="bg-slate-900/50 border border-slate-800 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 hover:border-slate-700"
                >
                  <span className="text-lg"></span> Apple
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-300">
              <button
                onClick={handleConnectWallet}
                className="w-full bg-gradient-to-r from-[#9945FF] to-[#14F195] p-[1px] rounded-xl group hover:scale-[1.02] transition-transform duration-200"
              >
                <div className="bg-slate-950 rounded-xl py-3.5 px-4 flex items-center justify-center gap-3 group-hover:bg-slate-900/90 transition-colors h-full">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/en/b/b9/Solana_logo.png"
                    className="w-5 h-5"
                    alt="Solana"
                  />
                  <span className="font-bold text-white">Connect Wallet</span>
                </div>
              </button>
              
              <div className="pt-2 text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">
                  Supported Wallets
                </p>
                <div className="flex justify-center gap-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                  {/* Visual-only icons for vibe */}
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px]">P</div>
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-[10px]">S</div>
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px]">B</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/50 bg-slate-950/30">
          <p className="text-[10px] text-center text-slate-600">
            Secure connection powered by Reown
          </p>
        </div>
      </div>
    </div>
  );
}


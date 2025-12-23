"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { BottomNav } from "@/components/BottomNav";
import { ImageUpload } from "@/components/ImageUpload";
import { formatDistanceToNow } from "date-fns";
import { useAppKitProvider } from "@reown/appkit/react";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

interface Message {
  id: string;
  senderId: string;
  content?: string;
  type: "text" | "image" | "payment";
  mediaUrl?: string;
  amount?: string;
  createdAt: string;
}

export default function ChatPage() {
  const { id: otherUserId } = useParams();
  const { user } = useWalletAuth();
  const router = useRouter();
  const { walletProvider } = useAppKitProvider("solana");

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);

  // Payment State
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [paying, setPaying] = useState(false);

  // Menu State
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Other User
  useEffect(() => {
    fetch(`/api/users/${otherUserId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setOtherUser(data.user);
      });

    // Mark as read
    if (user) {
      fetch("/api/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: otherUserId }),
      }).catch(console.error);
    }
  }, [otherUserId, user]);

  // Poll Messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages/${otherUserId}`);
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchMessages();
  }, [otherUserId]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (
    type: "text" | "image" | "payment",
    content?: string,
    mediaUrl?: string,
    amount?: string,
    txHash?: string
  ) => {
    if (!user) return;
    setSending(true);
    setShowMenu(false); // Close menu if open

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: otherUserId,
          content: content || (type === "payment" ? `Sent ${amount} SOL` : ""),
          type,
          mediaUrl,
          amount,
          transactionHash: txHash,
        }),
      });
      setInputText("");
      // Refetch immediately
      const res = await fetch(`/api/messages/${otherUserId}`);
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleSendSOL = async () => {
    if (!walletProvider || !user || !otherUser || !payAmount) return;
    setPaying(true);

    try {
      // Use configured RPC URL (likely Helius) or fallback to public mainnet
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

      const fromPubkey = new PublicKey(user.walletAddress);
      const toPubkey = new PublicKey(otherUser.walletAddress);
      const lamports = parseFloat(payAmount) * LAMPORTS_PER_SOL;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );

      transaction.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;
      transaction.feePayer = fromPubkey;

      // @ts-ignore - Reown provider types might be loose
      const signedTx = await walletProvider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(
        signedTx.serialize()
      );

      await connection.confirmTransaction(signature, "processed");

      await handleSend("payment", undefined, undefined, payAmount, signature);
      setShowPayModal(false);
      setPayAmount("");
    } catch (err) {
      console.error("Payment failed", err);
      alert(
        "Payment failed: " + (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-slate-100 pb-20">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-xl">
          ←
        </button>
        {otherUser && (
          <div className="flex items-center gap-3">
            <img
              src={
                otherUser.avatarUrl ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.id}`
              }
              className="w-10 h-10 rounded-full bg-slate-800"
            />
            <div>
              <h2 className="font-bold text-sm">{otherUser.displayName}</h2>
              <p className="text-[10px] text-slate-500 font-mono">
                {otherUser.walletAddress.slice(0, 4)}...
                {otherUser.walletAddress.slice(-4)}
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl p-3 ${
                  isMe
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-slate-800 text-slate-200 rounded-bl-sm"
                }`}
              >
                {msg.type === "text" && <p>{msg.content}</p>}
                {msg.type === "image" && (
                  <img
                    src={msg.mediaUrl}
                    className="rounded-lg max-h-48 object-cover"
                  />
                )}
                {msg.type === "payment" && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 text-black p-4 rounded-xl shadow-lg border-2 border-yellow-200 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out skew-x-12" />
                      <div className="bg-black/10 p-2 rounded-full backdrop-blur-sm">
                        <span className="text-2xl">💎</span>
                      </div>
                      <div>
                        <p className="font-bold text-lg leading-tight">
                          {msg.amount} SOL
                        </p>
                        <p className="text-[10px] font-bold opacity-70 uppercase tracking-wider">
                          Sent with Innit
                        </p>
                      </div>
                    </div>
                    <a
                      href={`https://solscan.io/tx/${
                        (msg as any).transactionHash
                      }`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-center opacity-50 hover:opacity-100 transition-opacity flex items-center justify-center gap-1"
                    >
                      <span>View on Solscan</span>
                      <span>↗</span>
                    </a>
                  </div>
                )}
                <p
                  className={`text-[10px] mt-1 text-right ${
                    isMe ? "text-indigo-200" : "text-slate-500"
                  }`}
                >
                  {formatDistanceToNow(new Date(msg.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 items-center relative">
        {/* Plus Menu Button */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all text-xl"
          >
            {showMenu ? "✕" : "+"}
          </button>

          {showMenu && (
            <div className="absolute bottom-12 left-0 bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-2 flex flex-col gap-1 w-40 animate-in slide-in-from-bottom-2 fade-in duration-200">
              <button
                onClick={() => {
                  setShowPayModal(true);
                  setShowMenu(false);
                }}
                className="flex items-center gap-3 p-2 hover:bg-slate-700 rounded-lg text-left text-sm text-white"
              >
                <span className="text-lg">💸</span> Send SOL
              </button>

              <div className="relative">
                <div className="absolute inset-0 opacity-0 w-full h-full overflow-hidden cursor-pointer z-10">
                  <ImageUpload
                    onUpload={(url) => handleSend("image", undefined, url)}
                    label="."
                    className="!flex-row w-full h-full"
                  />
                </div>
                <button className="flex items-center gap-3 p-2 hover:bg-slate-700 rounded-lg text-left text-sm text-white w-full">
                  <span className="text-lg">📷</span> Send Image
                </button>
              </div>
            </div>
          )}
        </div>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend("text", inputText)}
          placeholder="Message..."
          className="flex-1 bg-slate-800 rounded-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
        />
        <button
          onClick={() => handleSend("text", inputText)}
          disabled={!inputText.trim() || sending}
          className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white disabled:opacity-50 hover:bg-indigo-500 transition-colors"
        >
          ➤
        </button>
      </div>

      {/* Pay Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-xs text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-white">Send SOL</h3>
            <div className="relative">
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full bg-black/50 border border-slate-600 rounded-lg p-3 text-center text-2xl text-white focus:outline-none focus:border-yellow-400"
                placeholder="0.00"
                autoFocus
              />
              <span className="absolute right-4 top-4 text-slate-500 font-bold">
                SOL
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPayModal(false)}
                className="flex-1 py-3 rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSendSOL}
                disabled={paying || !payAmount}
                className="flex-1 py-3 rounded-lg bg-yellow-500 text-black font-bold disabled:opacity-50 hover:bg-yellow-400"
              >
                {paying ? "Signing..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

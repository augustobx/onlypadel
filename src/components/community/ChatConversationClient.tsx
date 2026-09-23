"use client";

import { useState, useRef, useEffect } from "react";
import { sendMessage, getMessages } from "@/actions/community-chat";
import { ArrowLeft, SendHorizonal, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Message = {
  id: string;
  content: string;
  type: string;
  createdAt: Date;
  sender: {
    id: string;
    name: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  isMe: boolean;
};

type ConversationInfo = {
  id: string;
  type: string;
  name: string | null;
  imageUrl: string | null;
  participants: {
    id: string;
    name: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    role: string;
  }[];
};

export default function ChatConversationClient({
  conversationId,
  conversationInfo,
  initialMessages,
  initialCursor,
  currentUserId,
}: {
  conversationId: string;
  conversationInfo: ConversationInfo;
  initialMessages: Message[];
  initialCursor: string | null;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isGroup = conversationInfo.type === "GROUP";
  const initial = (conversationInfo.name || "?")[0].toUpperCase();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Poll for new messages (SSE fallback)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const result = await getMessages(conversationId);
        if (result.success && result.messages) {
          setMessages(result.messages);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [conversationId]);

  const handleSend = async () => {
    if (!content.trim() || isSending) return;
    const text = content.trim();
    setContent("");
    setSendError(null);
    setIsSending(true);

    const tempId = `temp-${Date.now()}`;
    // Optimistic message
    const optimistic: Message = {
      id: tempId,
      content: text,
      type: "TEXT",
      createdAt: new Date(),
      sender: {
        id: currentUserId,
        name: "Vos",
        lastName: null,
        avatarUrl: null,
      },
      isMe: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const formData = new FormData();
      formData.set("content", text);

      const result = await sendMessage(conversationId, formData);
      if (result.success && result.message) {
        // Replace optimistic with real
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? result.message! : m))
        );
      } else {
        // Rollback optimistic message & restore content
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setContent(text);
        setSendError(result.error || "No se pudo enviar el mensaje.");
      }
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setContent(text);
      setSendError(err?.message || "Error de conexión al enviar el mensaje.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] -mx-4 -my-4">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60">
        <Link
          href="/comunidad/chat"
          className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </Link>

        <div
          className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-xs shadow-md bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)]`}
        >
          {isGroup ? <Users className="w-4 h-4" /> : initial}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
            {conversationInfo.name || "Chat"}
          </h3>
          {isGroup && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {conversationInfo.participants.length} miembros
            </p>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">👋</div>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              ¡Enviá el primer mensaje!
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const showSender =
                isGroup &&
                !msg.isMe &&
                (i === 0 || messages[i - 1]?.sender.id !== msg.sender.id);

              return (
                <div
                  key={msg.id}
                  className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] ${msg.isMe ? "items-end" : "items-start"}`}
                  >
                    {showSender && (
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 ml-3 mb-0.5 block">
                        {`${msg.sender.name || ""} ${msg.sender.lastName || ""}`.trim()}
                      </span>
                    )}
                    <div
                      className={`
                        px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm
                        ${
                          msg.isMe
                            ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white rounded-br-md shadow-sm"
                            : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-md"
                        }
                      `}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <span
                        className={`text-[9px] mt-1 block text-right ${
                          msg.isMe
                            ? "text-white/60"
                            : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        {format(new Date(msg.createdAt), "HH:mm", { locale: es })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error alert if message failed */}
      {sendError && (
        <div className="px-4 py-2 bg-rose-500/10 border-t border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-between">
          <span>{sendError}</span>
          <button
            onClick={() => setSendError(null)}
            className="text-rose-500 hover:underline text-[11px] ml-2 font-bold"
          >
            Entendido
          </button>
        </div>
      )}

      {/* Message input */}
      <div className="px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Escribí un mensaje..."
            maxLength={2000}
            disabled={isSending}
            className="flex-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-full px-5 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all disabled:opacity-60"
          />
          <button
            onClick={handleSend}
            disabled={!content.trim() || isSending}
            className="p-3 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white shadow-lg shadow-[var(--color-primary)]/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 hover:brightness-105"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <SendHorizonal className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

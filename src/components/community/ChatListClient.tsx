"use client";

import Link from "next/link";
import { MessageCircle, Users, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type Conversation = {
  id: string;
  type: string;
  name: string | null;
  imageUrl: string | null;
  participants: {
    id: string;
    name: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  }[];
  lastMessage: {
    content: string;
    senderName: string | null;
    createdAt: Date;
    isMe: boolean;
  } | null;
  unreadCount: number;
  updatedAt: Date;
};

export default function ChatListClient({
  conversations,
}: {
  conversations: Conversation[];
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-violet-500" />
          Mensajes
        </h2>
        {/* Future: New group button */}
        {/*
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 text-xs font-bold hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-all">
          <Plus className="w-3.5 h-3.5" />
          Nuevo grupo
        </button>
        */}
      </div>

      {/* Conversation list */}
      {conversations.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">💬</div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">
            Sin mensajes aún
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Buscá jugadores y enviales un mensaje para empezar a chatear
          </p>
          <Link
            href="/comunidad/jugadores"
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold shadow-md shadow-violet-500/20 transition-all hover:from-violet-500 hover:to-fuchsia-500 active:scale-95"
          >
            <Users className="w-4 h-4" />
            Buscar jugadores
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <ConversationCard key={conv.id} conversation={conv} />
          ))}
        </div>
      )}
    </div>
  );
}

function ConversationCard({ conversation }: { conversation: Conversation }) {
  const isGroup = conversation.type === "GROUP";
  const initial = (conversation.name || "?")[0].toUpperCase();

  return (
    <Link
      href={`/comunidad/chat/${conversation.id}`}
      className="block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm p-4 transition-all hover:shadow-md hover:border-violet-200 dark:hover:border-violet-800 active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold shadow-md ${
            isGroup
              ? "bg-gradient-to-br from-fuchsia-500 to-pink-500"
              : "bg-gradient-to-br from-violet-500 to-indigo-500"
          }`}
        >
          {isGroup ? (
            <Users className="w-5 h-5" />
          ) : (
            initial
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
              {conversation.name || "Chat"}
            </span>
            {conversation.lastMessage && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0 ml-2">
                {formatDistanceToNow(new Date(conversation.lastMessage.createdAt), {
                  addSuffix: false,
                  locale: es,
                })}
              </span>
            )}
          </div>

          {conversation.lastMessage ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {conversation.lastMessage.isMe ? (
                <span className="text-slate-400 dark:text-slate-500">Vos: </span>
              ) : isGroup && conversation.lastMessage.senderName ? (
                <span className="text-slate-400 dark:text-slate-500">
                  {conversation.lastMessage.senderName}:{" "}
                </span>
              ) : null}
              {conversation.lastMessage.content}
            </p>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">
              Sin mensajes
            </p>
          )}
        </div>

        {/* Unread badge */}
        {conversation.unreadCount > 0 && (
          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] font-bold text-white">
              {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

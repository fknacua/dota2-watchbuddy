import type { Message } from "@/lib/types";

const STORAGE_KEY = "dota-watchbuddy:chats";

export interface StoredChat {
  id: string;
  title: string;
  updatedAt: string;
  messages: Message[];
}

type StoredChats = Record<string, StoredChat>;

function readAll(): StoredChats {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as StoredChats;
  } catch {
    return {};
  }
}

function writeAll(chats: StoredChats) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

export function loadChats(): StoredChat[] {
  return Object.values(readAll()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function loadChat(chatId: string): StoredChat | undefined {
  return readAll()[chatId];
}

export function createChat(): StoredChat {
  const chats = readAll();
  const chat: StoredChat = {
    id: crypto.randomUUID(),
    title: "New chat",
    updatedAt: new Date().toISOString(),
    messages: [],
  };
  chats[chat.id] = chat;
  writeAll(chats);
  return chat;
}

export function appendMessages(chatId: string, newMessages: Message[]): StoredChat {
  const chats = readAll();
  const existing = chats[chatId];
  const chat: StoredChat = {
    id: chatId,
    title: existing?.title ?? "New chat",
    messages: [...(existing?.messages ?? []), ...newMessages],
    updatedAt: new Date().toISOString(),
  };
  chats[chatId] = chat;
  writeAll(chats);
  return chat;
}

export function patchTitle(chatId: string, title: string): StoredChat | undefined {
  const chats = readAll();
  const existing = chats[chatId];
  if (!existing) return undefined;
  const chat = { ...existing, title };
  chats[chatId] = chat;
  writeAll(chats);
  return chat;
}

export function deleteChat(chatId: string): void {
  const chats = readAll();
  delete chats[chatId];
  writeAll(chats);
}

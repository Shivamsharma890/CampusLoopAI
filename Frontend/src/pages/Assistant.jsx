import { useEffect, useRef, useState } from "react";
import {
  Bot,
  BookOpen,
  Compass,
  Lightbulb,
  Send,
  Sparkles,
  UserRound,
  PackageSearch,
  RotateCcw,
  ShieldCheck,
  LoaderCircle,
  MessageSquare,
  ArrowUpRight,
  Trash2,
  CheckCircle2,
  X,
} from "lucide-react";

import { endpoints } from "../services/api.js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const prompts = [
  {
    title: "Find an item",
    description: "Search for something you need on campus.",
    message: "Find items available for borrowing on campus.",
    icon: Compass,
  },
  {
    title: "My borrowing",
    description: "Understand your borrowing requests and status.",
    message: "Show me my borrowing requests and their status.",
    icon: BookOpen,
  },
  {
    title: "Campus guidelines",
    description: "Learn how borrowing and returning works.",
    message: "Explain how CampusLoop borrowing and returning works.",
    icon: Lightbulb,
  },
];

const formatIntent = (intent) => {
  if (!intent) return "";

  return String(intent)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

function ItemResults({ items, onSelect, selectedItemId }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {items.map((item, index) => {
        const isSelected = Number(selectedItemId) === Number(item.id);

        return (
          <button
            type="button"
            key={item.id ?? index}
            onClick={() => onSelect(item)}
            disabled={!item.id}
            className={`overflow-hidden rounded-2xl border bg-white text-left transition ${
              isSelected
                ? "border-indigo-500 ring-2 ring-indigo-100"
                : "border-slate-200 hover:border-indigo-300 hover:shadow-md"
            } disabled:cursor-default`}
          >
            {item.image_url ? (
              <div className="h-36 overflow-hidden bg-slate-100">
                <img
                  src={item.image_url}
                  alt={item.name || "Campus item"}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="grid h-28 place-items-center bg-gradient-to-br from-indigo-50 to-violet-50">
                <PackageSearch size={34} className="text-indigo-400" />
              </div>
            )}

            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-bold text-slate-900">
                  {item.name || "Campus item"}
                </h4>

                {isSelected ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
                    <CheckCircle2 size={12} />
                    Selected
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                    Available
                  </span>
                )}
              </div>

              {item.description && (
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                  {item.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {item.category && (
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                    {item.category}
                  </span>
                )}

                {item.condition && (
                  <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-600">
                    {item.condition}
                  </span>
                )}
              </div>

              <p className="mt-3 text-[11px] font-semibold text-indigo-600">
                {isSelected
                  ? "This item is selected"
                  : "Click to select this item"}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MessageBubble({ message, onSelectItem, selectedItemId }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
          isUser
            ? "bg-slate-200 text-slate-700"
            : "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
        }`}
      >
        {isUser ? <UserRound size={17} /> : <Bot size={19} />}
      </div>

      <div
        className={`min-w-0 max-w-[88%] sm:max-w-[78%] ${
          isUser ? "text-right" : ""
        }`}
      >
        <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold text-slate-400">
          <span>{isUser ? "You" : "CampusLoop AI"}</span>

          {!isUser && message.intent && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-600">
              {formatIntent(message.intent)}
            </span>
          )}
        </div>

        <div
          className={`min-w-0 overflow-hidden rounded-2xl px-4 py-3.5 text-sm leading-7 ${
            isUser
              ? "rounded-tr-md bg-indigo-600 text-left text-white shadow-sm"
              : "rounded-tl-md border border-slate-200 bg-white text-left text-slate-700 shadow-sm"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="min-w-0 break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="mb-3 mt-2 text-xl font-bold text-slate-900">
                      {children}
                    </h1>
                  ),

                  h2: ({ children }) => (
                    <h2 className="mb-3 mt-4 text-lg font-bold text-slate-900">
                      {children}
                    </h2>
                  ),

                  h3: ({ children }) => (
                    <h3 className="mb-2 mt-4 text-base font-semibold text-slate-900">
                      {children}
                    </h3>
                  ),

                  p: ({ children }) => (
                    <p className="mb-3 last:mb-0">{children}</p>
                  ),

                  strong: ({ children }) => (
                    <strong className="font-semibold text-slate-900">
                      {children}
                    </strong>
                  ),

                  ul: ({ children }) => (
                    <ul className="mb-4 ml-5 list-disc space-y-1.5">
                      {children}
                    </ul>
                  ),

                  ol: ({ children }) => (
                    <ol className="mb-4 ml-5 list-decimal space-y-1.5">
                      {children}
                    </ol>
                  ),

                  li: ({ children }) => <li className="pl-1">{children}</li>,

                  table: ({ children }) => (
                    <div className="my-4 w-full max-w-full overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full min-w-[520px] border-collapse text-left text-xs sm:text-sm">
                        {children}
                      </table>
                    </div>
                  ),

                  thead: ({ children }) => (
                    <thead className="bg-slate-100 text-slate-800">
                      {children}
                    </thead>
                  ),

                  tbody: ({ children }) => (
                    <tbody className="divide-y divide-slate-100">
                      {children}
                    </tbody>
                  ),

                  tr: ({ children }) => (
                    <tr className="transition-colors hover:bg-slate-50">
                      {children}
                    </tr>
                  ),

                  th: ({ children }) => (
                    <th className="whitespace-nowrap px-3 py-3 font-semibold">
                      {children}
                    </th>
                  ),

                  td: ({ children }) => (
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                      {children}
                    </td>
                  ),

                  blockquote: ({ children }) => (
                    <blockquote className="my-3 border-l-4 border-indigo-400 bg-indigo-50/50 py-2 pl-4 text-slate-600">
                      {children}
                    </blockquote>
                  ),

                  code: ({ children }) => (
                    <code className="rounded-md bg-slate-100 px-1.5 py-1 font-mono text-xs text-indigo-700">
                      {children}
                    </code>
                  ),

                  hr: () => <hr className="my-4 border-slate-200" />,
                }}
              >
                {message.content || ""}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && (
          <ItemResults
            items={message.results}
            onSelect={onSelectItem}
            selectedItemId={selectedItemId}
          />
        )}
      </div>
    </div>
  );
}

export default function Assistant() {
  const welcomeMessage = {
    role: "assistant",
    content:
      "Hey! I'm your CampusLoop AI assistant. I can help you discover campus items, understand borrowing requests, check credits, and learn about campus sharing. What can I help you with?",
  };

  const [messages, setMessages] = useState([welcomeMessage]);

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");

  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const loadConversations = async () => {
    try {
      const data = await endpoints.conversations();

      const list = Array.isArray(data) ? data : [];

      setConversations(list);

      return list;
    } catch (err) {
      setError(err.message || "Unable to load conversations.");

      return [];
    }
  };

  const openConversation = async (id) => {
    if (busy || !id) return;

    setLoadingHistory(true);
    setError("");

    setSelectedItem(null);
    setSelectedRequestId(null);

    try {
      const data = await endpoints.conversation(id);

      setActiveConversationId(data.id);

      setMessages(
        data.messages?.length
          ? data.messages.map((message) => ({
              ...message,
              results: [],
            }))
          : [welcomeMessage],
      );
    } catch (err) {
      setError(err.message || "Unable to open conversation.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const startNewConversation = () => {
    if (busy) return;

    setActiveConversationId(null);
    setMessages([welcomeMessage]);

    setInput("");
    setError("");

    setSelectedItem(null);
    setSelectedRequestId(null);
  };

  const removeConversation = async (id) => {
    if (busy) return;

    try {
      await endpoints.deleteConversation(id);

      const remaining = conversations.filter(
        (conversation) => conversation.id !== id,
      );

      setConversations(remaining);

      if (activeConversationId === id) {
        if (remaining.length > 0) {
          await openConversation(remaining[0].id);
        } else {
          startNewConversation();
        }
      }
    } catch (err) {
      setError(err.message || "Unable to delete conversation.");
    }
  };

  useEffect(() => {
    let cancelled = false;

    const initializeAssistant = async () => {
      setLoadingHistory(true);

      try {
        const data = await endpoints.conversations();

        if (cancelled) return;

        const list = Array.isArray(data) ? data : [];

        setConversations(list);

        if (list.length > 0) {
          const latest = await endpoints.conversation(list[0].id);

          if (cancelled) return;

          setActiveConversationId(latest.id);

          setMessages(
            latest.messages?.length
              ? latest.messages.map((message) => ({
                  ...message,
                  results: [],
                }))
              : [welcomeMessage],
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load chat history.");
        }
      } finally {
        if (!cancelled) {
          setLoadingHistory(false);
        }
      }
    };

    initializeAssistant();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, busy]);

  const handleSelectItem = (item) => {
    if (!item?.id || busy) return;

    setSelectedItem(item);
    setSelectedRequestId(null);
    setError("");

    inputRef.current?.focus();
  };

  const clearSelection = () => {
    setSelectedItem(null);
    setSelectedRequestId(null);
  };

  const send = async (text = input) => {
    const message = text.trim();

    if (!message || busy) return;

    setInput("");
    setError("");

    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        content: message,
      },
    ]);

    setBusy(true);

    const selection = {
      selected_item_id: selectedItem?.id ?? null,
      selected_request_id: selectedRequestId ?? null,
    };

    try {
      const data = await endpoints.chat(
        message,
        activeConversationId,
        selection,
      );

      setActiveConversationId(data.conversation_id);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.reply || "I couldn't generate a response.",
          intent: data.intent || "",
          results: Array.isArray(data.results) ? data.results : [],
        },
      ]);

      clearSelection();

      await loadConversations();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            "I couldn't connect to the assistant right now. Please check your connection and try again.",
        },
      ]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
            <Sparkles size={14} />
            Your AI-powered campus companion
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            CampusLoop AI
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Your intelligent assistant for discovering items, managing
            borrowing, and navigating campus sharing.
          </p>
        </div>

        <button
          type="button"
          onClick={startNewConversation}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:self-center"
        >
          <RotateCcw size={14} />
          New conversation
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={17} className="text-indigo-600" />

            <h3 className="text-sm font-extrabold text-slate-900">
              Recent conversations
            </h3>
          </div>

          <span className="text-xs text-slate-400">
            {conversations.length} chats
          </span>
        </div>

        {loadingHistory ? (
          <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
            <LoaderCircle size={15} className="animate-spin" />
            Loading conversations...
          </div>
        ) : conversations.length === 0 ? (
          <p className="py-2 text-xs text-slate-400">
            Your conversations will appear here.
          </p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`flex min-w-[210px] max-w-[260px] items-center gap-2 rounded-xl border p-3 transition ${
                  activeConversationId === conversation.id
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-slate-200 bg-white hover:border-indigo-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => openConversation(conversation.id)}
                  disabled={busy}
                  className="min-w-0 flex-1 text-left disabled:opacity-50"
                >
                  <p className="truncate text-xs font-bold text-slate-800">
                    {conversation.title}
                  </p>

                  <p className="mt-1 text-[10px] text-slate-400">
                    {new Date(conversation.updated_at).toLocaleDateString()}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => removeConversation(conversation.id)}
                  disabled={busy}
                  aria-label="Delete conversation"
                  title="Delete conversation"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            <PackageSearch size={19} />
          </div>

          <div>
            <p className="text-xs font-bold text-slate-800">Item discovery</p>

            <p className="mt-1 text-[11px] text-slate-500">
              Find campus essentials
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
            <MessageSquare size={19} />
          </div>

          <div>
            <p className="text-xs font-bold text-slate-800">Smart assistance</p>

            <p className="mt-1 text-[11px] text-slate-500">
              Ask questions naturally
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <ShieldCheck size={19} />
          </div>

          <div>
            <p className="text-xs font-bold text-slate-800">
              Secure assistance
            </p>

            <p className="mt-1 text-[11px] text-slate-500">
              Account-aware responses
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200">
            <Bot size={23} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-extrabold text-slate-900">
              CampusLoop Assistant
            </h2>

            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />

              {busy ? "Processing your request..." : "Ready to help"}
            </p>
          </div>

          <span className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[10px] font-black tracking-wider text-indigo-700">
            AI ASSISTANT
          </span>
        </div>

        <div className="min-h-[420px] space-y-7 bg-slate-50/70 px-4 py-6 sm:px-7 sm:py-8">
          {loadingHistory && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
              <LoaderCircle size={17} className="animate-spin" />
              Restoring your conversation...
            </div>
          )}

          {messages.map((message, index) => (
            <MessageBubble
              key={index}
              message={message}
              onSelectItem={handleSelectItem}
              selectedItemId={selectedItem?.id}
            />
          ))}

          {busy && (
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white">
                <Bot size={19} />
              </div>

              <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <LoaderCircle
                    size={15}
                    className="animate-spin text-indigo-600"
                  />

                  <span>CampusLoop AI is thinking</span>

                  <span className="flex gap-0.5">
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce [animation-delay:150ms]">
                      .
                    </span>
                    <span className="animate-bounce [animation-delay:300ms]">
                      .
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {messages.length === 1 && (
          <div className="border-t border-slate-100 bg-white px-4 py-5 sm:px-6">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={15} className="text-indigo-600" />

              <p className="text-xs font-extrabold text-slate-700">
                Get started with a suggestion
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {prompts.map((prompt) => {
                const Icon = prompt.icon;

                return (
                  <button
                    key={prompt.title}
                    type="button"
                    onClick={() => send(prompt.message)}
                    disabled={busy}
                    className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-sm disabled:opacity-50"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-100">
                        <Icon size={17} />
                      </div>

                      <ArrowUpRight
                        size={15}
                        className="text-slate-300 transition group-hover:text-indigo-600"
                      />
                    </div>

                    <p className="text-xs font-extrabold text-slate-800">
                      {prompt.title}
                    </p>

                    <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
                      {prompt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="border-t border-slate-100 bg-white p-4 sm:p-6">
          {error && (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          {selectedItem && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-indigo-600" />

                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-indigo-500">
                    Selected item
                  </p>

                  <p className="truncate text-xs font-bold text-indigo-900">
                    {selectedItem.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={clearSelection}
                aria-label="Clear selected item"
                title="Clear selection"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-indigo-500 transition hover:bg-indigo-100 hover:text-indigo-700"
              >
                <X size={15} />
              </button>
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                placeholder="Ask anything about campus sharing..."
                maxLength={2000}
                disabled={busy || loadingHistory}
                className="max-h-32 min-h-11 flex-1 resize-y bg-transparent px-3 py-3 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={!input.trim() || busy || loadingHistory}
                aria-label="Send message"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {busy ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <Send size={17} />
                )}
              </button>
            </div>
          </form>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-[10px] text-slate-400">
              Press Enter to send · Shift + Enter for a new line
            </p>

            <p className="flex items-center gap-1 text-[10px] text-slate-400">
              <ShieldCheck size={12} />
              Secure campus assistance
            </p>
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] leading-5 text-slate-400">
        AI responses may be imperfect. Verify important borrowing and return
        details before taking action.
      </p>
    </div>
  );
}

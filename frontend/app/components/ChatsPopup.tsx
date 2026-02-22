"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import {
  Conversation,
  ConversationMessage,
  fetchConversations,
  fetchMessages,
  sendMessage,
  startDM,
  toggleMessageLike,
  refreshAccessToken,
} from "../lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface Props {
  accessToken: string;
  userId: string;
  username: string;
  onClose: () => void;
}

export default function ChatsPopup({ accessToken, userId, username, onClose }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [dmUsername, setDmUsername] = useState("");
  const [dmError, setDmError] = useState("");
  const [sendError, setSendError] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Always holds the latest valid access token (refreshed if expired)
  const tokenRef = useRef(accessToken);

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null;

  // Refresh the access token if it is expired or expiring within 60 s
  useEffect(() => {
    const tryRefresh = async () => {
      const raw = typeof window !== "undefined" ? localStorage.getItem("ottera_auth_session") : null;
      if (!raw) return;
      let session: { accessToken: string; refreshToken: string };
      try { session = JSON.parse(raw); } catch { return; }

      // Decode JWT exp without verifying signature
      try {
        const payload = JSON.parse(atob(session.accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (payload.exp > Math.floor(Date.now() / 1000) + 60) {
          tokenRef.current = session.accessToken;
          return; // Still valid
        }
      } catch { /* fall through to refresh */ }

      try {
        const tokens = await refreshAccessToken(session.refreshToken);
        const updated = { ...session, accessToken: tokens.access_token, refreshToken: tokens.refresh_token };
        localStorage.setItem("ottera_auth_session", JSON.stringify(updated));
        tokenRef.current = tokens.access_token;
      } catch { /* keep existing token */ }
    };
    tryRefresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load conversations — reads token from ref so it always uses the latest
  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchConversations(tokenRef.current);
      setConversations(data);
      return data;
    } catch {
      return [];
    }
  }, []);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (convId: string) => {
    try {
      const data = await fetchMessages(convId, tokenRef.current);
      setMessages(data);
    } catch {
      setMessages([]);
    }
  }, []);

  // Set up socket.io
  useEffect(() => {
    const socket = io(API_BASE, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("new_message", (msg: ConversationMessage) => {
      // Skip messages we sent ourselves — already shown via optimistic update
      if (msg.sender_id === userId) return;

      // Add to thread if we're viewing that conversation
      setMessages((prev) => {
        const inConv =
          (prev.length > 0 && prev[0]?.conversation_id === msg.conversation_id) ||
          activeConvId === msg.conversation_id;
        if (!inConv) return prev;
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, { ...msg, like_count: 0, liked_by_me: false }];
      });
      loadConversations();
    });

    // Update like counts in real-time for everyone in the channel
    socket.on("message_liked", ({ message_id, like_count }: { message_id: string; conversation_id: string; like_count: number }) => {
      setMessages((prev) =>
        prev.map((m) => m.id === message_id ? { ...m, like_count } : m)
      );
    });

    return () => { socket.disconnect(); };
  }, [loadConversations]); // eslint-disable-line react-hooks/exhaustive-deps

  // Join rooms when conversations load
  useEffect(() => {
    if (socketRef.current && conversations.length > 0) {
      socketRef.current.emit("join_conversations", conversations.map((c) => c.id));
    }
  }, [conversations]);

  // Auto-open DM from clothing page event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.username) handleStartDM(detail.username);
    };
    window.addEventListener("ottera:open_dm", handler);

    const pending = sessionStorage.getItem("ottera_open_dm");
    if (pending) {
      sessionStorage.removeItem("ottera_open_dm");
      handleStartDM(pending);
    }
    return () => window.removeEventListener("ottera:open_dm", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeConvId) loadMessages(activeConvId);
  }, [activeConvId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectConv = (convId: string) => {
    setActiveConvId(convId);
    setSendError("");
  };

  const handleStartDM = async (targetUsername?: string) => {
    const uname = (targetUsername || dmUsername).trim();
    if (!uname) return;
    if (uname === username) { setDmError("You can't message yourself."); return; }
    setDmError("");
    try {
      const conv = await startDM(uname, tokenRef.current);
      await loadConversations();
      setActiveConvId(conv.id);
      setDmUsername("");
      socketRef.current?.emit("join_conversations", [conv.id]);
    } catch (e: unknown) {
      setDmError(e instanceof Error ? e.message : "User not found");
    }
  };

  const handleSend = async () => {
    if (!newMsg.trim() || !activeConvId) return;
    setSendError("");

    const optimistic: ConversationMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConvId,
      sender_id: userId,
      sender_username: username,
      content: newMsg.trim(),
      created_at: new Date().toISOString(),
      like_count: 0,
      liked_by_me: false,
    };
    setMessages((prev) => [...prev, optimistic]);
    const content = newMsg.trim();
    setNewMsg("");

    try {
      const real = await sendMessage(activeConvId, content, tokenRef.current);
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? { ...real, like_count: 0, liked_by_me: false } : m))
      );
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : "Failed to send");
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
  };

  const handleLike = async (msg: ConversationMessage) => {
    // Optimistic toggle
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msg.id) return m;
        const wasLiked = m.liked_by_me ?? false;
        return {
          ...m,
          liked_by_me: !wasLiked,
          like_count: (m.like_count ?? 0) + (wasLiked ? -1 : 1),
        };
      })
    );
    try {
      const { liked, like_count } = await toggleMessageLike(msg.id, tokenRef.current);
      setMessages((prev) =>
        prev.map((m) => m.id === msg.id ? { ...m, liked_by_me: liked, like_count } : m)
      );
    } catch {
      // Revert optimistic on failure
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msg.id) return m;
          const wasLiked = m.liked_by_me ?? false;
          return {
            ...m,
            liked_by_me: !wasLiked,
            like_count: (m.like_count ?? 0) + (wasLiked ? -1 : 1),
          };
        })
      );
    }
  };

  const convLabel = (conv: Conversation) => {
    if (conv.type === "channel") return conv.nonprofits?.name || "Channel";
    if (conv.otherFirstName && conv.otherUsername) return `${conv.otherFirstName} (@${conv.otherUsername})`;
    if (conv.otherUsername) return `@${conv.otherUsername}`;
    return "Direct Message";
  };

  const convIcon = (conv: Conversation) => {
    if (conv.type === "channel") return "📢";
    return "💬";
  };

  return (
    <div className="chats-popup" role="dialog" aria-label="Chats">
      <div className="chats-popup-header">
        <span className="chats-popup-title">🔔 Chats</span>
        <button className="chats-close-btn" onClick={onClose} aria-label="Close chats">&#x2715;</button>
      </div>

      <div className="chats-body">
        {/* Left: conversation list */}
        <div className="chats-list">
          <div className="chats-new-dm">
            <input
              ref={inputRef}
              className="chats-dm-input"
              type="text"
              placeholder="Message a user…"
              value={dmUsername}
              onChange={(e) => setDmUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStartDM()}
            />
            <button className="chats-dm-btn" onClick={() => handleStartDM()}>Go</button>
          </div>
          {dmError && <p className="form-error" style={{ fontSize: "0.75rem", margin: "0.25rem 0.5rem" }}>{dmError}</p>}

          <div className="chats-conv-list">
            {conversations.length === 0 && (
              <p className="chats-empty">No conversations yet. Subscribe to nonprofits or message a user to get started.</p>
            )}
            {conversations.map((conv) => (
              <button
                key={conv.id}
                className={`chats-conv-item${activeConvId === conv.id ? " active" : ""}`}
                onClick={() => handleSelectConv(conv.id)}
              >
                <span className="chats-conv-icon">{convIcon(conv)}</span>
                <div className="chats-conv-info">
                  <span className="chats-conv-name">{convLabel(conv)}</span>
                  {conv.lastMessage && (
                    <span className="chats-conv-preview">
                      {conv.lastMessage.sender_username === username ? "You: " : ""}
                      {conv.lastMessage.content.slice(0, 40)}
                      {conv.lastMessage.content.length > 40 ? "…" : ""}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: message thread */}
        <div className="chats-thread">
          {!activeConv ? (
            <div className="chats-thread-empty">
              <p>Select a conversation or start a new one.</p>
            </div>
          ) : (
            <>
              <div className="chats-thread-header">
                <span>{convIcon(activeConv)} {convLabel(activeConv)}</span>
                {activeConv.type === "channel" && (
                  <span className="chats-channel-badge">Channel</span>
                )}
              </div>
              <div className="chats-messages">
                {messages.length === 0 && (
                  <p className="chats-empty" style={{ padding: "1rem" }}>No messages yet. Say hello!</p>
                )}
                {messages.map((msg) => {
                  const isMe = msg.sender_id === userId || msg.sender_username === username;
                  const isChannel = activeConv.type === "channel";
                  const likeCount = msg.like_count ?? 0;
                  const likedByMe = msg.liked_by_me ?? false;
                  return (
                    <div key={msg.id} className={`chat-message${isMe ? " mine" : " theirs"}`}>
                      {!isMe && (
                        <span className="chat-sender">@{msg.sender_username}</span>
                      )}
                      <div className="chat-bubble">{msg.content}</div>
                      <div className="chat-message-footer">
                        <span className="chat-time">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {isChannel && !msg.id.startsWith("temp-") && (
                          <button
                            className={`chat-like-btn${likedByMe ? " liked" : ""}`}
                            onClick={() => handleLike(msg)}
                            aria-label={likedByMe ? "Unlike" : "Like"}
                            title={likedByMe ? "Unlike" : "Like"}
                          >
                            👍{likeCount > 0 && <span className="chat-like-count">{likeCount}</span>}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="chats-input-row">
                <input
                  className="chats-msg-input"
                  type="text"
                  placeholder="Type a message…"
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <button className="btn solid chats-send-btn" onClick={handleSend} disabled={!newMsg.trim()}>
                  Send
                </button>
              </div>
              {sendError && <p className="form-error" style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}>{sendError}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

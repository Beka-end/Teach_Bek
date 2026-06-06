import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase.js";
import Auth from "./Auth.jsx";
import Legal from "./Legal.jsx";

const DAILY_LIMIT = 20; // free messages per day

const startOfTodayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const formatTime = (date) =>
  new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const formatDate = (date) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

function parseMessage(text) {
  const parts = text.split(/(📝 Corrections:)/);
  if (parts.length < 2) return { main: text, corrections: null };
  return {
    main: parts[0].trim(),
    corrections: parts.slice(1).join("").replace("📝 Corrections:", "").trim(),
  };
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "12px 16px" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  const { main, corrections } = isUser ? { main: msg.content, corrections: null } : parseMessage(msg.content);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", marginBottom: 20 }}>
      {!isUser && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #4ade80, #22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#0a0f0a" }}>T</div>
          <span style={{ fontSize: 12, color: "#6b7280", fontFamily: "'Space Mono', monospace" }}>TeachBek</span>
        </div>
      )}
      <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ background: isUser ? "linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)" : "rgba(255,255,255,0.05)", border: isUser ? "none" : "1px solid rgba(255,255,255,0.08)", borderRadius: isUser ? "20px 20px 4px 20px" : "4px 20px 20px 20px", padding: "12px 18px", color: isUser ? "#0a0f0a" : "#e2e8f0", fontSize: 15, lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif", fontWeight: isUser ? 500 : 400, boxShadow: isUser ? "0 4px 20px rgba(74,222,128,0.3)" : "none", whiteSpace: "pre-wrap" }}>
          {main}
        </div>
        {corrections && (
          <div style={{ background: "rgba(250,204,21,0.06)", border: "1px solid rgba(250,204,21,0.2)", borderRadius: "12px", padding: "12px 16px", fontSize: 13.5, lineHeight: 1.7, color: "#fde68a", fontFamily: "'Space Mono', monospace", whiteSpace: "pre-wrap" }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: "#fbbf24", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>📝 Corrections</div>
            {corrections}
          </div>
        )}
      </div>
      <span style={{ fontSize: 11, color: "#4b5563", marginTop: 4, fontFamily: "'Space Mono', monospace" }}>
        {formatTime(msg.created_at || Date.now())}
      </span>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [usedToday, setUsedToday] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [topicLoading, setTopicLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  useEffect(() => { if (userId) { loadChats(); loadUsage(); } }, [userId]);
  useEffect(() => { if (activeChatId) loadMessages(activeChatId); }, [activeChatId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const loadUsage = async () => {
    // Get user's chat ids, then count today's user messages in them
    const { data: userChats } = await supabase
      .from("chats").select("id").eq("user_id", userId);
    const ids = (userChats || []).map((c) => c.id);
    if (ids.length === 0) { setUsedToday(0); return; }
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("role", "user")
      .in("chat_id", ids)
      .gte("created_at", startOfTodayISO());
    setUsedToday(count || 0);
  };

  const loadChats = async () => {
    setLoadingChats(true);
    const { data } = await supabase
      .from("chats").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false });
    setChats(data || []);
    setLoadingChats(false);
  };

  const loadMessages = async (chatId) => {
    const { data } = await supabase
      .from("messages").select("*").eq("chat_id", chatId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const createNewChat = async () => {
    const { data } = await supabase
      .from("chats").insert({ user_id: userId, title: "New conversation" })
      .select().single();
    if (data) {
      setChats((prev) => [data, ...prev]);
      setActiveChatId(data.id);
      setMessages([]);
    }
  };

  const deleteChat = async (id) => {
    await supabase.from("chats").delete().eq("id", id);
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) { setActiveChatId(null); setMessages([]); }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setChats([]); setMessages([]); setActiveChatId(null);
  };

  const sendMessage = async (overrideText) => {
    const text = (typeof overrideText === "string" ? overrideText : input).trim();
    if (!text || loading) return;

    // Free daily limit check
    if (usedToday >= DAILY_LIMIT) {
      setShowPaywall(true);
      return;
    }

    let chatId = activeChatId;

    if (!chatId) {
      const { data } = await supabase
        .from("chats").insert({ user_id: userId, title: text.slice(0, 40) })
        .select().single();
      if (!data) return;
      chatId = data.id;
      setChats((prev) => [data, ...prev]);
      setActiveChatId(data.id);
    }

    const userMsg = { role: "user", content: text, chat_id: chatId, created_at: new Date().toISOString() };
    const { data: savedUser } = await supabase.from("messages").insert(userMsg).select().single();
    const newMessages = [...messages, savedUser || userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setUsedToday((n) => n + 1);

    if (messages.length === 0) {
      await supabase.from("chats").update({ title: text.slice(0, 40) }).eq("id", chatId);
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title: text.slice(0, 40) } : c)));
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await response.json();
      const replyText = data.reply || ("⚠️ " + (data.error || "Error"));
      const assistantMsg = { role: "assistant", content: replyText, chat_id: chatId, created_at: new Date().toISOString() };
      const { data: savedAssistant } = await supabase.from("messages").insert(assistantMsg).select().single();
      setMessages((prev) => [...prev, savedAssistant || assistantMsg]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Connection error. Please try again.", created_at: new Date().toISOString() }]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Ask TeachBek to invent a fresh conversation topic and start chatting.
  const surpriseTopic = async () => {
    if (loading || topicLoading) return;
    if (usedToday >= DAILY_LIMIT) { setShowPaywall(true); return; }
    const prompt = "Surprise me! Pick one fresh, interesting conversation topic for English practice (not the usual boring ones) and start the conversation by introducing the topic in one sentence and asking me an engaging opening question about it.";
    setTopicLoading(true);
    try {
      await sendMessage(prompt);
    } finally {
      setTopicLoading(false);
    }
  };

  const groupedChats = chats.reduce((acc, chat) => {
    const label = formatDate(chat.created_at);
    if (!acc[label]) acc[label] = [];
    acc[label].push(chat);
    return acc;
  }, {});

  if (authLoading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080d08", color: "#4ade80", fontFamily: "monospace" }}>
        Loading...
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#080d08", fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-8px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        textarea { resize: none; outline: none; } textarea::placeholder { color: #4b5563; }
        .chat-item:hover { background: rgba(255,255,255,0.06) !important; }
        .chat-item.active { background: rgba(74,222,128,0.08) !important; border-left: 2px solid #4ade80 !important; }
        .send-btn:hover:not(:disabled) { transform: scale(1.05); } .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .new-chat-btn:hover { background: rgba(74,222,128,0.15) !important; }
        .delete-btn { opacity: 0; } .chat-item:hover .delete-btn { opacity: 1 !important; }
        .logout-btn:hover { color: #f87171 !important; }
      `}</style>

      <div style={{ width: sidebarOpen ? 280 : 0, minWidth: sidebarOpen ? 280 : 0, transition: "all 0.3s ease", overflow: "hidden", background: "#0d130d", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 16px 12px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #4ade80, #22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#0a0f0a" }}>T</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#f0fdf4" }}>TeachBek</div>
            <div style={{ fontSize: 11, color: "#4ade80", fontFamily: "'Space Mono', monospace" }}>English AI Tutor</div>
          </div>
        </div>
        <div style={{ padding: "0 12px 12px" }}>
          <button className="new-chat-btn" onClick={createNewChat} style={{ width: "100%", padding: "10px 14px", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, color: "#4ade80", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>+</span> New conversation
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
          {loadingChats ? (
            <div style={{ textAlign: "center", color: "#4b5563", padding: 32, fontSize: 13 }}>Loading...</div>
          ) : (
            Object.entries(groupedChats).map(([label, dayChats]) => (
              <div key={label}>
                <div style={{ padding: "8px 8px 4px", fontSize: 11, color: "#4b5563", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
                {dayChats.map((chat) => (
                  <div key={chat.id} className={`chat-item ${chat.id === activeChatId ? "active" : ""}`} onClick={() => setActiveChatId(chat.id)} style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, borderLeft: "2px solid transparent", marginBottom: 2 }}>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ fontSize: 13.5, color: "#d1fae5", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{chat.title}</div>
                    </div>
                    <button className="delete-btn" onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 16, padding: 4 }}>🗑</button>
                  </div>
                ))}
              </div>
            ))
          )}
          {!loadingChats && chats.length === 0 && (
            <div style={{ textAlign: "center", color: "#374151", padding: 32, fontSize: 13 }}>No conversations yet.<br />Start one!</div>
          )}
        </div>
        <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 8px" }}>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "'Space Mono', monospace" }}>{userEmail}</div>
            </div>
            <button className="logout-btn" onClick={logout} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace", flexShrink: 0, transition: "color 0.2s" }}>Log out</button>
          </div>
          <div onClick={() => setShowLegal(true)} style={{ padding: "4px 8px", fontSize: 11, color: "#4b5563", fontFamily: "'Space Mono', monospace", cursor: "pointer" }}>Terms &amp; Privacy</div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 14, background: "rgba(0,0,0,0.2)" }}>
          <button onClick={() => setSidebarOpen((v) => !v)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 20, padding: 4 }}>☰</button>
          <div style={{ flex: 1 }}><span style={{ fontWeight: 600, fontSize: 15, color: "#d1fae5" }}>{chats.find((c) => c.id === activeChatId)?.title || "Select or start a conversation"}</span></div>
          {(() => {
            const remaining = Math.max(0, DAILY_LIMIT - usedToday);
            const low = remaining <= 5;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: low ? "rgba(248,113,113,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${low ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.1)"}`, borderRadius: 20, padding: "4px 12px" }}>
                <span style={{ fontSize: 12, color: low ? "#f87171" : "#9ca3af", fontFamily: "'Space Mono', monospace" }}>{remaining}/{DAILY_LIMIT} free left</span>
              </div>
            );
          })()}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 20, padding: "4px 12px" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80" }} />
            <span style={{ fontSize: 12, color: "#4ade80", fontFamily: "'Space Mono', monospace" }}>Online</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
          {!activeChatId || messages.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", animation: "fadeIn 0.5s ease" }}>
              <div style={{ width: 80, height: 80, borderRadius: 24, background: "linear-gradient(135deg, #4ade80, #22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 20, boxShadow: "0 0 40px rgba(74,222,128,0.3)" }}>🎓</div>
              <h2 style={{ color: "#f0fdf4", fontWeight: 700, fontSize: 24, marginBottom: 10 }}>Welcome to TeachBek</h2>
              <p style={{ color: "#6b7280", fontSize: 15, maxWidth: 400, lineHeight: 1.6 }}>Your personal AI English teacher. Write anything — I'll chat with you and gently correct your mistakes.</p>

              <div style={{ marginTop: 28, width: "100%", maxWidth: 440, background: "linear-gradient(135deg, rgba(74,222,128,0.08), rgba(34,211,238,0.08))", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 18, padding: 20, textAlign: "left" }}>
                <div style={{ fontSize: 11, color: "#4ade80", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>✨ Not sure what to say?</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 36 }}>🎲</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#f0fdf4", fontWeight: 700, fontSize: 18 }}>Surprise me with a topic</div>
                    <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 2 }}>TeachBek picks a fresh topic and starts the chat.</div>
                  </div>
                </div>
                <button onClick={surpriseTopic} disabled={topicLoading || loading} style={{ width: "100%", marginTop: 16, padding: "12px", background: "linear-gradient(135deg, #4ade80, #22d3ee)", border: "none", borderRadius: 12, color: "#0a0f0a", fontSize: 15, fontWeight: 700, cursor: topicLoading ? "wait" : "pointer", opacity: topicLoading ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif" }}>
                  {topicLoading ? "Thinking of a topic…" : "Surprise me 🎲"}
                </button>
              </div>

              <div style={{ marginTop: 24, fontSize: 12, color: "#4b5563", fontFamily: "'Space Mono', monospace" }}>or talk about anything:</div>
              <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap", justifyContent: "center" }}>
                {["Tell me about yourself", "Let's practice small talk", "Help me with grammar", "Talk about my hobbies"].map((s) => (
                  <button key={s} onClick={() => { setInput(s); textareaRef.current?.focus(); }} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "8px 16px", color: "#9ca3af", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{s}</button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 760, margin: "0 auto" }}>
              {messages.map((msg, i) => (<div key={i} style={{ animation: "fadeIn 0.3s ease" }}><MessageBubble msg={msg} /></div>))}
              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #4ade80, #22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#0a0f0a" }}>T</div>
                  <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px 20px 20px 20px" }}><TypingDots /></div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div style={{ padding: "16px 20px", background: "rgba(0,0,0,0.3)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            {usedToday >= DAILY_LIMIT && (
              <div onClick={() => setShowPaywall(true)} style={{ cursor: "pointer", marginBottom: 12, padding: "14px 18px", background: "linear-gradient(135deg, rgba(74,222,128,0.12), rgba(34,211,238,0.12))", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ color: "#f0fdf4", fontWeight: 600, fontSize: 14 }}>🎉 You've used all {DAILY_LIMIT} free messages today!</div>
                  <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 2 }}>Upgrade to Premium for unlimited practice.</div>
                </div>
                <span style={{ background: "linear-gradient(135deg, #4ade80, #22d3ee)", color: "#0a0f0a", fontWeight: 700, fontSize: 13, padding: "8px 16px", borderRadius: 10, whiteSpace: "nowrap" }}>Upgrade $5/mo</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "12px 16px" }}>
              <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} placeholder="Write something in English… I'll correct you gently 😊" rows={1}
                style={{ flex: 1, background: "none", border: "none", color: "#e2e8f0", fontSize: 15, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", maxHeight: 120, overflowY: "auto" }}
                onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }} />
              <button className="send-btn" onClick={sendMessage} disabled={loading || !input.trim()} style={{ width: 40, height: 40, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #4ade80, #22d3ee)", color: "#0a0f0a", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 10px rgba(74,222,128,0.3)" }}>↑</button>
            </div>
            <div style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: "#374151", fontFamily: "'Space Mono', monospace" }}>
              TeachBek uses AI and can make mistakes. Not a substitute for a professional teacher. IELTS/TOEFL scores are estimates only.
            </div>
          </div>
        </div>
      </div>

      {showPaywall && (
        <div onClick={() => setShowPaywall(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, background: "#0d130d", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 22, padding: 32, position: "relative", animation: "fadeIn 0.3s ease" }}>
            <button onClick={() => setShowPaywall(false)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#6b7280", fontSize: 22, cursor: "pointer" }}>×</button>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg, #4ade80, #22d3ee)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 30, marginBottom: 16, boxShadow: "0 0 30px rgba(74,222,128,0.3)" }}>⭐</div>
              <h2 style={{ color: "#f0fdf4", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>TeachBek Premium</h2>
              <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 20 }}>You've reached your free daily limit. Go unlimited!</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {["Unlimited messages every day", "IELTS & TOEFL practice mode (coming soon)", "Track your mistakes & progress (coming soon)", "Priority support"].map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, color: "#d1fae5", fontSize: 14 }}>
                  <span style={{ color: "#4ade80", fontWeight: 700 }}>✓</span> {f}
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <span style={{ color: "#f0fdf4", fontSize: 32, fontWeight: 800 }}>$5</span>
              <span style={{ color: "#6b7280", fontSize: 15 }}> / month</span>
            </div>
            <button onClick={() => alert("Payment via Kaspi is coming soon! 🚀")} style={{ width: "100%", padding: 14, background: "linear-gradient(135deg, #4ade80, #22d3ee)", border: "none", borderRadius: 12, color: "#0a0f0a", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              Upgrade to Premium
            </button>
            <p style={{ textAlign: "center", color: "#4b5563", fontSize: 12, marginTop: 12 }}>Your free messages reset tomorrow.</p>
          </div>
        </div>
      )}

      {showLegal && <Legal onClose={() => setShowLegal(false)} />}
    </div>
  );
}

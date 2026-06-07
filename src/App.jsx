import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase.js";
import Auth from "./Auth.jsx";
import Legal from "./Legal.jsx";

const DAILY_LIMIT = 20;

const startOfTodayISO = () => { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString(); };
const todayStr = () => new Date().toISOString().slice(0, 10);
const yesterdayStr = () => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); };
const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const formatDate = (date) => {
  const d = new Date(date); const today = new Date(); const y = new Date(); y.setDate(today.getDate()-1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const LEVELS = ["A1","A2","B1","B2","C1","C2"];
const LEVEL_DESC = { A1:"Beginner", A2:"Elementary", B1:"Intermediate", B2:"Upper-Intermediate", C1:"Advanced", C2:"Proficient" };
const CAT = {
  grammar:{e:"📝",n:"Grammar"}, vocabulary:{e:"📚",n:"Vocabulary"}, spelling:{e:"✏️",n:"Spelling"},
  articles:{e:"🔤",n:"Articles"}, prepositions:{e:"🔗",n:"Prepositions"}, tense:{e:"⏳",n:"Tenses"},
  "word-order":{e:"🔀",n:"Word order"}, punctuation:{e:"❗",n:"Punctuation"},
};
const catInfo = (c) => CAT[c] || { e:"💬", n: c || "Other" };

function TypingDots() {
  return (
    <div style={{ display:"flex", gap:5, alignItems:"center", padding:"12px 16px" }}>
      {[0,1,2].map((i)=>(<div key={i} style={{ width:8, height:8, borderRadius:"50%", background:"#4ade80", animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />))}
    </div>
  );
}

// Renders assistant text with each word clickable for translation.
function Translatable({ text, onWord }) {
  const tokens = text.split(/(\s+)/);
  return (
    <>
      {tokens.map((tok, i) => {
        if (/^\s+$/.test(tok) || tok === "") return tok;
        const clean = tok.replace(/[.,!?;:"'()«»—]/g, "");
        if (!clean) return tok;
        return (
          <span key={i} className="tw" onClick={() => onWord(clean)} style={{ cursor:"pointer", borderRadius:3 }}>{tok}</span>
        );
      })}
    </>
  );
}

function MessageBubble({ msg, onWord }) {
  const isUser = msg.role === "user";
  const corrections = !isUser && msg.meta && Array.isArray(msg.meta.corrections) ? msg.meta.corrections : [];
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:isUser?"flex-end":"flex-start", marginBottom:20 }}>
      {!isUser && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg, #4ade80, #22d3ee)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:"#0a0f0a" }}>T</div>
          <span style={{ fontSize:12, color:"#6b7280", fontFamily:"'Space Mono', monospace" }}>TeachBek</span>
        </div>
      )}
      <div style={{ maxWidth:"78%", display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ background:isUser?"linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)":"rgba(255,255,255,0.05)", border:isUser?"none":"1px solid rgba(255,255,255,0.08)", borderRadius:isUser?"20px 20px 4px 20px":"4px 20px 20px 20px", padding:"12px 18px", color:isUser?"#0a0f0a":"#e2e8f0", fontSize:15, lineHeight:1.65, fontFamily:"'DM Sans', sans-serif", fontWeight:isUser?500:400, boxShadow:isUser?"0 4px 20px rgba(74,222,128,0.3)":"none", whiteSpace:"pre-wrap" }}>
          {isUser ? msg.content : <Translatable text={msg.content} onWord={onWord} />}
        </div>
        {!isUser && corrections.length > 0 && (
          <div style={{ background:"rgba(250,204,21,0.06)", border:"1px solid rgba(250,204,21,0.2)", borderRadius:12, padding:"12px 16px", fontSize:13.5, lineHeight:1.7, color:"#fde68a", fontFamily:"'Space Mono', monospace" }}>
            <div style={{ fontWeight:700, marginBottom:8, color:"#fbbf24", fontSize:12, textTransform:"uppercase", letterSpacing:1 }}>📝 Corrections</div>
            {corrections.map((c,i)=>(
              <div key={i} style={{ marginBottom: i<corrections.length-1?10:0 }}>
                <div><span style={{ color:"#f87171" }}>❌ {c.wrong}</span> → <span style={{ color:"#4ade80" }}>✅ {c.correct}</span></div>
                {c.reason && <div style={{ color:"#9ca3af", fontSize:12.5, marginTop:2 }}>💡 {c.reason} <span style={{ opacity:0.7 }}>· {catInfo(c.category).e} {catInfo(c.category).n}</span></div>}
              </div>
            ))}
          </div>
        )}
        {!isUser && msg.meta && corrections.length === 0 && (
          <div style={{ color:"#4ade80", fontSize:12.5, fontFamily:"'Space Mono', monospace" }}>✅ Perfect! No mistakes.</div>
        )}
      </div>
      <span style={{ fontSize:11, color:"#4b5563", marginTop:4, fontFamily:"'Space Mono', monospace" }}>{formatTime(msg.created_at || Date.now())}</span>
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
  const [showProgress, setShowProgress] = useState(false);
  const [showModes, setShowModes] = useState(false);
  const [topicLoading, setTopicLoading] = useState(false);
  const [profile, setProfile] = useState({ level: "A1", streak: 0, last_active: null, premium: false });
  const [errorStats, setErrorStats] = useState([]);
  const [totalMsgs, setTotalMsgs] = useState(0);
  const [tip, setTip] = useState(null); // {word, translation, loading}
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;
  const isPremium = !!profile.premium;

  useEffect(() => { if (userId) { loadChats(); loadUsage(); loadProfile(); loadStats(); } }, [userId]);
  useEffect(() => { if (activeChatId) loadMessages(activeChatId); }, [activeChatId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  const loadChats = async () => {
    setLoadingChats(true);
    const { data } = await supabase.from("chats").select("*").eq("user_id", userId).order("created_at", { ascending:false });
    setChats(data || []); setLoadingChats(false);
  };
  const loadMessages = async (chatId) => {
    const { data } = await supabase.from("messages").select("*").eq("chat_id", chatId).order("created_at", { ascending:true });
    setMessages(data || []);
  };
  const loadUsage = async () => {
    const { data: uc } = await supabase.from("chats").select("id").eq("user_id", userId);
    const ids = (uc||[]).map(c=>c.id);
    if (ids.length===0) { setUsedToday(0); return; }
    const { count } = await supabase.from("messages").select("id",{count:"exact",head:true}).eq("role","user").in("chat_id",ids).gte("created_at", startOfTodayISO());
    setUsedToday(count||0);
  };
  const loadProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
    if (data) setProfile(data);
    else { await supabase.from("profiles").insert({ user_id: userId, level:"A1", streak:0 }); setProfile({ level:"A1", streak:0, last_active:null }); }
  };
  const loadStats = async () => {
    const { data } = await supabase.from("corrections").select("category").eq("user_id", userId).limit(1000);
    const counts = {};
    (data||[]).forEach(r => { counts[r.category] = (counts[r.category]||0)+1; });
    const arr = Object.entries(counts).map(([category,count])=>({category,count})).sort((a,b)=>b.count-a.count);
    setErrorStats(arr);
    const { data: uc } = await supabase.from("chats").select("id").eq("user_id", userId);
    const ids = (uc||[]).map(c=>c.id);
    if (ids.length){ const { count } = await supabase.from("messages").select("id",{count:"exact",head:true}).eq("role","user").in("chat_id",ids); setTotalMsgs(count||0); }
  };

  const updateStreakAndLevel = async (level) => {
    let newStreak = profile.streak || 0;
    if (profile.last_active === todayStr()) { /* already counted */ }
    else if (profile.last_active === yesterdayStr()) newStreak = (profile.streak||0) + 1;
    else newStreak = 1;
    const patch = { user_id: userId, streak: newStreak, last_active: todayStr(), updated_at: new Date().toISOString() };
    if (level && LEVELS.includes(level)) patch.level = level;
    await supabase.from("profiles").upsert(patch);
    setProfile((p)=>({ ...p, ...patch }));
  };

  const createNewChat = async () => {
    const { data } = await supabase.from("chats").insert({ user_id:userId, title:"New conversation" }).select().single();
    if (data) { setChats(p=>[data,...p]); setActiveChatId(data.id); setMessages([]); }
  };
  const deleteChat = async (id) => {
    await supabase.from("chats").delete().eq("id", id);
    setChats(p=>p.filter(c=>c.id!==id));
    if (activeChatId===id) { setActiveChatId(null); setMessages([]); }
  };
  const logout = async () => { await supabase.auth.signOut(); setChats([]); setMessages([]); setActiveChatId(null); };

  const sendMessage = async (overrideText, opts = {}) => {
    const text = (typeof overrideText === "string" ? overrideText : input).trim();
    if (!text || loading) return;
    if (!isPremium && usedToday >= DAILY_LIMIT) { setShowPaywall(true); return; }

    let chatId = opts.chatId || activeChatId;
    let baseMessages = opts.freshChat ? [] : messages;
    let mode = opts.mode || chats.find(c=>c.id===chatId)?.mode || "chat";

    if (!chatId) {
      const { data } = await supabase.from("chats").insert({ user_id:userId, title:text.slice(0,40), mode:"chat" }).select().single();
      if (!data) return;
      chatId = data.id; mode = "chat"; baseMessages = []; setChats(p=>[data,...p]); setActiveChatId(data.id);
    }
    const userMsg = { role:"user", content:text, chat_id:chatId, created_at:new Date().toISOString() };
    const { data: savedUser } = await supabase.from("messages").insert(userMsg).select().single();
    const newMessages = [...baseMessages, savedUser || userMsg];
    setMessages(newMessages); setInput(""); setLoading(true); setUsedToday(n=>n+1);

    if (mode === "chat" && baseMessages.length === 0) {
      await supabase.from("chats").update({ title:text.slice(0,40) }).eq("id", chatId);
      setChats(p=>p.map(c=>c.id===chatId?{...c,title:text.slice(0,40)}:c));
    }

    try {
      const response = await fetch("/api/chat", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ messages: newMessages.map(m=>({ role:m.role, content:m.content })), mode }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      const reply = data.reply || "Sorry, I couldn't respond.";
      const corrections = data.corrections || [];
      const assistantMsg = { role:"assistant", content:reply, chat_id:chatId, created_at:new Date().toISOString(), meta:{ corrections } };
      const { data: savedA } = await supabase.from("messages").insert(assistantMsg).select().single();
      setMessages(prev=>[...prev, savedA || assistantMsg]);

      if (mode === "chat") {
        if (corrections.length) {
          await supabase.from("corrections").insert(corrections.map(c=>({ user_id:userId, category:c.category||"other", wrong:c.wrong||"", correct:c.correct||"" })));
        }
        await updateStreakAndLevel(data.level);
        loadStats();
      } else {
        await updateStreakAndLevel(null); // still count streak for practising
      }
    } catch (e) {
      setMessages(prev=>[...prev, { role:"assistant", content:"⚠️ " + (e.message || "Connection error. Please try again."), created_at:new Date().toISOString() }]);
    } finally {
      setLoading(false); textareaRef.current?.focus();
    }
  };

  const MODE_SEEDS = {
    ielts: "Let's start an IELTS Speaking practice session. Please begin with Part 1 and ask me your first question.",
    essay: "I'd like you to check my writing. I'll paste my essay, paragraph, or sentences in my next message.",
  };
  const planSeed = () => {
    const top = errorStats.slice(0,5).map(s=>`${catInfo(s.category).n} (${s.count})`).join(", ");
    return `Please create a personalized 7-day study plan for me. My level is ${profile.level}. ` + (top ? `My most common mistakes so far: ${top}.` : "I don't have much mistake data yet, so base it on my level.");
  };

  const startMode = async (mode) => {
    if (!isPremium) { setShowModes(false); setShowPaywall(true); return; }
    setShowModes(false);
    const titleMap = { ielts:"🎓 IELTS Practice", essay:"✍️ Essay Check", plan:"📋 Study Plan" };
    const { data } = await supabase.from("chats").insert({ user_id:userId, title:titleMap[mode], mode }).select().single();
    if (!data) return;
    setChats(p=>[data,...p]); setActiveChatId(data.id); setMessages([]);
    const seed = mode === "plan" ? planSeed() : MODE_SEEDS[mode];
    await sendMessage(seed, { chatId: data.id, mode, freshChat: true });
  };

  const handleKey = (e) => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const surpriseTopic = async () => {
    if (loading || topicLoading) return;
    if (!isPremium && usedToday >= DAILY_LIMIT) { setShowPaywall(true); return; }
    const prompt = "Surprise me! Pick one fresh, interesting conversation topic for English practice (not the usual boring ones) and start by introducing it in one sentence and asking me an engaging opening question.";
    setTopicLoading(true);
    try { await sendMessage(prompt); } finally { setTopicLoading(false); }
  };

  const translateWord = async (word) => {
    setTip({ word, translation:"", loading:true });
    try {
      const r = await fetch("/api/translate", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ word }) });
      const d = await r.json();
      setTip({ word, translation: d.translation || "—", loading:false });
    } catch {
      setTip({ word, translation:"—", loading:false });
    }
  };

  const groupedChats = chats.reduce((acc, chat) => {
    const label = formatDate(chat.created_at);
    if (!acc[label]) acc[label] = [];
    acc[label].push(chat); return acc;
  }, {});

  if (authLoading) return <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#080d08", color:"#4ade80", fontFamily:"monospace" }}>Loading...</div>;
  if (!session) return <Auth />;

  const remaining = Math.max(0, DAILY_LIMIT - usedToday);
  const low = remaining <= 5;
  const maxErr = Math.max(1, ...errorStats.map(s=>s.count));

  return (
    <div style={{ display:"flex", height:"100vh", background:"#080d08", fontFamily:"'DM Sans', sans-serif", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-8px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:4px; }
        textarea { resize:none; outline:none; } textarea::placeholder { color:#4b5563; }
        .chat-item:hover { background:rgba(255,255,255,0.06) !important; }
        .chat-item.active { background:rgba(74,222,128,0.08) !important; border-left:2px solid #4ade80 !important; }
        .send-btn:hover:not(:disabled) { transform:scale(1.05); } .send-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .new-chat-btn:hover { background:rgba(74,222,128,0.15) !important; }
        .delete-btn { opacity:0; } .chat-item:hover .delete-btn { opacity:1 !important; }
        .logout-btn:hover { color:#f87171 !important; }
        .tw:hover { background:rgba(74,222,128,0.25); }
        .prog-btn:hover { background:rgba(74,222,128,0.12) !important; }
      `}</style>

      {/* Sidebar */}
      <div style={{ width:sidebarOpen?280:0, minWidth:sidebarOpen?280:0, transition:"all 0.3s ease", overflow:"hidden", background:"#0d130d", borderRight:"1px solid rgba(255,255,255,0.06)", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"20px 16px 12px", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg, #4ade80, #22d3ee)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:16, color:"#0a0f0a" }}>T</div>
          <div>
            <div style={{ fontWeight:700, fontSize:16, color:"#f0fdf4" }}>TeachBek</div>
            <div style={{ fontSize:11, color:"#4ade80", fontFamily:"'Space Mono', monospace" }}>English AI Tutor</div>
          </div>
        </div>

        {/* Progress summary button */}
        <div style={{ padding:"0 12px 8px" }}>
          <button className="prog-btn" onClick={()=>{ loadStats(); setShowProgress(true); }} style={{ width:"100%", padding:"12px 14px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", transition:"background 0.2s" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:"linear-gradient(135deg, #4ade80, #22d3ee)", display:"flex", alignItems:"center", justifyContent:"center", color:"#0a0f0a", fontWeight:800, fontSize:13 }}>{profile.level}</div>
              <div style={{ textAlign:"left" }}>
                <div style={{ color:"#d1fae5", fontSize:13, fontWeight:600 }}>{LEVEL_DESC[profile.level]||"Level"}</div>
                <div style={{ color:"#6b7280", fontSize:11, fontFamily:"'Space Mono', monospace" }}>🔥 {profile.streak||0} day streak</div>
              </div>
            </div>
            <span style={{ color:"#4ade80", fontSize:12 }}>›</span>
          </button>
        </div>

        <div style={{ padding:"0 12px 12px" }}>
          <button className="new-chat-btn" onClick={createNewChat} style={{ width:"100%", padding:"10px 14px", background:"rgba(74,222,128,0.08)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:10, color:"#4ade80", fontFamily:"'DM Sans', sans-serif", fontWeight:600, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:18 }}>+</span> New conversation
          </button>
          {!isPremium && (
            <button onClick={()=>setShowPaywall(true)} style={{ width:"100%", marginTop:8, padding:"10px 14px", background:"linear-gradient(135deg, rgba(74,222,128,0.15), rgba(34,211,238,0.15))", border:"1px solid rgba(74,222,128,0.35)", borderRadius:10, color:"#f0fdf4", fontFamily:"'DM Sans', sans-serif", fontWeight:600, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              ⭐ Upgrade to Premium
            </button>
          )}
          <button onClick={()=>setShowModes(true)} style={{ width:"100%", marginTop:8, padding:"10px 14px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, color:"#d1fae5", fontFamily:"'DM Sans', sans-serif", fontWeight:600, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            🚀 Premium modes
          </button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"0 8px" }}>
          {loadingChats ? <div style={{ textAlign:"center", color:"#4b5563", padding:32, fontSize:13 }}>Loading...</div> :
            Object.entries(groupedChats).map(([label, dayChats])=>(
              <div key={label}>
                <div style={{ padding:"8px 8px 4px", fontSize:11, color:"#4b5563", fontFamily:"'Space Mono', monospace", textTransform:"uppercase", letterSpacing:1 }}>{label}</div>
                {dayChats.map((chat)=>(
                  <div key={chat.id} className={`chat-item ${chat.id===activeChatId?"active":""}`} onClick={()=>setActiveChatId(chat.id)} style={{ padding:"10px 12px", borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, borderLeft:"2px solid transparent", marginBottom:2 }}>
                    <div style={{ flex:1, overflow:"hidden" }}>
                      <div style={{ fontSize:13.5, color:"#d1fae5", fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{chat.title}</div>
                    </div>
                    <button className="delete-btn" onClick={(e)=>{ e.stopPropagation(); deleteChat(chat.id); }} style={{ background:"none", border:"none", color:"#6b7280", cursor:"pointer", fontSize:16, padding:4 }}>🗑</button>
                  </div>
                ))}
              </div>
            ))
          }
          {!loadingChats && chats.length===0 && <div style={{ textAlign:"center", color:"#374151", padding:32, fontSize:13 }}>No conversations yet.<br />Start one!</div>}
        </div>

        <div style={{ padding:12, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, padding:"6px 8px" }}>
            <div style={{ overflow:"hidden" }}>
              <div style={{ fontSize:12, color:"#9ca3af", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", fontFamily:"'Space Mono', monospace" }}>{userEmail}</div>
            </div>
            <button className="logout-btn" onClick={logout} style={{ background:"none", border:"none", color:"#6b7280", cursor:"pointer", fontSize:12, fontFamily:"'Space Mono', monospace", flexShrink:0, transition:"color 0.2s" }}>Log out</button>
          </div>
          <div onClick={()=>setShowLegal(true)} style={{ padding:"4px 8px", fontSize:11, color:"#4b5563", fontFamily:"'Space Mono', monospace", cursor:"pointer" }}>Terms &amp; Privacy</div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"14px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:14, background:"rgba(0,0,0,0.2)" }}>
          <button onClick={()=>setSidebarOpen(v=>!v)} style={{ background:"none", border:"none", color:"#6b7280", cursor:"pointer", fontSize:20, padding:4 }}>☰</button>
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontWeight:600, fontSize:15, color:"#d1fae5" }}>{chats.find(c=>c.id===activeChatId)?.title || "Select or start a conversation"}</span>
            {(() => {
              const m = chats.find(c=>c.id===activeChatId)?.mode;
              if (!m || m === "chat") return null;
              const label = { ielts:"🎓 IELTS Mode", essay:"✍️ Essay Mode", plan:"📋 Plan Mode" }[m];
              return <span style={{ fontSize:11, color:"#4ade80", background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.25)", borderRadius:12, padding:"2px 10px", fontFamily:"'Space Mono', monospace" }}>{label}</span>;
            })()}
          </div>
          {isPremium ? (
            <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.3)", borderRadius:20, padding:"4px 12px" }}>
              <span style={{ fontSize:12, color:"#4ade80", fontFamily:"'Space Mono', monospace" }}>⭐ Premium</span>
            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:6, background:low?"rgba(248,113,113,0.1)":"rgba(255,255,255,0.04)", border:`1px solid ${low?"rgba(248,113,113,0.3)":"rgba(255,255,255,0.1)"}`, borderRadius:20, padding:"4px 12px" }}>
              <span style={{ fontSize:12, color:low?"#f87171":"#9ca3af", fontFamily:"'Space Mono', monospace" }}>{remaining}/{DAILY_LIMIT} free left</span>
            </div>
          )}
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"24px 20px" }}>
          {!activeChatId || messages.length===0 ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", textAlign:"center", animation:"fadeIn 0.5s ease" }}>
              <div style={{ width:80, height:80, borderRadius:24, background:"linear-gradient(135deg, #4ade80, #22d3ee)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, marginBottom:20, boxShadow:"0 0 40px rgba(74,222,128,0.3)" }}>🎓</div>
              <h2 style={{ color:"#f0fdf4", fontWeight:700, fontSize:24, marginBottom:10 }}>Welcome to TeachBek</h2>
              <p style={{ color:"#6b7280", fontSize:15, maxWidth:400, lineHeight:1.6 }}>Your personal AI English teacher. Write anything — I'll chat with you and gently correct your mistakes. Tap any word I write to translate it.</p>

              <div style={{ marginTop:28, width:"100%", maxWidth:440, background:"linear-gradient(135deg, rgba(74,222,128,0.08), rgba(34,211,238,0.08))", border:"1px solid rgba(74,222,128,0.25)", borderRadius:18, padding:20, textAlign:"left" }}>
                <div style={{ fontSize:11, color:"#4ade80", fontFamily:"'Space Mono', monospace", textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>✨ Not sure what to say?</div>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ fontSize:36 }}>🎲</div>
                  <div style={{ flex:1 }}>
                    <div style={{ color:"#f0fdf4", fontWeight:700, fontSize:18 }}>Surprise me with a topic</div>
                    <div style={{ color:"#9ca3af", fontSize:13, marginTop:2 }}>TeachBek picks a fresh topic and starts the chat.</div>
                  </div>
                </div>
                <button onClick={surpriseTopic} disabled={topicLoading||loading} style={{ width:"100%", marginTop:16, padding:"12px", background:"linear-gradient(135deg, #4ade80, #22d3ee)", border:"none", borderRadius:12, color:"#0a0f0a", fontSize:15, fontWeight:700, cursor:topicLoading?"wait":"pointer", opacity:topicLoading?0.6:1, fontFamily:"'DM Sans', sans-serif" }}>{topicLoading?"Thinking of a topic…":"Surprise me 🎲"}</button>
              </div>

              <div style={{ marginTop:24, fontSize:12, color:"#4b5563", fontFamily:"'Space Mono', monospace" }}>or talk about anything:</div>
              <div style={{ display:"flex", gap:12, marginTop:12, flexWrap:"wrap", justifyContent:"center" }}>
                {["Tell me about yourself","Let's practice small talk","Help me with grammar","Talk about my hobbies"].map((s)=>(
                  <button key={s} onClick={()=>{ setInput(s); textareaRef.current?.focus(); }} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:20, padding:"8px 16px", color:"#9ca3af", fontSize:13, cursor:"pointer", fontFamily:"'DM Sans', sans-serif" }}>{s}</button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth:760, margin:"0 auto" }}>
              {messages.map((msg,i)=>(<div key={i} style={{ animation:"fadeIn 0.3s ease" }}><MessageBubble msg={msg} onWord={translateWord} /></div>))}
              {loading && (
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg, #4ade80, #22d3ee)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:"#0a0f0a" }}>T</div>
                  <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"4px 20px 20px 20px" }}><TypingDots /></div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div style={{ padding:"16px 20px", background:"rgba(0,0,0,0.3)", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ maxWidth:760, margin:"0 auto" }}>
            {!isPremium && usedToday >= DAILY_LIMIT && (
              <div onClick={()=>setShowPaywall(true)} style={{ cursor:"pointer", marginBottom:12, padding:"14px 18px", background:"linear-gradient(135deg, rgba(74,222,128,0.12), rgba(34,211,238,0.12))", border:"1px solid rgba(74,222,128,0.3)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                <div>
                  <div style={{ color:"#f0fdf4", fontWeight:600, fontSize:14 }}>🎉 You've used all {DAILY_LIMIT} free messages today!</div>
                  <div style={{ color:"#9ca3af", fontSize:13, marginTop:2 }}>Upgrade to Premium for unlimited practice.</div>
                </div>
                <span style={{ background:"linear-gradient(135deg, #4ade80, #22d3ee)", color:"#0a0f0a", fontWeight:700, fontSize:13, padding:"8px 16px", borderRadius:10, whiteSpace:"nowrap" }}>Upgrade $5/mo</span>
              </div>
            )}
            <div style={{ display:"flex", gap:12, alignItems:"flex-end", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:16, padding:"12px 16px" }}>
              <textarea ref={textareaRef} value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={handleKey} placeholder="Write something in English… I'll correct you gently 😊" rows={1}
                style={{ flex:1, background:"none", border:"none", color:"#e2e8f0", fontSize:15, lineHeight:1.6, fontFamily:"'DM Sans', sans-serif", maxHeight:120, overflowY:"auto" }}
                onInput={(e)=>{ e.target.style.height="auto"; e.target.style.height=Math.min(e.target.scrollHeight,120)+"px"; }} />
              <button className="send-btn" onClick={sendMessage} disabled={loading||!input.trim()} style={{ width:40, height:40, borderRadius:12, border:"none", background:"linear-gradient(135deg, #4ade80, #22d3ee)", color:"#0a0f0a", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 2px 10px rgba(74,222,128,0.3)" }}>↑</button>
            </div>
            <div style={{ textAlign:"center", marginTop:8, fontSize:12, color:"#374151", fontFamily:"'Space Mono', monospace" }}>
              TeachBek uses AI and can make mistakes. Not a substitute for a professional teacher. IELTS/TOEFL scores are estimates only.
            </div>
          </div>
        </div>
      </div>

      {/* Translation tooltip */}
      {tip && (
        <div onClick={()=>setTip(null)} style={{ position:"fixed", inset:0, zIndex:120, display:"flex", alignItems:"flex-end", justifyContent:"center", paddingBottom:120 }}>
          <div onClick={(e)=>e.stopPropagation()} style={{ background:"#0d130d", border:"1px solid rgba(74,222,128,0.3)", borderRadius:14, padding:"14px 20px", boxShadow:"0 8px 30px rgba(0,0,0,0.5)", animation:"fadeIn 0.2s ease", minWidth:200, textAlign:"center" }}>
            <div style={{ color:"#9ca3af", fontSize:13, fontFamily:"'Space Mono', monospace" }}>{tip.word}</div>
            <div style={{ color:"#4ade80", fontSize:20, fontWeight:700, marginTop:4 }}>{tip.loading ? "…" : tip.translation}</div>
            <div onClick={()=>setTip(null)} style={{ marginTop:8, color:"#4b5563", fontSize:11, cursor:"pointer", fontFamily:"'Space Mono', monospace" }}>tap to close</div>
          </div>
        </div>
      )}

      {/* Progress modal */}
      {showProgress && (
        <div onClick={()=>setShowProgress(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:150, padding:20 }}>
          <div onClick={(e)=>e.stopPropagation()} style={{ width:"100%", maxWidth:440, maxHeight:"85vh", overflowY:"auto", background:"#0d130d", border:"1px solid rgba(74,222,128,0.2)", borderRadius:22, padding:28, animation:"fadeIn 0.3s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ color:"#f0fdf4", fontSize:20, fontWeight:700 }}>Your Progress</h2>
              <button onClick={()=>setShowProgress(false)} style={{ background:"none", border:"none", color:"#9ca3af", fontSize:24, cursor:"pointer" }}>×</button>
            </div>

            {/* Level */}
            <div style={{ display:"flex", gap:12, marginBottom:16 }}>
              <div style={{ flex:1, background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:14, padding:16, textAlign:"center" }}>
                <div style={{ color:"#4ade80", fontSize:30, fontWeight:800 }}>{profile.level}</div>
                <div style={{ color:"#9ca3af", fontSize:12, marginTop:2 }}>{LEVEL_DESC[profile.level]}</div>
              </div>
              <div style={{ flex:1, background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:14, padding:16, textAlign:"center" }}>
                <div style={{ color:"#fbbf24", fontSize:30, fontWeight:800 }}>🔥 {profile.streak||0}</div>
                <div style={{ color:"#9ca3af", fontSize:12, marginTop:2 }}>day streak</div>
              </div>
            </div>

            {/* Level scale */}
            <div style={{ display:"flex", gap:4, marginBottom:20 }}>
              {LEVELS.map(l=>(
                <div key={l} style={{ flex:1, textAlign:"center" }}>
                  <div style={{ height:6, borderRadius:3, background: LEVELS.indexOf(l) <= LEVELS.indexOf(profile.level) ? "#4ade80" : "rgba(255,255,255,0.08)" }} />
                  <div style={{ fontSize:10, color: l===profile.level?"#4ade80":"#4b5563", marginTop:4, fontFamily:"'Space Mono', monospace" }}>{l}</div>
                </div>
              ))}
            </div>

            <div style={{ color:"#9ca3af", fontSize:13, marginBottom:16, fontFamily:"'Space Mono', monospace" }}>💬 {totalMsgs} messages practised</div>

            {/* Mistakes breakdown */}
            <div style={{ color:"#f0fdf4", fontSize:14, fontWeight:600, marginBottom:12 }}>Your most common mistakes</div>
            {errorStats.length === 0 ? (
              <div style={{ color:"#6b7280", fontSize:13 }}>No mistakes tracked yet — keep chatting and they'll show up here.</div>
            ) : (
              errorStats.slice(0,8).map(s=>(
                <div key={s.category} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"#d1fae5", marginBottom:4 }}>
                    <span>{catInfo(s.category).e} {catInfo(s.category).n}</span>
                    <span style={{ color:"#6b7280", fontFamily:"'Space Mono', monospace" }}>{s.count}</span>
                  </div>
                  <div style={{ height:8, borderRadius:4, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${(s.count/maxErr)*100}%`, background:"linear-gradient(90deg, #4ade80, #22d3ee)", borderRadius:4 }} />
                  </div>
                </div>
              ))
            )}
            <p style={{ color:"#4b5563", fontSize:11, marginTop:16, fontFamily:"'Space Mono', monospace" }}>Level and stats are AI estimates to guide your practice.</p>
          </div>
        </div>
      )}

      {/* Paywall */}
      {showPaywall && (
        <div onClick={()=>setShowPaywall(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:20 }}>
          <div onClick={(e)=>e.stopPropagation()} style={{ width:"100%", maxWidth:420, background:"#0d130d", border:"1px solid rgba(74,222,128,0.2)", borderRadius:22, padding:32, position:"relative", animation:"fadeIn 0.3s ease" }}>
            <button onClick={()=>setShowPaywall(false)} style={{ position:"absolute", top:16, right:16, background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>×</button>
            <div style={{ textAlign:"center" }}>
              <div style={{ width:64, height:64, borderRadius:18, background:"linear-gradient(135deg, #4ade80, #22d3ee)", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:30, marginBottom:16, boxShadow:"0 0 30px rgba(74,222,128,0.3)" }}>⭐</div>
              <h2 style={{ color:"#f0fdf4", fontSize:22, fontWeight:700, marginBottom:8 }}>TeachBek Premium</h2>
              <p style={{ color:"#6b7280", fontSize:14, marginBottom:20 }}>You've reached your free daily limit. Go unlimited!</p>
            </div>
            <div style={{ color:"#9ca3af", fontSize:13, marginBottom:12, textAlign:"center" }}>Everything in the free plan, plus:</div>
            <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:24 }}>
              {[
                ["♾️","Unlimited messages","Chat as much as you want, no daily limit"],
                ["🎓","IELTS & TOEFL practice","AI examiner with band scores (coming soon)"],
                ["✍️","Essay & writing check","Get your texts corrected and explained (coming soon)"],
                ["📋","Personal study plan","Lessons based on your real mistakes (coming soon)"],
                ["⚡","Priority support","We help you faster"],
              ].map(([e,t,d])=>(
                <div key={t} style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                  <span style={{ fontSize:17, lineHeight:1.3 }}>{e}</span>
                  <div>
                    <div style={{ color:"#f0fdf4", fontSize:14, fontWeight:600 }}>{t}</div>
                    <div style={{ color:"#6b7280", fontSize:12.5 }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign:"center", marginBottom:16 }}><span style={{ color:"#f0fdf4", fontSize:32, fontWeight:800 }}>2500₸</span><span style={{ color:"#6b7280", fontSize:15 }}> / month (~$5)</span></div>
            <a href="https://pay.kaspi.kz/pay/cwevqlzj" target="_blank" rel="noopener noreferrer" style={{ display:"block", width:"100%", padding:14, background:"linear-gradient(135deg, #4ade80, #22d3ee)", border:"none", borderRadius:12, color:"#0a0f0a", fontSize:15, fontWeight:700, cursor:"pointer", textAlign:"center", textDecoration:"none", boxSizing:"border-box" }}>
              Pay 2500₸ with Kaspi →
            </a>
            <div style={{ marginTop:16, padding:"12px 14px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, fontSize:13, color:"#9ca3af", lineHeight:1.6 }}>
              <div style={{ color:"#f0fdf4", fontWeight:600, marginBottom:6, fontSize:13 }}>After paying:</div>
              1. Enter <b style={{ color:"#4ade80" }}>2500₸</b> on the Kaspi page.<br/>
              2. Send your payment receipt to Telegram <b style={{ color:"#4ade80" }}>@sean_fan</b>.<br/>
              3. We'll activate your Premium (usually within a few hours).
            </div>
            <p style={{ textAlign:"center", color:"#4b5563", fontSize:12, marginTop:12 }}>Your free messages reset tomorrow.</p>
          </div>
        </div>
      )}

      {showModes && (
        <div onClick={()=>setShowModes(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:150, padding:20 }}>
          <div onClick={(e)=>e.stopPropagation()} style={{ width:"100%", maxWidth:440, maxHeight:"85vh", overflowY:"auto", background:"#0d130d", border:"1px solid rgba(74,222,128,0.2)", borderRadius:22, padding:28, animation:"fadeIn 0.3s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <h2 style={{ color:"#f0fdf4", fontSize:20, fontWeight:700 }}>🚀 Premium Modes</h2>
              <button onClick={()=>setShowModes(false)} style={{ background:"none", border:"none", color:"#9ca3af", fontSize:24, cursor:"pointer" }}>×</button>
            </div>
            <p style={{ color:"#6b7280", fontSize:13, marginBottom:20 }}>{isPremium ? "Choose a mode to start practising." : "These modes are part of Premium. Upgrade to unlock them."}</p>
            {[
              ["ielts","🎓","IELTS & TOEFL Practice","A speaking examiner asks exam questions and gives you band scores and feedback."],
              ["essay","✍️","Essay & Writing Check","Paste any text — get corrections, a band estimate, and improved sentences."],
              ["plan","📋","Personal Study Plan","A 7-day plan built around your level and your most common mistakes."],
            ].map(([m,e,t,d])=>(
              <div key={m} onClick={()=>startMode(m)} style={{ display:"flex", gap:14, alignItems:"flex-start", padding:16, marginBottom:12, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, cursor:"pointer", position:"relative" }}>
                <div style={{ fontSize:28 }}>{e}</div>
                <div style={{ flex:1 }}>
                  <div style={{ color:"#f0fdf4", fontSize:15, fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>{t} {!isPremium && <span style={{ fontSize:11, color:"#fbbf24" }}>🔒 Premium</span>}</div>
                  <div style={{ color:"#9ca3af", fontSize:13, marginTop:3, lineHeight:1.5 }}>{d}</div>
                </div>
              </div>
            ))}
            {!isPremium && (
              <button onClick={()=>{ setShowModes(false); setShowPaywall(true); }} style={{ width:"100%", marginTop:8, padding:13, background:"linear-gradient(135deg, #4ade80, #22d3ee)", border:"none", borderRadius:12, color:"#0a0f0a", fontSize:15, fontWeight:700, cursor:"pointer" }}>⭐ Unlock with Premium — 2500₸/mo</button>
            )}
          </div>
        </div>
      )}

      {showLegal && <Legal onClose={()=>setShowLegal(false)} />}
    </div>
  );
}

import { useState } from "react";
import { supabase } from "./supabase.js";

export default function NewPassword({ onDone }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const submit = async () => {
    setError(""); setInfo("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setInfo("Password updated! You're now logged in.");
      setTimeout(() => onDone(), 1200);
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7eedd", fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .auth-input:focus { border-color: #a96a32 !important; }
      `}</style>
      <div style={{ width: "100%", maxWidth: 400, animation: "fadeIn 0.5s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: "linear-gradient(135deg, #a96a32, #d2a25e)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "#fff8ec", marginBottom: 16, boxShadow: "0 0 40px rgba(169,106,50,0.3)" }}>T</div>
          <h1 style={{ color: "#43301d", fontSize: 24, fontWeight: 700 }}>Set a new password</h1>
          <p style={{ color: "#9a8264", fontSize: 14, marginTop: 6 }}>Choose a new password for your account.</p>
        </div>
        <div style={{ background: "rgba(120,85,45,0.03)", border: "1px solid rgba(120,85,45,0.08)", borderRadius: 18, padding: 24 }}>
          <label style={{ fontSize: 12, color: "#8a7256", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1 }}>New password</label>
          <input className="auth-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e)=>{ if(e.key==="Enter") submit(); }} placeholder="••••••••"
            style={{ width: "100%", marginTop: 6, marginBottom: 12, padding: "12px 14px", background: "rgba(120,85,45,0.04)", border: "1px solid rgba(120,85,45,0.1)", borderRadius: 10, color: "#43301d", fontSize: 15, fontFamily: "'DM Sans', sans-serif", outline: "none", transition: "border-color 0.2s" }} />
          {error && <div style={{ color: "#c0432e", fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}
          {info && <div style={{ color: "#a96a32", fontSize: 13, marginBottom: 12 }}>✅ {info}</div>}
          <button onClick={submit} disabled={loading}
            style={{ width: "100%", marginTop: 4, padding: "13px", background: "linear-gradient(135deg, #a96a32, #d2a25e)", border: "none", borderRadius: 12, color: "#fff8ec", fontSize: 15, fontWeight: 700, cursor: loading?"wait":"pointer", fontFamily: "'DM Sans', sans-serif", opacity: loading?0.6:1 }}>
            {loading ? "Saving..." : "Save new password"}
          </button>
        </div>
      </div>
    </div>
  );
}

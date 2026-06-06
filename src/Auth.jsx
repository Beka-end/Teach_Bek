import { useState } from "react";
import { supabase } from "./supabase.js";

export default function Auth() {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const submit = async () => {
    setError("");
    setInfo("");
    if (!email.trim() || !password.trim()) {
      setError("Please fill in email and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        setInfo("Account created! You can now log in.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        // onAuthStateChange in App will handle the rest
      }
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") submit();
  };

  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080d08", fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .auth-input:focus { border-color: #4ade80 !important; }
        .auth-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(74,222,128,0.4) !important; }
        .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
      <div style={{ width: "100%", maxWidth: 400, animation: "fadeIn 0.5s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: "linear-gradient(135deg, #4ade80, #22d3ee)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "#0a0f0a", marginBottom: 16, boxShadow: "0 0 40px rgba(74,222,128,0.3)" }}>T</div>
          <h1 style={{ color: "#f0fdf4", fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>TeachBek</h1>
          <p style={{ color: "#6b7280", fontSize: 14, marginTop: 6 }}>
            {mode === "login" ? "Welcome back! Log in to continue." : "Create an account to start learning."}
          </p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 24 }}>
          <label style={{ fontSize: 12, color: "#9ca3af", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1 }}>Email</label>
          <input className="auth-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={handleKey} placeholder="you@example.com"
            style={{ width: "100%", marginTop: 6, marginBottom: 16, padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#e2e8f0", fontSize: 15, fontFamily: "'DM Sans', sans-serif", outline: "none", transition: "border-color 0.2s" }} />

          <label style={{ fontSize: 12, color: "#9ca3af", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1 }}>Password</label>
          <input className="auth-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKey} placeholder="••••••••"
            style={{ width: "100%", marginTop: 6, marginBottom: 8, padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#e2e8f0", fontSize: 15, fontFamily: "'DM Sans', sans-serif", outline: "none", transition: "border-color 0.2s" }} />

          {error && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12, marginTop: 4 }}>⚠️ {error}</div>}
          {info && <div style={{ color: "#4ade80", fontSize: 13, marginBottom: 12, marginTop: 4 }}>✅ {info}</div>}

          <button className="auth-btn" onClick={submit} disabled={loading}
            style={{ width: "100%", marginTop: 8, padding: "13px", background: "linear-gradient(135deg, #4ade80, #22d3ee)", border: "none", borderRadius: 12, color: "#0a0f0a", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s", boxShadow: "0 4px 16px rgba(74,222,128,0.3)" }}>
            {loading ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, color: "#6b7280", fontSize: 14 }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setInfo(""); }}
            style={{ color: "#4ade80", cursor: "pointer", fontWeight: 600 }}>
            {mode === "login" ? "Sign up" : "Log in"}
          </span>
        </div>
      </div>
    </div>
  );
}

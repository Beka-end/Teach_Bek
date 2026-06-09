import { useState } from "react";
import { supabase } from "./supabase.js";

export default function Auth() {
  const [mode, setMode] = useState("login"); // login | signup | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [agreed, setAgreed] = useState(false);

  const submit = async () => {
    setError("");
    setInfo("");
    if (!email.trim()) { setError("Please enter your email."); return; }

    // Forgot password flow
    if (mode === "reset") {
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
        if (error) throw error;
        setInfo("If that email exists, we've sent a password reset link. Check your inbox.");
      } catch (e) {
        setError(e.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password.trim()) { setError("Please enter your password."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (mode === "signup" && !agreed) { setError("Please agree to the Terms and Privacy Policy to continue."); return; }
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
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7eedd", fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .auth-input:focus { border-color: #a96a32 !important; }
        .auth-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(169,106,50,0.4) !important; }
        .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
      <div style={{ width: "100%", maxWidth: 400, animation: "fadeIn 0.5s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: "linear-gradient(135deg, #a96a32, #d2a25e)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "#fff8ec", marginBottom: 16, boxShadow: "0 0 40px rgba(169,106,50,0.3)" }}>T</div>
          <h1 style={{ color: "#43301d", fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>TeachBek</h1>
          <p style={{ color: "#9a8264", fontSize: 14, marginTop: 6 }}>
            {mode === "login" ? "Welcome back! Log in to continue." : mode === "signup" ? "Create an account to start learning." : "Enter your email to reset your password."}
          </p>
        </div>

        <div style={{ background: "rgba(120,85,45,0.03)", border: "1px solid rgba(120,85,45,0.08)", borderRadius: 18, padding: 24 }}>
          <label style={{ fontSize: 12, color: "#8a7256", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1 }}>Email</label>
          <input className="auth-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={handleKey} placeholder="you@example.com"
            style={{ width: "100%", marginTop: 6, marginBottom: 16, padding: "12px 14px", background: "rgba(120,85,45,0.04)", border: "1px solid rgba(120,85,45,0.1)", borderRadius: 10, color: "#43301d", fontSize: 15, fontFamily: "'DM Sans', sans-serif", outline: "none", transition: "border-color 0.2s" }} />

          {mode !== "reset" && (
            <>
              <label style={{ fontSize: 12, color: "#8a7256", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: 1 }}>Password</label>
              <input className="auth-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKey} placeholder="••••••••"
                style={{ width: "100%", marginTop: 6, marginBottom: 8, padding: "12px 14px", background: "rgba(120,85,45,0.04)", border: "1px solid rgba(120,85,45,0.1)", borderRadius: 10, color: "#43301d", fontSize: 15, fontFamily: "'DM Sans', sans-serif", outline: "none", transition: "border-color 0.2s" }} />
            </>
          )}

          {mode === "login" && (
            <div onClick={() => { setMode("reset"); setError(""); setInfo(""); }} style={{ textAlign: "right", color: "#9a8264", fontSize: 13, cursor: "pointer", marginBottom: 4 }}>Forgot password?</div>
          )}

          {mode === "signup" && (
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 4, marginBottom: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                style={{ marginTop: 3, width: 16, height: 16, accentColor: "#a96a32", cursor: "pointer", flexShrink: 0 }} />
              <span style={{ color: "#8a7256", fontSize: 13, lineHeight: 1.5 }}>
                I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "#a96a32", textDecoration: "underline" }}>Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#a96a32", textDecoration: "underline" }}>Privacy Policy</a>.
              </span>
            </label>
          )}

          {error && <div style={{ color: "#c0432e", fontSize: 13, marginBottom: 12, marginTop: 4 }}>⚠️ {error}</div>}
          {info && <div style={{ color: "#a96a32", fontSize: 13, marginBottom: 12, marginTop: 4 }}>✅ {info}</div>}

          <button className="auth-btn" onClick={submit} disabled={loading}
            style={{ width: "100%", marginTop: 8, padding: "13px", background: "linear-gradient(135deg, #a96a32, #d2a25e)", border: "none", borderRadius: 12, color: "#fff8ec", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s", boxShadow: "0 4px 16px rgba(169,106,50,0.3)" }}>
            {loading ? "Please wait..." : mode === "login" ? "Log in" : mode === "signup" ? "Sign up" : "Send reset link"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, color: "#9a8264", fontSize: 14 }}>
          {mode === "reset" ? (
            <span onClick={() => { setMode("login"); setError(""); setInfo(""); }} style={{ color: "#a96a32", cursor: "pointer", fontWeight: 600 }}>← Back to log in</span>
          ) : (
            <>
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setInfo(""); }}
                style={{ color: "#a96a32", cursor: "pointer", fontWeight: 600 }}>
                {mode === "login" ? "Sign up" : "Log in"}
              </span>
            </>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: 24, color: "#ad9678", fontSize: 12, lineHeight: 1.6 }}>
          TeachBek uses AI and can make mistakes. It is a practice tool, not a substitute for a professional teacher or official exam.
        </p>
      </div>
    </div>
  );
}

// Public landing page — visible without logging in.
// This is what new visitors (and Paddle's verification bot) see first.

export default function Landing({ onStart }) {
  const green = "#4ade80";
  return (
    <div style={{ minHeight: "100vh", background: "#080d08", color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .ls-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(74,222,128,0.4); }
        .ls-card:hover { border-color: rgba(74,222,128,0.4); }
        a { color: inherit; }
      `}</style>

      {/* Nav */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "22px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: `linear-gradient(135deg, ${green}, #22d3ee)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#0a0f0a", fontSize: 18 }}>T</div>
          <span style={{ fontWeight: 700, fontSize: 19, color: "#f0fdf4" }}>TeachBek</span>
        </div>
        <button className="ls-btn" onClick={onStart} style={{ padding: "9px 20px", background: "rgba(74,222,128,0.1)", border: `1px solid ${green}`, borderRadius: 10, color: green, fontWeight: 600, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}>Log in</button>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 20px 40px", textAlign: "center", animation: "fadeUp 0.6s ease" }}>
        <div style={{ display: "inline-block", padding: "6px 14px", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 20, color: green, fontSize: 13, fontFamily: "'Space Mono', monospace", marginBottom: 24 }}>AI English Tutor</div>
        <h1 style={{ fontSize: 44, fontWeight: 800, color: "#f0fdf4", lineHeight: 1.1, letterSpacing: -1, marginBottom: 18 }}>
          Learn English by just<br />having a conversation
        </h1>
        <p style={{ fontSize: 18, color: "#9ca3af", lineHeight: 1.6, maxWidth: 560, margin: "0 auto 32px" }}>
          Chat with TeachBek, your friendly AI tutor. It gently corrects your mistakes, tracks your level, translates words you tap, and helps you prepare for IELTS &amp; TOEFL.
        </p>
        <button className="ls-btn" onClick={onStart} style={{ padding: "15px 36px", background: `linear-gradient(135deg, ${green}, #22d3ee)`, border: "none", borderRadius: 14, color: "#0a0f0a", fontSize: 17, fontWeight: 700, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 20px rgba(74,222,128,0.3)" }}>
          Start learning free →
        </button>
        <p style={{ marginTop: 14, fontSize: 13, color: "#4b5563", fontFamily: "'Space Mono', monospace" }}>Free to start · 20 messages/day · no card needed</p>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 20px 40px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {[
          ["💬", "Natural conversation", "Talk about anything and improve while you chat — no boring drills."],
          ["📝", "Instant corrections", "Every mistake is fixed and explained, with the grammar reason."],
          ["📊", "Level & progress", "See your level (A1–C2), daily streak, and your most common mistakes."],
          ["🌍", "Tap to translate", "Tap any word TeachBek writes to see its translation instantly."],
          ["🎓", "IELTS & TOEFL", "Premium exam practice with an AI examiner and band-score feedback."],
          ["✍️", "Essay check", "Premium: paste your writing and get detailed corrections."],
        ].map(([e, t, d]) => (
          <div key={t} className="ls-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 22, transition: "border-color 0.2s" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{e}</div>
            <div style={{ color: "#f0fdf4", fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{t}</div>
            <div style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.55 }}>{d}</div>
          </div>
        ))}
      </div>

      {/* Pricing teaser */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 20px 60px", textAlign: "center" }}>
        <h2 style={{ color: "#f0fdf4", fontSize: 26, fontWeight: 700, marginBottom: 10 }}>Simple pricing</h2>
        <p style={{ color: "#9ca3af", fontSize: 16, marginBottom: 24 }}>
          Start free. Upgrade to Premium for <strong style={{ color: "#f0fdf4" }}>2500₸ / month</strong> (about $5) to unlock unlimited messages, IELTS/TOEFL practice, essay check, and a personal study plan.
        </p>
        <button className="ls-btn" onClick={onStart} style={{ padding: "14px 32px", background: `linear-gradient(135deg, ${green}, #22d3ee)`, border: "none", borderRadius: 14, color: "#0a0f0a", fontSize: 16, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
          Get started →
        </button>
        <div style={{ marginTop: 20, fontSize: 14 }}>
          <a href="/pricing" style={{ color: green, textDecoration: "none", margin: "0 10px" }}>Pricing</a>
          <a href="/terms" style={{ color: green, textDecoration: "none", margin: "0 10px" }}>Terms</a>
          <a href="/privacy" style={{ color: green, textDecoration: "none", margin: "0 10px" }}>Privacy</a>
          <a href="/refund" style={{ color: green, textDecoration: "none", margin: "0 10px" }}>Refund</a>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "24px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", color: "#4b5563", fontSize: 13, fontFamily: "'Space Mono', monospace" }}>
        © 2026 TeachBek · AI can make mistakes · Contact: Telegram @sean_fan
      </div>
    </div>
  );
}

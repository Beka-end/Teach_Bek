import { useState } from "react";

// Quick 6-question English level test. Gives a fast "wow" result that users can act on.
// Each question has options; the index of difficulty roughly maps to CEFR levels.

const QUESTIONS = [
  {
    q: "Choose the correct sentence:",
    options: ["She go to school every day.", "She goes to school every day.", "She going to school every day."],
    answer: 1, level: "A1",
  },
  {
    q: "Fill the gap: I ___ coffee every morning.",
    options: ["drinks", "am drink", "drink"],
    answer: 2, level: "A2",
  },
  {
    q: "Pick the correct one:",
    options: ["I have lived here since 2019.", "I am living here since 2019.", "I live here since 2019."],
    answer: 0, level: "B1",
  },
  {
    q: "Choose the best word: The results were ___ than we expected.",
    options: ["more good", "better", "gooder"],
    answer: 1, level: "B1",
  },
  {
    q: "Which sentence is correct?",
    options: ["If I had known, I would have come.", "If I would know, I had come.", "If I knew, I would came."],
    answer: 0, level: "B2",
  },
  {
    q: "Pick the most natural sentence:",
    options: ["Hardly I had arrived when it started raining.", "Hardly had I arrived when it started raining.", "Hardly I arrived when it start raining."],
    answer: 1, level: "C1",
  },
];

const LEVEL_DESC = { A1: "Beginner", A2: "Elementary", B1: "Intermediate", B2: "Upper-Intermediate", C1: "Advanced", C2: "Proficient" };
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

function scoreToLevel(correctLevels) {
  // correctLevels: array of CEFR levels the user answered correctly.
  if (correctLevels.length === 0) return "A1";
  const idxs = correctLevels.map((l) => LEVELS.indexOf(l));
  const max = Math.max(...idxs);
  return LEVELS[max];
}

export default function LevelTest({ onDone, onSkip }) {
  const [step, setStep] = useState(0);
  const [correct, setCorrect] = useState([]);
  const [picked, setPicked] = useState(null);
  const [finished, setFinished] = useState(false);

  const choco = "#a96a32";
  const q = QUESTIONS[step];

  const choose = (i) => {
    if (picked !== null) return;
    setPicked(i);
    const isRight = i === q.answer;
    const nextCorrect = isRight ? [...correct, q.level] : correct;
    setTimeout(() => {
      if (isRight) setCorrect(nextCorrect);
      if (step < QUESTIONS.length - 1) {
        setStep(step + 1);
        setPicked(null);
      } else {
        setCorrect(nextCorrect);
        setFinished(true);
      }
    }, 650);
  };

  const result = scoreToLevel(correct);

  if (finished) {
    return (
      <div style={shell}>
        <style>{css}</style>
        <div style={{ ...card, textAlign: "center", animation: "pop 0.5s ease" }}>
          <div style={{ fontSize: 13, color: "#9a8264", fontFamily: "'Space Mono', monospace", letterSpacing: 1.5, textTransform: "uppercase" }}>Your English level</div>
          <div style={{ fontSize: 72, fontWeight: 800, color: choco, lineHeight: 1.1, margin: "10px 0" }}>{result}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#43301d" }}>{LEVEL_DESC[result]}</div>
          <div style={{ display: "flex", gap: 4, justifyContent: "center", margin: "22px 0" }}>
            {LEVELS.map((l) => (
              <div key={l} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ height: 8, borderRadius: 4, background: LEVELS.indexOf(l) <= LEVELS.indexOf(result) ? choco : "rgba(120,85,45,0.15)" }} />
                <div style={{ fontSize: 10, color: l === result ? choco : "#ad9678", marginTop: 4, fontFamily: "'Space Mono', monospace" }}>{l}</div>
              </div>
            ))}
          </div>
          <p style={{ color: "#9a8264", fontSize: 14, lineHeight: 1.6, marginBottom: 22 }}>
            This is a quick estimate. Chat with Bek and he'll track your real level as you go — and push you to the next one. 💪
          </p>
          <button onClick={() => onDone(result)} style={btnPrimary}>Start learning with Bek →</button>
        </div>
      </div>
    );
  }

  return (
    <div style={shell}>
      <style>{css}</style>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: "#9a8264", fontFamily: "'Space Mono', monospace" }}>Question {step + 1} / {QUESTIONS.length}</div>
          <button onClick={onSkip} style={{ background: "none", border: "none", color: "#ad9678", fontSize: 13, cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>Skip test</button>
        </div>
        <div style={{ height: 6, borderRadius: 4, background: "rgba(120,85,45,0.12)", marginBottom: 24, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(step / QUESTIONS.length) * 100}%`, background: `linear-gradient(90deg, ${choco}, #d2a25e)`, borderRadius: 4, transition: "width 0.3s" }} />
        </div>

        <h2 style={{ color: "#43301d", fontSize: 20, fontWeight: 700, marginBottom: 20, lineHeight: 1.4 }}>{q.q}</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {q.options.map((opt, i) => {
            let bg = "#fffaf0", border = "1px solid rgba(120,85,45,0.15)", color = "#43301d";
            if (picked !== null) {
              if (i === q.answer) { bg = "rgba(169,106,50,0.12)"; border = `1px solid ${choco}`; }
              else if (i === picked) { bg = "rgba(192,67,46,0.1)"; border = "1px solid #c0432e"; }
            }
            return (
              <button key={i} onClick={() => choose(i)} disabled={picked !== null}
                style={{ textAlign: "left", padding: "14px 18px", background: bg, border, borderRadius: 12, color, fontSize: 15, cursor: picked !== null ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s", lineHeight: 1.4 }}>
                {opt}
                {picked !== null && i === q.answer && <span style={{ float: "right", color: choco }}>✓</span>}
                {picked !== null && i === picked && i !== q.answer && <span style={{ float: "right", color: "#c0432e" }}>✕</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const shell = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(1000px 500px at 80% -10%, rgba(210,162,94,0.10), transparent 60%), #f7eedd", fontFamily: "'DM Sans', sans-serif", padding: 20 };
const card = { width: "100%", maxWidth: 460, background: "#efe0c2", border: "1px solid rgba(169,106,50,0.2)", borderRadius: 22, padding: 28, boxShadow: "0 12px 40px rgba(120,85,45,0.15)" };
const btnPrimary = { width: "100%", padding: 14, background: "linear-gradient(135deg, #a96a32, #d2a25e)", border: "none", borderRadius: 14, color: "#fff8ec", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" };
const css = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
@keyframes pop { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }`;

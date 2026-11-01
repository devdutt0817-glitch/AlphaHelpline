(() => {
  const chat = document.getElementById("chat");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const sendBtn = document.getElementById("sendBtn");
  const micBtn = document.getElementById("micBtn");
  const reactor = document.getElementById("reactor");
  const statusText = document.getElementById("statusText");
  const speakToggle = document.getElementById("speakToggle");
  const langSelect = document.getElementById("langSelect");
  const clearBtn = document.getElementById("clearBtn");

  const GREETING = "Good day, sir. All systems are online. How may I assist you?";
  const KEY = "jarvis_history_v1";

  let history = load();
  let busy = false;

  // ---------- helpers ----------
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(history.slice(-40))); } catch {}
  }
  function setState(state, text) {
    reactor.classList.remove("listening", "thinking", "speaking");
    if (state) reactor.classList.add(state);
    statusText.textContent = text;
  }
  function addMsg(role, text, extraClass = "") {
    const wrap = document.createElement("div");
    wrap.className = `msg ${role} ${extraClass}`.trim();
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = role === "user" ? "YOU" : "JARVIS";
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;
    wrap.append(label, bubble);
    chat.appendChild(wrap);
    chat.scrollTop = chat.scrollHeight;
    return { wrap, bubble };
  }

  // restore previous chat
  history.forEach((m) => addMsg(m.role === "user" ? "user" : "bot", m.content));

  // ---------- text to speech ----------
  let voices = [];
  function loadVoices() { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; }
  if ("speechSynthesis" in window) {
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }
  function pickVoice(text) {
    const hindi = /[ऀ-ॿ]/.test(text);
    if (hindi) return voices.find((v) => v.lang.startsWith("hi")) || null;
    return (
      voices.find((v) => /en-GB/i.test(v.lang) && /male|daniel|google uk english male/i.test(v.name)) ||
      voices.find((v) => /en-GB/i.test(v.lang)) ||
      voices.find((v) => v.lang.startsWith("en")) ||
      null
    );
  }
  function speak(text) {
    if (!speakToggle.checked || !("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(text);
    if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = 1;
    u.pitch = 0.9;
    u.onstart = () => setState("speaking", "SPEAKING");
    u.onend = u.onerror = () => setState(null, "ONLINE");
    speechSynthesis.speak(u);
  }
  speakToggle.addEventListener("change", () => {
    if (!speakToggle.checked && "speechSynthesis" in window) speechSynthesis.cancel();
  });

  // ---------- speech to text ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recog = null;
  let listening = false;

  if (!SR) {
    micBtn.disabled = true;
    micBtn.title = "Voice input is not supported in this browser (try Chrome / Edge)";
    micBtn.style.opacity = 0.4;
  } else {
    micBtn.addEventListener("click", () => {
      if (listening) { recog && recog.stop(); return; }
      if ("speechSynthesis" in window) speechSynthesis.cancel();
      recog = new SR();
      recog.lang = langSelect.value;
      recog.interimResults = true;
      recog.maxAlternatives = 1;

      recog.onstart = () => {
        listening = true;
        micBtn.classList.add("active");
        setState("listening", "LISTENING");
      };
      recog.onresult = (e) => {
        let t = "";
        for (const r of e.results) t += r[0].transcript;
        input.value = t;
        if (e.results[e.results.length - 1].isFinal) {
          // auto-send when user finishes speaking
          setTimeout(() => form.requestSubmit(), 150);
        }
      };
      recog.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          addMsg("bot", "Microphone access denied, sir. Browser ki address bar me mic permission allow kijiye.", "error");
        }
      };
      recog.onend = () => {
        listening = false;
        micBtn.classList.remove("active");
        if (!busy) setState(null, "ONLINE");
      };
      try { recog.start(); } catch {}
    });
  }

  // ---------- send ----------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;

    busy = true;
    sendBtn.disabled = true;
    input.value = "";
    if (recog && listening) recog.stop();
    if ("speechSynthesis" in window) speechSynthesis.cancel();

    addMsg("user", text);
    history.push({ role: "user", content: text });
    save();

    const pending = addMsg("bot", "", "typing");
    setState("thinking", "PROCESSING");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);

      pending.wrap.classList.remove("typing");
      await typewrite(pending.bubble, data.reply);
      history.push({ role: "assistant", content: data.reply });
      save();
      speak(data.reply);
      if (!speakToggle.checked) setState(null, "ONLINE");
    } catch (err) {
      pending.wrap.classList.remove("typing");
      pending.wrap.classList.add("error");
      pending.bubble.textContent = `Apologies, sir. ${err.message}`;
      // failed turn ko history se hata do taaki next request clean rahe
      history.pop();
      save();
      setState(null, "ERROR");
      setTimeout(() => setState(null, "ONLINE"), 2500);
    } finally {
      busy = false;
      sendBtn.disabled = false;
      input.focus();
    }
  });

  function typewrite(el, text) {
    return new Promise((resolve) => {
      let i = 0;
      const step = Math.max(1, Math.ceil(text.length / 180));
      const timer = setInterval(() => {
        i += step;
        el.textContent = text.slice(0, i);
        chat.scrollTop = chat.scrollHeight;
        if (i >= text.length) { clearInterval(timer); el.textContent = text; resolve(); }
      }, 16);
    });
  }

  clearBtn.addEventListener("click", () => {
    history = [];
    save();
    chat.innerHTML = "";
    addMsg("bot", GREETING);
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    setState(null, "ONLINE");
  });
})();

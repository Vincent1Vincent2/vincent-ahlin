// ── CONTACT ───────────────────────────────────────────────────────────────────
// Drives the phone chat UI on contact.html.
// Conversation flows through steps: greeting → type → name → subject → message → email → confirm → sent.
// Keyboard keys light up on physical keypress. Time display shows real time.
// Backend send is stubbed — wire up when hosting is decided.

const Contact = (() => {
  // ── STATE ──────────────────────────────────────────────────────────────────

  const state = {
    step: "greeting", // greeting | name | subject | message | email | confirm | sent
    name: "",
    subject: "", // "job" | "freelance"
    message: "",
    email: "",
  };

  // ── DOM REFS ───────────────────────────────────────────────────────────────

  let messagesEl, inputEl, sendBtn, inputRow, keyboardEl, timeEl;

  // ── TIME ───────────────────────────────────────────────────────────────────

  function updateTime() {
    if (!timeEl) return;
    const now = new Date();
    const h = now.getHours().toString().padStart(2, "0");
    const m = now.getMinutes().toString().padStart(2, "0");
    timeEl.textContent = `${h}:${m}`;
  }

  function startClock() {
    updateTime();
    // Tick at the next whole minute then every 60s
    const now = new Date();
    const msToNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    setTimeout(() => {
      updateTime();
      setInterval(updateTime, 60000);
    }, msToNextMinute);
  }

  // ── SCROLL ─────────────────────────────────────────────────────────────────

  function scrollToBottom() {
    if (!messagesEl) return;
    requestAnimationFrame(() => {
      messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: "smooth" });
    });
  }

  // ── BUBBLE FACTORIES ───────────────────────────────────────────────────────

  function addBubble(text, who, delayMs = 0) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const el = document.createElement("div");
        el.className = `bubble bubble--${who}`;
        el.textContent = text;
        messagesEl.appendChild(el);
        scrollToBottom();
        resolve(el);
      }, delayMs);
    });
  }

  function addTypingIndicator() {
    const el = document.createElement("div");
    el.className = "bubble bubble--typing";
    el.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;
    messagesEl.appendChild(el);
    scrollToBottom();
    return el;
  }

  // Vincent "types" then sends — shows typing indicator for duration then replaces with bubble
  function vincentTypes(text, typingMs = 1100) {
    return new Promise((resolve) => {
      const indicator = addTypingIndicator();
      setTimeout(() => {
        indicator.remove();
        addBubble(text, "Vincent").then(resolve);
      }, typingMs);
    });
  }

  // Chain multiple vincent messages with typing gaps
  async function vincentSequence(messages) {
    for (const [text, delay] of messages) {
      await vincentTypes(text, delay ?? 1000);
    }
  }

  function addOptions(options) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const wrap = document.createElement("div");
        wrap.className = "bubble-options";

        options.forEach(({ label, value }) => {
          const btn = document.createElement("button");
          btn.className = "bubble-option";
          btn.innerHTML = `<span class="bubble-option__dot"></span>${label}`;

          btn.addEventListener("click", () => {
            // Disable all options
            wrap.querySelectorAll(".bubble-option").forEach((b) => {
              b.disabled = true;
              b.classList.remove("is-selected");
            });
            btn.classList.add("is-selected");

            // Echo as user bubble after short delay
            setTimeout(() => {
              addBubble(label, "user");
              resolve(value);
            }, 200);
          });

          wrap.appendChild(btn);
        });

        messagesEl.appendChild(wrap);
        scrollToBottom();
      }, 400);
    });
  }

  // ── INPUT HELPERS ──────────────────────────────────────────────────────────

  function showInput(placeholder) {
    inputEl.setAttribute("data-placeholder", placeholder);
    inputEl.textContent = "";
    inputRow.classList.remove("is-hidden");
    sendBtn.setAttribute("disabled", "");
    setTimeout(() => inputEl.focus(), 50);
  }

  function hideInput() {
    inputRow.classList.add("is-hidden");
  }

  function getCurrentInput() {
    return inputEl.textContent.trim();
  }

  // ── CONVERSATION STEPS ─────────────────────────────────────────────────────

  async function stepGreeting() {
    hideInput();

    await vincentSequence([
      [
        "Hey — you made it to the contact page. Most people just close the tab 👀",
        1200,
      ],
      [
        "I'm Vincent. I build things that feel like they were made by a human, not assembled by a checklist.",
        1400,
      ],
      ["If you've got something worth talking about — I'm listening.", 1000],
    ]);

    await new Promise((r) => setTimeout(r, 400));
    await vincentTypes("What brings you here?", 900);

    const chosen = await addOptions([
      { label: "Job opportunity", value: "job" },
      { label: "Freelance work", value: "freelance" },
    ]);

    state.subject = chosen;
    stepAfterSubject();
  }

  async function stepAfterSubject() {
    const reaction =
      state.subject === "job"
        ? "Always open to hearing what's out there — especially if it's something worth getting excited about."
        : "Freelance is my favourite kind of chaos. Let's see what you've got.";

    await vincentTypes(reaction, 1100);
    await vincentTypes("Before we get into it — what's your name?", 900);

    showInput("Your name…");
    state.step = "name";
  }

  async function stepAfterName() {
    const name = getCurrentInput();
    if (!name) return;
    state.name = name;

    addBubble(name, "user");
    hideInput();

    const reactions = [
      `${name}. Good name. I'll remember that.`,
      `Nice to meet you, ${name}.`,
      `${name} — got it.`,
    ];
    const reaction = reactions[Math.floor(Math.random() * reactions.length)];

    await vincentTypes(reaction, 1000);

    const prompt =
      state.subject === "job"
        ? "Tell me about the role — what kind of work is it?"
        : "What's the project? Give me the short version.";

    await vincentTypes(prompt, 1000);

    showInput("Tell me more…");
    state.step = "message";
  }

  async function stepAfterMessage() {
    const msg = getCurrentInput();
    if (!msg) return;
    state.message = msg;

    addBubble(msg, "user");
    hideInput();

    const reactions = [
      "That sounds interesting.",
      "I like the sound of that.",
      "Okay, I'm intrigued.",
      "Good. That's exactly the kind of thing I want to hear about.",
    ];
    const reaction = reactions[Math.floor(Math.random() * reactions.length)];

    await vincentTypes(reaction, 1000);
    await vincentTypes(`Last thing, ${state.name} — where do I find you?`, 900);

    showInput("your@email.com");
    state.step = "email";
  }

  async function stepAfterEmail() {
    const email = getCurrentInput();
    if (!email || !email.includes("@")) {
      // Nudge without being rude
      await vincentTypes("That doesn't look quite right — try again?", 700);
      inputEl.textContent = "";
      inputEl.focus();
      return;
    }
    state.email = email;

    addBubble(email, "user");
    hideInput();

    await vincentTypes("Alright, let me read that back —", 900);

    const summary = `${state.name} · ${state.subject === "job" ? "Job opportunity" : "Freelance"}\n\n"${state.message}"\n\n📬 ${state.email}`;
    await vincentTypes(summary, 1200);
    await vincentTypes("That right?", 600);

    state.step = "confirm";
    showConfirm();
  }

  function showConfirm() {
    keyboardEl.classList.add("is-hidden");
    hideInput();

    const wrap = document.createElement("div");
    wrap.className = "phone__send-final";

    const sendBtn = document.createElement("button");
    sendBtn.className = "send-final-btn send-final-btn--primary";
    sendBtn.textContent = "Looks good — send it";

    const restartBtn = document.createElement("button");
    restartBtn.className = "send-final-btn send-final-btn--secondary";
    restartBtn.textContent = "Start over";

    sendBtn.addEventListener("click", stepSend);
    restartBtn.addEventListener("click", stepRestart);

    wrap.appendChild(sendBtn);
    wrap.appendChild(restartBtn);
    messagesEl.appendChild(wrap);
    scrollToBottom();
  }

  async function stepSend() {
    // Remove confirm buttons
    const confirmEl = messagesEl.querySelector(".phone__send-final");
    if (confirmEl) confirmEl.remove();

    await vincentTypes("Sending…", 600);

    // ── STUB: replace with real fetch when backend is ready ──────────────────
    const success = await sendMessage();
    // ────────────────────────────────────────────────────────────────────────

    if (success) {
      await vincentTypes("Sent. ✉️", 500);
      await vincentTypes(
        `I'll get back to you soon, ${state.name}. Talk then.`,
        1000,
      );
    } else {
      await vincentTypes(
        "Hm — something went wrong on my end. Try emailing me directly at vincent.ahlin@gmail.com",
        1200,
      );
    }

    state.step = "sent";
  }

  function stepRestart() {
    // Clear everything and restart
    messagesEl.innerHTML = "";
    keyboardEl.classList.remove("is-hidden");
    Object.assign(state, {
      step: "greeting",
      name: "",
      subject: "",
      message: "",
      email: "",
    });
    stepGreeting();
  }

  // ── SEND ──────────────────────────────────────────────────────────────────
  // The endpoint lives on Vercel — separate from GitHub Pages.
  // Replace VERCEL_URL with your actual deployed function URL.
  // e.g. https://your-project.vercel.app/api/contact

  const API_URL = "https://your-project.vercel.app/api/contact";

  async function sendMessage() {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.name,
          subject: state.subject,
          message: state.message,
          email: state.email,
        }),
      });
      return res.ok;
    } catch (err) {
      console.error("Contact send error:", err);
      return false;
    }
  }

  // ── SEND ON INPUT ──────────────────────────────────────────────────────────

  function handleSend() {
    const val = getCurrentInput();
    if (!val) return;

    if (state.step === "name") {
      stepAfterName();
      return;
    }
    if (state.step === "message") {
      stepAfterMessage();
      return;
    }
    if (state.step === "email") {
      stepAfterEmail();
      return;
    }
  }

  // ── PHYSICAL KEYBOARD ──────────────────────────────────────────────────────
  // Lights up the matching on-screen key when a physical key is pressed.

  function physicalKeyMap(key) {
    const k = key.toLowerCase();
    // Map special keys to data-key values
    if (k === " ") return "space";
    if (k === "backspace") return "backspace";
    if (k === "enter") return "return";
    if (k === "shift") return "shift";
    if (/^[a-z]$/.test(k)) return k;
    return null;
  }

  function flashKey(dataKey) {
    const key = keyboardEl.querySelector(`[data-key="${dataKey}"]`);
    if (!key) return;
    key.classList.add("is-pressed");
    setTimeout(() => key.classList.remove("is-pressed"), 120);
  }

  function setupPhysicalKeyboard() {
    document.addEventListener("keydown", (e) => {
      const mapped = physicalKeyMap(e.key);
      if (mapped) flashKey(mapped);
    });
  }

  // ── ON-SCREEN KEYBOARD ─────────────────────────────────────────────────────

  function setupOnScreenKeyboard() {
    keyboardEl.addEventListener("mousedown", (e) => {
      // Prevent input blur
      e.preventDefault();
    });

    keyboardEl.querySelectorAll(".kbd-key").forEach((key) => {
      key.addEventListener("click", () => {
        const k = key.dataset.key;
        const input = inputEl;

        // Flash
        key.classList.add("is-pressed");
        setTimeout(() => key.classList.remove("is-pressed"), 120);

        if (state.step === "sent") return;
        if (!inputRow.classList.contains("is-hidden")) {
          input.focus();
        }

        if (k === "backspace") {
          // Remove last character from contenteditable
          const text = input.textContent;
          input.textContent = text.slice(0, -1);
          // Move caret to end
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(input);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        } else if (k === "space") {
          input.textContent += " ";
        } else if (k === "return") {
          handleSend();
          return;
        } else if (k === "shift" || k === "123" || k === "emoji") {
          // No-op for now
          return;
        } else {
          // Regular character
          input.textContent += k;
        }

        // Caret to end
        const range = document.createRange();
        const sel = window.getSelection();
        if (input.childNodes.length) {
          range.selectNodeContents(input);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }

        // Update send button
        updateSendBtn();
      });
    });
  }

  // ── INPUT EVENTS ───────────────────────────────────────────────────────────

  function setupInput() {
    inputEl.addEventListener("input", updateSendBtn);

    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });
  }

  function updateSendBtn() {
    const hasContent = getCurrentInput().length > 0;
    if (hasContent) {
      sendBtn.removeAttribute("disabled");
    } else {
      sendBtn.setAttribute("disabled", "");
    }
  }

  function setupSendBtn() {
    sendBtn.addEventListener("click", handleSend);
  }

  // ── INIT ───────────────────────────────────────────────────────────────────

  function init() {
    messagesEl = document.getElementById("phone-messages");
    inputEl = document.getElementById("phone-input");
    sendBtn = document.getElementById("phone-send");
    inputRow = document.getElementById("phone-input-row");
    keyboardEl = document.getElementById("phone-keyboard");
    timeEl = document.getElementById("phone-time");

    startClock();
    setupInput();
    setupSendBtn();
    setupOnScreenKeyboard();
    setupPhysicalKeyboard();

    // Kick off the conversation after phone animates in
    setTimeout(stepGreeting, 600);
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", Contact.init);

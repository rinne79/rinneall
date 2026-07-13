/* FocusTube — Pomodoro timer that auto-plays/pauses a YouTube video,
   with a to-do list. Plain JS, no build step. */

(() => {
  "use strict";

  /* ------------------------------------------------------------------ *
   *  YouTube player
   * ------------------------------------------------------------------ */
  let player = null;
  let playerReady = false;
  let pendingVideoId = null;

  // Load the IFrame API script.
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);

  // The API calls this global once it has loaded.
  window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player("player", {
      height: "100%",
      width: "100%",
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
      events: {
        onReady: () => {
          playerReady = true;
          if (pendingVideoId) {
            player.cueVideoById(pendingVideoId);
            pendingVideoId = null;
          }
        },
      },
    });
  };

  // Pull a video id out of the many YouTube URL shapes (or a bare id).
  function parseVideoId(input) {
    if (!input) return null;
    const raw = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw; // already an id
    try {
      const url = new URL(raw);
      const host = url.hostname.replace(/^www\./, "");
      if (host === "youtu.be") return url.pathname.slice(1, 12) || null;
      if (host.endsWith("youtube.com")) {
        if (url.searchParams.get("v")) return url.searchParams.get("v");
        const m = url.pathname.match(/\/(embed|shorts|live|v)\/([a-zA-Z0-9_-]{11})/);
        if (m) return m[2];
      }
    } catch (_) {
      const m = raw.match(/[a-zA-Z0-9_-]{11}/);
      if (m) return m[0];
    }
    return null;
  }

  function loadVideo(input) {
    const id = parseVideoId(input);
    if (!id) {
      toast("Couldn't read that YouTube link — check it and try again.");
      return;
    }
    document.getElementById("playerPlaceholder").style.display = "none";
    if (playerReady && player) {
      player.cueVideoById(id);
    } else {
      pendingVideoId = id; // will load on ready
    }
    toast("Video loaded. Press Start to begin focusing.");
  }

  function playVideo() {
    if (playerReady && player && typeof player.playVideo === "function") player.playVideo();
  }
  function pauseVideo() {
    if (playerReady && player && typeof player.pauseVideo === "function") player.pauseVideo();
  }

  /* ------------------------------------------------------------------ *
   *  Pomodoro timer
   * ------------------------------------------------------------------ */
  const els = {
    card: document.getElementById("timerCard"),
    mode: document.getElementById("timerMode"),
    display: document.getElementById("timerDisplay"),
    status: document.getElementById("timerStatus"),
    startPause: document.getElementById("startPauseBtn"),
    skip: document.getElementById("skipBtn"),
    reset: document.getElementById("resetBtn"),
    dots: document.getElementById("sessionDots"),
    focusMin: document.getElementById("focusMin"),
    breakMin: document.getElementById("breakMin"),
    longBreakMin: document.getElementById("longBreakMin"),
    roundsBeforeLong: document.getElementById("roundsBeforeLong"),
    autoContinue: document.getElementById("autoContinue"),
  };

  const MODE = { FOCUS: "focus", SHORT: "short", LONG: "long" };

  const timer = {
    mode: MODE.FOCUS,
    remaining: 25 * 60, // seconds
    running: false,
    intervalId: null,
    completedFocus: 0, // focus sessions finished in the current long-break cycle
  };

  function cfg() {
    const n = (el, d) => {
      const v = parseInt(el.value, 10);
      return Number.isFinite(v) && v > 0 ? v : d;
    };
    return {
      focus: n(els.focusMin, 25) * 60,
      short: n(els.breakMin, 5) * 60,
      long: n(els.longBreakMin, 15) * 60,
      rounds: n(els.roundsBeforeLong, 4),
      auto: els.autoContinue.checked,
    };
  }

  function modeDuration(mode) {
    const c = cfg();
    if (mode === MODE.FOCUS) return c.focus;
    if (mode === MODE.SHORT) return c.short;
    return c.long;
  }

  function modeLabel(mode) {
    if (mode === MODE.FOCUS) return "Focus";
    if (mode === MODE.SHORT) return "Short Break";
    return "Long Break";
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function render() {
    els.display.textContent = formatTime(Math.max(0, timer.remaining));
    els.mode.textContent = modeLabel(timer.mode);
    els.card.classList.toggle("break", timer.mode !== MODE.FOCUS);
    els.startPause.textContent = timer.running ? "Pause" : "Start";
    document.title = `${formatTime(Math.max(0, timer.remaining))} · ${modeLabel(timer.mode)} — FocusTube`;
    renderDots();
  }

  function renderDots() {
    const rounds = cfg().rounds;
    els.dots.innerHTML = "";
    for (let i = 0; i < rounds; i++) {
      const d = document.createElement("span");
      d.className = "dot" + (i < timer.completedFocus ? " filled" : "");
      els.dots.appendChild(d);
    }
  }

  function setStatus(text) {
    els.status.textContent = text;
  }

  function tick() {
    timer.remaining -= 1;
    if (timer.remaining <= 0) {
      completeInterval();
    } else {
      render();
    }
  }

  function start() {
    if (timer.running) return;
    timer.running = true;
    timer.intervalId = setInterval(tick, 1000);
    if (timer.mode === MODE.FOCUS) {
      playVideo();
      setStatus("Focus time — video playing. Stay on task! 🎧");
    } else {
      pauseVideo();
      setStatus("Break time — video paused. Step away for a bit. ☕");
    }
    render();
  }

  function pause() {
    if (!timer.running) return;
    timer.running = false;
    clearInterval(timer.intervalId);
    timer.intervalId = null;
    pauseVideo();
    setStatus("Paused.");
    render();
  }

  function toggleStartPause() {
    timer.running ? pause() : start();
  }

  // Called when the current interval hits zero.
  function completeInterval() {
    clearInterval(timer.intervalId);
    timer.intervalId = null;
    timer.running = false;

    const finished = timer.mode;
    let next;

    if (finished === MODE.FOCUS) {
      timer.completedFocus += 1;
      pauseVideo();
      const c = cfg();
      next = timer.completedFocus >= c.rounds ? MODE.LONG : MODE.SHORT;
      if (next === MODE.LONG) timer.completedFocus = 0;
      notify("Focus session done! Time for a break. 🎉");
    } else {
      next = MODE.FOCUS;
      notify("Break over — back to focus! 💪");
    }

    timer.mode = next;
    timer.remaining = modeDuration(next);
    render();

    const c = cfg();
    if (c.auto) {
      start();
    } else {
      setStatus(`Up next: ${modeLabel(next)}. Press Start when ready.`);
    }
  }

  function skip() {
    // Jump straight to the end of the current interval.
    if (timer.intervalId) {
      clearInterval(timer.intervalId);
      timer.intervalId = null;
    }
    completeInterval();
  }

  function reset() {
    if (timer.intervalId) clearInterval(timer.intervalId);
    timer.intervalId = null;
    timer.running = false;
    timer.mode = MODE.FOCUS;
    timer.completedFocus = 0;
    timer.remaining = modeDuration(MODE.FOCUS);
    pauseVideo();
    setStatus("Ready — press Start to begin a focus session");
    render();
  }

  function notify(message) {
    toast(message);
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("FocusTube", { body: message });
    }
    // A short beep so you notice even if the tab is in the background.
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (_) {}
  }

  // If a duration setting changes while that mode is idle, reflect it.
  function onSettingsChange() {
    if (!timer.running) {
      timer.remaining = modeDuration(timer.mode);
    }
    render();
  }

  /* ------------------------------------------------------------------ *
   *  To-Do list (persisted in localStorage)
   * ------------------------------------------------------------------ */
  const TODO_KEY = "focustube.todos";
  const todoList = document.getElementById("todoList");
  const todoForm = document.getElementById("todoForm");
  const todoInput = document.getElementById("todoInput");
  const todoCount = document.getElementById("todoCount");

  let todos = loadTodos();

  function loadTodos() {
    try {
      return JSON.parse(localStorage.getItem(TODO_KEY)) || [];
    } catch (_) {
      return [];
    }
  }
  function saveTodos() {
    try {
      localStorage.setItem(TODO_KEY, JSON.stringify(todos));
    } catch (_) {}
  }

  function renderTodos() {
    todoList.innerHTML = "";
    if (todos.length === 0) {
      const li = document.createElement("li");
      li.className = "todo-empty";
      li.textContent = "Nothing yet — add your first task above.";
      todoList.appendChild(li);
    } else {
      todos.forEach((t) => {
        const li = document.createElement("li");
        li.className = "todo-item" + (t.done ? " done" : "");

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = t.done;
        cb.addEventListener("change", () => {
          t.done = cb.checked;
          saveTodos();
          renderTodos();
        });

        const span = document.createElement("span");
        span.className = "todo-text";
        span.textContent = t.text;
        span.addEventListener("click", () => {
          t.done = !t.done;
          saveTodos();
          renderTodos();
        });

        const del = document.createElement("button");
        del.className = "del";
        del.type = "button";
        del.setAttribute("aria-label", "Delete task");
        del.textContent = "✕";
        del.addEventListener("click", () => {
          todos = todos.filter((x) => x.id !== t.id);
          saveTodos();
          renderTodos();
        });

        li.append(cb, span, del);
        todoList.appendChild(li);
      });
    }
    const left = todos.filter((t) => !t.done).length;
    todoCount.textContent = `${left} left`;
  }

  todoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = todoInput.value.trim();
    if (!text) return;
    todos.push({ id: Date.now() + Math.random(), text, done: false });
    todoInput.value = "";
    saveTodos();
    renderTodos();
  });

  document.getElementById("clearDone").addEventListener("click", () => {
    todos = todos.filter((t) => !t.done);
    saveTodos();
    renderTodos();
  });

  /* ------------------------------------------------------------------ *
   *  Toast helper
   * ------------------------------------------------------------------ */
  const toastEl = document.getElementById("toast");
  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3000);
  }

  /* ------------------------------------------------------------------ *
   *  Wire up controls
   * ------------------------------------------------------------------ */
  document.getElementById("loadBtn").addEventListener("click", () => {
    loadVideo(document.getElementById("videoUrl").value);
  });
  document.getElementById("videoUrl").addEventListener("keydown", (e) => {
    if (e.key === "Enter") loadVideo(e.target.value);
  });

  els.startPause.addEventListener("click", () => {
    // Ask for notification permission on first interaction.
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    toggleStartPause();
  });
  els.skip.addEventListener("click", skip);
  els.reset.addEventListener("click", reset);

  [els.focusMin, els.breakMin, els.longBreakMin, els.roundsBeforeLong].forEach((el) =>
    el.addEventListener("change", onSettingsChange)
  );

  // Keyboard: space toggles start/pause (unless typing in a field).
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
      e.preventDefault();
      toggleStartPause();
    }
  });

  // Initial paint.
  timer.remaining = modeDuration(MODE.FOCUS);
  render();
  renderTodos();
})();

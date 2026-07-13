# 🍅 FocusTube

A focus app that plays a YouTube video (a long DJ mix, lo-fi stream, whatever
keeps you going) and **automatically pauses it on your Pomodoro breaks** —
25 minutes of focus, 5 minutes of rest — with a to-do list on the side.

## What it does

- **Load any YouTube video** by pasting its link. Works with `youtube.com/watch?v=…`,
  `youtu.be/…`, Shorts, live, and embed URLs, or a bare 11-character video ID.
- **Pomodoro timer** — 25 min focus / 5 min break by default, with a longer
  break every 4 focus sessions. The video **plays during focus** and **pauses
  during breaks**, all on its own.
- **Auto-continue** rolls straight into the next session (toggle it off if you
  prefer to press Start each time).
- **To-do list** — add tasks, check them off, clear completed. Saved in your
  browser via `localStorage`, so it persists across reloads.
- **Nudges** — a short beep + toast (and a desktop notification if you allow it)
  when a session ends.

## How to use

Just open `index.html` in any modern browser — no build step, no server needed.

1. Paste a YouTube link and press **Load**.
2. Press **Start** (or hit the spacebar). The video plays.
3. When the 25-minute focus block ends, the video pauses for your break, then
   resumes automatically for the next block.
4. Jot tasks in the to-do panel as they come to mind.

### Controls

| Action        | How |
|---------------|-----|
| Start / Pause | **Start** button or **Spacebar** |
| Skip interval | **Skip** button |
| Reset         | **Reset** button |
| Adjust times  | **Timer settings** at the bottom of the timer card |

## Files

- `index.html` — layout
- `style.css` — styling
- `app.js` — YouTube control, Pomodoro state machine, to-do list

## Notes

- Playback control uses the official YouTube IFrame Player API, so an internet
  connection is required to load the player.
- Some videos disable embedding; if a video won't play, try another link.

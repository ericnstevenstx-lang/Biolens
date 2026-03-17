*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:        #0a0a0a;
  --surface:   #111111;
  --surface2:  #1a1a1a;
  --border:    #2a2a2a;
  --text:      #f0f0f0;
  --muted:     #888888;
  --accent:    #22c55e;
  --warn:      #f59e0b;
  --danger:    #ef4444;
  --info:      #3b82f6;
  --radius:    8px;
  --radius-lg: 12px;
}

html { height: 100%; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 15px;
  line-height: 1.6;
  min-height: 100%;
}

a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

.container { max-width: 720px; margin: 0 auto; padding: 0 1.5rem; }

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.25rem 1.5rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.badge-green  { background: #14532d; color: #86efac; }
.badge-yellow { background: #451a03; color: #fcd34d; }
.badge-red    { background: #450a0a; color: #fca5a5; }
.badge-blue   { background: #1e3a5f; color: #93c5fd; }
.badge-gray   { background: #1c1c1c; color: #9ca3af; }

.score-bar {
  height: 6px;
  border-radius: 3px;
  background: var(--border);
  overflow: hidden;
}
.score-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}

button {
  cursor: pointer;
  border: none;
  font-family: inherit;
}

input {
  font-family: inherit;
  font-size: 1rem;
}

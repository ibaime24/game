// Save files on disk. The game reads and writes saves through localStorage as it always has; this mirrors every
// save into a real JSON file in the project's `saves/` folder (through a small endpoint on the Vite server, see
// vite.config.js), and on start-up brings the files back into the browser. So saves survive clearing the browser,
// another browser, another port — anything short of deleting the folder.
// Without the endpoint (a static build) it quietly does nothing, and localStorage alone keeps the saves.

const API = '/__saves';

export const SaveFiles = {
  available: false,

  /**
   * Bring saves on disk and saves in the browser into line: whichever copy of a slot is newer wins, on both
   * sides. `prefix` is the localStorage key prefix for save slots; `extra` maps file names to other keys
   * (settings). Resolves to true if anything in localStorage changed.
   */
  async sync(prefix, extra = {}) {
    let files;
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 1500);
      const res = await fetch(API, { signal: ctl.signal, cache: 'no-store' });
      clearTimeout(t);
      if (!res.ok) return false;
      files = await res.json();
      if (!Array.isArray(files)) return false;
    } catch {
      return false;
    }
    this.available = true;
    const keyOf = (name) => extra[name] ?? prefix + name;
    const stamp = (text) => { try { return JSON.parse(text).timestamp || 0; } catch { return -1; } };
    let changed = false;
    const onDisk = new Set();
    for (const { name, text } of files) {
      onDisk.add(name);
      const key = keyOf(name);
      const local = localStorage.getItem(key);
      if (local === text) continue;
      // the disk copy wins unless the browser holds a newer save of the same slot
      if (local == null || stamp(text) >= stamp(local)) {
        try { localStorage.setItem(key, text); changed = true; } catch { /* storage full: the file is still safe */ }
      } else this.write(name, local);
    }
    // saves made before there were save files: write them out now
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(prefix) && !onDisk.has(k.slice(prefix.length))) this.write(k.slice(prefix.length), localStorage.getItem(k));
    }
    for (const [name, key] of Object.entries(extra)) {
      const v = localStorage.getItem(key);
      if (v != null && !onDisk.has(name)) this.write(name, v);
    }
    return changed;
  },

  write(name, text) {
    if (!this.available || text == null) return;
    fetch(`${API}/${encodeURIComponent(name)}`, { method: 'PUT', body: text, headers: { 'Content-Type': 'application/json' }, keepalive: text.length < 60000 }).catch(() => {});
  },

  remove(name) {
    if (!this.available) return;
    fetch(`${API}/${encodeURIComponent(name)}`, { method: 'DELETE' }).catch(() => {});
  },
};

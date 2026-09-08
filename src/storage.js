function makeKey(key, shared) {
  return `${shared ? "shared" : "personal"}:${key}`;
}

window.storage = {
  async get(key, shared = false) {
    const raw = localStorage.getItem(makeKey(key, shared));
    if (raw === null) return null;
    return { key, value: raw, shared };
  },
  async set(key, value, shared = false) {
    localStorage.setItem(makeKey(key, shared), value);
    return { key, value, shared };
  },
  async delete(key, shared = false) {
    localStorage.removeItem(makeKey(key, shared));
    return { key, deleted: true, shared };
  },
  async list(prefix = "", shared = false) {
    const p = `${shared ? "shared" : "personal"}:${prefix}`;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(p)) keys.push(k.slice(p.length - prefix.length));
    }
    return { keys, prefix, shared };
  },
};
// src/utils/versionStore.js
// Version store: hybrid-friendly, auto-migrates old hybrid keys to the new structured format.
// Structure (stored under key "vc_store"):
// {
//   cleaning: {
//     global: [ { id, timestamp, data, meta } ],
//     columns: { colName: [ ... ] }
//   },
//   predictions: { ... },
//   dashboard: { ... }
// }
// Limits: keeps up to MAX_VERSIONS_PER_BUCKET versions.

const STORE_KEY = "vc_store_v2";
const LEGACY_PREFIX = "vc_"; // older hybrid keys like "vc_cleaning" or "vc_cleaning_col"
const TEMP_KEY = "vc_temp_v2";
const MAX_VERSIONS_PER_BUCKET = 30;

function tryParse(json, fallback = null) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function loadStore() {
  const raw = localStorage.getItem(STORE_KEY);
  let store = tryParse(raw, null);
  if (!store) {
    store = {};
    // attempt migration from legacy keys (hybrid)
    Object.keys(localStorage).forEach((k) => {
      if (!k.startsWith(LEGACY_PREFIX)) return;
      const name = k.slice(LEGACY_PREFIX.length); // e.g. "cleaning" or "cleaning_colname"
      const val = tryParse(localStorage.getItem(k), []);
      if (!val || !val.length) return;
      if (!store[name]) store[name] = { global: [], columns: {} };
      // if key includes '_' assume column suffix
      const parts = name.split("_");
      if (parts.length > 1) {
        const base = parts[0];
        const col = parts.slice(1).join("_");
        if (!store[base]) store[base] = { global: [], columns: {} };
        store[base].columns[col] = val.slice(0, MAX_VERSIONS_PER_BUCKET);
      } else {
        // treat as global array of snapshots
        store[name] = store[name] || { global: [], columns: {} };
        store[name].global = val.slice(0, MAX_VERSIONS_PER_BUCKET);
      }
      // note: we don't delete legacy keys to be safe
    });
  }
  return store;
}

function saveStore(store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn("versionStore: failed to save store", e);
  }
}

/**
 * create a version entry
 */
function createEntry(data, meta = {}) {
  return {
    id: `${Date.now()}-${Math.floor(Math.random() * 90000) + 10000}`,
    timestamp: new Date().toISOString(),
    data,
    meta,
  };
}

/**
 * Ensure a bucket exists for a type
 */
function ensureType(store, type) {
  if (!store[type]) store[type] = { global: [], columns: {} };
}

/**
 * Save a permanent version.
 * - type: string (e.g. 'cleaning')
 * - data: serializable object (snapshot)
 * - meta: { column?, rule?, note? }
 * If meta.column provided, saves under columns[column] and also in global.
 */
export function saveVersion(type, data, meta = {}) {
  if (!type) throw new Error("saveVersion requires a type");
  const store = loadStore();
  ensureType(store, type);

  const entry = createEntry(data, meta);

  // push to global
  store[type].global.unshift(entry);
  // push to column bucket if provided
  if (meta && meta.column) {
    const col = String(meta.column);
    store[type].columns[col] = store[type].columns[col] || [];
    store[type].columns[col].unshift(entry);
    // prune column bucket
    if (store[type].columns[col].length > MAX_VERSIONS_PER_BUCKET) {
      store[type].columns[col] = store[type].columns[col].slice(0, MAX_VERSIONS_PER_BUCKET);
    }
  }

  // prune global bucket
  if (store[type].global.length > MAX_VERSIONS_PER_BUCKET) {
    store[type].global = store[type].global.slice(0, MAX_VERSIONS_PER_BUCKET);
  }

  saveStore(store);
  return entry;
}

/**
 * Get versions:
 * - type required
 * - column optional -> returns column-specific array (newest first)
 * If type doesn't exist returns []
 */
export function getVersions(type, column = null) {
  if (!type) return [];
  const store = loadStore();
  ensureType(store, type);
  if (column) {
    return store[type].columns[String(column)] || [];
  }
  return store[type].global || [];
}

/**
 * Get latest version or null
 */
export function getLatest(type, column = null) {
  const vs = getVersions(type, column);
  return (vs && vs.length) ? vs[0] : null;
}

/**
 * Revert: return snapshot data (entry.data)
 * - type required
 * - indexOrId: if number -> index in the getVersions array (0 newest), if string -> id
 * - column optional
 *
 * This function DOES NOT mutate store except optionally recording a "revert marker" in meta if needed.
 */
export function revertVersion(type, indexOrId = 0, column = null) {
  if (!type) return null;
  const list = getVersions(type, column);
  if (!list || list.length === 0) return null;

  let entry = null;
  if (typeof indexOrId === "number") {
    if (indexOrId < 0 || indexOrId >= list.length) return null;
    entry = list[indexOrId];
  } else {
    entry = list.find((v) => v.id === indexOrId) || null;
  }

  if (!entry) return null;

  // Optionally: save current state into "global" as a "pre-revert snapshot" so user can undo
  try {
    const store = loadStore();
    ensureType(store, type);
    // store a short marker (we don't store data again to avoid duplication), but could store full snapshot if caller wants
    const marker = {
      id: `marker-${Date.now()}`,
      timestamp: new Date().toISOString(),
      data: null,
      meta: { note: `reverted to ${entry.id}`, refer: entry.id },
    };
    store[type].global.unshift(marker);
    if (store[type].global.length > MAX_VERSIONS_PER_BUCKET) {
      store[type].global = store[type].global.slice(0, MAX_VERSIONS_PER_BUCKET);
    }
    saveStore(store);
  } catch (e) {
    // ignore non-critical failure
  }

  return entry.data;
}

/**
 * Remove a version by id (optional admin operation)
 */
export function removeVersion(type, id, column = null) {
  if (!type || !id) return false;
  const store = loadStore();
  ensureType(store, type);
  if (column) {
    const col = String(column);
    store[type].columns[col] = (store[type].columns[col] || []).filter((v) => v.id !== id);
  } else {
    store[type].global = (store[type].global || []).filter((v) => v.id !== id);
  }
  saveStore(store);
  return true;
}

/**
 * Clear versions for type (or for a type+column)
 */
export function clearVersions(type, column = null) {
  if (!type) return;
  const store = loadStore();
  ensureType(store, type);
  if (column) {
    delete store[type].columns[String(column)];
  } else {
    store[type].global = [];
    store[type].columns = {};
  }
  saveStore(store);
}

/**
 * Temporary session-only versioning (fast undo during session)
 * uses sessionStorage under TEMP_KEY
 */
export function saveTempVersion(type, data, meta = {}) {
  try {
    const raw = sessionStorage.getItem(TEMP_KEY);
    const map = tryParse(raw, {}) || {};
    const key = meta && meta.column ? `${type}__${meta.column}` : type;
    map[key] = map[key] || [];
    const entry = createEntry(data, meta);
    map[key].unshift(entry);
    // cap small number for session
    map[key] = map[key].slice(0, 10);
    sessionStorage.setItem(TEMP_KEY, JSON.stringify(map));
    return entry;
  } catch (e) {
    console.warn("versionStore.saveTempVersion failed", e);
    return null;
  }
}

export function loadTempVersions() {
  const raw = sessionStorage.getItem(TEMP_KEY);
  return tryParse(raw, {}) || {};
}

/**
 * Expose store utilities for debugging
 */
export function _dumpStore() {
  return loadStore();
}

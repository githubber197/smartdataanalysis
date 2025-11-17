const STORAGE_KEY = "smartDataAnalytics_versions";
const TEMP_KEY = "smartDataAnalytics_temp";

/** Load saved (permanent) versions */
export function loadVersions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

/** Load temporary versions (cleared on refresh) */
export function loadTempVersions() {
  try {
    return JSON.parse(localStorage.getItem(TEMP_KEY)) || {};
  } catch {
    return {};
  }
}

/** Save permanent versions */
export function saveVersions(v) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
}

/** Save temporary versions */
export function saveTempVersions(v) {
  localStorage.setItem(TEMP_KEY, JSON.stringify(v));
}

/** 
 * Save a permanent version 
 */
export function saveVersion(type, data, column = null) {
  const versions = loadVersions();
  const key = column ? `${type}_${column}` : type;

  if (!versions[key]) versions[key] = [];
  versions[key].push({
    timestamp: new Date().toISOString(),
    data,
  });

  // keep only last 10
  if (versions[key].length > 10) versions[key].shift();

  saveVersions(versions);
}

/**
 * Save temporary version (cleared on refresh)
 */
export function saveTempVersion(type, data, column = null) {
  const versions = loadTempVersions();
  const key = column ? `${type}_${column}` : type;

  if (!versions[key]) versions[key] = [];
  versions[key].push({
    timestamp: new Date().toISOString(),
    data,
  });

  saveTempVersions(versions);
}

/**
 * Get versions (permanent + temporary merged)
 */
export function getVersions(type, column = null) {
  const key = column ? `${type}_${column}` : type;

  const permanent = loadVersions()[key] || [];
  const temporary = loadTempVersions()[key] || [];

  return [...permanent, ...temporary];
}

/**
 * Get latest version (temporary supersedes permanent)
 */
export function getLatestVersion(type, column = null) {
  const versions = getVersions(type, column);
  return versions.length ? versions[versions.length - 1].data : null;
}

/**
 * Revert to a specific version (index refers to merged list)
 */
export function revertVersion(type, index, column = null) {
  const key = column ? `${type}_${column}` : type;

  const permanent = loadVersions();
  const temp = loadTempVersions();

  const permList = permanent[key] || [];
  const tempList = temp[key] || [];

  const merged = [...permList, ...tempList];

  if (!merged[index]) return null;

  // New version becomes *temporary*
  const restored = merged[index].data;
  saveTempVersion(type, restored, column);

  return restored;
}

/** Clear ONLY temporary versions (auto-run on refresh) */
export function clearTempVersions() {
  localStorage.removeItem(TEMP_KEY);
}

/** Clear ALL versions, used on new upload */
export function clearAllVersions() {
  localStorage.removeItem(TEMP_KEY);
  localStorage.removeItem(STORAGE_KEY);
}

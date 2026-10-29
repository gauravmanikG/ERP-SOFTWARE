// Short-lived values passed from one screen to the next (for example the PR chosen for an RFQ).
// Kept in memory only: they are not written to the browser and last for the current page session.
const store = new Map();

export function setHandoff(key, value) {
  store.set(key, String(value));
}

export function getHandoff(key) {
  return store.has(key) ? store.get(key) : null;
}

export function removeHandoff(key) {
  store.delete(key);
}

// Tracks whether the last request reached the server, so the app can say "you are offline" without
// a native network module. A failed request with no response flips it off; any answer flips it on.
type Listener = (online: boolean) => void;
let online = true;
const listeners = new Set<Listener>();

export const isOnline = () => online;
export function setOnline(next: boolean) {
  if (next === online) return;
  online = next;
  listeners.forEach((l) => l(online));
}
export function subscribeConnectivity(listener: Listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

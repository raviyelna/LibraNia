export const DATA_EVENTS = {
  notes: 'librania:notes-updated',
  tags: 'librania:tags-updated',
} as const;

type DataEvent = typeof DATA_EVENTS[keyof typeof DATA_EVENTS];

export function emitDataUpdated(event: DataEvent): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(event));
  }
}

export function subscribeDataUpdated(event: DataEvent, callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  window.addEventListener(event, callback);
  return () => window.removeEventListener(event, callback);
}

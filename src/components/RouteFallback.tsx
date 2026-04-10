/** Minimal route suspense fallback — avoids importing heavy loaders in the app shell. */
export const RouteFallback = () => (
  <div
    className="flex min-h-[45vh] w-full items-center justify-center px-4 text-sm text-muted-foreground"
    role="status"
    aria-live="polite"
  >
    Loading…
  </div>
);

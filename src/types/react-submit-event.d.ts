// Augment React types to expose a `React.SubmitEvent` alias.
// This lets us type submit handlers as `(e: React.SubmitEvent)` across the codebase.
export {};

declare global {
  namespace React {
    // `SubmitEvent` is the DOM submit event type (lib.dom.d.ts)
    // We alias it into the React namespace for convenience/consistency.
    type SubmitEvent = globalThis.SubmitEvent;
  }
}


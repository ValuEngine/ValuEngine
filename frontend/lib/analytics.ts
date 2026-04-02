import posthog from 'posthog-js';

let initialized = false;

export function initPostHog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || initialized || typeof window === 'undefined') return;
  posthog.init(key, {
    api_host: 'https://eu.i.posthog.com',
    loaded: (ph) => { if (process.env.NODE_ENV === 'development') ph.opt_out_capturing(); },
  });
  initialized = true;
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && initialized) {
    posthog.capture(event, properties);
  }
}

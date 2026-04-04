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

// ── Typed GTM events ──────────────────────────────────────────────────────
export const gtmEvents = {
  pageView:               (page: string) => track('page_view', { page }),
  ctaClicked:             (cta: string) => track('cta_clicked', { cta }),
  signupStarted:          () => track('signup_started'),
  firstAnalysisStarted:   (ticker: string) => track('first_analysis_started', { ticker }),
  firstAnalysisCompleted: (ticker: string, verdict: string) => track('first_analysis_completed', { ticker, verdict }),
  proGateSeen:            (feature: string) => track('pro_gate_seen', { feature }),
  upgradeClicked:         (source: string) => track('upgrade_clicked', { source }),
  checkoutStarted:        (plan: string) => track('checkout_started', { plan }),
  checkoutCompleted:      (plan: string, amount: number) => track('checkout_completed', { plan, amount }),
  pdfExported:            (ticker: string) => track('pdf_exported', { ticker }),
  screenerUsed:           (queryLength: number) => track('screener_used', { query_length: queryLength }),
  portfolioPositionAdded: (ticker: string) => track('portfolio_position_added', { ticker }),
  alertCreated:           (ticker: string) => track('alert_created', { ticker }),
  shareClicked:           (ticker: string) => track('share_clicked', { ticker }),
};

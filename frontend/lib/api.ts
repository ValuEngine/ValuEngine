// Proxy via Next.js en dev (évite CORS) — URL directe en prod
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

// ── Retry + timeout helper ──────────────────────────────────────────────────
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 1500;
const FETCH_TIMEOUT_MS = 60_000; // 60s — analyse IA peut être longue

type RetryProgressCallback = (attempt: number, maxAttempts: number) => void;

async function fetchWithRetry(
  input: RequestInfo,
  init?: RequestInit & { onRetry?: RetryProgressCallback },
): Promise<Response> {
  const { onRetry, ...fetchInit } = init || {};
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(input, { ...fetchInit, signal: controller.signal });
      clearTimeout(timeout);

      // 502/503/504 = serveur en cold start → retry
      if (res.status >= 502 && res.status <= 504 && attempt < RETRY_COUNT) {
        onRetry?.(attempt + 1, RETRY_COUNT);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < RETRY_COUNT) {
        onRetry?.(attempt + 1, RETRY_COUNT);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }
  }
  throw lastError || new Error("Le serveur ne répond pas après plusieurs tentatives. Réessaie dans quelques secondes.");
}

// ── Warmup ping (réveille le backend Railway) ───────────────────────────────
let _warmupDone = false;
export function warmupBackend(): void {
  if (_warmupDone) return;
  _warmupDone = true;
  fetch(`${API_BASE}/health`, { method: "GET" }).catch(() => {});
}

export interface AnalyzeRequest {
  ticker: string;
  growth_rate: number;
  wacc: number;
  terminal_growth: number;
  horizon: number;
}

export interface AnalyzeResponse {
  company: {
    ticker: string; name: string; sector: string; industry: string;
    description: string; price: number; currency: string; exchange: string;
    market_cap: number; enterprise_value: number; shares_outstanding: number;
    revenue: number; ebitda: number; net_income: number; free_cash_flow: number;
    total_debt: number; total_cash: number; net_debt: number;
    pe_ratio: number | null; forward_pe: number | null; ev_ebitda: number | null;
    pb_ratio: number | null; roe: number | null; profit_margin: number | null;
    revenue_growth: number | null; beta: number | null; eps: number | null;
    dividend_yield: number | null;
  };
  dcf: {
    intrinsic_value: number; enterprise_value_dcf: number; equity_value: number;
    terminal_value_pv: number; fcf_projections: number[]; upside_pct: number;
  };
  sensitivity: {
    index: string[]; columns: string[]; values: number[][];
  };
  analysis: { bull_case: string; bear_case: string };
  verdict: "BUY" | "HOLD" | "SELL";
  verdict_label: string;
  suggested_wacc?: {
    suggested_wacc: number;
    cost_of_equity: number;
    cost_of_debt: number;
    equity_weight: number;
    debt_weight: number;
    beta_used: number;
    risk_free_rate: number;
    market_risk_premium: number;
  };
  sector_benchmarks?: {
    median_pe: number | null;
    median_gross_margin: number | null;
    median_net_margin: number | null;
    median_roe: number | null;
    peer_count: number;
    sector: string;
  } | null;
  share_id?: string;
  is_first_analysis?: boolean;
}

export interface SearchResult {
  ticker: string;
  name: string;
  sector: string;
  price: number;
}

export interface HistoryPoint {
  date: string;
  close: number;
  volume: number;
}

export async function searchTicker(ticker: string): Promise<SearchResult> {
  const res = await fetchWithRetry(`${API_BASE}/api/search/${encodeURIComponent(ticker)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Ticker introuvable" }));
    throw new Error(err.detail || `Erreur ${res.status}`);
  }
  return res.json();
}

export async function fetchHistory(ticker: string, period = "1y"): Promise<HistoryPoint[]> {
  const res = await fetchWithRetry(`${API_BASE}/api/history/${encodeURIComponent(ticker)}?period=${period}`);
  if (!res.ok) throw new Error(`Erreur historique ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function analyzeStock(
  req: AnalyzeRequest,
  onRetry?: RetryProgressCallback,
): Promise<AnalyzeResponse> {
  const res = await fetchWithRetry(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    onRetry,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erreur inconnue" }));
    throw new Error(err.detail || `Erreur ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch with Clerk auth token in Authorization header.
 * Use for endpoints that require authentication.
 */
export async function authedFetch(
  url: string,
  getToken: () => Promise<string | null>,
  init?: RequestInit,
): Promise<Response> {
  const token = await getToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...init, headers });
}

export function currencySymbol(ticker: string): string {
  return ticker.endsWith(".PA") || ticker.endsWith(".DE") || ticker.endsWith(".AS") || ticker.endsWith(".BR") || ticker.endsWith(".MI") ? "€" : "$";
}

export function fmt(n: number | null | undefined, prefix = "$"): string {
  if (n == null || isNaN(n)) return "N/A";
  const a = Math.abs(n);
  if (a >= 1e12) return `${prefix}${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9)  return `${prefix}${(n / 1e9).toFixed(1)}B`;
  if (a >= 1e6)  return `${prefix}${(n / 1e6).toFixed(1)}M`;
  return `${prefix}${n.toLocaleString("fr-FR")}`;
}

export function pct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "N/A";
  return `${n > 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;
}

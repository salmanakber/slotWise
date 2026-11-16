const APP_URL =
  (import.meta.env.VITE_SLOTWISE_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://slotwise.hindaralabs.com";

export { APP_URL };

export type Bootstrap = {
  site: {
    id: string;
    publicKey: string;
    name: string;
    timezone: string;
    currency: string;
    webflowSiteId: string | null;
    accent: string;
    themeKey: string;
  };
  counts: { services: number; staff: number; bookings: number };
  plan: { tier: string; name: string; priceMonthly: number };
  entitlements: {
    tier: string;
    label: string;
    priceLabel: string;
    eventsLimit: number | null;
    upgradeUrl: string;
    gates: Record<string, { allowed: boolean; upgradeLabel: string }>;
  };
};

export type Service = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  color: string | null;
  locationType: string;
  capacity: number;
  durationMin: number;
  priceCents: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  minNoticeMin: number;
  maxPerDay: number | null;
  active: boolean;
  featured: boolean;
};

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${APP_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { error?: string }).error || `Request failed (${res.status})`) as Error & {
      status?: number;
      upgrade?: boolean;
      data?: unknown;
    };
    err.status = res.status;
    err.upgrade = Boolean((data as { upgrade?: boolean }).upgrade);
    err.data = data;
    throw err;
  }
  return data as T;
}

export function bootstrap(params: { webflowSiteId?: string | null; publicKey?: string | null }) {
  const qs = new URLSearchParams();
  if (params.webflowSiteId) qs.set("webflowSiteId", params.webflowSiteId);
  if (params.publicKey) qs.set("publicKey", params.publicKey);
  return req<Bootstrap>(`/api/designer/bootstrap?${qs}`);
}

export function listServices(params: { webflowSiteId?: string | null; publicKey?: string | null }) {
  const qs = new URLSearchParams();
  if (params.webflowSiteId) qs.set("webflowSiteId", params.webflowSiteId);
  if (params.publicKey) qs.set("publicKey", params.publicKey);
  return req<{ services: Service[] }>(`/api/designer/services?${qs}`);
}

export function createService(body: Record<string, unknown>) {
  return req<{ service: Service }>("/api/designer/services", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteService(id: string) {
  return req<{ ok: boolean }>(`/api/designer/services?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function aiDescription(body: Record<string, unknown>) {
  return req<{ description: string; source: string }>("/api/designer/ai/description", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function importServices(body: Record<string, unknown>) {
  return req<{ created: number }>("/api/designer/services/import", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function exportUrl(params: {
  webflowSiteId?: string | null;
  publicKey?: string | null;
  format: "json" | "csv";
}) {
  const qs = new URLSearchParams({ format: params.format });
  if (params.webflowSiteId) qs.set("webflowSiteId", params.webflowSiteId);
  if (params.publicKey) qs.set("publicKey", params.publicKey);
  return `${APP_URL}/api/designer/services/export?${qs}`;
}

export function publishSite(body: Record<string, unknown>) {
  return req<{ ok: boolean }>("/api/designer/publish", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

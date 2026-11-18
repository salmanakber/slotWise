const APP_URL =
  (import.meta.env.VITE_SLOTWISE_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://slotwise.hindaralabs.com";

export { APP_URL };

export type Bootstrap = {
  uninstalled?: boolean;
  reason?: string;
  site: {
    id: string;
    publicKey: string;
    name: string;
    timezone?: string;
    currency?: string;
    webflowSiteId: string | null;
    accent?: string;
    themeKey?: string;
  };
  counts?: { services: number; staff: number; bookings: number; bookingsThisMonth?: number };
  plan?: { tier: string; name: string; priceMonthly: number };
  entitlements?: {
    tier: string;
    label: string;
    priceLabel: string;
    eventsLimit: number | null;
    bookingsLimit?: number | null;
    upgradeUrl: string;
    gates: Record<string, { allowed: boolean; upgradeLabel: string }>;
  };
  payments?: {
    connected: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    paymentMode: string;
    depositPercent: number;
    setupUrl: string;
  };
  apps?: Array<{
    provider: string;
    label: string;
    connected: boolean;
    ready: boolean;
    email: string | null;
  }>;
  activeEvents?: Array<{
    id: string;
    name: string;
    durationMin: number;
    priceCents: number;
    color: string | null;
    featured: boolean;
  }>;
  recentBookings?: Array<{
    id: string;
    reference: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string | null;
    notes?: string | null;
    serviceName: string;
    startsAt: string;
    endsAt?: string;
    amountCents?: number;
    depositCents?: number;
    currency?: string;
    status: string;
  }>;
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

export function uninstallWebflow(body: {
  webflowSiteId?: string | null;
  publicKey?: string | null;
}) {
  return req<{ ok: boolean; message?: string; customCodeCleared?: boolean }>(
    "/api/webflow/uninstall",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
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

export type DesignerTheme = {
  key: string;
  name: string;
  bg: string;
  panel: string;
  ink: string;
  line: string;
  accent: string;
  radius: number;
  font: string;
  button: "solid" | "outline" | "soft";
};

export type DesignerBranding = {
  themeKey: string;
  accent: string;
  inkColor?: string | null;
  radius: number;
  font: string;
  layout?: "INLINE" | "POPUP" | "FLOATING" | string;
  businessName?: string | null;
  theme?: DesignerTheme;
};

export function listThemes() {
  return req<{ themes: DesignerTheme[] }>("/api/designer/themes");
}

export function getBranding(params: { webflowSiteId?: string | null; publicKey?: string | null }) {
  const qs = new URLSearchParams();
  if (params.webflowSiteId) qs.set("webflowSiteId", params.webflowSiteId);
  if (params.publicKey) qs.set("publicKey", params.publicKey);
  return req<{ branding: DesignerBranding }>(`/api/designer/branding?${qs}`);
}

export function patchBranding(body: {
  webflowSiteId?: string | null;
  publicKey?: string | null;
  themeKey?: string;
  accent?: string;
  inkColor?: string | null;
  radius?: number;
  font?: string;
  layout?: "INLINE" | "POPUP" | "FLOATING";
}) {
  return req<{ branding: DesignerBranding }>("/api/designer/branding", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export type CalendarChatAnalytics = {
  totals: {
    sessionsAll: number;
    sessions7: number;
    sessions30: number;
    messagesAll: number;
    messages7: number;
    avgMessagesPerSession: number;
  };
  daily?: Array<{ date: string; label: string; sessions: number; questions: number }>;
  bySource?: Array<{ source: string; count: number }>;
  popularQuestions: Array<{ question: string; count: number }>;
  recentSessions: Array<{
    id: string;
    visitorKey: string;
    messageCount: number;
    startedAt: string;
    lastMessageAt: string;
    source: string;
    preview: string;
    lastAssistant: string | null;
  }>;
};

export type CalendarChatPayload = {
  enabled: boolean;
  publicKey: string;
  analytics: CalendarChatAnalytics;
  allowed?: boolean;
  planTier?: string;
  planLabel?: string;
  upgradeUrl?: string;
  upgradeLabel?: string;
};

export function getCalendarChat(params: { webflowSiteId?: string | null; publicKey?: string | null }) {
  const qs = new URLSearchParams();
  if (params.webflowSiteId) qs.set("webflowSiteId", params.webflowSiteId);
  if (params.publicKey) qs.set("publicKey", params.publicKey);
  return req<CalendarChatPayload>(`/api/designer/calendar-chat?${qs}`);
}

export function patchCalendarChat(body: {
  webflowSiteId?: string | null;
  publicKey?: string | null;
  enabled: boolean;
}) {
  return req<CalendarChatPayload>("/api/designer/calendar-chat", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export type AvailabilityDay = {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

export type TimeOffRow = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
};

export type AvailabilityPayload = {
  timezone: string;
  days: AvailabilityDay[];
  timeOff: TimeOffRow[];
};

export function getAvailability(params: { webflowSiteId?: string | null; publicKey?: string | null }) {
  const qs = new URLSearchParams();
  if (params.webflowSiteId) qs.set("webflowSiteId", params.webflowSiteId);
  if (params.publicKey) qs.set("publicKey", params.publicKey);
  return req<AvailabilityPayload>(`/api/designer/availability?${qs}`);
}

export function saveAvailabilityHours(body: {
  webflowSiteId?: string | null;
  publicKey?: string | null;
  days: AvailabilityDay[];
}) {
  return req<{ days: AvailabilityDay[]; timezone: string }>("/api/designer/availability", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function createAvailabilityBlock(body: {
  webflowSiteId?: string | null;
  publicKey?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string | null;
  allDay?: boolean;
}) {
  return req<{ timeOff: TimeOffRow }>("/api/designer/availability", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteAvailabilityBlock(params: {
  id: string;
  webflowSiteId?: string | null;
  publicKey?: string | null;
}) {
  const qs = new URLSearchParams({ id: params.id });
  if (params.webflowSiteId) qs.set("webflowSiteId", params.webflowSiteId);
  if (params.publicKey) qs.set("publicKey", params.publicKey);
  return req<{ ok: boolean }>(`/api/designer/availability?${qs}`, { method: "DELETE" });
}

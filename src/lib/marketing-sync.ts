import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

type BookingMarketingInput = {
  siteId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  serviceName: string;
  reference: string;
  startsAt: Date;
};

async function integration(siteId: string, provider: string) {
  const row = await prisma.siteIntegration.findUnique({
    where: { siteId_provider: { siteId, provider } },
  });
  if (!row || row.status !== "connected" || !row.accessTokenEncrypted) return null;
  const token = decryptSecret(row.accessTokenEncrypted);
  if (!token) return null;
  return { token, meta: row.meta as Record<string, unknown> | null, email: row.externalAccountEmail };
}

/** Push new booking contacts into Mailchimp when connected. */
export async function syncBookingMarketing(input: BookingMarketingInput) {
  const results: string[] = [];

  const mailchimp = await integration(input.siteId, "mailchimp");
  if (mailchimp) {
    try {
      const audienceId = String(mailchimp.meta?.audienceId || "");
      const oauthDc = typeof mailchimp.meta?.dc === "string" ? mailchimp.meta.dc : "";
      const apiEndpoint =
        typeof mailchimp.meta?.apiEndpoint === "string"
          ? mailchimp.meta.apiEndpoint.replace(/\/$/, "")
          : "";
      const parts = mailchimp.token.split("-");
      const keyDc = parts.length > 1 ? parts[parts.length - 1] : "";
      const dc = oauthDc || keyDc || "us1";
      const base = apiEndpoint || `https://${dc}.api.mailchimp.com`;
      const authHeader = oauthDc || apiEndpoint
        ? `OAuth ${mailchimp.token}`
        : `Bearer ${mailchimp.token}`;
      if (audienceId) {
        const res = await fetch(
          `${base}/3.0/lists/${encodeURIComponent(audienceId)}/members`,
          {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email_address: input.customerEmail,
              status: "subscribed",
              merge_fields: {
                FNAME: input.customerName.split(" ")[0] || input.customerName,
                LNAME: input.customerName.split(" ").slice(1).join(" ") || "",
              },
              tags: ["slotwise-booking", input.serviceName.slice(0, 40)],
            }),
          },
        );
        if (res.ok || res.status === 400) results.push("mailchimp");
        else console.error("[marketing:mailchimp]", await res.text());
      }
    } catch (e) {
      console.error("[marketing:mailchimp]", e);
    }
  }

  return results;
}

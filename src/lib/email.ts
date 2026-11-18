import { DEFAULT_EMAIL_FROM } from "@/lib/brand";
import { getPlatformSecrets } from "@/lib/platform-config";

function formatFrom(displayName: string, address: string) {
  const safeName = displayName.replace(/["<>]/g, "").trim() || "Bookings";
  return `${safeName} <${address}>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Premium HTML booking confirmation — table layout + inline CSS for email clients. */
export function bookingConfirmationHtml(input: {
  businessName: string;
  serviceName: string;
  whenLabel: string;
  reference: string;
  manageUrl: string;
  customerName?: string | null;
  meetingUrl?: string | null;
  meetingProvider?: string | null;
}) {
  const brand = escapeHtml(input.businessName);
  const service = escapeHtml(input.serviceName);
  const when = escapeHtml(input.whenLabel);
  const ref = escapeHtml(input.reference);
  const manage = escapeHtml(input.manageUrl);
  const hello = input.customerName?.trim()
    ? `Hi ${escapeHtml(input.customerName.trim())},`
    : "Hi there,";
  const meetLabel =
    input.meetingProvider === "zoom"
      ? "Join Zoom"
      : input.meetingProvider === "meet"
        ? "Join Google Meet"
        : "Join meeting";
  const meetUrl = input.meetingUrl ? escapeHtml(input.meetingUrl) : null;

  // Inline SVG icons as data-friendly HTML (email-safe geometric marks)
  const iconCheck = `<span style="display:inline-block;width:22px;height:22px;border-radius:999px;background:#178a58;color:#fff;font:700 13px/22px system-ui,sans-serif;text-align:center;">✓</span>`;
  const iconCal = `<span style="display:inline-block;width:36px;height:36px;border-radius:10px;background:linear-gradient(145deg,#f5a000,#e8890b);color:#1a1203;font:800 16px/36px system-ui,sans-serif;text-align:center;">📅</span>`;
  const iconLink = `<span style="display:inline-block;width:36px;height:36px;border-radius:10px;background:#eef1f6;color:#121a26;font:800 15px/36px system-ui,sans-serif;text-align:center;">↗</span>`;
  const iconTicket = `<span style="display:inline-block;width:36px;height:36px;border-radius:10px;background:#eef1f6;color:#121a26;font:800 15px/36px system-ui,sans-serif;text-align:center;">#</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Booking confirmed · ${ref}</title>
</head>
<body style="margin:0;padding:0;background:#eef1f6;font-family:Manrope,Figtree,Segoe UI,Helvetica,Arial,sans-serif;color:#121a26;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f6;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e3e8ef;box-shadow:0 18px 40px rgba(18,26,38,.08);">
          <tr>
            <td style="padding:22px 24px 10px;background:linear-gradient(135deg,#fff7e8 0%,#ffffff 55%);border-bottom:1px solid #eef1f6;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#f5a000;margin-bottom:6px;">Confirmed</div>
                    <div style="font-size:22px;font-weight:800;letter-spacing:-0.03em;line-height:1.2;color:#121a26;">${brand}</div>
                  </td>
                  <td align="right" style="vertical-align:middle;width:40px;">${iconCheck}</td>
                </tr>
              </table>
              <p style="margin:14px 0 0;font-size:14px;line-height:1.5;color:#6a7588;">${hello} your booking is locked in.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 24px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e3e8ef;border-radius:14px;overflow:hidden;">
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid #eef1f6;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="48" style="vertical-align:top;">${iconCal}</td>
                        <td style="vertical-align:top;">
                          <div style="font-size:11px;font-weight:700;color:#6a7588;text-transform:uppercase;letter-spacing:.06em;">When</div>
                          <div style="font-size:15px;font-weight:800;color:#121a26;margin-top:2px;">${when}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid #eef1f6;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="48" style="vertical-align:top;">
                          <span style="display:inline-block;width:36px;height:36px;border-radius:10px;background:#eef1f6;color:#121a26;font:800 14px/36px system-ui,sans-serif;text-align:center;">✦</span>
                        </td>
                        <td style="vertical-align:top;">
                          <div style="font-size:11px;font-weight:700;color:#6a7588;text-transform:uppercase;letter-spacing:.06em;">Service</div>
                          <div style="font-size:15px;font-weight:800;color:#121a26;margin-top:2px;">${service}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="48" style="vertical-align:top;">${iconTicket}</td>
                        <td style="vertical-align:top;">
                          <div style="font-size:11px;font-weight:700;color:#6a7588;text-transform:uppercase;letter-spacing:.06em;">Reference</div>
                          <div style="font-size:15px;font-weight:800;color:#121a26;margin-top:2px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${ref}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${
            meetUrl
              ? `<tr>
            <td style="padding:8px 24px 4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f8ff;border:1px solid #d6e4ff;border-radius:14px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="48">${iconLink}</td>
                        <td>
                          <div style="font-size:12px;font-weight:700;color:#2f80ed;">Video meeting ready</div>
                          <a href="${meetUrl}" style="display:inline-block;margin-top:8px;padding:10px 16px;border-radius:999px;background:#2f80ed;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;">${escapeHtml(meetLabel)}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
              : ""
          }

          <tr>
            <td style="padding:18px 24px 8px;" align="center">
              <a href="${manage}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:linear-gradient(145deg,#f5a000,#e8890b);color:#1a1203;font-size:14px;font-weight:800;text-decoration:none;box-shadow:0 10px 22px rgba(245,160,0,.28);">Manage or cancel booking</a>
              <div style="margin-top:10px;font-size:11.5px;color:#6a7588;">No login required · secure manage link</div>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 24px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eef1f6;">
                <tr>
                  <td style="padding-top:16px;font-size:12px;line-height:1.55;color:#6a7588;">
                    Need a change? Use the manage link above or reply to this email.
                    <br /><br />
                    <strong style="color:#121a26;">${brand}</strong>
                    <span style="color:#9aa5b5;"> · Powered by Slotwise</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <div style="max-width:560px;margin:14px auto 0;font-size:11px;color:#8b9bb0;text-align:center;">
          You’re receiving this because you booked with ${brand}.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Premium HTML alert for the site owner when a new booking lands. */
export function ownerBookingAlertHtml(input: {
  businessName: string;
  serviceName: string;
  whenLabel: string;
  reference: string;
  dashboardUrl: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  amountLabel?: string | null;
  meetingUrl?: string | null;
  meetingProvider?: string | null;
}) {
  const brand = escapeHtml(input.businessName);
  const service = escapeHtml(input.serviceName);
  const when = escapeHtml(input.whenLabel);
  const ref = escapeHtml(input.reference);
  const dash = escapeHtml(input.dashboardUrl);
  const name = escapeHtml(input.customerName);
  const email = escapeHtml(input.customerEmail);
  const phone = input.customerPhone?.trim()
    ? escapeHtml(input.customerPhone.trim())
    : null;
  const amount = input.amountLabel ? escapeHtml(input.amountLabel) : null;
  const meetLabel =
    input.meetingProvider === "zoom"
      ? "Zoom"
      : input.meetingProvider === "meet"
        ? "Google Meet"
        : "Meeting";
  const meetUrl = input.meetingUrl ? escapeHtml(input.meetingUrl) : null;

  const iconBell = `<span style="display:inline-block;width:22px;height:22px;border-radius:999px;background:#121a26;color:#f5a000;font:700 12px/22px system-ui,sans-serif;text-align:center;">●</span>`;
  const iconCal = `<span style="display:inline-block;width:36px;height:36px;border-radius:10px;background:linear-gradient(145deg,#f5a000,#e8890b);color:#1a1203;font:800 16px/36px system-ui,sans-serif;text-align:center;">📅</span>`;
  const iconPerson = `<span style="display:inline-block;width:36px;height:36px;border-radius:10px;background:#eef1f6;color:#121a26;font:800 15px/36px system-ui,sans-serif;text-align:center;">👤</span>`;
  const iconTicket = `<span style="display:inline-block;width:36px;height:36px;border-radius:10px;background:#eef1f6;color:#121a26;font:800 15px/36px system-ui,sans-serif;text-align:center;">#</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>New booking · ${ref}</title>
</head>
<body style="margin:0;padding:0;background:#eef1f6;font-family:Manrope,Figtree,Segoe UI,Helvetica,Arial,sans-serif;color:#121a26;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f6;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e3e8ef;box-shadow:0 18px 40px rgba(18,26,38,.08);">
          <tr>
            <td style="padding:22px 24px 12px;background:linear-gradient(135deg,#121a26 0%,#1e2a3a 100%);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <div style="font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#f5a000;margin-bottom:8px;">New booking</div>
                    <div style="font-size:22px;font-weight:800;letter-spacing:-0.03em;line-height:1.25;color:#ffffff;">Someone just booked with ${brand}</div>
                  </td>
                  <td align="right" style="vertical-align:middle;width:40px;">${iconBell}</td>
                </tr>
              </table>
              <p style="margin:14px 0 0;font-size:14px;line-height:1.5;color:#a8b4c4;">
                ${name} reserved <strong style="color:#ffffff;">${service}</strong> for ${when}.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 24px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e3e8ef;border-radius:14px;overflow:hidden;">
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid #eef1f6;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="48" style="vertical-align:top;">${iconCal}</td>
                        <td style="vertical-align:top;">
                          <div style="font-size:11px;font-weight:700;color:#6a7588;text-transform:uppercase;letter-spacing:.06em;">When</div>
                          <div style="font-size:15px;font-weight:800;color:#121a26;margin-top:2px;">${when}</div>
                          <div style="font-size:13px;font-weight:700;color:#6a7588;margin-top:4px;">${service}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid #eef1f6;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="48" style="vertical-align:top;">${iconPerson}</td>
                        <td style="vertical-align:top;">
                          <div style="font-size:11px;font-weight:700;color:#6a7588;text-transform:uppercase;letter-spacing:.06em;">Customer</div>
                          <div style="font-size:15px;font-weight:800;color:#121a26;margin-top:2px;">${name}</div>
                          <div style="margin-top:6px;font-size:13px;line-height:1.45;">
                            <a href="mailto:${email}" style="color:#2f80ed;font-weight:700;text-decoration:none;">${email}</a>
                            ${phone ? `<br /><a href="tel:${phone}" style="color:#6a7588;font-weight:600;text-decoration:none;">${phone}</a>` : ""}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="48" style="vertical-align:top;">${iconTicket}</td>
                        <td style="vertical-align:top;">
                          <div style="font-size:11px;font-weight:700;color:#6a7588;text-transform:uppercase;letter-spacing:.06em;">Reference</div>
                          <div style="font-size:15px;font-weight:800;color:#121a26;margin-top:2px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${ref}</div>
                          ${
                            amount
                              ? `<div style="margin-top:6px;font-size:13px;font-weight:700;color:#178a58;">${amount}</div>`
                              : ""
                          }
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${
            meetUrl
              ? `<tr>
            <td style="padding:8px 24px 4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f8ff;border:1px solid #d6e4ff;border-radius:14px;">
                <tr>
                  <td style="padding:14px 16px;font-size:13px;color:#2f80ed;font-weight:700;">
                    ${escapeHtml(meetLabel)} link created ·
                    <a href="${meetUrl}" style="color:#2f80ed;font-weight:800;">Open meeting</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
              : ""
          }

          <tr>
            <td style="padding:18px 24px 8px;" align="center">
              <a href="${dash}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:linear-gradient(145deg,#f5a000,#e8890b);color:#1a1203;font-size:14px;font-weight:800;text-decoration:none;box-shadow:0 10px 22px rgba(245,160,0,.28);">Open in workspace</a>
              <div style="margin-top:10px;font-size:11.5px;color:#6a7588;">Reply to this email to reach ${name} directly</div>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 24px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eef1f6;">
                <tr>
                  <td style="padding-top:16px;font-size:12px;line-height:1.55;color:#6a7588;">
                    You’re getting this because owner alerts are on for <strong style="color:#121a26;">${brand}</strong>.
                    <span style="color:#9aa5b5;"> · Powered by Slotwise</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendResendEmail(input: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}) {
  const secrets = await getPlatformSecrets();
  const apiKey =
    secrets.resendApiKey ||
    secrets.postmarkToken ||
    process.env.RESEND_API_KEY ||
    null;

  if (!apiKey) {
    console.info("[email:dev]", {
      from: input.from,
      replyTo: input.replyTo,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return { queued: false, mode: "log" as const };
  }

  try {
    const payload: Record<string, unknown> = {
      from: input.from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    };
    if (input.replyTo) payload.reply_to = input.replyTo;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("[email:resend]", await res.text());
      return { queued: false, mode: "error" as const };
    }
    return { queued: true, mode: "resend" as const };
  } catch (e) {
    console.error("[email:resend]", e);
    return { queued: false, mode: "error" as const };
  }
}

/**
 * Email delivery via Resend.
 * From address must be on a domain verified in Resend.
 * Prefer site-level fromEmail → platform emailFrom → DEFAULT.
 * Reply-To prefers the site owner's inbox so customers reply to the business.
 *
 * Sent when: a booking is created and site.notificationSettings.emailConfirm !== false
 * (see createBooking in lib/booking/create.ts).
 */
export async function sendBookingConfirmation(input: {
  to: string;
  reference: string;
  serviceName: string;
  whenLabel: string;
  manageUrl: string;
  businessName: string;
  fromEmail?: string | null;
  replyToEmail?: string | null;
  customerName?: string | null;
  meetingUrl?: string | null;
  meetingProvider?: string | null;
}) {
  const secrets = await getPlatformSecrets();
  const fromAddress =
    input.fromEmail?.trim() ||
    secrets.emailFrom?.trim() ||
    DEFAULT_EMAIL_FROM;
  const from = formatFrom(input.businessName, fromAddress);
  const replyTo = input.replyToEmail?.trim() || undefined;

  const subject = `${input.businessName}: booking ${input.reference} confirmed`;
  const text = [
    `Hi${input.customerName ? ` ${input.customerName}` : ""},`,
    ``,
    `Your ${input.serviceName} is confirmed for ${input.whenLabel}.`,
    `Reference: ${input.reference}`,
    input.meetingUrl ? `Meeting: ${input.meetingUrl}` : null,
    `Manage or cancel: ${input.manageUrl}`,
    ``,
    `— ${input.businessName}`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const html = bookingConfirmationHtml({
    businessName: input.businessName,
    serviceName: input.serviceName,
    whenLabel: input.whenLabel,
    reference: input.reference,
    manageUrl: input.manageUrl,
    customerName: input.customerName,
    meetingUrl: input.meetingUrl,
    meetingProvider: input.meetingProvider,
  });

  return sendResendEmail({
    from,
    to: input.to,
    subject,
    text,
    html,
    replyTo,
  });
}

/** Notify the site owner that a new booking was made. Reply-To = customer. */
export async function sendOwnerBookingAlert(input: {
  to: string;
  reference: string;
  serviceName: string;
  whenLabel: string;
  dashboardUrl: string;
  businessName: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  amountLabel?: string | null;
  fromEmail?: string | null;
  meetingUrl?: string | null;
  meetingProvider?: string | null;
}) {
  const secrets = await getPlatformSecrets();
  const fromAddress =
    input.fromEmail?.trim() ||
    secrets.emailFrom?.trim() ||
    DEFAULT_EMAIL_FROM;
  const from = formatFrom(input.businessName, fromAddress);

  const subject = `New booking ${input.reference} · ${input.customerName} · ${input.serviceName}`;
  const text = [
    `New booking for ${input.businessName}`,
    ``,
    `Customer: ${input.customerName}`,
    `Email: ${input.customerEmail}`,
    input.customerPhone ? `Phone: ${input.customerPhone}` : null,
    `Service: ${input.serviceName}`,
    `When: ${input.whenLabel}`,
    `Reference: ${input.reference}`,
    input.amountLabel ? `Amount: ${input.amountLabel}` : null,
    input.meetingUrl ? `Meeting: ${input.meetingUrl}` : null,
    `Workspace: ${input.dashboardUrl}`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const html = ownerBookingAlertHtml({
    businessName: input.businessName,
    serviceName: input.serviceName,
    whenLabel: input.whenLabel,
    reference: input.reference,
    dashboardUrl: input.dashboardUrl,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    amountLabel: input.amountLabel,
    meetingUrl: input.meetingUrl,
    meetingProvider: input.meetingProvider,
  });

  return sendResendEmail({
    from,
    to: input.to,
    subject,
    text,
    html,
    replyTo: input.customerEmail,
  });
}

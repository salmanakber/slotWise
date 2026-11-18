import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { requireDemoSite } from "@/lib/site-admin";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  emailConfirm: z.boolean().optional(),
  ownerEmailAlert: z.boolean().optional(),
  emailReminderHours: z.number().int().min(0).max(168).optional(),
  emailFollowUp: z.boolean().optional(),
  fromEmail: z.string().email().nullable().optional().or(z.literal("")),
  replyToEmail: z.string().email().nullable().optional().or(z.literal("")),
  smsEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  quietHours: z.string().max(40).optional(),
  tone: z.string().max(40).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const site = await requireDemoSite();
    if (!site.notificationSettings) {
      const created = await prisma.notificationSettings.create({ data: { siteId: site.id } });
      return NextResponse.json(created);
    }
    return NextResponse.json(site.notificationSettings);
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  try {
    const site = await requireDemoSite();
    const raw = parsed.data;
    const data = {
      ...raw,
      ...(raw.fromEmail !== undefined
        ? { fromEmail: raw.fromEmail === "" ? null : raw.fromEmail }
        : {}),
      ...(raw.replyToEmail !== undefined
        ? { replyToEmail: raw.replyToEmail === "" ? null : raw.replyToEmail }
        : {}),
    };
    const settings = await prisma.notificationSettings.upsert({
      where: { siteId: site.id },
      update: data,
      create: { siteId: site.id, ...data },
    });
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}

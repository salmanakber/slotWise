import { PlanTier, PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { FEATURE_FLAGS } from "../src/lib/features";

const prisma = new PrismaClient();

const OWNER_PASSWORD = process.env.SEED_PLATFORM_PASSWORD || "SlotwiseOwner!2026";
const STUDIO_PASSWORD = process.env.SEED_SITE_PASSWORD || "StudioOwner!2026";

async function main() {
  const plans = [
    {
      tier: PlanTier.FREE,
      name: "Free",
      priceMonthly: 0,
      priceYearly: 0,
      bookingsLimit: 25,
      staffLimit: 1,
      sitesLimit: 1,
      themesLimit: 2,
      features: ["email", "stripe_connect", "themes"],
    },
    {
      tier: PlanTier.PRO,
      name: "Pro",
      priceMonthly: 1500,
      priceYearly: 14400,
      bookingsLimit: 500,
      staffLimit: 3,
      sitesLimit: 1,
      themesLimit: 4,
      features: ["cal_sync", "noshow", "analytics"],
    },
    {
      tier: PlanTier.BUSINESS,
      name: "Business",
      priceMonthly: 3900,
      priceYearly: 37440,
      bookingsLimit: null,
      staffLimit: 15,
      sitesLimit: 3,
      themesLimit: 8,
      features: ["packages", "waitlist", "portal", "agency"],
    },
    {
      tier: PlanTier.AGENCY,
      name: "Agency",
      priceMonthly: 9900,
      priceYearly: 95040,
      bookingsLimit: null,
      staffLimit: null,
      sitesLimit: null,
      themesLimit: 8,
      features: ["agency", "white_label", "priority_support"],
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { tier: plan.tier },
      update: plan,
      create: plan,
    });
  }

  for (const flag of FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {
        label: flag.label,
        description: flag.description,
        phase: flag.phase,
        enabled: flag.enabled,
      },
      create: {
        key: flag.key,
        label: flag.label,
        description: flag.description,
        phase: flag.phase,
        enabled: flag.enabled,
      },
    });
  }

  await prisma.platformConfig.upsert({
    where: { id: "platform" },
    update: {},
    create: {
      id: "platform",
      stripeMode: "test",
      applicationFeePercent: 0,
      maintenanceMode: false,
    },
  });

  const ownerHash = await hash(OWNER_PASSWORD, 12);
  const studioHash = await hash(STUDIO_PASSWORD, 12);

  const owner = await prisma.user.upsert({
    where: { email: "owner@slotwise.app" },
    update: {
      role: Role.PLATFORM_OWNER,
      name: "Slotwise Owner",
      passwordHash: ownerHash,
    },
    create: {
      email: "owner@slotwise.app",
      name: "Slotwise Owner",
      role: Role.PLATFORM_OWNER,
      passwordHash: ownerHash,
    },
  });

  const studioOwner = await prisma.user.upsert({
    where: { email: "studio@slotwise.app" },
    update: {
      role: Role.WORKSPACE_OWNER,
      name: "Amira Khan",
      passwordHash: studioHash,
    },
    create: {
      email: "studio@slotwise.app",
      name: "Amira Khan",
      role: Role.WORKSPACE_OWNER,
      passwordHash: studioHash,
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { id: "demo-workspace" },
    update: { name: "Studio Nine Agency" },
    create: {
      id: "demo-workspace",
      name: "Studio Nine Agency",
    },
  });

  for (const [userId, role] of [
    [owner.id, Role.PLATFORM_OWNER],
    [studioOwner.id, Role.WORKSPACE_OWNER],
  ] as const) {
    await prisma.membership.upsert({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: workspace.id,
        },
      },
      update: { role },
      create: {
        userId,
        workspaceId: workspace.id,
        role,
      },
    });
  }

  const pro = await prisma.plan.findUniqueOrThrow({ where: { tier: PlanTier.PRO } });

  const site = await prisma.site.upsert({
    where: { publicKey: "sw_demo_studio_nine" },
    update: {
      name: "Studio Nine",
      workspaceId: workspace.id,
      planId: pro.id,
      timezone: "America/New_York",
      status: "ACTIVE",
    },
    create: {
      publicKey: "sw_demo_studio_nine",
      name: "Studio Nine",
      workspaceId: workspace.id,
      planId: pro.id,
      timezone: "America/New_York",
      currency: "USD",
      status: "ACTIVE",
    },
  });

  await prisma.branding.upsert({
    where: { siteId: site.id },
    update: {
      themeKey: "amber-light",
      accent: "#f5a000",
      businessName: "Studio Nine",
      showLoader: true,
      loaderStyle: "PULSE",
    },
    create: {
      siteId: site.id,
      themeKey: "amber-light",
      accent: "#f5a000",
      businessName: "Studio Nine",
      showLoader: true,
      loaderStyle: "PULSE",
    },
  });

  await prisma.notificationSettings.upsert({
    where: { siteId: site.id },
    update: {},
    create: { siteId: site.id },
  });

  await prisma.stripeAccount.upsert({
    where: { siteId: site.id },
    update: {},
    create: {
      siteId: site.id,
      paymentMode: "DEPOSIT",
      depositPercent: 30,
    },
  });

  const services = [
    { name: "Deep home clean", durationMin: 120, priceCents: 12000, description: "2 h · crew of 2" },
    { name: "Standard clean", durationMin: 90, priceCents: 8000, description: "1.5 h · 1 cleaner" },
    { name: "Move-out clean", durationMin: 180, priceCents: 21000, description: "3 h · crew of 3" },
  ];

  for (const [i, svc] of services.entries()) {
    const existing = await prisma.service.findFirst({
      where: { siteId: site.id, name: svc.name },
    });
    if (existing) {
      await prisma.service.update({ where: { id: existing.id }, data: { ...svc, sortOrder: i } });
    } else {
      await prisma.service.create({
        data: { siteId: site.id, ...svc, sortOrder: i, bufferAfterMin: 15 },
      });
    }
  }

  for (const name of ["Lena", "Omar", "Priya"]) {
    const existing = await prisma.staff.findFirst({ where: { siteId: site.id, name } });
    if (!existing) {
      await prisma.staff.create({ data: { siteId: site.id, name, active: true } });
    }
  }

  for (let day = 1; day <= 5; day++) {
    const found = await prisma.weeklyAvailability.findFirst({
      where: { siteId: site.id, staffId: null, dayOfWeek: day },
    });
    if (found) {
      await prisma.weeklyAvailability.update({
        where: { id: found.id },
        data: { enabled: true, startTime: "09:00", endTime: "17:00" },
      });
    } else {
      await prisma.weeklyAvailability.create({
        data: {
          siteId: site.id,
          dayOfWeek: day,
          enabled: true,
          startTime: "09:00",
          endTime: "17:00",
        },
      });
    }
  }

  const allServices = await prisma.service.findMany({ where: { siteId: site.id } });
  const allStaff = await prisma.staff.findMany({ where: { siteId: site.id } });
  const deep = allServices.find((s) => s.name.startsWith("Deep")) ?? allServices[0];
  const standard = allServices.find((s) => s.name.startsWith("Standard")) ?? allServices[0];
  const lena = allStaff.find((s) => s.name === "Lena") ?? allStaff[0];
  const omar = allStaff.find((s) => s.name === "Omar") ?? allStaff[0];

  const existingBookings = await prisma.booking.count({ where: { siteId: site.id } });
  if (existingBookings === 0 && deep && standard && lena && omar) {
    const base = new Date();
    base.setHours(9, 0, 0, 0);
    const samples = [
      {
        reference: "#1042",
        serviceId: deep.id,
        staffId: lena.id,
        customerName: "Amira K.",
        customerEmail: "amira@example.com",
        startsAt: new Date(base),
        status: "PAID" as const,
        amountCents: deep.priceCents,
        depositCents: deep.priceCents,
      },
      {
        reference: "#1043",
        serviceId: standard.id,
        staffId: omar.id,
        customerName: "Daniel R.",
        customerEmail: "daniel@example.com",
        startsAt: new Date(base.getTime() + 2.5 * 60 * 60 * 1000),
        status: "DEPOSIT" as const,
        amountCents: standard.priceCents,
        depositCents: Math.round(standard.priceCents * 0.3),
      },
    ];

    for (const sample of samples) {
      const endsAt = new Date(sample.startsAt.getTime() + (sample.serviceId === deep.id ? 120 : 90) * 60 * 1000);
      await prisma.booking.create({
        data: {
          reference: sample.reference,
          siteId: site.id,
          serviceId: sample.serviceId,
          status: sample.status,
          startsAt: sample.startsAt,
          endsAt,
          timezone: site.timezone,
          customerName: sample.customerName,
          customerEmail: sample.customerEmail,
          amountCents: sample.amountCents,
          depositCents: sample.depositCents,
          currency: "USD",
          staff: { create: [{ staffId: sample.staffId }] },
        },
      });
    }
  }

  console.log("Seeded Slotwise demo data");
  console.log({
    platformLogin: { email: owner.email, password: OWNER_PASSWORD },
    siteOwnerLogin: { email: studioOwner.email, password: STUDIO_PASSWORD },
    site: site.publicKey,
    workspace: workspace.name,
    bookUrl: `/book/${site.publicKey}`,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

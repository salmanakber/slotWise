import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canUse, entitlementsForTier } from "@/lib/plan-entitlements";
import { findSiteForDesigner } from "@/lib/designer/site";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "json";
  const site = await findSiteForDesigner({
    webflowSiteId: url.searchParams.get("webflowSiteId"),
    publicKey: url.searchParams.get("publicKey"),
  });
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404, headers: cors });

  const tier = site.plan?.tier ?? "FREE";
  if (!canUse(tier, "import_export")) {
    return NextResponse.json(
      {
        error: "Import / export requires Pro",
        upgrade: true,
        entitlements: entitlementsForTier(tier),
      },
      { status: 402, headers: cors },
    );
  }

  const services = await prisma.service.findMany({
    where: { siteId: site.id },
    orderBy: { sortOrder: "asc" },
  });

  if (format === "csv") {
    const header =
      "name,description,category,durationMin,priceCents,locationType,capacity,bufferBeforeMin,bufferAfterMin,active,featured";
    const rows = services.map((s) =>
      [
        csv(s.name),
        csv(s.description ?? ""),
        csv(s.category ?? ""),
        s.durationMin,
        s.priceCents,
        s.locationType,
        s.capacity,
        s.bufferBeforeMin,
        s.bufferAfterMin,
        s.active,
        s.featured,
      ].join(","),
    );
    return new NextResponse([header, ...rows].join("\n"), {
      headers: {
        ...cors,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="slotwise-events.csv"`,
      },
    });
  }

  return NextResponse.json(
    { exportedAt: new Date().toISOString(), site: site.publicKey, services },
    { headers: cors },
  );
}

function csv(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

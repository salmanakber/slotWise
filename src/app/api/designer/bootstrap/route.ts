import { NextResponse } from "next/server";
import { findSiteForDesigner, siteBootstrapPayload } from "@/lib/designer/site";

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
  const webflowSiteId = url.searchParams.get("webflowSiteId");
  const publicKey = url.searchParams.get("publicKey");

  const site = await findSiteForDesigner({ webflowSiteId, publicKey });
  if (!site) {
    return NextResponse.json(
      { error: "Site not connected", installUrl: "/api/webflow/install" },
      { status: 404, headers: cors },
    );
  }

  return NextResponse.json(siteBootstrapPayload(site), { headers: cors });
}

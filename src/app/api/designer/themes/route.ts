import { NextResponse } from "next/server";
import { THEMES } from "@/lib/themes";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function GET() {
  return NextResponse.json({ themes: THEMES }, { headers: cors });
}

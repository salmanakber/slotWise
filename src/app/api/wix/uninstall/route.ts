import { NextResponse } from "next/server";
import { z } from "zod";
import { deactivateWixInstance } from "@/lib/wix-provision";

const bodySchema = z.object({
  instanceId: z.string().min(8),
});

/**
 * Disconnect a Wix app instance from Slotwise.
 * Does not call Webflow APIs or modify WebflowToken rows.
 */
export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "instanceId required" }, { status: 400 });
  }

  try {
    const result = await deactivateWixInstance(parsed.data.instanceId);
    if (!result.ok) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      publicKey: result.publicKey,
      message: "Wix site deactivated. Publish/remove embed on Wix if still visible.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Uninstall failed" },
      { status: 500 },
    );
  }
}

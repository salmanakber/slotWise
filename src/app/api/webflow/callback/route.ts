import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";
import { Role } from "@prisma/client";
import { appOrigin, exchangeWebflowCode, webflowConfigured } from "@/lib/webflow";
import { provisionWebflowInstall } from "@/lib/webflow-provision";
import { prisma } from "@/lib/prisma";

function installRedirect(status: string, extra?: Record<string, string>) {
  const url = new URL(`${appOrigin()}/install`);
  url.searchParams.set("status", status);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  }
  return NextResponse.redirect(url.toString());
}

async function maybeSetSession(userId: string | null) {
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) return null;

  const token = await encode({
    token: {
      id: user.id,
      sub: user.id,
      email: user.email,
      name: user.name ?? user.email,
      role: user.role ?? Role.WORKSPACE_OWNER,
    },
    secret,
    maxAge: 60 * 60 * 24 * 7,
  });

  return token;
}

export async function GET(request: Request) {
  if (!(await webflowConfigured())) {
    return installRedirect("missing");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const jar = await cookies();
  const expected = jar.get("wf_oauth_state")?.value;

  if (error) {
    return installRedirect("denied");
  }

  // Marketplace installs may arrive without our start cookie if Install URL
  // points straight at Webflow OAuth. Accept a code when state is absent or matches.
  const stateOk = !expected || (Boolean(state) && state === expected);
  if (!code || !stateOk) {
    return installRedirect("denied");
  }

  try {
    const token = await exchangeWebflowCode(code);
    const provisioned = await provisionWebflowInstall(token);
    const primary = provisioned.sites[0];

    const res = installRedirect("connected", {
      site: primary?.publicKey || "",
      name: primary?.name || "your site",
    });

    res.cookies.set("wf_oauth_state", "", { path: "/", maxAge: 0 });
    res.cookies.set("wf_oauth_flow", "", { path: "/", maxAge: 0 });

    // Soft-login so opening dashboard later works — not required for Designer embed.
    const sessionToken = await maybeSetSession(provisioned.userId);
    if (sessionToken) {
      const secure = appOrigin().startsWith("https://");
      const cookieName = secure
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token";
      res.cookies.set(cookieName, sessionToken, {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return res;
  } catch (e) {
    console.error(e);
    return installRedirect("error");
  }
}

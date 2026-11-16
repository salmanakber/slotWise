import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role as string | undefined;
    const path = req.nextUrl.pathname;
    const isPlatform =
      path.startsWith("/platform") || path.startsWith("/api/platform");

    if (isPlatform && role !== "PLATFORM_OWNER" && role !== "PLATFORM_OPS") {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Platform access required" }, { status: 403 });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.set("error", "platform_forbidden");
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        if (
          path.startsWith("/dashboard") ||
          path.startsWith("/platform") ||
          path.startsWith("/api/platform") ||
          path.startsWith("/api/site")
        ) {
          return Boolean(token);
        }
        return true;
      },
    },
  },
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/platform/:path*",
    "/api/platform/:path*",
    "/api/site/:path*",
  ],
};

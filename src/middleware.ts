import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    /*
     * Auth-excluded paths (all others require authentication):
     *
     * - login          → Login page (obviously public)
     * - request        → Tenant-facing work order request portal (public form
     *                    so tenants can submit maintenance requests without
     *                    an AtlasPM account; rate-limited in the API route)
     * - api/auth        → NextAuth endpoints (login/callback/session)
     * - api/work-orders/request → API backing the public tenant request portal
     *                    (rate-limited + honeypot-protected in the route handler)
     * - _next/static    → Next.js static assets
     * - _next/image     → Next.js image optimization
     * - favicon.ico     → Browser favicon
     */
    "/((?!login|request|api/auth|api/work-orders/request|_next/static|_next/image|favicon.ico).*)",
  ],
};

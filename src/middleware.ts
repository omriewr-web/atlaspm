import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: ["/((?!login|request|api/auth|api/work-orders/request|_next/static|_next/image|favicon.ico).*)"],
};

import { getAuth } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

// Better Auth's own endpoints: /api/auth/get-session, /api/auth/sign-out, ...
const handler = (req: Request) => getAuth().handler(req);

export { handler as GET, handler as POST };

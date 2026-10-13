import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { profileRouter } from "./routers/profile";
import { catalogRouter } from "./routers/catalog";
import { actionsRouter } from "./routers/actions";
import { walletRouter } from "./routers/wallet";
import { socialRouter } from "./routers/social";
import { analyticsRouter } from "./routers/analytics";
import { jrRouter } from "./routers/jr";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  profile: profileRouter,
  catalog: catalogRouter,
  actions: actionsRouter,
  wallet: walletRouter,
  social: socialRouter,
  analytics: analyticsRouter,
  jr: jrRouter,
});

export type AppRouter = typeof appRouter;

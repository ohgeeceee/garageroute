process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3099';
// Intentionally NO FB creds set — should return ok:false reason:auto_post_disabled
const { postSaleToFacebookPage, isAutoPostEnabled } = await import('./lib/bot/fbPost.ts').catch(async () => {
  // .ts won't run directly via node — let's require the compiled version instead
  return await import('./lib/bot/fbPost.js').catch(() => null);
});

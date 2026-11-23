// Cloudflare Worker entry. Static files in /public are served by Cloudflare before
// this runs (see "assets" in wrangler.jsonc); everything else comes here.
import { AsyncLocalStorage } from 'node:async_hooks';
import { EmailMessage } from 'cloudflare:email';
import store from './lib/store.js';
import app from './lib/app.js';
import notify from './lib/notify.js';

store.useAsyncLocalStorage(AsyncLocalStorage);

const FROM = 'site@lakethahicks.com';

export default {
  fetch(request, env, ctx) {
    // Let the app email Laketha about new messages without slowing the visitor down.
    const notifyFn = msg => {
      if (!env.MAILER || !env.ALERT_TO) return;
      const raw = notify.compose(msg, { from: FROM, to: env.ALERT_TO, site: env.SITE_URL || 'https://www.lakethahicks.com' });
      ctx.waitUntil(env.MAILER.send(new EmailMessage(FROM, env.ALERT_TO, raw)).catch(err => console.error('alert email failed', err)));
    };
    return app.handle(request, Object.assign(Object.create(env), { notify: notifyFn }));
  },
};

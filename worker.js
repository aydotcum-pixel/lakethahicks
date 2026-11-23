// Cloudflare Worker entry. Static files in /public are served by Cloudflare before
// this runs (see "assets" in wrangler.jsonc); everything else comes here.
import { AsyncLocalStorage } from 'node:async_hooks';
import store from './lib/store.js';
import app from './lib/app.js';

store.useAsyncLocalStorage(AsyncLocalStorage);

export default {
  fetch(request, env) {
    return app.handle(request, env);
  },
};

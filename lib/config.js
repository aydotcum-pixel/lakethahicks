'use strict';
// Runtime settings. The Worker (or the local Node server) fills these from its environment.
const config = { SITE_URL: 'https://www.lakethahicks.com', SITE_TZ: 'America/Chicago', NOINDEX: false };
function configure(env = {}) {
  if (env.SITE_URL) config.SITE_URL = String(env.SITE_URL).replace(/\/$/, '');
  if (env.SITE_TZ) config.SITE_TZ = String(env.SITE_TZ);
  config.NOINDEX = env.NOINDEX === '1';
}
module.exports = { config, configure };

// Email Laketha when someone writes through the site. Runs only on Cloudflare,
// using the Email Routing "send_email" binding (MAILER). The destination is the
// ALERT_TO secret (her verified Gmail), kept out of this public repository.
// Replies go straight to the visitor, because Reply-To is their address.

const b64 = str => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/(.{76})/g, '$1\r\n');
};
const word = s => /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s).replace(/\r\n/g, '')}?=`;
const oneLine = s => String(s || '').replace(/[\r\n]+/g, ' ').trim();

function compose(msg, { from, to, site }) {
  const kind = msg.type && msg.type !== 'Message' ? msg.type : 'Message';
  const label = kind === 'Message' ? 'New message' : kind.charAt(0).toUpperCase() + kind.slice(1);
  const subject = `${label} from ${oneLine(msg.name)} · lakethahicks.com`;
  const lines = [
    `${oneLine(msg.name)} wrote to you through your website.`,
    '',
    msg.message,
    '',
    '---',
    `Name: ${oneLine(msg.name)}`,
    `Email: ${oneLine(msg.email)}`,
    msg.type ? `About: ${oneLine(msg.type)}` : null,
    msg.gathering ? `Gathering: ${oneLine(msg.gathering)}` : null,
    msg.group ? `Group or organisation: ${oneLine(msg.group)}` : null,
    msg.date ? `Date in mind: ${oneLine(msg.date)}` : null,
    '',
    `Reply to this email to answer ${oneLine(msg.name).split(' ')[0] || 'them'} directly.`,
    `All messages: ${site}/admin/inbox`,
  ].filter(l => l !== null).join('\r\n');
  const id = `<${crypto.randomUUID()}@lakethahicks.com>`;
  return [
    `From: ${word('Laketha Hicks website')} <${from}>`,
    `To: <${to}>`,
    `Reply-To: ${word(oneLine(msg.name))} <${oneLine(msg.email)}>`,
    `Subject: ${word(subject)}`,
    `Message-ID: ${id}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    b64(lines),
  ].join('\r\n');
}

module.exports = { compose };

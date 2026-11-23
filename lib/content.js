'use strict';
const store = require('./store');
const bundle = require('./bundle');

const site = bundle.site;
const days = bundle.days;

// Seed the journal with Laketha's three real posts the first time the site runs.
function seedPosts() {
  if (store.read('posts', null)) return false;
  const months = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 };
  const covers = { 'faith-for-the-season-you-are-in': '/assets/headshot.jpg', 'beginning-again-is-not-failure': '/assets/street.jpg', 'why-i-wrote-redemptions-journey': '/assets/holding-book.jpg', 'the-story-behind-the-covers': '/assets/selfie.jpg' };
  const posts = [];
  for (const { raw } of bundle.journal) {
    const m = raw.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    const meta = {};
    for (const line of m[1].split('\n')) {
      const i = line.indexOf(':'); if (i < 0) continue;
      meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '');
    }
    const [mon, d, y] = meta.date.replace(',', '').split(' ');
    const iso = new Date(Date.UTC(+y, months[mon] - 1, +d, 15)).toISOString();
    posts.push({ id: crypto.randomUUID(), slug: meta.slug, title: meta.title, excerpt: meta.excerpt, tag: meta.tag,
      cover: covers[meta.slug] || '', pullQuote: meta.pullQuote || '', body: m[2].trim(), status: 'published',
      createdAt: iso, updatedAt: iso, publishedAt: iso });
  }
  store.write('posts', posts);
  return true;
}

// Laketha's weekly studies (her own 2023 lessons). New ones in content/studies.json are
// added once; anything she later edits or deletes in her studio is left alone.
function seedStudies() {
  const list = store.read('studies', null) || [];
  const seeded = store.read('studySeeds', null) || list.map(x => x.slug);
  let changed = !store.read('studySeeds', null);
  for (const x of bundle.studies || []) {
    if (seeded.includes(x.slug)) continue;
    seeded.push(x.slug);
    changed = true;
    if (list.some(y => y.slug === x.slug)) continue;
    const at = new Date(x.date + 'T15:00:00Z').toISOString();
    list.push({ id: crypto.randomUUID(), slug: x.slug, word: x.word, subtitle: x.subtitle || '', definitions: x.definitions || [], readings: x.readings, keyVerse: x.keyVerse || null,
      thought: x.thought, thoughtCite: x.thoughtCite || '', secondThought: x.secondThought || null, closingVerse: x.closingVerse || null, note: x.note || '',
      status: 'published', approxDate: true, createdAt: at, updatedAt: at, publishedAt: at });
  }
  if (!changed) return false;
  store.write('studies', list);
  store.write('studySeeds', seeded);
  return true;
}

module.exports = { site, days, seedPosts, seedStudies };

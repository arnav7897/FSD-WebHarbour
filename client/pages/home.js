import { api } from '../utils/api.js';
import { escapeHtml, sortApps } from '../utils/helpers.js';
import { appTile, emptyState, favoriteButton, heroApp, sectionHeader, skeletonApps } from '../components/ui.js';

export const renderHomePage = async (ctx) => {
  const root = document.getElementById('page-root');
  root.innerHTML = `
    <section class="play-home-hero">
      <div class="hero-copy clean">
        <span class="hero-kicker">Apps for every workflow</span>
        <h1>Find trusted apps, tools, and releases.</h1>
        <p>Discover top-rated marketplace apps with a cleaner browsing flow inspired by modern app stores.</p>
        <form class="hero-search" data-home-search>
          <input name="q" type="search" placeholder="Search apps and categories" />
          <button class="button primary" type="submit">Search</button>
        </form>
      </div>
      <div class="hero-highlight-strip">
        <div class="highlight-metric"><strong>Curated</strong><span>Discovery-first shelves</span></div>
        <div class="highlight-metric"><strong>Trusted</strong><span>Reviews and release history</span></div>
        <div class="highlight-metric"><strong>Fast</strong><span>Two-click navigation</span></div>
      </div>
    </section>
    <section class="page-section">
      ${sectionHeader('Categories', 'Browse fast with tappable store-style category chips.')}
      <div class="category-strip" id="home-categories">${new Array(8).fill('<span class="pill skeleton-shimmer">&nbsp;</span>').join('')}</div>
    </section>
    <section class="page-section">
      ${sectionHeader('Featured', 'A Play Store-style editorial highlight for the top app right now.')}
      <div class="feature-grid" id="home-hero">${skeletonApps(1)}</div>
    </section>
    <section class="page-section">
      <div class="store-shelf"><div class="rail-head"><h3>Trending now</h3><a href="#/search?sort=popular">See all</a></div><div class="shelf-list" id="home-trending">${skeletonApps(3)}</div></div>
      <div class="store-shelf"><div class="rail-head"><h3>Top rated</h3><a href="#/search?sort=rating">See all</a></div><div class="shelf-list" id="home-top-rated">${skeletonApps(3)}</div></div>
      <div class="store-shelf"><div class="rail-head"><h3>Recently updated</h3><a href="#/search?sort=latest">See all</a></div><div class="shelf-list" id="home-updated">${skeletonApps(3)}</div></div>
    </section>
    <section class="page-section">
      ${sectionHeader('Editors\' choice tags', 'Quick topic pivots the way app storefronts surface discovery lanes.')}
      <div class="category-strip" id="home-tags"></div>
    </section>
    ${ctx.session.user ? '<section class="page-section"><div id="home-personal"></div></section>' : ''}
  `;

  root.querySelector('[data-home-search]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const q = new FormData(event.currentTarget).get('q');
    window.location.hash = `#/search?q=${encodeURIComponent(q || '')}`;
  });

  const [{ categories, tags }, appsResult] = await Promise.all([
    api.getCatalog(),
    api.listApps({ limit: 12 }),
  ]);
  ctx.catalog.categories = categories;
  ctx.catalog.tags = tags;

  const apps = appsResult.items;
  const trending = sortApps(apps, 'popular').slice(0, 3);
  const topRated = sortApps(apps, 'rating').slice(0, 3);
  const updated = sortApps(apps, 'latest').slice(0, 3);

  root.querySelector('#home-categories').innerHTML = categories
    .map((category) => `<a href="#/search?categoryId=${category.id}" class="category-chip">${escapeHtml(category.name)}</a>`)
    .join('');
  root.querySelector('#home-tags').innerHTML = tags
    .slice(0, 10)
    .map((tag) => `<a href="#/search?tagId=${tag.id}" class="category-chip subtle">${escapeHtml(tag.name)}</a>`)
    .join('');
  root.querySelector('#home-hero').innerHTML = apps[0]
    ? heroApp(apps[0])
    : emptyState('No published apps yet', 'Seed the backend and publish the first listing to activate the marketplace.');
  root.querySelector('#home-trending').innerHTML = trending.map((app) => appTile(app, { favoriteAction: favoriteButton(app.id, ctx.favoriteIds.has(app.id)) })).join('');
  root.querySelector('#home-top-rated').innerHTML = topRated.map((app) => appTile(app, { favoriteAction: favoriteButton(app.id, ctx.favoriteIds.has(app.id)) })).join('');
  root.querySelector('#home-updated').innerHTML = updated.map((app) => appTile(app, { favoriteAction: favoriteButton(app.id, ctx.favoriteIds.has(app.id)) })).join('');

  if (ctx.session.user) {
    const personal = root.querySelector('#home-personal');
    const favoriteEntries = await api.favorites().catch(() => []);
    const personalized = favoriteEntries.slice(0, 3).map((entry) => ({
      ...entry.app,
      averageRating: entry.app.averageRating || 0,
      reviewCount: 0,
      latestVersion: null,
      tags: [],
      heroTone: '#1ec46b',
    }));
    personal.innerHTML = personalized.length
      ? `${sectionHeader('Your library', 'Saved apps ready for quick return visits.')}<div class="shelf-list">${personalized.map((app) => appTile(app, { favoriteAction: favoriteButton(app.id, true) })).join('')}</div>`
      : `${sectionHeader('Your library', 'Saved apps will appear here just like a store library shelf.')}${emptyState('Nothing saved yet', 'Save apps to build your own library.', '<a class="button primary small" href="#/search">Browse apps</a>')}`;
  }
};
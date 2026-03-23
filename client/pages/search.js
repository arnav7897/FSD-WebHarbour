import { api } from '../utils/api.js';
import { debounce, escapeHtml, paginate, sortApps } from '../utils/helpers.js';
import { appTile, emptyState, favoriteButton, pagination, sectionHeader, skeletonApps } from '../components/ui.js';

export const renderSearchPage = async (ctx) => {
  const root = document.getElementById('page-root');
  const query = ctx.route.query;
  const currentPage = Number(query.page || 1);

  root.innerHTML = `
    <section class="page-section discover-header">
      ${sectionHeader('Explore apps', 'Refine results with simple store-style filters and faster scanning.')}
      <div class="discover-shell">
        <aside class="filter-panel">
          <label><span>Search</span><input id="search-q" type="search" value="${escapeHtml(query.q || '')}" placeholder="Search apps..." /></label>
          <label><span>Category</span><select id="filter-category"><option value="">All categories</option></select></label>
          <label><span>Tag</span><select id="filter-tag"><option value="">All tags</option></select></label>
          <label><span>Minimum rating</span><select id="filter-rating"><option value="">Any</option><option value="4">4+</option><option value="3">3+</option><option value="2">2+</option></select></label>
          <label><span>Sort</span><select id="filter-sort"><option value="popular">Popular</option><option value="latest">Latest</option><option value="rating">Rating</option></select></label>
        </aside>
        <section>
          <div class="result-head">
            <strong id="result-copy">Loading results</strong>
            <div class="tag-cloud" id="featured-tags"></div>
          </div>
          <div class="search-list" id="search-results">${skeletonApps(8)}</div>
          <div id="search-pagination"></div>
        </section>
      </div>
    </section>
  `;

  const catalog = ctx.catalog.categories.length ? ctx.catalog : await api.getCatalog();
  ctx.catalog.categories = catalog.categories;
  ctx.catalog.tags = catalog.tags;
  root.querySelector('#filter-category').innerHTML += catalog.categories.map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`).join('');
  root.querySelector('#filter-tag').innerHTML += catalog.tags.map((tag) => `<option value="${tag.id}">${escapeHtml(tag.name)}</option>`).join('');
  root.querySelector('#featured-tags').innerHTML = catalog.tags.slice(0, 8).map((tag) => `<a class="pill" href="#/search?tagId=${tag.id}">${escapeHtml(tag.name)}</a>`).join('');
  ['category', 'tag', 'rating', 'sort'].forEach((key) => {
    const value = query[`${key}Id`] || query[key] || '';
    const element = root.querySelector(`#filter-${key}`);
    if (element) element.value = value;
  });

  const baseResult = await api.listApps(
    {
      q: query.q || '',
      categoryId: query.categoryId || '',
      tagId: query.tagId || '',
      limit: 18,
    },
    true,
  );
  let items = sortApps(baseResult.items, query.sort || 'popular');
  if (query.rating) {
    items = items.filter((item) => item.averageRating >= Number(query.rating));
  }
  const page = paginate(items, currentPage, 8);

  root.querySelector('#result-copy').textContent = `${page.total} results matched your filters`;
  root.querySelector('#search-results').innerHTML = page.items.length
    ? page.items.map((app) => appTile(app, { favoriteAction: favoriteButton(app.id, ctx.favoriteIds.has(app.id)) })).join('')
    : emptyState('No matching apps', 'Try changing rating, category, or tag filters to broaden the catalog.');
  root.querySelector('#search-pagination').innerHTML = page.items.length ? pagination(page.page, page.totalPages) : '';

  const pushFilters = () => {
    const params = new URLSearchParams();
    const values = {
      q: root.querySelector('#search-q').value.trim(),
      categoryId: root.querySelector('#filter-category').value,
      tagId: root.querySelector('#filter-tag').value,
      rating: root.querySelector('#filter-rating').value,
      sort: root.querySelector('#filter-sort').value,
    };
    Object.entries(values).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    window.location.hash = `#/search${params.toString() ? `?${params.toString()}` : ''}`;
  };

  root.querySelector('#search-q')?.addEventListener('input', debounce(pushFilters, 260));
  ['#filter-category', '#filter-tag', '#filter-rating', '#filter-sort'].forEach((selector) => {
    root.querySelector(selector)?.addEventListener('change', pushFilters);
  });
  root.querySelectorAll('[data-page-shift]').forEach((button) => {
    button.addEventListener('click', () => {
      const params = new URLSearchParams(ctx.route.query);
      params.set('page', String(currentPage + Number(button.dataset.pageShift)));
      window.location.hash = `#/search?${params.toString()}`;
    });
  });
};

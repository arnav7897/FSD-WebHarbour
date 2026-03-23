import { api } from '../utils/api.js';
import { formatDate } from '../utils/helpers.js';
import { activityItem, appTile, emptyState, favoriteButton, metric, pagination, pill, sectionHeader, showToast, statCard, trendBars } from '../components/ui.js';

const requireAuthView = () =>
  `<section class="page-section">${emptyState('Sign in required', 'This workspace is personalized. Sign in to access your profile, favorites, and role-based tools.', '<a class="button primary" href="#/login">Sign In</a>')}</section>`;

const renderUserDashboard = async (ctx, root) => {
  const [me, favorites] = await Promise.all([api.me(), api.favorites().catch(() => [])]);
  const activity = ctx.activity.slice(0, 8);
  root.innerHTML = `
    <section class="page-section">
      ${sectionHeader('Your dashboard', 'Favorites, recent activity, and account health in one place.')}
      <div class="stats-grid">
        ${statCard('Role', me.role)}
        ${statCard('Saved apps', favorites.length)}
        ${statCard('Recent activity', activity.length)}
      </div>
    </section>
    <section class="page-section split-panel">
      <div class="surface-block">
        <h3>Favorites</h3>
        <div class="masonry-feed">
          ${favorites.length ? favorites.map((entry) => appTile({ ...entry.app, reviewCount: 0, latestVersion: null, tags: [] }, { favoriteAction: favoriteButton(entry.app.id, true) })).join('') : emptyState('No favorites yet', 'Save apps from discovery or detail pages to build your shortlist.')}
        </div>
      </div>
      <div class="surface-block">
        <h3>Activity</h3>
        <div class="activity-list">
          ${activity.length ? activity.map(activityItem).join('') : '<p class="soft-copy">Downloads and reviews you trigger from this frontend appear here.</p>'}
        </div>
      </div>
    </section>
  `;
};

const renderDeveloperDashboard = async (ctx, root) => {
  if (!ctx.catalog.categories.length) {
    const catalog = await api.getCatalog();
    ctx.catalog.categories = catalog.categories;
    ctx.catalog.tags = catalog.tags;
  }
  const [overview, apps] = await Promise.all([
    api.developerOverview().catch(() => null),
    api.listApps({ mine: true, status: 'ALL', limit: 24 }, false).catch(() => ({ items: [] })),
  ]);
  const selectedId = ctx.route.query.appId || apps.items[0]?.id;
  const selectedAnalytics = selectedId ? await api.developerAppAnalytics(selectedId).catch(() => null) : null;

  root.innerHTML = `
    <section class="page-section">
      ${sectionHeader('Developer workspace', 'Create listings, ship versions, submit for review, and watch adoption trends.')}
      ${
        overview
          ? `<div class="stats-grid">
              ${statCard('Apps', overview.totals.apps)}
              ${statCard('Downloads', overview.totals.downloads)}
              ${statCard('Favorites', overview.totals.favorites)}
              ${statCard('Average rating', overview.totals.averageRating)}
            </div>`
          : '<div class="surface-block"><p>Developer analytics will appear after approval and your first published apps.</p></div>'
      }
    </section>
    <section class="page-section split-panel">
      <div class="surface-block">
        <h3>Create app</h3>
        <form id="create-app-form" class="stack-form">
          <label><span>Step 1: Name</span><input name="name" required placeholder="Pulseboard Analytics" /></label>
          <label><span>Step 2: Description</span><textarea name="description" required rows="4" placeholder="Describe the product and who it is for."></textarea></label>
          <label><span>Step 3: Category</span><select name="categoryId">${ctx.catalog.categories.map((category) => `<option value="${category.id}">${category.name}</option>`).join('')}</select></label>
          <label><span>Step 4: Tag IDs (comma separated)</span><input name="tags" placeholder="1,3,5" /></label>
          <button class="button primary" type="submit">Create Draft</button>
        </form>
      </div>
      <div class="surface-block">
        <h3>Release management</h3>
        <form id="version-form" class="stack-form">
          <label><span>App</span><select name="appId">${apps.items.map((app) => `<option value="${app.id}" ${String(app.id) === String(selectedId) ? 'selected' : ''}>${app.name}</option>`).join('')}</select></label>
          <label><span>Version</span><input name="version" required placeholder="1.0.0" /></label>
          <label><span>Download URL</span><input name="downloadUrl" required placeholder="https://cdn.example.com/build.zip" /></label>
          <label><span>File size</span><input name="fileSize" placeholder="24 MB" /></label>
          <label><span>Supported OS</span><input name="supportedOs" placeholder="WEB, WINDOWS" /></label>
          <label><span>Changelog</span><textarea name="changelog" rows="3" placeholder="What changed in this release?"></textarea></label>
          <button class="button primary" type="submit">Publish Version Metadata</button>
        </form>
        <button class="button ghost" id="submit-app-btn" ${selectedId ? '' : 'disabled'}>Submit Selected App For Review</button>
      </div>
    </section>
    <section class="page-section split-panel">
      <div class="surface-block">
        <div class="section-header compact"><div><h2>Your apps</h2><p>Status-aware catalog of owned listings.</p></div></div>
        <div class="masonry-feed">${apps.items.length ? apps.items.map((app) => appTile({ ...app, averageRating: 0, reviewCount: 0, latestVersion: null, tags: [] }, { favoriteAction: `<a class="button ghost small" href="#/developer?appId=${app.id}">Inspect</a>` })).join('') : emptyState('No apps yet', 'Create your first draft to start the developer workflow.')}</div>
      </div>
      <div class="surface-block">
        <div class="section-header compact"><div><h2>App analytics</h2><p>Per-app adoption, versions, and rating mix.</p></div></div>
        ${
          selectedAnalytics
            ? `
              <div class="metrics-list">
                ${metric('Downloads', selectedAnalytics.totals.downloads)}
                ${metric('Favorites', selectedAnalytics.totals.favorites)}
                ${metric('Reviews', selectedAnalytics.totals.reviews)}
                ${metric('Average rating', selectedAnalytics.totals.averageRating)}
              </div>
              <h4>Recent downloads</h4>
              ${trendBars(selectedAnalytics.trends.dailyDownloads)}
              <h4>Recent favorites</h4>
              ${trendBars(selectedAnalytics.trends.dailyFavorites)}
              <div class="version-list">
                ${selectedAnalytics.versions.trends.map((version) => `<article class="version-row"><div><strong>${version.version}</strong><span>${formatDate(version.releaseDate)}</span></div><p>${version.downloads} downloads • ${version.adoptionRate}% adoption</p></article>`).join('')}
              </div>
            `
            : '<p class="soft-copy">Select an app with analytics data to inspect trends.</p>'
        }
      </div>
    </section>
  `;

  root.querySelector('#create-app-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get('name'),
      description: formData.get('description'),
      categoryId: Number(formData.get('categoryId')),
      tags: String(formData.get('tags') || '')
        .split(',')
        .map((value) => Number(value.trim()))
        .filter(Boolean),
    };
    try {
      await api.createApp(payload);
      showToast('Draft app created', 'success');
      window.dispatchEvent(new Event('hashchange'));
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  root.querySelector('#version-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const appId = formData.get('appId');
    try {
      await api.addVersion(appId, {
        version: formData.get('version'),
        downloadUrl: formData.get('downloadUrl'),
        fileSize: formData.get('fileSize'),
        supportedOs: String(formData.get('supportedOs') || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        changelog: formData.get('changelog'),
      });
      showToast('Version created', 'success');
      window.dispatchEvent(new Event('hashchange'));
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  root.querySelector('#submit-app-btn')?.addEventListener('click', async () => {
    const appId = root.querySelector('#version-form [name="appId"]')?.value;
    try {
      await api.submitApp(appId);
      showToast('App submitted for moderation', 'success');
      window.dispatchEvent(new Event('hashchange'));
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
};

const renderAdminDashboard = async (_ctx, root) => {
  const [reviewQueue, reports, devRequests, catalog] = await Promise.all([
    api.listApps({ status: 'UNDER_REVIEW', limit: 12 }, false).catch(() => ({ items: [] })),
    api.listReports({ status: 'PENDING', limit: 12 }).catch(() => ({ items: [] })),
    api.listDeveloperRequests({ status: 'PENDING', limit: 12 }).catch(() => ({ items: [] })),
    api.getCatalog().catch(() => ({ categories: [], tags: [] })),
  ]);

  root.innerHTML = `
    <section class="page-section">
      ${sectionHeader('Admin control room', 'Moderation, trust and safety, and catalog growth tools in one view.')}
      <div class="stats-grid">
        ${statCard('Apps under review', reviewQueue.items.length)}
        ${statCard('Pending reports', reports.items.length)}
        ${statCard('Developer requests', devRequests.items.length)}
      </div>
    </section>
    <section class="page-section split-panel">
      <div class="surface-block">
        <h3>Approve or reject apps</h3>
        <div class="queue-list">
          ${
            reviewQueue.items.length
              ? reviewQueue.items
                  .map(
                    (app) => `
                      <article class="queue-row">
                        <div><strong>${app.name}</strong><span>${app.category?.name || 'Uncategorized'} • ${app.status}</span></div>
                        <div class="inline-actions">
                          <button class="button primary small" data-admin-approve="${app.id}">Approve</button>
                          <button class="button ghost small" data-admin-reject="${app.id}">Reject</button>
                        </div>
                      </article>`,
                  )
                  .join('')
              : '<p class="soft-copy">No apps waiting for review.</p>'
          }
        </div>
      </div>
      <div class="surface-block">
        <h3>Reports queue</h3>
        <div class="queue-list">
          ${
            reports.items.length
              ? reports.items
                  .map(
                    (report) => `
                      <article class="queue-row">
                        <div><strong>${report.type} report #${report.id}</strong><span>${report.reason}</span></div>
                        <div class="inline-actions">
                          <button class="button primary small" data-report-action="${report.id}" data-decision="APPROVED">Approve</button>
                          <button class="button ghost small" data-report-action="${report.id}" data-decision="FLAGGED">Flag</button>
                          <button class="button ghost small" data-report-action="${report.id}" data-decision="REJECTED">Reject</button>
                        </div>
                      </article>`,
                  )
                  .join('')
              : '<p class="soft-copy">No pending reports.</p>'
          }
        </div>
      </div>
    </section>
    <section class="page-section split-panel">
      <div class="surface-block">
        <h3>Developer approvals</h3>
        <div class="queue-list">
          ${
            devRequests.items.length
              ? devRequests.items
                  .map(
                    (requestItem) => `
                      <article class="queue-row">
                        <div><strong>${requestItem.user.name}</strong><span>${requestItem.user.email}</span></div>
                        <div class="inline-actions">
                          <button class="button primary small" data-dev-approve="${requestItem.user.id}">Approve</button>
                          <button class="button ghost small" data-dev-reject="${requestItem.user.id}">Reject</button>
                        </div>
                      </article>`,
                  )
                  .join('')
              : '<p class="soft-copy">No pending developer requests.</p>'
          }
        </div>
      </div>
      <div class="surface-block">
        <h3>Catalog management</h3>
        <form id="category-form" class="stack-form">
          <label><span>Category name</span><input name="name" required /></label>
          <label><span>Description</span><input name="description" /></label>
          <button class="button primary small" type="submit">Create Category</button>
        </form>
        <form id="tag-form" class="stack-form compact-top">
          <label><span>Tag name</span><input name="name" required /></label>
          <label><span>Color</span><input name="color" placeholder="#34d399" /></label>
          <button class="button ghost small" type="submit">Create Tag</button>
        </form>
        <div class="tag-cloud compact-top">
          ${catalog.categories.map((category) => pill(category.name)).join('')}
          ${catalog.tags.map((tag) => pill(tag.name)).join('')}
        </div>
      </div>
    </section>
  `;

  root.querySelectorAll('[data-admin-approve]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await api.approveApp(button.dataset.adminApprove, { note: 'Approved from dashboard' });
        showToast('App approved', 'success');
        window.dispatchEvent(new Event('hashchange'));
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });
  root.querySelectorAll('[data-admin-reject]').forEach((button) => {
    button.addEventListener('click', async () => {
      const moderationNote = window.prompt('Add a rejection note');
      if (!moderationNote) return;
      try {
        await api.rejectApp(button.dataset.adminReject, { moderationNote });
        showToast('App rejected', 'success');
        window.dispatchEvent(new Event('hashchange'));
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });
  root.querySelectorAll('[data-report-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await api.resolveReport(button.dataset.reportAction, {
          decision: button.dataset.decision,
          notes: 'Resolved from admin dashboard',
        });
        showToast('Report resolved', 'success');
        window.dispatchEvent(new Event('hashchange'));
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });
  root.querySelectorAll('[data-dev-approve]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await api.approveDeveloper(button.dataset.devApprove);
        showToast('Developer approved', 'success');
        window.dispatchEvent(new Event('hashchange'));
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });
  root.querySelectorAll('[data-dev-reject]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await api.rejectDeveloper(button.dataset.devReject);
        showToast('Developer request rejected', 'success');
        window.dispatchEvent(new Event('hashchange'));
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });
  root.querySelector('#category-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api.createCategory(body);
      showToast('Category created', 'success');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
  root.querySelector('#tag-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api.createTag(body);
      showToast('Tag created', 'success');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
};

export const renderDashboardPage = async (ctx) => {
  const root = document.getElementById('page-root');
  if (!ctx.session.user) {
    root.innerHTML = requireAuthView();
    return;
  }
  await renderUserDashboard(ctx, root);
};

export const renderDeveloperPage = async (ctx) => {
  const root = document.getElementById('page-root');
  if (!ctx.session.user) {
    root.innerHTML = requireAuthView();
    return;
  }
  if (ctx.session.user.role === 'USER') {
    const status = await api.developerStatus().catch(() => ({ status: 'NONE' }));
    root.innerHTML = `
      <section class="page-section">
        ${sectionHeader('Developer access', 'Request approval to publish apps and access analytics.')}
        <div class="surface-block">
          <p>Current status: <strong>${status.status}</strong></p>
          <button class="button primary" id="become-dev-btn" ${status.status === 'PENDING' ? 'disabled' : ''}>Request Developer Access</button>
        </div>
      </section>
    `;
    root.querySelector('#become-dev-btn')?.addEventListener('click', async () => {
      try {
        await api.becomeDeveloper();
        showToast('Developer request submitted', 'success');
        window.dispatchEvent(new Event('hashchange'));
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
    return;
  }
  await renderDeveloperDashboard(ctx, root);
};

export const renderAdminPage = async (ctx) => {
  const root = document.getElementById('page-root');
  if (!ctx.session.user || ctx.session.user.role !== 'ADMIN') {
    root.innerHTML = requireAuthView();
    return;
  }
  await renderAdminDashboard(ctx, root);
};

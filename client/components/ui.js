import { escapeHtml, formatDate, formatNumber, hashColor, initials } from '../utils/helpers.js';

const toastRoot = () => document.getElementById('toast-root');
const modalRoot = () => document.getElementById('modal-root');

export const showToast = (message, tone = 'default') => {
  const node = document.createElement('div');
  node.className = `toast toast-${tone}`;
  node.textContent = message;
  toastRoot().appendChild(node);
  requestAnimationFrame(() => node.classList.add('visible'));
  window.setTimeout(() => {
    node.classList.remove('visible');
    window.setTimeout(() => node.remove(), 220);
  }, 2600);
};

export const showModal = ({ title, body, actions = [] }) => {
  modalRoot().innerHTML = `
    <div class="modal-scrim">
      <div class="modal-panel">
        <div class="modal-head">
          <h3>${escapeHtml(title)}</h3>
          <button class="icon-button" data-close-modal aria-label="Close">x</button>
        </div>
        <div class="modal-body">${body}</div>
        <div class="modal-actions">
          ${actions
            .map(
              (action) =>
                `<button class="button ${action.variant || 'ghost'}" data-modal-action="${escapeHtml(action.id)}">${escapeHtml(action.label)}</button>`,
            )
            .join('')}
        </div>
      </div>
    </div>
  `;
  const close = () => {
    modalRoot().innerHTML = '';
  };
  modalRoot().querySelector('[data-close-modal]')?.addEventListener('click', close);
  modalRoot().querySelector('.modal-scrim')?.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal-scrim')) close();
  });
  actions.forEach((action) => {
    modalRoot().querySelector(`[data-modal-action="${action.id}"]`)?.addEventListener('click', async () => {
      if (action.onClick) await action.onClick(close);
    });
  });
};

export const pill = (label, tone) => `<span class="pill ${tone || ''}">${escapeHtml(label)}</span>`;

export const stars = (rating = 0, interactive = false) => {
  const rounded = Math.round(Number(rating) || 0);
  return `
    <div class="stars ${interactive ? 'stars-interactive' : ''}">
      ${[1, 2, 3, 4, 5]
        .map(
          (value) => `
            <button type="button" class="star ${value <= rounded ? 'filled' : ''}" ${interactive ? `data-star="${value}"` : 'tabindex="-1"'} aria-label="${value} star">
              <span>★</span>
            </button>`,
        )
        .join('')}
    </div>
  `;
};

export const skeletonApps = (count = 6) =>
  new Array(count)
    .fill(0)
    .map(
      () => `
        <article class="app-tile skeleton">
          <div class="tile-main">
            <div class="skeleton-shimmer tile-icon"></div>
            <div class="skeleton-lines">
              <span class="skeleton-shimmer line large"></span>
              <span class="skeleton-shimmer line"></span>
              <span class="skeleton-shimmer line short"></span>
            </div>
          </div>
        </article>`,
    )
    .join('');

export const emptyState = (title, copy, action = '') => `
  <section class="empty-state">
    <div class="empty-mark">WH</div>
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(copy)}</p>
    ${action}
  </section>
`;

export const appTile = (app, options = {}) => {
  const tone = app.heroTone || hashColor(app.name);
  return `
    <article class="app-tile" data-open-app="${app.id}">
      <div class="tile-main">
        <div class="tile-icon" style="background:${tone}">
          ${escapeHtml(initials(app.name))}
        </div>
        <div class="tile-copy">
          <h3>${escapeHtml(app.name)}</h3>
          <p>${escapeHtml(app.category?.name || 'App')} • ${escapeHtml(app.shortDescription || app.description)}</p>
          <div class="tile-meta">
            <span>${(Number(app.averageRating || 0)).toFixed(1)} ★</span>
            <span>${app.reviewCount || 0} reviews</span>
            <span>${escapeHtml(app.latestVersion?.version ? `v${app.latestVersion.version}` : 'New')}</span>
          </div>
          <div class="tile-tags">
            ${(app.tags || []).slice(0, 3).map((tag) => pill(tag.name)).join('')}
          </div>
        </div>
        <div class="tile-actions">${options.favoriteAction || ''}</div>
      </div>
    </article>
  `;
};

export const heroApp = (app) => `
  <section class="hero-app play-hero">
    <div class="hero-app-copy">
      <div class="eyebrow-row">${pill(app.category?.name || 'Featured')}</div>
      <h2>${escapeHtml(app.name)}</h2>
      <p>${escapeHtml(app.description)}</p>
      <div class="hero-app-stats">
        <span><strong>${(Number(app.averageRating || 0)).toFixed(1)}</strong><small>Rating</small></span>
        <span><strong>${app.reviewCount || 0}</strong><small>Reviews</small></span>
        <span><strong>${escapeHtml(app.latestVersion?.version || '1.0.0')}</strong><small>Current version</small></span>
      </div>
      <div class="hero-app-tags">
        ${(app.tags || []).slice(0, 4).map((tag) => pill(tag.name)).join('')}
      </div>
      <div class="hero-actions">
        <a class="button primary" href="#/app/${app.id}">Install</a>
        <a class="button ghost" href="#/app/${app.id}">Details</a>
      </div>
    </div>
    <div class="hero-device" style="--device-tone:${app.heroTone}">
      <div class="device-panel">
        <div class="hero-preview-icon" style="background:${app.heroTone}">${escapeHtml(initials(app.name))}</div>
        <strong>${escapeHtml(app.name)}</strong>
        <span>${escapeHtml(app.category?.name || 'App')}</span>
        <div class="preview-shots">
          <i></i><i></i><i></i>
        </div>
      </div>
    </div>
  </section>
`;

export const sectionHeader = (title, subtitle, action = '') => `
  <div class="section-header">
    <div>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(subtitle)}</p>
    </div>
    ${action}
  </div>
`;

export const avatar = (user) => `
  <div class="avatar" style="background:${hashColor(user?.name || user?.email || 'WH')}">${escapeHtml(initials(user?.name || user?.email || 'WH'))}</div>
`;

export const statCard = (label, value, meta = '') => `
  <article class="stat-card">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(String(value))}</strong>
    <p>${escapeHtml(meta)}</p>
  </article>
`;

export const reviewCard = (review, currentUserId) => `
  <article class="review-card" data-review-id="${review.id}">
    <div class="review-head">
      <div class="review-user">
        <div class="avatar mini" style="background:${hashColor(review.user?.name || 'User')}">${escapeHtml(initials(review.user?.name || 'User'))}</div>
        <div>
          <strong>${escapeHtml(review.user?.name || 'Community member')}</strong>
          <span>${formatDate(review.createdAt)}</span>
        </div>
      </div>
      <div class="review-rating">${stars(review.rating)}</div>
    </div>
    <h4>${escapeHtml(review.title || 'Untitled review')}</h4>
    <p>${escapeHtml(review.comment || 'No written feedback provided.')}</p>
    <div class="review-footer">
      <span>${review.isEdited ? 'Edited' : 'Original'}</span>
      ${review.userId === currentUserId ? '<div class="inline-actions"><button class="button ghost small" data-edit-review>Edit</button><button class="button ghost small" data-delete-review>Delete</button></div>' : ''}
    </div>
  </article>
`;

export const pagination = (page, totalPages) => `
  <div class="pagination">
    <button class="button ghost small" ${page <= 1 ? 'disabled' : ''} data-page-shift="-1">Previous</button>
    <span>Page ${page} of ${totalPages}</span>
    <button class="button ghost small" ${page >= totalPages ? 'disabled' : ''} data-page-shift="1">Next</button>
  </div>
`;

export const trendBars = (items = [], labelKey = 'date', valueKey = 'count') => `
  <div class="trend-bars">
    ${items.length
      ? items
          .slice(-8)
          .map((item) => {
            const value = Number(item[valueKey] || 0);
            return `
              <div class="trend-bar">
                <span style="height:${Math.max(12, Math.min(100, value * 10))}%"></span>
                <small>${escapeHtml(String(item[labelKey]).slice(5))}</small>
              </div>
            `;
          })
          .join('')
      : '<p class="soft-copy">No trend data yet.</p>'}
  </div>
`;

export const favoriteButton = (appId, active = false) => `
  <button class="favorite-button ${active ? 'active' : ''}" data-favorite-toggle="${appId}">
    ${active ? 'Saved' : 'Save'}
  </button>
`;

export const screenshotDeck = (app) => {
  const screens = Array.isArray(app.screenshots)
    ? app.screenshots
    : [
        `Overview ${app.name}`,
        `Reviews ${app.name}`,
        `Version ${app.latestVersion?.version || '1.0.0'}`,
      ];
  return `
    <div class="screenshot-deck">
      ${screens
        .slice(0, 3)
        .map(
          (screen, index) => `
            <div class="shot" style="--shot-delay:${index};--shot-tone:${app.heroTone}">
              <span>${escapeHtml(typeof screen === 'string' ? screen : `Preview ${index + 1}`)}</span>
            </div>`,
        )
        .join('')}
    </div>
  `;
};

export const activityItem = (item) => `
  <div class="activity-row">
    <strong>${escapeHtml(item.title)}</strong>
    <p>${escapeHtml(item.description || '')}</p>
    <span>${formatDate(item.createdAt)}</span>
  </div>
`;

export const reportStatusTone = (status) => {
  if (status === 'APPROVED') return 'pill-highlight';
  if (status === 'REJECTED') return 'pill-muted';
  if (status === 'FLAGGED') return 'pill-alert';
  return '';
};

export const metric = (label, value) => `
  <div class="metric-line">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(String(value))}</strong>
  </div>
`;

export { formatNumber };

import { api } from '../utils/api.js';
import { escapeHtml, formatDate, timeAgo } from '../utils/helpers.js';
import { emptyState, favoriteButton, pill, reviewCard, screenshotDeck, sectionHeader, showModal, showToast, stars } from '../components/ui.js';

const ratingBreakdown = (reviews) => {
  const total = reviews.length || 1;
  return [5, 4, 3, 2, 1]
    .map((rating) => {
      const count = reviews.filter((review) => review.rating === rating).length;
      return `
        <div class="rating-row">
          <span>${rating}</span>
          <div class="rating-track"><i style="width:${(count / total) * 100}%"></i></div>
          <small>${count}</small>
        </div>
      `;
    })
    .join('');
};

export const renderAppDetailPage = async (ctx) => {
  const root = document.getElementById('page-root');
  const appId = ctx.route.params[0];

  root.innerHTML = `<section class="page-section">${sectionHeader('App detail', 'Loading product, reviews, versions, and trust signals.')}<div class="search-list">${emptyState('Loading app', 'Fetching listing data, release history, and reviews...')}</div></section>`;
  const app = await api.getAppBundle(appId);
  const myReview = app.reviews.find((review) => review.userId === ctx.session.user?.id) || null;

  root.innerHTML = `
    <section class="detail-hero play-detail" style="--detail-tone:${app.heroTone}">
      <div class="detail-main">
        <div class="detail-icon">${escapeHtml(app.name.slice(0, 2).toUpperCase())}</div>
        <div>
          <div class="eyebrow-row">
            ${pill(app.category?.name || 'Marketplace')}
            ${app.status && app.status !== 'PUBLISHED' ? pill(app.status) : ''}
          </div>
          <h1>${escapeHtml(app.name)}</h1>
          <p>${escapeHtml(app.description)}</p>
          <div class="store-metrics">
            <div><strong>${app.averageRating.toFixed(1)}</strong><span>Rating</span></div>
            <div><strong>${app.reviewCount}</strong><span>Reviews</span></div>
            <div><strong>${escapeHtml(app.latestVersion?.version || 'N/A')}</strong><span>Version</span></div>
            <div><strong>${escapeHtml((app.platforms || ['WEB']).slice(0, 2).join(', '))}</strong><span>Platform</span></div>
          </div>
        </div>
      </div>
      <div class="detail-actions">
        <button class="button primary" data-download-app="${app.id}">Install</button>
        ${favoriteButton(app.id, ctx.favoriteIds.has(app.id))}
        <button class="button ghost" data-open-report>Report</button>
      </div>
    </section>
    <section class="page-section detail-grid">
      <div class="detail-column">
        ${sectionHeader('About this app', `Updated ${timeAgo(app.updatedAt || app.createdAt)} with reviews and version history.`)}
        ${screenshotDeck(app)}
        <div class="surface-block">
          <h3>Description</h3>
          <p>${escapeHtml(app.description)}</p>
          <div class="tag-cloud">${(app.tags || []).map((tag) => pill(tag.name)).join('')}</div>
        </div>
        <div class="surface-block">
          <div class="section-header compact"><div><h2>Ratings and reviews</h2><p>See what users think before you install.</p></div></div>
          <div class="review-summary">
            <div>
              <strong>${app.averageRating.toFixed(1)}</strong>
              <span>${stars(app.averageRating)}</span>
              <small>${app.reviewCount} community reviews</small>
            </div>
            <div>${ratingBreakdown(app.reviews)}</div>
          </div>
          <form id="review-form" class="review-form">
            <div>
              <label>Rating</label>
              <div id="review-stars">${stars(5, true)}</div>
            </div>
            <label><span>Title</span><input name="title" maxlength="80" placeholder="What stood out?" /></label>
            <label><span>Comment</span><textarea name="comment" rows="4" placeholder="Share your experience with install quality, usability, or trust signals."></textarea></label>
            <input type="hidden" name="rating" value="5" />
            <button class="button primary" type="submit">${myReview ? 'Update Review' : 'Publish Review'}</button>
          </form>
          <div class="review-list">
            ${app.reviews.length ? app.reviews.map((review) => reviewCard(review, ctx.session.user?.id)).join('') : emptyState('No reviews yet', 'Be the first to leave a product signal for the next user.')}
          </div>
        </div>
      </div>
      <aside class="detail-side">
        <div class="surface-block">
          <h3>Version history</h3>
          <div class="version-list">
            ${
              app.versions.length
                ? app.versions
                    .map(
                      (version) => `
                        <article class="version-row">
                          <div>
                            <strong>${escapeHtml(version.version)}</strong>
                            <span>${formatDate(version.releaseDate)}</span>
                          </div>
                          <p>${escapeHtml(version.changelog || 'Release metadata available.')}</p>
                        </article>`,
                    )
                    .join('')
                : '<p class="soft-copy">No release history available yet.</p>'
            }
          </div>
        </div>
        <div class="surface-block">
          <h3>App info</h3>
          <div class="metric-line"><span>Status</span><strong>${app.status === 'PUBLISHED' ? 'Published' : app.status}</strong></div>
          <div class="metric-line"><span>Latest release</span><strong>${escapeHtml(app.latestVersion?.version || 'Pending')}</strong></div>
          <div class="metric-line"><span>Platforms</span><strong>${escapeHtml((app.platforms || []).join(', '))}</strong></div>
        </div>
      </aside>
    </section>
  `;

  const setStarValue = (value) => {
    root.querySelector('#review-form [name="rating"]').value = value;
    root.querySelector('#review-stars').innerHTML = stars(value, true);
    bindStarEvents();
  };

  const bindStarEvents = () => {
    root.querySelectorAll('#review-stars [data-star]').forEach((star) => {
      star.addEventListener('click', () => setStarValue(Number(star.dataset.star)));
    });
  };
  bindStarEvents();

  if (myReview) {
    root.querySelector('#review-form [name="title"]').value = myReview.title || '';
    root.querySelector('#review-form [name="comment"]').value = myReview.comment || '';
    setStarValue(myReview.rating);
  }

  root.querySelector('[data-download-app]')?.addEventListener('click', async () => {
    if (!ctx.session.user) {
      window.location.hash = '#/login';
      return;
    }
    try {
      await api.downloadApp(app.id, { versionId: app.latestVersion?.id });
      ctx.addActivity({
        title: `Downloaded ${app.name}`,
        description: `Tracked installation for version ${app.latestVersion?.version || 'latest'}.`,
      });
      showToast('Install tracked successfully', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  root.querySelector('#review-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!ctx.session.user) {
      window.location.hash = '#/login';
      return;
    }
    const formData = new FormData(event.currentTarget);
    const payload = {
      rating: Number(formData.get('rating')),
      title: formData.get('title'),
      comment: formData.get('comment'),
    };
    try {
      if (myReview) {
        await api.updateReview(app.id, myReview.id, payload);
        showToast('Review updated', 'success');
      } else {
        await api.createReview(app.id, payload);
        showToast('Review published', 'success');
      }
      ctx.addActivity({
        title: `Reviewed ${app.name}`,
        description: `Shared a ${payload.rating}-star product review.`,
      });
      window.dispatchEvent(new Event('hashchange'));
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  root.querySelectorAll('[data-delete-review]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      const reviewId = event.currentTarget.closest('[data-review-id]')?.dataset.reviewId;
      try {
        await api.deleteReview(app.id, reviewId);
        showToast('Review deleted', 'success');
        window.dispatchEvent(new Event('hashchange'));
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });

  root.querySelector('[data-open-report]')?.addEventListener('click', () => {
    showModal({
      title: 'Report this app',
      body: `
        <label class="stacked-field"><span>Reason</span><input id="report-reason" placeholder="Why does this listing need review?" /></label>
        <label class="stacked-field"><span>Description</span><textarea id="report-description" rows="4" placeholder="Add useful trust and safety context."></textarea></label>
      `,
      actions: [
        {
          id: 'submit',
          label: 'Submit report',
          variant: 'primary',
          onClick: async (close) => {
            try {
              await api.report({
                type: 'APP',
                targetId: app.id,
                reason: document.getElementById('report-reason').value,
                description: document.getElementById('report-description').value,
              });
              close();
              showToast('Report submitted', 'success');
            } catch (error) {
              showToast(error.message, 'error');
            }
          },
        },
      ],
    });
  });

  return app;
};

import { avatar } from './ui.js';

const navLink = (href, label, key, currentRoute) =>
  `<a class="sidebar-link ${currentRoute === key ? 'active' : ''}" href="${href}">${label}</a>`;

export const renderLayout = ({ user, theme, currentRoute }) => `
  <div class="shell ${theme}">
    <header class="topbar">
      <a class="brandmark" href="#/">
        <span class="brand-radar"></span>
        <div>
          <strong>WebHarbour</strong>
          <small>Apps</small>
        </div>
      </a>
      <form class="topbar-search" data-global-search>
        <span class="search-icon">⌕</span>
        <input name="q" type="search" placeholder="Search for apps and games" />
      </form>
      <div class="topbar-actions">
        ${
          user
            ? `<a class="user-chip" href="#/dashboard">${avatar(user)}<span>${user.name}</span></a><button class="button ghost small" id="logout-btn">Logout</button>`
            : '<a class="button ghost small" href="#/login">Sign In</a><a class="button primary small" href="#/register">Create Account</a>'
        }
      </div>
    </header>
    <div class="shell-body">
      <aside class="sidebar">
        <div class="sidebar-group">
          <span class="sidebar-label">Browse</span>
          ${navLink('#/', 'Home', 'home', currentRoute)}
          ${navLink('#/search', 'Apps', 'search', currentRoute)}
          ${navLink('#/dashboard', 'Library', 'dashboard', currentRoute)}
        </div>
        <div class="sidebar-group">
          <span class="sidebar-label">Workspace</span>
          ${user?.role === 'DEVELOPER' || user?.role === 'ADMIN' ? navLink('#/developer', 'Developer', 'developer', currentRoute) : navLink('#/login', 'Become a builder', 'login', currentRoute)}
          ${user?.role === 'ADMIN' ? navLink('#/admin', 'Admin', 'admin', currentRoute) : ''}
        </div>
        <div class="sidebar-group">
          <span class="sidebar-label">Settings</span>
          <button class="sidebar-action" id="theme-toggle" type="button">${theme === 'light' ? 'Switch To Dark' : 'Switch To Light'}</button>
          ${user ? '<a class="sidebar-link" href="#/dashboard">Account</a>' : '<a class="sidebar-link" href="#/register">Create Account</a>'}
        </div>
      </aside>
      <div class="main-panel">
        <main id="page-root" class="page-root route-${currentRoute}"></main>
      </div>
    </div>
    <nav class="mobile-dock">
      <a href="#/">Home</a>
      <a href="#/search">Apps</a>
      <a href="#/dashboard">Library</a>
      ${user?.role === 'ADMIN' ? '<a href="#/admin">Admin</a>' : user?.role === 'DEVELOPER' ? '<a href="#/developer">Build</a>' : '<a href="#/login">Login</a>'}
    </nav>
  </div>
`;

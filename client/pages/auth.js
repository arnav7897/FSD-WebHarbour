import { api } from '../utils/api.js';
import { escapeHtml } from '../utils/helpers.js';
import { sectionHeader, showToast } from '../components/ui.js';
import { store } from '../utils/store.js';

const authShell = (title, copy, fields, submitLabel, footer) => `
  <section class="auth-page">
    <div class="auth-intro">
      <span class="hero-kicker">Identity + trust</span>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(copy)}</p>
    </div>
    <form class="auth-form" id="auth-form">
      ${fields}
      <button class="button primary" type="submit">${escapeHtml(submitLabel)}</button>
      ${footer || ''}
    </form>
  </section>
`;

const validateEmail = (value) => /\S+@\S+\.\S+/.test(String(value || '').trim());

export const renderAuthPage = async (ctx) => {
  const root = document.getElementById('page-root');
  const type = ctx.route.key;

  if (type === 'login') {
    root.innerHTML = authShell(
      'Sign in to your marketplace workspace',
      'Continue with your saved apps, review history, developer tools, and admin access.',
      `
        <label><span>Email</span><input name="email" type="email" required /></label>
        <label><span>Password</span><input name="password" type="password" required minlength="6" /></label>
        <p class="form-note"><a href="#/forgot">Forgot your password?</a></p>
      `,
      'Sign In',
      '<p class="form-note">No account yet? <a href="#/register">Create one</a></p>',
    );
  } else if (type === 'register') {
    root.innerHTML = authShell(
      'Create your WebHarbour account',
      'Join the marketplace to save apps, download trusted releases, review products, and request developer access.',
      `
        <label><span>Name</span><input name="name" required minlength="2" /></label>
        <label><span>Email</span><input name="email" type="email" required /></label>
        <label><span>Password</span><input name="password" type="password" required minlength="6" /></label>
      `,
      'Create Account',
      '<p class="form-note">Already registered? <a href="#/login">Sign in</a></p>',
    );
  } else if (type === 'forgot') {
    root.innerHTML = authShell(
      'Reset your password',
      'Request a reset token from the API. In development, the backend returns a debug token directly.',
      `<label><span>Email</span><input name="email" type="email" required /></label>`,
      'Send Reset Link',
      '<p class="form-note">Already have a token? <a href="#/reset">Open reset form</a></p>',
    );
  } else {
    root.innerHTML = authShell(
      'Confirm your new password',
      'Paste the reset token and choose a new password to rotate your credentials.',
      `
        <label><span>Reset token</span><input name="token" required /></label>
        <label><span>New password</span><input name="newPassword" type="password" required minlength="6" /></label>
      `,
      'Update Password',
    );
  }

  root.querySelector('#auth-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());
    const note = document.createElement('p');
    note.className = 'form-note error';
    root.querySelectorAll('.form-note.error').forEach((item) => item.remove());

    if (body.email && !validateEmail(body.email)) {
      note.textContent = 'Enter a valid email address.';
      form.appendChild(note);
      return;
    }

    try {
      if (type === 'login') {
        const result = await api.login(body);
        store.setSession({
          token: result.token,
          refreshToken: result.refreshToken,
          user: result.user,
        });
        showToast('Signed in successfully', 'success');
        window.location.hash = '#/';
      } else if (type === 'register') {
        await api.register(body);
        showToast('Account created. You can sign in now.', 'success');
        window.location.hash = '#/login';
      } else if (type === 'forgot') {
        const result = await api.forgotPassword(body);
        root.insertAdjacentHTML(
          'beforeend',
          `<section class="surface-block inline-message">
            ${sectionHeader('Reset token issued', 'Use the token below in the reset form while running locally.')}
            <code class="token-block">${escapeHtml(result.resetToken || 'Token delivery hidden in this environment')}</code>
            <a class="button ghost small" href="#/reset">Open reset form</a>
          </section>`,
        );
        showToast('Reset request accepted', 'success');
      } else {
        await api.resetPassword(body);
        showToast('Password updated. Sign in with your new password.', 'success');
        window.location.hash = '#/login';
      }
    } catch (error) {
      note.textContent = error.message;
      form.appendChild(note);
    }
  });
};

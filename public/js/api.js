
const API = '/api';

// ===============================
// AUTHENTICATION MANAGEMENT
// ===============================

const Auth = {
  token: () => localStorage.getItem('token'),

  user: () => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  },

  save(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  clear() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  dashboard(role) {
    switch (role) {
      case 'admin':
        return 'admin.html';

      case 'organizer':
        return 'organizer.html';

      case 'student':
        return 'student.html';

      default:
        return 'login.html';
    }
  },

  require(roles) {
    const u = Auth.user();

    if (!Auth.token() || !u) {
      location.href = 'login.html';
      return null;
    }

    if (roles && !roles.includes(u.role)) {
      location.href = Auth.dashboard(u.role);
      return null;
    }

    return u;
  }
};


// ===============================
// API REQUEST HANDLER
// ===============================

async function api(path, method = 'GET', body) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (Auth.token()) {
    headers.Authorization = 'Bearer ' + Auth.token();
  }

  const res = await fetch(API + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = {};

  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    throw new Error(
      data.message || data.error || 'Request failed (' + res.status + ')'
    );
  }

  return data;
}


// ===============================
// DATA HELPERS
// ===============================

function pickList(data, key) {
  if (Array.isArray(data)) return data;

  if (data && Array.isArray(data[key])) {
    return data[key];
  }

  if (data && Array.isArray(data.data)) {
    return data.data;
  }

  return [];
}

function pickOne(data, key) {
  return (data && (data[key] || data.data)) || data;
}


// ===============================
// DISPLAY HELPERS
// ===============================

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function money(n) {
  return 'KES ' + Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function fmtDate(d) {
  const x = new Date(d);

  return isNaN(x)
    ? ''
    : x.toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
}


// ===============================
// MESSAGE HANDLING
// ===============================

function showMsg(id, text, type = 'error') {
  const el = document.getElementById(id);

  if (!el) return;

  el.textContent = text;
  el.className = 'msg show ' + type;
}

function clearMsg(id) {
  const el = document.getElementById(id);

  if (el) {
    el.className = 'msg';
  }
}


// ===============================
// NAVIGATION
// ===============================

function renderNav() {
  const el = document.getElementById('nav');

  if (!el) return;

  const u = Auth.user();
  const page = location.pathname.split('/').pop();

  const link = (href, text) =>
    `<a href="${href}" class="${page === href ? 'active' : ''}">${text}</a>`;

  let html = '';

  html += '<a class="logo" href="index.html">Campus Events</a>';

  if (u) {
    html += link('events.html', 'Events');

    html += link(
      Auth.dashboard(u.role),
      'My Dashboard'
    );

    html += `
      <span style="color:#9aa5bd">
        ${esc(u.name || u.email)} (${esc(u.role)})
      </span>

      <button id="logout">Log out</button>
    `;

  } else {
    html += link('login.html', 'Log in');
    html += link('register.html', 'Register');
  }

  el.className = 'nav';
  el.innerHTML = html;

  const logoutButton = document.getElementById('logout');

  if (logoutButton) {
    logoutButton.onclick = () => {
      Auth.clear();
      location.href = 'login.html';
    };
  }
}


// ===============================
// INITIALISE NAVIGATION
// ===============================

document.addEventListener('DOMContentLoaded', renderNav);

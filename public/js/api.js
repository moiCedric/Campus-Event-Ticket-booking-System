
const API = '/api';

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
            case 'admin': return 'admin.html';
            case 'organizer': return 'organizer.html';
            case 'student': return 'student.html';
            default: return 'login.html';
        }
    },

    require(roles) {
        const user = Auth.user();

        if (!Auth.token() || !user) {
            location.href = 'login.html';
            return null;
        }

        if (roles && !roles.includes(user.role)) {
            location.href = Auth.dashboard(user.role);
            return null;
        }

        return user;
    }
};

async function api(path, method = 'GET', body) {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (Auth.token()) {
        headers.Authorization = 'Bearer ' + Auth.token();
    }

    const response = await fetch(API + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    let data = {};

    try {
        data = await response.json();
    } catch {}

    if (!response.ok) {
        throw new Error(
            data.message || data.error || `Request failed (${response.status})`
        );
    }

    return data;
}

function pickList(data, key) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data[key])) return data[key];
    if (data && Array.isArray(data.data)) return data.data;
    return [];
}

function pickOne(data, key) {
    return (data && (data[key] || data.data)) || data;
}

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[character]));
}

function money(amount) {
    return 'KES ' + Number(amount || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function fmtDate(date) {
    const value = new Date(date);

    return isNaN(value)
        ? ''
        : value.toLocaleString([], {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
}

function showMsg(id, message, type = 'error') {
    const element = document.getElementById(id);

    if (!element) return;

    element.textContent = message;
    element.className = 'msg show ' + type;
}

function clearMsg(id) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = '';
        element.className = 'msg';
    }
}

function renderNav() {
    const element = document.getElementById('nav');

    if (!element) return;

    const user = Auth.user();
    const page = location.pathname.split('/').pop();

    const link = (href, text) =>
        `<a href="${href}" class="${page === href ? 'active' : ''}">${text}</a>`;

    let html = '<a class="logo" href="index.html">Campus Events</a>';

    if (user) {
        html += link('events.html', 'Events');
        html += link(Auth.dashboard(user.role), 'My Dashboard');

        html += `
            <span style="color:#9aa5bd">
                ${esc(user.name || user.email)} (${esc(user.role)})
            </span>
            <button id="logout">Log out</button>
        `;
    } else {
        html += link('login.html', 'Log in');
        html += link('register.html', 'Register');
    }

    element.className = 'nav';
    element.innerHTML = html;

    const logoutButton = document.getElementById('logout');

    if (logoutButton) {
        logoutButton.onclick = () => {
            Auth.clear();
            location.href = 'login.html';
        };
    }
}

document.addEventListener('DOMContentLoaded', renderNav);



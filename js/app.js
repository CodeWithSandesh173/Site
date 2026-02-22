// ============================================
// app.js — Shared Utilities
// ============================================

// Toast system
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast alert-${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const nav = document.querySelector('.navbar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 30);
});

// Mobile menu toggle
function initMobileMenu() {
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');
    if (toggle && links) {
        toggle.addEventListener('click', () => links.classList.toggle('mobile-open'));
        document.addEventListener('click', (e) => {
            if (!toggle.contains(e.target) && !links.contains(e.target)) {
                links.classList.remove('mobile-open');
            }
        });
    }
}

// Scroll animations
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
}

// YouTube thumbnail from URL
function getYouTubeThumbnail(url) {
    const id = extractYouTubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : '';
}

function extractYouTubeId(url) {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

// Format date
function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

// Modal helpers
function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('active');
}

function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('active');
}

// Auth-aware navigation rendering
function renderNavbar(user) {
    const navActions = document.getElementById('nav-actions');
    if (!navActions) return;

    if (user) {
        const initial = (user.email || 'U')[0].toUpperCase();
        const adminLink = isAdmin(user)
            ? '<a href="admin.html" class="btn btn-sm btn-outline">⚙ Admin</a>'
            : '';
        navActions.innerHTML = `
      ${adminLink}
      <a href="profile.html" class="nav-user">
        <div class="user-avatar">${initial}</div>
        <span class="user-name">${user.email}</span>
      </a>
      <button class="btn btn-sm btn-secondary" onclick="handleLogout()">Logout</button>
    `;
    } else {
        navActions.innerHTML = `<a href="login.html" class="btn btn-sm btn-primary">Login</a>`;
    }
}

function handleLogout() {
    auth.signOut().then(() => {
        showToast('Logged out successfully', 'success');
        setTimeout(() => window.location.href = 'index.html', 500);
    });
}

// Auth State Tracker (Global Promise for initial load)
let authInitializationPromise = new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(user => {
        unsubscribe(); // Only care about the first meaningful auth state load
        resolve(user);
    });
});

// Protect pages (redirect to login if not authenticated)
async function requireAuth() {
    try {
        let user = await authInitializationPromise;

        // If no user at all, redirect immediately
        if (!user) {
            hideLoader();
            window.location.href = 'login.html';
            return null; // Stop execution
        }

        // Check verification status
        if (!user.emailVerified) {
            try {
                await user.reload(); // Force refresh the token
                user = auth.currentUser;
            } catch (err) {
                console.error("Failed to reload user:", err);
            }

            if (!user.emailVerified) {
                hideLoader();
                showToast('Please verify your email first', 'warning');
                setTimeout(() => window.location.href = 'login.html', 1500);
                return null;
            }
        }

        hideLoader();
        return user;
    } catch (error) {
        hideLoader();
        console.error("Auth error:", error);
        window.location.href = 'login.html';
        return null;
    }
}

// Admin-only guard
async function requireAdmin() {
    const user = await requireAuth();
    if (!user) return null; // requireAuth already redirected

    if (!isAdmin(user)) {
        showToast('Access denied', 'error');
        setTimeout(() => window.location.href = 'index.html', 1500);
        return null;
    }
    return user;
}

// Loader
function showLoader() {
    let l = document.getElementById('page-loader');
    if (!l) {
        l = document.createElement('div');
        l.id = 'page-loader';
        l.className = 'loading-overlay';
        l.innerHTML = '<div class="page-loader"><div class="spinner"></div><p>Loading...</p></div>';
        document.body.appendChild(l);
    }
    l.style.display = 'flex';
}

function hideLoader() {
    const l = document.getElementById('page-loader');
    if (l) l.style.display = 'none';
}

// On DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initScrollAnimations();

    // Update nav based on auth
    auth.onAuthStateChanged(user => {
        renderNavbar(user);
    });
});

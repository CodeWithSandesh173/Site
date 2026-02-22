// ============================================
// courses.js — Course Listing & Filtering
// ============================================

let allCourses = [];
let activeCategory = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    showLoader();
    const user = await authInitializationPromise; // wait for initial auth state
    hideLoader();

    renderNavbar(user);
    await loadCourses();
    initFilters();
    initSearch();
});

async function loadCourses() {
    try {
        allCourses = await db.getCourses();
        renderCourses(allCourses);
        renderCategoryPills();
    } catch (err) {
        showToast('Failed to load courses', 'error');
    }
}

function renderCourses(courses) {
    const grid = document.getElementById('courses-grid');
    if (!grid) return;

    if (courses.length === 0) {
        grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <div class="empty-icon">📚</div>
        <h3>No courses found</h3>
        <p>Check back soon for new content!</p>
      </div>`;
        return;
    }

    grid.innerHTML = courses.map(c => {
        const thumb = c.thumbnail || getYouTubeThumbnail(c.youtubeUrl);
        const badge = c.type === 'paid'
            ? `<span class="badge badge-paid">Rs. ${c.price || 'Paid'}</span>`
            : '<span class="badge badge-free">Free</span>';

        return `
      <div class="course-card animate-on-scroll" onclick="openCourse('${c.id}')">
        <div class="card-thumb">
          <img src="${thumb}" alt="${c.title}" onerror="this.src='https://via.placeholder.com/640x360/1a1a2e/7c3aed?text=Code With Sandesh'">
          <div class="thumb-overlay">
            <div class="play-icon">▶</div>
          </div>
        </div>
        <div class="card-body">
          <span class="card-category">${c.category || 'General'}</span>
          <h3 class="card-title">${c.title}</h3>
          <p class="card-desc">${c.description || ''}</p>
        </div>
        <div class="card-footer">
          ${badge}
          <span style="font-size:0.78rem;color:var(--text-muted)">${formatDate(c.createdAt)}</span>
        </div>
      </div>`;
    }).join('');

    initScrollAnimations();
}

function renderCategoryPills() {
    const container = document.getElementById('filter-pills');
    if (!container) return;

    const cats = {};
    allCourses.forEach(c => {
        const cat = c.category || 'General';
        cats[cat] = (cats[cat] || 0) + 1;
    });

    let html = `<button class="filter-pill active" data-category="all">All (${allCourses.length})</button>`;
    Object.entries(cats).sort().forEach(([cat, count]) => {
        html += `<button class="filter-pill" data-category="${cat}">${cat} (${count})</button>`;
    });
    container.innerHTML = html;
}

function initFilters() {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-pill')) {
            document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            activeCategory = e.target.dataset.category;
            filterCourses();
        }
    });
}

function initSearch() {
    const input = document.getElementById('search-input');
    if (input) {
        input.addEventListener('input', () => filterCourses());
    }
}

function filterCourses() {
    const query = (document.getElementById('search-input')?.value || '').toLowerCase();
    let filtered = allCourses;

    if (activeCategory !== 'all') {
        filtered = filtered.filter(c => (c.category || 'General') === activeCategory);
    }

    if (query) {
        filtered = filtered.filter(c =>
            c.title.toLowerCase().includes(query) ||
            (c.description || '').toLowerCase().includes(query) ||
            (c.category || '').toLowerCase().includes(query)
        );
    }

    renderCourses(filtered);
}

function openCourse(id) {
    const user = auth.currentUser;
    if (!user) {
        showToast('Please login to view courses', 'warning');
        window.location.href = `login.html?redirect=course.html?id=${id}`;
        return;
    }
    // We let course.html handle the actual verification check and async reloads
    // as it uses requireAuth() which is built specifically for that.
    window.location.href = `course.html?id=${id}`;
}

// ============================================
// admin.js — Admin Panel Logic
// ============================================

let adminCourses = [];
let editingCourseId = null;

document.addEventListener('DOMContentLoaded', async () => {
    showLoader();
    const user = await requireAdmin();
    if (!user) return; // Not admin, redirected already

    await loadAdminDashboard();
    initAdminEvents();
});

async function loadAdminDashboard() {
    try {
        const stats = await db.getStats();
        renderStats(stats);
        await loadAdminCourses();
        await loadPaymentRequests();
    } catch (err) {
        showToast('Failed to load dashboard', 'error');
    }
}

function renderStats(stats) {
    const grid = document.getElementById('stats-grid');
    if (!grid) return;
    grid.innerHTML = `
    <div class="stat-card">
      <div class="stat-icon" style="background:rgba(124,58,237,0.15);color:var(--accent-secondary)">📚</div>
      <div class="stat-value">${stats.totalCourses}</div>
      <div class="stat-label">Total Courses</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:rgba(16,185,129,0.15);color:var(--success)">🆓</div>
      <div class="stat-value">${stats.freeCourses}</div>
      <div class="stat-label">Free Courses</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:rgba(245,158,11,0.15);color:var(--warning)">💰</div>
      <div class="stat-value">${stats.paidCourses}</div>
      <div class="stat-label">Paid Courses</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:rgba(59,130,246,0.15);color:var(--info)">👥</div>
      <div class="stat-value">${stats.totalUsers}</div>
      <div class="stat-label">Users</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:rgba(239,68,68,0.15);color:var(--error)">⏳</div>
      <div class="stat-value">${stats.pendingPayments}</div>
      <div class="stat-label">Pending Payments</div>
    </div>`;
}

async function loadAdminCourses() {
    adminCourses = await db.getCourses();
    renderAdminCourses();
}

function renderAdminCourses() {
    const tbody = document.getElementById('courses-tbody');
    if (!tbody) return;

    if (adminCourses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted)">No courses yet. Click "Add Course" to get started.</td></tr>';
        return;
    }

    tbody.innerHTML = adminCourses.map(c => `
    <tr>
      <td><strong>${c.title}</strong></td>
      <td><span class="badge badge-category">${c.category || 'General'}</span></td>
      <td><span class="badge badge-${c.type === 'paid' ? 'paid' : 'free'}">${c.type === 'paid' ? 'Rs. ' + (c.price || '0') : 'Free'}</span></td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><a href="${c.youtubeUrl}" target="_blank" style="font-size:0.82rem">${c.youtubeUrl}</a></td>
      <td style="font-size:0.82rem;color:var(--text-muted)">${formatDate(c.createdAt)}</td>
      <td>
        <div class="actions">
          <button class="btn btn-sm btn-secondary" onclick="editCourse('${c.id}')">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deleteCourse('${c.id}')">🗑️</button>
        </div>
      </td>
    </tr>`).join('');
}

async function loadPaymentRequests() {
    const payments = await db.getPaymentRequests();
    const tbody = document.getElementById('payments-tbody');
    if (!tbody) return;

    const pending = payments.filter(p => p.status === 'pending');

    if (pending.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted)">No pending payment requests</td></tr>';
        return;
    }

    tbody.innerHTML = pending.map(p => `
    <tr>
      <td style="font-size:0.85rem">${p.userEmail}</td>
      <td>${p.courseTitle}</td>
      <td><img src="${p.screenshotBase64}" class="screenshot-thumb" onclick="viewScreenshot('${p.id}')" alt="Screenshot"></td>
      <td><span class="badge badge-${p.status}">${p.status}</span></td>
      <td>
        <div class="actions">
          <button class="btn btn-sm btn-success" onclick="approvePayment('${p.id}','${p.userId}','${p.courseId}')">✓ Approve</button>
          <button class="btn btn-sm btn-danger" onclick="rejectPayment('${p.id}')">✕ Reject</button>
        </div>
      </td>
    </tr>`).join('');
}

// Event handlers
function initAdminEvents() {
    // Sidebar navigation
    document.querySelectorAll('.admin-sidebar-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.admin-sidebar-nav a').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const tab = link.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById('tab-' + tab)?.classList.add('active');
        });
    });

    // Add course button
    document.getElementById('btn-add-course')?.addEventListener('click', () => {
        editingCourseId = null;
        document.getElementById('modal-title').textContent = 'Add New Course';
        document.getElementById('course-form').reset();
        document.getElementById('price-group').classList.add('hidden');
        openModal('course-modal');
    });

    // Course type toggle
    document.getElementById('course-type')?.addEventListener('change', (e) => {
        document.getElementById('price-group').classList.toggle('hidden', e.target.value !== 'paid');
    });

    // Course form submit
    document.getElementById('course-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            title: document.getElementById('course-title-input').value.trim(),
            description: document.getElementById('course-desc').value.trim(),
            category: document.getElementById('course-category').value.trim(),
            youtubeUrl: document.getElementById('course-youtube').value.trim(),
            type: document.getElementById('course-type').value,
            price: document.getElementById('course-price-input')?.value.trim() || '0',
            thumbnail: getYouTubeThumbnail(document.getElementById('course-youtube').value.trim())
        };

        try {
            await db.saveCourse(editingCourseId, data);
            showToast(editingCourseId ? 'Course updated!' : 'Course added!', 'success');
            closeModal('course-modal');
            await loadAdminCourses();
            const stats = await db.getStats();
            renderStats(stats);
        } catch (err) {
            showToast('Failed to save course', 'error');
        }
    });
}

async function editCourse(id) {
    const course = adminCourses.find(c => c.id === id);
    if (!course) return;

    editingCourseId = id;
    document.getElementById('modal-title').textContent = 'Edit Course';
    document.getElementById('course-title-input').value = course.title;
    document.getElementById('course-desc').value = course.description || '';
    document.getElementById('course-category').value = course.category || '';
    document.getElementById('course-youtube').value = course.youtubeUrl || '';
    document.getElementById('course-type').value = course.type || 'free';
    document.getElementById('course-price-input').value = course.price || '';
    document.getElementById('price-group').classList.toggle('hidden', course.type !== 'paid');
    openModal('course-modal');
}

async function deleteCourse(id) {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
        await db.deleteCourse(id);
        showToast('Course deleted', 'success');
        await loadAdminCourses();
        const stats = await db.getStats();
        renderStats(stats);
    } catch (err) {
        showToast('Failed to delete course', 'error');
    }
}

async function approvePayment(requestId, userId, courseId) {
    try {
        await db.updatePaymentStatus(requestId, 'approved');
        await db.enrollUser(userId, courseId);
        showToast('Payment approved! User enrolled.', 'success');
        await loadPaymentRequests();
        const stats = await db.getStats();
        renderStats(stats);
    } catch (err) {
        showToast('Failed to approve payment', 'error');
    }
}

async function rejectPayment(requestId) {
    if (!confirm('Reject this payment request?')) return;
    try {
        await db.updatePaymentStatus(requestId, 'rejected');
        showToast('Payment rejected', 'info');
        await loadPaymentRequests();
    } catch (err) {
        showToast('Failed to reject payment', 'error');
    }
}

function viewScreenshot(requestId) {
    const payments = document.querySelectorAll('.screenshot-thumb');
    // Find the image by iterating
    db.getPaymentRequests().then(all => {
        const p = all.find(x => x.id === requestId);
        if (p) {
            const modal = document.getElementById('screenshot-modal');
            document.getElementById('screenshot-full').src = p.screenshotBase64;
            openModal('screenshot-modal');
        }
    });
}

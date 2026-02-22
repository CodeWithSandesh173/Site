// ============================================
// payment.js — Payment Screenshot Upload
// ============================================

let currentCourse = null;

document.addEventListener('DOMContentLoaded', async () => {
    showLoader();
    const user = await requireAuth();
    if (!user) return; // not authenticated, redirect handled in app.js

    const courseId = new URLSearchParams(window.location.search).get('id');
    if (!courseId) {
        window.location.href = 'courses.html';
        return;
    }

    currentCourse = await db.getCourse(courseId);
    if (!currentCourse) {
        showToast('Course not found', 'error');
        window.location.href = 'courses.html';
        return;
    }

    // Check if already enrolled
    const enrolled = await db.isEnrolled(user.uid, courseId);
    if (enrolled) {
        window.location.href = `course.html?id=${courseId}`;
        return;
    }

    // Check for existing pending request
    const payments = await db.getUserPayments(user.uid);
    const existing = payments.find(p => p.courseId === courseId && p.status === 'pending');

    renderPaymentPage(currentCourse, existing);
    if (!existing) initUpload(user, courseId);
});

function renderPaymentPage(course, existingRequest) {
    const container = document.getElementById('payment-content');
    if (!container) return;

    document.getElementById('course-title').textContent = course.title;
    document.getElementById('course-price').textContent = `Rs. ${course.price || '0'}`;

    if (existingRequest) {
        document.getElementById('upload-section').classList.add('hidden');
        document.getElementById('status-section').classList.remove('hidden');
        document.getElementById('payment-status').textContent = 'Pending Approval';
        document.getElementById('payment-status').className = 'badge badge-pending';
    }
}

function initUpload(user, courseId) {
    const zone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('screenshot-input');
    const preview = document.getElementById('upload-preview');
    const previewImg = document.getElementById('preview-img');
    const submitBtn = document.getElementById('submit-payment');
    let fileBase64 = null;

    if (!zone || !fileInput) return;

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) processFile(file);
    });

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    });

    function processFile(file) {
        if (!file.type.startsWith('image/')) {
            showToast('Please upload an image file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Max dimensions
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress heavily to ensure under 1MB
                let quality = 0.7;
                fileBase64 = canvas.toDataURL('image/jpeg', quality);

                // Estimate base64 size: length * 0.75
                if (fileBase64.length * 0.75 > 1024 * 1024) {
                    // Try harder if still too big
                    quality = 0.5;
                    fileBase64 = canvas.toDataURL('image/jpeg', quality);
                }

                if (fileBase64.length * 0.75 > 1024 * 1024) {
                    showToast('Image still too large after compression. Max 1MB allowed.', 'error');
                    fileBase64 = null;
                    return;
                }

                previewImg.src = fileBase64;
                preview.classList.remove('hidden');
                submitBtn.disabled = false;
            };
        };
        reader.readAsDataURL(file);
    }

    submitBtn.addEventListener('click', async () => {
        if (!fileBase64) {
            showToast('Please upload a screenshot', 'warning');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
            await db.submitPayment({
                userId: user.uid,
                userEmail: user.email,
                courseId: courseId,
                courseTitle: currentCourse.title,
                screenshotBase64: fileBase64
            });

            showToast('Payment submitted! Waiting for approval.', 'success');
            document.getElementById('upload-section').classList.add('hidden');
            document.getElementById('status-section').classList.remove('hidden');
            document.getElementById('payment-status').textContent = 'Pending Approval';
            document.getElementById('payment-status').className = 'badge badge-pending';
        } catch (err) {
            showToast('Failed to submit payment', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Payment';
        }
    });
}

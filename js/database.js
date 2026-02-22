// ============================================
// database.js — Realtime Database Helpers
// ============================================

const db = {
    // Courses
    async getCourses() {
        const snap = await database.ref('courses').once('value');
        const data = snap.val() || {};
        return Object.entries(data).map(([id, v]) => ({ id, ...v }));
    },

    async getCourse(id) {
        const snap = await database.ref('courses/' + id).once('value');
        return snap.exists() ? { id, ...snap.val() } : null;
    },

    async saveCourse(id, data) {
        if (id) {
            await database.ref('courses/' + id).update(data);
            return id;
        }
        const ref = database.ref('courses').push();
        await ref.set({ ...data, createdAt: Date.now() });
        return ref.key;
    },

    async deleteCourse(id) {
        await database.ref('courses/' + id).remove();
    },

    // Users
    async getUser(uid) {
        const snap = await database.ref('users/' + uid).once('value');
        return snap.val();
    },

    async updateUser(uid, data) {
        await database.ref('users/' + uid).update(data);
    },

    async enrollUser(uid, courseId) {
        await database.ref(`users/${uid}/enrolledCourses/${courseId}`).set(true);
    },

    async isEnrolled(uid, courseId) {
        const snap = await database.ref(`users/${uid}/enrolledCourses/${courseId}`).once('value');
        return snap.val() === true;
    },

    // Payment Requests
    async submitPayment(data) {
        const ref = database.ref('paymentRequests').push();
        await ref.set({ ...data, status: 'pending', createdAt: Date.now() });
        return ref.key;
    },

    async getPaymentRequests() {
        const snap = await database.ref('paymentRequests').once('value');
        const data = snap.val() || {};
        return Object.entries(data).map(([id, v]) => ({ id, ...v }));
    },

    async getUserPayments(uid) {
        const snap = await database.ref('paymentRequests').orderByChild('userId').equalTo(uid).once('value');
        const data = snap.val() || {};
        return Object.entries(data).map(([id, v]) => ({ id, ...v }));
    },

    async updatePaymentStatus(requestId, status) {
        await database.ref('paymentRequests/' + requestId).update({ status });
    },

    // Categories (derived from courses)
    async getCategories() {
        const courses = await this.getCourses();
        const cats = {};
        courses.forEach(c => {
            const cat = c.category || 'Uncategorized';
            cats[cat] = (cats[cat] || 0) + 1;
        });
        return cats;
    },

    // Stats for admin
    async getStats() {
        const [courses, payments] = await Promise.all([
            this.getCourses(),
            this.getPaymentRequests()
        ]);
        const usersSnap = await database.ref('users').once('value');
        const usersCount = usersSnap.numChildren();

        return {
            totalCourses: courses.length,
            freeCourses: courses.filter(c => c.type === 'free').length,
            paidCourses: courses.filter(c => c.type === 'paid').length,
            totalUsers: usersCount,
            pendingPayments: payments.filter(p => p.status === 'pending').length
        };
    }
};

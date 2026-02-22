// ============================================
// auth.js — Authentication + Email Verification
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const authContainer = document.querySelector('.auth-container');
    const alertBox = document.getElementById('auth-alert');

    // Check auth state on load via our global promise tracker
    (async function checkInitialAuthState() {
        const user = await authInitializationPromise;
        if (user) {
            const redirect = new URLSearchParams(window.location.search).get('redirect');
            window.location.href = redirect || 'courses.html';
        }
    })();

    // Login - Google
    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            clearAlert();
            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                const cred = await auth.signInWithPopup(provider);

                // If this is a new google user, or we just want to ensure they are in the DB
                const userRef = database.ref('users/' + cred.user.uid);
                const snapshot = await userRef.once('value');
                if (!snapshot.exists()) {
                    await userRef.set({
                        email: cred.user.email,
                        displayName: cred.user.displayName,
                        enrolledCourses: {},
                        createdAt: Date.now()
                    });
                }

                showToast('Welcome back!', 'success');
                const redirect = new URLSearchParams(window.location.search).get('redirect');
                window.location.href = redirect || 'courses.html';
            } catch (err) {
                console.error(err);
                showAlert(getAuthError(err.code), 'error');
            }
        });
    }

    // Alert helpers
    function showAlert(msg, type) {
        if (!alertBox) return;
        alertBox.className = `alert alert-${type}`;
        alertBox.textContent = msg;
        alertBox.classList.remove('hidden');
    }

    function clearAlert() {
        if (alertBox) alertBox.classList.add('hidden');
    }

    function getAuthError(code) {
        const errors = {
            'auth/popup-closed-by-user': 'Login cancelled.',
            'auth/network-request-failed': 'Network error. Please try again.',
            // Fallback for general errors
        };
        return errors[code] || 'An error occurred. Please try again.';
    }
});

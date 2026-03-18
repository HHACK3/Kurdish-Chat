// Authentication System for Kurdish Chat Web App

// Show/Hide Forms
function showLogin() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('signupForm').classList.add('hidden');
}

function showSignup() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('signupForm').classList.remove('hidden');
}

// Login with Email and Password
async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showToast('تکایە هەموو بەشەکان پڕ بکە', 'warning');
        return;
    }
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast('بە سەرکەوتوویی چووتە ژوورەوە', 'success');
        
        // Delay redirect to show toast message
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    } catch (error) {
        console.error('Login error:', error);
        let message = 'چوونەژوورەوە سەرکەوتوو نەبوو';
        
        switch(error.code) {
            case 'auth/user-not-found':
                message = 'ئەم بەکارهێنەرە نەدۆزرایەوە';
                break;
            case 'auth/wrong-password':
                message = 'تێپەڕەوشە هەڵەیە';
                break;
            case 'auth/invalid-email':
                message = 'ئیمەیل هەڵەیە';
                break;
            case 'auth/user-disabled':
                message = 'ئەم هەژمارە قەدەغە کراوە';
                break;
            case 'auth/too-many-requests':
                message = 'زۆر هەوڵدرا، تکایە پاش چەند خولەکێک هەوڵبدەرەوە';
                break;
        }
        
        showToast(message, 'error');
    }
}

// Sign Up with Email and Password
async function signup() {
    const name = document.getElementById('signupName').value;
    const username = document.getElementById('signupUsername').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    
    console.log('Signup data:', { name, username, email, password: '***', confirmPassword: '***' });
    
    // Validation
    if (!name || !username || !email || !password || !confirmPassword) {
        console.log('Validation failed: empty fields');
        showToast('تکایە هەموو بەشەکان پڕ بکە', 'warning');
        return;
    }
    
    if (!utils.validateEmail(email)) {
        console.log('Validation failed: invalid email');
        showToast('ئیمەیل هەڵەیە', 'error');
        return;
    }
    
    if (!utils.validateUsername(username)) {
        console.log('Validation failed: invalid username');
        showToast('ناوی بەکارهێنەر دەبێت لەنێوان 3-20 پیت بێت', 'error');
        return;
    }
    
    if (!utils.validatePassword(password)) {
        console.log('Validation failed: weak password');
        showToast('تێپەڕەوشە دەبێت لەکەم 6 پیت بێت', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        console.log('Validation failed: passwords do not match');
        showToast('تێپەڕەوشەکان یەک نین', 'error');
        return;
    }
    
    console.log('Validation passed, creating user...');
    
    try {
        // Check if username already exists
        console.log('Checking username availability...');
        const usernameSnapshot = await db.collection('users')
            .where('username', '==', username)
            .get();
        
        if (!usernameSnapshot.empty) {
            console.log('Username already exists');
            showToast('ئەم ناوی بەکارهێنەرە پێشتر هەیە', 'error');
            return;
        }
        
        console.log('Username available, creating Firebase user...');
        
        // Create user account
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('Firebase user created:', user.uid);
        
        // Create user profile in Firestore
        console.log('Creating user profile in Firestore...');
        console.log('User UID:', user.uid);
        console.log('Database instance:', db);
        console.log('Attempting Firestore write...');
        
        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            email: email,
            firstName: name,
            username: username,
            profilePhoto: `https://picsum.photos/seed/${user.uid}/150/150.jpg`,
            bio: '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isOnline: false
        });
        
        console.log('Firestore write successful');
        
        showToast('بە سەرکەوتوویی تۆمارکریت', 'success');
        
        // Delay redirect to show toast message
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('Signup error:', error);
        let message = 'تۆمارکردن سەرکەوتوو نەبوو';
        
        switch(error.code) {
            case 'auth/email-already-in-use':
                message = 'ئەم ئیمەیلە پێشتر بەکارهاتووە';
                break;
            case 'auth/invalid-email':
                message = 'ئیمەیل هەڵەیە';
                break;
            case 'auth/operation-not-allowed':
                message = 'تۆمارکردن ڕاگیراوە';
                break;
            case 'auth/weak-password':
                message = 'تێپەڕەوشە لاوازە';
                break;
            case 'auth/network-request-failed':
                message = 'کێشە لە هێڵی نێتۆرک';
                break;
            case 'auth/too-many-requests':
                message = 'زۆر هەوڵدرا، تکایە پاش چەند خولەکێک هەوڵبدەرەوە';
                break;
        }
        
        showToast(message, 'error');
    }
}

// Sign In with Google
async function signInWithGoogle() {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;
        
        // Check if user exists in Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            // Create new user profile
            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                firstName: user.displayName || 'بەکارهێنەر',
                username: user.email.split('@')[0] + '_' + Date.now(),
                profilePhoto: user.photoURL || `https://picsum.photos/seed/${user.uid}/150/150.jpg`,
                role: 'user',
                status: 'ئامادە',
                isOnline: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Update last login
            await db.collection('users').doc(user.uid).update({
                isOnline: true,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        showToast('بە سەرکەوتوویی چووتە ژوورەوە', 'success');
        
        // Delay redirect to show toast message
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('Google sign-in error:', error);
        showToast('چوونەژوورەوە سەرکەوتوو نەبوو', 'error');
    }
}

// Logout
async function logout() {
    try {
        await auth.signOut();
        
        // Update user status
        if (auth.currentUser) {
            await db.collection('users').doc(auth.currentUser.uid).update({
                isOnline: false,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Trigger logout event for presence system
        window.dispatchEvent(new Event('logout'));
        
        showToast('بە سەرکەوتوویی دەرچووت', 'success');
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('Logout error:', error);
        showToast('دەرچوون سەرکەوتوو نەبوو', 'error');
    }
}

// Password Reset
async function resetPassword(email) {
    try {
        await auth.sendPasswordResetEmail(email);
        showToast('ئیمەیلێک بۆ گۆڕینی تێپەڕەوشە نێردرا', 'success');
    } catch (error) {
        console.error('Password reset error:', error);
        showToast('نەتوانرا ئیمەیل بنێردرێت', 'error');
    }
}

// Update User Profile
async function updateProfile(updates) {
    try {
        const user = await utils.getCurrentUser();
        
        await db.collection('users').doc(user.uid).update({
            ...updates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('پڕۆفایل بە سەرکەوتوویی نوێکرایەوە', 'success');
    } catch (error) {
        console.error('Profile update error:', error);
        showToast('نەتوانرا پڕۆفایل نوێبکرێتەوە', 'error');
    }
}

// Change Password
async function changePassword(currentPassword, newPassword) {
    try {
        const user = await utils.getCurrentUser();
        
        // Reauthenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(
            user.email, 
            currentPassword
        );
        
        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(newPassword);
        
        showToast('تێپەڕەوشە بە سەرکەوتوویی گۆڕدرا', 'success');
    } catch (error) {
        console.error('Password change error:', error);
        let message = 'نەتوانرا تێپەڕەوشە بگۆڕدرێت';
        
        switch(error.code) {
            case 'auth/wrong-password':
                message = 'تێپەڕەوشەی کۆن هەڵەیە';
                break;
            case 'auth/weak-password':
                message = 'تێپەڕەوشەی نوێ لاوازە';
                break;
        }
        
        showToast(message, 'error');
    }
}

// Delete User Account
async function deleteAccount(password) {
    try {
        const user = await utils.getCurrentUser();
        
        // Reauthenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(
            user.email, 
            password
        );
        
        await user.reauthenticateWithCredential(credential);
        
        // Delete user data from Firestore
        await db.collection('users').doc(user.uid).delete();
        
        // Delete user account
        await user.delete();
        
        showToast('هەژمارەکەت بە سەرکەوتوویی سڕایەوە', 'success');
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('Account deletion error:', error);
        showToast('نەتوانرا هەژمارەکەت بسڕێتەوە', 'error');
    }
}

// Authentication State Observer
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // User is signed in
        console.log('User is signed in:', user.uid);
        
        // Update user status
        await utils.updateUserStatus('ئامادە');
        
        // Update last seen
        await db.collection('users').doc(user.uid).update({
            isOnline: true,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
        
    } else {
        // User is signed out
        console.log('User is signed out');
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (auth.currentUser) {
        if (document.hidden) {
            utils.updateUserStatus('دوور');
        } else {
            utils.updateUserStatus('ئامادە');
        }
    }
});

// Export functions
window.authFunctions = {
    showLogin,
    showSignup,
    login,
    signup,
    signInWithGoogle,
    logout,
    resetPassword,
    updateProfile,
    changePassword,
    deleteAccount
};

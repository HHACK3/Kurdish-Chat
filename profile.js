// Profile Management for Kurdish Chat Web App

// Initialize Profile
document.addEventListener('DOMContentLoaded', async () => {
    await utils.requireAuth();
    loadProfileData();
    setupEventListeners();
});

// Create or Update User Document
async function createOrUpdateUserDocument(user, existingData) {
    try {
        const userDoc = {
            uid: user.uid,
            email: user.email,
            firstName: existingData?.firstName || user.displayName || user.email?.split('@')[0] || 'بەکارهێنەر',
            username: existingData?.username || user.email?.split('@')[0] || 'user_' + user.uid.slice(-6),
            profilePhoto: existingData?.profilePhoto || user.photoURL || 'https://picsum.photos/seed/default/150/150.jpg',
            bio: existingData?.bio || '',
            isOnline: true,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            status: existingData?.status || 'ئامادە',
            createdAt: existingData?.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('users').doc(user.uid).set(userDoc, { merge: true });
        console.log('User document created/updated successfully');
        
        // Reload profile data after creating document
        await loadProfileData();
        
    } catch (error) {
        console.error('Error creating/updating user document:', error);
    }
}

// Load Profile Data
async function loadProfileData() {
    try {
        console.log('Loading profile data...');
        const user = await utils.getCurrentUser();
        console.log('Current user:', user);
        
        if (!user) {
            console.error('No user found');
            utils.showToast('هیچ بەکارهێنەرێک چوونەژوورەوە نییە', 'error');
            window.location.href = 'index.html';
            return;
        }
        
        console.log('Getting user data for UID:', user.uid);
        const userData = await utils.getUserData(user.uid);
        console.log('User data retrieved:', userData);
        
        if (!userData) {
            console.error('No user data found in Firestore');
            utils.showToast('نەتوانرا زانیاری پڕۆفایل بەدەستبهێنرێت', 'error');
            return;
        }
        
        // Update profile display - use Firebase Auth data as fallback
        const displayName = document.getElementById('displayName');
        const displayUsername = document.getElementById('displayUsername');
        const profilePhoto = document.getElementById('profilePhoto');
        
        if (displayName) displayName.textContent = userData.firstName || user.displayName || user.email || 'ناوی بەکارهێنەر';
        if (displayUsername) displayUsername.textContent = '@' + (userData.username || user.email?.split('@')[0] || 'username');
        if (profilePhoto) profilePhoto.src = userData.profilePhoto || user.photoURL || 'https://picsum.photos/seed/default/150/150.jpg';
        
        // Update form fields
        const editName = document.getElementById('editName');
        const editUsername = document.getElementById('editUsername');
        const editEmail = document.getElementById('editEmail');
        const editBio = document.getElementById('editBio');
        
        if (editName) editName.value = userData.firstName || user.displayName || '';
        if (editUsername) editUsername.value = userData.username || user.email?.split('@')[0] || '';
        if (editEmail) editEmail.value = userData.email || user.email || '';
        if (editBio) editBio.value = userData.bio || '';
        
        // Create user document in Firestore if it doesn't exist or is incomplete
        if (!userData || !userData.firstName) {
            console.log('Creating/updating user document in Firestore...');
            await createOrUpdateUserDocument(user, userData);
        }
        
        // Load stats
        await loadProfileStats(user.uid);
        
        // Load notification settings
        loadNotificationSettings();
        
        console.log('Profile data loaded successfully');
        
    } catch (error) {
        console.error('Error loading profile data:', error);
        utils.showToast('هەڵەیەک ڕوویدا لە بارکردنی پڕۆفایل', 'error');
    }
}

// Load Profile Stats
async function loadProfileStats(userId) {
    try {
        // Friends count
        const friendsSnapshot = await db.collection('friends')
            .where('userA', '==', userId)
            .get();
        document.getElementById('friendsCount').textContent = friendsSnapshot.size;
        
        // Groups count
        const groupsSnapshot = await db.collection('publicGroups')
            .where('members', 'array-contains', userId)
            .get();
        document.getElementById('groupsCount').textContent = groupsSnapshot.size;
        
        // Chats count
        const chatsSnapshot = await db.collection('privateChats')
            .where('participants', 'array-contains', userId)
            .get();
        document.getElementById('chatsCount').textContent = chatsSnapshot.size;
        
        // Member since
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        if (userData && userData.createdAt) {
            document.getElementById('memberSince').textContent = utils.formatDate(userData.createdAt);
        }
        
    } catch (error) {
        console.error('Error loading profile stats:', error);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Profile form submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    // Change password form
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleChangePassword);
    }
    
    // Notification settings
    const notificationInputs = ['messageNotifications', 'friendNotifications', 'groupNotifications'];
    notificationInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('change', handleNotificationSettingChange);
        }
    });
}

// Handle Profile Update
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const name = document.getElementById('editName').value.trim();
    const username = document.getElementById('editUsername').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    
    // Validation
    if (!name) {
        utils.showToast('تکایە ناوی تەواو بنووسە', 'warning');
        return;
    }
    
    if (!username) {
        utils.showToast('تکایە ناوی بەکارهێنەر بنووسە', 'warning');
        return;
    }
    
    if (!utils.validateUsername(username)) {
        utils.showToast('ناوی بەکارهێنەر دەبێت لەنێوان 3-20 پیت بێت', 'error');
        return;
    }
    
    try {
        const user = await utils.getCurrentUser();
        
        // Check if username is already taken by another user
        const usernameSnapshot = await db.collection('users')
            .where('username', '==', username)
            .get();
        
        let usernameTaken = false;
        usernameSnapshot.forEach(doc => {
            if (doc.id !== user.uid) {
                usernameTaken = true;
            }
        });
        
        if (usernameTaken) {
            utils.showToast('ئەم ناوی بەکارهێنەرە پێشتر هەیە', 'error');
            return;
        }
        
        // Update profile
        await authFunctions.updateProfile({
            firstName: name,
            username: username,
            bio: bio
        });
        
        // Update display
        document.getElementById('displayName').textContent = name;
        document.getElementById('displayUsername').textContent = '@' + username;
        
    } catch (error) {
        console.error('Profile update error:', error);
        utils.showToast('نەتوانرا پڕۆفایل نوێبکرێتەوە', 'error');
    }
}

// Upload Photo
async function uploadPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        utils.showToast('تکایە وێنە هەڵبژێرە', 'error');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        utils.showToast('قەبارەی وێنە دەبێت کەمتر بێت لە 5MB', 'error');
        return;
    }
    
    try {
        const user = await utils.getCurrentUser();
        
        // Upload to Firebase Storage
        const storageRef = storage.ref(`profilePhotos/${user.uid}/${file.name}`);
        const uploadTask = storageRef.put(file);
        
        // Show upload progress
        utils.showToast('دەستپێکردنی بارکردنی وێنە...', 'info');
        
        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload progress:', progress + '%');
            },
            (error) => {
                console.error('Upload error:', error);
                utils.showToast('نەتوانرا وێنە باربکرێت', 'error');
            },
            async () => {
                // Get download URL
                const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                
                // Update user profile
                await authFunctions.updateProfile({
                    profilePhoto: downloadURL
                });
                
                // Update display
                document.getElementById('profilePhoto').src = downloadURL;
                
                utils.showToast('وێنە بە سەرکەوتوویی نوێکرایەوە', 'success');
            }
        );
        
    } catch (error) {
        console.error('Photo upload error:', error);
        utils.showToast('نەتوانرا وێنە باربکرێت', 'error');
    }
}

// Show Change Password Modal
function showChangePassword() {
    document.getElementById('changePasswordModal').classList.remove('hidden');
}

// Close Change Password Modal
function closeChangePassword() {
    document.getElementById('changePasswordModal').classList.add('hidden');
    document.getElementById('changePasswordForm').reset();
}

// Handle Change Password
async function handleChangePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    // Validation
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        utils.showToast('تکایە هەموو بەشەکان پڕ بکە', 'warning');
        return;
    }
    
    if (!utils.validatePassword(newPassword)) {
        utils.showToast('تێپەڕەوشەی نوێ دەبێت لەکەم 6 پیت بێت', 'error');
        return;
    }
    
    if (newPassword !== confirmNewPassword) {
        utils.showToast('تێپەڕەوشەی نوێ یەک نین', 'error');
        return;
    }
    
    try {
        await authFunctions.changePassword(currentPassword, newPassword);
        closeChangePassword();
    } catch (error) {
        console.error('Password change error:', error);
    }
}

// Show Two Factor Settings
function showTwoFactorSettings() {
    utils.showToast('ڕێکخستنەکانی دوو فاکتەر بەزوو دێن', 'info');
}

// Show Privacy Settings
function showPrivacySettings() {
    utils.showToast('ڕێکخستنەکانی تایبەتی بەزوو دێن', 'info');
}

// Load Notification Settings
async function loadNotificationSettings() {
    try {
        const user = await utils.getCurrentUser();
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        if (userData && userData.notificationSettings) {
            const settings = userData.notificationSettings;
            
            document.getElementById('messageNotifications').checked = settings.messages !== false;
            document.getElementById('friendNotifications').checked = settings.friends !== false;
            document.getElementById('groupNotifications').checked = settings.groups !== false;
        }
        
    } catch (error) {
        console.error('Error loading notification settings:', error);
    }
}

// Handle Notification Setting Change
async function handleNotificationSettingChange(e) {
    const settingId = e.target.id;
    const isEnabled = e.target.checked;
    
    try {
        const user = await utils.getCurrentUser();
        
        let settingField;
        switch(settingId) {
            case 'messageNotifications':
                settingField = 'notificationSettings.messages';
                break;
            case 'friendNotifications':
                settingField = 'notificationSettings.friends';
                break;
            case 'groupNotifications':
                settingField = 'notificationSettings.groups';
                break;
        }
        
        await db.collection('users').doc(user.uid).update({
            [settingField]: isEnabled
        });
        
        utils.showToast('ڕێکخستنەکانی ئاگادارکردنەوە نوێکرایەوە', 'success');
        
    } catch (error) {
        console.error('Error updating notification settings:', error);
        utils.showToast('نەتوانرا ڕێکخستنەکان نوێبکرێتەوە', 'error');
        
        // Revert checkbox state
        e.target.checked = !e.target.checked;
    }
}

// Navigation Functions
function goToDashboard() {
    window.location.href = 'dashboard.html';
}

function logout() {
    authFunctions.logout();
}

// Export functions
window.profileFunctions = {
    uploadPhoto,
    showChangePassword,
    closeChangePassword,
    showTwoFactorSettings,
    showPrivacySettings,
    goToDashboard,
    logout
};

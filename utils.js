// Utility Functions for Kurdish Chat Web App

// Toast Notification System
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    
    // Set background color based on type
    toast.className = 'fixed bottom-4 left-4 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 transform';
    
    switch(type) {
        case 'success':
            toast.classList.add('bg-green-600', 'text-white');
            break;
        case 'error':
            toast.classList.add('bg-red-600', 'text-white');
            break;
        case 'warning':
            toast.classList.add('bg-yellow-600', 'text-white');
            break;
        default:
            toast.classList.add('bg-gray-800', 'text-white');
    }
    
    // Show toast
    setTimeout(() => {
        toast.classList.remove('translate-y-full');
    }, 100);
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.add('translate-y-full');
    }, 3000);
}

// Date Formatting
function formatDate(date, format = 'short') {
    if (!date) return '-';
    
    const d = date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diff = now - d;
    
    if (format === 'relative') {
        // Relative time (2 minutes ago, etc.)
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (seconds < 60) return 'ئێستا';
        if (minutes < 60) return `${minutes} خولەک پێشتر`;
        if (hours < 24) return `${hours} کاتژمێر پێشتر`;
        if (days < 7) return `${days} ڕۆژ پێشتر`;
        
        return d.toLocaleDateString('ku-KU');
    }
    
    if (format === 'time') {
        return d.toLocaleTimeString('ku-KU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    // Short format
    return d.toLocaleDateString('ku-KU', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Debounce Function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Generate Unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Validate Email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validate Username
function validateUsername(username) {
    const re = /^[a-zA-Z0-9_]{3,20}$/;
    return re.test(username);
}

// Validate Password
function validatePassword(password) {
    return password.length >= 6;
}

// Sanitize Input
function sanitizeInput(input) {
    return input.trim().replace(/[<>]/g, '');
}

// Get Current User
function getCurrentUser() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(user => {
            if (user) {
                resolve(user);
            } else {
                reject(new Error('No user logged in'));
            }
        });
    });
}

// Check if User is Admin
async function isAdmin() {
    try {
        const user = await getCurrentUser();
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        return userData && userData.role === 'admin';
    } catch (error) {
        return false;
    }
}

// Redirect if not authenticated
async function requireAuth() {
    try {
        await getCurrentUser();
    } catch (error) {
        window.location.href = 'index.html';
    }
}

// Redirect if not admin
async function requireAdmin() {
    const admin = await isAdmin();
    if (!admin) {
        showToast('تۆ ڕێگەپێدراو نیت بۆ چوونە ژوورەوەی بەڕێوەبەر', 'error');
        window.location.href = 'dashboard.html';
    }
}

// Format File Size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Copy to Clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('لە کلیپبۆرد کۆپی کرا', 'success');
    } catch (err) {
        showToast('نەتوانرا کۆپی بکرێت', 'error');
    }
}

// Download Data as JSON
function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Search Users
async function searchUsers(query) {
    console.log('Searching for users with query:', query);
    
    if (!query || query.length < 2) {
        console.log('Query too short, returning empty array');
        return [];
    }
    
    try {
        console.log('Executing Firestore query...');
        
        // Get all users and filter client-side for better search
        const snapshot = await db.collection('users')
            .limit(50) // Limit to prevent too many results
            .get();
        
        const allUsers = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Filter users based on query (case-insensitive)
        const filteredUsers = allUsers.filter(user => {
            const searchQuery = query.toLowerCase();
            const userName = (user.firstName || '').toLowerCase();
            const userUsername = (user.username || '').toLowerCase();
            
            return userName.includes(searchQuery) || userUsername.includes(searchQuery);
        });
        
        console.log('Query completed, found', filteredUsers.length, 'users');
        console.log('Search results:', filteredUsers);
        
        return filteredUsers;
        
    } catch (error) {
        console.error('Error searching users:', error);
        return [];
    }
}

// Get User Data
async function getUserData(uid) {
    try {
        const doc = await db.collection('users').doc(uid).get();
        return doc.exists ? doc.data() : null;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

// Update User Status
async function updateUserStatus(status) {
    try {
        const user = await getCurrentUser();
        await db.collection('users').doc(user.uid).set({
            status: status,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('Error updating user status:', error);
    }
}

// Get Unread Notifications Count
async function getUnreadNotificationsCount() {
    try {
        const user = await getCurrentUser();
        const snapshot = await db.collection('notifications')
            .where('uid', '==', user.uid)
            .where('isRead', '==', false)
            .get();
        
        return snapshot.size;
    } catch (error) {
        console.error('Error getting notifications count:', error);
        return 0;
    }
}

// Mark Notification as Read
async function markNotificationAsRead(notificationId) {
    try {
        await db.collection('notifications').doc(notificationId).update({
            isRead: true
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Create Notification
async function createNotification(uid, type, title, message, relatedId = null) {
    try {
        const notification = {
            uid: uid,
            type: type,
            title: title,
            message: message,
            relatedId: relatedId,
            isRead: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('notifications').add(notification);
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

// Online Status Management
let onlineStatusRef;

function startOnlineStatusTracking() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Set user online
            onlineStatusRef = db.collection('users').doc(user.uid);
            
            await onlineStatusRef.set({
                isOnline: true,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            // Handle disconnect
            window.addEventListener('beforeunload', async () => {
                await onlineStatusRef.set({
                    isOnline: false,
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            });
            
            // Set up presence system
            const presenceRef = db.collection('presence').doc(user.uid);
            
            await presenceRef.set({
                uid: user.uid,
                isOnline: true,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update presence every minute
            const presenceInterval = setInterval(async () => {
                if (auth.currentUser) {
                    await presenceRef.set({
                        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                } else {
                    clearInterval(presenceInterval);
                }
            }, 60000);
            
            // Clean up on logout
            window.addEventListener('logout', async () => {
                clearInterval(presenceInterval);
                await presenceRef.set({
                    isOnline: false,
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            });
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    startOnlineStatusTracking();
});

// Export functions for use in other files
window.utils = {
    showToast,
    formatDate,
    debounce,
    generateId,
    validateEmail,
    validateUsername,
    validatePassword,
    sanitizeInput,
    getCurrentUser,
    isAdmin,
    requireAuth,
    requireAdmin,
    formatFileSize,
    copyToClipboard,
    downloadJSON,
    searchUsers,
    getUserData,
    updateUserStatus,
    getUnreadNotificationsCount,
    markNotificationAsRead,
    createNotification,
    startOnlineStatusTracking
};

// Admin Dashboard for Kurdish Chat Web App

// Initialize Admin Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    await utils.requireAdmin();
    initializeAdmin();
    loadAdminData();
    setupEventListeners();
});

// Initialize Admin
async function initializeAdmin() {
    try {
        const user = await utils.getCurrentUser();
        console.log('Admin dashboard initialized for:', user.uid);
        
        // Start real-time updates
        startRealTimeUpdates();
        
    } catch (error) {
        console.error('Admin initialization error:', error);
        utils.showToast('هەڵەیەک ڕوویدا لە دەستپێکردنی بەڕێوەبەر', 'error');
    }
}

// Load Admin Data
async function loadAdminData() {
    await Promise.all([
        loadUsers(),
        loadGroups(),
        loadAuditLogs(),
        updateStats()
    ]);
}

// Load Users
async function loadUsers(filter = 'all') {
    try {
        let query = db.collection('users');
        
        if (filter === 'active') {
            query = query.where('isOnline', '==', true);
        } else if (filter === 'banned') {
            query = query.where('role', '==', 'banned');
        } else if (filter === 'admin') {
            query = query.where('role', '==', 'admin');
        }
        
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        const usersTable = document.getElementById('usersTable');
        usersTable.innerHTML = '';
        
        snapshot.forEach(doc => {
            const userData = doc.data();
            const row = createUserRow(doc.id, userData);
            usersTable.appendChild(row);
        });
        
        // Update ban modal options
        updateBanModalOptions();
        
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Create User Row
function createUserRow(userId, userData) {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-gray-700';
    
    const roleBadge = userData.role === 'admin' 
        ? '<span class="bg-red-600 px-2 py-1 rounded text-xs">بەڕێوەبەر</span>'
        : userData.role === 'banned'
        ? '<span class="bg-red-600 px-2 py-1 rounded text-xs">قەدەغەکراو</span>'
        : '<span class="bg-gray-600 px-2 py-1 rounded text-xs">ئەندام</span>';
    
    const statusBadge = userData.isOnline
        ? '<span class="bg-green-600 px-2 py-1 rounded text-xs">ئامادە</span>'
        : '<span class="bg-gray-600 px-2 py-1 rounded text-xs">دوور</span>';
    
    tr.innerHTML = `
        <td class="p-2">
            <div class="flex items-center space-x-reverse space-x-2">
                <img src="${userData.profilePhoto}" alt="${userData.firstName}" class="w-8 h-8 rounded-full">
                <div>
                    <div class="font-semibold">${userData.firstName}</div>
                    <div class="text-sm text-gray-400">@${userData.username}</div>
                </div>
            </div>
        </td>
        <td class="p-2 text-sm">${userData.email}</td>
        <td class="p-2">${roleBadge}</td>
        <td class="p-2">${statusBadge}</td>
        <td class="p-2">
            <div class="flex space-x-reverse space-x-1">
                ${userData.role !== 'admin' ? `
                    <button onclick="viewUser('${userId}')" class="p-1 hover:bg-gray-700 rounded" title="بینین">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                    </button>
                    <button onclick="banUser('${userId}')" class="p-1 hover:bg-red-700 rounded" title="قەدەغەکردن">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
                        </svg>
                    </button>
                ` : ''}
            </div>
        </td>
    `;
    
    return tr;
}

// Load Groups
async function loadGroups() {
    try {
        const snapshot = await db.collection('publicGroups')
            .orderBy('createdAt', 'desc')
            .get();
        
        const groupsTable = document.getElementById('groupsTable');
        groupsTable.innerHTML = '';
        
        for (const doc of snapshot.docs) {
            const groupData = doc.data();
            const creatorData = await utils.getUserData(groupData.creatorUid);
            
            const row = createGroupRow(doc.id, groupData, creatorData);
            groupsTable.appendChild(row);
        }
        
    } catch (error) {
        console.error('Error loading groups:', error);
    }
}

// Create Group Row
function createGroupRow(groupId, groupData, creatorData) {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-gray-700';
    
    tr.innerHTML = `
        <td class="p-2">
            <div>
                <div class="font-semibold">${groupData.groupName}</div>
                <div class="text-sm text-gray-400">ID: ${groupData.groupUniqueId}</div>
            </div>
        </td>
        <td class="p-2">${creatorData ? creatorData.firstName : 'نەزانراو'}</td>
        <td class="p-2">${groupData.members.length}</td>
        <td class="p-2 text-sm">${utils.formatDate(groupData.createdAt)}</td>
        <td class="p-2">
            <div class="flex space-x-reverse space-x-1">
                <button onclick="viewGroup('${groupId}')" class="p-1 hover:bg-gray-700 rounded" title="بینین">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                </button>
                <button onclick="deleteGroup('${groupId}')" class="p-1 hover:bg-red-700 rounded" title="سڕینەوە">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        </td>
    `;
    
    return tr;
}

// Load Audit Logs
async function loadAuditLogs() {
    try {
        const snapshot = await db.collection('adminLogs')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        const auditLogs = document.getElementById('auditLogs');
        auditLogs.innerHTML = '';
        
        snapshot.forEach(doc => {
            const logData = doc.data();
            const logElement = createAuditLogElement(logData);
            auditLogs.appendChild(logElement);
        });
        
    } catch (error) {
        console.error('Error loading audit logs:', error);
    }
}

// Create Audit Log Element
function createAuditLogElement(logData) {
    const div = document.createElement('div');
    div.className = 'p-2 bg-gray-700 rounded text-sm';
    
    const actionColor = logData.action === 'ban' ? 'text-red-400' : 
                       logData.action === 'unban' ? 'text-green-400' : 
                       'text-blue-400';
    
    div.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <span class="${actionColor} font-semibold">${logData.action.toUpperCase()}</span>
                <span class="text-gray-300 mr-2">${logData.details}</span>
            </div>
            <div class="text-xs text-gray-500">
                ${utils.formatDate(logData.createdAt, 'relative')}
            </div>
        </div>
    `;
    
    return div;
}

// Update Stats
async function updateStats() {
    try {
        // Total users
        const totalUsersSnapshot = await db.collection('users').get();
        document.getElementById('totalUsers').textContent = totalUsersSnapshot.size;
        
        // Active users
        const activeUsersSnapshot = await db.collection('users').where('isOnline', '==', true).get();
        document.getElementById('activeUsers').textContent = activeUsersSnapshot.size;
        
        // Total groups
        const totalGroupsSnapshot = await db.collection('publicGroups').get();
        document.getElementById('totalGroups').textContent = totalGroupsSnapshot.size;
        
        // Banned users
        const bannedUsersSnapshot = await db.collection('users').where('role', '==', 'banned').get();
        document.getElementById('bannedUsers').textContent = bannedUsersSnapshot.size;
        
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // User filter
    const userFilter = document.getElementById('userFilter');
    if (userFilter) {
        userFilter.addEventListener('change', (e) => {
            loadUsers(e.target.value);
        });
    }
    
    // User search
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('input', utils.debounce(async (e) => {
            const query = e.target.value.trim();
            if (query.length >= 2) {
                await searchUsers(query);
            } else {
                loadUsers(document.getElementById('userFilter').value);
            }
        }, 300));
    }
    
    // Ban form
    const banForm = document.getElementById('banForm');
    if (banForm) {
        banForm.addEventListener('submit', handleBanSubmit);
    }
    
    // Unban form
    const unbanForm = document.getElementById('unbanForm');
    if (unbanForm) {
        unbanForm.addEventListener('submit', handleUnbanSubmit);
    }
}

// Search Users
async function searchUsers(query) {
    try {
        const snapshot = await db.collection('users')
            .where('username', '>=', query)
            .where('username', '<=', query + '\uf8ff')
            .limit(20)
            .get();
        
        const usersTable = document.getElementById('usersTable');
        usersTable.innerHTML = '';
        
        snapshot.forEach(doc => {
            const userData = doc.data();
            const row = createUserRow(doc.id, userData);
            usersTable.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error searching users:', error);
    }
}

// Ban User
function banUser(userId) {
    document.getElementById('banUserSelect').value = userId;
    showBanModal();
}

// Show Ban Modal
function showBanModal() {
    document.getElementById('banModal').classList.remove('hidden');
}

// Close Ban Modal
function closeBanModal() {
    document.getElementById('banModal').classList.add('hidden');
    document.getElementById('banForm').reset();
}

// Handle Ban Submit
async function handleBanSubmit(e) {
    e.preventDefault();
    
    const userId = document.getElementById('banUserSelect').value;
    const reason = document.getElementById('banReason').value.trim();
    
    if (!userId || !reason) {
        utils.showToast('تکایە هەموو بەشەکان پڕ بکە', 'warning');
        return;
    }
    
    try {
        const admin = await utils.getCurrentUser();
        const userData = await utils.getUserData(userId);
        
        // Update user role
        await db.collection('users').doc(userId).update({
            role: 'banned',
            bannedAt: firebase.firestore.FieldValue.serverTimestamp(),
            bannedBy: admin.uid,
            banReason: reason
        });
        
        // Create audit log
        await createAuditLog('ban', admin.uid, userId, `قەدەغەکردنی ${userData.firstName}: ${reason}`);
        
        // Send notification
        await utils.createNotification(
            userId,
            'ban',
            'قەدەغەکراو',
            `تۆ قەدەغەکراویت: ${reason}`,
            null
        );
        
        utils.showToast('بەکارهێنەر بە سەرکەوتوویی قەدەغەکرا', 'success');
        closeBanModal();
        loadUsers();
        updateStats();
        loadAuditLogs();
        
    } catch (error) {
        console.error('Error banning user:', error);
        utils.showToast('نەتوانرا بەکارهێنەر قەدەغەبکرێت', 'error');
    }
}

// Unban User
function showUnbanModal() {
    document.getElementById('unbanModal').classList.remove('hidden');
    updateUnbanModalOptions();
}

function closeUnbanModal() {
    document.getElementById('unbanModal').classList.add('hidden');
    document.getElementById('unbanForm').reset();
}

// Update Ban Modal Options
async function updateBanModalOptions() {
    try {
        const snapshot = await db.collection('users')
            .where('role', 'in', ['user'])
            .get();
        
        const select = document.getElementById('banUserSelect');
        select.innerHTML = '<option value="">بەکارهێنەرێک هەڵبژێرە</option>';
        
        snapshot.forEach(doc => {
            const userData = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${userData.firstName} (@${userData.username})`;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error updating ban modal options:', error);
    }
}

// Update Unban Modal Options
async function updateUnbanModalOptions() {
    try {
        const snapshot = await db.collection('users')
            .where('role', '==', 'banned')
            .get();
        
        const select = document.getElementById('unbanUserSelect');
        select.innerHTML = '<option value="">بەکارهێنەرێک هەڵبژێرە</option>';
        
        snapshot.forEach(doc => {
            const userData = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${userData.firstName} (@${userData.username})`;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error updating unban modal options:', error);
    }
}

// Handle Unban Submit
async function handleUnbanSubmit(e) {
    e.preventDefault();
    
    const userId = document.getElementById('unbanUserSelect').value;
    
    if (!userId) {
        utils.showToast('تکایە بەکارهێنەرێک هەڵبژێرە', 'warning');
        return;
    }
    
    try {
        const admin = await utils.getCurrentUser();
        const userData = await utils.getUserData(userId);
        
        // Update user role
        await db.collection('users').doc(userId).update({
            role: 'user',
            bannedAt: null,
            bannedBy: null,
            banReason: null
        });
        
        // Create audit log
        await createAuditLog('unban', admin.uid, userId, `لابردنی قەدەغەی ${userData.firstName}`);
        
        // Send notification
        await utils.createNotification(
            userId,
            'unban',
            'قەدەغە لابرا',
            'قەدەغەکەت لادرا، دەتوانیت بەکاری بهێنەوە',
            null
        );
        
        utils.showToast('قەدەغە بە سەرکەوتوویی لادرا', 'success');
        closeUnbanModal();
        loadUsers();
        updateStats();
        loadAuditLogs();
        
    } catch (error) {
        console.error('Error unbanning user:', error);
        utils.showToast('نەتوانرا قەدەغە لاببرێت', 'error');
    }
}

// View User
async function viewUser(userId) {
    try {
        const userData = await utils.getUserData(userId);
        if (!userData) return;
        
        const message = `
        زانیاری بەکارهێنەر:
        ناوی تەواو: ${userData.firstName}
        ناوی بەکارهێنەر: @${userData.username}
        ئیمەیل: ${userData.email}
        ڕۆل: ${userData.role}
        دۆخ: ${userData.isOnline ? 'ئامادە' : 'دوور'}
        بوون: ${utils.formatDate(userData.createdAt)}
        `;
        
        alert(message);
        
    } catch (error) {
        console.error('Error viewing user:', error);
    }
}

// View Group
async function viewGroup(groupId) {
    try {
        const groupDoc = await db.collection('publicGroups').doc(groupId).get();
        const groupData = groupDoc.data();
        
        if (!groupData) return;
        
        const creatorData = await utils.getUserData(groupData.creatorUid);
        
        const message = `
        زانیاری گروپ:
        ناوی گروپ: ${groupData.groupName}
        ئایدی تایبەتی: ${groupData.groupUniqueId}
        وەسف: ${groupData.description || 'هیچ'}
        دروستکەر: ${creatorData ? creatorData.firstName : 'نەزانراو'}
        ئەندامان: ${groupData.members.length}
        بەڕێوەبەران: ${groupData.admins.length}
        دروستکرا: ${utils.formatDate(groupData.createdAt)}
        `;
        
        alert(message);
        
    } catch (error) {
        console.error('Error viewing group:', error);
    }
}

// Delete Group
async function deleteGroup(groupId) {
    if (!confirm('ئایا دڵنیای لە سڕینەوەی ئەم گروپە؟')) return;
    
    try {
        const admin = await utils.getCurrentUser();
        const groupDoc = await db.collection('publicGroups').doc(groupId).get();
        const groupData = groupDoc.data();
        
        // Delete all group messages
        const messagesSnapshot = await db.collection('groupMessages')
            .where('groupId', '==', groupId)
            .get();
        
        const batch = db.batch();
        messagesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Delete group
        batch.delete(db.collection('publicGroups').doc(groupId));
        
        await batch.commit();
        
        // Create audit log
        await createAuditLog('delete_group', admin.uid, groupId, `سڕینەوەی گروپی ${groupData.groupName}`);
        
        utils.showToast('گروپ بە سەرکەوتوویی سڕایەوە', 'success');
        loadGroups();
        updateStats();
        loadAuditLogs();
        
    } catch (error) {
        console.error('Error deleting group:', error);
        utils.showToast('نەتوانرا گروپ بسڕێتەوە', 'error');
    }
}

// Create Audit Log
async function createAuditLog(action, adminUid, targetUid, details) {
    try {
        await db.collection('adminLogs').add({
            adminUid: adminUid,
            action: action,
            targetUid: targetUid,
            details: details,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error creating audit log:', error);
    }
}

// Refresh Groups
async function refreshGroups() {
    utils.showToast('نوێکردنەوەی گروپەکان...', 'info');
    await loadGroups();
    utils.showToast('گروپەکان نوێکرانەوە', 'success');
}

// Export Data
async function exportData() {
    try {
        utils.showToast('دەستپێکردنی دەرکردنی داتا...', 'info');
        
        const data = {
            users: [],
            groups: [],
            exportDate: new Date().toISOString()
        };
        
        // Export users
        const usersSnapshot = await db.collection('users').get();
        usersSnapshot.forEach(doc => {
            data.users.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Export groups
        const groupsSnapshot = await db.collection('publicGroups').get();
        groupsSnapshot.forEach(doc => {
            data.groups.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Download JSON
        utils.downloadJSON(data, `kurdish-chat-export-${Date.now()}.json`);
        
        utils.showToast('داتا بە سەرکەوتوویی دەرهێنرا', 'success');
        
    } catch (error) {
        console.error('Error exporting data:', error);
        utils.showToast('نەتوانرا داتا دەرهێنرێت', 'error');
    }
}

// Show System Info
function showSystemInfo() {
    const info = `
    زانیاری سیستەم:
    ناوی سیستەم: Kurdish Chat
    وەشانی: 1.0.0
    بەکۆدەری: Firebase
    پێگە: ${navigator.platform}
    وێبگەڕ: ${navigator.userAgent.split(' ')[0]}
    زمان: ${navigator.language}
    ئێستا: ${new Date().toLocaleString('ku-KU')}
    `;
    
    alert(info);
}

// Start Real-time Updates
function startRealTimeUpdates() {
    // Update current time every second
    setInterval(() => {
        const currentTime = document.getElementById('currentTime');
        if (currentTime) {
            currentTime.textContent = new Date().toLocaleTimeString('ku-KU');
        }
    }, 1000);
    
    // Update stats every 30 seconds
    setInterval(updateStats, 30000);
    
    // Update audit logs every 10 seconds
    setInterval(loadAuditLogs, 10000);
}

// Navigation Functions
function goToDashboard() {
    window.location.href = 'dashboard.html';
}

function logout() {
    authFunctions.logout();
}

// Export functions
window.adminFunctions = {
    banUser,
    showBanModal,
    closeBanModal,
    showUnbanModal,
    closeUnbanModal,
    viewUser,
    viewGroup,
    deleteGroup,
    refreshGroups,
    exportData,
    showSystemInfo,
    goToDashboard,
    logout
};

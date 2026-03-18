// Chat System for Kurdish Chat Web App

// Global variables
let currentChatId = null;
let currentChatType = null; // 'private' or 'group'
let currentChatData = null;
let messagesListener = null;
let typingTimer = null;
let selfDestructIntervals = new Map(); // Track all countdown intervals
let isSendingMessage = false; // Prevent double-send
let sendButtonTimer = null; // Debounce timer
let currentSearchType = 'users'; // 'users' or 'groups'
let currentGroupProfileId = null; // Store current group profile ID
let currentUserProfileId = null; // Store current user profile ID
let autoRefreshInterval = null; // Auto refresh interval timer

// Cleanup function for page unload
function cleanupChatSystem() {
    console.log('🧹 Cleaning up chat system...');
    
    // Clear messages listener
    if (messagesListener) {
        messagesListener();
        messagesListener = null;
        console.log('✅ Messages listener cleared');
    }
    
    // Clear typing timer
    if (typingTimer) {
        clearTimeout(typingTimer);
        typingTimer = null;
        console.log('✅ Typing timer cleared');
    }
    
    // Clear all self-destruct intervals
    selfDestructIntervals.forEach((interval, messageId) => {
        clearInterval(interval);
        console.log(`✅ Self-destruct interval cleared for message: ${messageId}`);
    });
    selfDestructIntervals.clear();
    
    // Clear send button timer
    if (sendButtonTimer) {
        clearTimeout(sendButtonTimer);
        sendButtonTimer = null;
        console.log('✅ Send button timer cleared');
    }
    
    // Clear auto refresh interval
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log('✅ Auto refresh interval cleared');
    }
    
    // Clear current chat data
    currentChatId = null;
    currentChatType = null;
    currentChatData = null;
    
    // Reset sending state
    isSendingMessage = false;
    
    console.log('✅ Chat system cleanup completed');
}

// Add cleanup on page unload
window.addEventListener('beforeunload', cleanupChatSystem);
window.addEventListener('pagehide', cleanupChatSystem);

// Initialize Chat
document.addEventListener('DOMContentLoaded', async () => {
    await utils.requireAuth();
    console.log('Initializing chat system...');
    await initializeChat();
    
    // Initialize mobile menu
    initializeMobileMenu();
    console.log('Mobile menu initialized');
    
    // Start self-destruct cleanup
    startSelfDestructCleanup();
    console.log('Self-destruct cleanup started');
    
    // Start auto refresh
    startAutoRefresh();
    console.log('Auto refresh started');
    
    console.log('Chat system initialized');
});

// Auto Refresh Functions
function startAutoRefresh() {
    // Clear any existing interval
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // Set auto refresh interval (30 seconds = 30000 ms)
    const refreshInterval = 30000; // 30 seconds
    
    autoRefreshInterval = setInterval(async () => {
        console.log('🔄 Auto refreshing page data...');
        await refreshPageData();
    }, refreshInterval);
    
    console.log(`✅ Auto refresh started with ${refreshInterval/1000} second interval`);
}

async function refreshPageData() {
    try {
        // Refresh friends list
        await loadUserFriends();
        console.log('✅ Friends list refreshed');
        
        // Refresh groups list
        await loadUserGroups();
        console.log('✅ Groups list refreshed');
        
        // Refresh notifications
        await loadNotifications();
        console.log('✅ Notifications refreshed');
        
        // Show subtle refresh indicator
        showRefreshIndicator();
        
    } catch (error) {
        console.error('❌ Error refreshing page data:', error);
    }
}

function showRefreshIndicator() {
    // Create or update refresh indicator
    let indicator = document.getElementById('refreshIndicator');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'refreshIndicator';
        indicator.className = 'fixed top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-lg text-sm shadow-lg transition-all duration-300 z-50';
        document.body.appendChild(indicator);
    }
    
    indicator.textContent = 'نوێکرایەوە';
    indicator.classList.remove('hidden');
    
    // Hide indicator after 2 seconds
    setTimeout(() => {
        indicator.classList.add('hidden');
    }, 2000);
}

// Stop auto refresh (useful for debugging or when user wants to disable)
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log('⏹️ Auto refresh stopped');
    }
}

// Restart auto refresh
function restartAutoRefresh() {
    stopAutoRefresh();
    startAutoRefresh();
    console.log('🔄 Auto refresh restarted');
}

// Manual refresh function
async function manualRefresh() {
    console.log('🔄 Manual refresh triggered...');
    
    // Show immediate feedback
    const button = event.target.closest('button');
    if (button) {
        button.classList.add('animate-spin');
        setTimeout(() => {
            button.classList.remove('animate-spin');
        }, 1000);
    }
    
    await refreshPageData();
    showToast('داتاکان نوێکرایەوە', 'success');
}

// Mobile Menu Functions
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const closeButton = document.querySelector('.mobile-close-button');
    
    if (sidebar.classList.contains('translate-x-0')) {
        closeMobileMenu();
    } else {
        sidebar.classList.remove('-translate-x-full');
        sidebar.classList.add('translate-x-0');
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scroll
    }
}

function closeMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar.classList.add('-translate-x-full');
    sidebar.classList.remove('translate-x-0');
    overlay.classList.add('hidden');
    document.body.style.overflow = ''; // Restore background scroll
}

// Initialize mobile menu detection
function initializeMobileMenu() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const closeButton = document.querySelector('.mobile-close-button');
    
    // Check if screen is mobile size
    function checkMobileScreen() {
        if (window.innerWidth <= 1024) { // lg breakpoint
            mobileMenuToggle.classList.remove('hidden');
        } else {
            mobileMenuToggle.classList.add('hidden');
            closeMobileMenu(); // Close menu on desktop
        }
    }
    
    // Initial check
    checkMobileScreen();
    
    // Listen for resize
    window.addEventListener('resize', checkMobileScreen);
    
    // Close menu when clicking on chat items (mobile)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024) { // lg breakpoint
            const chatItem = e.target.closest('.chat-item, .friend-item');
            if (chatItem) {
                setTimeout(() => closeMobileMenu(), 300); // Small delay for smooth transition
            }
        }
    });
}

// Initialize Chat
async function initializeChat() {
    try {
        const user = await utils.getCurrentUser();
        const userData = await utils.getUserData(user.uid);
        
        // Update user info in sidebar
        document.getElementById('userName').textContent = userData.firstName;
        document.getElementById('userAvatar').src = userData.profilePhoto;
        
        // Setup search functionality
        console.log('Setting up search...');
        setupSearch();
        
        // Load data
        await loadUserGroups();
        await loadUserFriends();
        await loadNotifications();
        
        // Setup event listeners
        setupEventListeners();
        
        // Start self-destruct message cleanup
        startSelfDestructCleanup();
        
    } catch (error) {
        console.error('Chat initialization error:', error);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Message input enter key
    const messageInput = document.getElementById('messageText');
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Typing indicator
        messageInput.addEventListener('input', () => {
            handleTyping();
        });
    }
    
    // Add members search input
    const addMemberSearchInput = document.getElementById('addMemberSearchInput');
    if (addMemberSearchInput) {
        addMemberSearchInput.addEventListener('input', utils.debounce(searchMembersToAdd, 300));
    }
}

// Load User Chats
async function loadUserChats() {
    try {
        console.log('Loading user chats...');
        const user = await utils.getCurrentUser();
        
        // Simplified approach - get all chats and filter client-side
        const allChatsSnapshot = await db.collection('privateChats').get();
        
        // Filter for chats where user is a participant
        const userChats = allChatsSnapshot.docs.filter(doc => {
            const chatData = doc.data();
            return chatData.participants && chatData.participants.includes(user.uid);
        });
        
        console.log('Found chats:', userChats.length);
        
        const chatsList = document.getElementById('chatsList');
        if (!chatsList) {
            console.error('Chats list element not found');
            return;
        }
        
        chatsList.innerHTML = '';
        
        if (userChats.length === 0) {
            chatsList.innerHTML = '<div class="text-center text-gray-500 py-8">هیچ چاتێک نییە</div>';
            return;
        }
        
        // Sort by updatedAt client-side
        const sortedChats = userChats.sort((a, b) => {
            const aTime = a.data().updatedAt?.toMillis() || 0;
            const bTime = b.data().updatedAt?.toMillis() || 0;
            return bTime - aTime; // Descending order
        });
        
        for (const doc of sortedChats) {
            const chatData = doc.data();
            console.log('Creating chat element for:', chatData);
            
            // Get other participant's data
            const otherUserId = chatData.participants.find(uid => uid !== user.uid);
            const userData = await utils.getUserData(otherUserId);
            
            const chatElement = createChatElement(doc.id, chatData, userData, 'private');
            chatsList.appendChild(chatElement);
        }
        
        console.log('Chats loaded successfully');
    } catch (error) {
        console.error('Error loading chats:', error);
    }
}

// Load User Groups
async function loadUserGroups() {
    try {
        console.log('Loading user groups...');
        const user = await utils.getCurrentUser();
        
        // Simplified approach - get all groups and filter client-side
        const allGroupsSnapshot = await db.collection('publicGroups').get();
        
        // Filter for groups where user is a member
        const userGroups = allGroupsSnapshot.docs.filter(doc => {
            const groupData = doc.data();
            return groupData.members && groupData.members.includes(user.uid);
        });
        
        console.log('Found groups:', userGroups.length);
        
        const groupsList = document.getElementById('groupsList');
        if (!groupsList) {
            console.error('Groups list element not found');
            return;
        }
        
        groupsList.innerHTML = '';
        
        if (userGroups.length === 0) {
            groupsList.innerHTML = '<div class="text-center text-gray-500 py-8">هیچ گروپێک نییە</div>';
            return;
        }
        
        // Sort by createdAt client-side
        const sortedGroups = userGroups.sort((a, b) => {
            const aTime = a.data().createdAt?.toMillis() || 0;
            const bTime = b.data().createdAt?.toMillis() || 0;
            return bTime - aTime; // Descending order
        });
        
        for (const doc of sortedGroups) {
            const groupData = doc.data();
            console.log('Creating group element for:', groupData);
            const groupElement = createChatElement(doc.id, groupData, groupData, 'group');
            groupsList.appendChild(groupElement);
        }
        
        console.log('Groups loaded successfully');
    } catch (error) {
        console.error('Error loading groups:', error);
    }
}

// Load User Friends
async function loadUserFriends() {
    try {
        console.log('Loading user friends...');
        const user = await utils.getCurrentUser();
        console.log('Current user:', user);
        
        if (!user) {
            console.error('No user found for loading friends');
            return;
        }
        
        // Get all friends and filter client-side to check both userUid and friendUid
        const allFriendsSnapshot = await db.collection('friends').get();
        
        // Filter for current user's friendships (both as userUid and friendUid)
        const userFriends = allFriendsSnapshot.docs.filter(doc => {
            const friendData = doc.data();
            return friendData.userUid === user.uid || friendData.friendUid === user.uid;
        });
        
        console.log('Found friends:', userFriends.length);
        
        const friendsList = document.getElementById('friendsList');
        if (!friendsList) {
            console.error('Friends list element not found');
            return;
        }
        
        friendsList.innerHTML = '';
        
        if (userFriends.length === 0) {
            console.log('No friends found');
            friendsList.innerHTML = '<div class="text-center text-gray-500 py-8">هیچ هاوڕێێک نییە</div>';
            return;
        }
        
        // Sort by createdAt client-side
        const sortedFriends = userFriends.sort((a, b) => {
            const aTime = a.data().createdAt?.toMillis() || 0;
            const bTime = b.data().createdAt?.toMillis() || 0;
            return bTime - aTime; // Descending order
        });
        
        // Track processed friends to avoid duplicates
        const processedFriends = new Set();
        
        for (const doc of sortedFriends) {
            const friendData = doc.data();
            console.log('Processing friend data:', friendData);
            
            // Determine which UID is the friend (not the current user)
            const friendUid = friendData.userUid === user.uid ? friendData.friendUid : friendData.userUid;
            
            // Skip if we've already processed this friend
            if (processedFriends.has(friendUid)) {
                console.log('Skipping duplicate friend:', friendUid);
                continue;
            }
            
            processedFriends.add(friendUid);
            
            console.log('Getting data for friend UID:', friendUid);
            const friendUserData = await utils.getUserData(friendUid);
            
            if (friendUserData) {
                console.log('Creating friend element for:', friendUserData);
                const friendElement = createFriendElement(friendUserData);
                friendsList.appendChild(friendElement);
            } else {
                console.log('No user data found for friend UID:', friendUid);
            }
        }
        
        console.log('Friends loaded successfully');
    } catch (error) {
        console.error('Error loading friends:', error);
        const friendsList = document.getElementById('friendsList');
        if (friendsList) {
            friendsList.innerHTML = '<div class="text-center text-red-500 py-8">کێشە لە بارکردنی هاوڕێکان</div>';
        }
    }
}

// Create Chat Element
function createChatElement(id, data, userData, type) {
    console.log('Creating chat element:', { id, type, userData });
    
    const div = document.createElement('div');
    div.className = 'flex items-center space-x-reverse space-x-3 p-3 hover:bg-gray-700 rounded-lg cursor-pointer transition';
    
    // Add click test
    div.onclick = () => {
        console.log('🔥 CHAT ELEMENT CLICKED! 🔥');
        console.log('Chat element clicked:', { id, type, data });
        console.log('User data:', userData);
        
        // Test if openChat function exists
        if (typeof openChat === 'function') {
            console.log('✅ openChat function exists');
            openChat(id, type, data);
        } else {
            console.error('❌ openChat function not found!');
        }
    };
    
    // Determine image source and click handler based on type
    let imageSrc, imageAlt, imageOnClick;
    
    if (type === 'group') {
        imageSrc = `https://picsum.photos/seed/${id}/40/40.jpg`;
        imageAlt = userData.groupName || 'گروپ';
        imageOnClick = `showGroupProfile('${id}')`;
    } else {
        imageSrc = userData.profilePhoto || `https://picsum.photos/seed/${userData.uid || 'default'}/40/40.jpg`;
        imageAlt = userData.firstName || 'بەکارهێنەر';
        imageOnClick = '';
    }
    
    div.innerHTML = `
        <img src="${imageSrc}" alt="${imageAlt}" class="w-10 h-10 rounded-full ${type === 'group' ? 'cursor-pointer hover:opacity-80' : ''}" ${type === 'group' ? `onclick="event.stopPropagation(); ${imageOnClick}"` : ''}>
        <div class="flex-1">
            <h4 class="font-semibold">${userData.firstName || userData.groupName}</h4>
            <p class="text-sm text-gray-400 truncate">${data.lastMessage?.text || 'هیچ نامەیەک نییە'}</p>
        </div>
        <div class="text-xs text-gray-500">
            ${utils.formatDate(data.updatedAt, 'time')}
        </div>
    `;
    
    console.log('✅ Chat element created and clickable');
    return div;
}

// Create Friend Element
function createFriendElement(userData) {
    const div = document.createElement('div');
    div.className = 'flex items-center space-x-reverse space-x-3 p-3 hover:bg-gray-700 rounded-lg transition';
    
    div.innerHTML = `
        <img src="${userData.profilePhoto || 'https://picsum.photos/seed/default/40/40.jpg'}" alt="${userData.firstName}" class="w-10 h-10 rounded-full">
        <div class="flex-1">
            <h4 class="font-semibold">${userData.firstName} @${userData.username}</h4>
            <p class="text-sm text-gray-400">@${userData.username}</p>
        </div>
        <div class="flex space-x-reverse space-x-1">
            <button onclick="showUserProfile('${userData.uid}')" class="p-1 hover:bg-gray-600 rounded" title="پڕۆفایل">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
            </button>
            <button onclick="startPrivateChat('${userData.uid}')" class="p-1 hover:bg-gray-600 rounded" title="چات">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
            </button>
        </div>
    `;
    
    return div;
}

// Open Chat
async function openChat(chatId, type, chatData) {
    try {
        console.log('=== OPEN CHAT START ===');
        console.log('Opening chat:', { chatId, type, chatData });
        
        // Cleanup previous chat before opening new one
        cleanupChatSystem();
        
        // Clear previous message tracking when opening new chat
        sentMessageIds.clear();
        
        currentChatId = chatId;
        currentChatType = type;
        currentChatData = chatData;
        
        console.log('Current chat set:', { currentChatId, currentChatType });
        
        // Update chat header
        updateChatHeader(chatData, type);
        console.log('Chat header updated');
        
        // Show message input
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.classList.remove('hidden');
            console.log('Message input shown');
        } else {
            console.error('Message input element not found');
        }
        
        // Clear previous messages
        const messagesArea = document.getElementById('messagesArea');
        if (messagesArea) {
            messagesArea.innerHTML = '';
            console.log('Messages area cleared');
        } else {
            console.error('Messages area element not found');
            return;
        }
        
        // Load messages
        loadMessages(chatId, type);
        console.log('Loading messages...');
        
        // Mark messages as read
        try {
            await markMessagesAsRead(chatId, type);
            console.log('Messages marked as read');
        } catch (error) {
            console.log('Mark as read failed (non-critical):', error.message);
        }
        
        console.log('=== OPEN CHAT END ===');
        
    } catch (error) {
        console.error('Error opening chat:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Update Chat Header
function updateChatHeader(chatData, type) {
    console.log('=== UPDATE CHAT HEADER START ===');
    console.log('Updating chat header:', { chatData, type });
    
    const chatName = document.getElementById('chatName');
    const chatAvatar = document.getElementById('chatAvatar');
    const chatStatus = document.getElementById('chatStatus');
    const groupProfileBtn = document.getElementById('groupProfileBtn');
    
    console.log('Header elements found:', { 
        chatName: !!chatName, 
        chatAvatar: !!chatAvatar, 
        chatStatus: !!chatStatus,
        groupProfileBtn: !!groupProfileBtn
    });
    
    if (!chatName || !chatAvatar || !chatStatus) {
        console.error('❌ Header elements not found!');
        console.log('Available elements:', {
            chatName: document.getElementById('chatName'),
            chatAvatar: document.getElementById('chatAvatar'),
            chatStatus: document.getElementById('chatStatus')
        });
        return;
    }
    
    console.log('Header elements:', { chatName, chatAvatar, chatStatus });
    console.log('Chat data details:', chatData);
    
    // Show/hide group profile button based on chat type
    if (groupProfileBtn) {
        if (type === 'group') {
            groupProfileBtn.classList.remove('hidden');
        } else {
            groupProfileBtn.classList.add('hidden');
        }
    }
    
    if (type === 'private') {
        console.log('Setting private chat header');
        const displayName = chatData.firstName || chatData.displayName || chatData.username || 'نازناو';
        const photoUrl = chatData.profilePhoto || chatData.photoURL || `https://picsum.photos/seed/${chatData.uid || 'default'}/40/40.jpg`;
        const isOnline = chatData.isOnline || false;
        
        console.log('Private chat data:', { displayName, photoUrl, isOnline });
        
        chatName.textContent = displayName;
        chatAvatar.src = photoUrl;
        chatStatus.textContent = isOnline ? 'ئامادە' : 'دوور';
        
        console.log('Private chat header set:', {
            name: displayName,
            photo: photoUrl,
            status: isOnline
        });
    } else {
        console.log('Setting group chat header');
        const groupName = chatData.groupName || chatData.name || 'ناوی گروپ';
        const memberCount = chatData.members?.length || chatData.memberCount || 0;
        
        chatName.textContent = groupName;
        chatAvatar.src = 'https://picsum.photos/seed/group/40/40.jpg';
        chatStatus.textContent = `${memberCount} ئەندام`;
        
        console.log('Group chat header set:', {
            name: groupName,
            members: memberCount
        });
    }
    
    console.log('✅ Chat header updated successfully');
    console.log('=== UPDATE CHAT HEADER END ===');
}

// Global variable to track sent messages
let sentMessageIds = new Set();

// Load Messages
function loadMessages(chatId, type) {
    console.log('=== LOAD MESSAGES START ===');
    console.log('Loading messages for chat:', chatId, 'type:', type);
    
    const collection = type === 'private' ? 'privateMessages' : 'groupMessages';
    const field = type === 'private' ? 'chatId' : 'groupId';
    
    console.log('Using collection:', collection);
    console.log('Using field:', field);
    console.log('Query value:', chatId);
    
    const messagesArea = document.getElementById('messagesArea');
    console.log('Messages area element:', messagesArea);
    
    if (!messagesArea) {
        console.error('❌ Messages area element not found!');
        console.log('Available elements:', {
            messagesArea: !!document.getElementById('messagesArea'),
            messageArea: !!document.getElementById('messageArea'),
            messages: !!document.getElementById('messages')
        });
        return;
    }
    
    // Show loading state
    messagesArea.innerHTML = '<div class="text-center text-gray-500 py-8">بارکردنی نامەکان...</div>';
    console.log('Loading state set');
    
    // Clear previous listener
    if (messagesListener) {
        messagesListener();
        console.log('Previous listener cleared');
    }
    
    console.log('Setting up message listener...');
    
    // Simplified query - only filter by chatId, then sort in JavaScript
    messagesListener = db.collection(collection)
        .where(field, '==', chatId)
        .onSnapshot((snapshot) => {
            console.log('📥 Messages snapshot received:', snapshot.size);
            console.log('Snapshot metadata:', {
                hasPendingWrites: snapshot.metadata.hasPendingWrites,
                fromCache: snapshot.metadata.fromCache
            });
            
            // Don't clear messages area for real-time updates
            // This prevents clearing when new messages arrive
            if (snapshot.metadata.hasPendingWrites) {
                console.log('Local write detected, skipping UI update to avoid duplicates');
                return;
            }
            
            // Only clear if this is the initial load (empty messages area)
            if (messagesArea.children.length === 0 || messagesArea.querySelector('.text-center.text-gray-500')) {
                messagesArea.innerHTML = '';
                console.log('Messages area cleared for initial load');
            }
            
            if (snapshot.empty) {
                console.log('No messages found in snapshot');
                if (sentMessageIds.size === 0) {
                    messagesArea.innerHTML = '<div class="text-center text-gray-500 py-8">هیچ نامەیەک نییە. یەکەم نامە بنێرە!</div>';
                    console.log('Empty state set');
                } else {
                    console.log('Sent messages tracked:', Array.from(sentMessageIds));
                    messagesArea.innerHTML = '<div class="text-center text-gray-500 py-8">هیچ نامەیەک نییە. یەکەم نامە بنێرە!</div>';
                }
                return;
            }
            
            console.log('Processing', snapshot.size, 'messages...');
            let shouldScroll = false;
            let processedCount = 0;
            
            // Convert to array and sort by timestamp
            const messages = [];
            snapshot.forEach((doc) => {
                messages.push({
                    id: doc.id,
                    data: doc.data()
                });
            });
            
            // Sort by createdAt
            messages.sort((a, b) => {
                const timeA = a.data.createdAt;
                const timeB = b.data.createdAt;
                if (timeA && timeB) {
                    return timeA.toDate() - timeB.toDate();
                }
                return 0;
            });
            
            // Check for new messages
            const changes = snapshot.docChanges();
            console.log('Document changes:', changes.length);
            
            changes.forEach((change) => {
                console.log('Document change:', change.type, change.doc.id);
                if (change.type === 'added') {
                    shouldScroll = true;
                }
            });
            
            // Process sorted messages
            messages.forEach((messageObj) => {
                const message = messageObj.data;
                console.log('Processing message:', {
                    id: messageObj.id,
                    senderUid: message.senderUid,
                    text: message.text,
                    createdAt: message.createdAt,
                    [field]: message[field]
                });
                
                // Check if this message is already in the DOM
                const existingElement = document.querySelector(`[data-message-id="${messageObj.id}"]`);
                if (existingElement) {
                    console.log('Message already in DOM, skipping:', messageObj.id);
                    return;
                }
                
                // Check if this is a message we just sent (optimistic update)
                if (sentMessageIds.has(messageObj.id)) {
                    console.log('Skipping duplicate message:', messageObj.id);
                    sentMessageIds.delete(messageObj.id); // Remove from tracking
                    return;
                }
                
                // Verify message belongs to current chat
                if (message[field] !== chatId) {
                    console.warn('Message does not belong to current chat:', message[field], 'vs', chatId);
                    return;
                }
                
                try {
                    const messageElement = createMessageElement(message, messageObj.id);
                    if (messageElement) {
                        // data-message-id is already added in createMessageElement
                        
                        messagesArea.appendChild(messageElement);
                        processedCount++;
                        console.log('Message element added to UI');
                        
                        // Add self-destruct countdown if message has expiration
                        if (message.expiresAt) {
                            addSelfDestructCountdown(messageElement, messageObj.id, message.expiresAt.toDate());
                        }
                    } else {
                        console.error('Failed to create message element for:', messageObj.id);
                    }
                } catch (error) {
                    console.error('Error processing message:', error);
                }
            });
            
            console.log('✅ Messages rendered:', processedCount, 'of', snapshot.size);
            
            // Auto-scroll to bottom if:
            // 1. We were already at bottom (user is reading latest messages)
            // 2. We sent a message (shouldScroll will be true)
            // 3. This is the first time loading messages
            const isAtBottom = messagesArea.scrollTop + messagesArea.clientHeight >= messagesArea.scrollHeight - 50;
            if (isAtBottom || shouldScroll || sentMessageIds.size === 0) {
                console.log('Auto-scrolling to bottom');
                messagesArea.scrollTop = messagesArea.scrollHeight;
            }
        }, (error) => {
            console.error('❌ Messages listener error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            
            // Show error to user
            if (messagesArea) {
                messagesArea.innerHTML = '<div class="text-center text-red-500 py-8">هەڵە لە بارکردنی نامەکان: ' + error.message + '</div>';
            }
        });
    
    console.log('=== LOAD MESSAGES END ===');
}

// Create Message Element
function createMessageElement(message, messageId) {
    console.log('Creating message element for:', message);
    
    const user = auth.currentUser;
    console.log('Current user:', user);
    
    if (!user) {
        console.error('❌ No current user found');
        return null;
    }
    
    const isOwnMessage = message.senderUid === user.uid;
    console.log('Is own message:', isOwnMessage);
    
    const div = document.createElement('div');
    div.className = `flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`;
    
    // Add data attribute for tracking
    div.setAttribute('data-message-id', messageId);
    
    const messageClass = isOwnMessage 
        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg' 
        : 'bg-gradient-to-l from-gray-700 to-gray-600 text-white shadow-lg';
    
    console.log('Message class:', messageClass);
    console.log('Message createdAt type:', typeof message.createdAt);
    
    // Handle Firestore timestamp
    let timestamp;
    if (message.createdAt && typeof message.createdAt.toDate === 'function') {
        timestamp = message.createdAt.toDate();
    } else if (message.createdAt && message.createdAt instanceof Date) {
        timestamp = message.createdAt;
    } else {
        timestamp = new Date();
    }
    
    console.log('Formatted timestamp:', timestamp);
    
    // Add animation classes
    div.style.animation = 'messageSlide 0.3s ease-out';
    
    div.innerHTML = `
        <div class="max-w-xs lg:max-w-md">
            <div class="${messageClass} rounded-2xl px-4 py-3 shadow-xl transform transition-all duration-300 hover:scale-105">
                ${currentChatType === 'group' && !isOwnMessage ? `<p class="text-xs opacity-75 mb-2 font-medium">${message.senderName || 'بەکارهێنەر'}</p>` : ''}
                <p class="text-base leading-relaxed message-text">${message.text || 'نامەی بەتاڵ'}</p>
                <div class="flex items-center justify-between mt-2">
                    <p class="text-xs opacity-75">${utils.formatDate(timestamp, 'time')}</p>
                    ${isOwnMessage ? '<span class="text-xs opacity-75">✓</span>' : ''}
                </div>
            </div>
        </div>
    `;
    
    console.log('✅ Message element created successfully');
    return div;
}

// Send Message
async function sendMessage() {
    console.log('=== SEND MESSAGE START ===');
    
    // Clear any existing debounce timer
    if (sendButtonTimer) {
        clearTimeout(sendButtonTimer);
    }
    
    // Prevent double-send
    if (isSendingMessage) {
        console.log('Message already being sent, skipping...');
        return;
    }
    
    const messageInput = document.getElementById('messageText');
    console.log('Message input element:', messageInput);
    
    const text = messageInput.value.trim();
    console.log('Message text:', text);
    
    if (!text || !currentChatId) {
        console.log('No text or current chat ID');
        return;
    }
    
    console.log('Current chat ID:', currentChatId);
    console.log('Current chat type:', currentChatType);
    console.log('Current chat data:', currentChatData);
    
    try {
        // Set sending state
        isSendingMessage = true;
        
        // Disable send button and show loading
        const sendButton = document.getElementById('sendButton');
        if (sendButton) {
            sendButton.disabled = true;
            sendButton.textContent = 'دەنێرێت...';
            sendButton.classList.add('opacity-75', 'cursor-not-allowed');
        }
        
        // Clear input immediately to prevent double-send
        messageInput.value = '';
        console.log('Input cleared immediately');
        
        const user = await utils.getCurrentUser();
        console.log('Current user:', user);
        
        const userData = await utils.getUserData(user.uid);
        console.log('User data:', userData);
        
        const collection = currentChatType === 'private' ? 'privateMessages' : 'groupMessages';
        const field = currentChatType === 'private' ? 'chatId' : 'groupId';
        
        console.log('Using collection:', collection);
        console.log('Using field:', field);
        
        // Calculate expiration time (20 minutes = 1200000 ms)
        const deleteAfter = 20 * 60 * 1000; // 20 minutes
        const expiresAt = new Date(Date.now() + deleteAfter);
        
        const messageData = {
            [field]: currentChatId,
            senderUid: user.uid,
            senderName: userData.firstName || userData.displayName || 'بەکارهێنەر',
            text: text,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: expiresAt,
            deleteAfter: deleteAfter
        };
        
        console.log('Message data to send:', messageData);
        console.log('Message will expire at:', expiresAt);
        
        // Send message
        const messageRef = await db.collection(collection).add(messageData);
        console.log('Message sent successfully with ID:', messageRef.id);
        
        // Track this message ID to prevent duplicate display
        sentMessageIds.add(messageRef.id);
        console.log('Message ID tracked:', messageRef.id);
        
        // Immediately add message to UI (optimistic update)
        const optimisticMessage = {
            ...messageData,
            createdAt: new Date(),
            senderUid: user.uid,
            senderName: userData.firstName || userData.displayName || 'بەکارهێنەر'
        };
        
        console.log('Creating optimistic message element...');
        const messageElement = createMessageElement(optimisticMessage, messageRef.id);
        
        // Add unique identifier to prevent duplicates
        messageElement.setAttribute('data-optimistic-id', messageRef.id);
        
        const messagesArea = document.getElementById('messagesArea');
        if (messagesArea) {
            // Remove empty state if exists
            const emptyState = messagesArea.querySelector('.text-center.text-gray-500');
            if (emptyState) {
                emptyState.remove();
            }
            
            messagesArea.appendChild(messageElement);
            messagesArea.scrollTop = messagesArea.scrollHeight;
            console.log('Optimistic message added to UI');
            
            // Add self-destruct countdown
            addSelfDestructCountdown(messageElement, messageRef.id, expiresAt);
        } else {
            console.error('Messages area not found for optimistic update');
        }
        
        // Update chat's last message
        const chatCollection = currentChatType === 'private' ? 'privateChats' : 'publicGroups';
        console.log('Updating last message in:', chatCollection);
        
        await db.collection(chatCollection).doc(currentChatId).update({
            lastMessage: {
                text: text,
                senderUid: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Chat last message updated');
        
        console.log('=== SEND MESSAGE END ===');
        
    } catch (error) {
        console.error('Error sending message:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        utils.showToast('نەتوانرا نامە بنێررێت: ' + error.message, 'error');
        
        // Restore input value on error
        messageInput.value = text;
    } finally {
        // Reset sending state with debounce
        sendButtonTimer = setTimeout(() => {
            isSendingMessage = false;
            
            // Re-enable send button
            const sendButton = document.getElementById('sendButton');
            if (sendButton) {
                sendButton.disabled = false;
                sendButton.textContent = 'ناردن';
                sendButton.classList.remove('opacity-75', 'cursor-not-allowed');
            }
        }, 500); // 500ms debounce
    }
}

// Add Self-Destruct Countdown
function addSelfDestructCountdown(messageElement, messageId, expiresAt) {
    console.log('Adding self-destruct countdown for message:', messageId);
    console.log('Expires at:', expiresAt);
    
    // Add countdown timer to message
    const countdownElement = document.createElement('div');
    countdownElement.className = 'text-xs opacity-75 mt-1 text-red-400';
    countdownElement.style.animation = 'pulse 1s infinite';
    
    // Update countdown every second
    const updateCountdown = () => {
        const now = new Date();
        const timeLeft = expiresAt - now;
        
        if (timeLeft <= 0) {
            // Remove message
            messageElement.style.animation = 'messageFadeOut 0.5s ease-out';
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.parentNode.removeChild(messageElement);
                    console.log('Message self-destructed:', messageId);
                    
                    // Show notification
                    utils.showToast('نامەکە سڕایەوە', 'info');
                }
            }, 500);
            
            // Clear interval from global tracker
            selfDestructIntervals.delete(messageId);
            console.log(`✅ Self-destruct interval cleared for message: ${messageId}`);
            return;
        }
        
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        
        if (minutes > 0) {
            countdownElement.textContent = `سڕینەوە لە ${minutes}:${seconds.toString().padStart(2, '0')}`;
        } else {
            countdownElement.textContent = `سڕینەوە لە ${seconds} چرکە`;
        }
        
        // Add warning color when less than 10 seconds
        if (timeLeft < 10000) {
            countdownElement.className = 'text-xs mt-1 text-red-500 font-bold';
            countdownElement.style.animation = 'warningPulse 0.5s infinite';
        }
    };
    
    // Add countdown to message
    const messageContent = messageElement.querySelector('.rounded-2xl');
    if (messageContent) {
        messageContent.appendChild(countdownElement);
    }
    
    // Start countdown and track globally
    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 1000);
    
    // Store interval in global tracker
    selfDestructIntervals.set(messageId, countdownInterval);
    
    // Store interval reference on element for cleanup
    messageElement.countdownInterval = countdownInterval;
    
    console.log('Self-destruct countdown started for message:', messageId);
}

// Self-Destruct Message Cleanup
function startSelfDestructCleanup() {
    // Check for expired messages every 30 seconds
    setInterval(async () => {
        try {
            const now = new Date();
            console.log('Checking for expired messages...');
            
            // Clean up private messages
            const privateMessagesSnapshot = await db.collection('privateMessages')
                .where('expiresAt', '<=', now)
                .get();
            
            if (!privateMessagesSnapshot.empty) {
                const batch = db.batch();
                privateMessagesSnapshot.forEach((doc) => {
                    console.log('Cleaning up expired private message:', doc.id);
                    batch.delete(doc.ref);
                });
                await batch.commit();
                console.log(`Cleaned up ${privateMessagesSnapshot.size} expired private messages`);
            }
            
            // Clean up group messages
            const groupMessagesSnapshot = await db.collection('groupMessages')
                .where('expiresAt', '<=', now)
                .get();
            
            if (!groupMessagesSnapshot.empty) {
                const batch = db.batch();
                groupMessagesSnapshot.forEach((doc) => {
                    console.log('Cleaning up expired group message:', doc.id);
                    batch.delete(doc.ref);
                });
                await batch.commit();
                console.log(`Cleaned up ${groupMessagesSnapshot.size} expired group messages`);
            }
            
        } catch (error) {
            console.error('Error in self-destruct cleanup:', error);
        }
    }, 30000); // Run every 30 seconds
}

// Start Private Chat
async function startPrivateChat(userId) {
    try {
        const user = await utils.getCurrentUser();
        
        // Check if chat already exists
        const chatsSnapshot = await db.collection('privateChats')
            .where('participants', 'array-contains', user.uid)
            .get();
        
        let existingChat = null;
        for (const doc of chatsSnapshot.docs) {
            const chatData = doc.data();
            if (chatData.participants.includes(userId)) {
                existingChat = { id: doc.id, ...chatData };
                break;
            }
        }
        
        if (existingChat) {
            // Open existing chat
            openChat(existingChat.id, 'private', existingChat);
        } else {
            // Create new chat
            const chatData = {
                participants: [user.uid, userId],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const chatRef = await db.collection('privateChats').add(chatData);
            
            // Get other user's data
            const otherUserData = await utils.getUserData(userId);
            
            // Open new chat
            openChat(chatRef.id, 'private', {
                ...chatData,
                ...otherUserData
            });
        }
    } catch (error) {
        console.error('Error starting private chat:', error);
        utils.showToast('نەتوانرا چات دەستپێبکرێت', 'error');
    }
}

// Handle Typing
function handleTyping() {
    if (typingTimer) {
        clearTimeout(typingTimer);
    }
    
    // Send typing indicator
    sendTypingIndicator(true);
    
    // Stop typing indicator after 3 seconds
    typingTimer = setTimeout(() => {
        sendTypingIndicator(false);
    }, 3000);
}

// Send Typing Indicator
async function sendTypingIndicator(isTyping) {
    if (!currentChatId || currentChatType !== 'private') return;
    
    try {
        const user = await utils.getCurrentUser();
        
        await db.collection('privateChats').doc(currentChatId).update({
            [`typing.${user.uid}`]: isTyping
        });
    } catch (error) {
        console.error('Error sending typing indicator:', error);
    }
}

// Mark Messages as Read
async function markMessagesAsRead(chatId, type) {
    try {
        console.log('=== MARK MESSAGES AS READ START ===');
        console.log('Marking messages as read for chat:', chatId, 'type:', type);
        
        const user = await utils.getCurrentUser();
        console.log('Current user:', user);
        
        // Simplified approach - just update chat's lastRead timestamp
        const chatCollection = type === 'private' ? 'privateChats' : 'publicGroups';
        console.log('Updating chat collection:', chatCollection);
        
        await db.collection(chatCollection).doc(chatId).update({
            lastRead: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Chat marked as read successfully');
        console.log('=== MARK MESSAGES AS READ END ===');
        
    } catch (error) {
        console.error('Error marking messages as read:', error);
    }
}

// Self-Destruct Message Cleanup
function startSelfDestructCleanup() {
    // Check for expired messages every minute
    setInterval(async () => {
        try {
            const now = new Date();
            
            // Clean private messages
            const privateExpired = await db.collection('privateMessages')
                .where('expiresAt', '<=', now)
                .get();
            
            const batch = db.batch();
            privateExpired.forEach((doc) => {
                batch.delete(doc.ref);
            });
            
            // Clean group messages
            const groupExpired = await db.collection('groupMessages')
                .where('expiresAt', '<=', now)
                .get();
            
            groupExpired.forEach((doc) => {
                batch.delete(doc.ref);
            });
            
            if (privateExpired.size > 0 || groupExpired.size > 0) {
                await batch.commit();
                console.log(`Cleaned up ${privateExpired.size + groupExpired.size} expired messages`);
            }
            
        } catch (error) {
            console.error('Error cleaning up expired messages:', error);
        }
    }, 60 * 1000); // Every minute
}

// Tab Navigation
function showTab(tabName) {
    // Hide all tabs
    document.getElementById('groupsSection').classList.add('hidden');
    document.getElementById('friendsList').classList.add('hidden');
    document.getElementById('notificationsList').classList.add('hidden');
    document.getElementById('blockedList').classList.add('hidden');
    
    // Remove active state from all tab buttons
    document.getElementById('groupsTab').classList.remove('border-b-2', 'border-blue-500');
    document.getElementById('friendsTab').classList.remove('border-b-2', 'border-blue-500');
    document.getElementById('notificationsTab').classList.remove('border-b-2', 'border-blue-500');
    document.getElementById('blockedTab').classList.remove('border-b-2', 'border-blue-500');
    
    // Show selected tab
    if (tabName === 'groups') {
        document.getElementById('groupsSection').classList.remove('hidden');
    } else {
        document.getElementById(tabName + 'List').classList.remove('hidden');
    }
    document.getElementById(tabName + 'Tab').classList.add('border-b-2', 'border-blue-500');
    
    // Load notifications when opening notifications tab
    if (tabName === 'notifications') {
        loadNotifications();
    }
    
    // Load blocked users when opening blocked tab
    if (tabName === 'blocked') {
        loadBlockedUsers();
    }
}

// Search Users
function searchUsers() {
    document.getElementById('userSearchModal').classList.remove('hidden');
    // Reset to user search by default
    setSearchType('users');
}

// Set Search Type
function setSearchType(type) {
    currentSearchType = type;
    console.log('Search type set to:', type);
    
    const usersBtn = document.getElementById('searchUsersBtn');
    const groupsBtn = document.getElementById('searchGroupsBtn');
    const searchInput = document.getElementById('userSearchInput');
    const searchResults = document.getElementById('userSearchResults');
    
    // Update button styles
    if (type === 'users') {
        usersBtn.className = 'flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition';
        groupsBtn.className = 'flex-1 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition';
        searchInput.placeholder = 'ناوی بەکارهێنەر بنووسە...';
    } else {
        groupsBtn.className = 'flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition';
        usersBtn.className = 'flex-1 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition';
        searchInput.placeholder = 'ناوی گروپ بنووسە...';
    }
    
    // Clear previous results
    searchResults.innerHTML = '';
    searchInput.value = '';
    searchInput.focus();
}

function closeUserSearch() {
    document.getElementById('userSearchModal').classList.add('hidden');
    document.getElementById('userSearchInput').value = '';
    document.getElementById('userSearchResults').innerHTML = '';
}

// Setup Search
function setupSearch() {
    console.log('Setting up search functionality...');
    
    const searchInput = document.getElementById('userSearchInput');
    const searchResults = document.getElementById('userSearchResults');
    
    if (!searchInput) {
        console.error('Search input not found!');
        return;
    }
    
    console.log('Search input found, adding event listener...');
    
    searchInput.addEventListener('input', utils.debounce(async (e) => {
        const query = e.target.value.trim();
        console.log('Search query changed:', query);
        
        if (query.length < 2) {
            searchResults.innerHTML = '';
            return;
        }
        
        try {
            let results;
            if (currentSearchType === 'users') {
                console.log('Calling searchUsers with query:', query);
                results = await utils.searchUsers(query);
                console.log('Users returned:', results);
            } else {
                console.log('Calling searchGroups with query:', query);
                results = await searchGroups(query);
                console.log('Groups returned:', results);
            }
            
            searchResults.innerHTML = '';
            
            if (results.length === 0) {
                const noResultsText = currentSearchType === 'users' ? 'هیچ بەکارهێنەرێک نەدۆزرایەوە' : 'هیچ گروپێک نەدۆزرایەوە';
                searchResults.innerHTML = `<div class="text-center text-gray-500 py-4">${noResultsText}</div>`;
                return;
            }
            
            if (currentSearchType === 'users') {
                results.forEach(user => {
                    console.log('Creating user element for:', user);
                    const userElement = document.createElement('div');
                    userElement.className = 'flex items-center space-x-reverse space-x-3 p-2 hover:bg-gray-700 rounded cursor-pointer';
                    userElement.innerHTML = `
                        <img src="${user.profilePhoto}" alt="${user.firstName}" class="w-8 h-8 rounded-full">
                        <div class="flex-1">
                            <h4 class="font-semibold">${user.firstName}</h4>
                            <p class="text-sm text-gray-400">@${user.username}</p>
                        </div>
                        <button onclick="sendFriendRequest('${user.uid}')" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm">
                            داواکاری هاوڕێیەتی
                        </button>
                    `;
                    searchResults.appendChild(userElement);
                });
            } else {
                results.forEach(group => {
                    console.log('Creating group element for:', group);
                    const groupElement = document.createElement('div');
                    groupElement.className = 'flex items-center space-x-reverse space-x-3 p-2 hover:bg-gray-700 rounded cursor-pointer';
                    groupElement.innerHTML = `
                        <img src="https://picsum.photos/seed/${group.groupId}/40/40.jpg" alt="${group.groupName}" class="w-8 h-8 rounded-full cursor-pointer hover:opacity-80" onclick="event.stopPropagation(); showGroupProfile('${group.groupId}')">
                        <div class="flex-1">
                            <h4 class="font-semibold">${group.groupName}</h4>
                            <p class="text-sm text-gray-400">${group.memberCount || 0} ئەندام</p>
                        </div>
                        <button onclick="joinGroup('${group.groupId}')" class="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm">
                            بوون بە ئەندام
                        </button>
                    `;
                    searchResults.appendChild(groupElement);
                });
            }
            
        } catch (error) {
            console.error('Search error:', error);
            searchResults.innerHTML = '<div class="text-center text-red-500 py-4">کێشە لە گەڕان</div>';
        }
    }, 300));
    
    console.log('Search setup completed');
}

// Search Users (opens modal)
function searchUsers() {
    console.log('Opening user search modal...');
    
    const modal = document.getElementById('userSearchModal');
    console.log('Modal element:', modal);
    
    if (!modal) {
        console.error('User search modal not found!');
        showToast('Modal نەدۆزرایەوە', 'error');
        return;
    }
    
    modal.classList.remove('hidden');
    console.log('Modal opened');
    
    // Focus on search input
    setTimeout(() => {
        const searchInput = document.getElementById('userSearchInput');
        console.log('Search input element:', searchInput);
        
        if (searchInput) {
            searchInput.focus();
            console.log('Search input focused');
        } else {
            console.error('Search input not found!');
        }
    }, 100);
}

// Perform Search (triggered by search button)
async function performSearch() {
    const query = document.getElementById('userSearchInput').value.trim();
    console.log('Manual search triggered with query:', query, 'type:', currentSearchType);
    
    if (query.length < 2) {
        showToast('تکایە لەکەم 2 پیت بنووسە', 'warning');
        return;
    }
    
    const searchResults = document.getElementById('userSearchResults');
    searchResults.innerHTML = '<div class="text-center text-gray-500 py-4">دەگەڕێت...</div>';
    
    try {
        let results;
        if (currentSearchType === 'users') {
            console.log('Calling searchUsers with query:', query);
            results = await utils.searchUsers(query);
            console.log('Users returned:', results);
        } else {
            console.log('Calling searchGroups with query:', query);
            results = await searchGroups(query);
            console.log('Groups returned:', results);
        }
        
        searchResults.innerHTML = '';
        
        if (results.length === 0) {
            const noResultsText = currentSearchType === 'users' ? 'هیچ بەکارهێنەرێک نەدۆزرایەوە' : 'هیچ گروپێک نەدۆزرایەوە';
            searchResults.innerHTML = `<div class="text-center text-gray-500 py-4">${noResultsText}</div>`;
            return;
        }
        
        if (currentSearchType === 'users') {
            results.forEach(user => {
                console.log('Creating user element for:', user);
                const userElement = document.createElement('div');
                userElement.className = 'flex items-center space-x-reverse space-x-3 p-2 hover:bg-gray-700 rounded cursor-pointer';
                userElement.innerHTML = `
                    <img src="${user.profilePhoto}" alt="${user.firstName}" class="w-8 h-8 rounded-full">
                    <div class="flex-1">
                        <h4 class="font-semibold">${user.firstName}</h4>
                        <p class="text-sm text-gray-400">@${user.username}</p>
                    </div>
                    <button onclick="sendFriendRequest('${user.uid}')" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm">
                        داواکاری هاوڕێیەتی
                    </button>
                `;
                searchResults.appendChild(userElement);
            });
        } else {
            results.forEach(group => {
                console.log('Creating group element for:', group);
                const groupElement = document.createElement('div');
                groupElement.className = 'flex items-center space-x-reverse space-x-3 p-2 hover:bg-gray-700 rounded cursor-pointer';
                groupElement.innerHTML = `
                    <img src="https://picsum.photos/seed/${group.groupId}/40/40.jpg" alt="${group.groupName}" class="w-8 h-8 rounded-full cursor-pointer hover:opacity-80" onclick="event.stopPropagation(); showGroupProfile('${group.groupId}')">
                    <div class="flex-1">
                        <h4 class="font-semibold">${group.groupName}</h4>
                        <p class="text-sm text-gray-400">${group.memberCount || 0} ئەندام</p>
                    </div>
                    <button onclick="joinGroup('${group.groupId}')" class="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm">
                        بوون بە ئەندام
                    </button>
                `;
                searchResults.appendChild(groupElement);
            });
        }
        
    } catch (error) {
        console.error('Search error:', error);
        searchResults.innerHTML = '<div class="text-center text-red-500 py-4">کێشە لە گەڕان</div>';
    }
}

// Search Groups
async function searchGroups(query) {
    try {
        console.log('Searching for groups with query:', query);
        
        // Get all public groups and filter client-side
        const allGroupsSnapshot = await db.collection('publicGroups').get();
        
        // Filter groups by name or description containing the query
        const matchingGroups = allGroupsSnapshot.docs.filter(doc => {
            const groupData = doc.data();
            const groupName = (groupData.groupName || '').toLowerCase();
            const description = (groupData.description || '').toLowerCase();
            const searchQuery = query.toLowerCase();
            
            return groupName.includes(searchQuery) || description.includes(searchQuery);
        });
        
        console.log('Found matching groups:', matchingGroups.length);
        
        // Convert to array with groupId
        const groups = matchingGroups.map(doc => ({
            groupId: doc.id,
            ...doc.data()
        }));
        
        return groups;
        
    } catch (error) {
        console.error('Error searching groups:', error);
        return [];
    }
}

// Join Group
async function joinGroup(groupId) {
    try {
        console.log('Joining group:', groupId);
        
        const user = await utils.getCurrentUser();
        if (!user) {
            showToast('تکایە سەرەتا چوونەژوورەوە بکە', 'error');
            return;
        }
        
        // Get group data
        const groupDoc = await db.collection('publicGroups').doc(groupId).get();
        if (!groupDoc.exists) {
            showToast('گروپەکە نەدۆزرایەوە', 'error');
            return;
        }
        
        const groupData = groupDoc.data();
        
        // Check if user is already a member
        if (groupData.members && groupData.members.includes(user.uid)) {
            showToast('تۆ ئەندامی گروپەکەیت', 'info');
            return;
        }
        
        // Add user to group members
        await db.collection('publicGroups').doc(groupId).update({
            members: firebase.firestore.FieldValue.arrayUnion(user.uid),
            memberCount: (groupData.memberCount || 0) + 1,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Create group chat entry for user
        const chatData = {
            participants: [user.uid],
            groupId: groupId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('privateChats').add(chatData);
        
        showToast('تۆ بە سەرکەوتوویی بوویتە ئەندامی گروپەکە', 'success');
        
        // Close search modal and refresh groups
        closeUserSearch();
        await loadUserGroups();
        
    } catch (error) {
        console.error('Error joining group:', error);
        showToast('نەتوانرا ببیتە ئەندامی گروپەکە', 'error');
    }
}

// Show Group Profile
async function showGroupProfile(groupId) {
    try {
        console.log('Showing group profile for:', groupId);
        currentGroupProfileId = groupId;
        
        // Get group data
        const groupDoc = await db.collection('publicGroups').doc(groupId).get();
        if (!groupDoc.exists) {
            showToast('گروپەکە نەدۆزرایەوە', 'error');
            return;
        }
        
        const groupData = groupDoc.data();
        console.log('Group data:', groupData);
        
        // Get current user
        const user = await utils.getCurrentUser();
        const isCreator = user && groupData.createdBy === user.uid;
        
        // Update modal with group information
        document.getElementById('groupProfileAvatar').src = `https://picsum.photos/seed/${groupId}/80/80.jpg`;
        document.getElementById('groupProfileName').textContent = groupData.groupName || 'ناوی گروپ';
        document.getElementById('groupProfileId').textContent = `ID: ${groupId}`;
        document.getElementById('groupProfileDescription').textContent = groupData.description || 'هیچ وەسفێک نییە';
        document.getElementById('groupProfileMemberCount').textContent = groupData.memberCount || (groupData.members?.length || 0);
        
        // Format creation date
        if (groupData.createdAt) {
            const createdDate = groupData.createdAt.toDate();
            document.getElementById('groupProfileCreated').textContent = utils.formatDate(createdDate, 'date');
        } else {
            document.getElementById('groupProfileCreated').textContent = 'نەزانراو';
        }
        
        // Show/hide admin controls based on whether user is the creator
        const adminControls = document.getElementById('adminControls');
        if (isCreator) {
            adminControls.classList.remove('hidden');
        } else {
            adminControls.classList.add('hidden');
        }
        
        // Hide/show leave group button for creator
        const leaveGroupBtn = document.getElementById('leaveGroupBtn');
        if (isCreator) {
            leaveGroupBtn.style.display = 'none';
        } else {
            leaveGroupBtn.style.display = 'block';
        }
        
        // Load group members
        await loadGroupMembers(groupId, isCreator);
        
        // Show modal
        document.getElementById('groupProfileModal').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error showing group profile:', error);
        showToast('کێشە لە بارکردنی پڕۆفایلی گروپ', 'error');
    }
}

// Load Group Members
async function loadGroupMembers(groupId, isCreator = false) {
    try {
        console.log('Loading group members for:', groupId);
        
        const groupDoc = await db.collection('publicGroups').doc(groupId).get();
        const groupData = groupDoc.data();
        
        const membersContainer = document.getElementById('groupProfileMembers');
        membersContainer.innerHTML = '';
        
        if (!groupData.members || groupData.members.length === 0) {
            membersContainer.innerHTML = '<div class="text-gray-400 text-sm">هیچ ئەندامێک نییە</div>';
            return;
        }
        
        // Get current user
        const user = await utils.getCurrentUser();
        
        // Load member data for each member
        for (const memberId of groupData.members) {
            try {
                const memberData = await utils.getUserData(memberId);
                if (memberData) {
                    const memberElement = document.createElement('div');
                    memberElement.className = 'flex items-center space-x-reverse space-x-2 p-2 bg-gray-600 rounded';
                    
                    // Check if this member is the creator
                    const isMemberCreator = groupData.createdBy === memberId;
                    
                    memberElement.innerHTML = `
                        <img src="${memberData.profilePhoto || 'https://picsum.photos/seed/default/32/32.jpg'}" alt="${memberData.firstName}" class="w-6 h-6 rounded-full">
                        <div class="flex-1">
                            <h6 class="text-sm font-semibold">${memberData.firstName} ${isMemberCreator ? '(ئەدمین)' : ''}</h6>
                            <p class="text-xs text-gray-400">@${memberData.username}</p>
                        </div>
                        ${isCreator && !isMemberCreator && memberId !== user.uid ? `
                            <button onclick="removeMemberFromGroup('${memberId}')" class="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs">
                                دەرکردن
                            </button>
                        ` : ''}
                    `;
                    membersContainer.appendChild(memberElement);
                }
            } catch (error) {
                console.error('Error loading member data:', error);
            }
        }
        
    } catch (error) {
        console.error('Error loading group members:', error);
        document.getElementById('groupProfileMembers').innerHTML = '<div class="text-red-400 text-sm">کێشە لە بارکردنی ئەندامان</div>';
    }
}

// Show Group Profile From Chat
function showGroupProfileFromChat() {
    if (currentChatType === 'group' && currentChatId) {
        showGroupProfile(currentChatId);
    } else {
        showToast('تەنها بۆ گروپەکان کار دەکات', 'info');
    }
}

// Close Group Profile
function closeGroupProfile() {
    document.getElementById('groupProfileModal').classList.add('hidden');
    currentGroupProfileId = null;
}

// Leave Group
async function leaveGroup() {
    if (!currentGroupProfileId) {
        showToast('هیچ گروپێک هەڵبژێردراوە', 'error');
        return;
    }
    
    try {
        console.log('Leaving group:', currentGroupProfileId);
        
        const user = await utils.getCurrentUser();
        if (!user) {
            showToast('تکایە سەرەتا چوونەژوورەوە بکە', 'error');
            return;
        }
        
        // Get group data
        const groupDoc = await db.collection('publicGroups').doc(currentGroupProfileId).get();
        if (!groupDoc.exists) {
            showToast('گروپەکە نەدۆزرایەوە', 'error');
            return;
        }
        
        const groupData = groupDoc.data();
        
        // Check if user is a member
        if (!groupData.members || !groupData.members.includes(user.uid)) {
            showToast('تۆ ئەندامی گروپەکە نیت', 'info');
            return;
        }
        
        // Remove user from group members
        await db.collection('publicGroups').doc(currentGroupProfileId).update({
            members: firebase.firestore.FieldValue.arrayRemove(user.uid),
            memberCount: Math.max(0, (groupData.memberCount || 0) - 1),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Remove group chat entry for user
        const userChatsSnapshot = await db.collection('privateChats')
            .where('participants', 'array-contains', user.uid)
            .where('groupId', '==', currentGroupProfileId)
            .get();
        
        userChatsSnapshot.forEach(async (doc) => {
            await doc.ref.delete();
        });
        
        showToast('تۆ بە سەرکەوتوویی دەرچوویت لە گروپەکە', 'success');
        
        // Close modal and refresh groups
        closeGroupProfile();
        await loadUserGroups();
        
        // If currently in this group chat, close it
        if (currentChatId === currentGroupProfileId && currentChatType === 'group') {
            cleanupChatSystem();
            const messagesArea = document.getElementById('messagesArea');
            if (messagesArea) {
                messagesArea.innerHTML = '<div class="text-center text-gray-500 mt-20">کەسێک هەڵبژێرە بۆ دەستپێکردنی چات</div>';
            }
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.classList.add('hidden');
            }
        }
        
    } catch (error) {
        console.error('Error leaving group:', error);
        showToast('نەتوانرا دەربچی لە گروپەکە', 'error');
    }
}

// Show Edit Group Name Modal
function showEditGroupName() {
    const groupName = document.getElementById('groupProfileName').textContent;
    document.getElementById('editGroupNameInput').value = groupName;
    document.getElementById('editGroupNameModal').classList.remove('hidden');
}

// Close Edit Group Name Modal
function closeEditGroupName() {
    document.getElementById('editGroupNameModal').classList.add('hidden');
}

// Update Group Name
async function updateGroupName() {
    const newName = document.getElementById('editGroupNameInput').value.trim();
    
    if (!newName || newName.length < 2) {
        showToast('تکایە ناوی گروپەکە بنووسە (لەکەم 2 پیت)', 'warning');
        return;
    }
    
    if (!currentGroupProfileId) {
        showToast('هیچ گروپێک هەڵبژێردراوە', 'error');
        return;
    }
    
    try {
        await db.collection('publicGroups').doc(currentGroupProfileId).update({
            groupName: newName,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update the display
        document.getElementById('groupProfileName').textContent = newName;
        
        // Update groups list if needed
        await loadUserGroups();
        
        closeEditGroupName();
        showToast('ناوی گروپ بە سەرکەوتوویی گۆڕدرا', 'success');
        
    } catch (error) {
        console.error('Error updating group name:', error);
        showToast('نەتوانرا ناوی گروپ بگۆڕدرێت', 'error');
    }
}

// Show Add Members Modal
function showAddMembers() {
    document.getElementById('addMemberSearchInput').value = '';
    document.getElementById('addMemberSearchResults').innerHTML = '';
    document.getElementById('addMembersModal').classList.remove('hidden');
}

// Close Add Members Modal
function closeAddMembers() {
    document.getElementById('addMembersModal').classList.add('hidden');
}

// Search for Members to Add
async function searchMembersToAdd() {
    const query = document.getElementById('addMemberSearchInput').value.trim();
    const resultsContainer = document.getElementById('addMemberSearchResults');
    
    if (query.length < 2) {
        resultsContainer.innerHTML = '';
        return;
    }
    
    try {
        const users = await utils.searchUsers(query);
        const currentGroup = await db.collection('publicGroups').doc(currentGroupProfileId).get();
        const groupData = currentGroup.data();
        
        resultsContainer.innerHTML = '';
        
        if (users.length === 0) {
            resultsContainer.innerHTML = '<div class="text-gray-400 text-sm">هیچ بەکارهێنەرێک نەدۆزرایەوە</div>';
            return;
        }
        
        users.forEach(user => {
            // Check if user is already a member
            if (groupData.members && groupData.members.includes(user.uid)) {
                return; // Skip if already a member
            }
            
            const userElement = document.createElement('div');
            userElement.className = 'flex items-center space-x-reverse space-x-2 p-2 bg-gray-600 rounded';
            userElement.innerHTML = `
                <img src="${user.profilePhoto}" alt="${user.firstName}" class="w-6 h-6 rounded-full">
                <div class="flex-1">
                    <h6 class="text-sm font-semibold">${user.firstName}</h6>
                    <p class="text-xs text-gray-400">@${user.username}</p>
                </div>
                <button onclick="addMemberToGroup('${user.uid}')" class="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs">
                    زیادکردن
                </button>
            `;
            resultsContainer.appendChild(userElement);
        });
        
        if (resultsContainer.children.length === 0) {
            resultsContainer.innerHTML = '<div class="text-gray-400 text-sm">هەموو بەکارهێنەرەکان ئەندامن</div>';
        }
        
    } catch (error) {
        console.error('Error searching for members:', error);
        resultsContainer.innerHTML = '<div class="text-red-400 text-sm">کێشە لە گەڕان</div>';
    }
}

// Add Member to Group
async function addMemberToGroup(userUid) {
    if (!currentGroupProfileId) {
        showToast('هیچ گروپێک هەڵبژێردراوە', 'error');
        return;
    }
    
    try {
        const groupDoc = await db.collection('publicGroups').doc(currentGroupProfileId).get();
        const groupData = groupDoc.data();
        
        // Check if user is already a member
        if (groupData.members && groupData.members.includes(userUid)) {
            showToast('ئەم بەکارهێنەرە ئەندامی گروپەکەیە', 'info');
            return;
        }
        
        // Add user to group
        await db.collection('publicGroups').doc(currentGroupProfileId).update({
            members: firebase.firestore.FieldValue.arrayUnion(userUid),
            memberCount: (groupData.memberCount || 0) + 1,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Create group chat entry for new member
        const chatData = {
            participants: [userUid],
            groupId: currentGroupProfileId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('privateChats').add(chatData);
        
        showToast('ئەندام بە سەرکەوتوویی زیادکرا', 'success');
        
        // Refresh the member list and search results
        await loadGroupMembers(currentGroupProfileId);
        searchMembersToAdd();
        
    } catch (error) {
        console.error('Error adding member:', error);
        showToast('نەتوانرا ئەندام بزیدرێت', 'error');
    }
}

// Remove Member from Group
async function removeMemberFromGroup(memberUid) {
    if (!currentGroupProfileId) {
        showToast('هیچ گروپێک هەڵبژێردراوە', 'error');
        return;
    }
    
    try {
        const groupDoc = await db.collection('publicGroups').doc(currentGroupProfileId).get();
        const groupData = groupDoc.data();
        
        // Check if trying to remove the creator
        if (groupData.createdBy === memberUid) {
            showToast('ناتوانرێت دروستکەری گروپەکە دەربکرێت', 'error');
            return;
        }
        
        // Remove user from group
        await db.collection('publicGroups').doc(currentGroupProfileId).update({
            members: firebase.firestore.FieldValue.arrayRemove(memberUid),
            memberCount: Math.max(0, (groupData.memberCount || 0) - 1),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Remove group chat entry for member
        const userChatsSnapshot = await db.collection('privateChats')
            .where('participants', 'array-contains', memberUid)
            .where('groupId', '==', currentGroupProfileId)
            .get();
        
        userChatsSnapshot.forEach(async (doc) => {
            await doc.ref.delete();
        });
        
        showToast('ئەندام بە سەرکەوتوویی دەرکرا', 'success');
        
        // Refresh the member list
        await loadGroupMembers(currentGroupProfileId);
        
    } catch (error) {
        console.error('Error removing member:', error);
        showToast('نەتوانرا ئەندام دەربکرێت', 'error');
    }
}

// Show Delete Group Confirmation Modal
function showDeleteGroupConfirmation() {
    const groupName = document.getElementById('groupProfileName').textContent;
    document.getElementById('deleteGroupConfirmationInput').value = '';
    document.getElementById('confirmDeleteBtn').disabled = true;
    document.getElementById('deleteGroupModal').classList.remove('hidden');
    
    // Add event listener to check confirmation input
    const confirmationInput = document.getElementById('deleteGroupConfirmationInput');
    confirmationInput.oninput = () => {
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        if (confirmationInput.value.trim() === groupName) {
            confirmBtn.disabled = false;
        } else {
            confirmBtn.disabled = true;
        }
    };
}

// Close Delete Group Confirmation Modal
function closeDeleteGroupConfirmation() {
    document.getElementById('deleteGroupModal').classList.add('hidden');
}

// Delete Group
async function deleteGroup() {
    if (!currentGroupProfileId) {
        showToast('هیچ گروپێک هەڵبژێردراوە', 'error');
        return;
    }
    
    try {
        const user = await utils.getCurrentUser();
        if (!user) {
            showToast('تکایە سەرەتا چوونەژوورەوە بکە', 'error');
            return;
        }
        
        // Get group data to verify user is the creator
        const groupDoc = await db.collection('publicGroups').doc(currentGroupProfileId).get();
        if (!groupDoc.exists) {
            showToast('گروپەکە نەدۆزرایەوە', 'error');
            return;
        }
        
        const groupData = groupDoc.data();
        
        // Safety check: only creator can delete
        if (groupData.createdBy !== user.uid) {
            showToast('تەنها دروستکەری گروپەکە دەتوانی سڕییەوە', 'error');
            return;
        }
        
        // Safety check: verify confirmation
        const confirmationInput = document.getElementById('deleteGroupConfirmationInput').value.trim();
        const groupName = document.getElementById('groupProfileName').textContent;
        
        if (confirmationInput !== groupName) {
            showToast('ناوی گروپەکە بە دروستی بنووسە', 'error');
            return;
        }
        
        console.log('Deleting group:', currentGroupProfileId);
        
        // Start the deletion process
        const batch = db.batch();
        
        // 1. Delete all group messages
        const groupMessagesSnapshot = await db.collection('groupMessages')
            .where('groupId', '==', currentGroupProfileId)
            .get();
        
        groupMessagesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // 2. Delete all private chat entries for this group
        const privateChatsSnapshot = await db.collection('privateChats')
            .where('groupId', '==', currentGroupProfileId)
            .get();
        
        privateChatsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // 3. Delete the group itself
        batch.delete(db.collection('publicGroups').doc(currentGroupProfileId));
        
        // Execute the batch deletion
        await batch.commit();
        
        showToast('گروپ بە سەرکەوتوویی سڕایەوە', 'success');
        
        // Close all modals
        closeDeleteGroupConfirmation();
        closeGroupProfile();
        
        // If currently in this group chat, close it
        if (currentChatId === currentGroupProfileId && currentChatType === 'group') {
            cleanupChatSystem();
            const messagesArea = document.getElementById('messagesArea');
            if (messagesArea) {
                messagesArea.innerHTML = '<div class="text-center text-gray-500 mt-20">کەسێک هەڵبژێرە بۆ دەستپێکردنی چات</div>';
            }
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.classList.add('hidden');
            }
        }
        
        // Refresh groups list
        await loadUserGroups();
        
        console.log('Group deletion completed successfully');
        
    } catch (error) {
        console.error('Error deleting group:', error);
        showToast('کێشە لە سڕینەوەی گروپ: ' + error.message, 'error');
    }
}

// Show User Profile
async function showUserProfile(userId) {
    try {
        console.log('Showing user profile for:', userId);
        currentUserProfileId = userId;
        
        // Get user data
        const userData = await utils.getUserData(userId);
        if (!userData) {
            showToast('بەکارهێنەر نەدۆزرایەوە', 'error');
            return;
        }
        
        console.log('User data:', userData);
        
        // Update modal with user information
        document.getElementById('userProfileAvatar').src = userData.profilePhoto || `https://picsum.photos/seed/${userId}/80/80.jpg`;
        document.getElementById('userProfileName').textContent = userData.firstName || 'ناوی بەکارهێنەر';
        document.getElementById('userProfileUsername').textContent = `@${userData.username || 'username'}`;
        document.getElementById('userProfileStatus').textContent = userData.isOnline ? 'ئامادە' : 'دوور';
        
        // Check if user is already blocked and update button
        const isBlocked = await isUserBlocked(userId);
        updateBlockButton(isBlocked);
        
        // Show modal
        document.getElementById('userProfileModal').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error showing user profile:', error);
        showToast('کێشە لە بارکردنی پڕۆفایلی بەکارهێنەر', 'error');
    }
}

// Close User Profile
function closeUserProfile() {
    document.getElementById('userProfileModal').classList.add('hidden');
    currentUserProfileId = null;
}

// Start Private Chat From Profile
function startPrivateChatFromProfile() {
    if (currentUserProfileId) {
        startPrivateChat(currentUserProfileId);
        closeUserProfile();
    }
}

// Remove Friend From Profile
async function removeFriendFromProfile() {
    if (!currentUserProfileId) {
        showToast('هیچ بەکارهێنەرێک هەڵبژێردراوە', 'error');
        return;
    }
    
    try {
        const user = await utils.getCurrentUser();
        if (!user) {
            showToast('تکایە سەرەتا چوونەژوورەوە بکە', 'error');
            return;
        }
        
        // Remove friendship
        await removeFriendship(user.uid, currentUserProfileId);
        
        showToast('هاوڕێ لابرا', 'success');
        
        // Update button state
        updateRemoveFriendButton(false);
        
        // Close profile after removal
        setTimeout(() => {
            closeUserProfile();
        }, 1000);
        
    } catch (error) {
        console.error('Error removing friend:', error);
        showToast('نەتوانرا هاوڕێ لاببرێت', 'error');
    }
}

// Update Remove Friend Button State
function updateRemoveFriendButton(isFriend) {
    const removeFriendBtn = document.getElementById('removeFriendBtn');
    if (removeFriendBtn) {
        if (isFriend) {
            removeFriendBtn.style.display = 'block';
        } else {
            removeFriendBtn.style.display = 'none';
        }
    }
}

// Toggle Block User
async function toggleBlockUser() {
    if (!currentUserProfileId) {
        showToast('هیچ بەکارهێنەرێک هەڵبژێردراوە', 'error');
        return;
    }
    
    try {
        const user = await utils.getCurrentUser();
        if (!user) {
            showToast('تکایە سەرەتا چوونەژوورەوە بکە', 'error');
            return;
        }
        
        // Check if user is already blocked
        const blockDoc = await db.collection('blockedUsers')
            .where('blockedBy', '==', user.uid)
            .where('blockedUser', '==', currentUserProfileId)
            .get();
        
        if (blockDoc.empty) {
            // Block the user
            await blockUser(currentUserProfileId);
        } else {
            // Unblock the user
            await unblockUser(blockDoc.docs[0].id);
        }
        
    } catch (error) {
        console.error('Error toggling block status:', error);
        showToast('کێشە لە بلۆک کردن/دابردن', 'error');
    }
}

// Block User
async function blockUser(blockedUserId) {
    try {
        const user = await utils.getCurrentUser();
        
        await db.collection('blockedUsers').add({
            blockedBy: user.uid,
            blockedUser: blockedUserId,
            blockedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Remove from friends if they are friends
        await removeFriendship(user.uid, blockedUserId);
        
        showToast('بەکارهێنەر بلۆک کرا', 'success');
        
        // Update button state
        updateBlockButton(true);
        
    } catch (error) {
        console.error('Error blocking user:', error);
        showToast('نەتوانرا بلۆک بکرێت', 'error');
    }
}

// Unblock User
async function unblockUser(blockDocId) {
    try {
        await db.collection('blockedUsers').doc(blockDocId).delete();
        
        showToast('بەکارهێنەر دابرا', 'success');
        
        // Update button state
        updateBlockButton(false);
        
    } catch (error) {
        console.error('Error unblocking user:', error);
        showToast('نەتوانرا دابربکرێت', 'error');
    }
}

// Remove Friendship
async function removeFriendship(userA, userB) {
    try {
        // Find and remove friendship document (check both directions)
        const friendsSnapshot = await db.collection('friends').get();
        
        const batch = db.batch();
        
        friendsSnapshot.forEach(doc => {
            const data = doc.data();
            if ((data.userUid === userA && data.friendUid === userB) || 
                (data.userUid === userB && data.friendUid === userA)) {
                batch.delete(doc.ref);
            }
        });
        
        await batch.commit();
        
        // Reload friends list
        await loadUserFriends();
        
    } catch (error) {
        console.error('Error removing friendship:', error);
    }
}

// Update Block Button State
async function updateBlockButton(isBlocked) {
    const blockBtn = document.getElementById('blockUnblockBtn');
    if (blockBtn) {
        if (isBlocked) {
            blockBtn.textContent = 'دابردن';
            blockBtn.className = 'flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition';
        } else {
            blockBtn.textContent = 'بلۆك کردن';
            blockBtn.className = 'flex-1 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition';
        }
    }
}

// Check if User is Blocked
async function isUserBlocked(userId) {
    try {
        const user = await utils.getCurrentUser();
        if (!user) return false;
        
        const blockDoc = await db.collection('blockedUsers')
            .where('blockedBy', '==', user.uid)
            .where('blockedUser', '==', userId)
            .get();
        
        return !blockDoc.empty;
    } catch (error) {
        console.error('Error checking block status:', error);
        return false;
    }
}

// Load Blocked Users
async function loadBlockedUsers() {
    try {
        console.log('Loading blocked users...');
        const user = await utils.getCurrentUser();
        if (!user) {
            console.error('No user found for loading blocked users');
            return;
        }
        
        // Get all blocked users for current user
        const blockedUsersSnapshot = await db.collection('blockedUsers')
            .where('blockedBy', '==', user.uid)
            .get();
        
        console.log('Found blocked users:', blockedUsersSnapshot.size);
        
        const blockedList = document.getElementById('blockedList');
        if (!blockedList) {
            console.error('Blocked list element not found');
            return;
        }
        
        blockedList.innerHTML = '';
        
        if (blockedUsersSnapshot.empty) {
            console.log('No blocked users found');
            blockedList.innerHTML = '<div class="text-center text-gray-500 py-8">هیچ بەکارهێنەرێک بلۆک نەکراوە</div>';
            return;
        }
        
        // Sort by blockedAt client-side
        const sortedBlocked = blockedUsersSnapshot.docs.sort((a, b) => {
            const aTime = a.data().blockedAt?.toMillis() || 0;
            const bTime = b.data().blockedAt?.toMillis() || 0;
            return bTime - aTime; // Descending order (most recent first)
        });
        
        for (const doc of sortedBlocked) {
            const blockedData = doc.data();
            console.log('Processing blocked user:', blockedData);
            
            try {
                const userData = await utils.getUserData(blockedData.blockedUser);
                if (userData) {
                    const blockedElement = document.createElement('div');
                    blockedElement.className = 'flex items-center space-x-reverse space-x-3 p-3 hover:bg-gray-700 rounded-lg transition';
                    
                    blockedElement.innerHTML = `
                        <img src="${userData.profilePhoto || 'https://picsum.photos/seed/default/40/40.jpg'}" alt="${userData.firstName}" class="w-10 h-10 rounded-full">
                        <div class="flex-1">
                            <h4 class="font-semibold">${userData.firstName}</h4>
                            <p class="text-sm text-gray-400">@${userData.username}</p>
                            <p class="text-xs text-red-400">بلۆک کرا لە ${utils.formatDate(blockedData.blockedAt.toDate(), 'date')}</p>
                        </div>
                        <div class="flex space-x-reverse space-x-1">
                            <button onclick="unblockUserFromList('${doc.id}')" class="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm">
                                دابردن
                            </button>
                        </div>
                    `;
                    blockedList.appendChild(blockedElement);
                }
            } catch (error) {
                console.error('Error loading blocked user data:', error);
            }
        }
        
        console.log('Blocked users loaded successfully');
        
    } catch (error) {
        console.error('Error loading blocked users:', error);
        const blockedList = document.getElementById('blockedList');
        if (blockedList) {
            blockedList.innerHTML = '<div class="text-center text-red-500 py-8">کێشە لە بارکردنی بلۆککراوەکان</div>';
        }
    }
}

// Unblock User From List
async function unblockUserFromList(blockDocId) {
    try {
        await unblockUser(blockDocId);
        // Reload the blocked users list
        await loadBlockedUsers();
    } catch (error) {
        console.error('Error unblocking user from list:', error);
        showToast('نەتوانرا دابربکرێت', 'error');
    }
}

// Refresh Notifications
async function refreshNotifications(event) {
    if (event) {
        event.stopPropagation();
    }
    
    try {
        console.log('Refreshing notifications...');
        
        // Add spinning animation to refresh button
        const refreshBtn = event?.target?.closest('button') || document.querySelector('button[onclick*="refreshNotifications"]');
        if (refreshBtn) {
            const svg = refreshBtn.querySelector('svg');
            if (svg) {
                svg.style.animation = 'spin 1s linear';
            }
        }
        
        // Load notifications
        await loadNotifications();
        
        // Show success feedback
        showToast('داواکاریەکان نوێکرانەوە', 'success');
        
        // Remove animation after 1 second
        setTimeout(() => {
            if (svg) {
                svg.style.animation = '';
            }
        }, 1000);
        
    } catch (error) {
        console.error('Error refreshing notifications:', error);
        showToast('کێشە لە نوێکردنەوە', 'error');
    }
}

// Load Notifications
async function loadNotifications() {
    try {
        console.log('Loading notifications...');
        const user = await utils.getCurrentUser();
        console.log('Current user for notifications:', user);
        
        if (!user) {
            console.error('No user found for notifications');
            return;
        }
        
        // Get all requests and filter client-side to avoid index requirement
        const allRequestsSnapshot = await db.collection('friendRequests').get();
        
        // Filter for current user's pending requests
        const userNotifications = allRequestsSnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.toUid === user.uid && data.status === 'pending';
        });
        
        console.log('Found notifications:', userNotifications.length);
        
        // Update notification badge
        const notificationBadge = document.getElementById('notificationBadge');
        if (notificationBadge) {
            if (userNotifications.length > 0) {
                notificationBadge.textContent = userNotifications.length > 9 ? '9+' : userNotifications.length.toString();
                notificationBadge.classList.remove('hidden');
            } else {
                notificationBadge.classList.add('hidden');
            }
        }
        
        const notificationsList = document.getElementById('notificationsList');
        console.log('Notifications list element:', notificationsList);
        
        if (!notificationsList) {
            console.error('Notifications list element not found!');
            return;
        }
        
        notificationsList.innerHTML = '';
        
        if (userNotifications.length === 0) {
            console.log('No notifications found');
            notificationsList.innerHTML = '<div class="text-center text-gray-500 text-sm py-2">هیچ داواکاریەک نییە</div>';
            return;
        }
        
        // Sort by createdAt client-side
        const sortedDocs = userNotifications.sort((a, b) => {
            const aTime = a.data().createdAt?.toMillis() || 0;
            const bTime = b.data().createdAt?.toMillis() || 0;
            return bTime - aTime; // Descending order
        });
        
        for (const doc of sortedDocs) {
            const notification = doc.data();
            console.log('Processing notification:', notification);
            const notificationElement = document.createElement('div');
            notificationElement.className = 'bg-gray-700 rounded-lg p-2 text-sm';
            notificationElement.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-reverse space-x-2">
                        <img src="${notification.fromPhoto || 'https://picsum.photos/seed/default/30/30.jpg'}" alt="${notification.fromName}" class="w-6 h-6 rounded-full">
                        <span class="text-gray-300">${notification.fromName} داواکاری هاوڕێیەتی نارد</span>
                    </div>
                    <div class="flex space-x-reverse space-x-1">
                        <button onclick="acceptFriendRequest('${doc.id}')" class="text-green-400 hover:text-green-300 text-xs">قبول</button>
                        <button onclick="rejectFriendRequest('${doc.id}')" class="text-red-400 hover:text-red-300 text-xs">ڕەت</button>
                    </div>
                </div>
            `;
            notificationsList.appendChild(notificationElement);
        }
        
        console.log('Notifications loaded successfully');
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Accept Friend Request
async function acceptFriendRequest(requestId) {
    try {
        console.log('=== ACCEPT FRIEND REQUEST START ===');
        console.log('Accepting request:', requestId);
        
        const requestDoc = await db.collection('friendRequests').doc(requestId).get();
        console.log('Request doc exists:', requestDoc.exists);
        
        if (!requestDoc.exists) {
            console.error('Friend request not found');
            utils.showToast('داواکاری نەدۆزرایەوە', 'error');
            return;
        }
        
        const request = requestDoc.data();
        console.log('Request data:', request);
        
        // Add to friends collection for both users
        const batch = db.batch();
        
        // Add to current user's friends
        const currentUserFriendRef = db.collection('friends').doc();
        batch.set(currentUserFriendRef, {
            userUid: request.toUid,
            friendUid: request.fromUid,
            friendName: request.fromName || 'Unknown',
            friendPhoto: request.fromPhoto || 'https://picsum.photos/seed/default/30/30.jpg',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Add to sender's friends
        const senderFriendRef = db.collection('friends').doc();
        batch.set(senderFriendRef, {
            userUid: request.fromUid,
            friendUid: request.toUid,
            friendName: request.toName || 'Unknown',
            friendPhoto: request.toPhoto || 'https://picsum.photos/seed/default/30/30.jpg',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update request status
        batch.update(db.collection('friendRequests').doc(requestId), {
            status: 'accepted'
        });
        
        console.log('Executing batch operations...');
        await batch.commit();
        
        utils.showToast('داواکاری هاوڕێیەتی قبوڵکرا', 'success');
        console.log('Friend request accepted successfully');
        
        // Create private chat with the new friend
        console.log('Creating private chat with new friend...');
        await startPrivateChat(request.fromUid);
        
        // Reload notifications and friends
        setTimeout(() => {
            loadNotifications();
            loadUserFriends();
            loadUserChats(); // Reload chats to show new private chat
        }, 500);
        
        console.log('=== ACCEPT FRIEND REQUEST END ===');
        
    } catch (error) {
        console.error('Error accepting friend request:', error);
        utils.showToast('کێشە لە قبوڵکردنی داواکاری', 'error');
    }
}

// Reject Friend Request
async function rejectFriendRequest(requestId) {
    try {
        console.log('=== REJECT FRIEND REQUEST START ===');
        console.log('Rejecting request:', requestId);
        
        const requestDoc = await db.collection('friendRequests').doc(requestId).get();
        console.log('Request doc exists:', requestDoc.exists);
        
        if (!requestDoc.exists) {
            console.error('Friend request not found');
            utils.showToast('داواکاری نەدۆزرایەوە', 'error');
            return;
        }
        
        console.log('Updating request status to rejected...');
        await db.collection('friendRequests').doc(requestId).update({
            status: 'rejected'
        });
        
        utils.showToast('داواکاری هاوڕێیەتی ڕەتکرا', 'info');
        console.log('Friend request rejected successfully');
        
        // Reload notifications
        setTimeout(() => {
            loadNotifications();
        }, 500);
        
        console.log('=== REJECT FRIEND REQUEST END ===');
        
    } catch (error) {
        console.error('Error rejecting friend request:', error);
        utils.showToast('کێشە لە ڕەتکردنی داواکاری', 'error');
    }
}

// Clear Notifications
function clearNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    if (notificationsList) {
        notificationsList.innerHTML = '<div class="text-center text-gray-500 text-sm py-2">هیچ داواکاریەک نییە</div>';
    }
}

// Send Friend Request
async function sendFriendRequest(userId) {
    try {
        console.log('=== SEND FRIEND REQUEST START ===');
        console.log('Sending friend request to:', userId);
        
        const user = await utils.getCurrentUser();
        console.log('Current user:', user);
        
        if (!user) {
            console.error('No current user found');
            utils.showToast('تکایە چوونەژوورەوە بکە', 'error');
            return;
        }
        
        // Get target user data
        console.log('Getting target user data for:', userId);
        const targetUserDoc = await db.collection('users').doc(userId).get();
        console.log('Target user doc exists:', targetUserDoc.exists);
        
        if (!targetUserDoc.exists) {
            console.error('Target user not found in Firestore');
            utils.showToast('بەکارهێنەر نەدۆزرایەوە', 'error');
            return;
        }
        
        const targetUser = targetUserDoc.data();
        console.log('Target user data:', targetUser);
        
        // Get current user data
        console.log('Getting current user data for:', user.uid);
        const currentUserDoc = await db.collection('users').doc(user.uid).get();
        console.log('Current user doc exists:', currentUserDoc.exists);
        
        if (!currentUserDoc.exists) {
            console.error('Current user not found in Firestore');
            utils.showToast('زانیاری بەکارهێنەر نەدۆزرایەوە', 'error');
            return;
        }
        
        const currentUser = currentUserDoc.data();
        console.log('Current user data:', currentUser);
        
        // Create friend request (allow multiple requests)
        const requestData = {
            fromUid: user.uid,
            fromName: currentUser.firstName || 'Unknown',
            fromPhoto: currentUser.profilePhoto || 'https://picsum.photos/seed/default/30/30.jpg',
            toUid: userId,
            toName: targetUser.firstName || 'Unknown',
            toPhoto: targetUser.profilePhoto || 'https://picsum.photos/seed/default/30/30.jpg',
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            requestId: `${user.uid}_${userId}_${Date.now()}`
        };
        
        console.log('Creating friend request:', requestData);
        
        await db.collection('friendRequests').add(requestData);
        
        utils.showToast('داواکاری هاوڕێیەتی نێردرا', 'success');
        console.log('Friend request sent successfully');
        
        // Reload notifications to show the new request
        setTimeout(() => {
            loadNotifications();
        }, 1000);
        
        console.log('=== SEND FRIEND REQUEST END ===');
        
    } catch (error) {
        console.error('Error sending friend request:', error);
        utils.showToast('نەتوانرا داواکاری بنێریت', 'error');
    }
}

// Generate Unique Group ID
function generateGroupId() {
    let groupId;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
        // Generate 6 random numbers
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        groupId = randomNum.toString();
        attempts++;
        
        // Add small delay if multiple attempts to ensure uniqueness
        if (attempts > 1) {
            new Promise(resolve => setTimeout(resolve, 100));
        }
    } while (document.getElementById('groupUniqueId').value === groupId && attempts < maxAttempts);
    
    document.getElementById('groupUniqueId').value = groupId;
    utils.showToast('ئایدی گروپ دروستکرا', 'success');
}

// Create Group
function createGroup() {
    // Auto-generate ID when opening modal
    generateGroupId();
    document.getElementById('createGroupModal').classList.remove('hidden');
}

function closeCreateGroup() {
    document.getElementById('createGroupModal').classList.add('hidden');
    document.getElementById('groupName').value = '';
    document.getElementById('groupDescription').value = '';
    document.getElementById('groupUniqueId').value = '';
}

// Create Group Submit
async function createGroupSubmit() {
    const groupName = document.getElementById('groupName').value.trim();
    const groupDescription = document.getElementById('groupDescription').value.trim();
    const groupUniqueId = document.getElementById('groupUniqueId').value.trim();
    
    console.log('Creating group:', { groupName, groupDescription, groupUniqueId });
    
    if (!groupName || !groupUniqueId) {
        utils.showToast('تکایە ناوی گروپ و ئایدی تایبەتی پڕ بکە', 'warning');
        return;
    }
    
    try {
        const user = await utils.getCurrentUser();
        console.log('Current user:', user);
        
        // Create group (no need to check for duplicate since we're using random numbers)
        const groupData = {
            groupName: groupName,
            groupUniqueId: groupUniqueId,
            description: groupDescription,
            createdBy: user.uid,
            admins: [user.uid],
            members: [user.uid],
            memberCount: 1,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        console.log('Group data to create:', groupData);
        
        await db.collection('publicGroups').add(groupData);
        
        console.log('Group created successfully');
        utils.showToast('گروپ بە سەرکەوتوویی دروستکرا', 'success');
        closeCreateGroup();
        
        console.log('Reloading groups...');
        await loadUserGroups();
        console.log('Groups reloaded');
        
    } catch (error) {
        console.error('Error creating group:', error);
        
        // If there's a duplicate ID error, generate a new one
        if (error.message && error.message.includes('already exists')) {
            utils.showToast('ئایدی دووبارە بوو، ئایدی نوێ دروست دەکرێت...', 'warning');
            generateGroupId(); // Generate new ID
            return;
        }
        
        utils.showToast('نەتوانرا گروپ دروست بکرێت', 'error');
    }
}

// Toggle Chat Info
function toggleChatInfo() {
    const sidebar = document.getElementById('chatInfoSidebar');
    sidebar.classList.toggle('hidden');
    
    if (!sidebar.classList.contains('hidden')) {
        loadChatInfo();
    }
}

// Load Chat Info
async function loadChatInfo() {
    const content = document.getElementById('chatInfoContent');
    content.innerHTML = '';
    
    if (currentChatType === 'private') {
        // Private chat info
        const userData = await utils.getUserData(currentChatData.participants.find(uid => uid !== auth.currentUser.uid));
        
        content.innerHTML = `
            <div class="text-center mb-4">
                <img src="${userData.profilePhoto}" alt="${userData.firstName}" class="w-20 h-20 rounded-full mx-auto mb-2">
                <h3 class="font-semibold">${userData.firstName}</h3>
                <p class="text-gray-400">@${userData.username}</p>
                <p class="text-sm ${userData.isOnline ? 'text-green-400' : 'text-gray-500'}">
                    ${userData.isOnline ? 'ئامادە' : 'دوور'}
                </p>
            </div>
            <div class="space-y-2">
                <button onclick="blockUser('${userData.uid}')" class="w-full py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm">
                    قەدەغەکردنی بەکارهێنەر
                </button>
            </div>
        `;
    } else {
        // Group chat info
        content.innerHTML = `
            <div class="text-center mb-4">
                <img src="https://picsum.photos/seed/group/80/80.jpg" alt="${currentChatData.groupName}" class="w-20 h-20 rounded-full mx-auto mb-2">
                <h3 class="font-semibold">${currentChatData.groupName}</h3>
                <p class="text-gray-400">${currentChatData.description}</p>
                <p class="text-sm text-gray-500">${currentChatData.members.length} ئەندام</p>
            </div>
            <div class="space-y-2">
                <button onclick="leaveGroup()" class="w-full py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm">
                    دەرچوون لە گروپ
                </button>
            </div>
        `;
    }
}

// Navigation Functions
function goToProfile() {
    window.location.href = 'profile.html';
}

function goToDashboard() {
    window.location.href = 'dashboard.html';
}

// Export functions
window.chatFunctions = {
    openChat,
    sendMessage,
    startPrivateChat,
    sendFriendRequest,
    createGroup,
    createGroupSubmit,
    generateGroupId,
    showTab,
    closeUserSearch,
    closeCreateGroup,
    toggleChatInfo,
    goToProfile,
    goToDashboard
};

// Make functions global for button onclick
window.searchUsers = searchUsers;
window.createGroup = createGroup;
window.createGroupSubmit = createGroupSubmit;
window.goToProfile = goToProfile;
window.goToDashboard = goToDashboard;
window.performSearch = performSearch;
window.showTab = showTab;
window.acceptFriendRequest = acceptFriendRequest;
window.rejectFriendRequest = rejectFriendRequest;
window.clearNotifications = clearNotifications;
window.loadNotifications = loadNotifications;
window.refreshNotifications = refreshNotifications;
window.loadBlockedUsers = loadBlockedUsers;
window.openChat = openChat; // Make sure openChat is global
window.setSearchType = setSearchType;
window.joinGroup = joinGroup;
window.showGroupProfile = showGroupProfile;
window.showGroupProfileFromChat = showGroupProfileFromChat;
window.closeGroupProfile = closeGroupProfile;
window.leaveGroup = leaveGroup;
window.showEditGroupName = showEditGroupName;
window.closeEditGroupName = closeEditGroupName;
window.updateGroupName = updateGroupName;
window.showAddMembers = showAddMembers;
window.closeAddMembers = closeAddMembers;
window.addMemberToGroup = addMemberToGroup;
window.removeMemberFromGroup = removeMemberFromGroup;
window.showDeleteGroupConfirmation = showDeleteGroupConfirmation;
window.closeDeleteGroupConfirmation = closeDeleteGroupConfirmation;
window.deleteGroup = deleteGroup;
window.startPrivateChat = startPrivateChat;
window.showUserProfile = showUserProfile;
window.closeUserProfile = closeUserProfile;
window.startPrivateChatFromProfile = startPrivateChatFromProfile;
window.toggleBlockUser = toggleBlockUser;
window.blockUser = blockUser;
window.unblockUser = unblockUser;
window.updateBlockButton = updateBlockButton;
window.isUserBlocked = isUserBlocked;
window.unblockUserFromList = unblockUserFromList;

// Debug functions
window.testClick = () => {
    console.log('🧪 Test click function called!');
    alert('Test click works!');
};

window.debugElements = () => {
    console.log('=== DEBUG ELEMENTS ===');
    const elements = ['chatsList', 'messagesArea', 'messageInput', 'chatName'];
    elements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`${id}:`, element);
        if (element) {
            element.style.border = '2px solid red';
            console.log(`✅ ${id} found and highlighted`);
        } else {
            console.log(`❌ ${id} not found`);
        }
    });
};

window.testSendMessage = () => {
    if (currentChatId && currentChatType) {
        const testMessage = 'ئەمە نامەی تێستە';
        document.getElementById('messageText').value = testMessage;
        sendMessage();
    } else {
        console.log('❌ No active chat to send message');
    }
};

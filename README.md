# Kurdish Chat Web App

وێبسایتی چاتکردنی مۆدێرن بۆ زمانی کوردی بە پشتگیریی Firebase

## تایبەتمەندیەکان

🔐 **Authentication**
- Email/Password تۆمارکردن و چوونەژوورەوە
- Google Sign-In
- پاراستنی هەژمارەکان

👤 **Profile**
- دەستکاری ناو و ناوی بەکارهێنەر
- بارکردنی وێنەی پڕۆفایل
- ڕێکخستنەکانی تایبەتی

💬 **Chat**
- چاتی تایبەتی (هاوڕێکان)
- چاتی گروپ (زۆرترین 3 بەڕێوەبەر)
- نامەی خۆکار-سڕین: تایبەتی (دوای خوێندنەوە)، گروپ (١٠ خولەک)

🔍 **Search**
- گەڕان بەدوای بەکارهێنەران بە ناوی بەکارهێنەر
- گەڕان بەدوای گروپەکان بە Group ID

🔔 **Notifications**
- داواکاریەکانی هاوڕێیەتی (قبوڵکردن/ڕەتکردنەوە)
- پیشاندانی ژمارەی نەخوێندراو

🛡️ **Admin**
- بینینی هەموو بەکارهێنەران
- Ban / Unban بەکارهێنەران
- لۆگی چاودێری

## تێکنەلۆجیا

### Frontend
- HTML5, CSS3 (Tailwind CSS)
- JavaScript (ES6+)
- Firebase SDK

### Backend / Services
- Firebase Authentication
- Firestore Database
- Firebase Storage
- Firebase Hosting

## دەستپێکردن

### پێداویستیەکان
- Node.js (بۆ پەرەپێدانی ناوخۆیی)
- Firebase Project
- Git

### دامەزراندن

1. **کۆپی کردنەوەی پڕۆژە**
```bash
git clone <repository-url>
cd kurdish-chat
```

2. **دامەزراندنی Firebase**
- بچۆ بۆ [Firebase Console](https://console.firebase.google.com/)
- پڕۆژەیەکی نوێ دروست بکە
- Authentication فعال بکە (Email/Password و Google)
- Firestore Database فعال بکە
- Storage فعال بکە
- Hosting فعال بکە

3. **ڕێکخستنی Firebase**
```bash
npm install -g firebase-tools
firebase login
firebase init
```

4. **ئامادەکردنی firebase-config.js**
- فایلی `firebase-config.js` بگۆڕە و زانیاری پڕۆژەکەت تێیدا دابنێ
- زانیاریەکان لە Firebase Console > Project Settings > وەرگرە

5. **دانانی Security Rules**
```bash
# Firestore Rules
firebase deploy --only firestore:rules

# Storage Rules  
firebase deploy --only storage:rules
```

6. **ڕاکخستنی ناوخۆیی**
```bash
# Install live-server for local development
npm install -g live-server

# Start development server
live-server --port=8080
```

## بنیادەی Firestore

### users
```
{
  uid: string,
  email: string,
  firstName: string,
  username: string,
  profilePhoto: string,
  role: string, // 'user', 'admin', 'banned'
  status: string, // 'ئامادە', 'دوور'
  isOnline: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### friendRequests
```
{
  id: string,
  fromUid: string,
  toUid: string,
  status: string, // 'pending', 'accepted', 'rejected'
  createdAt: timestamp
}
```

### friends
```
{
  id: string,
  userA: string,
  userB: string,
  createdAt: timestamp
}
```

### publicGroups
```
{
  id: string,
  groupName: string,
  groupUniqueId: string,
  description: string,
  creatorUid: string,
  admins: array,
  members: array,
  createdAt: timestamp
}
```

### groupMessages
```
{
  id: string,
  groupId: string,
  senderUid: string,
  senderName: string,
  text: string,
  createdAt: timestamp,
  expiresAt: timestamp
}
```

### privateChats
```
{
  id: string,
  participants: array,
  lastMessage: object,
  updatedAt: timestamp
}
```

### privateMessages
```
{
  id: string,
  chatId: string,
  senderUid: string,
  text: string,
  createdAt: timestamp,
  expiresAt: timestamp
}
```

### notifications
```
{
  id: string,
  uid: string,
  type: string,
  title: string,
  message: string,
  relatedId: string,
  isRead: boolean,
  createdAt: timestamp
}
```

### adminLogs
```
{
  id: string,
  adminUid: string,
  action: string,
  targetUid: string,
  details: string,
  createdAt: timestamp
}
```

## Deployment

### بۆ Firebase Hosting
```bash
# Build and deploy
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy with specific target
firebase deploy --only hosting:kurdish-chat
```

### بۆ سێرڤەری تر
1. هەموو فایلەکان کۆپی بکە بۆ سێرڤەر
2. `index.html` وەک main page ڕێکبکە
3. دڵنیابەرەوە لە HTTPS (پێویستە بۆ Firebase)

## Security Rules

### Firestore Rules
- تەنها خاوەن یان admin دەتوانن داتا بخوێننەوە/بێنن
- پاراستنی تایبەتی بەکارهێنەران
- کۆنترۆڵی دەستپێگەیشتن بۆ گروپ و چات

### Storage Rules
- تەنها خاوەن دەتوانی وێنەی پڕۆفایل باربکات
- پاراستنی فایلەکان

## Self-Destruct Messages

سیستەمی خۆکار-سڕین بەم شێوەیە کاردەکات:

### Private Messages
- **کات**: ٥ خولەک دوای خوێندنەوە
- **جێبەجێکردن**: Firestore timestamp + setInterval

### Group Messages  
- **کات**: ١٠ خولەک دوای ناردن
- **جێبەجێکردن**: Firestore timestamp + setInterval

```javascript
// نموونەی کۆد
const deleteAfter = 5 * 60 * 1000; // 5 خولەک

// ناردنی نامە
await addDoc(collection(db, "privateMessages"), {
  chatId,
  senderUid: auth.currentUser.uid,
  text,
  createdAt,
  expiresAt: new Date(Date.now() + deleteAfter)
});

// سڕینی خۆکار
setInterval(async () => {
  const now = new Date();
  const expired = query(collection(db, "privateMessages"), 
    where("expiresAt", "<=", now));
  const snapshot = await getDocs(expired);
  snapshot.forEach(doc => deleteDoc(doc.ref));
}, 60*1000);
```

## بەرەوپێشبردنە داهاتووەکان

- [ ] Online/Offline Status
- [ ] Last Seen
- [ ] Pinned Chats
- [ ] Block User
- [ ] Report User/Group
- [ ] Multi-language (Kurdish + English)
- [ ] Push Notifications
- [ ] Chat Analytics
- [ ] End-to-End Encryption
- [ ] Voice Messages
- [ ] Video Calls
- [ ] File Sharing
- [ ] Message Reactions
- [ ] Message Editing
- [ ] Message Forwarding

## پشتگیری و بەرەوپێشبردن

### Bug Reports
ئەگەر هەر هەڵەیەک دۆزیتەوە، تکایە لە GitHub Issues ڕاپۆرت بکە.

### Feature Requests
بۆ پێشنیارەکانی تایبەتمەندی نوێ، تکایە لە GitHub Discussions بەکاری بهێنە.

### Contributing
1. Fork پڕۆژەکە بکە
2. Branchی نوێ دروست بکە (`git checkout -b feature/AmazingFeature`)
3. گۆڕانکاریەکان commit بکە (`git commit -m 'Add some AmazingFeature'`)
4. بۆ Branch پێشوو push بکە (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## لایسەنس

ئەم پڕۆژەیە لەژێر لایسەنی MIT ە - [LICENSE](LICENSE) file ببینە بۆ زانیاری زیاتر.

## پەیوەندی

- **پەرەپێدەر**: [Your Name]
- **ئیمەیل**: [your.email@example.com]
- **پرۆژە**: [GitHub Repository]

## سوپاس بۆ

- Firebase بۆ خزمەتگوزاریە سەرەکیەکان
- Tailwind CSS بۆ ستایلینگ
- کۆمەڵگەی کوردی بۆ پشتگیری

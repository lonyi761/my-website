const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = path.join(__dirname, 'users.json');
const NOTICE_FILE = path.join(__dirname, 'announcements.json');

const getUsers = () => {
  if (!fs.existsSync(DB_FILE)) {
    const initialExpire = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const defaultUsers = [{ username: 'VIP', nickname: 'VIP', password: '123', vipExpire: initialExpire, role: 'admin' }];
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultUsers, null, 2));
    return defaultUsers;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
};

const saveUsers = (users) => fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));

const getAnnouncements = () => {
  if (!fs.existsSync(NOTICE_FILE)) {
    const defaultNotices = [
      {
        id: 1,
        type: '系統公告',
        title: '菠蘿農場成熟提醒和集市上線',
        date: '2026-09-13 12:17',
        content: `小程式新增菠蘿農場功能，可計算半熟、全熟時間或根據成熟時間反推終止時間，可選擇到點發微信提醒。同一頁還有「集市」，可以掛出售或收購的種子、果實。
主頁「常用功能」或廣場「百寶箱」可進入。

農場
• 按作物時長、肥料、周末算出生長速度，以及種到半熟、全熟要多久
• 三種填法：按種下時間、按還剩多久、計劃幾點收
• 半熟、全熟、播種都能到點提醒，可準時或提前幾分鐘
• 「我的提醒」看待提醒、已提醒、已取消；同時最多 6 塊地

集市
• 掛出售或收購，可填價值
• 按交易類型、水果類型、外觀因子篩選，也可搜索
• 消息列表查看誰找你聊；不想聊可拉黑或舉報`
      },
      {
        id: 2,
        type: '系統公告',
        title: '更新公告-260828',
        date: '2026-08-28 10:53',
        content: '修復已知系統問題，優化頁面加載速度。'
      },
      {
        id: 3,
        type: '更新公告',
        title: '更新公告-260826',
        date: '2026-08-26 01:30',
        content: '升級伺服器架構，提高資料同步穩定性。'
      },
      {
        id: 4,
        type: '更新公告',
        title: '更新公告-260719',
        date: '2026-07-19 23:15',
        content: '系統正式上線試營運。'
      }
    ];
    fs.writeFileSync(NOTICE_FILE, JSON.stringify(defaultNotices, null, 2));
    return defaultNotices;
  }
  return JSON.parse(fs.readFileSync(NOTICE_FILE, 'utf-8'));
};

const saveAnnouncements = (notices) => fs.writeFileSync(NOTICE_FILE, JSON.stringify(notices, null, 2));

// --- API 設定 ---
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ success: false, message: '請填寫完整帳號密碼' });

  const users = getUsers();
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ success: false, message: '該帳號已被註冊！' });
  }

  const vipExpire = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const newUser = { username, nickname: username, password, vipExpire, role: 'user' };

  users.push(newUser);
  saveUsers(users);
  res.json({ success: true, message: '註冊成功！已開通 14 天 VIP 試用期。' });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) return res.status(401).json({ success: false, message: '帳號或密碼錯誤！' });

  res.json({
    success: true,
    message: '登入成功',
    user: {
      username: user.username,
      nickname: user.nickname || user.username,
      vipExpire: user.vipExpire,
      role: user.role || 'user'
    }
  });
});

app.post('/api/user/update-profile', (req, res) => {
  const { username, nickname } = req.body;
  const users = getUsers();
  const userIndex = users.findIndex(u => u.username === username);

  if (userIndex === -1) return res.status(404).json({ success: false, message: '找不到該用戶' });

  users[userIndex].nickname = nickname;
  saveUsers(users);

  res.json({
    success: true,
    message: '個人資訊更新成功！',
    user: {
      username: users[userIndex].username,
      nickname: users[userIndex].nickname,
      vipExpire: users[userIndex].vipExpire,
      role: users[userIndex].role
    }
  });
});

app.post('/api/user/change-password', (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  const users = getUsers();
  const userIndex = users.findIndex(u => u.username === username);

  if (userIndex === -1) return res.status(404).json({ success: false, message: '找不到該用戶' });
  if (users[userIndex].password !== oldPassword) {
    return res.status(400).json({ success: false, message: '舊密碼輸入錯誤！' });
  }

  users[userIndex].password = newPassword;
  saveUsers(users);
  res.json({ success: true, message: '密碼修改成功！請重新登入。' });
});

// 取得公告列表
app.get('/api/announcements', (req, res) => {
  const notices = getAnnouncements();
  res.json({ success: true, announcements: notices });
});

// 發布公告 (含標題與內文)
app.post('/api/announcements', (req, res) => {
  const { username, type, title, content } = req.body;
  const users = getUsers();
  const user = users.find(u => u.username === username);

  if (!user || user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '權限不足！只有管理員可以發布公告。' });
  }

  if (!title || !content) return res.status(400).json({ success: false, message: '請填寫完整標題與內容' });

  const notices = getAnnouncements();
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newNotice = {
    id: Date.now(),
    type: type || '系統公告',
    title,
    date: dateStr,
    content
  };

  notices.unshift(newNotice);
  saveAnnouncements(notices);

  res.json({ success: true, message: '公告發布成功！', announcements: notices });
});

app.listen(3000, () => {
  console.log('後端伺服器已啟動於 [https://my-website-backend-v04t.onrender.com](https://my-website-backend-v04t.onrender.com)');
});
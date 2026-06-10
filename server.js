const fs = require('fs');
const path = require('path');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;
const dataDir = path.join(__dirname, 'data');
const usersPath = path.join(dataDir, 'users.json');
const jwtSecret = process.env.JWT_SECRET || 'emaar-secret-key';

let mailer = {
  transporter: null,
  from: 'no-reply@emaar-bonyan.local',
  isTestAccount: false,
};

function ensureDataStore() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(usersPath)) {
    fs.writeFileSync(usersPath, '[]', 'utf-8');
  }
}

function loadUsers() {
  ensureDataStore();
  const raw = fs.readFileSync(usersPath, 'utf-8');
  return JSON.parse(raw || '[]');
}

function saveUsers(users) {
  ensureDataStore();
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf-8');
}

async function initMailer() {
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    mailer.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    if (process.env.SMTP_FROM) {
      mailer.from = process.env.SMTP_FROM;
    }
    mailer.isTestAccount = false;
    console.log('Mailer configured using SMTP provider.');
    return;
  }

  const testAccount = await nodemailer.createTestAccount();
  mailer.transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  mailer.isTestAccount = true;
  console.log('نظام البريد يستخدم حساب اختبار Ethereal. عنوان الإرسال:', mailer.from);
}

function createToken(payload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: '24h' });
}

function verifyToken(token) {
  return jwt.verify(token, jwtSecret);
}

function getBaseUrl(req) {
  return req.get('origin') || `http://localhost:${port}`;
}

async function sendConfirmationEmail(to, link) {
  if (!mailer.transporter) {
    throw new Error('Mailer غير مهيأ');
  }

  const info = await mailer.transporter.sendMail({
    from: mailer.from,
    to,
    subject: 'تأكيد إنشاء الحساب في منصة إعمار وبنيان',
    html: `
      <div style="font-family: sans-serif; direction: rtl; text-align: right;">
        <h2>مرحبا بك في إعمار وبنيان</h2>
        <p>اضغط على الرابط التالي لتأكيد حسابك:</p>
        <a href="${link}" style="display: inline-block; margin: 16px 0; padding: 12px 18px; background: #0f5ebf; color: #fff; text-decoration: none; border-radius: 8px;">تأكيد الحساب</a>
        <p>إن لم يفتح الرابط، انسخ الرابط التالي في المتصفح:</p>
        <p style="word-break: break-all;">${link}</p>
      </div>
    `,
  });

  return mailer.isTestAccount ? nodemailer.getTestMessageUrl(info) : null;
}

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/register', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور والدور.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const users = loadUsers();
  if (users.some((user) => user.email === normalizedEmail)) {
    return res.status(409).json({ message: 'هذا البريد الإلكتروني مستخدم بالفعل.' });
  }

  const roles = ['reporter', 'investor', 'contractor'];
  if (!roles.includes(role)) {
    return res.status(400).json({ message: 'الدور غير صالح.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const confirmationToken = crypto.randomUUID();
  const account = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    passwordHash,
    role,
    confirmed: false,
    confirmationToken,
    createdAt: new Date().toISOString(),
  };

  users.push(account);
  saveUsers(users);

  const confirmationLink = `${getBaseUrl(req)}/?confirm=${confirmationToken}`;
  const previewUrl = await sendConfirmationEmail(normalizedEmail, confirmationLink);

  return res.status(201).json({
    message: 'تم إنشاء الحساب، يرجى تأكيد البريد الإلكتروني من خلال الرابط المرسل.',
    previewUrl,
  });
});

app.get('/api/confirm', (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.status(400).json({ message: 'رمز التأكيد غير موجود.' });
  }

  const users = loadUsers();
  const user = users.find((item) => item.confirmationToken === token);
  if (!user) {
    return res.status(404).json({ message: 'رمز التأكيد غير صالح أو انتهى.' });
  }

  user.confirmed = true;
  delete user.confirmationToken;
  saveUsers(users);

  return res.json({ message: 'تم تأكيد البريد الإلكتروني بنجاح. يمكنك تسجيل الدخول الآن.' });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const users = loadUsers();
  const user = users.find((item) => item.email === normalizedEmail);
  if (!user) {
    return res.status(401).json({ message: 'بيانات الاعتماد غير صحيحة.' });
  }
  if (!user.confirmed) {
    return res.status(403).json({ message: 'يجب تأكيد بريدك الإلكتروني قبل تسجيل الدخول.' });
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ message: 'بيانات الاعتماد غير صحيحة.' });
  }

  const token = createToken({ id: user.id, email: user.email, role: user.role });
  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
});

app.get('/api/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'غير مخول.' });
  }

  const token = auth.slice(7);
  try {
    const payload = verifyToken(token);
    return res.json({ user: payload });
  } catch (error) {
    return res.status(401).json({ message: 'رمز الجلسة غير صالح.' });
  }
});

initMailer()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('فشل تهيئة نظام البريد الإلكتروني:', error);
    process.exit(1);
  });

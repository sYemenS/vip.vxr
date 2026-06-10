import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import {
  getDatabase,
  ref,
  child,
  get,
  set,
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  applyActionCode,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAIsvIYvQENj7LTa0NMQutJ_hEBWaGMz54',
  authDomain: 'ehya-app-c67f3.firebaseapp.com',
  databaseURL: 'https://ehya-app-c67f3-default-rtdb.firebaseio.com',
  projectId: 'ehya-app-c67f3',
  storageBucket: 'ehya-app-c67f3.firebasestorage.app',
  messagingSenderId: '1034711162380',
  appId: '1:1034711162380:web:19f019bbd51ae2efc41829',
};

const appFirebase = initializeApp(firebaseConfig);
const auth = getAuth(appFirebase);
const db = getDatabase(appFirebase);
auth.languageCode = 'ar';
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('Firebase persistence unavailable:', error.message || error);
});

const state = {
  role: 'dashboard',
  currentUser: null,
  reports: [],
  projects: [
    { id: 1, name: 'توسعة شبكة مياه المدينة', status: 'قيد التنفيذ', funded: 520000, goal: 700000, coords: [24.6877, 46.7219], city: 'الرياض' },
    { id: 2, name: 'تحديث الطرق الرئيسية', status: 'بحاجة لتمويل', funded: 290000, goal: 480000, coords: [21.4858, 39.1925], city: 'مكة' },
    { id: 3, name: 'محطة طاقة شمسية', status: 'قيد التنفيذ', funded: 650000, goal: 800000, coords: [24.7743, 46.7386], city: 'الرياض' },
    { id: 4, name: 'توسعة شبكة الاتصالات', status: 'بحاجة لتمويل', funded: 120000, goal: 280000, coords: [26.3076, 50.0998], city: 'الخبر' },
  ],
  reportsMap: null,
  investorMap: null,
  userLocation: [24.7136, 46.6753],
};

const elements = {
  authOverlay: document.getElementById('authOverlay'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  registerEmail: document.getElementById('registerEmail'),
  registerRole: document.getElementById('registerRole'),
  registerPassword: document.getElementById('registerPassword'),
  registerConfirmPassword: document.getElementById('registerConfirmPassword'),
  showLogin: document.getElementById('showLogin'),
  showRegister: document.getElementById('showRegister'),
  authAlert: document.getElementById('authAlert'),
  authInfo: document.getElementById('authInfo'),
  logoutButton: document.getElementById('logoutButton'),
  currentUserText: document.getElementById('currentUserText'),
  themeToggle: document.getElementById('themeToggle'),
  roleButtons: document.querySelectorAll('.role-button'),
  statusMessage: document.getElementById('statusMessage'),
  views: {
    dashboard: document.getElementById('dashboardView'),
    reporter: document.getElementById('reporterView'),
    investor: document.getElementById('investorView'),
    contractor: document.getElementById('contractorView'),
  },
  totalProjects: document.getElementById('totalProjects'),
  totalAmount: document.getElementById('totalAmount'),
  activeProjects: document.getElementById('activeProjects'),
  fundingNeeded: document.getElementById('fundingNeeded'),
  dashboardProjects: document.getElementById('dashboardProjects'),
  dashboardProgress: document.getElementById('dashboardProgress'),
  reportForm: document.getElementById('reportForm'),
  reportImage: document.getElementById('reportImage'),
  reportDescription: document.getElementById('reportDescription'),
  latitude: document.getElementById('latitude'),
  longitude: document.getElementById('longitude'),
  reportPreview: document.getElementById('reportPreview'),
  previewMessage: document.getElementById('previewMessage'),
  projectCards: document.getElementById('projectCards'),
  contractorProjects: document.getElementById('contractorProjects'),
  bondRequired: document.getElementById('bondRequired'),
  readyProjects: document.getElementById('readyProjects'),
  securedProjects: document.getElementById('securedProjects'),
};

function initTheme() {
  const storedTheme = localStorage.getItem('emaarTheme');
  if (storedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    elements.themeToggle.textContent = '☀️';
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('emaarTheme', next);
  elements.themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
}

function setMessage(node, message, type = 'info') {
  if (!node) return;
  node.innerHTML = message;
  node.classList.remove('hidden');
  node.classList.toggle('alert-message', type === 'error');
  node.classList.toggle('notification', type === 'info');
}

function hideMessage(node) {
  if (!node) return;
  node.textContent = '';
  node.classList.add('hidden');
  node.classList.remove('alert-message', 'notification');
}

function showLoginForm() {
  elements.loginForm.classList.remove('hidden');
  elements.registerForm.classList.add('hidden');
  elements.showLogin.classList.add('active');
  elements.showRegister.classList.remove('active');
  hideMessage(elements.authAlert);
  hideMessage(elements.authInfo);
}

function showRegisterForm() {
  elements.loginForm.classList.add('hidden');
  elements.registerForm.classList.remove('hidden');
  elements.showLogin.classList.remove('active');
  elements.showRegister.classList.add('active');
  hideMessage(elements.authAlert);
  hideMessage(elements.authInfo);
}

function shouldShowRole(role) {
  return state.currentUser && (role === 'dashboard' || state.currentUser.role === role);
}

function applyUserRoleAccess() {
  elements.roleButtons.forEach((btn) => {
    if (shouldShowRole(btn.dataset.role)) {
      btn.classList.remove('hidden');
    } else {
      btn.classList.add('hidden');
    }
  });
}

function hideAuthOverlay() {
  elements.authOverlay.classList.add('hidden');
  elements.logoutButton.classList.remove('hidden');
  elements.currentUserText.classList.remove('hidden');
}

function showAuthOverlay() {
  elements.authOverlay.classList.remove('hidden');
  elements.logoutButton.classList.add('hidden');
  elements.currentUserText.classList.add('hidden');
  elements.roleButtons.forEach((btn) => btn.classList.remove('hidden'));
  switchRole('dashboard');
}

function setSession(user) {
  state.currentUser = user;
  localStorage.setItem('emaarSession', JSON.stringify(user));
  elements.currentUserText.textContent = `مرحباً، ${user.email}`;
  hideAuthOverlay();
  applyUserRoleAccess();
  switchRole(user.role);
}

function clearSession() {
  state.currentUser = null;
  localStorage.removeItem('emaarSession');
  elements.currentUserText.textContent = '';
}

function formatAuthError(error) {
  const code = error?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'هذا البريد مستخدم بالفعل.';
    case 'auth/invalid-email':
      return 'البريد الإلكتروني غير صالح.';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة جداً. استخدم 6 أحرف أو أكثر.';
    case 'auth/wrong-password':
      return 'كلمة المرور غير صحيحة.';
    case 'auth/user-not-found':
      return 'لا يوجد مستخدم بهذا البريد.';
    case 'auth/user-disabled':
      return 'تم تعطيل هذا الحساب.';
    case 'auth/too-many-requests':
      return 'محاولة دخول كثيرة. حاول مرة أخرى لاحقاً.';
    case 'auth/invalid-action-code':
      return 'رابط التأكيد غير صالح أو منتهي.';
    case 'auth/expired-action-code':
      return 'رابط التأكيد انتهى. أعد إرسال التأكيد.';
    default:
      return error?.message || 'حدث خطأ غير متوقع. حاول مرة أخرى.';
  }
}

async function saveUserProfile(uid, email, role) {
  await set(ref(db, `users/${uid}`), {
    email,
    role,
    createdAt: new Date().toISOString(),
  });
}

async function loadUserProfile(uid) {
  const snapshot = await get(child(ref(db), `users/${uid}`));
  return snapshot.exists() ? snapshot.val() : null;
}

async function handleActionLink() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const oobCode = params.get('oobCode');
  if (mode !== 'verifyEmail' || !oobCode) {
    return;
  }

  try {
    await applyActionCode(auth, oobCode);
    setMessage(elements.statusMessage, 'تم تأكيد البريد الإلكتروني بنجاح. يمكنك تسجيل الدخول الآن.', 'info');
  } catch (error) {
    setMessage(elements.statusMessage, formatAuthError(error), 'error');
  } finally {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  hideMessage(elements.authAlert);
  hideMessage(elements.authInfo);

  const email = elements.loginEmail.value.trim();
  const password = elements.loginPassword.value;

  if (!email || !password) {
    setMessage(elements.authAlert, 'يرجى إدخال البريد وكلمة المرور.', 'error');
    return;
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    await user.reload();

    if (!user.emailVerified) {
      await sendEmailVerification(user, {
        url: window.location.origin,
        handleCodeInApp: true,
      });
      await firebaseSignOut(auth);
      setMessage(
        elements.authAlert,
        'لم يتم تأكيد بريدك بعد. تم إرسال رابط التحقق مرة أخرى إلى بريدك الإلكتروني.',
        'error'
      );
      return;
    }

    const profile = await loadUserProfile(user.uid);
    setSession({
      uid: user.uid,
      email: user.email,
      role: profile?.role || 'reporter',
      emailVerified: user.emailVerified,
    });
    setMessage(elements.statusMessage, 'تم تسجيل الدخول بنجاح.', 'info');
  } catch (error) {
    setMessage(elements.authAlert, formatAuthError(error), 'error');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  hideMessage(elements.authAlert);
  hideMessage(elements.authInfo);

  const email = elements.registerEmail.value.trim();
  const role = elements.registerRole.value;
  const password = elements.registerPassword.value;
  const confirmPassword = elements.registerConfirmPassword.value;

  if (!email || !password || !confirmPassword) {
    setMessage(elements.authAlert, 'يرجى ملء جميع الحقول.', 'error');
    return;
  }

  if (password !== confirmPassword) {
    setMessage(elements.authAlert, 'كلمة المرور وتأكيدها غير متطابقين.', 'error');
    return;
  }

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    await saveUserProfile(user.uid, email, role);
    await sendEmailVerification(user, {
      url: window.location.origin,
      handleCodeInApp: true,
    });
    await firebaseSignOut(auth);

    setMessage(
      elements.authInfo,
      'تم إنشاء الحساب بنجاح. تم إرسال رابط التحقق إلى بريدك الإلكتروني. افتح البريد واضغط على الرابط قبل تسجيل الدخول.',
      'info'
    );
    elements.registerForm.reset();
    showLoginForm();
  } catch (error) {
    setMessage(elements.authAlert, formatAuthError(error), 'error');
  }
}

function handleLogout() {
  firebaseSignOut(auth).catch(() => {});
  clearSession();
  showAuthOverlay();
  showLoginForm();
  setMessage(elements.statusMessage, 'تم تسجيل الخروج بنجاح.', 'info');
}

function switchRole(role) {
  state.role = role;
  elements.roleButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.role === role);
  });
  Object.keys(elements.views).forEach((viewKey) => {
    elements.views[viewKey].classList.toggle('hidden', viewKey !== role);
  });
  if (role === 'reporter' && state.reportsMap) {
    setTimeout(() => state.reportsMap.invalidateSize(), 100);
  }
  if (role === 'investor' && state.investorMap) {
    setTimeout(() => state.investorMap.invalidateSize(), 100);
  }
}

function updateDashboard() {
  const totalProjects = state.projects.length;
  const totalAmount = state.projects.reduce((sum, project) => sum + project.goal, 0);
  const activeProjects = state.projects.filter((project) => project.status === 'قيد التنفيذ').length;
  const fundingNeeded = state.projects.filter((project) => project.status === 'بحاجة لتمويل').length;

  elements.totalProjects.textContent = totalProjects;
  elements.totalAmount.textContent = `${totalAmount.toLocaleString()} ريال`;
  elements.activeProjects.textContent = activeProjects;
  elements.fundingNeeded.textContent = fundingNeeded;

  elements.dashboardProjects.innerHTML = '';
  state.projects.slice(0, 4).forEach((project) => {
    const li = document.createElement('li');
    li.textContent = `${project.name} • ${project.city} • ${project.status}`;
    elements.dashboardProjects.appendChild(li);
  });

  elements.dashboardProgress.innerHTML = '';
  state.projects.forEach((project) => {
    const progress = Math.round((project.funded / project.goal) * 100);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<strong>${project.name}</strong> <span>${progress}%</span>`;
    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    const fill = document.createElement('span');
    fill.style.width = `${progress}%`;
    bar.appendChild(fill);
    wrapper.appendChild(bar);
    elements.dashboardProgress.appendChild(wrapper);
  });
}

function initMaps() {
  state.reportsMap = L.map('reporterMap').setView(state.userLocation, 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'خرائط OpenStreetMap',
  }).addTo(state.reportsMap);
  L.marker(state.userLocation).addTo(state.reportsMap).bindPopup('موقعك الحالي').openPopup();

  state.investorMap = L.map('investorMap').setView(state.userLocation, 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'خرائط OpenStreetMap',
  }).addTo(state.investorMap);

  state.projects.forEach((project) => {
    const marker = L.marker(project.coords).addTo(state.investorMap);
    marker.bindPopup(`<strong>${project.name}</strong><br>${project.city}<br>التمويل: ${Math.round((project.funded / project.goal) * 100)}%`);
  });
}

function renderInvestorProjects() {
  elements.projectCards.innerHTML = '';
  state.projects.forEach((project) => {
    const progress = Math.round((project.funded / project.goal) * 100);
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <h4>${project.name}</h4>
      <p>${project.city} • ${project.status}</p>
      <div>التمويل الحالي: ${project.funded.toLocaleString()} / ${project.goal.toLocaleString()} ريال</div>
      <div class="progress-bar"><span style="width: ${progress}%;"></span></div>
      <div style="margin-top: 8px; color: var(--text-muted);">${progress}% من الهدف</div>
    `;
    elements.projectCards.appendChild(card);
  });
}

function renderContractorProjects() {
  elements.contractorProjects.innerHTML = '';
  let totalBond = 0;
  let readyCount = 0;
  let securedCount = 0;

  state.projects.forEach((project) => {
    const bond = Math.round(project.goal * 0.8);
    totalBond += bond;
    const secured = project.status === 'قيد التنفيذ';
    if (secured) securedCount += 1;
    if (project.status !== 'قيد التنفيذ') readyCount += 1;

    const card = document.createElement('div');
    card.className = 'contractor-project-card';
    card.innerHTML = `
      <h4>${project.name}</h4>
      <p>${project.city} • ${project.status}</p>
      <div>قيمة المشروع: ${project.goal.toLocaleString()} ريال</div>
      <div>ضمان الأمان: ${bond.toLocaleString()} ريال</div>
      <div class="progress-bar"><span style="width: ${Math.round((project.funded / project.goal) * 100)}%;"></span></div>
      <div style="margin-top: 8px; color: var(--text-muted);">${Math.round((project.funded / project.goal) * 100)}% تم تمويله</div>
    `;
    elements.contractorProjects.appendChild(card);
  });

  elements.bondRequired.textContent = `${totalBond.toLocaleString()} ريال`;
  elements.readyProjects.textContent = readyCount;
  elements.securedProjects.textContent = securedCount;
}

function loadUserLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.userLocation = [position.coords.latitude, position.coords.longitude];
      elements.latitude.textContent = position.coords.latitude.toFixed(5);
      elements.longitude.textContent = position.coords.longitude.toFixed(5);
      if (state.reportsMap) {
        state.reportsMap.setView(state.userLocation, 11);
        L.marker(state.userLocation).addTo(state.reportsMap).bindPopup('موقعك الحالي').openPopup();
      }
    },
    () => {
      elements.latitude.textContent = state.userLocation[0].toFixed(5);
      elements.longitude.textContent = state.userLocation[1].toFixed(5);
    }
  );
}

function setupReportForm() {
  elements.reportImage.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      elements.previewMessage.innerHTML = `<img src="${reader.result}" alt="معاينة التقرير" class="preview-image" />`;
    };
    reader.readAsDataURL(file);
  });

  elements.reportForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const description = elements.reportDescription.value.trim();
    if (!description) return;
    const newReport = {
      description,
      coords: state.userLocation,
      date: new Date().toLocaleString('ar-EG'),
    };
    state.reports.push(newReport);
    elements.previewMessage.innerHTML = `تم إنشاء البلاغ بنجاح بتاريخ ${newReport.date}.<br>الوصف: ${description}`;
    elements.reportDescription.value = '';
  });
}

function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      clearSession();
      showAuthOverlay();
      showLoginForm();
      return;
    }

    await user.reload();
    if (!user.emailVerified) {
      await firebaseSignOut(auth);
      setMessage(
        elements.authAlert,
        'حسابك موجود لكن البريد غير مؤكد. افتح رابط التحقق في بريدك قبل تسجيل الدخول.',
        'error'
      );
      showAuthOverlay();
      showLoginForm();
      return;
    }

    const profile = await loadUserProfile(user.uid);
    setSession({
      uid: user.uid,
      email: user.email,
      role: profile?.role || 'reporter',
      emailVerified: user.emailVerified,
    });
    setMessage(elements.statusMessage, 'تم تسجيل الدخول بنجاح.', 'info');
  });

  elements.loginForm.addEventListener('submit', handleLogin);
  elements.registerForm.addEventListener('submit', handleRegister);
  elements.logoutButton.addEventListener('click', handleLogout);
  elements.showLogin.addEventListener('click', showLoginForm);
  elements.showRegister.addEventListener('click', showRegisterForm);
}

function showAiStudioReadyMessage() {
  setMessage(
    elements.statusMessage,
    'التطبيق جاهز للتشغيل والنشر على AI Studio. استخدم Dockerfile لبناء الصورة ثم انشرها عبر Google AI Studio.',
    'info'
  );
}

function init() {
  initTheme();
  initMaps();
  updateDashboard();
  renderInvestorProjects();
  renderContractorProjects();
  loadUserLocation();
  setupReportForm();
  handleActionLink();
  initAuth();
  showAiStudioReadyMessage();

  elements.themeToggle.addEventListener('click', toggleTheme);
  elements.roleButtons.forEach((button) => {
    button.addEventListener('click', () => switchRole(button.dataset.role));
  });
}

window.addEventListener('DOMContentLoaded', init);

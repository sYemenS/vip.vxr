const state = {
  role: 'dashboard',
  currentUser: null,
  reports: [],
  users: [
    { username: 'reporter1', password: 'reporter123', role: 'reporter', name: 'المواطن' },
    { username: 'investor1', password: 'investor123', role: 'investor', name: 'المتبرع' },
    { username: 'contractor1', password: 'contractor123', role: 'contractor', name: 'المقاول' },
  ],
  projects: [
    {
      id: 1,
      name: 'توسعة شبكة مياه المدينة',
      status: 'قيد التنفيذ',
      funded: 520000,
      goal: 700000,
      coords: [24.6877, 46.7219],
      city: 'الرياض',
    },
    {
      id: 2,
      name: 'تحديث الطرق الرئيسية',
      status: 'بحاجة لتمويل',
      funded: 290000,
      goal: 480000,
      coords: [21.4858, 39.1925],
      city: 'مكة',
    },
    {
      id: 3,
      name: 'محطة طاقة شمسية',
      status: 'قيد التنفيذ',
      funded: 650000,
      goal: 800000,
      coords: [24.7743, 46.7386],
      city: 'الرياض',
    },
    {
      id: 4,
      name: 'توسعة شبكة الاتصالات',
      status: 'بحاجة لتمويل',
      funded: 120000,
      goal: 280000,
      coords: [26.3076, 50.0998],
      city: 'الخبر',
    },
  ],
  reportsMap: null,
  investorMap: null,
  userLocation: [24.7136, 46.6753],
};

const elements = {
  themeToggle: document.getElementById('themeToggle'),
  roleButtons: document.querySelectorAll('.role-button'),
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
  authOverlay: document.getElementById('authOverlay'),
  loginForm: document.getElementById('loginForm'),
  loginUsername: document.getElementById('loginUsername'),
  loginPassword: document.getElementById('loginPassword'),
  loginAlert: document.getElementById('loginAlert'),
  logoutButton: document.getElementById('logoutButton'),
  currentUserText: document.getElementById('currentUserText'),
  reportForm: document.getElementById('reportForm'),
  reportImage: document.getElementById('reportImage'),
  reportDescription: document.getElementById('reportDescription'),
  latitude: document.getElementById('latitude'),
  longitude: document.getElementById('longitude'),
  reportPreview: document.getElementById('reportPreview'),
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

function switchRole(role) {
  state.role = role;
  elements.roleButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.role === role);
  });
  Object.keys(elements.views).forEach((viewKey) => {
    elements.views[viewKey].classList.toggle('hidden', viewKey !== role);
  });
  if (role === 'reporter') {
    setTimeout(() => state.reportsMap.invalidateSize(), 100);
  }
  if (role === 'investor') {
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
  const userMarker = L.marker(state.userLocation).addTo(state.reportsMap);
  userMarker.bindPopup('موقعك الحالي').openPopup();

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
      state.reportsMap.setView(state.userLocation, 11);
      L.marker(state.userLocation).addTo(state.reportsMap).bindPopup('موقعك الحالي').openPopup();
    },
    () => {
      elements.latitude.textContent = state.userLocation[0].toFixed(5);
      elements.longitude.textContent = state.userLocation[1].toFixed(5);
    }
  );
}

function setupReportForm() {
  const previewMessage = document.getElementById('previewMessage');

  document.getElementById('reportImage').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      previewMessage.innerHTML = `<img src="${reader.result}" alt="معاينة التقرير" class="preview-image" />`;
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
    previewMessage.innerHTML = `تم إنشاء البلاغ بنجاح بتاريخ ${newReport.date}.<br>الوصف: ${description}`;
    elements.reportDescription.value = '';
  });
}

function showLoginAlert(message) {
  elements.loginAlert.textContent = message;
  elements.loginAlert.classList.remove('hidden');
}

function hideLoginAlert() {
  elements.loginAlert.classList.add('hidden');
}

function setCurrentUser(user) {
  state.currentUser = user;
  elements.currentUserText.textContent = `مرحباً، ${user.name}`;
  elements.currentUserText.classList.remove('hidden');
  localStorage.setItem('emaarUser', JSON.stringify(user));
}

function loadSession() {
  const stored = localStorage.getItem('emaarUser');
  if (!stored) return false;
  try {
    const user = JSON.parse(stored);
    const validUser = state.users.find((item) => item.username === user.username && item.role === user.role);
    if (validUser) {
      setCurrentUser(validUser);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function applyUserRoleAccess() {
  elements.roleButtons.forEach((btn) => {
    if (btn.dataset.role === 'dashboard' || btn.dataset.role === state.currentUser.role) {
      btn.classList.remove('hidden');
    } else {
      btn.classList.add('hidden');
    }
  });
}

function hideAuthOverlay() {
  elements.authOverlay.classList.add('hidden');
  elements.logoutButton.classList.remove('hidden');
}

function showAuthOverlay() {
  elements.authOverlay.classList.remove('hidden');
  elements.logoutButton.classList.add('hidden');
  elements.currentUserText.classList.add('hidden');
  elements.roleButtons.forEach((btn) => btn.classList.remove('hidden'));
  switchRole('dashboard');
}

function handleLogin(event) {
  event.preventDefault();
  hideLoginAlert();
  const username = elements.loginUsername.value.trim();
  const password = elements.loginPassword.value;
  const user = state.users.find((item) => item.username === username && item.password === password);
  if (!user) {
    showLoginAlert('بيانات الدخول غير صحيحة، حاول مرة أخرى.');
    return;
  }
  setCurrentUser(user);
  applyUserRoleAccess();
  hideAuthOverlay();
  switchRole(user.role);
}

function handleLogout() {
  localStorage.removeItem('emaarUser');
  state.currentUser = null;
  elements.loginUsername.value = '';
  elements.loginPassword.value = '';
  hideLoginAlert();
  showAuthOverlay();
}

function initAuth() {
  const hasSession = loadSession();
  if (hasSession) {
    applyUserRoleAccess();
    switchRole(state.currentUser.role);
    hideAuthOverlay();
  } else {
    showAuthOverlay();
  }
  elements.loginForm.addEventListener('submit', handleLogin);
  elements.logoutButton.addEventListener('click', handleLogout);
}

function init() {
  initTheme();
  initMaps();
  updateDashboard();
  renderInvestorProjects();
  renderContractorProjects();
  loadUserLocation();
  setupReportForm();
  initAuth();

  elements.themeToggle.addEventListener('click', toggleTheme);
  elements.roleButtons.forEach((button) => {
    button.addEventListener('click', () => switchRole(button.dataset.role));
  });
}

window.addEventListener('DOMContentLoaded', init);

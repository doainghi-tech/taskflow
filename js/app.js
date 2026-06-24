// ============================================================
// APP SHELL - layout chính, điều hướng giữa các view
// ============================================================

const NAV_ITEMS = [
  { key: "dashboard", label: "Tổng quan", icon: "grid" },
  { key: "tasks", label: "Task của thành viên", icon: "list" },
  { key: "assignment", label: "Phân công", icon: "folder" },
  { key: "calendar", label: "Lịch", icon: "calendar" },
  { key: "extensions", label: "Gia hạn chờ duyệt", icon: "clock", adminOnly: true },
  { key: "members", label: "Thành viên", icon: "users", adminOnly: true },
];

const ICONS = {
  grid: '<svg xmlns="http://www.w3.org/2000/svg" class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  list: '<svg xmlns="http://www.w3.org/2000/svg" class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1.2" fill="currentColor"/><circle cx="4" cy="12" r="1.2" fill="currentColor"/><circle cx="4" cy="18" r="1.2" fill="currentColor"/></svg>',
  folder: '<svg xmlns="http://www.w3.org/2000/svg" class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg>',
  calendar: '<svg xmlns="http://www.w3.org/2000/svg" class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg>',
  clock: '<svg xmlns="http://www.w3.org/2000/svg" class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  users: '<svg xmlns="http://www.w3.org/2000/svg" class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6"/><circle cx="17.5" cy="9" r="2.6"/><path d="M15.5 14a5.6 5.6 0 0 1 5.8 6"/></svg>',
};

let currentView = "dashboard";

async function bootApp() {
  await loadAllData();
  renderShell();
  navigateTo("dashboard");
}

function isAdmin() {
  return store.currentUser && store.currentUser.role === "admin";
}

function pendingExtensionCount() {
  return store.extensionRequests.filter((r) => r.status === "pending").length;
}

function renderShell() {
  const root = document.getElementById("app-root");
  root.innerHTML = `
    <div class="flex h-screen bg-slate-50 text-slate-800">
      <aside class="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div class="px-5 py-5 flex items-center gap-2 border-b border-slate-100">
          <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-sm flex items-center justify-center">TF</div>
          <span class="font-semibold text-slate-800">TaskFlow</span>
        </div>
        <nav id="nav-list" class="flex-1 px-3 py-4 space-y-1"></nav>
        <div class="px-3 py-4 border-t border-slate-100">
          <div class="flex items-center gap-2.5 px-2">
            <div class="w-8 h-8 rounded-full ${avatarColor(store.currentUser.id)} text-white text-xs font-semibold flex items-center justify-center shrink-0">
              ${initials(store.currentUser.name)}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-700 truncate">${escapeHtml(store.currentUser.name)}</p>
              <p class="text-xs text-slate-400">${store.currentUser.role === "admin" ? "Quản lý" : "Thành viên"}</p>
            </div>
            <button onclick="logout()" title="Đăng xuất" class="text-slate-400 hover:text-rose-500 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </aside>
      <main class="flex-1 overflow-y-auto">
        <div id="view-root" class="max-w-6xl mx-auto px-6 py-6"></div>
      </main>
    </div>
    <div id="toast-wrap" class="fixed bottom-5 right-5 z-50 flex flex-col items-end"></div>
    <div id="modal-root"></div>
  `;
  renderNav();
}

function renderNav() {
  const navList = document.getElementById("nav-list");
  navList.innerHTML = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin())
    .map((item) => {
      const active = item.key === currentView;
      const badge =
        item.key === "extensions" && pendingExtensionCount() > 0
          ? `<span class="ml-auto text-[11px] bg-rose-500 text-white rounded-full px-1.5 py-0.5 leading-none">${pendingExtensionCount()}</span>`
          : "";
      return `
        <button data-view="${item.key}" onclick="navigateTo('${item.key}')"
          class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition
            ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}">
          <span class="${active ? "text-indigo-600" : "text-slate-400"}">${ICONS[item.icon]}</span>
          <span>${item.label}</span>
          ${badge}
        </button>`;
    })
    .join("");
}

const VIEW_RENDERERS = {
  dashboard: renderDashboardView,
  tasks: renderTasksView,
  assignment: renderAssignmentView,
  calendar: renderCalendarView,
  extensions: renderExtensionsView,
  members: renderMembersView,
};

function navigateTo(viewKey, params) {
  currentView = viewKey;
  renderNav();
  const fn = VIEW_RENDERERS[viewKey];
  const container = document.getElementById("view-root");
  if (fn) fn(container, params);
}

async function refreshAndRerender() {
  await loadAllData();
  renderNav();
  navigateTo(currentView);
}

// ---------- INIT ----------
window.addEventListener("DOMContentLoaded", async () => {
  renderLoginScreen();
  const restored = await restoreSession();
  if (restored) {
    try {
      await bootApp();
    } catch (err) {
      console.error(err);
      toast("Lỗi kết nối Google Sheet. Kiểm tra APPS_SCRIPT_URL trong js/config.js", "error");
    }
  }
});

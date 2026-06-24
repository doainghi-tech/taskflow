// ============================================================
// DASHBOARD VIEW
// ============================================================

function renderDashboardView(container) {
  const tasks = store.tasks;
  const total = tasks.length;
  const doing = tasks.filter((t) => t.status === "doing").length;
  const done = tasks.filter((t) => t.status === "done").length;
  const overdue = tasks.filter(isOverdue).length;
  const dueToday = tasks.filter(isDueToday).length;

  const activeMembers = store.members.filter((m) => m.is_active !== false);

  const memberRows = activeMembers
    .map((m) => {
      const mine = tasksForMember(m.id);
      const mineActive = mine.filter((t) => !["done", "cancelled"].includes(t.status));
      const mineOverdue = mine.filter(isOverdue);
      const mineDone = mine.filter((t) => t.status === "done").length;
      const overdueLogCount = overdueLogCountForMember(m.id);
      return { m, total: mine.length, active: mineActive.length, overdue: mineOverdue.length, done: mineDone, overdueLogCount };
    })
    .sort((a, b) => b.overdue - a.overdue || b.active - a.active);

  container.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-lg font-semibold text-slate-800">Tổng quan</h1>
        <p class="text-sm text-slate-500">Hôm nay, ${formatDateVN(todayStr())}</p>
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      ${statCard("Tổng task", total, "text-slate-700", "bg-slate-100")}
      ${statCard("Hạn hôm nay", dueToday, "text-sky-700", "bg-sky-50")}
      ${statCard("Đang làm", doing, "text-amber-700", "bg-amber-50")}
      ${statCard("Hoàn thành", done, "text-emerald-700", "bg-emerald-50")}
      ${statCard("Đang trễ hạn", overdue, "text-rose-700", "bg-rose-50")}
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 class="font-medium text-slate-800">Tiến độ theo thành viên</h2>
        <span class="text-xs text-slate-400">Sắp xếp theo số task đang trễ</span>
      </div>
      <table class="w-full text-sm">
        <thead>
          <tr class="text-xs text-slate-400 border-b border-slate-100">
            <th class="text-left font-medium px-5 py-2.5">Thành viên</th>
            <th class="text-right font-medium px-3 py-2.5">Tổng task</th>
            <th class="text-right font-medium px-3 py-2.5">Đang xử lý</th>
            <th class="text-right font-medium px-3 py-2.5">Hoàn thành</th>
            <th class="text-right font-medium px-3 py-2.5">Đang trễ</th>
            <th class="text-right font-medium px-5 py-2.5">Từng trễ (lịch sử)</th>
          </tr>
        </thead>
        <tbody>
          ${memberRows
            .map(
              (r) => `
            <tr class="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onclick="navigateTo('tasks', {memberId:'${r.m.id}'})">
              <td class="px-5 py-3">
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-full ${avatarColor(r.m.id)} text-white text-xs font-semibold flex items-center justify-center">${initials(r.m.name)}</div>
                  <span class="font-medium text-slate-700">${escapeHtml(r.m.name)}</span>
                </div>
              </td>
              <td class="text-right px-3 py-3 text-slate-500">${r.total}</td>
              <td class="text-right px-3 py-3 text-slate-500">${r.active}</td>
              <td class="text-right px-3 py-3 text-emerald-600">${r.done}</td>
              <td class="text-right px-3 py-3 font-semibold ${r.overdue > 0 ? "text-rose-600" : "text-slate-300"}">${r.overdue}</td>
              <td class="text-right px-5 py-3 text-slate-400">${r.overdueLogCount}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
      ${!memberRows.length ? `<p class="text-center text-sm text-slate-400 py-8">Chưa có thành viên nào.</p>` : ""}
    </div>
  `;
}

function statCard(label, value, textColor, bg) {
  return `
    <div class="rounded-2xl border border-slate-200 ${bg} px-4 py-3.5">
      <p class="text-xs text-slate-500 mb-1">${label}</p>
      <p class="text-2xl font-semibold ${textColor}">${value}</p>
    </div>`;
}

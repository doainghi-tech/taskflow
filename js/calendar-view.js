// ============================================================
// CALENDAR VIEW - lịch tháng, kéo thả task để dời hạn
// ============================================================

let calendarState = { monthDate: todayStr(), memberId: "me" };

function renderCalendarView(container) {
  if (calendarState.memberId === "me") calendarState.memberId = store.currentUser.id;
  const activeMembers = store.members.filter((m) => m.is_active !== false);

  const [y, m] = calendarState.monthDate.split("-").map(Number);
  const firstOfMonth = new Date(y, m - 1, 1);
  const monthLabel = firstOfMonth.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  const gridStart = new Date(firstOfMonth);
  const startDow = gridStart.getDay() === 0 ? 7 : gridStart.getDay();
  gridStart.setDate(gridStart.getDate() - (startDow - 1));

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }

  const visibleTasks =
    calendarState.memberId === "all" ? store.tasks.filter((t) => t.status !== "cancelled") : tasksForMember(calendarState.memberId).filter((t) => t.status !== "cancelled");

  container.innerHTML = `
    <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
      <h1 class="text-lg font-semibold text-slate-800">Lịch</h1>
      <div class="flex items-center gap-2">
        <select id="calendar-member-select" class="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="${store.currentUser.id}" ${calendarState.memberId === store.currentUser.id ? "selected" : ""}>Của tôi</option>
          <option value="all" ${calendarState.memberId === "all" ? "selected" : ""}>Tất cả mọi người</option>
          ${activeMembers
            .filter((m) => m.id !== store.currentUser.id)
            .map((m) => `<option value="${m.id}" ${calendarState.memberId === m.id ? "selected" : ""}>${escapeHtml(m.name)}</option>`)
            .join("")}
        </select>
        <button onclick="calendarShiftMonth(-1)" class="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center">‹</button>
        <span class="text-sm font-medium text-slate-700 w-32 text-center capitalize">${monthLabel}</span>
        <button onclick="calendarShiftMonth(1)" class="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center">›</button>
      </div>
    </div>

    <div class="grid grid-cols-7 text-xs font-medium text-slate-400 mb-1.5 px-1">
      ${["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => `<div class="text-center py-1">${d}</div>`).join("")}
    </div>
    <div class="grid grid-cols-7 gap-1.5">
      ${cells.map((d) => calendarCellHtml(d, m, visibleTasks)).join("")}
    </div>
  `;

  document.getElementById("calendar-member-select").addEventListener("change", (e) => {
    calendarState.memberId = e.target.value;
    renderCalendarView(container);
  });
}

function calendarCellHtml(d, currentMonth, visibleTasks) {
  const dateStr = dateToStr(d);
  const inMonth = d.getMonth() + 1 === currentMonth;
  const isToday = dateStr === todayStr();
  const dayTasks = visibleTasks.filter((t) => t.due_date === dateStr);

  return `
    <div class="min-h-[92px] rounded-lg border ${isToday ? "border-indigo-400" : "border-slate-200"} ${inMonth ? "bg-white" : "bg-slate-50/60"} p-1.5"
      ondragover="event.preventDefault(); this.classList.add('ring-2','ring-indigo-300')"
      ondragleave="this.classList.remove('ring-2','ring-indigo-300')"
      ondrop="onCalendarDrop(event, '${dateStr}')">
      <div class="text-[11px] font-medium mb-1 ${inMonth ? "text-slate-500" : "text-slate-300"} ${isToday ? "text-indigo-600" : ""}">${d.getDate()}</div>
      <div class="space-y-1">
        ${dayTasks
          .slice(0, 3)
          .map(
            (t) => `
          <div draggable="true" ondragstart="onCalendarDragStart(event, '${t.id}')"
            class="text-[11px] px-1.5 py-1 rounded cursor-grab leading-tight ${isOverdue(t) ? "bg-rose-100 text-rose-700" : STATUS_COLOR[t.status]} truncate"
            title="${escapeHtml(t.title)}">
            ${escapeHtml(t.title)}
          </div>`
          )
          .join("")}
        ${dayTasks.length > 3 ? `<div class="text-[10px] text-slate-400 px-1">+${dayTasks.length - 3} khác</div>` : ""}
      </div>
    </div>`;
}

function calendarShiftMonth(delta) {
  const [y, m] = calendarState.monthDate.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  calendarState.monthDate = dateToStr(d);
  navigateTo("calendar");
}

function onCalendarDragStart(e, taskId) {
  e.dataTransfer.setData("text/task-id", taskId);
}

async function onCalendarDrop(e, dateStr) {
  e.preventDefault();
  e.currentTarget.classList.remove("ring-2", "ring-indigo-300");
  const taskId = e.dataTransfer.getData("text/task-id");
  if (!taskId) return;
  try {
    await apiUpdateTask(taskId, { due_date: dateStr, is_overdue_recorded: false });
    toast("Đã dời hạn task", "success");
    await refreshAndRerender();
  } catch (err) {
    toast("Không thể dời hạn task", "error");
  }
}

// ============================================================
// TASKS VIEW - task chi tiết theo từng thành viên
// ============================================================

let tasksViewState = { memberId: null, filter: "today" };

const TASK_FILTERS = [
  { key: "today", label: "Hạn hôm nay", fn: isDueToday },
  { key: "tomorrow", label: "Hạn ngày mai", fn: isDueTomorrow },
  { key: "week", label: "Tuần này", fn: isDueThisWeek },
  { key: "overdue", label: "Quá hạn", fn: isOverdue },
  { key: "all", label: "Tất cả", fn: () => true },
];

function renderTasksView(container, params) {
  const activeMembers = store.members.filter((m) => m.is_active !== false);
  if (params && params.memberId) tasksViewState.memberId = params.memberId;
  if (!tasksViewState.memberId) {
    tasksViewState.memberId = isAdmin() ? activeMembers[0]?.id : store.currentUser.id;
  }
  const memberId = tasksViewState.memberId;

  const allMemberTasks = tasksForMember(memberId).filter((t) => t.status !== "cancelled");
  const filterFn = TASK_FILTERS.find((f) => f.key === tasksViewState.filter).fn;
  const filtered = allMemberTasks.filter(filterFn).sort((a, b) => a.due_date.localeCompare(b.due_date));

  container.innerHTML = `
    <div class="flex items-center justify-between mb-5">
      <h1 class="text-lg font-semibold text-slate-800">Task của thành viên</h1>
      <select id="member-select" class="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        ${activeMembers.map((m) => `<option value="${m.id}" ${m.id === memberId ? "selected" : ""}>${escapeHtml(m.name)}</option>`).join("")}
      </select>
    </div>

    <div class="flex gap-1.5 mb-5 flex-wrap">
      ${TASK_FILTERS.map((f) => {
        const count = allMemberTasks.filter(f.fn).length;
        const active = f.key === tasksViewState.filter;
        return `<button onclick="setTaskFilter('${f.key}')"
          class="px-3.5 py-1.5 rounded-full text-sm font-medium transition
            ${active ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}">
          ${f.label} ${count ? `<span class="opacity-70">(${count})</span>` : ""}
        </button>`;
      }).join("")}
    </div>

    <div class="space-y-2.5" id="task-list">
      ${filtered.length ? filtered.map((t) => taskRowHtml(t)).join("") : emptyState()}
    </div>
  `;

  document.getElementById("member-select").addEventListener("change", (e) => {
    tasksViewState.memberId = e.target.value;
    renderTasksView(container);
  });
}

function setTaskFilter(key) {
  tasksViewState.filter = key;
  navigateTo("tasks");
}

function emptyState() {
  return `<div class="text-center py-16 text-slate-400 text-sm">Không có task nào trong mục này.</div>`;
}

function taskRowHtml(t) {
  const project = getProject(t.project_id);
  const overdue = isOverdue(t);
  const noteCount = store.notes.filter((n) => n.task_id === t.id).length;
  const pendingExt = store.extensionRequests.find((r) => r.task_id === t.id && r.status === "pending");
  const recurringTag = t.task_type === "dinh_ky" ? `<span class="text-[11px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 font-medium">Định kỳ</span>` : "";

  return `
    <div class="bg-white rounded-xl border ${overdue ? "border-rose-200" : "border-slate-200"} px-4 py-3.5">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <span class="text-xs font-medium text-indigo-500">${escapeHtml(project ? project.name : "Không có dự án")}</span>
            ${recurringTag}
            ${overdue ? `<span class="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 font-medium">Trễ hạn</span>` : ""}
          </div>
          <p class="font-medium text-slate-800">${escapeHtml(t.title)}</p>
          ${t.description ? `<p class="text-sm text-slate-500 mt-0.5">${escapeHtml(t.description)}</p>` : ""}
          <div class="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
            <span class="${overdue ? "text-rose-600 font-medium" : ""}">Hạn: ${formatDateVN(t.due_date)}</span>
            <span>Chính: ${escapeHtml(memberName(t.main_assignee_id))}</span>
            ${t.support_assignee_ids?.length ? `<span>Hỗ trợ: ${t.support_assignee_ids.map(memberName).map(escapeHtml).join(", ")}</span>` : ""}
            ${pendingExt ? `<span class="text-amber-600 font-medium">Đã gửi yêu cầu gia hạn → ${formatDateVN(pendingExt.new_due_date)} (chờ duyệt)</span>` : ""}
          </div>
        </div>
        <div class="flex flex-col items-end gap-2 shrink-0">
          <select onchange="quickChangeStatus('${t.id}', this.value)" class="text-xs font-medium border rounded-full px-2.5 py-1 ${STATUS_COLOR[t.status]} border-transparent">
            ${Object.keys(STATUS_LABEL)
              .map((s) => `<option value="${s}" ${s === t.status ? "selected" : ""}>${STATUS_LABEL[s]}</option>`)
              .join("")}
          </select>
          <div class="flex gap-1.5">
            <button onclick="openNotesModal('${t.id}')" class="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1">
              Ghi chú${noteCount ? ` (${noteCount})` : ""}
            </button>
            ${
              !["done", "cancelled"].includes(t.status) && !pendingExt
                ? `<button onclick="openExtensionModal('${t.id}')" class="text-xs px-2.5 py-1 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50">Gia hạn</button>`
                : ""
            }
          </div>
        </div>
      </div>
    </div>`;
}

async function quickChangeStatus(taskId, status) {
  try {
    const payload = { status };
    if (status === "done") payload.completed_at = new Date().toISOString();
    await apiUpdateTask(taskId, payload);
    toast("Đã cập nhật trạng thái", "success");
    await refreshAndRerender();
  } catch (err) {
    toast("Không thể cập nhật trạng thái", "error");
  }
}

// ---------- GHI CHÚ ----------
function openNotesModal(taskId) {
  const task = store.tasks.find((t) => t.id === taskId);
  const notes = store.notes.filter((n) => n.task_id === taskId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  openModal(`
    <div class="p-5">
      <h3 class="font-semibold text-slate-800 mb-1">${escapeHtml(task.title)}</h3>
      <p class="text-xs text-slate-400 mb-4">Ghi chú công việc</p>
      <div class="space-y-3 max-h-64 overflow-y-auto mb-4 pr-1">
        ${
          notes.length
            ? notes
                .map(
                  (n) => `
            <div class="bg-slate-50 rounded-lg px-3 py-2.5">
              <p class="text-sm text-slate-700">${escapeHtml(n.content)}</p>
              <p class="text-[11px] text-slate-400 mt-1">${escapeHtml(memberName(n.member_id))} · ${new Date(n.created_at).toLocaleString("vi-VN")}</p>
            </div>`
                )
                .join("")
            : `<p class="text-sm text-slate-400 text-center py-4">Chưa có ghi chú nào.</p>`
        }
      </div>
      <div class="flex gap-2">
        <input id="note-input" type="text" placeholder="Thêm ghi chú..." class="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <button onclick="submitNote('${taskId}')" class="px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Gửi</button>
      </div>
    </div>`);
  document.getElementById("note-input").focus();
  document.getElementById("note-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitNote(taskId);
  });
}

async function submitNote(taskId) {
  const input = document.getElementById("note-input");
  const content = input.value.trim();
  if (!content) return;
  try {
    await apiCreateNote({ task_id: taskId, member_id: store.currentUser.id, content });
    await loadAllData();
    toast("Đã thêm ghi chú", "success");
    openNotesModal(taskId);
    navigateTo(currentView);
  } catch (err) {
    toast("Không thể thêm ghi chú", "error");
  }
}

// ---------- GIA HẠN ----------
function openExtensionModal(taskId) {
  const task = store.tasks.find((t) => t.id === taskId);
  openModal(`
    <div class="p-5">
      <h3 class="font-semibold text-slate-800 mb-1">Yêu cầu gia hạn</h3>
      <p class="text-xs text-slate-400 mb-4">${escapeHtml(task.title)} · Hạn hiện tại: ${formatDateVN(task.due_date)}</p>
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Hạn mới đề xuất</label>
          <input id="ext-new-date" type="date" min="${task.due_date}" value="${addDaysStr(task.due_date, 1)}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Lý do</label>
          <textarea id="ext-reason" rows="3" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Vì sao cần gia hạn?"></textarea>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-5">
        <button onclick="closeModal()" class="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Hủy</button>
        <button onclick="submitExtensionRequest('${taskId}')" class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700">Gửi yêu cầu</button>
      </div>
    </div>`);
}

async function submitExtensionRequest(taskId) {
  const task = store.tasks.find((t) => t.id === taskId);
  const newDate = document.getElementById("ext-new-date").value;
  const reason = document.getElementById("ext-reason").value.trim();
  if (!newDate) return toast("Chọn hạn mới", "error");
  try {
    await apiCreateExtensionRequest({
      task_id: taskId,
      requested_by: store.currentUser.id,
      old_due_date: task.due_date,
      new_due_date: newDate,
      reason,
      status: "pending",
    });
    closeModal();
    toast("Đã gửi yêu cầu gia hạn đến quản lý", "success");
    await refreshAndRerender();
  } catch (err) {
    toast("Không thể gửi yêu cầu", "error");
  }
}

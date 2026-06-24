// ============================================================
// STORE - state toàn cục + logic nghiệp vụ (định kỳ, trễ hạn)
// ============================================================

const store = {
  currentUser: null,
  members: [],
  projects: [],
  tasks: [],
  notes: [],
  extensionRequests: [],
  overdueLogs: [],
};

function getMember(id) {
  return store.members.find((m) => m.id === id);
}
function getProject(id) {
  return store.projects.find((p) => p.id === id);
}
function memberName(id) {
  const m = getMember(id);
  return m ? m.name : "—";
}

async function loadAllData() {
  // 1 lần gọi duy nhất tới Apps Script, lấy về toàn bộ dữ liệu từ Google Sheet
  const bundle = await apiGetAllData();
  store.members = bundle.members;
  store.projects = bundle.projects;
  store.tasks = bundle.tasks;
  store.notes = bundle.notes;
  store.extensionRequests = bundle.extensionRequests;
  store.overdueLogs = bundle.overdueLogs;

  await generateUpcomingRecurringOccurrences();
  await recordNewOverdueTasks();
}

// ---------- SINH TASK ĐỊNH KỲ TIẾP THEO ----------
// Với mỗi task mẫu định kỳ (parent_recurring_id null, task_type = 'dinh_ky'),
// đảm bảo luôn có sẵn các occurrence cho tới 2 kỳ kế tiếp tính từ hôm nay.
function nextDueDate(rule, fromDate) {
  if (rule.type === "daily") return addDaysStr(fromDate, rule.interval || 1);
  if (rule.type === "weekly") return addDaysStr(fromDate, 7 * (rule.interval || 1));
  if (rule.type === "monthly") return addMonthsStr(fromDate, rule.interval || 1);
  return addDaysStr(fromDate, 7);
}

async function generateUpcomingRecurringOccurrences() {
  const templates = store.tasks.filter((t) => t.task_type === "dinh_ky" && !t.parent_recurring_id);
  const toInsert = [];
  for (const tpl of templates) {
    const occurrences = store.tasks.filter((t) => t.parent_recurring_id === tpl.id);
    let lastDue = occurrences.length ? occurrences.reduce((max, o) => (o.due_date > max ? o.due_date : max), tpl.due_date) : tpl.due_date;
    const horizon = addDaysStr(todayStr(), 21); // sinh trước 3 tuần
    let safety = 0;
    while (lastDue < horizon && safety < 20) {
      const next = nextDueDate(tpl.recurrence_rule || { type: "weekly", interval: 1 }, lastDue);
      toInsert.push({
        project_id: tpl.project_id,
        title: tpl.title,
        description: tpl.description,
        task_type: "dinh_ky",
        recurrence_rule: tpl.recurrence_rule,
        parent_recurring_id: tpl.id,
        main_assignee_id: tpl.main_assignee_id,
        support_assignee_ids: tpl.support_assignee_ids,
        due_date: next,
        status: "todo",
        created_by: tpl.created_by,
      });
      lastDue = next;
      safety++;
    }
  }
  if (toInsert.length) {
    const created = await apiCreateTasks(toInsert);
    store.tasks.push(...created);
  }
}

// ---------- GHI NHẬN TASK MỚI BỊ TRỄ ----------
async function recordNewOverdueTasks() {
  const newlyOverdue = store.tasks.filter((t) => isOverdue(t) && !t.is_overdue_recorded);
  if (!newlyOverdue.length) return;
  const logs = newlyOverdue.map((t) => ({
    task_id: t.id,
    member_id: t.main_assignee_id,
    due_date: t.due_date,
  }));
  const createdLogs = await apiCreateOverdueLogs(logs);
  store.overdueLogs.push(...createdLogs);
  for (const t of newlyOverdue) {
    await apiUpdateTask(t.id, { is_overdue_recorded: true });
    t.is_overdue_recorded = true;
  }
}

function tasksForMember(memberId) {
  return store.tasks.filter((t) => t.main_assignee_id === memberId || (t.support_assignee_ids || []).includes(memberId));
}

function overdueCountForMember(memberId) {
  return tasksForMember(memberId).filter(isOverdue).length;
}

function overdueLogCountForMember(memberId) {
  return store.overdueLogs.filter((l) => l.member_id === memberId).length;
}

const menus = {
  student: [
    ["overview", "Overview"], ["resources", "Notes & Videos"],
    ["assignments", "Assignments & CATs"], ["grades", "My Grades"], ["enroll", "Subject Registration"]
  ],
  teacher: [
    ["overview", "Overview"], ["resources", "Upload Resources"],
    ["assignments", "Assignment Builder"], ["grading", "Grading Console"], ["blog", "Blog Author"]
  ],
  admin: [
    ["overview", "System Overview"], ["users", "User Management"],
    ["academics", "Academic Setup"], ["reports", "Reports"], ["settings", "Site Settings"]
  ]
};

let profile = null;

async function initDashboard() {
  profile = await getProfile();
  if (!profile) return location.href = "login.html";
  document.getElementById("userBadge").textContent = `${profile.full_name || profile.email} • ${profile.role}`;
  document.getElementById("roleTitle").textContent = `${profile.role[0].toUpperCase()}${profile.role.slice(1)} Portal`;
  document.getElementById("sideNav").innerHTML = menus[profile.role].map(([id, label], i) =>
    `<a href="#" data-tab="${id}" class="${i === 0 ? "active" : ""}">${label}</a>`).join("");
  document.querySelectorAll("#sideNav a").forEach(a => a.addEventListener("click", e => {
    e.preventDefault();
    document.querySelectorAll("#sideNav a").forEach(x => x.classList.remove("active"));
    a.classList.add("active");
    renderTab(a.dataset.tab);
  }));
  renderTab("overview");
}

function setContent(html) {
  document.getElementById("dashboardContent").innerHTML = html;
}

async function renderTab(tab) {
  if (profile.role === "student") return renderStudent(tab);
  if (profile.role === "teacher") return renderTeacher(tab);
  if (profile.role === "admin") return renderAdmin(tab);
  setContent(`<div class="card"><h2>Guest access</h2><p class="muted">Please register or contact the administrator for full access.</p></div>`);
}

async function renderStudent(tab) {
  if (tab === "overview") {
    const [{ count: subjects }, { count: pending }, { count: graded }] = await Promise.all([
      sb.from("student_subject_enrollments").select("*", { count: "exact", head: true }).eq("student_id", profile.id),
      sb.from("submissions").select("*", { count: "exact", head: true }).eq("student_id", profile.id).eq("status", "pending"),
      sb.from("submissions").select("*", { count: "exact", head: true }).eq("student_id", profile.id).eq("status", "graded")
    ]);
    setContent(`<h1>Welcome, ${escapeHtml(profile.full_name || "Student")}</h1>
      <div class="stat-grid">
        <div class="stat"><strong>${subjects ?? 0}</strong><span>Enrolled subjects</span></div>
        <div class="stat"><strong>${pending ?? 0}</strong><span>Pending submissions</span></div>
        <div class="stat"><strong>${graded ?? 0}</strong><span>Graded submissions</span></div>
      </div>
      <div class="card"><h3>Quick actions</h3><p class="muted">Open resources, submit assignments and monitor your academic progress.</p></div>`);
  }

  if (tab === "resources") {
    const { data } = await sb.from("resources").select("*, subjects(name)").order("created_at", { ascending: false });
    setContent(`<h1>Notes & Videos</h1><div class="grid grid-3">${(data || []).map(r => `
      <div class="card"><h3>${escapeHtml(r.title)}</h3><p class="muted">${escapeHtml(r.description)}</p>
      <a class="btn btn-primary btn-sm" href="${r.file_url}" target="_blank">Open</a></div>`).join("") || '<div class="card empty">No resources available.</div>'}</div>`);
  }

  if (tab === "assignments") {
    const { data } = await sb.from("assignments_cats").select("*").order("due_date");
    setContent(`<h1>Assignments & CATs</h1><div class="grid grid-2">${(data || []).map(a => `
      <form class="card" data-id="${a.id}">
        <span class="pill" style="background:#eef2ff;color:#4338ca">${a.type}</span>
        <h3>${escapeHtml(a.title)}</h3><p class="muted">${escapeHtml(a.description)}</p>
        <p class="muted" style="font-size:.82rem">${a.max_score} marks • Due ${formatDate(a.due_date)}</p>
        <label>Your answer<textarea name="submission_text" required></textarea></label>
        <label>Attachment URL<input name="attachment_url" type="url"></label>
        <button class="btn btn-primary btn-sm">Submit work</button>
      </form>`).join("") || '<div class="card empty">No assessments published.</div>'}</div>`);

    document.querySelectorAll("form[data-id]").forEach(form => form.addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(form);
      const { error } = await sb.from("submissions").upsert({
        assignment_id: form.dataset.id, student_id: profile.id,
        submission_text: fd.get("submission_text"), attachment_url: fd.get("attachment_url"),
        status: "pending", submitted_at: new Date().toISOString()
      }, { onConflict: "assignment_id,student_id" });
      if (error) return showToast(error.message, "error");
      showToast("Submission sent successfully.");
      form.reset();
    }));
  }

  if (tab === "grades") {
    const { data } = await sb.from("submissions").select("*, assignments_cats(title,type,max_score)").eq("student_id", profile.id);
    const rows = data || [];
    setContent(`<h1>My Gradebook</h1><div class="table-wrap"><table><thead><tr><th>Assessment</th><th>Type</th><th>Score</th><th>Status</th><th>Feedback</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${escapeHtml(r.assignments_cats?.title || "")}</td><td>${r.assignments_cats?.type || ""}</td>
      <td>${r.score ?? "—"}/${r.assignments_cats?.max_score ?? ""}</td><td>${r.status}</td><td>${escapeHtml(r.teacher_feedback || "—")}</td></tr>`).join("")}
      </tbody></table></div>`);
  }

  if (tab === "enroll") {
    const [{ data: subjects }, { data: enrolled }] = await Promise.all([
      sb.from("subjects").select("*, classes(name)"),
      sb.from("student_subject_enrollments").select("subject_id").eq("student_id", profile.id)
    ]);
    const ids = (enrolled || []).map(e => e.subject_id);
    setContent(`<h1>Subject Registration</h1>
      <form class="card" id="enrollForm"><label>Choose subject
      <select name="subject_id"><option value="">Select subject</option>
      ${subjects.map(s => `<option value="${s.id}">${escapeHtml(s.name)} — ${escapeHtml(s.classes?.name || "")}</option>`).join("")}
      </select></label><button class="btn btn-primary">Enroll</button></form>
      <div class="grid grid-2" style="margin-top:20px">
      ${subjects.filter(s => ids.includes(s.id)).map(s => `<div class="card"><strong>${escapeHtml(s.name)}</strong><p class="muted">${escapeHtml(s.classes?.name || "")}</p></div>`).join("")}
      </div>`);
    document.getElementById("enrollForm").addEventListener("submit", async e => {
      e.preventDefault();
      const subjectId = new FormData(e.currentTarget).get("subject_id");
      if (!subjectId) return;
      const { error } = await sb.from("student_subject_enrollments").insert({ student_id: profile.id, subject_id: subjectId });
      if (error) return showToast(error.message, "error");
      showToast("Subject enrolled.");
      renderTab("enroll");
    });
  }
}

async function renderTeacher(tab) {
  if (tab === "overview") setContent(`<h1>Teacher Dashboard</h1><div class="card"><h3>Teaching workflow</h3><p class="muted">Upload learning resources, create assessments, grade submissions and publish blog articles.</p></div>`);

  if (tab === "resources") {
    const { data: subjects } = await sb.from("subjects").select("*, classes(name)");
    setContent(`<h1>Upload Resources</h1><form class="card" id="resourceForm">
      <label>Title<input name="title" required></label>
      <label>Description<textarea name="description" required></textarea></label>
      <div class="grid grid-2"><label>Type<select name="type"><option value="notes_pdf">PDF Notes</option><option value="video_link">Video Link</option><option value="document">Document</option></select></label>
      <label>Subject<select name="subject_id">${subjects.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("")}</select></label></div>
      <label>File or video URL<input name="file_url" type="url" required></label>
      <button class="btn btn-primary">Publish resource</button></form>`);
    document.getElementById("resourceForm").addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const { error } = await sb.from("resources").insert({
        title: fd.get("title"), description: fd.get("description"), type: fd.get("type"),
        file_url: fd.get("file_url"), subject_id: fd.get("subject_id"), uploaded_by: profile.id
      });
      if (error) return showToast(error.message, "error");
      showToast("Resource published.");
      e.currentTarget.reset();
    });
  }

  if (tab === "assignments") {
    const { data: subjects } = await sb.from("subjects").select("*, classes(name)");
    setContent(`<h1>Assignment Builder</h1><form class="card" id="assessmentForm">
      <label>Title<input name="title" required></label>
      <label>Instructions / Questions<textarea name="description" required></textarea></label>
      <div class="grid grid-2">
      <label>Type<select name="type"><option>CAT</option><option>Assignment</option><option>Exam</option></select></label>
      <label>Subject<select name="subject_id">${subjects.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("")}</select></label>
      <label>Maximum score<input name="max_score" type="number" value="100" required></label>
      <label>Due date<input name="due_date" type="datetime-local" required></label></div>
      <button class="btn btn-primary">Create assessment</button></form>`);
    document.getElementById("assessmentForm").addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const { error } = await sb.from("assignments_cats").insert({
        title: fd.get("title"), description: fd.get("description"), type: fd.get("type"),
        subject_id: fd.get("subject_id"), max_score: Number(fd.get("max_score")),
        due_date: fd.get("due_date"), created_by: profile.id
      });
      if (error) return showToast(error.message, "error");
      showToast("Assessment created.");
      e.currentTarget.reset();
    });
  }

  if (tab === "grading") {
    const { data } = await sb.from("submissions").select("*, assignments_cats(title,max_score), profiles(full_name)").order("submitted_at", { ascending: false });
    setContent(`<h1>Grading Console</h1><div class="grid grid-2">${(data || []).map(s => `
      <form class="card" data-id="${s.id}">
        <strong>${escapeHtml(s.profiles?.full_name || "Student")}</strong>
        <p class="muted">${escapeHtml(s.assignments_cats?.title || "")} • ${s.assignments_cats?.max_score} marks</p>
        <p>${escapeHtml(s.submission_text || "")}</p>
        ${s.attachment_url ? `<a href="${s.attachment_url}" target="_blank" class="muted">View attachment</a>` : ""}
        <label>Score<input name="score" type="number" value="${s.score ?? ""}"></label>
        <label>Feedback<input name="feedback" value="${escapeHtml(s.teacher_feedback || "")}"></label>
        <button class="btn btn-primary btn-sm">Save grade</button>
      </form>`).join("") || '<div class="card empty">No submissions yet.</div>'}</div>`);
    document.querySelectorAll("form[data-id]").forEach(form => form.addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(form);
      const { error } = await sb.from("submissions").update({
        score: Number(fd.get("score")), teacher_feedback: fd.get("feedback"), status: "graded"
      }).eq("id", form.dataset.id);
      if (error) return showToast(error.message, "error");
      showToast("Submission graded.");
      renderTab("grading");
    }));
  }

  if (tab === "blog") {
    setContent(`<h1>Blog Author</h1><form class="card" id="blogForm">
      <label>Title<input name="title" required></label>
      <label>Category<input name="category"></label>
      <label>Content<textarea name="content" rows="10" required></textarea></label>
      <label>Status<select name="is_published"><option value="true">Publish</option><option value="false">Draft</option></select></label>
      <button class="btn btn-primary">Save post</button></form>`);
    document.getElementById("blogForm").addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const title = fd.get("title");
      const { error } = await sb.from("blogs").insert({
        title, slug: slugify(title) + "-" + Date.now().toString(36),
        content: fd.get("content"), category: fd.get("category"),
        author_id: profile.id, is_published: fd.get("is_published") === "true"
      });
      if (error) return showToast(error.message, "error");
      showToast("Blog post saved.");
      e.currentTarget.reset();
    });
  }
}

async function renderAdmin(tab) {
  if (tab === "overview") {
    const tables = ["profiles", "classes", "submissions", "resources"];
    const counts = await Promise.all(tables.map(t =>
      sb.from(t).select("*", { count: "exact", head: true })));
    setContent(`<h1>System Overview</h1><div class="stat-grid">
      <div class="stat"><strong>${counts[0].count ?? 0}</strong><span>Registered users</span></div>
      <div class="stat"><strong>${counts[1].count ?? 0}</strong><span>Active classes</span></div>
      <div class="stat"><strong>${counts[2].count ?? 0}</strong><span>Submissions</span></div>
      <div class="stat"><strong>${counts[3].count ?? 0}</strong><span>Resources</span></div></div>`);
  }

  if (tab === "users") {
    const { data } = await sb.from("profiles").select("*").order("created_at", { ascending: false });
    setContent(`<h1>User Management</h1><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>
      ${(data || []).map(u => `<tr><td>${escapeHtml(u.full_name)}</td><td>${escapeHtml(u.email)}</td>
      <td><select data-user="${u.id}"><option ${u.role === "guest" ? "selected" : ""}>guest</option><option ${u.role === "student" ? "selected" : ""}>student</option><option ${u.role === "teacher" ? "selected" : ""}>teacher</option><option ${u.role === "admin" ? "selected" : ""}>admin</option></select></td></tr>`).join("")}
      </tbody></table></div>`);
    document.querySelectorAll("select[data-user]").forEach(select => select.addEventListener("change", async () => {
      const { error } = await sb.from("profiles").update({ role: select.value }).eq("id", select.dataset.user);
      if (error) return showToast(error.message, "error");
      showToast("Role updated.");
    }));
  }

  if (tab === "academics") {
    const { data: classes } = await sb.from("classes").select("*");
    setContent(`<h1>Academic Setup</h1><div class="grid grid-2">
      <form class="card" id="classForm"><h3>Add class</h3>
      <label>Class name<input name="name" required></label>
      <label>Academic year<input name="academic_year" required></label>
      <button class="btn btn-primary btn-sm">Add class</button></form>
      <div class="card"><h3>Existing classes</h3>${(classes || []).map(c => `<p>• ${escapeHtml(c.name)} — ${escapeHtml(c.academic_year)}</p>`).join("")}</div></div>`);
    document.getElementById("classForm").addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const { error } = await sb.from("classes").insert({ name: fd.get("name"), academic_year: fd.get("academic_year") });
      if (error) return showToast(error.message, "error");
      showToast("Class added.");
      renderTab("academics");
    });
  }

  if (tab === "reports") {
    const { data } = await sb.from("submissions").select("score, assignments_cats(title,max_score), profiles(full_name)");
    const rows = (data || []).filter(r => r.score != null).sort((a, b) => b.score - a.score).slice(0, 20);
    setContent(`<h1>Reports</h1><div class="card"><div style="display:flex;justify-content:space-between"><h3>Merit list</h3>
      <button onclick="window.print()" class="btn btn-outline btn-sm">Print / Save PDF</button></div>
      <div class="table-wrap"><table><thead><tr><th>#</th><th>Student</th><th>Assessment</th><th>Score</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(r.profiles?.full_name || "")}</td><td>${escapeHtml(r.assignments_cats?.title || "")}</td><td>${r.score}/${r.assignments_cats?.max_score}</td></tr>`).join("")}
      </tbody></table></div></div>`);
  }

  if (tab === "settings") {
    const { data } = await sb.from("site_settings").select("*");
    const map = Object.fromEntries((data || []).map(s => [s.key, s.value]));
    setContent(`<h1>Site Settings</h1><form class="card" id="settingsForm">
      <label>Contact email<input name="contact_email" value="${escapeHtml(map.contact_email || CONTACT_EMAIL)}"></label>
      <label>WhatsApp number<input name="whatsapp_number" value="${escapeHtml(map.whatsapp_number || "+254741637904")}"></label>
      <label>Announcement<textarea name="announcement">${escapeHtml(map.announcement || "")}</textarea></label>
      <button class="btn btn-primary">Save settings</button></form>`);
    document.getElementById("settingsForm").addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const rows = [...fd.entries()].map(([key, value]) => ({ key, value: String(value) }));
      const { error } = await sb.from("site_settings").upsert(rows, { onConflict: "key" });
      if (error) return showToast(error.message, "error");
      showToast("Settings saved.");
    });
  }
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await sb.auth.signOut();
  location.href = "index.html";
});
initDashboard();

let allResources = [];
let allSubjects = [];
let allClasses = [];

async function loadCatalog() {
  const [res, sub, cls] = await Promise.all([
    sb.from("resources").select("*, subjects(name, class_id, classes(name))").order("created_at", { ascending: false }),
    sb.from("subjects").select("*, classes(name)"),
    sb.from("classes").select("*").order("name")
  ]);
  allResources = res.data || [];
  allSubjects = sub.data || [];
  allClasses = cls.data || [];

  document.getElementById("subjectFilter").innerHTML =
    `<option value="">All subjects</option>` +
    allSubjects.map(s => `<option value="${s.id}">${escapeHtml(s.name)} — ${escapeHtml(s.classes?.name || "")}</option>`).join("");

  document.getElementById("classChips").innerHTML =
    `<button class="chip active" data-class="">All classes</button>` +
    allClasses.map(c => `<button class="chip" data-class="${c.id}">${escapeHtml(c.name)}</button>`).join("");

  document.querySelectorAll("#classChips .chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#classChips .chip").forEach(x => x.classList.remove("active"));
      chip.classList.add("active");
      renderResources();
    });
  });

  renderResources();
}

function renderResources() {
  const q = document.getElementById("searchInput").value.toLowerCase();
  const subject = document.getElementById("subjectFilter").value;
  const type = document.getElementById("typeFilter").value;
  const activeClass = document.querySelector("#classChips .chip.active")?.dataset.class || "";

  const filtered = allResources.filter(r => {
    const matchQ = !q || (r.title + " " + r.description).toLowerCase().includes(q);
    const matchSubject = !subject || r.subject_id === subject;
    const matchType = !type || r.type === type;
    const matchClass = !activeClass || r.subjects?.class_id === activeClass;
    return matchQ && matchSubject && matchType && matchClass;
  });

  const grid = document.getElementById("resourceGrid");
  document.getElementById("emptyState").classList.toggle("hidden", filtered.length > 0);
  grid.innerHTML = filtered.map(r => `
    <div class="card feature">
      <span class="pill" style="background:#eef2ff;color:#4338ca">${escapeHtml(r.type.replace("_", " "))}</span>
      <h3>${escapeHtml(r.title)}</h3>
      <p>${escapeHtml(r.description)}</p>
      <p class="muted" style="font-size:.8rem">${escapeHtml(r.subjects?.name || "")}</p>
      <a class="btn btn-primary btn-sm" href="${r.file_url}" target="_blank">Open resource</a>
    </div>`).join("");
}

document.getElementById("resourceFilters").addEventListener("submit", e => {
  e.preventDefault();
  renderResources();
});
["searchInput","subjectFilter","typeFilter"].forEach(id => {
  document.getElementById(id).addEventListener("input", renderResources);
  document.getElementById(id).addEventListener("change", renderResources);
});
loadCatalog();

let posts = [];
async function loadBlogs() {
  const { data } = await sb.from("blogs").select("*").eq("is_published", true).order("created_at", { ascending: false });
  posts = data || [];
  const categories = [...new Set(posts.map(p => p.category).filter(Boolean))];
  document.getElementById("categoryFilter").innerHTML =
    `<option value="">All categories</option>` + categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  renderPosts();
}
function renderPosts() {
  const q = document.getElementById("blogSearch").value.toLowerCase();
  const category = document.getElementById("categoryFilter").value;
  const filtered = posts.filter(p =>
    (!q || p.title.toLowerCase().includes(q)) && (!category || p.category === category)
  );
  document.getElementById("blogEmpty").classList.toggle("hidden", filtered.length > 0);
  document.getElementById("blogGrid").innerHTML = filtered.map(p => `
    <a href="blog-post.html?slug=${encodeURIComponent(p.slug)}">
      <div class="card feature">
        <span class="pill" style="background:#eef2ff;color:#4338ca">${escapeHtml(p.category || "Education")}</span>
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.content.slice(0, 170))}...</p>
      </div>
    </a>`).join("");
}
document.getElementById("blogFilters").addEventListener("submit", e => { e.preventDefault(); renderPosts(); });
document.getElementById("blogSearch").addEventListener("input", renderPosts);
document.getElementById("categoryFilter").addEventListener("change", renderPosts);
loadBlogs();

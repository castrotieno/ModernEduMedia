async function loadLatestBlogs() {
  const wrap = document.getElementById("latestBlogs");
  if (!wrap) return;
  const { data } = await sb.from("blogs").select("*").eq("is_published", true).order("created_at", { ascending: false }).limit(3);
  if (!data?.length) {
    wrap.innerHTML = `<div class="card"><p class="muted">No published articles yet. Teachers can publish posts from the dashboard.</p></div>`;
    return;
  }
  wrap.innerHTML = data.map(post => `
    <a href="blog-post.html?slug=${encodeURIComponent(post.slug)}">
      <div class="card feature">
        <span class="pill" style="background:#eef2ff;color:#4f46e5">${escapeHtml(post.category || "Education")}</span>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.content.slice(0, 150))}...</p>
      </div>
    </a>`).join("");
}
loadLatestBlogs();

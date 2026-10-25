const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function showToast(message, type = "success") {
  const t = document.getElementById("toast");
  if (!t) return alert(message);
  t.textContent = message;
  t.className = `toast show ${type === "error" ? "error" : ""}`;
  setTimeout(() => t.classList.remove("show"), 4000);
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function escapeHtml(text = "") {
  return text.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function getCurrentUser() {
  const { data } = await sb.auth.getUser();
  return data.user;
}

async function getProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
}

async function initHeader() {
  const profile = await getProfile();
  const login = document.getElementById("navLogin");
  const register = document.getElementById("navRegister");
  const dashboard = document.getElementById("navDashboard");
  const logout = document.getElementById("navLogout");
  if (profile) {
    login?.classList.add("hidden");
    register?.classList.add("hidden");
    dashboard?.classList.remove("hidden");
    logout?.classList.remove("hidden");
  }
  logout?.addEventListener("click", async () => {
    await sb.auth.signOut();
    location.href = "index.html";
  });
  document.getElementById("menuToggle")?.addEventListener("click", () => {
    document.getElementById("mainNav")?.classList.toggle("open");
  });
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
}

document.addEventListener("DOMContentLoaded", initHeader);

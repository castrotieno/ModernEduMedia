const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

if (loginForm) {
  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await sb.auth.signInWithPassword({
      email: fd.get("email"), password: fd.get("password")
    });
    if (error) return showToast(error.message, "error");
    location.href = "dashboard.html";
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email"), password = fd.get("password");
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) return showToast(error.message, "error");
    if (data.user) {
      await sb.from("profiles").upsert({
        id: data.user.id, email, full_name: fd.get("full_name"), role: fd.get("role")
      });
    }
    showToast("Account created. Check your email if confirmation is required.");
    setTimeout(() => location.href = "dashboard.html", 1200);
  });
}

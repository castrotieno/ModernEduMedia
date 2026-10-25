document.getElementById("contactForm").addEventListener("submit", async e => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const { error } = await sb.from("contact_messages").insert({
    name: fd.get("name"), email: fd.get("email"), message: fd.get("message")
  });
  if (error) return showToast(error.message, "error");
  showToast("Message sent successfully.");
  e.currentTarget.reset();
});

document.getElementById("contactForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);
const {error}=await sb.from("contact_messages").insert({name:f.get("name"),email:f.get("email"),subject:f.get("subject"),message:f.get("message")});
if(error)return showToast(error.message,"error");showToast("Message sent successfully.");e.currentTarget.reset()};

(async()=>{const sel=document.getElementById("classSelect");if(sel){const {data}=await sb.from("classes").select("*").order("name");sel.innerHTML='<option value="">Select class</option>'+(data||[]).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("")}})();
const lf=document.getElementById("loginForm");lf?.addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget);
const {error}=await sb.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});if(error)return showToast(error.message,"error");location.href="dashboard.html"});
const rf=document.getElementById("registerForm");rf?.addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget);
const {data,error}=await sb.auth.signUp({email:f.get("email"),password:f.get("password")});if(error)return showToast(error.message,"error");
if(data.user)await sb.from("profiles").upsert({id:data.user.id,email:f.get("email"),full_name:f.get("full_name"),role:f.get("role"),class_id:f.get("class_id")||null});
showToast("Account created. Check email if confirmation is required.");setTimeout(()=>location.href="dashboard.html",1300)});

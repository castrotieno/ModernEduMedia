const sb=supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
function showToast(m,type="success"){const t=document.getElementById("toast");if(!t)return alert(m);t.textContent=m;t.className=`toast show ${type==="error"?"error":""}`;setTimeout(()=>t.classList.remove("show"),4200)}
function esc(s=""){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function fmtDate(d){return d?new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"—"}
function slugify(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")}
async function getUser(){return (await sb.auth.getUser()).data.user}
async function getProfile(){const u=await getUser();if(!u)return null;return (await sb.from("profiles").select("*").eq("id",u.id).maybeSingle()).data}
async function uploadFile(file,prefix="uploads"){if(!file||!file.size)return null;const ext=file.name.split(".").pop();const path=`${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
const {error}=await sb.storage.from(STORAGE_BUCKET).upload(path,file,{cacheControl:"3600",upsert:false});if(error)throw error;
return {url:sb.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl,path}}
function openModal(html){document.getElementById("modalBox").innerHTML=html;document.getElementById("modalBackdrop").classList.remove("hidden")}
function closeModal(){document.getElementById("modalBackdrop").classList.add("hidden")}
document.addEventListener("click",e=>{if(e.target.id==="modalBackdrop")closeModal()});
async function initHeader(){const p=await getProfile();const L=document.getElementById("navLogin"),R=document.getElementById("navRegister"),D=document.getElementById("navDashboard"),O=document.getElementById("navLogout");
if(p){L?.classList.add("hidden");R?.classList.add("hidden");D?.classList.remove("hidden");O?.classList.remove("hidden")}
O?.addEventListener("click",async()=>{await sb.auth.signOut();location.href="index.html"});
document.getElementById("menuToggle")?.addEventListener("click",()=>document.getElementById("mainNav")?.classList.toggle("open"));
const y=document.getElementById("year");if(y)y.textContent=new Date().getFullYear()}
document.addEventListener("DOMContentLoaded",initHeader);

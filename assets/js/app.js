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
async function deleteResource(id,path){if(!confirm("Delete this resource permanently?"))return;
try{if(path)await sb.storage.from(STORAGE_BUCKET).remove([path]);const {error}=await sb.from("resources").delete().eq("id",id);if(error)throw error;showToast("Resource deleted.")}catch(e){showToast(e.message,"error")}}
async function initHeader(){const p=await getProfile();const L=document.getElementById("navLogin"),R=document.getElementById("navRegister"),D=document.getElementById("navDashboard"),O=document.getElementById("navLogout");
if(p){L?.classList.add("hidden");R?.classList.add("hidden");D?.classList.remove("hidden");O?.classList.remove("hidden")}
O?.addEventListener("click",async()=>{await sb.auth.signOut();location.href="index.html"});
document.getElementById("menuToggle")?.addEventListener("click",()=>document.getElementById("mainNav")?.classList.toggle("open"));
const y=document.getElementById("year");if(y)y.textContent=new Date().getFullYear()}
document.addEventListener("DOMContentLoaded",initHeader);

const mins=t=>Math.max(1,Math.round((t||"").split(/\s+/).length/200));
window.blogCard=(p,big)=>`<a href="blog-post.html?slug=${encodeURIComponent(p.slug)}" ${big?'style="grid-column:1/-1"':""}><div class="card post ${big?"big":""}"><div class="cover" ${p.cover_image?`style="background-image:url('${esc(p.cover_image)}')"`:""}>${p.cover_image?"":"📖"}</div><div class="body"><span class="pill">${esc(p.category||"Education")}</span><h3>${esc(p.title)}</h3><p>${esc(p.content.slice(0,big?260:150))}…</p><div class="meta">${fmtDate(p.created_at)} · ${mins(p.content)} min read</div></div></div></a>`;
(async()=>{try{const {data}=await sb.from("site_settings").select("value").eq("key","announcement").maybeSingle();const t=data?.value?.trim();if(t&&!document.querySelector(".dashboard"))document.body.insertAdjacentHTML("afterbegin",`<div class="announce">${esc(t)}</div>`)}catch(e){}})();

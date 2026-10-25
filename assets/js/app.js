/* ModernEduMedia shared layer: Supabase client, helpers, ONE navigation bar + footer used by every page */
const sb=window.supabase?window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY):null;

function friendlyError(m){m=String(m||"Something went wrong.");
 if(/schema cache/i.test(m))return m+" — the database is missing a column. Run the latest supabase/schema.sql once in the Supabase SQL Editor.";
 if(/row-level security|violates row-level/i.test(m))return "You do not have permission to do that.";
 if(/failed to fetch|networkerror/i.test(m))return "Network problem. Check your connection and try again.";
 return m}
let _toastT;
function showToast(m,type="success"){const t=document.getElementById("toast");if(type==="error")m=friendlyError(m&&m.message?m.message:m);if(!t)return alert(m);
 t.textContent=m;t.setAttribute("role",type==="error"?"alert":"status");t.className=`toast show ${type==="error"?"error":""}`;clearTimeout(_toastT);_toastT=setTimeout(()=>t.classList.remove("show"),type==="error"?7000:4200)}
function esc(s=""){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function fmtDate(d){return d?new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"—"}
function fmtDateTime(d){return d?new Date(d).toLocaleString("en-GB",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"—"}
function slugify(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")}
async function getUser(){if(!sb)return null;const {data}=await sb.auth.getSession();return data?.session?.user||null}
let _profileP=null;
function getProfile(){return _profileP||(_profileP=(async()=>{const u=await getUser();if(!u)return null;return (await sb.from("profiles").select("*").eq("id",u.id).maybeSingle()).data})())}
async function fetchMySubjects(p){if(!p||!["student","teacher","admin"].includes(p.role))return[];
 if(p.role==="student"){const {data}=await sb.from("enrollments").select("subjects(id,name,code,teacher_id,classes(name))").eq("student_id",p.id);return (data||[]).map(x=>x.subjects).filter(Boolean)}
 const {data}=await sb.from("subjects").select("id,name,code,teacher_id,classes(name)").order("name");return p.role==="admin"?(data||[]):(data||[]).filter(s=>s.teacher_id===p.id)}
async function uploadFile(file,prefix="uploads"){if(!file||!file.size)return null;const ext=file.name.split(".").pop();const path=`${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
 const {error}=await sb.storage.from(STORAGE_BUCKET).upload(path,file,{cacheControl:"3600",upsert:false});if(error)throw error;
 return {url:sb.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl,path}}
async function deleteResource(id,path){if(!confirm("Delete this resource permanently?"))return;
 try{if(path)await sb.storage.from(STORAGE_BUCKET).remove([path]);const {error}=await sb.from("resources").delete().eq("id",id);if(error)throw error;showToast("Resource deleted.")}catch(e){showToast(e.message,"error")}}

/* ---------- navigation: one definition, used on every page ---------- */
const NAV=[["index.html","Home","home"],["resources.html","Resources","resources"],["live.html","Live Classes","live"],["blog.html","Blog","blog"],["about.html","About","about"],["contact.html","Contact","contact"]];
function buildHeader(){const h=document.getElementById("siteHeader");if(!h)return;const page=document.body.dataset.page||"",dash=page==="dashboard";
 const list=dash?NAV.filter(n=>["home","live"].includes(n[2])):NAV;
 const links=list.map(([href,label,key])=>`<a href="${href}" class="${key===page?"active":""}${key==="live"?" nav-live":""}" ${key===page?'aria-current="page"':""}>${key==="live"?'<span class="live-dot" aria-hidden="true"></span>':""}${label}</a>`).join("");
 const auth=dash?"":`<span class="nav-auth" id="navAuth"><a href="login.html" class="${page==="login"?"active":""}">Login</a><a href="register.html" class="btn btn-primary">Register</a></span>`;
 h.classList.add("site-header");
 h.innerHTML=`<a class="skip-link" href="#main">Skip to content</a><div class="container header-inner"><a class="brand" href="index.html"><span class="brand-icon" aria-hidden="true">🎓</span> ${SITE_NAME}</a>
 <nav class="main-nav" id="mainNav" aria-label="Main">${links}${auth}</nav>
 ${dash?'<div class="header-user"><span class="pill" id="userBadge"></span><button id="logoutBtn" class="btn btn-ghost btn-sm">Sign out</button></div>':""}
 <button class="menu-toggle" id="menuToggle" aria-label="Open menu" aria-expanded="false" aria-controls="mainNav">☰</button></div>`;
 const nav=document.getElementById("mainNav"),tg=document.getElementById("menuToggle");
 const setOpen=o=>{nav.classList.toggle("open",o);tg.setAttribute("aria-expanded",o);tg.setAttribute("aria-label",o?"Close menu":"Open menu");tg.textContent=o?"✕":"☰"};
 tg.addEventListener("click",()=>setOpen(!nav.classList.contains("open")));
 nav.addEventListener("click",e=>{if(e.target.closest("a,button"))setOpen(false)});
 document.addEventListener("keydown",e=>{if(e.key==="Escape")setOpen(false)});
 window.addEventListener("resize",()=>{if(innerWidth>1020)setOpen(false)});
 document.addEventListener("click",e=>{if(nav.classList.contains("open")&&!h.contains(e.target))setOpen(false)})}
function buildFooter(){const f=document.getElementById("siteFooter");if(!f)return;f.className="site-footer";
 f.innerHTML=`<div class="container footer-grid"><div><h3>${SITE_NAME}</h3><p>Notes, assignments, quizzes, live classes and discussion forums for Form 1–4.</p></div>
 <div><h4>Explore</h4><a href="resources.html">Resources</a><a href="live.html">Live Classes</a><a href="blog.html">Blog</a><a href="about.html">About</a><a href="contact.html">Contact</a></div>
 <div><h4>Contact</h4><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a><a href="${WHATSAPP_URL}" target="_blank" rel="noopener">WhatsApp: +254 741 637 904</a></div></div><p class="copyright">© ${new Date().getFullYear()} ${SITE_NAME}</p>`}
async function initHeader(){buildHeader();buildFooter();if(!sb)return;
 document.querySelectorAll("#logoutBtn,#navLogout").forEach(b=>b.addEventListener("click",async()=>{await sb.auth.signOut();location.href="index.html"}));
 let p=null;try{p=await getProfile()}catch(e){}
 const na=document.getElementById("navAuth");
 if(p&&na){na.innerHTML=`<a href="dashboard.html" class="btn btn-secondary">Dashboard</a><button id="navLogout" class="btn btn-ghost">Sign out</button>`;
  document.getElementById("navLogout").addEventListener("click",async()=>{await sb.auth.signOut();location.href="index.html"})}
 if(p){try{const {count}=await sb.from("live_classes").select("id",{count:"exact",head:true}).eq("status","live");if(count>0){const a=document.querySelector(".nav-live");a?.classList.add("has-live");a?.setAttribute("title",count+" class"+(count>1?"es":"")+" live now")}}catch(e){}}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initHeader);else initHeader();

const mins=t=>Math.max(1,Math.round((t||"").split(/\s+/).length/200));
window.blogCard=(p,big)=>`<a href="blog-post.html?slug=${encodeURIComponent(p.slug)}" ${big?'style="grid-column:1/-1"':""}><div class="card post ${big?"big":""}"><div class="cover" ${p.cover_image?`style="background-image:url('${esc(p.cover_image)}')"`:""}>${p.cover_image?"":"📖"}</div><div class="body"><span class="pill">${esc(p.category||"Education")}</span><h3>${esc(p.title)}</h3><p>${esc(p.content.slice(0,big?260:150))}…</p><div class="meta">${fmtDate(p.created_at)} · ${mins(p.content)} min read</div></div></div></a>`;
(async()=>{if(!sb)return;try{const {data}=await sb.from("site_settings").select("value").eq("key","announcement").maybeSingle();const t=data?.value?.trim();
 let gone=false;try{gone=sessionStorage.getItem("announce-off")===t}catch(e){}
 if(t&&!gone&&!document.querySelector(".dashboard")){document.body.insertAdjacentHTML("afterbegin",`<div class="announce"><span>${esc(t)}</span><button aria-label="Dismiss announcement" class="announce-x">×</button></div>`);
  document.querySelector(".announce-x").onclick=e=>{e.target.parentElement.remove();try{sessionStorage.setItem("announce-off",t)}catch(_){}}}}catch(e){}})();

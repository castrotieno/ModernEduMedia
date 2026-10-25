let posts=[];
async function load(){const {data}=await sb.from("blogs").select("*").eq("is_published",true).order("created_at",{ascending:false});posts=data||[];
const cats=[...new Set(posts.map(p=>p.category).filter(Boolean))];
document.getElementById("categoryFilter").innerHTML='<option value="">All categories</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join("");
document.getElementById("categoryChips").innerHTML='<button class="chip active" data-cat="">All</button>'+cats.map(c=>`<button class="chip" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
document.querySelectorAll("#categoryChips .chip").forEach(b=>b.onclick=()=>{document.querySelectorAll("#categoryChips .chip").forEach(x=>x.classList.remove("active"));b.classList.add("active");render()});
render()}
function render(){const q=document.getElementById("blogSearch").value.toLowerCase(),c=document.querySelector("#categoryChips .chip.active")?.dataset.cat||"";
const out=posts.filter(p=>(!q||p.title.toLowerCase().includes(q))&&(!c||p.category===c));
document.getElementById("empty").classList.toggle("hidden",out.length>0);
const featured=out[0];
document.getElementById("featured").innerHTML=featured?`<a href="blog-post.html?slug=${encodeURIComponent(featured.slug)}"><div class="card blog-card" style="display:grid;grid-template-columns:1fr 1fr;margin-bottom:26px"><div class="blog-cover" style="height:100%">✨</div><div class="blog-body"><span class="pill">Featured</span><h3 style="font-size:1.6rem">${esc(featured.title)}</h3><p class="muted">${esc(featured.content.slice(0,240))}...</p><div class="blog-meta"><span>${fmtDate(featured.created_at)}</span><span>•</span><span>${esc(featured.category||"Education")}</span></div></div></div></a>`:"";
document.getElementById("blogGrid").innerHTML=out.slice(1).map(p=>`<a href="blog-post.html?slug=${encodeURIComponent(p.slug)}"><div class="card blog-card"><div class="blog-cover">📘</div><div class="blog-body"><span class="pill">${esc(p.category||"Education")}</span><h3>${esc(p.title)}</h3><p class="muted">${esc(p.content.slice(0,140))}...</p><div class="blog-meta"><span>${fmtDate(p.created_at)}</span><span>•</span><span>Read</span></div></div></div></a>`).join("")}
document.getElementById("blogFilters").onsubmit=e=>{e.preventDefault();render()};document.getElementById("blogSearch").oninput=render;document.getElementById("categoryFilter").onchange=render;load();

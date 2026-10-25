(async()=>{const box=document.getElementById("latestBlogs");if(!box)return;
const {data}=await sb.from("blogs").select("*").eq("is_published",true).order("created_at",{ascending:false}).limit(3);
box.innerHTML=data?.length?data.map(p=>`<a href="blog-post.html?slug=${encodeURIComponent(p.slug)}"><div class="card feature"><span class="pill">${esc(p.category||"Education")}</span><h3>${esc(p.title)}</h3><p>${esc(p.content.slice(0,150))}...</p></div></a>`).join(""):'<div class="card empty">No published articles yet.</div>'})();

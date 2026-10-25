(async()=>{const slug=new URLSearchParams(location.search).get("slug");const {data}=await sb.from("blogs").select("*").eq("slug",slug).eq("is_published",true).maybeSingle();
const box=document.getElementById("article");if(!data){box.innerHTML="<h1>Article not found</h1>";return}
document.title=data.title+" — ModernEduMedia";box.innerHTML=`<span class="pill">${esc(data.category||"Education")}</span><h1>${esc(data.title)}</h1><p class="muted">${fmtDate(data.created_at)}</p><div>${data.content.replace(/\n/g,"<br>")}</div>`})();

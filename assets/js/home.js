(async()=>{const box=document.getElementById("latestBlogs");if(!box)return;const {data}=await sb.from("blogs").select("*").eq("is_published",true).order("created_at",{ascending:false}).limit(3);
box.innerHTML=data?.length?data.map(p=>blogCard(p)).join(""):'<div class="card empty">No published articles yet.</div>'})();

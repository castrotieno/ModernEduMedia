/* Article page v6: markdown, reading progress, contents list, author box, related articles, share */
(async()=>{const slug=new URLSearchParams(location.search).get("slug"),box=document.getElementById("article");
 const {data}=await sb.from("blogs").select("*,profiles(full_name)").eq("slug",slug).maybeSingle();
 if(!data){box.innerHTML='<h1>Article not found</h1><p class="muted">It may have been unpublished or moved.</p><a class="btn btn-primary" href="blog.html">Back to the blog</a>';return}
 document.title=data.title+" — ModernEduMedia";const words=data.content.trim().split(/\s+/).length,mins=Math.max(1,Math.round(words/200)),body=md(data.content),
 heads=[...body.matchAll(/<h2 id="([^"]+)">(.*?)<\/h2>/g)],url=encodeURIComponent(location.href),who=data.profiles?.full_name||"ModernEduMedia";
 const d=document.querySelector('meta[name="description"]')||document.head.appendChild(Object.assign(document.createElement("meta"),{name:"description"}));d.content=data.excerpt||data.content.slice(0,150);
 document.body.insertAdjacentHTML("afterbegin",'<div class="read-bar" id="rb"></div>');addEventListener("scroll",()=>{const h=document.documentElement;rb.style.width=Math.min(100,h.scrollTop/(h.scrollHeight-h.clientHeight||1)*100)+"%"},{passive:true});
 box.innerHTML=`<span class="pill">${esc(data.category||"Education")}</span><h1 style="margin:10px 0">${esc(data.title)}</h1>${data.excerpt?`<p class="lead" style="margin:6px 0 14px">${esc(data.excerpt)}</p>`:""}<div class="meta">${esc(who)} · ${fmtDate(data.created_at)} · ${mins} min read</div>
 ${data.cover_image?`<img src="${esc(data.cover_image)}" alt="" style="width:100%;border-radius:10px;margin:22px 0">`:""}
 ${heads.length>2?`<nav class="toc" aria-label="Contents"><b>In this article</b>${heads.map(h=>`<a href="#${h[1]}">${h[2]}</a>`).join("")}</nav>`:""}<div class="article-body">${body}</div>
 <div class="author-box"><div class="av">${esc(who[0]||"M")}</div><div><b>${esc(who)}</b><p class="muted" style="font-size:.9rem">Teacher at ModernEduMedia</p></div></div>
 <div class="share"><a class="btn btn-whatsapp btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(data.title)}%20${url}">Share on WhatsApp</a><button class="btn btn-outline btn-sm" id="cp">Copy link</button><button class="btn btn-outline btn-sm" onclick="print()">Print</button><a class="btn btn-outline btn-sm" href="blog.html">All articles</a></div><div id="related"></div>`;
 cp.onclick=async()=>{try{await navigator.clipboard.writeText(location.href);showToast("Link copied.")}catch(e){showToast("Copy failed.","error")}};
 const p=await getProfile();if(p&&(p.role==="admin"||p.id===data.author_id))box.insertAdjacentHTML("afterbegin",'<a class="btn btn-edit btn-sm" style="float:right" href="dashboard.html">Edit in dashboard</a>');
 const {data:rel}=await sb.from("blogs").select("*").eq("is_published",true).neq("id",data.id).order("created_at",{ascending:false}).limit(30);
 const r=(rel||[]).sort((a,b)=>(b.category===data.category)-(a.category===data.category)).slice(0,3);
 if(r.length)document.getElementById("related").innerHTML=`<h2 style="margin:36px 0 14px">Keep reading</h2><div class="grid grid-3">${r.map(x=>blogCard(x)).join("")}</div>`})();

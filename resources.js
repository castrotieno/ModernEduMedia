let resources=[],subjects=[],classes=[];
async function load(){const [r,s,c]=await Promise.all([sb.from("resources").select("*,subjects(name,class_id,classes(name))").order("created_at",{ascending:false}),sb.from("subjects").select("*,classes(name)"),sb.from("classes").select("*").order("name")]);
resources=r.data||[];subjects=s.data||[];classes=c.data||[];
document.getElementById("classFilter").innerHTML='<option value="">All classes</option>'+classes.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");
document.getElementById("subjectFilter").innerHTML='<option value="">All subjects</option>'+subjects.map(x=>`<option value="${x.id}">${esc(x.name)} — ${esc(x.classes?.name||"")}</option>`).join("");
document.getElementById("classChips").innerHTML='<button class="chip active" data-c="">All classes</button>'+classes.map(x=>`<button class="chip" data-c="${x.id}">${esc(x.name)}</button>`).join("");
document.querySelectorAll("#classChips .chip").forEach(b=>b.onclick=()=>{document.querySelectorAll("#classChips .chip").forEach(x=>x.classList.remove("active"));b.classList.add("active");render()});render()}
function render(){const q=document.getElementById("q").value.toLowerCase(),cf=document.getElementById("classFilter").value,sf=document.getElementById("subjectFilter").value,tf=document.getElementById("typeFilter").value,chip=document.querySelector("#classChips .chip.active")?.dataset.c||"";
const out=resources.filter(r=>(!q||(r.title+" "+r.description).toLowerCase().includes(q))&&(!sf||r.subject_id===sf)&&(!tf||r.type===tf)&&(!chip||r.subjects?.class_id===chip));
document.getElementById("empty").classList.toggle("hidden",out.length>0);
document.getElementById("grid").innerHTML=out.map(r=>`<div class="card blog-card"><div class="blog-cover">${r.type==="video_link"?"🎬":r.type==="image"?"🖼️":"📄"}</div><div class="blog-body"><span class="pill">${esc(r.type.replace("_"," "))}</span><h3>${esc(r.title)}</h3><p class="muted">${esc(r.description)}</p><div class="blog-meta"><span>${esc(r.subjects?.name||"")}</span><span>•</span><span>${esc(r.subjects?.classes?.name||"")}</span></div><div style="display:flex;gap:9px;margin-top:18px"><a class="btn btn-gradient btn-sm" href="${r.file_url}" download>Download</a><a class="btn btn-outline btn-sm" href="${r.file_url}" target="_blank">Preview</a></div></div></div>`).join("")}
document.getElementById("filters").onsubmit=e=>{e.preventDefault();render()};
["q","classFilter","subjectFilter","typeFilter"].forEach(id=>{document.getElementById(id).addEventListener("input",render);document.getElementById(id).addEventListener("change",render)});
load();

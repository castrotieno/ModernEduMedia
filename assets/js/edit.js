/* Edit layer: modal editor for admin + teacher, injected next to Delete buttons */
const T=[["notes_pdf","PDF Notes"],["video_link","Video"],["document","Document"],["image","Image"],["attachment","Attachment"]],YN=[["true","Published"],["false","Draft"]];
const EDIT={
 classes:{title:"Class",f:[["name","Class name"],["academic_year","Academic year"],["description","Description"]]},
 subjects:{title:"Subject",f:[["code","Code"],["name","Name"],["description","Description"]]},
 resources:{title:"Resource",f:[["title","Title"],["description","Description","textarea"],["type","Type","select",T]]},
 assignments:{title:"Assignment",f:[["title","Title"],["instructions","Instructions","textarea"],["type","Type","select",["Assignment","CAT","Exam","Quiz"].map(x=>[x,x])],["max_score","Maximum score","number"],["due_date","Due date","datetime-local"]]},
 quizzes:{title:"Quiz",f:[["title","Title"],["description","Description","textarea"],["time_limit_minutes","Time limit (minutes)","number"],["is_published","Status","select",YN]]},
 blogs:{title:"Article",f:[["title","Title"],["category","Category"],["cover_image","Cover image URL"],["content","Content (blank line = new paragraph)","textarea",12],["is_published","Status","select",YN]]},
 profiles:{title:"User",f:[["full_name","Full name"],["phone","Phone"],["admission_no","Admission number"]]}
};
const activeTab=()=>document.querySelector("#sideNav a.active")?.dataset.tab||"overview";
function closeModal(){document.querySelector(".modal-bg")?.remove()}
window.editRow=async function(table,id){const cfg=EDIT[table];const {data:row,error}=await sb.from(table).select("*").eq("id",id).single();if(error)return showToast(error.message,"error");
 const val=(k,t)=>{let v=row[k];if(v==null)v="";if(t==="datetime-local"&&v){const d=new Date(v);v=new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,16)}return v};
 const field=([k,l,t,x])=>t==="textarea"?`<label>${l}<textarea name="${k}" rows="${x||4}">${esc(val(k))}</textarea></label>`:t==="select"?`<label>${l}<select name="${k}">${x.map(([v,n])=>`<option value="${v}" ${String(row[k])===v?"selected":""}>${n}</option>`).join("")}</select></label>`:`<label>${l}<input name="${k}" type="${t||"text"}" value="${esc(val(k,t))}"></label>`;
 document.body.insertAdjacentHTML("beforeend",`<div class="modal-bg"><form class="modal"><h2>Edit ${cfg.title.toLowerCase()}</h2>${cfg.f.map(field).join("")}<div class="modal-actions"><button type="button" class="btn btn-outline" data-x>Cancel</button><button class="btn btn-primary">Save changes</button></div></form></div>`);
 const bg=document.querySelector(".modal-bg");bg.querySelector("[data-x]").onclick=closeModal;bg.onclick=e=>{if(e.target===bg)closeModal()};
 bg.querySelector("form").onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),up={};
  cfg.f.forEach(([k,,t])=>{let v=fd.get(k);if(t==="number")v=Number(v);else if(t==="datetime-local")v=v?new Date(v).toISOString():null;else if(k==="is_published")v=v==="true";else if(v==="")v=null;up[k]=v});
  const {error}=await sb.from(table).update(up).eq("id",id);if(error)return showToast(error.message,"error");closeModal();showToast(cfg.title+" updated.");render(activeTab())}};
/* inject Edit buttons beside existing Delete buttons */
const MAP=[[/deleteRow\('(\w+)','([^']+)'/,m=>[m[1],m[2]]],[/deleteResource\('([^']+)'/,m=>["resources",m[1]]],[/deleteUser\('([^']+)'/,m=>["profiles",m[1]]]];
function inject(){document.querySelectorAll("#content button[onclick]:not([data-ed])").forEach(b=>{b.dataset.ed=1;for(const [re,f] of MAP){const m=b.getAttribute("onclick").match(re);if(m){const [t,id]=f(m);if(EDIT[t]){const e=document.createElement("button");e.className="btn btn-edit btn-sm";e.textContent="Edit";e.dataset.ed=1;e.onclick=()=>editRow(t,id);b.before(e)}}}})}
new MutationObserver(inject).observe(document.getElementById("content"),{childList:true,subtree:true});
/* extra tabs */
menus.teacher.splice(1,0,["content","My Content"]);menus.admin.push(["blogs","All Blogs"],["messages","Messages"]);
const acts=(t,id,extra="")=>`<button class="btn btn-edit btn-sm" onclick="editRow('${t}','${id}')">Edit</button> ${extra}<button class="btn btn-danger btn-sm" onclick="deleteRow('${t}','${id}')">Delete</button>`;
const tbl=(h,rows)=>`<div class="table-wrap"><table><thead><tr>${h.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows||'<tr><td colspan="9" class="muted center">Nothing here yet.</td></tr>'}</tbody></table></div>`;
const status=p=>`<span class="badge ${p?"badge-green":"badge-amber"}">${p?"Published":"Draft"}</span>`;
async function blogsTable(own){let q=sb.from("blogs").select("*,profiles(full_name)").order("created_at",{ascending:false});if(own)q=q.eq("author_id",profile.id);const {data}=await q;
 return tbl(["Title","Category",...(own?[]:["Author"]),"Status","Date","Actions"],(data||[]).map(b=>`<tr><td><a href="blog-post.html?slug=${encodeURIComponent(b.slug)}" target="_blank"><strong>${esc(b.title)}</strong></a></td><td>${esc(b.category||"—")}</td>${own?"":`<td>${esc(b.profiles?.full_name||"")}</td>`}<td>${status(b.is_published)}</td><td>${fmtDate(b.created_at)}</td><td>${acts("blogs",b.id)}</td></tr>`).join(""))}
const _tt=teacherTab;teacherTab=async function(tab){if(tab!=="content")return _tt(tab);
 const own=(t,c)=>sb.from(t).select("*,subjects(name)").eq(c,profile.id).order("created_at",{ascending:false});
 const [r,a,q]=await Promise.all([own("resources","uploaded_by"),own("assignments","created_by"),own("quizzes","created_by")]);
 set(`<h1>My Content</h1><p class="muted">Edit or remove anything you have published.</p><h3 style="margin-top:22px">Resources</h3>${tbl(["Title","Subject","Type","Actions"],(r.data||[]).map(x=>`<tr><td>${esc(x.title)}</td><td>${esc(x.subjects?.name||"")}</td><td>${x.type}</td><td>${acts("resources",x.id)}</td></tr>`).join(""))}
 <h3 style="margin-top:22px">Assignments</h3>${tbl(["Title","Subject","Marks","Due","Actions"],(a.data||[]).map(x=>`<tr><td>${esc(x.title)}</td><td>${esc(x.subjects?.name||"")}</td><td>${x.max_score}</td><td>${fmtDate(x.due_date)}</td><td>${acts("assignments",x.id)}</td></tr>`).join(""))}
 <h3 style="margin-top:22px">Quizzes</h3>${tbl(["Title","Subject","Status","Actions"],(q.data||[]).map(x=>`<tr><td>${esc(x.title)}</td><td>${esc(x.subjects?.name||"")}</td><td>${status(x.is_published)}</td><td>${acts("quizzes",x.id)}</td></tr>`).join(""))}
 <h3 style="margin-top:22px">Blog articles</h3>${await blogsTable(true)}`)};
const _at=adminTab;adminTab=async function(tab){
 if(tab==="blogs")return set(`<h1>All Blogs</h1>${await blogsTable(false)}`);
 if(tab==="messages"){const {data}=await sb.from("contact_messages").select("*").order("created_at",{ascending:false});
  return set(`<h1>Messages</h1><div class="grid grid-2" style="margin-top:16px">${(data||[]).map(m=>`<div class="card"><strong>${esc(m.subject||"(no subject)")}</strong><p class="muted" style="font-size:.85rem">${esc(m.name)} · <a href="mailto:${esc(m.email)}">${esc(m.email)}</a> · ${fmtDate(m.created_at)}</p><p style="margin:10px 0">${esc(m.message)}</p><a class="btn btn-outline btn-sm" href="mailto:${esc(m.email)}">Reply</a> <button class="btn btn-danger btn-sm" onclick="deleteRow('contact_messages','${m.id}')">Delete</button></div>`).join("")||'<div class="card empty">No messages yet.</div>'}</div>`)}
 return _at(tab)};
/* teacher blog tab: add editable list under the author form */
const _tb=teacherTab;teacherTab=async function(tab){await _tb(tab);if(tab==="blog")document.getElementById("content").insertAdjacentHTML("beforeend",`<h3 style="margin-top:26px">Your articles</h3>${await blogsTable(true)}`)};

/* v6 upgrade layer (loaded last): admin tools, assignments & exams hub, richer student pages, blog editor */
const ICON={Assignment:"📝",CAT:"🧪",Exam:"🎓",Quiz:"❓"};
const csv=(name,rows)=>{const t=rows.map(r=>r.map(c=>`"${String(c??"").replace(/"/g,'""')}"`).join(",")).join("\n"),a=document.createElement("a");
 a.href=URL.createObjectURL(new Blob(["\ufeff"+t],{type:"text/csv"}));a.download=name;a.click()};
const span=ms=>{const a=Math.abs(ms),d=Math.floor(a/864e5),h=Math.floor(a%864e5/36e5);return d?`${d}d ${h}h`:`${h}h ${Math.floor(a%36e5/6e4)}m`};
const dueTag=d=>{if(!d)return"";const ms=new Date(d)-Date.now();return `<span class="due ${ms<0?"late":ms<864e5?"soon":""}">${ms<0?"Closed "+span(ms)+" ago":"Closes in "+span(ms)}</span>`};
const pctOf=(a,b)=>b?Math.round(a/b*100):0;
const rerender=()=>render(activeTab());
/* extra fields in the edit modal */
EDIT.assignments.f.push(["opens_at","Opens at (optional)","datetime-local"],["duration_minutes","Exam duration in minutes (info for students)","number"],["allow_late","Late submissions","select",[["true","Allowed"],["false","Locked after due date"]]]);
const _ef=editRow;
window.editRow=(t,id)=>t==="blogs"?blogEditor(id):_ef(t,id);
(menus.admin.find(m=>m[0]==="assignments")||[])[1]="Assignments & Exams";
(menus.teacher.find(m=>m[0]==="assignments")||[])[1]="Assignments & Exams";
menus.admin.splice(menus.admin.findIndex(m=>m[0]==="reports"),0,["blog","Write Article"]);

/* ---------- submissions review (teacher + admin) ---------- */
window.reviewSubs=async function(id){
 const {data:a}=await sb.from("assignments").select("*,subjects(id,name,class_id)").eq("id",id).single();
 const [{data:subs},{data:enr}]=await Promise.all([sb.from("submissions").select("*,student:profiles!submissions_student_id_fkey(full_name,email)").eq("assignment_id",id).order("submitted_at"),
  sb.from("enrollments").select("student_id,profiles(full_name,email)").eq("subject_id",a.subject_id)]);
 const S=subs||[],got=new Set(S.map(s=>s.student_id)),missing=(enr||[]).filter(e=>!got.has(e.student_id)),sc=S.filter(s=>s.score!=null).map(s=>Number(s.score));
 const avg=sc.length?(sc.reduce((x,y)=>x+y,0)/sc.length).toFixed(1):"—";
 set(`<div class="page-bar"><h1>${ICON[a.type]||""} ${esc(a.title)}</h1><div><button class="btn btn-outline btn-sm" onclick="render(activeTab())">← Back</button> <button class="btn btn-outline btn-sm" id="exp">Export CSV</button></div></div>
 <p class="muted">${esc(a.subjects?.name||"")} · ${a.type} · ${a.max_score} marks · ${dueTag(a.due_date)}</p>
 <div class="hub-stats">${stat("Submitted",S.length)}${stat("Graded",sc.length)}${stat("Average",avg)}${stat("Highest",sc.length?Math.max(...sc):"—")}${stat("Not submitted",missing.length)}</div>
 <div class="table-wrap"><table><thead><tr><th>Student</th><th>Submitted</th><th>Answer</th><th>Score /${a.max_score}</th><th>Feedback</th><th></th></tr></thead><tbody>${S.map(s=>{const late=a.due_date&&new Date(s.submitted_at)>new Date(a.due_date);
  return `<tr data-id="${s.id}"><td><b>${esc(s.student?.full_name||s.student?.email||"")}</b></td><td>${fmtDateTime(s.submitted_at)}${late?' <span class="badge badge-red">Late</span>':""}</td>
  <td style="max-width:260px"><details><summary>View</summary><div class="answer-box">${esc(s.text_answer||"(none)")}</div></details>${s.attachment_url?`<a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="${esc(s.attachment_url)}">📎 File</a>`:""}</td>
  <td><input type="number" class="sc" min="0" max="${a.max_score}" step="0.5" value="${s.score??""}" style="width:80px"></td><td><input class="fb" maxlength="500" value="${esc(s.feedback||"")}"></td>
  <td><button class="btn btn-primary btn-sm sv">${s.status==="pending"?"Grade":"Update"}</button></td></tr>`}).join("")||'<tr><td colspan="6" class="muted center">No submissions yet.</td></tr>'}</tbody></table></div>
 ${missing.length?`<div class="card" style="margin-top:18px"><h3>Not yet submitted (${missing.length})</h3><div class="chip-row" style="margin-top:8px">${missing.map(m=>`<span class="chip">${esc(m.profiles?.full_name||m.profiles?.email||"")}</span>`).join("")}</div></div>`:""}`);
 document.getElementById("exp").onclick=()=>csv(slugify(a.title)+"-results.csv",[["Student","Email","Submitted","Score","Out of","Feedback"],...S.map(s=>[s.student?.full_name,s.student?.email,s.submitted_at,s.score,a.max_score,s.feedback])]);
 document.querySelectorAll(".sv").forEach(b=>b.onclick=async()=>{const tr=b.closest("tr"),v=tr.querySelector(".sc").value,score=Number(v);
  if(v===""||score<0||score>a.max_score)return showToast("Enter a score between 0 and "+a.max_score,"error");
  const fb=tr.querySelector(".fb").value.trim()||null;let {error}=await sb.from("submissions").update({score,feedback:fb,status:"graded"}).eq("id",tr.dataset.id);
  if(error&&/feedback/i.test(error.message))({error}=await sb.from("submissions").update({score,status:"graded"}).eq("id",tr.dataset.id));
  if(error)return showToast(error.message,"error");b.textContent="Update";showToast("Grade saved.")})};

/* ---------- assignments & exams hub ---------- */
async function assessHub(own){
 let q=sb.from("assignments").select("*,subjects(name,classes(name)),submissions(id,status,score)").order("created_at",{ascending:false});if(own)q=q.eq("created_by",profile.id);
 const {data,error}=await q,L=data||[];if(error)return `<div class="card empty">${esc(friendlyError(error.message))}</div>`;
 const n=L.reduce((t,a)=>t+a.submissions.length,0),g=L.reduce((t,a)=>t+a.submissions.filter(s=>s.status!=="pending").length,0),open=L.filter(a=>!a.due_date||new Date(a.due_date)>new Date()).length;
 window._hubRows=()=>{const t=(document.getElementById("hq")?.value||"").toLowerCase(),k=document.getElementById("ht")?.value||"";
  return L.filter(a=>(!k||a.type===k)&&(!t||(a.title+" "+(a.subjects?.name||"")).toLowerCase().includes(t))).map(a=>{const s=a.submissions,gd=s.filter(x=>x.status!=="pending").length;
   return `<tr><td><b>${ICON[a.type]||""} ${esc(a.title)}</b><br><span class="muted" style="font-size:.8rem">${esc(a.subjects?.name||"")} · ${esc(a.subjects?.classes?.name||"")}</span></td><td><span class="pill">${a.type}</span></td><td>${a.max_score}</td>
   <td>${fmtDate(a.due_date)}<br>${dueTag(a.due_date)}</td><td>${s.length} <span class="muted">(${gd} graded)</span></td>
   <td style="white-space:nowrap"><button class="btn btn-primary btn-sm" onclick="reviewSubs('${a.id}')">Review</button> <button class="btn btn-edit btn-sm" onclick="editRow('assignments','${a.id}')">Edit</button> <button class="btn btn-outline btn-sm" onclick="dupAssess('${a.id}')">Duplicate</button> <button class="btn btn-danger btn-sm" onclick="deleteRow('assignments','${a.id}')">Delete</button></td></tr>`}).join("")||'<tr><td colspan="6" class="muted center">Nothing matches.</td></tr>'};
 setTimeout(()=>{const f=()=>{const b=document.getElementById("hb");if(b)b.innerHTML=_hubRows()};const q=document.getElementById("hq"),t=document.getElementById("ht");if(q){q.oninput=f;t.onchange=f}f()},0);
 return `<div class="hub-stats">${stat("Total",L.length)}${stat("Exams",L.filter(a=>a.type==="Exam").length)}${stat("Still open",open)}${stat("Submissions",n)}${stat("Waiting to grade",n-g)}</div>
 <div class="toolbar"><input id="hq" type="search" placeholder="Search title or subject…"><select id="ht"><option value="">All types</option><option>Assignment</option><option>CAT</option><option>Exam</option></select></div>
 <div class="table-wrap"><table><thead><tr><th>Title</th><th>Type</th><th>Marks</th><th>Due</th><th>Submissions</th><th>Actions</th></tr></thead><tbody id="hb"></tbody></table></div>`}
window.dupAssess=async id=>{const {data:a}=await sb.from("assignments").select("*").eq("id",id).single();delete a.id;delete a.created_at;a.title+=" (copy)";a.created_by=profile.id;a.due_date=new Date(Date.now()+7*864e5).toISOString();
 const {error}=await sb.from("assignments").insert(a);if(error)return showToast(error.message,"error");showToast("Duplicated — edit the new due date.");rerender()};

function builderForm(){return `<details class="card" ${window._bOpen?"open":""}><summary style="cursor:pointer;font-weight:700">＋ Create new assignment, CAT or exam</summary><form id="abForm" style="margin-top:14px"><label>Title<input name="title" required></label><label>Instructions<textarea name="instructions" rows="4" required></textarea></label>
 <div class="grid grid-2"><label>Type<select name="type"><option>Assignment</option><option>CAT</option><option>Exam</option></select></label><label>Subject<select name="subject_id">${subjectOptions()}</select></label>
 <label>Maximum score<input name="max_score" type="number" min="1" value="100"></label><label>Exam duration (minutes, optional)<input name="duration_minutes" type="number" min="1"></label>
 <label>Opens at (optional)<input name="opens_at" type="datetime-local"></label><label>Due / closes<input name="due_date" type="datetime-local" required></label></div>
 <label><input type="checkbox" name="allow_late" checked style="width:auto"> Allow late submissions</label><label>Question paper / worksheet<input type="file" name="file"></label><button class="btn btn-primary">Publish</button></form></details>`}
function bindBuilder(){const f=document.getElementById("abForm");if(!f)return;f.onsubmit=async e=>{e.preventDefault();const fd=new FormData(f),iso=v=>v?new Date(v).toISOString():null;
 try{const up=await uploadFile(fd.get("file"),"assignments");const {error}=await sb.from("assignments").insert({title:fd.get("title"),instructions:fd.get("instructions"),type:fd.get("type"),subject_id:fd.get("subject_id"),max_score:Number(fd.get("max_score"))||100,
  due_date:iso(fd.get("due_date")),opens_at:iso(fd.get("opens_at")),duration_minutes:Number(fd.get("duration_minutes"))||null,allow_late:fd.get("allow_late")==="on",attachment_url:up?.url||null,created_by:profile.id});
  if(error)throw error;showToast("Published.");rerender()}catch(err){showToast(err.message,"error")}}}

/* ---------- blog editor ---------- */
window.blogEditor=async function(id){const b=id?(await sb.from("blogs").select("*").eq("id",id).single()).data||{}:{};
 const wrap=(a,z="")=>()=>{const t=ta,s=t.selectionStart,e=t.selectionEnd;t.setRangeText(a+(t.value.slice(s,e)||"text")+(z||a),s,e,"end");t.dispatchEvent(new Event("input"));t.focus()};
 set(`<div class="page-bar"><h1>${id?"Edit":"Write"} article</h1><span class="muted" id="wc"></span></div><div class="editor"><form class="card" id="bf"><label>Title<input name="title" required value="${esc(b.title||"")}"></label>
 <div class="grid grid-2"><label>Category<input name="category" value="${esc(b.category||"")}" placeholder="Study skills"></label><label>Status<select name="is_published"><option value="true" ${b.is_published?"selected":""}>Published</option><option value="false" ${b.is_published===false||!id?"selected":""}>Draft</option></select></label></div>
 <label>Short summary (shown on cards)<input name="excerpt" maxlength="200" value="${esc(b.excerpt||"")}"></label><label>Cover image URL<input name="cover_image" type="url" value="${esc(b.cover_image||"")}"></label><label>…or upload a cover<input type="file" name="cover" accept="image/*"></label>
 <div class="md-bar"><button type="button" id="mB">B</button><button type="button" id="mI"><i>I</i></button><button type="button" id="mH">H2</button><button type="button" id="mL">• List</button><button type="button" id="mQ">❝</button><button type="button" id="mK">🔗</button></div>
 <textarea name="content" id="ta" rows="16" required>${esc(b.content||"")}</textarea><label style="flex-direction:row;gap:8px"><input type="checkbox" name="featured" ${b.featured?"checked":""} style="width:auto"> Feature this article at the top of the blog</label>
 <div style="display:flex;gap:10px"><button class="btn btn-primary">${id?"Save changes":"Save article"}</button><button type="button" class="btn btn-outline" onclick="render(activeTab())">Cancel</button></div></form>
 <aside class="card preview"><h3>Live preview</h3><div class="article-body" id="pv"></div></aside></div>`);
 const upd=()=>{pv.innerHTML=md(ta.value)||'<p class="muted">Start writing…</p>';const w=ta.value.trim().split(/\s+/).filter(Boolean).length;wc.textContent=`${w} words · ${Math.max(1,Math.round(w/200))} min read`};ta.oninput=upd;upd();
 mB.onclick=wrap("**");mI.onclick=wrap("*");mH.onclick=()=>{ta.setRangeText("\n## Heading\n",ta.selectionStart,ta.selectionEnd,"end");upd()};mL.onclick=()=>{ta.setRangeText("\n- item\n- item\n",ta.selectionStart,ta.selectionEnd,"end");upd()};
 mQ.onclick=()=>{ta.setRangeText("\n> quote\n",ta.selectionStart,ta.selectionEnd,"end");upd()};mK.onclick=()=>{ta.setRangeText("[text](https://)",ta.selectionStart,ta.selectionEnd,"end");upd()};
 bf.onsubmit=async e=>{e.preventDefault();const fd=new FormData(bf);try{const up=await uploadFile(fd.get("cover"),"blog"),title=fd.get("title").trim(),
  row={title,category:fd.get("category")||null,excerpt:fd.get("excerpt")||null,cover_image:up?.url||fd.get("cover_image")||null,content:fd.get("content"),is_published:fd.get("is_published")==="true",featured:fd.get("featured")==="on"};
  const r=id?await sb.from("blogs").update(row).eq("id",id):await sb.from("blogs").insert({...row,slug:slugify(title)+"-"+Date.now().toString(36),author_id:profile.id});
  if(r.error)throw r.error;showToast(id?"Article updated.":"Article saved.");blogList()}catch(err){showToast(err.message,"error")}}};
window.blogList=async()=>set(`<div class="page-bar"><h1>${profile.role==="admin"?"All Articles":"Your Articles"}</h1><button class="btn btn-primary" onclick="blogEditor()">＋ New article</button></div>${await blogsTable(profile.role!=="admin")}`);

/* ---------- teacher ---------- */
const _t6=teacherTab;
teacherTab=async function(tab){
 if(tab==="assignments"){set(`<h1>Assignments & Exams</h1>${builderForm()}<h3 style="margin-top:26px">Your assessments</h3>${await assessHub(true)}`);return bindBuilder()}
 if(tab==="blog")return blogList();
 return _t6(tab)};

/* ---------- admin ---------- */
const _a6=adminTab;
adminTab=async function(tab){
 if(tab==="overview"){const c=(t,f)=>{let q=sb.from(t).select("*",{count:"exact",head:true});return f?f(q):q};
  const [u,pend,sub,att,bl,ex,quiz,teach,sbm]=await Promise.all([c("profiles"),c("profiles",q=>q.eq("role","guest")),c("submissions",q=>q.eq("status","pending")),c("quiz_attempts"),c("blogs",q=>q.eq("is_published",true)),c("assignments",q=>q.eq("type","Exam")),c("quizzes"),
   sb.from("profiles").select("id,full_name,email,created_at").eq("role","guest").order("created_at",{ascending:false}).limit(6),sb.from("submissions").select("submitted_at,assignments(title),student:profiles!submissions_student_id_fkey(full_name)").order("submitted_at",{ascending:false}).limit(6)]);
  set(`<h1>System Overview</h1><div class="hub-stats">${stat("Users",u.count||0)}${stat("Awaiting approval",pend.count||0)}${stat("To grade",sub.count||0)}${stat("Exams",ex.count||0)}${stat("Quizzes",quiz.count||0)}${stat("Quiz attempts",att.count||0)}${stat("Live articles",bl.count||0)}</div>
  <div class="grid grid-2"><div class="card"><h3>Accounts waiting for approval</h3>${(teach.data||[]).map(p=>`<div style="display:flex;justify-content:space-between;gap:8px;margin-top:10px;align-items:center"><span>${esc(p.full_name||p.email)}<br><span class="muted" style="font-size:.8rem">${esc(p.email)}</span></span><span style="white-space:nowrap"><button class="btn btn-primary btn-sm" onclick="setRole('${p.id}','teacher')">Teacher</button> <button class="btn btn-outline btn-sm" onclick="setRole('${p.id}','student')">Student</button></span></div>`).join("")||'<p class="muted" style="margin-top:8px">Everyone is approved. ✅</p>'}</div>
  <div class="card"><h3>Latest submissions</h3>${(sbm.data||[]).map(s=>`<p style="margin-top:8px"><b>${esc(s.student?.full_name||"Student")}</b> · ${esc(s.assignments?.title||"")}<br><span class="muted" style="font-size:.8rem">${fmtDateTime(s.submitted_at)}</span></p>`).join("")||'<p class="muted" style="margin-top:8px">No submissions yet.</p>'}</div></div>
  <div class="card" style="margin-top:20px"><h3>Quick actions</h3><div class="chip-row" style="margin-top:10px">${[["assignments","Assignments & Exams"],["users","Users"],["blog","Write article"],["reports","Reports"],["settings","Announcement"]].map(([t,l])=>`<button class="chip" onclick="goTab('${t}')">${l}</button>`).join("")}</div></div>`);return}
 if(tab==="assignments"){set(`<h1>Assignments, CATs & Exams</h1>${builderForm()}<div style="margin-top:18px">${await assessHub(false)}</div>`);return bindBuilder()}
 if(tab==="blog"){return blogEditor()}
 if(tab==="blogs")return blogList();
 if(tab==="quizzes"){const {data}=await sb.from("quizzes").select("*,subjects(name),profiles(full_name),quiz_attempts(percentage)").order("created_at",{ascending:false});
  return set(`<h1>All Quizzes</h1>${tbl(["Quiz","Subject","Teacher","Status","Attempts","Average","Actions"],(data||[]).map(q=>{const a=q.quiz_attempts||[],avg=a.length?Math.round(a.reduce((x,y)=>x+Number(y.percentage),0)/a.length):0;
   return `<tr><td><b>${esc(q.title)}</b><br><span class="muted" style="font-size:.8rem">${q.time_limit_minutes} min · ${q.max_attempts||1} attempt(s)</span></td><td>${esc(q.subjects?.name||"")}</td><td>${esc(q.profiles?.full_name||"")}</td><td>${status(q.is_published)}</td><td>${a.length}</td><td>${avg}%</td>
   <td style="white-space:nowrap"><button class="btn btn-outline btn-sm" onclick="togglePub('quizzes','${q.id}',${!q.is_published})">${q.is_published?"Unpublish":"Publish"}</button> ${acts("quizzes",q.id)}</td></tr>`}).join(""))}`)}
 await _a6(tab);
 if(tab==="users"){const w=document.querySelector("#content .table-wrap");w.insertAdjacentHTML("beforebegin",`<div class="toolbar"><input id="uq" type="search" placeholder="Search name or email…"><select id="ur"><option value="">All roles</option><option>guest</option><option>student</option><option>teacher</option><option>admin</option></select><button class="btn btn-outline btn-sm" id="uc">Export CSV</button></div>`);
  const rows=[...w.querySelectorAll("tbody tr")],f=()=>rows.forEach(r=>r.classList.toggle("hidden",!(r.textContent.toLowerCase().includes(uq.value.toLowerCase())&&(!ur.value||r.querySelector("select")?.value===ur.value))));uq.oninput=f;ur.onchange=f;
  uc.onclick=()=>csv("users.csv",[["Name","Email","Class","Role"],...rows.map(r=>[...r.cells].slice(0,3).map(c=>c.textContent).concat(r.querySelector("select").value))])}
 if(tab==="reports"){const {data}=await sb.from("submissions").select("score,assignments(title,max_score,type)").not("score","is",null);const m={};(data||[]).forEach(s=>{const k=s.assignments?.title;if(!k)return;(m[k]=m[k]||{t:s.assignments.type,mx:s.assignments.max_score,v:[]}).v.push(Number(s.score))});
  document.getElementById("content").insertAdjacentHTML("beforeend",`<div class="card" style="margin-top:20px"><div style="display:flex;justify-content:space-between"><h3>Assignment & exam averages</h3><button class="btn btn-outline btn-sm" onclick="window.print()">Print</button></div>${tbl(["Title","Type","Graded","Average","Mean %"],Object.entries(m).map(([k,o])=>{const av=o.v.reduce((x,y)=>x+y,0)/o.v.length;return `<tr><td>${esc(k)}</td><td>${o.t}</td><td>${o.v.length}</td><td>${av.toFixed(1)}/${o.mx}</td><td>${pctOf(av,o.mx)}%</td></tr>`}).join(""))}</div>`)}};
window.setRole=async(id,r)=>{const {error}=await sb.from("profiles").update({role:r}).eq("id",id);if(error)return showToast(error.message,"error");showToast("Account approved as "+r+".");rerender()};
window.togglePub=async(t,id,v)=>{const {error}=await sb.from(t).update({is_published:v}).eq("id",id);if(error)return showToast(error.message,"error");showToast(v?"Published.":"Unpublished.");rerender()};
window.goTab=t=>{const a=document.querySelector(`#sideNav a[data-tab="${t}"]`);if(a)a.click();else render(t)};

/* ---------- student assignments & exams ---------- */
const _s6=studentTab;
studentTab=async function(tab){const ids=mySubjects.map(s=>s.id);if(tab!=="assignments"||!ids.length)return _s6(tab);
 const [a,s]=await Promise.all([sb.from("assignments").select("*,subjects(name)").in("subject_id",ids).order("due_date"),sb.from("submissions").select("*").eq("student_id",profile.id)]);
 const sub=Object.fromEntries((s.data||[]).map(x=>[x.assignment_id,x])),now=Date.now(),f=window._af||"todo";
 const st=x=>{const m=sub[x.id];if(m)return m.status!=="pending"?"graded":"submitted";if(x.opens_at&&new Date(x.opens_at)>now)return"soon";if(x.due_date&&new Date(x.due_date)<now)return x.allow_late===false?"closed":"overdue";return"todo"};
 const all=a.data||[],cnt=k=>all.filter(x=>k==="all"||st(x)===k||(k==="todo"&&["overdue","soon"].includes(st(x)))).length;
 const list=all.filter(x=>f==="all"||st(x)===f||(f==="todo"&&["overdue","soon"].includes(st(x))));
 set(`<h1>Assignments & Exams</h1><div class="chip-row" style="margin:14px 0">${[["todo","To do"],["submitted","Submitted"],["graded","Graded"],["all","All"]].map(([k,l])=>`<button class="chip ${f===k?"active":""}" data-af="${k}">${l} (${cnt(k)})</button>`).join("")}</div>
 <div class="grid grid-2">${list.map(x=>{const m=sub[x.id],k=st(x),can=k==="todo"||k==="overdue"||k==="submitted";
  const badge={graded:`<span class="badge badge-green">Graded · ${m?.score}/${x.max_score} (${pctOf(m?.score,x.max_score)}%)</span>`,submitted:'<span class="badge badge-blue">✓ Submitted</span>',overdue:'<span class="badge badge-red">Overdue</span>',closed:'<span class="badge badge-red">Closed</span>',soon:'<span class="badge badge-amber">Opens '+fmtDateTime(x.opens_at)+'</span>',todo:'<span class="badge badge-amber">To do</span>'}[k];
  return `<form class="card assignment-form type-${x.type} ${m?"is-done":""}" data-id="${x.id}"><div style="display:flex;justify-content:space-between;gap:8px"><span class="pill">${ICON[x.type]||""} ${x.type}</span>${badge}</div><h3 style="margin:8px 0">${esc(x.title)}</h3>
  ${k==="soon"?"":`<p class="muted">${esc(x.instructions)}</p>`}<p class="muted" style="font-size:.82rem;margin:6px 0">${esc(x.subjects?.name||"")} · ${x.max_score} marks${x.duration_minutes?" · ⏱ "+x.duration_minutes+" min":""} · Due ${fmtDateTime(x.due_date)} ${k==="submitted"||k==="graded"?"":dueTag(x.due_date)}</p>
  ${k!=="soon"&&x.attachment_url?`<a href="${esc(x.attachment_url)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Download paper</a>`:""}
  ${k==="graded"?`<p style="margin-top:12px"><b>Feedback:</b> ${esc(m.feedback||"No feedback.")}</p>`:can?`<label style="margin-top:12px">Your answer<textarea name="text_answer" rows="5" required>${esc(m?.text_answer||"")}</textarea></label><small class="muted cc"></small><label>Upload file (optional)<input type="file" name="file"></label><button class="btn btn-primary btn-sm">${m?"Resubmit":"Submit"}</button>${x.type==="Exam"&&!m?'<p class="muted" style="font-size:.78rem;margin-top:6px">Exam: your first submission counts, so check your answers before sending.</p>':""}`:""}</form>`}).join("")||empty_("Nothing in this list.")}</div>`);
 document.querySelectorAll("[data-af]").forEach(b=>b.onclick=()=>{window._af=b.dataset.af;studentTab("assignments")});
 document.querySelectorAll(".assignment-form").forEach(form=>{const id=form.dataset.id,ta=form.querySelector("textarea"),cc=form.querySelector(".cc");
  if(ta){const k="draft:"+id;try{if(!ta.value&&localStorage.getItem(k))ta.value=localStorage.getItem(k)}catch(_){}const u=()=>{cc.textContent=ta.value.length+" characters · draft saved on this device";try{localStorage.setItem(k,ta.value)}catch(_){}};ta.oninput=u;u()}
  form.onsubmit=async e=>{e.preventDefault();const fd=new FormData(form),old=sub[id];try{const {data:x}=await sb.from("assignments").select("due_date,allow_late").eq("id",id).maybeSingle();if(!x)throw new Error("This assignment no longer exists.");
   if(x.allow_late===false&&x.due_date&&new Date(x.due_date)<Date.now())throw new Error("Submissions for this item are closed.");
   const up=await uploadFile(fd.get("file"),"assignments"),{error}=await sb.from("submissions").upsert({assignment_id:id,student_id:profile.id,text_answer:fd.get("text_answer"),attachment_url:up?.url||old?.attachment_url||null,status:"pending",submitted_at:new Date().toISOString()},{onConflict:"assignment_id,student_id"});
   if(error)throw error;try{localStorage.removeItem("draft:"+id)}catch(_){}showToast("Submitted — well done!");studentTab("assignments")}catch(err){showToast(err.message,"error")}}})};

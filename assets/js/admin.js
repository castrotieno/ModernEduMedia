/* v6.1 admin: Class Lists, Gradebook (class / subject / type), student report cards, CSV + print */
menus.admin.splice(menus.admin.findIndex(m=>m[0]==="enrollments"),0,["classlist","Class Lists"],["gradebook","Gradebook"]);
window._gf=window._gf||{c:"",s:"",t:""};
const byName=(a,b)=>(a.full_name||a.email||"").localeCompare(b.full_name||b.email||"");
const nm=p=>p.full_name||p.email||"Student";
async function gbBase(){const f=_gf,[c,s]=await Promise.all([sb.from("classes").select("id,name").order("name"),sb.from("subjects").select("id,name,code,class_id").order("name")]);
 const C=c.data||[],S=s.data||[],subj=S.filter(x=>(!f.c||x.class_id===f.c)&&(!f.s||x.id===f.s));
 let q=sb.from("profiles").select("id,full_name,email,phone,admission_no,class_id,classes(name)").eq("role","student");if(f.c)q=q.eq("class_id",f.c);
 const [{data:st},{data:en}]=await Promise.all([q,sb.from("enrollments").select("student_id,subject_id").in("subject_id",subj.length?subj.map(x=>x.id):["00000000-0000-0000-0000-000000000000"])]);
 let P=(st||[]).sort((a,b)=>(a.classes?.name||"").localeCompare(b.classes?.name||"")||byName(a,b));const E=en||[];
 if(f.s)P=P.filter(p=>E.some(e=>e.student_id===p.id&&e.subject_id===f.s));
 return {C,S,subj,P,E}}
function gbBar(C,S,extra=""){const f=_gf;return `<div class="toolbar"><select id="fc"><option value="">All classes</option>${C.map(c=>`<option value="${c.id}" ${f.c===c.id?"selected":""}>${esc(c.name)}</option>`).join("")}</select>
 <select id="fs"><option value="">All subjects</option>${S.filter(s=>!f.c||s.class_id===f.c).map(s=>`<option value="${s.id}" ${f.s===s.id?"selected":""}>${esc(s.name)}</option>`).join("")}</select>${extra}<input id="fq" type="search" placeholder="Search student…"></div>`}
function gbBind(tab){const re=()=>render(tab);fc.onchange=()=>{_gf.c=fc.value;_gf.s="";re()};fs.onchange=()=>{_gf.s=fs.value;re()};if(window.ft)ft.onchange=()=>{_gf.t=ft.value;re()};
 fq.oninput=()=>document.querySelectorAll("#content tbody tr[data-n]").forEach(r=>r.classList.toggle("hidden",!r.dataset.n.includes(fq.value.toLowerCase())))}
const label=(C,S)=>[C.find(c=>c.id===_gf.c)?.name||"All classes",S.find(s=>s.id===_gf.s)?.name||"All subjects"].join(" · ");

async function classList(){const {C,S,subj,P,E}=await gbBase(),nameOf=Object.fromEntries(S.map(s=>[s.id,s.name]));
 const subs=p=>E.filter(e=>e.student_id===p.id).map(e=>nameOf[e.subject_id]).filter(Boolean);
 set(`<div class="page-bar"><h1>Class Lists</h1><div><button class="btn btn-primary btn-sm" id="dl">Download CSV</button> <button class="btn btn-outline btn-sm" onclick="print()">Print</button></div></div><p class="muted">${esc(label(C,S))} · ${P.length} student${P.length===1?"":"s"}</p>
 ${gbBar(C,S,_gf.c&&_gf.s?'<button class="btn btn-outline btn-sm" id="enAll">Enroll whole class in this subject</button>':"")}
 <div class="table-wrap"><table><thead><tr><th>#</th><th>Student</th><th>Adm. no</th><th>Class</th><th>Subjects</th><th>Phone</th><th>Email</th></tr></thead><tbody>${P.map((p,i)=>`<tr data-n="${esc((nm(p)+" "+(p.admission_no||"")).toLowerCase())}"><td>${i+1}</td>
 <td><a href="#" onclick="reportCard('${p.id}');return false"><b>${esc(nm(p))}</b></a></td><td>${esc(p.admission_no||"—")}</td><td><select data-mv="${p.id}">${C.map(c=>`<option value="${c.id}" ${c.id===p.class_id?"selected":""}>${esc(c.name)}</option>`).join("")}<option value="" ${p.class_id?"":"selected"}>—</option></select></td>
 <td>${subs(p).map(x=>`<span class="chip">${esc(x)}</span>`).join(" ")||"—"}</td><td>${esc(p.phone||"—")}</td><td>${esc(p.email||"")}</td></tr>`).join("")||'<tr><td colspan="7" class="muted center">No students match.</td></tr>'}</tbody></table></div>`);
 gbBind("classlist");
 dl.onclick=()=>csv(slugify(label(C,S))+"-class-list.csv",[["#","Name","Admission no","Class","Subjects","Phone","Email"],...P.map((p,i)=>[i+1,nm(p),p.admission_no,p.classes?.name,subs(p).join("; "),p.phone,p.email])]);
 document.querySelectorAll("[data-mv]").forEach(s=>s.onchange=async()=>{const {error}=await sb.from("profiles").update({class_id:s.value||null}).eq("id",s.dataset.mv);if(error)return showToast(error.message,"error");showToast("Student moved.");render("classlist")});
 if(window.enAll)enAll.onclick=async()=>{const have=new Set(E.filter(e=>e.subject_id===_gf.s).map(e=>e.student_id)),add=P.filter(p=>!have.has(p.id)).map(p=>({student_id:p.id,subject_id:_gf.s,class_id:_gf.c}));
  if(!add.length)return showToast("Everyone is already enrolled.");if(!confirm("Enroll "+add.length+" student(s)?"))return;const {error}=await sb.from("enrollments").insert(add);if(error)return showToast(error.message,"error");showToast(add.length+" students enrolled.");render("classlist")}}

async function gradebook(){const {C,S,subj,P}=await gbBase(),sids=subj.map(s=>s.id),none=["00000000-0000-0000-0000-000000000000"];
 let aq=sb.from("assignments").select("id,title,type,max_score,subject_id,due_date,subjects(name)").in("subject_id",sids.length?sids:none).order("due_date");if(_gf.t)aq=aq.eq("type",_gf.t);
 const [{data:A},{data:SB},{data:QA}]=await Promise.all([aq,sb.from("submissions").select("assignment_id,student_id,score,status,assignments!inner(subject_id)").in("assignments.subject_id",sids.length?sids:none),
  sb.from("quiz_attempts").select("quiz_id,student_id,percentage,quizzes!inner(subject_id)").in("quizzes.subject_id",sids.length?sids:none)]);
 const cols=(A||[]).sort((a,b)=>a.type.localeCompare(b.type)||new Date(a.due_date||0)-new Date(b.due_date||0)),cell={};(SB||[]).forEach(s=>cell[s.assignment_id+"|"+s.student_id]=s);
 const best={};(QA||[]).forEach(a=>{const k=a.student_id+"|"+a.quiz_id;best[k]=Math.max(best[k]||0,Number(a.percentage))});
 const qavg=id=>{const v=Object.entries(best).filter(([k])=>k.startsWith(id+"|")).map(([,x])=>x);return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):null};
 const mean=id=>{const v=cols.map(c=>cell[c.id+"|"+id]).map((s,i)=>s&&s.status!=="pending"&&s.score!=null?Number(s.score)/cols[i].max_score*100:null).filter(x=>x!==null);return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):null};
 const val=(c,p)=>{const s=cell[c.id+"|"+p.id];return !s?"":s.status!=="pending"&&s.score!=null?Number(s.score):"pending"};
 const colAvg=c=>{const v=P.map(p=>val(c,p)).filter(x=>typeof x==="number");return v.length?(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1):"—"};
 set(`<div class="page-bar"><h1>Gradebook</h1><div><button class="btn btn-primary btn-sm" id="dl">Download CSV</button> <button class="btn btn-outline btn-sm" onclick="print()">Print</button></div></div><p class="muted">${esc(label(C,S))} · ${P.length} students · ${cols.length} assessments. Click a name for a report card.</p>
 ${gbBar(C,S,`<select id="ft"><option value="">All types</option>${["Assignment","CAT","Exam"].map(t=>`<option ${_gf.t===t?"selected":""}>${t}</option>`).join("")}</select>`)}
 <div class="table-wrap"><table class="gb"><thead><tr><th>Student</th><th>Class</th>${cols.map(c=>`<th title="${esc(c.subjects?.name||"")}">${esc(c.title)}<br><span class="muted" style="font-weight:400;font-size:.75rem">${c.type} · /${c.max_score}</span></th>`).join("")}<th>Avg %</th><th>Quiz avg %</th></tr></thead><tbody>
 ${P.map(p=>`<tr data-n="${esc(nm(p).toLowerCase())}"><td><a href="#" onclick="reportCard('${p.id}');return false"><b>${esc(nm(p))}</b></a></td><td>${esc(p.classes?.name||"—")}</td>${cols.map(c=>{const v=val(c,p);return `<td class="center">${v===""?'<span class="muted">–</span>':v==="pending"?'<span class="badge badge-amber">in</span>':v}</td>`}).join("")}<td><b>${mean(p.id)??"—"}</b></td><td>${qavg(p.id)??"—"}</td></tr>`).join("")||`<tr><td colspan="${cols.length+4}" class="muted center">No students match.</td></tr>`}
 ${P.length?`<tr><td><b>Class average</b></td><td></td>${cols.map(c=>`<td class="center"><b>${colAvg(c)}</b></td>`).join("")}<td></td><td></td></tr>`:""}</tbody></table></div><p class="muted" style="font-size:.8rem;margin-top:8px">– not submitted · "in" = submitted, not yet graded. Avg % is the mean of graded assessments.</p>`);
 gbBind("gradebook");
 dl.onclick=()=>csv(slugify(label(C,S))+"-gradebook.csv",[["Student","Admission no","Class",...cols.map(c=>`${c.title} (${c.type}, /${c.max_score})`),"Average %","Quiz average %"],
  ...P.map(p=>[nm(p),p.admission_no,p.classes?.name,...cols.map(c=>{const v=val(c,p);return v==="pending"?"submitted":v}),mean(p.id),qavg(p.id)]),["Class average","","",...cols.map(colAvg),"",""]])}

window.reportCard=async id=>{const [{data:p},{data:s},{data:q}]=await Promise.all([sb.from("profiles").select("*,classes(name)").eq("id",id).single(),
 sb.from("submissions").select("score,status,feedback,submitted_at,assignments(title,type,max_score,subjects(name))").eq("student_id",id).order("submitted_at"),
 sb.from("quiz_attempts").select("attempt_no,score,total_marks,percentage,quizzes(title,subjects(name))").eq("student_id",id).order("submitted_at")]);
 const S=s||[],rows=S.map(x=>[x.assignments?.subjects?.name||"",x.assignments?.type||"",x.assignments?.title||"",x.status!=="pending"&&x.score!=null?x.score:"",x.assignments?.max_score,x.feedback||""]);
 set(`<div class="page-bar"><h1>Report card</h1><div><button class="btn btn-outline btn-sm" onclick="goTab('gradebook')">← Back</button> <button class="btn btn-primary btn-sm" id="rcd">Download CSV</button> <button class="btn btn-outline btn-sm" onclick="print()">Print</button></div></div>
 <div class="card"><h2>${esc(nm(p))}</h2><p class="muted">${esc(p.classes?.name||"No class")} · Adm. ${esc(p.admission_no||"—")} · ${esc(p.email||"")}</p></div>
 <h3 style="margin-top:22px">Assignments, CATs & Exams</h3>${tbl(["Subject","Type","Title","Score","Out of","Feedback"],rows.map(r=>`<tr>${r.map((c,i)=>`<td>${i===3&&c===""?'<span class="badge badge-amber">pending</span>':esc(c)}</td>`).join("")}</tr>`).join(""))}
 <h3 style="margin-top:22px">Quizzes</h3>${tbl(["Subject","Quiz","Attempt","Score","%"],(q||[]).map(x=>`<tr><td>${esc(x.quizzes?.subjects?.name||"")}</td><td>${esc(x.quizzes?.title||"")}</td><td>${x.attempt_no||1}</td><td>${x.score}/${x.total_marks}</td><td>${x.percentage}%</td></tr>`).join(""))}`);
 rcd.onclick=()=>csv(slugify(nm(p))+"-report.csv",[["Subject","Type","Title","Score","Out of","Feedback"],...rows,[],["Quiz","Attempt","Score","Percent"],...(q||[]).map(x=>[x.quizzes?.title,x.attempt_no||1,x.score+"/"+x.total_marks,x.percentage])])};

const _a8=adminTab;adminTab=async function(tab){if(tab==="classlist")return classList();if(tab==="gradebook")return gradebook();return _a8(tab)};

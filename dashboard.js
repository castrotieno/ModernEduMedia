let profile=null,mySubjects=[],myClassId=null;
const menus={
 student:[["overview","📊 Overview"],["resources","📚 Notes & Downloads"],["assignments","📝 Assignments"],["quizzes","🧠 Quizzes & CATs"],["grades","🏆 My Results"],["enroll","🎯 Enrollment"],["profile","👤 My Profile"]],
 teacher:[["overview","📊 Overview"],["resources","📎 Upload Resources"],["assignments","📝 Assignment Builder"],["quizzes","🧠 Quiz Builder"],["grading","✅ Grading Console"],["blog","✍️ Blog Author"],["students","👥 My Students"]],
 admin:[["overview","📊 System Overview"],["users","👥 User Management"],["classes","🏫 Classes"],["subjects","📚 Subjects"],["enrollments","🎯 Enrollments"],["resources","📎 All Resources"],["assignments","📝 All Assignments"],["quizzes","🧠 All Quizzes"],["reports","📈 Reports"],["settings","⚙️ Site Settings"]]
};
async function init(){profile=await getProfile();if(!profile)return location.href="login.html";myClassId=profile.class_id;
document.getElementById("userBadge").textContent=`${profile.full_name||profile.email} • ${profile.role}`;
document.getElementById("roleTitle").textContent=profile.role.charAt(0).toUpperCase()+profile.role.slice(1)+" Portal";
document.getElementById("roleSubtitle").textContent="Personalized academic workspace";
document.getElementById("sideNav").innerHTML=menus[profile.role].map(([id,label],i)=>`<a href="#" data-tab="${id}" class="${i==0?"active":""}">${label}</a>`).join("");
document.querySelectorAll("#sideNav a").forEach(a=>a.onclick=e=>{e.preventDefault();document.querySelectorAll("#sideNav a").forEach(x=>x.classList.remove("active"));a.classList.add("active");render(a.dataset.tab)});
render("overview")}
function set(h){document.getElementById("content").innerHTML=h}
function stat(l,v){return `<div class="stat"><strong>${v}</strong><span>${l}</span></div>`}
function dashHead(title,subtitle,action=""){return `<div class="dash-head"><div><h1>${title}</h1><p class="muted">${subtitle}</p></div>${action}</div>`}
async function loadMySubjects(){if(profile.role==="student"){const {data}=await sb.from("enrollments").select("subject_id,subjects(*,classes(name))").eq("student_id",profile.id);mySubjects=(data||[]).map(x=>x.subjects)}
else{const {data}=await sb.from("subjects").select("*,classes(name)");mySubjects=profile.role==="admin"?(data||[]):(data||[]).filter(s=>s.teacher_id===profile.id)}}
async function render(tab){await loadMySubjects();if(profile.role==="student")return studentTab(tab);if(profile.role==="teacher")return teacherTab(tab);if(profile.role==="admin")return adminTab(tab)}
function subjectOptions(sel=""){return mySubjects.map(s=>`<option value="${s.id}" ${s.id==sel?"selected":""}>${esc(s.name)} — ${esc(s.classes?.name||"")}</option>`).join("")}

async function studentTab(tab){
 if(tab==="overview"){const ids=mySubjects.map(s=>s.id);
 const [r,a,q,at]=await Promise.all([sb.from("resources").select("*",{count:"exact",head:true}).in("subject_id",ids),sb.from("assignments").select("*",{count:"exact",head:true}).in("subject_id",ids),sb.from("quizzes").select("*",{count:"exact",head:true}).in("subject_id",ids).eq("is_published",true),sb.from("quiz_attempts").select("*",{count:"exact",head:true}).eq("student_id",profile.id)]);
 set(dashHead(`Welcome, ${esc(profile.full_name||"Student")}`,"Your personalized learning workspace")+`<div class="stat-grid">${stat("Enrolled subjects",mySubjects.length)}${stat("Resources",r.count||0)}${stat("Assignments",a.count||0)}${stat("Quizzes",q.count||0)}${stat("Quiz attempts",at.count||0)}</div><div class="card"><h3>My subjects</h3><div class="chip-row">${mySubjects.map(s=>`<span class="chip">${esc(s.name)}</span>`).join("")||'<span class="muted">No subjects enrolled.</span>'}</div></div>`)}
 if(tab==="resources"){const ids=mySubjects.map(s=>s.id);if(!ids.length)return set('<div class="card empty">Enroll in subjects to access resources.</div>');
 const {data}=await sb.from("resources").select("*,subjects(name)").in("subject_id",ids).order("created_at",{ascending:false});
 set(dashHead("Notes & Downloads","Learning materials for your enrolled subjects")+`<div class="grid grid-3">${(data||[]).map(x=>`<div class="card blog-card"><div class="blog-cover">${x.type==="video_link"?"🎬":x.type==="image"?"🖼️":"📄"}</div><div class="blog-body"><span class="pill">${esc(x.type.replace("_"," "))}</span><h3>${esc(x.title)}</h3><p class="muted">${esc(x.description)}</p><div class="blog-meta"><span>${esc(x.subjects?.name||"")}</span></div><div style="display:flex;gap:9px;margin-top:16px"><a class="btn btn-gradient btn-sm" href="${x.file_url}" download>Download</a><a class="btn btn-outline btn-sm" href="${x.file_url}" target="_blank">Preview</a></div></div></div>`).join("")||'<div class="card empty">No resources.</div>'}</div>`)}
 if(tab==="assignments"){const ids=mySubjects.map(s=>s.id);if(!ids.length)return set('<div class="card empty">Enroll first.</div>');
 const {data}=await sb.from("assignments").select("*,subjects(name)").in("subject_id",ids).order("due_date");
 set(dashHead("Assignments","Submit your work before the deadline")+`<div class="grid grid-2">${(data||[]).map(a=>`<form class="card assignment-form" data-id="${a.id}"><span class="pill">${a.type}</span><h3>${esc(a.title)}</h3><p class="muted">${esc(a.instructions)}</p><div class="blog-meta"><span>${a.max_score} marks</span><span>•</span><span>Due ${fmtDate(a.due_date)}</span></div>${a.attachment_url?`<a href="${a.attachment_url}" target="_blank" class="muted">Download attachment</a>`:""}<label>Your answer<textarea name="text_answer" required></textarea></label><label>Upload file<input type="file" name="file"></label><button class="btn btn-gradient btn-sm">Submit assignment</button></form>`).join("")||'<div class="card empty">No assignments.</div>'}</div>`);
 document.querySelectorAll(".assignment-form").forEach(form=>form.onsubmit=async e=>{e.preventDefault();const fd=new FormData(form);
 try{const up=await uploadFile(fd.get("file"),"assignments");
 const {error}=await sb.from("submissions").upsert({assignment_id:form.dataset.id,student_id:profile.id,text_answer:fd.get("text_answer"),attachment_url:up?.url||null,status:"pending",submitted_at:new Date().toISOString()},{onConflict:"assignment_id,student_id"});
 if(error)throw error;showToast("Assignment submitted.");form.reset()}catch(err){showToast(err.message,"error")}})}
 if(tab==="quizzes"){const ids=mySubjects.map(s=>s.id);if(!ids.length)return set('<div class="card empty">Enroll first.</div>');
 const {data}=await sb.from("quizzes").select("*,subjects(name)").in("subject_id",ids).eq("is_published",true);
 set(dashHead("Quizzes & CATs","Test your understanding with instant results")+`<div class="grid grid-3">${(data||[]).map(q=>`<div class="card"><span class="pill">Quiz</span><h3>${esc(q.title)}</h3><p class="muted">${esc(q.description)}</p><div class="blog-meta"><span>${esc(q.subjects?.name||"")}</span><span>•</span><span>${q.time_limit_minutes} min</span></div><button class="btn btn-gradient btn-sm" style="margin-top:16px" onclick="startQuiz('${q.id}')">Start quiz</button></div>`).join("")||'<div class="card empty">No quizzes.</div>'}</div>`)}
 if(tab==="grades"){const [s,q]=await Promise.all([sb.from("submissions").select("*,assignments(title,max_score,subjects(name))").eq("student_id",profile.id),sb.from("quiz_attempts").select("*,quizzes(title,subjects(name))").eq("student_id",profile.id)]);
 set(dashHead("My Results","Assignments, quizzes and teacher feedback")+`<div class="card"><h3>Assignment results</h3><div class="table-wrap"><table><thead><tr><th>Assignment</th><th>Subject</th><th>Score</th><th>Status</th><th>Feedback</th></tr></thead><tbody>${(s.data||[]).map(x=>`<tr><td>${esc(x.assignments?.title||"")}</td><td>${esc(x.assignments?.subjects?.name||"")}</td><td>${x.score??"—"}/${x.assignments?.max_score??""}</td><td><span class="badge ${x.status==="pending"?"badge-amber":"badge-green"}">${x.status}</span></td><td>${esc(x.feedback||"—")}</td></tr>`).join("")}</tbody></table></div></div><div class="card" style="margin-top:22px"><h3>Quiz results</h3><div class="table-wrap"><table><thead><tr><th>Quiz</th><th>Subject</th><th>Score</th><th>Percentage</th></tr></thead><tbody>${(q.data||[]).map(x=>`<tr><td>${esc(x.quizzes?.title||"")}</td><td>${esc(x.quizzes?.subjects?.name||"")}</td><td>${x.score}/${x.total_marks}</td><td>${x.percentage}%</td></tr>`).join("")}</tbody></table></div></div>`)}
 if(tab==="enroll"){const [{data:subjects},{data:enrolled}]=await Promise.all([sb.from("subjects").select("*,classes(name)").eq("class_id",myClassId),sb.from("enrollments").select("subject_id").eq("student_id",profile.id)]);
 const ids=(enrolled||[]).map(e=>e.subject_id);
 set(dashHead("Subject Enrollment","Choose subjects available in your registered class")+`<div class="grid grid-3">${(subjects||[]).map(s=>`<div class="card"><h3>${esc(s.name)}</h3><p class="muted">${esc(s.code)} • ${esc(s.classes?.name||"")}</p>${ids.includes(s.id)?'<span class="badge badge-green">Enrolled</span>':`<button class="btn btn-gradient btn-sm" onclick="enroll('${s.id}')">Enroll</button>`}</div>`).join("")||'<div class="card empty">No subjects for your class.</div>'}</div>`)}
 if(tab==="profile"){set(dashHead("My Profile","Update your personal details")+`<form class="card" id="profileForm"><label>Full name<input name="full_name" value="${esc(profile.full_name||"")}"></label><label>Phone<input name="phone" value="${esc(profile.phone||"")}"></label><label>Admission number<input name="admission_no" value="${esc(profile.admission_no||"")}"></label><button class="btn btn-gradient">Save changes</button></form>`);
 document.getElementById("profileForm").onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form);
 const {error}=await sb.from("profiles").update({full_name:f.get("full_name"),phone:f.get("phone"),admission_no:f.get("admission_no")}).eq("id",profile.id);
 if(error)return showToast(error.message,"error");showToast("Profile updated.")}}
}
async function enroll(id){const {error}=await sb.from("enrollments").insert({student_id:profile.id,subject_id:id,class_id:myClassId});if(error)return showToast(error.message,"error");showToast("Enrolled.");render("enroll")}

window.startQuiz=async function(id){const [{data:quiz},{data:qs}]=await Promise.all([sb.from("quizzes").select("*").eq("id",id).single(),sb.from("quiz_questions").select("*").eq("quiz_id",id).order("created_at")]);
set(dashHead(quiz.title,quiz.description)+`<form id="quizForm">${(qs||[]).map((q,i)=>`<div class="question"><strong>Q${i+1}. ${esc(q.question_text)}</strong> <span class="badge badge-blue">${q.marks} marks</span>
${q.question_type==="multiple_choice"?(q.options||[]).map(o=>`<label class="option"><input type="radio" name="q_${q.id}" value="${esc(o)}" required> ${esc(o)}</label>`).join(""):""}
${q.question_type==="true_false"?`<label class="option"><input type="radio" name="q_${q.id}" value="True" required> True</label><label class="option"><input type="radio" name="q_${q.id}" value="False"> False</label>`:""}
${q.question_type==="short_answer"?`<input name="q_${q.id}" placeholder="Your answer" required>`:""}
${q.question_type==="structured"?`<textarea name="q_${q.id}" rows="4"></textarea>`:""}</div>`).join("")}<button class="btn btn-gradient">Submit quiz</button></form>`);
document.getElementById("quizForm").onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);let score=0,total=0;const answers={};
(qs||[]).forEach(q=>{const v=fd.get("q_"+q.id);answers[q.id]=v;total+=Number(q.marks);if(["multiple_choice","true_false","short_answer"].includes(q.question_type)&&String(v||"").trim().toLowerCase()===String(q.correct_answer).trim().toLowerCase())score+=Number(q.marks)});
const pct=total?Math.round(score/total*100):0;
const {error}=await sb.from("quiz_attempts").upsert({quiz_id:id,student_id:profile.id,answers,score,total_marks:total,percentage:pct,submitted_at:new Date().toISOString()},{onConflict:"quiz_id,student_id"});
if(error)return showToast(error.message,"error");
set(`<div class="card center"><h1>Quiz submitted</h1><div class="stat" style="display:inline-block"><strong>${score}/${total}</strong><span>${pct}%</span></div><div class="progress" style="margin-top:20px"><div style="width:${pct}%"></div></div><div style="margin-top:24px"><button class="btn btn-gradient" onclick="render('quizzes')">Back to quizzes</button></div></div>`);showToast(`Scored ${pct}%`)}}

async function teacherTab(tab){
 if(tab==="overview"){const [r,a,q,s]=await Promise.all([sb.from("resources").select("*",{count:"exact",head:true}).eq("uploaded_by",profile.id),sb.from("assignments").select("*",{count:"exact",head:true}).eq("created_by",profile.id),sb.from("quizzes").select("*",{count:"exact",head:true}).eq("created_by",profile.id),sb.from("submissions").select("*",{count:"exact",head:true}).eq("status","pending")]);
 set(dashHead("Teacher Workspace","Create content, assess learners and track performance")+`<div class="stat-grid">${stat("Resources",r.count||0)}${stat("Assignments",a.count||0)}${stat("Quizzes",q.count||0)}${stat("Pending grading",s.count||0)}</div>`)}
 if(tab==="resources"){set(dashHead("Upload Resources","Publish notes, worksheets, videos and attachments")+`<form class="card" id="resourceUploadForm"><label>Title<input name="title" required></label><label>Description<textarea name="description" required></textarea></label>
 <div class="grid grid-2"><label>Type<select name="type"><option value="notes_pdf">PDF Notes</option><option value="video_link">Video Link</option><option value="document">Document</option><option value="image">Image</option><option value="attachment">Attachment</option></select></label><label>Subject<select name="subject_id">${subjectOptions()}</select></label></div>
 <label>Upload file<input type="file" name="file"></label><label>Or video URL<input name="video_url" type="url"></label><button class="btn btn-gradient">Upload & publish</button></form>`);
 const form=document.getElementById("resourceUploadForm");
 form.onsubmit=async e=>{e.preventDefault();const fd=new FormData(form);
 try{let up=await uploadFile(fd.get("file"),"resources");let url=fd.get("video_url");if(up)url=up.url;
 if(!url)throw new Error("Upload a file or enter a video URL");
 const {error}=await sb.from("resources").insert({title:fd.get("title"),description:fd.get("description"),type:fd.get("type"),file_url:url,storage_path:up?.path||null,file_name:fd.get("file")?.name||null,file_size:fd.get("file")?.size||null,subject_id:fd.get("subject_id"),uploaded_by:profile.id});
 if(error)throw error;showToast("Resource published.");form.reset()}catch(err){showToast(err.message,"error")}}}
 if(tab==="assignments"){set(dashHead("Assignment Builder","Create assignments, CATs and exams")+`<form class="card" id="assignmentBuilderForm"><label>Title<input name="title" required></label><label>Instructions<textarea name="instructions" required></textarea></label>
 <div class="grid grid-2"><label>Type<select name="type"><option>Assignment</option><option>CAT</option><option>Exam</option></select></label><label>Subject<select name="subject_id">${subjectOptions()}</select></label><label>Maximum score<input name="max_score" type="number" value="100"></label><label>Due date<input name="due_date" type="datetime-local" required></label></div>
 <label>Attach worksheet / question paper<input type="file" name="file"></label><button class="btn btn-gradient">Create assignment</button></form>`);
 const form=document.getElementById("assignmentBuilderForm");
 form.onsubmit=async e=>{e.preventDefault();const fd=new FormData(form);
 try{const up=await uploadFile(fd.get("file"),"assignments");
 const {error}=await sb.from("assignments").insert({title:fd.get("title"),instructions:fd.get("instructions"),type:fd.get("type"),subject_id:fd.get("subject_id"),max_score:Number(fd.get("max_score")),due_date:fd.get("due_date"),attachment_url:up?.url||null,created_by:profile.id});
 if(error)throw error;showToast("Assignment created.");form.reset()}catch(err){showToast(err.message,"error")}}}
 if(tab==="quizzes"){set(dashHead("Quiz Builder","Create auto-graded assessments")+`<form class="card" id="quizCreateForm"><label>Quiz title<input name="title" required></label><label>Description<textarea name="description"></textarea></label><div class="grid grid-2"><label>Subject<select name="subject_id">${subjectOptions()}</select></label><label>Time limit<input name="time_limit_minutes" type="number" value="30"></label></div><button class="btn btn-gradient">Create quiz</button></form><div id="questionArea"></div>`);
 document.getElementById("quizCreateForm").onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,fd=new FormData(form);
 const {data,error}=await sb.from("quizzes").insert({title:fd.get("title"),description:fd.get("description"),subject_id:fd.get("subject_id"),time_limit_minutes:Number(fd.get("time_limit_minutes")),created_by:profile.id,is_published:true}).select().single();
 if(error)return showToast(error.message,"error");showToast("Quiz created.");form.reset();window.currentQuizId=data.id;renderQuestionBuilder()}}
 if(tab==="grading"){const {data}=await sb.from("submissions").select("*,assignments(title,max_score),profiles(full_name)").order("submitted_at",{ascending:false});
 set(dashHead("Grading Console","Review submissions and provide feedback")+`<div class="grid grid-2">${(data||[]).map(s=>`<form class="card grade-form" data-id="${s.id}"><strong>${esc(s.profiles?.full_name||"Student")}</strong><p class="muted">${esc(s.assignments?.title||"")}</p><p>${esc(s.text_answer||"")}</p>${s.attachment_url?`<a href="${s.attachment_url}" target="_blank">Attachment</a>`:""}<label>Score<input name="score" type="number" value="${s.score??""}"></label><label>Feedback<input name="feedback" value="${esc(s.feedback||"")}"></label><button class="btn btn-gradient btn-sm">Save grade</button></form>`).join("")||'<div class="card empty">No submissions.</div>'}</div>`);
 document.querySelectorAll(".grade-form").forEach(f=>f.onsubmit=async e=>{e.preventDefault();const fd=new FormData(f);
 const {error}=await sb.from("submissions").update({score:Number(fd.get("score")),feedback:fd.get("feedback"),status:"graded"}).eq("id",f.dataset.id);
 if(error)return showToast(error.message,"error");showToast("Graded.");render("grading")})}
 if(tab==="blog"){set(dashHead("Blog Author","Publish educational articles")+`<form class="card" id="blogForm"><label>Title<input name="title" required></label><label>Category<input name="category"></label><label>Content<textarea name="content" rows="10" required></textarea></label><label>Status<select name="is_published"><option value="true">Publish</option><option value="false">Draft</option></select></label><button class="btn btn-gradient">Save post</button></form>`);
 document.getElementById("blogForm").onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,fd=new FormData(form),title=fd.get("title");
 const {error}=await sb.from("blogs").insert({title,slug:slugify(title)+"-"+Date.now().toString(36),content:fd.get("content"),category:fd.get("category"),author_id:profile.id,is_published:fd.get("is_published")==="true"});
 if(error)return showToast(error.message,"error");showToast("Blog saved.");form.reset()}}
 if(tab==="students"){const {data}=await sb.from("enrollments").select("*,profiles(full_name,email),subjects(name)").order("enrolled_at",{ascending:false});
 set(dashHead("Enrolled Students","Students taking your subjects")+`<div class="table-wrap"><table><thead><tr><th>Student</th><th>Subject</th><th>Date</th></tr></thead><tbody>${(data||[]).map(e=>`<tr><td>${esc(e.profiles?.full_name||"")}</td><td>${esc(e.subjects?.name||"")}</td><td>${fmtDate(e.enrolled_at)}</td></tr>`).join("")}</tbody></table></div>`)}
}
function renderQuestionBuilder(){if(!window.currentQuizId)return set('<div class="card empty">Create a quiz first.</div>');
set(dashHead("Quiz Questions","Add auto-graded and manual questions")+`<form class="card" id="questionForm"><label>Type<select name="question_type" onchange="toggleQType(this.value)"><option value="multiple_choice">Multiple choice</option><option value="true_false">True / False</option><option value="short_answer">Short answer</option><option value="structured">Structured</option></select></label>
<label>Question<textarea name="question_text" required></textarea></label><div id="mcqOptions"><label>Options (comma separated)<input name="options" placeholder="A, B, C, D"></label></div>
<label>Correct answer<input name="correct_answer" required></label><label>Marks<input name="marks" type="number" value="1"></label><button class="btn btn-gradient">Add question</button></form>`);
document.getElementById("questionForm").onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,fd=new FormData(form),type=fd.get("question_type");
const opts=type==="multiple_choice"?fd.get("options").split(",").map(x=>x.trim()).filter(Boolean):[];
const {error}=await sb.from("quiz_questions").insert({quiz_id:window.currentQuizId,question_type:type,question_text:fd.get("question_text"),options:opts,correct_answer:fd.get("correct_answer"),marks:Number(fd.get("marks")),explanation:fd.get("explanation")});
if(error)return showToast(error.message,"error");showToast("Question added.");form.reset()}}
window.toggleQType=v=>document.getElementById("mcqOptions")?.classList.toggle("hidden",v!=="multiple_choice");

function editModal(title,fields,onSave){
 openModal(`<h3>${title}</h3><form id="editForm">${fields.map(f=>`<label>${f.label}${f.type==="textarea"?`<textarea name="${f.name}" rows="4">${esc(f.value||"")}</textarea>`:f.type==="select"?`<select name="${f.name}">${f.options.map(o=>`<option value="${esc(o.value)}" ${o.value==f.value?"selected":""}>${esc(o.label)}</option>`).join("")}</select>`:`<input name="${f.name}" type="${f.type||"text"}" value="${esc(f.value||"")}">`}</label>`).join("")}
 <div style="display:flex;gap:10px"><button class="btn btn-gradient">Save changes</button><button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button></div></form>`);
 document.getElementById("editForm").onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const values={};fd.forEach((v,k)=>values[k]=v);await onSave(values)};
}

async function adminTab(tab){
 if(tab==="overview"){const t=["profiles","classes","subjects","enrollments","resources","assignments","quizzes","submissions","quiz_attempts"];const r=await Promise.all(t.map(x=>sb.from(x).select("*",{count:"exact",head:true})));
 set(dashHead("Admin Command Center","Complete visibility and control of ModernEduMedia")+`<div class="stat-grid">${t.map((x,i)=>stat(x.replace("_"," "),r[i].count||0)).join("")}</div>`)}
 if(tab==="users"){const {data}=await sb.from("profiles").select("*,classes(name)").order("created_at",{ascending:false});
 set(dashHead("User Management","Search, update roles, edit or remove users")+`<div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Class</th><th>Role</th><th>Actions</th></tr></thead><tbody>${(data||[]).map(u=>`<tr><td>${esc(u.full_name)}</td><td>${esc(u.email)}</td><td>${esc(u.classes?.name||"—")}</td><td><span class="badge badge-blue">${u.role}</span></td><td><button class="btn btn-outline btn-sm" onclick="editUser('${u.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')">Delete</button></td></tr>`).join("")}</tbody></table></div>`)}
 if(tab==="classes"){const {data}=await sb.from("classes").select("*").order("name");
 set(dashHead("Classes","Create, update or remove academic classes")+`<form class="card" id="classForm"><label>Class name<input name="name" required></label><label>Academic year<input name="academic_year" required></label><label>Description<input name="description"></label><button class="btn btn-gradient">Add class</button></form><div class="table-wrap"><table><thead><tr><th>Class</th><th>Year</th><th>Description</th><th>Actions</th></tr></thead><tbody>${(data||[]).map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.academic_year)}</td><td>${esc(c.description||"—")}</td><td><button class="btn btn-outline btn-sm" onclick="editClass('${c.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteRow('classes','${c.id}')">Delete</button></td></tr>`).join("")}</tbody></table></div>`);
 document.getElementById("classForm").onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,fd=new FormData(form);
 const {error}=await sb.from("classes").insert({name:fd.get("name"),academic_year:fd.get("academic_year"),description:fd.get("description")});
 if(error)return showToast(error.message,"error");showToast("Class added.");form.reset();render("classes")}}
 if(tab==="subjects"){const [{data:classes},{data:subjects},{data:teachers}]=await Promise.all([sb.from("classes").select("*"),sb.from("subjects").select("*,classes(name),profiles(full_name)").order("name"),sb.from("profiles").select("*").in("role",["teacher","admin"])]);
 window.adminClasses=classes;window.adminTeachers=teachers;
 set(dashHead("Subjects","Manage subjects, classes and teacher allocation")+`<form class="card" id="subjectForm"><div class="grid grid-2"><label>Code<input name="code" required></label><label>Name<input name="name" required></label><label>Class<select name="class_id">${classes.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label><label>Teacher<select name="teacher_id"><option value="">Unassigned</option>${teachers.map(t=>`<option value="${t.id}">${esc(t.full_name)}</option>`).join("")}</select></label></div><button class="btn btn-gradient">Add subject</button></form>
 <div class="table-wrap"><table><thead><tr><th>Subject</th><th>Code</th><th>Class</th><th>Teacher</th><th>Actions</th></tr></thead><tbody>${(subjects||[]).map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.code)}</td><td>${esc(s.classes?.name||"")}</td><td>${esc(s.profiles?.full_name||"Unassigned")}</td><td><button class="btn btn-outline btn-sm" onclick="editSubject('${s.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteRow('subjects','${s.id}')">Delete</button></td></tr>`).join("")}</tbody></table></div>`);
 document.getElementById("subjectForm").onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,fd=new FormData(form);
 const {error}=await sb.from("subjects").insert({code:fd.get("code"),name:fd.get("name"),class_id:fd.get("class_id"),teacher_id:fd.get("teacher_id")||null});
 if(error)return showToast(error.message,"error");showToast("Subject added.");form.reset();render("subjects")}}
 if(tab==="enrollments"){const {data}=await sb.from("enrollments").select("*,profiles(full_name),subjects(name),classes(name)").order("enrolled_at",{ascending:false});
 set(dashHead("Enrollments","Review and manage student subject access")+`<div class="table-wrap"><table><thead><tr><th>Student</th><th>Subject</th><th>Class</th><th>Date</th><th>Action</th></tr></thead><tbody>${(data||[]).map(e=>`<tr><td>${esc(e.profiles?.full_name||"")}</td><td>${esc(e.subjects?.name||"")}</td><td>${esc(e.classes?.name||"—")}</td><td>${fmtDate(e.enrolled_at)}</td><td><button class="btn btn-danger btn-sm" onclick="deleteRow('enrollments','${e.id}')">Remove</button></td></tr>`).join("")}</tbody></table></div>`)}
 if(tab==="resources"){const {data}=await sb.from("resources").select("*,subjects(name),profiles(full_name)").order("created_at",{ascending:false});
 set(dashHead("All Resources","View, edit or remove learning materials")+`<div class="table-wrap"><table><thead><tr><th>Title</th><th>Subject</th><th>Teacher</th><th>Type</th><th>Actions</th></tr></thead><tbody>${(data||[]).map(r=>`<tr><td>${esc(r.title)}</td><td>${esc(r.subjects?.name||"")}</td><td>${esc(r.profiles?.full_name||"")}</td><td>${r.type}</td><td><a class="btn btn-outline btn-sm" href="${r.file_url}" target="_blank">View</a> <button class="btn btn-outline btn-sm" onclick="editResource('${r.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteResource('${r.id}','${r.storage_path||""}');setTimeout(()=>render('resources'),900)">Delete</button></td></tr>`).join("")}</tbody></table></div>`)}
 if(tab==="assignments"){const {data}=await sb.from("assignments").select("*,subjects(name)").order("created_at",{ascending:false});
 set(dashHead("All Assignments","Manage every assessment in the system")+`<div class="table-wrap"><table><thead><tr><th>Title</th><th>Subject</th><th>Type</th><th>Marks</th><th>Due</th><th>Actions</th></tr></thead><tbody>${(data||[]).map(a=>`<tr><td>${esc(a.title)}</td><td>${esc(a.subjects?.name||"")}</td><td>${a.type}</td><td>${a.max_score}</td><td>${fmtDate(a.due_date)}</td><td><button class="btn btn-outline btn-sm" onclick="editAssignment('${a.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteRow('assignments','${a.id}')">Delete</button></td></tr>`).join("")}</tbody></table></div>`)}
 if(tab==="quizzes"){const {data}=await sb.from("quizzes").select("*,subjects(name),quiz_attempts(score,percentage)").order("created_at",{ascending:false});
 set(dashHead("All Quizzes","Monitor quiz performance and manage assessments")+`<div class="table-wrap"><table><thead><tr><th>Quiz</th><th>Subject</th><th>Attempts</th><th>Average</th><th>Actions</th></tr></thead><tbody>${(data||[]).map(q=>{const a=q.quiz_attempts||[];const avg=a.length?Math.round(a.reduce((x,y)=>x+y.percentage,0)/a.length):0;return `<tr><td>${esc(q.title)}</td><td>${esc(q.subjects?.name||"")}</td><td>${a.length}</td><td>${avg}%</td><td><button class="btn btn-outline btn-sm" onclick="editQuiz('${q.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteRow('quizzes','${q.id}')">Delete</button></td></tr>`}).join("")}</tbody></table></div>`)}
 if(tab==="reports"){const {data}=await sb.from("quiz_attempts").select("*,profiles(full_name),quizzes(title)").order("percentage",{ascending:false});
 set(dashHead("Reports & Analytics","Institution-wide performance insights")+`<div class="card"><div style="display:flex;justify-content:space-between"><h3>Performance leaderboard</h3><button class="btn btn-outline btn-sm" onclick="window.print()">Print / PDF</button></div><div class="table-wrap"><table><thead><tr><th>#</th><th>Student</th><th>Quiz</th><th>Score</th><th>%</th></tr></thead><tbody>${(data||[]).slice(0,30).map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.profiles?.full_name||"")}</td><td>${esc(r.quizzes?.title||"")}</td><td>${r.score}/${r.total_marks}</td><td>${r.percentage}%</td></tr>`).join("")}</tbody></table></div></div>`)}
 if(tab==="settings"){const {data}=await sb.from("site_settings").select("*");const m=Object.fromEntries((data||[]).map(s=>[s.key,s.value]));
 set(dashHead("Site Settings","Configure contact details and announcements")+`<form class="card" id="settingsForm"><label>Contact email<input name="contact_email" value="${esc(m.contact_email||CONTACT_EMAIL)}"></label><label>WhatsApp<input name="whatsapp_number" value="${esc(m.whatsapp_number||"+254741637904")}"></label><label>Announcement<textarea name="announcement">${esc(m.announcement||"")}</textarea></label><button class="btn btn-gradient">Save settings</button></form>`);
 document.getElementById("settingsForm").onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,fd=new FormData(form);
 const rows=[...fd.entries()].map(([key,value])=>({key,value:String(value)}));
 const {error}=await sb.from("site_settings").upsert(rows,{onConflict:"key"});if(error)return showToast(error.message,"error");showToast("Settings saved.")}}
}

/* ADMIN EDIT ACTIONS */
window.editUser=async function(id){const {data:u}=await sb.from("profiles").select("*").eq("id",id).single();
const {data:classes}=await sb.from("classes").select("*");
editModal("Edit user",[
 {label:"Full name",name:"full_name",value:u.full_name},
 {label:"Email",name:"email",value:u.email},
 {label:"Role",name:"role",type:"select",value:u.role,options:["guest","student","teacher","admin"].map(r=>({value:r,label:r}))},
 {label:"Class",name:"class_id",type:"select",value:u.class_id||"",options:[{value:"",label:"No class"},...classes.map(c=>({value:c.id,label:c.name}))]}
],async v=>{const {error}=await sb.from("profiles").update({full_name:v.full_name,email:v.email,role:v.role,class_id:v.class_id||null}).eq("id",id);
if(error)return showToast(error.message,"error");showToast("User updated.");closeModal();render("users")})};

window.editClass=async function(id){const {data:c}=await sb.from("classes").select("*").eq("id",id).single();
editModal("Edit class",[{label:"Class name",name:"name",value:c.name},{label:"Academic year",name:"academic_year",value:c.academic_year},{label:"Description",name:"description",type:"textarea",value:c.description}],async v=>{
const {error}=await sb.from("classes").update(v).eq("id",id);if(error)return showToast(error.message,"error");showToast("Class updated.");closeModal();render("classes")})};

window.editSubject=async function(id){const {data:s}=await sb.from("subjects").select("*").eq("id",id).single();
editModal("Edit subject",[
 {label:"Subject name",name:"name",value:s.name},{label:"Code",name:"code",value:s.code},
 {label:"Class",name:"class_id",type:"select",value:s.class_id,options:(window.adminClasses||[]).map(c=>({value:c.id,label:c.name}))},
 {label:"Teacher",name:"teacher_id",type:"select",value:s.teacher_id||"",options:[{value:"",label:"Unassigned"},...(window.adminTeachers||[]).map(t=>({value:t.id,label:t.full_name}))]}
],async v=>{const {error}=await sb.from("subjects").update({name:v.name,code:v.code,class_id:v.class_id,teacher_id:v.teacher_id||null}).eq("id",id);
if(error)return showToast(error.message,"error");showToast("Subject updated.");closeModal();render("subjects")})};

window.editResource=async function(id){const {data:r}=await sb.from("resources").select("*").eq("id",id).single();
editModal("Edit resource",[
 {label:"Title",name:"title",value:r.title},{label:"Description",name:"description",type:"textarea",value:r.description},
 {label:"Type",name:"type",type:"select",value:r.type,options:["notes_pdf","video_link","document","image","attachment"].map(t=>({value:t,label:t.replace("_"," ")}))},
 {label:"File / video URL",name:"file_url",value:r.file_url}
],async v=>{const {error}=await sb.from("resources").update(v).eq("id",id);if(error)return showToast(error.message,"error");showToast("Resource updated.");closeModal();render("resources")})};

window.editAssignment=async function(id){const {data:a}=await sb.from("assignments").select("*").eq("id",id).single();
editModal("Edit assignment",[
 {label:"Title",name:"title",value:a.title},{label:"Instructions",name:"instructions",type:"textarea",value:a.instructions},
 {label:"Type",name:"type",type:"select",value:a.type,options:["Assignment","CAT","Exam","Quiz"].map(t=>({value:t,label:t}))},
 {label:"Maximum score",name:"max_score",type:"number",value:a.max_score},{label:"Due date",name:"due_date",type:"datetime-local",value:a.due_date?a.due_date.slice(0,16):""}
],async v=>{const {error}=await sb.from("assignments").update({title:v.title,instructions:v.instructions,type:v.type,max_score:Number(v.max_score),due_date:v.due_date}).eq("id",id);
if(error)return showToast(error.message,"error");showToast("Assignment updated.");closeModal();render("assignments")})};

window.editQuiz=async function(id){const {data:q}=await sb.from("quizzes").select("*").eq("id",id).single();
editModal("Edit quiz",[
 {label:"Title",name:"title",value:q.title},{label:"Description",name:"description",type:"textarea",value:q.description},
 {label:"Time limit (minutes)",name:"time_limit_minutes",type:"number",value:q.time_limit_minutes},
 {label:"Published",name:"is_published",type:"select",value:String(q.is_published),options:[{value:"true",label:"Published"},{value:"false",label:"Draft"}]}
],async v=>{const {error}=await sb.from("quizzes").update({title:v.title,description:v.description,time_limit_minutes:Number(v.time_limit_minutes),is_published:v.is_published==="true"}).eq("id",id);
if(error)return showToast(error.message,"error");showToast("Quiz updated.");closeModal();render("quizzes")})};

window.deleteRow=async function(table,id){if(!confirm("Delete this item permanently?"))return;
const {error}=await sb.from(table).delete().eq("id",id);if(error)return showToast(error.message,"error");showToast("Deleted.");render(document.querySelector("#sideNav a.active")?.dataset.tab||"overview")};
window.deleteUser=async function(id){if(!confirm("Delete this user profile? Also remove the Auth user from Supabase Auth if required."))return;
const {error}=await sb.from("profiles").delete().eq("id",id);if(error)return showToast(error.message,"error");showToast("Profile deleted.");render("users")};
window.deleteResource=async function(id,path){if(!confirm("Delete this resource and its stored file?"))return;
try{if(path)await sb.storage.from(STORAGE_BUCKET).remove([path]);const {error}=await sb.from("resources").delete().eq("id",id);if(error)throw error;showToast("Resource deleted.")}catch(e){showToast(e.message,"error")}};
init();

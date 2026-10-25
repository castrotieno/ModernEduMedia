let profile=null, mySubjects=[], myClassId=null;
const menus={
 student:[["overview","Overview"],["resources","Notes & Downloads"],["assignments","Assignments"],["quizzes","Quizzes & CATs"],["grades","My Results"],["enroll","Subject Enrollment"],["profile","My Profile"]],
 teacher:[["overview","Overview"],["resources","Upload Resources"],["assignments","Assignment Builder"],["quizzes","Quiz Builder"],["grading","Grading Console"],["blog","Blog Author"],["students","My Students"]],
 admin:[["overview","System Overview"],["users","User Management"],["classes","Classes"],["subjects","Subjects"],["enrollments","Enrollments"],["resources","All Resources"],["assignments","All Assignments"],["quizzes","All Quizzes"],["reports","Reports & Analytics"],["settings","Site Settings"]]
};

async function init(){
 profile=await getProfile(); if(!profile) return location.href="login.html";
 myClassId=profile.class_id;
 document.getElementById("userBadge").textContent=`${profile.full_name||profile.email} • ${profile.role}`;
 document.getElementById("roleTitle").textContent=profile.role.charAt(0).toUpperCase()+profile.role.slice(1)+" Portal";
 document.getElementById("sideNav").innerHTML=menus[profile.role].map(([id,label],i)=>`<a href="#" data-tab="${id}" class="${i==0?"active":""}">${label}</a>`).join("");
 document.querySelectorAll("#sideNav a").forEach(a=>a.onclick=e=>{e.preventDefault();document.querySelectorAll("#sideNav a").forEach(x=>x.classList.remove("active"));a.classList.add("active");render(a.dataset.tab)});
 render("overview");
}
function set(html){document.getElementById("content").innerHTML=html}
function stat(label,value){return `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`}
async function loadMySubjects(){
 if(profile.role==="student"){
  const {data}=await sb.from("enrollments").select("subject_id, subjects(*,classes(name))").eq("student_id",profile.id);
  mySubjects=(data||[]).map(x=>x.subjects);
 } else {
  const {data}=await sb.from("subjects").select("*,classes(name)");
  mySubjects=profile.role==="admin"?(data||[]):(data||[]).filter(s=>s.teacher_id===profile.id);
 }
}
async function render(tab){
 await loadMySubjects();
 if(profile.role==="student") return studentTab(tab);
 if(profile.role==="teacher") return teacherTab(tab);
 if(profile.role==="admin") return adminTab(tab);
}
function subjectOptions(selected=""){return mySubjects.map(s=>`<option value="${s.id}" ${s.id==selected?"selected":""}>${esc(s.name)} — ${esc(s.classes?.name||"")}</option>`).join("")}

/* STUDENT */
async function studentTab(tab){
 if(tab==="overview"){
  const [res,assign,quiz,att]=await Promise.all([
   sb.from("resources").select("*",{count:"exact",head:true}).in("subject_id",mySubjects.map(s=>s.id)),
   sb.from("assignments").select("*",{count:"exact",head:true}).in("subject_id",mySubjects.map(s=>s.id)),
   sb.from("quizzes").select("*",{count:"exact",head:true}).in("subject_id",mySubjects.map(s=>s.id)).eq("is_published",true),
   sb.from("quiz_attempts").select("*",{count:"exact",head:true}).eq("student_id",profile.id)]);
  set(`<h1>Welcome, ${esc(profile.full_name||"Student")}</h1><div class="stat-grid">${stat("Enrolled subjects",mySubjects.length)}${stat("Learning resources",res.count||0)}${stat("Assignments",assign.count||0)}${stat("Available quizzes",quiz.count||0)}${stat("Quiz attempts",att.count||0)}</div>
  <div class="card"><h3>My subjects</h3><div class="chip-row">${mySubjects.map(s=>`<span class="chip">${esc(s.name)}</span>`).join("")||'<span class="muted">No subjects enrolled yet.</span>'}</div></div>`);
 }
 if(tab==="resources"){
  const ids=mySubjects.map(s=>s.id); if(!ids.length)return set('<div class="card empty">Enroll in subjects to access resources.</div>');
  const {data}=await sb.from("resources").select("*,subjects(name)").in("subject_id",ids).order("created_at",{ascending:false});
  set(`<h1>Notes & Downloads</h1><div class="grid grid-3">${(data||[]).map(r=>`<div class="card"><span class="pill">${esc(r.type.replace("_"," "))}</span><h3>${esc(r.title)}</h3><p class="muted">${esc(r.description)}</p><p class="muted" style="font-size:.8rem">${esc(r.subjects?.name||"")}</p><div style="display:flex;gap:8px;margin-top:12px"><a class="btn btn-primary btn-sm" href="${r.file_url}" download>Download</a><a class="btn btn-outline btn-sm" href="${r.file_url}" target="_blank">View</a></div></div>`).join("")||'<div class="card empty">No resources available.</div>'}</div>`);
 }
 if(tab==="assignments"){
  const ids=mySubjects.map(s=>s.id); if(!ids.length)return set('<div class="card empty">Enroll in subjects first.</div>');
  const {data}=await sb.from("assignments").select("*,subjects(name)").in("subject_id",ids).order("due_date");
  set(`<h1>Assignments</h1><div class="grid grid-2">${(data||[]).map(a=>`<form class="card" data-id="${a.id}"><span class="pill">${a.type}</span><h3>${esc(a.title)}</h3><p class="muted">${esc(a.instructions)}</p><p class="muted" style="font-size:.82rem">${a.max_score} marks • Due ${fmtDate(a.due_date)}</p>${a.attachment_url?`<a href="${a.attachment_url}" target="_blank" class="muted">Download attachment</a>`:""}<label>Your answer<textarea name="text_answer" required></textarea></label><label>Upload file<input type="file" name="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip"></label><button class="btn btn-primary btn-sm">Submit assignment</button></form>`).join("")||'<div class="card empty">No assignments available.</div>'}</div>`);
  document.querySelectorAll("form[data-id]").forEach(f=>f.onsubmit=async e=>{e.preventDefault();const fd=new FormData(f);
   try{const url=await uploadFile(fd.get("file"),"assignments");
   const {error}=await sb.from("submissions").upsert({assignment_id:f.dataset.id,student_id:profile.id,text_answer:fd.get("text_answer"),attachment_url:url,status:"pending",submitted_at:new Date().toISOString()},{onConflict:"assignment_id,student_id"});
   if(error)throw error;showToast("Assignment submitted.");f.reset()}catch(err){showToast(err.message,"error")}});
 }
 if(tab==="quizzes"){
  const ids=mySubjects.map(s=>s.id); if(!ids.length)return set('<div class="card empty">Enroll in subjects first.</div>');
  const {data}=await sb.from("quizzes").select("*,subjects(name)").in("subject_id",ids).eq("is_published",true);
  set(`<h1>Quizzes & CATs</h1><div class="grid grid-3">${(data||[]).map(q=>`<div class="card"><span class="pill">Quiz</span><h3>${esc(q.title)}</h3><p class="muted">${esc(q.description)}</p><p class="muted" style="font-size:.82rem">${esc(q.subjects?.name||"")} • ${q.time_limit_minutes} minutes</p><button class="btn btn-primary btn-sm" onclick="startQuiz('${q.id}')">Start quiz</button></div>`).join("")||'<div class="card empty">No quizzes available.</div>'}</div>`);
 }
 if(tab==="grades"){
  const [subs,att]=await Promise.all([sb.from("submissions").select("*,assignments(title,max_score,subjects(name))").eq("student_id",profile.id),sb.from("quiz_attempts").select("*,quizzes(title,subjects(name))").eq("student_id",profile.id)]);
  set(`<h1>My Results</h1><div class="card"><h3>Assignment results</h3><div class="table-wrap"><table><thead><tr><th>Assignment</th><th>Subject</th><th>Score</th><th>Status</th><th>Feedback</th></tr></thead><tbody>${(subs.data||[]).map(s=>`<tr><td>${esc(s.assignments?.title||"")}</td><td>${esc(s.assignments?.subjects?.name||"")}</td><td>${s.score??"—"}/${s.assignments?.max_score??""}</td><td><span class="badge ${s.status==="pending"?"badge-amber":"badge-green"}">${s.status}</span></td><td>${esc(s.feedback||"—")}</td></tr>`).join("")}</tbody></table></div></div>
  <div class="card" style="margin-top:20px"><h3>Quiz results</h3><div class="table-wrap"><table><thead><tr><th>Quiz</th><th>Subject</th><th>Score</th><th>Percentage</th></tr></thead><tbody>${(att.data||[]).map(a=>`<tr><td>${esc(a.quizzes?.title||"")}</td><td>${esc(a.quizzes?.subjects?.name||"")}</td><td>${a.score}/${a.total_marks}</td><td>${a.percentage}%</td></tr>`).join("")}</tbody></table></div></div>`);
 }
 if(tab==="enroll"){
  const [{data:classes},{data:subjects},{data:enrolled}]=await Promise.all([sb.from("classes").select("*").order("name"),sb.from("subjects").select("*,classes(name)").eq("class_id",myClassId),sb.from("enrollments").select("subject_id").eq("student_id",profile.id)]);
  const ids=(enrolled||[]).map(e=>e.subject_id);
  set(`<h1>Subject Enrollment</h1><p class="muted">You can enroll only in subjects offered in your registered class.</p><div class="grid grid-3" style="margin-top:20px">${(subjects||[]).map(s=>`<div class="card"><h3>${esc(s.name)}</h3><p class="muted">${esc(s.code)} • ${esc(s.classes?.name||"")}</p>${ids.includes(s.id)?'<span class="badge badge-green">Enrolled</span>':`<button class="btn btn-primary btn-sm" onclick="enroll('${s.id}')">Enroll</button>`}</div>`).join("")||'<div class="card empty">No subjects available for your class.</div>'}</div>`);
 }
 if(tab==="profile"){
  set(`<h1>My Profile</h1><form class="card" id="profileForm"><label>Full name<input name="full_name" value="${esc(profile.full_name||"")}"></label><label>Phone<input name="phone" value="${esc(profile.phone||"")}"></label><label>Admission number<input name="admission_no" value="${esc(profile.admission_no||"")}"></label><button class="btn btn-primary">Save profile</button></form>`);
  document.getElementById("profileForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);
  const {error}=await sb.from("profiles").update({full_name:f.get("full_name"),phone:f.get("phone"),admission_no:f.get("admission_no")}).eq("id",profile.id);
  if(error)return showToast(error.message,"error");showToast("Profile updated.")};
 }
}
async function enroll(id){const {error}=await sb.from("enrollments").insert({student_id:profile.id,subject_id:id,class_id:myClassId});if(error)return showToast(error.message,"error");showToast("Enrolled successfully.");render("enroll")}

/* QUIZ ENGINE */
window.startQuiz=async function(quizId){
 const [{data:quiz},{data:questions}]=await Promise.all([sb.from("quizzes").select("*").eq("id",quizId).single(),sb.from("quiz_questions").select("*").eq("quiz_id",quizId).order("created_at")]);
 set(`<h1>${esc(quiz.title)}</h1><p class="muted">${esc(quiz.description)}</p><form id="quizForm">${(questions||[]).map((q,i)=>`<div class="question"><strong>Q${i+1}. ${esc(q.question_text)}</strong> <span class="badge badge-blue">${q.marks} marks</span>
 ${q.question_type==="multiple_choice"?(q.options||[]).map(o=>`<label class="option"><input type="radio" name="q_${q.id}" value="${esc(o)}" required> ${esc(o)}</label>`).join(""):""}
 ${q.question_type==="true_false"?`<label class="option"><input type="radio" name="q_${q.id}" value="True" required> True</label><label class="option"><input type="radio" name="q_${q.id}" value="False"> False</label>`:""}
 ${q.question_type==="short_answer"?`<input name="q_${q.id}" placeholder="Type your answer" required>`:""}
 ${q.question_type==="structured"?`<textarea name="q_${q.id}" rows="4" placeholder="Write your response"></textarea>`:""}</div>`).join("")}
 <button class="btn btn-primary">Submit quiz</button></form>`);
 document.getElementById("quizForm").onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);let score=0,total=0;const answers={};
 (questions||[]).forEach(q=>{const val=fd.get("q_"+q.id);answers[q.id]=val;total+=Number(q.marks);
  if(["multiple_choice","true_false","short_answer"].includes(q.question_type)&&String(val||"").trim().toLowerCase()===String(q.correct_answer).trim().toLowerCase())score+=Number(q.marks)});
 const percentage=total?Math.round(score/total*100):0;
 const {error}=await sb.from("quiz_attempts").upsert({quiz_id:quizId,student_id:profile.id,answers,score,total_marks:total,percentage,submitted_at:new Date().toISOString()},{onConflict:"quiz_id,student_id"});
 if(error)return showToast(error.message,"error");
 set(`<div class="card center"><h1>Quiz submitted</h1><p class="muted">Automatic score</p><div class="stat" style="display:inline-block"><strong>${score}/${total}</strong><span>${percentage}%</span></div><div class="progress" style="margin-top:18px"><div style="width:${percentage}%"></div></div><div style="margin-top:20px"><button class="btn btn-primary" onclick="render('quizzes')">Back to quizzes</button></div></div>`);
 showToast(`Scored ${percentage}%`)};
}

/* TEACHER */
async function teacherTab(tab){
 if(tab==="overview"){
  const [r,a,q,s]=await Promise.all([sb.from("resources").select("*",{count:"exact",head:true}).eq("uploaded_by",profile.id),sb.from("assignments").select("*",{count:"exact",head:true}).eq("created_by",profile.id),sb.from("quizzes").select("*",{count:"exact",head:true}).eq("created_by",profile.id),sb.from("submissions").select("*",{count:"exact",head:true}).eq("status","pending")]);
  set(`<h1>Teacher Dashboard</h1><div class="stat-grid">${stat("My resources",r.count||0)}${stat("My assignments",a.count||0)}${stat("My quizzes",q.count||0)}${stat("Pending grading",s.count||0)}</div><div class="card"><h3>Workflow</h3><p class="muted">Upload notes, create assignments and auto-graded quizzes, grade submissions and publish blog articles.</p></div>`);
 }
 if(tab==="resources"){
  set(`<h1>Upload Resources</h1><form class="card" id="resForm"><label>Title<input name="title" required></label><label>Description<textarea name="description" required></textarea></label>
  <div class="grid grid-2"><label>Type<select name="type"><option value="notes_pdf">PDF Notes</option><option value="video_link">Video Link</option><option value="document">Document</option><option value="image">Image</option><option value="attachment">Attachment</option></select></label><label>Subject<select name="subject_id">${subjectOptions()}</select></label></div>
  <label>Upload file<input type="file" name="file" required></label><label>Or video URL<input name="video_url" type="url" placeholder="Optional YouTube/video link"></label><button class="btn btn-primary">Upload & publish</button></form>`);
  document.getElementById("resForm").onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);
   try{let url=fd.get("video_url");let path=null,fileName=null,size=null;
    if(fd.get("file").size){url=await uploadFile(fd.get("file"),"resources");path=url;fileName=fd.get("file").name;size=fd.get("file").size}
    if(!url)throw new Error("Provide a file or video URL");
    const {error}=await sb.from("resources").insert({title:fd.get("title"),description:fd.get("description"),type:fd.get("type"),file_url:url,storage_path:path,file_name:fileName,file_size:size,subject_id:fd.get("subject_id"),uploaded_by:profile.id});
    if(error)throw error;showToast("Resource published.");e.currentTarget.reset()}catch(err){showToast(err.message,"error")}};
 }
 if(tab==="assignments"){
  set(`<h1>Assignment Builder</h1><form class="card" id="asgForm"><label>Title<input name="title" required></label><label>Instructions<textarea name="instructions" required></textarea></label>
  <div class="grid grid-2"><label>Type<select name="type"><option>Assignment</option><option>CAT</option><option>Exam</option></select></label><label>Subject<select name="subject_id">${subjectOptions()}</select></label>
  <label>Maximum score<input name="max_score" type="number" value="100" required></label><label>Due date<input name="due_date" type="datetime-local" required></label></div>
  <label>Attach worksheet / question paper<input type="file" name="file"></label><button class="btn btn-primary">Create assignment</button></form>`);
  document.getElementById("asgForm").onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);
   try{const url=await uploadFile(fd.get("file"),"assignments");
   const {error}=await sb.from("assignments").insert({title:fd.get("title"),instructions:fd.get("instructions"),type:fd.get("type"),subject_id:fd.get("subject_id"),max_score:Number(fd.get("max_score")),due_date:fd.get("due_date"),attachment_url:url,created_by:profile.id});
   if(error)throw error;showToast("Assignment created.");e.currentTarget.reset()}catch(err){showToast(err.message,"error")}};
 }
 if(tab==="quizzes"){
  set(`<h1>Quiz Builder</h1><form class="card" id="quizCreate"><label>Quiz title<input name="title" required></label><label>Description<textarea name="description"></textarea></label>
  <div class="grid grid-2"><label>Subject<select name="subject_id">${subjectOptions()}</select></label><label>Time limit (minutes)<input name="time_limit_minutes" type="number" value="30"></label></div>
  <button class="btn btn-primary">Create quiz</button></form><div id="questionArea"></div>`);
  document.getElementById("quizCreate").onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);
   const {data,error}=await sb.from("quizzes").insert({title:fd.get("title"),description:fd.get("description"),subject_id:fd.get("subject_id"),time_limit_minutes:Number(fd.get("time_limit_minutes")),created_by:profile.id,is_published:true}).select().single();
   if(error)return showToast(error.message,"error");showToast("Quiz created. Add questions below.");window.currentQuizId=data.id;renderQuestionBuilder()};
 }
 if(tab==="grading"){
  const {data}=await sb.from("submissions").select("*,assignments(title,max_score),profiles(full_name)").order("submitted_at",{ascending:false});
  set(`<h1>Grading Console</h1><div class="grid grid-2">${(data||[]).map(s=>`<form class="card" data-id="${s.id}"><strong>${esc(s.profiles?.full_name||"Student")}</strong><p class="muted">${esc(s.assignments?.title||"")} • ${s.assignments?.max_score} marks</p><p>${esc(s.text_answer||"")}</p>${s.attachment_url?`<a href="${s.attachment_url}" target="_blank">View attachment</a>`:""}<label>Score<input name="score" type="number" value="${s.score??""}"></label><label>Feedback<input name="feedback" value="${esc(s.feedback||"")}"></label><button class="btn btn-primary btn-sm">Save grade</button></form>`).join("")||'<div class="card empty">No submissions.</div>'}</div>`);
  document.querySelectorAll("form[data-id]").forEach(f=>f.onsubmit=async e=>{e.preventDefault();const fd=new FormData(f);
   const {error}=await sb.from("submissions").update({score:Number(fd.get("score")),feedback:fd.get("feedback"),status:"graded"}).eq("id",f.dataset.id);
   if(error)return showToast(error.message,"error");showToast("Graded.");render("grading")});
 }
 if(tab==="blog"){
  set(`<h1>Blog Author</h1><form class="card" id="blogForm"><label>Title<input name="title" required></label><label>Category<input name="category"></label><label>Content<textarea name="content" rows="10" required></textarea></label><label>Status<select name="is_published"><option value="true">Publish</option><option value="false">Draft</option></select></label><button class="btn btn-primary">Save post</button></form>`);
  document.getElementById("blogForm").onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const title=fd.get("title");
   const {error}=await sb.from("blogs").insert({title,slug:slugify(title)+"-"+Date.now().toString(36),content:fd.get("content"),category:fd.get("category"),author_id:profile.id,is_published:fd.get("is_published")==="true"});
   if(error)return showToast(error.message,"error");showToast("Blog saved.");e.currentTarget.reset()};
 }
 if(tab==="students"){
  const {data}=await sb.from("enrollments").select("*,profiles(full_name,email),subjects(name)").order("enrolled_at",{ascending:false});
  set(`<h1>Enrolled Students</h1><div class="table-wrap"><table><thead><tr><th>Student</th><th>Subject</th><th>Enrolled</th></tr></thead><tbody>${(data||[]).map(e=>`<tr><td>${esc(e.profiles?.full_name||"")}</td><td>${esc(e.subjects?.name||"")}</td><td>${fmtDate(e.enrolled_at)}</td></tr>`).join("")}</tbody></table></div>`);
 }
}
function renderQuestionBuilder(){
 if(!window.currentQuizId)return set('<div class="card empty">Create a quiz first.</div>');
 set(`<h1>Quiz Questions</h1><form class="card" id="qForm"><label>Question type<select name="question_type" onchange="toggleQType(this.value)"><option value="multiple_choice">Multiple choice</option><option value="true_false">True / False</option><option value="short_answer">Short answer</option><option value="structured">Structured / manual grading</option></select></label>
 <label>Question<textarea name="question_text" required></textarea></label><div id="mcqOptions"><label>Options (comma separated)<input name="options" placeholder="Option A, Option B, Option C, Option D"></label></div>
 <label>Correct answer<input name="correct_answer" required></label><label>Marks<input name="marks" type="number" value="1" min="1"></label><label>Explanation<input name="explanation"></label><button class="btn btn-primary">Add question</button></form>`);
 document.getElementById("qForm").onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);
  const type=fd.get("question_type");const opts=type==="multiple_choice"?fd.get("options").split(",").map(x=>x.trim()).filter(Boolean):[];
  const {error}=await sb.from("quiz_questions").insert({quiz_id:window.currentQuizId,question_type:type,question_text:fd.get("question_text"),options:opts,correct_answer:fd.get("correct_answer"),marks:Number(fd.get("marks")),explanation:fd.get("explanation")});
  if(error)return showToast(error.message,"error");showToast("Question added.");e.currentTarget.reset()};
}
window.toggleQType=function(v){document.getElementById("mcqOptions").classList.toggle("hidden",v!=="multiple_choice")};

/* ADMIN */
async function adminTab(tab){
 if(tab==="overview"){
  const tables=["profiles","classes","subjects","enrollments","resources","assignments","quizzes","submissions","quiz_attempts"];
  const res=await Promise.all(tables.map(t=>sb.from(t).select("*",{count:"exact",head:true})));
  set(`<h1>System Overview</h1><div class="stat-grid">${tables.map((t,i)=>stat(t.replace("_"," "),res[i].count||0)).join("")}</div>`);
 }
 if(tab==="users"){
  const {data}=await sb.from("profiles").select("*,classes(name)").order("created_at",{ascending:false});
  set(`<h1>User Management</h1><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Class</th><th>Role</th></tr></thead><tbody>${(data||[]).map(u=>`<tr><td>${esc(u.full_name)}</td><td>${esc(u.email)}</td><td>${esc(u.classes?.name||"—")}</td><td><select data-user="${u.id}">${["guest","student","teacher","admin"].map(r=>`<option ${u.role===r?"selected":""}>${r}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table></div>`);
  document.querySelectorAll("select[data-user]").forEach(s=>s.onchange=async()=>{const {error}=await sb.from("profiles").update({role:s.value}).eq("id",s.dataset.user);if(error)return showToast(error.message,"error");showToast("Role updated.")});
 }
 if(tab==="classes"){
  const {data}=await sb.from("classes").select("*").order("name");
  set(`<h1>Classes</h1><form class="card" id="classForm"><label>Class name<input name="name" required></label><label>Academic year<input name="academic_year" required></label><label>Description<input name="description"></label><button class="btn btn-primary">Add class</button></form>
  <div class="table-wrap"><table><thead><tr><th>Class</th><th>Year</th><th>Description</th></tr></thead><tbody>${(data||[]).map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.academic_year)}</td><td>${esc(c.description||"—")}</td></tr>`).join("")}</tbody></table></div>`);
  document.getElementById("classForm").onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);
   const {error}=await sb.from("classes").insert({name:fd.get("name"),academic_year:fd.get("academic_year"),description:fd.get("description")});
   if(error)return showToast(error.message,"error");showToast("Class added.");render("classes")};
 }
 if(tab==="subjects"){
  const [{data:classes},{data:subjects},{data:teachers}]=await Promise.all([sb.from("classes").select("*"),sb.from("subjects").select("*,classes(name),profiles(full_name)").order("name"),sb.from("profiles").select("*").in("role",["teacher","admin"])]);
  set(`<h1>Subjects</h1><form class="card" id="subjectForm"><div class="grid grid-2"><label>Code<input name="code" required></label><label>Name<input name="name" required></label>
  <label>Class<select name="class_id">${classes.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label>
  <label>Teacher<select name="teacher_id"><option value="">Unassigned</option>${teachers.map(t=>`<option value="${t.id}">${esc(t.full_name)}</option>`).join("")}</select></label></div>
  <button class="btn btn-primary">Add subject</button></form>
  <div class="table-wrap"><table><thead><tr><th>Subject</th><th>Code</th><th>Class</th><th>Teacher</th></tr></thead><tbody>${(subjects||[]).map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.code)}</td><td>${esc(s.classes?.name||"")}</td><td>${esc(s.profiles?.full_name||"Unassigned")}</td></tr>`).join("")}</tbody></table></div>`);
  document.getElementById("subjectForm").onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);
   const {error}=await sb.from("subjects").insert({code:fd.get("code"),name:fd.get("name"),class_id:fd.get("class_id"),teacher_id:fd.get("teacher_id")||null});
   if(error)return showToast(error.message,"error");showToast("Subject added.");render("subjects")};
 }
 if(tab==="enrollments"){
  const {data}=await sb.from("enrollments").select("*,profiles(full_name),subjects(name),classes(name)").order("enrolled_at",{ascending:false});
  set(`<h1>Enrollments</h1><div class="table-wrap"><table><thead><tr><th>Student</th><th>Subject</th><th>Class</th><th>Date</th></tr></thead><tbody>${(data||[]).map(e=>`<tr><td>${esc(e.profiles?.full_name||"")}</td><td>${esc(e.subjects?.name||"")}</td><td>${esc(e.classes?.name||"—")}</td><td>${fmtDate(e.enrolled_at)}</td></tr>`).join("")}</tbody></table></div>`);
 }
 if(tab==="resources"){
  const {data}=await sb.from("resources").select("*,subjects(name),profiles(full_name)").order("created_at",{ascending:false});
  set(`<h1>All Resources</h1><div class="table-wrap"><table><thead><tr><th>Title</th><th>Subject</th><th>Teacher</th><th>Type</th><th>File</th></tr></thead><tbody>${(data||[]).map(r=>`<tr><td>${esc(r.title)}</td><td>${esc(r.subjects?.name||"")}</td><td>${esc(r.profiles?.full_name||"")}</td><td>${r.type}</td><td><a class="btn btn-outline btn-sm" href="${r.file_url}" target="_blank">Open</a></td></tr>`).join("")}</tbody></table></div>`);
 }
 if(tab==="assignments"){
  const {data}=await sb.from("assignments").select("*,subjects(name),profiles(full_name)").order("created_at",{ascending:false});
  set(`<h1>All Assignments</h1><div class="table-wrap"><table><thead><tr><th>Title</th><th>Subject</th><th>Type</th><th>Marks</th><th>Due</th></tr></thead><tbody>${(data||[]).map(a=>`<tr><td>${esc(a.title)}</td><td>${esc(a.subjects?.name||"")}</td><td>${a.type}</td><td>${a.max_score}</td><td>${fmtDate(a.due_date)}</td></tr>`).join("")}</tbody></table></div>`);
 }
 if(tab==="quizzes"){
  const {data}=await sb.from("quizzes").select("*,subjects(name),quiz_attempts(score,percentage)").order("created_at",{ascending:false});
  set(`<h1>All Quizzes</h1><div class="table-wrap"><table><thead><tr><th>Quiz</th><th>Subject</th><th>Attempts</th><th>Average</th></tr></thead><tbody>${(data||[]).map(q=>{const a=q.quiz_attempts||[];const avg=a.length?Math.round(a.reduce((x,y)=>x+y.percentage,0)/a.length):0;return `<tr><td>${esc(q.title)}</td><td>${esc(q.subjects?.name||"")}</td><td>${a.length}</td><td>${avg}%</td></tr>`}).join("")}</tbody></table></div>`);
 }
 if(tab==="reports"){
  const {data}=await sb.from("quiz_attempts").select("*,profiles(full_name),quizzes(title)").order("percentage",{ascending:false});
  const rows=(data||[]).slice(0,30);
  set(`<h1>Reports & Analytics</h1><div class="card"><div style="display:flex;justify-content:space-between"><h3>Quiz performance leaderboard</h3><button class="btn btn-outline btn-sm" onclick="window.print()">Print / PDF</button></div>
  <div class="table-wrap"><table><thead><tr><th>#</th><th>Student</th><th>Quiz</th><th>Score</th><th>Percentage</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.profiles?.full_name||"")}</td><td>${esc(r.quizzes?.title||"")}</td><td>${r.score}/${r.total_marks}</td><td>${r.percentage}%</td></tr>`).join("")}</tbody></table></div></div>`);
 }
 if(tab==="settings"){
  const {data}=await sb.from("site_settings").select("*");const map=Object.fromEntries((data||[]).map(s=>[s.key,s.value]));
  set(`<h1>Site Settings</h1><form class="card" id="setForm"><label>Contact email<input name="contact_email" value="${esc(map.contact_email||CONTACT_EMAIL)}"></label><label>WhatsApp<input name="whatsapp_number" value="${esc(map.whatsapp_number||"+254741637904")}"></label><label>Announcement<textarea name="announcement">${esc(map.announcement||"")}</textarea></label><button class="btn btn-primary">Save</button></form>`);
  document.getElementById("setForm").onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);
   const rows=[...fd.entries()].map(([key,value])=>({key,value:String(value)}));
   const {error}=await sb.from("site_settings").upsert(rows,{onConflict:"key"});if(error)return showToast(error.message,"error");showToast("Settings saved.")};
 }
}
init();

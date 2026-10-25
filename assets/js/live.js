/* Live Classes + Discussion Forums
   - Sessions: teachers schedule / start / end classes, students join (built-in Jitsi room or an external link)
   - Class chat: every class has its own chat thread
   - Forum: topic threads per subject, pinned / locked by the subject teacher
   Everything is permission-checked in the database (see supabase/schema.sql), this file only drives the UI. */
(()=>{
const root=document.getElementById("liveApp");
let me=null,mySubs=[],classes=[],view="sessions",subjFilter="",search="",chans=[],timers=[],activeClass=null,forumOpen=false;
const $=id=>document.getElementById(id);
const STAFF=["teacher","admin"];
const own=c=>!!me&&(me.role==="admin"||c.teacher_id===me.id);
const taught=()=>new Set(mySubs.map(s=>s.id));
const canModerate=sid=>!!me&&(me.role==="admin"||(me.role==="teacher"&&!!sid&&taught().has(sid)));
const myName=()=>me.full_name||(me.email||"Guest").split("@")[0];
const joinLink=c=>new URL("live.html?class="+c.id,location.href).href;

/* ---------- housekeeping: realtime channels + timers belong to the current screen ---------- */
function cleanup(){chans.forEach(c=>{try{sb.removeChannel(c)}catch(e){}});chans=[];timers.forEach(clearInterval);timers=[]}
function subscribe(name,table,filter,cb){try{const cfg={event:"*",schema:"public",table};if(filter)cfg.filter=filter;chans.push(sb.channel(name+"-"+Math.random().toString(36).slice(2,7)).on("postgres_changes",cfg,cb).subscribe())}catch(e){console.warn("realtime unavailable",e)}}
const every=(ms,fn)=>timers.push(setInterval(fn,ms));
const debounce=(fn,ms=400)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}};

/* ---------- time helpers ---------- */
const endOf=c=>new Date(new Date(c.starts_at).getTime()+(c.duration_minutes||60)*60000);
function phase(c){if(c.status==="cancelled"||c.status==="ended")return"past";if(c.status==="live")return"live";return endOf(c)<new Date()?"past":"upcoming"}
function until(c){const m=Math.round((new Date(c.starts_at)-new Date())/60000);if(m<=0)return"starting now";if(m<60)return`in ${m} min`;if(m<1440)return`in ${Math.floor(m/60)} h ${m%60} min`;const d=Math.floor(m/1440);return`in ${d} day${d>1?"s":""}`}
function timeAgo(d){const m=Math.round((Date.now()-new Date(d))/60000);if(m<1)return"just now";if(m<60)return m+" min ago";if(m<1440)return Math.floor(m/60)+" h ago";return fmtDateTime(d)}
const gcal=c=>{const f=d=>new Date(d).toISOString().replace(/[-:]|\.\d{3}/g,"");return`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(c.title)}&dates=${f(c.starts_at)}/${f(endOf(c))}&details=${encodeURIComponent("Join: "+joinLink(c))}`};
function badgeFor(c){const p=phase(c);
 if(c.status==="cancelled")return'<span class="badge badge-red">Cancelled</span>';if(c.status==="ended")return'<span class="badge badge-blue">Ended</span>';
 if(p==="live")return'<span class="badge badge-live"><span class="live-dot"></span> Live now</span>';if(p==="past")return'<span class="badge badge-amber">Not held</span>';return`<span class="badge badge-green">${until(c)}</span>`}
const linkify=t=>t.replace(/(https?:\/\/[^\s<]+)/g,u=>`<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`).replace(/\n/g,"<br>");
const dbMissing=e=>e&&/(schema cache|does not exist|PGRST20[0-9])/i.test(e.message||"");

/* ---------- small UI helpers ---------- */
function closeModal(){document.getElementById("liveModal")?.remove()}
function openModal(html){closeModal();document.body.insertAdjacentHTML("beforeend",`<div class="modal-bg" id="liveModal"><div class="modal wide" role="dialog" aria-modal="true">${html}</div></div>`);
 const bg=$("liveModal");bg.addEventListener("click",e=>{if(e.target===bg||e.target.closest("[data-x]"))closeModal()});return bg}
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
function setupCard(e){root.innerHTML=`<div class="card empty"><h3>One-time database update needed</h3><p style="margin:8px 0 14px">Live Classes needs the v5 tables. Open <b>Supabase → SQL Editor</b>, paste the whole <code>supabase/schema.sql</code> file and click <b>Run</b>, then reload this page.</p><p class="muted" style="font-size:.85rem">${esc(e?.message||"")}</p></div>`}
const loading='<div class="card empty">Loading…</div>';

/* ---------- shell + tabs ---------- */
function shell(){root.innerHTML=`<div class="tabs" role="tablist"><button class="tab" role="tab" data-v="sessions">🎥 Sessions</button><button class="tab" role="tab" data-v="forum">💬 Discussion Forum</button></div><div id="pane"></div>`;
 root.querySelector(".tabs").addEventListener("click",e=>{const t=e.target.closest(".tab");if(!t)return;t.dataset.v==="forum"?showForum():showSessions()})}
function markTab(v){root.querySelectorAll(".tab").forEach(t=>{const on=t.dataset.v===v;t.classList.toggle("active",on);t.setAttribute("aria-selected",on)})}
function subjectOptions(sel="",all="All my subjects"){return`<option value="">${all}</option>`+mySubs.map(s=>`<option value="${s.id}" ${s.id===sel?"selected":""}>${esc(s.name)} — ${esc(s.classes?.name||"")}</option>`).join("")}

/* =====================  SESSIONS  ===================== */
async function loadClasses(){const {data,error}=await sb.from("live_classes").select("*,subjects(name,code,classes(name)),teacher:profiles!live_classes_teacher_id_fkey(full_name),live_attendance(count)").order("starts_at",{ascending:true});if(error)throw error;classes=data||[]}
async function showSessions(){view="sessions";cleanup();activeClass=null;markTab("sessions");$("pane").innerHTML=loading;
 try{await loadClasses()}catch(e){return dbMissing(e)?setupCard(e):($("pane").innerHTML=`<div class="card empty">Could not load classes: ${esc(friendlyError(e.message))}</div>`)}
 drawSessions();
 subscribe("lc-all","live_classes",null,debounce(async()=>{if(view!=="sessions")return;try{await loadClasses();drawSessions()}catch(e){}}));
 every(30000,()=>{if(view==="sessions")drawSessions()});
 every(90000,async()=>{if(view==="sessions"){try{await loadClasses();drawSessions()}catch(e){}}})}

function sessionCard(c){const p=phase(c),o=own(c),n=c.live_attendance?.[0]?.count||0;
 const acts=[];
 if(p==="live")acts.push(`<button class="btn btn-primary btn-sm pulse" data-act="join" data-id="${c.id}">▶ Join class</button>`);
 if(o&&c.status==="scheduled"&&p!=="past")acts.push(`<button class="btn btn-primary btn-sm" data-act="start" data-id="${c.id}">▶ Start class</button>`);
 if(p==="upcoming"&&!o)acts.push(`<span class="muted small">Opens when your teacher starts the class</span>`);
 if(p==="upcoming")acts.push(`<a class="btn btn-outline btn-sm" href="${gcal(c)}" target="_blank" rel="noopener">＋ Calendar</a>`);
 if(c.recording_url)acts.push(`<a class="btn btn-secondary btn-sm" href="${esc(c.recording_url)}" target="_blank" rel="noopener">▶ Recording</a>`);
 if(c.status!=="cancelled")acts.push(`<button class="btn btn-outline btn-sm" data-act="chat" data-id="${c.id}">💬 Class chat</button>`);
 if(o&&p==="live")acts.push(`<button class="btn btn-danger btn-sm" data-act="end" data-id="${c.id}">■ End</button>`);
 if(o){acts.push(`<button class="btn btn-edit btn-sm" data-act="edit" data-id="${c.id}">Edit</button>`);
  if(c.status!=="ended"&&c.status!=="cancelled")acts.push(`<button class="btn btn-outline btn-sm" data-act="cancel" data-id="${c.id}">Cancel</button>`);
  acts.push(`<button class="btn btn-outline btn-sm" data-act="att" data-id="${c.id}">👥 ${n}</button><button class="btn btn-danger btn-sm" data-act="del" data-id="${c.id}">Delete</button>`)}
 return`<article class="card session ${p}"><div class="session-top">${badgeFor(c)}<span class="pill">${esc(c.subjects?.name||"All classes")}</span></div>
 <h3>${esc(c.title)}</h3>${c.description?`<p class="muted">${esc(c.description)}</p>`:""}
 <ul class="session-meta"><li>🗓 ${fmtDateTime(c.starts_at)}</li><li>⏱ ${c.duration_minutes||60} min</li><li>👩‍🏫 ${esc(c.teacher?.full_name||"Teacher")}</li><li>${c.provider==="external"?"🔗 External meeting link":"🎥 Built-in video room"}</li></ul>
 <div class="session-actions">${acts.join("")}</div></article>`}

function drawSessions(){const pane=$("pane");if(!pane||view!=="sessions")return;
 const list=classes.filter(c=>!subjFilter||c.subject_id===subjFilter);
 const live=list.filter(c=>phase(c)==="live"),up=list.filter(c=>phase(c)==="upcoming"),past=list.filter(c=>phase(c)==="past").reverse().slice(0,12);
 const grp=(t,items,empty)=>`<h2 class="group-h">${t} <span class="muted">${items.length}</span></h2>${items.length?`<div class="grid grid-2">${items.map(sessionCard).join("")}</div>`:empty?`<div class="card empty small">${empty}</div>`:""}`;
 const hint=!mySubs.length&&me.role==="student"?'<div class="card notice">You are not enrolled in any subjects yet, so no classes are shown. Open <a href="dashboard.html"><u>your dashboard</u></a> → Subject Enrollment.</div>':!mySubs.length&&me.role==="teacher"?'<div class="card notice">You have no subjects assigned yet. Ask the admin to assign you a subject before scheduling classes.</div>':"";
 pane.innerHTML=`${hint}<div class="live-toolbar"><select id="fSubj" aria-label="Filter by subject">${subjectOptions(subjFilter)}</select><span class="muted small">Times shown in your local time (${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)})</span>${STAFF.includes(me.role)?'<button class="btn btn-primary" data-act="new" style="margin-left:auto">＋ Schedule a class</button>':""}</div>
 ${live.length?grp('<span class="live-dot"></span> Live now',live):""}${grp("Upcoming",up,"No classes scheduled yet. Check back soon.")}${past.length?grp("Past sessions",past):""}`;
 $("fSubj").onchange=e=>{subjFilter=e.target.value;drawSessions()}}

/* ---------- actions ---------- */
const byId=id=>classes.find(c=>c.id===id);
async function setStatus(id,patch,msg){const {error}=await sb.from("live_classes").update(patch).eq("id",id);if(error){showToast(error.message,"error");return false}if(msg)showToast(msg);return true}
async function onClick(e){const b=e.target.closest("[data-act]");if(!b)return;const act=b.dataset.act,id=b.dataset.id,c=id?byId(id)||(activeClass&&activeClass.id===id?activeClass:null):null;
 if(act==="new")return classModal();
 if(act==="forum-new"){forumOpen=!forumOpen;return $("newTopic")?.classList.toggle("hidden",!forumOpen)}
 if(act==="leave"){return showSessions()}
 if(act==="back-forum")return showForum();
 if(act==="copy"){try{await navigator.clipboard.writeText(joinLink(c));showToast("Invite link copied.")}catch(_){prompt("Copy this link:",joinLink(c))}return}
 if(!c)return;
 if(act==="join"){if(c.status!=="live"&&!own(c))return showToast("This class has not started yet.","error");return enterRoom(c)}
 if(act==="start"){b.disabled=true;if(await setStatus(id,{status:"live",started_at:new Date().toISOString()})){c.status="live";return enterRoom(c)}b.disabled=false;return}
 if(act==="end"){if(!confirm("End this class for everyone?"))return;if(await setStatus(id,{status:"ended",ended_at:new Date().toISOString()},"Class ended. You can add a recording link with Edit."))return showSessions();return}
 if(act==="cancel"){if(!confirm("Cancel this class? Students will see it as cancelled."))return;if(await setStatus(id,{status:"cancelled"},"Class cancelled."))return showSessions();return}
 if(act==="del"){if(!confirm("Delete this class and its chat permanently?"))return;const {error}=await sb.from("live_classes").delete().eq("id",id);if(error)return showToast(error.message,"error");showToast("Class deleted.");return showSessions()}
 if(act==="edit")return classModal(c);
 if(act==="att")return attendanceModal(c);
 if(act==="chat")return showChat(c)}

/* ---------- schedule / edit modal ---------- */
function classModal(c){const edit=!!c;
 if(!edit&&me.role!=="admin"&&!mySubs.length)return showToast("You have no subjects assigned yet. Ask the admin to assign you one first.","error");
 const lt=v=>{const d=v?new Date(v):new Date(Date.now()+3600e3);return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,16)};
 const bg=openModal(`<h2>${edit?"Edit":"Schedule"} live class</h2><form id="classForm">
 <label>Title<input name="title" required maxlength="200" value="${esc(c?.title||"")}" placeholder="e.g. Quadratic equations — revision"></label>
 <div class="grid grid-2"><label>Subject<select name="subject_id">${me.role==="admin"?`<option value="">Whole school (all classes)</option>`:""}${mySubs.map(s=>`<option value="${s.id}" ${s.id===c?.subject_id?"selected":""}>${esc(s.name)} — ${esc(s.classes?.name||"")}</option>`).join("")}</select></label>
 <label>Starts<input name="starts_at" type="datetime-local" required value="${lt(c?.starts_at)}"></label>
 <label>Duration<select name="duration_minutes">${[30,45,60,90,120].map(m=>`<option value="${m}" ${(c?.duration_minutes||60)===m?"selected":""}>${m} minutes</option>`).join("")}</select></label>
 <label>Video platform<select name="provider" id="provSel"><option value="jitsi" ${c?.provider!=="external"?"selected":""}>Built-in video room (no account needed)</option><option value="external" ${c?.provider==="external"?"selected":""}>External link (Google Meet, Zoom, Teams…)</option></select></label></div>
 <label id="linkRow" class="${c?.provider==="external"?"":"hidden"}">Meeting link<input name="meeting_link" type="url" placeholder="https://meet.google.com/…" value="${esc(c?.meeting_link||"")}"></label>
 <label>Description <span class="muted" style="font-weight:400">(topic, what to bring)</span><textarea name="description" rows="3" maxlength="1000">${esc(c?.description||"")}</textarea></label>
 ${edit?`<label>Recording link <span class="muted" style="font-weight:400">(optional, add after class)</span><input name="recording_url" type="url" placeholder="https://…" value="${esc(c.recording_url||"")}"></label>`:""}
 <div class="modal-actions"><button type="button" class="btn btn-outline" data-x>Cancel</button><button class="btn btn-primary">${edit?"Save changes":"Schedule class"}</button></div></form>`);
 const prov=bg.querySelector("#provSel"),row=bg.querySelector("#linkRow");prov.onchange=()=>row.classList.toggle("hidden",prov.value!=="external");
 bg.querySelector("#classForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),btn=e.currentTarget.querySelector(".btn-primary");
  const external=f.get("provider")==="external",link=(f.get("meeting_link")||"").toString().trim();
  if(external&&!/^https?:\/\//i.test(link))return showToast("Enter the full meeting link, starting with https://","error");
  const row={title:f.get("title").toString().trim(),subject_id:f.get("subject_id")||null,starts_at:new Date(f.get("starts_at")).toISOString(),duration_minutes:Number(f.get("duration_minutes")),provider:external?"external":"jitsi",meeting_link:external?link:null,description:(f.get("description")||"").toString().trim()};
  if(!row.title)return showToast("Give the class a title.","error");
  if(edit)row.recording_url=(f.get("recording_url")||"").toString().trim()||null;
  btn.disabled=true;
  try{if(edit){const {error}=await sb.from("live_classes").update(row).eq("id",c.id);if(error)throw error;showToast("Class updated.")}
   else{const {data,error}=await sb.from("live_classes").insert({...row,teacher_id:me.id}).select().single();if(error)throw error;try{await ensureChatThread(data)}catch(_){}showToast("Class scheduled.")}
   closeModal();showSessions()}catch(err){btn.disabled=false;showToast(err.message,"error")}}}

/* ---------- attendance ---------- */
async function attendanceModal(c){const {data,error}=await sb.from("live_attendance").select("joined_at,who:profiles!live_attendance_user_id_fkey(full_name,email,role)").eq("live_class_id",c.id).order("joined_at");
 if(error)return showToast(error.message,"error");const rows=data||[];
 const bg=openModal(`<h2>Attendance · ${esc(c.title)}</h2><p class="muted">${rows.length} joined</p><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.who?.full_name||"")}</td><td>${esc(r.who?.email||"")}</td><td>${esc(r.who?.role||"")}</td><td>${fmtDateTime(r.joined_at)}</td></tr>`).join("")||'<tr><td colspan="4" class="muted center">Nobody has joined yet.</td></tr>'}</tbody></table></div>
 <div class="modal-actions"><button class="btn btn-outline" data-x>Close</button>${rows.length?'<button class="btn btn-primary" id="csvBtn">Download CSV</button>':""}</div>`);
 bg.querySelector("#csvBtn")?.addEventListener("click",()=>{const q=v=>`"${String(v??"").replace(/"/g,'""')}"`;const csv=["Name,Email,Role,Joined",...rows.map(r=>[r.who?.full_name,r.who?.email,r.who?.role,new Date(r.joined_at).toLocaleString()].map(q).join(","))].join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="attendance-"+slugify(c.title)+".csv";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)})}

/* =====================  ROOM  ===================== */
function jitsiUrl(c){const p=[`userInfo.displayName=${encodeURIComponent(JSON.stringify(myName()))}`,`config.subject=${encodeURIComponent(JSON.stringify(c.title))}`];
 if(!own(c))p.push("config.startWithAudioMuted=true","config.startWithVideoMuted=true");
 return`https://${JITSI_DOMAIN}/${encodeURIComponent(c.room_name)}#${p.join("&")}`}
async function ensureChatThread(c){const {data}=await sb.from("discussion_threads").select("id,is_locked,subject_id").eq("live_class_id",c.id).eq("kind","class_chat").order("created_at").limit(1);if(data&&data[0])return data[0];
 const {data:n,error}=await sb.from("discussion_threads").insert({subject_id:c.subject_id,live_class_id:c.id,title:"Class chat: "+c.title,body:"",author_id:me.id,kind:"class_chat"}).select("id,is_locked,subject_id").single();if(error)throw error;return n}
async function enterRoom(c){cleanup();view="room";activeClass=c;markTab("sessions");const host=own(c);
 sb.from("live_attendance").upsert({live_class_id:c.id,user_id:me.id},{onConflict:"live_class_id,user_id",ignoreDuplicates:true}).then(({error})=>{if(error)console.warn("attendance:",error.message)});
 const url=c.provider==="external"?c.meeting_link:jitsiUrl(c);
 const media=c.provider==="external"?`<div class="card external-room"><h3>This class meets on an external video link</h3><p class="muted" style="margin:8px 0 16px">Your teacher is using another video service. Click below to open it in a new tab, then come back here for the class chat.</p><a class="btn btn-primary" href="${esc(url)}" target="_blank" rel="noopener">Open the meeting ↗</a></div>`
  :`<div class="video-frame"><iframe title="${esc(c.title)} — live video" src="${esc(url)}" allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write" allowfullscreen></iframe></div>`;
 $("pane").innerHTML=`<div class="room-bar"><button class="btn btn-outline btn-sm" data-act="leave">← Leave class</button><div class="room-title"><h2>${esc(c.title)}</h2><span class="muted small">${esc(c.subjects?.name||"All classes")} · ${esc(c.teacher?.full_name||"Teacher")}</span></div>
 <div class="room-tools">${badgeFor(c)}<button class="btn btn-outline btn-sm" data-act="copy" data-id="${c.id}">Copy invite link</button>${c.provider!=="external"?`<a class="btn btn-outline btn-sm" href="${esc(url)}" target="_blank" rel="noopener">Open in new tab</a>`:""}${host?`<button class="btn btn-danger btn-sm" data-act="end" data-id="${c.id}">■ End class</button>`:""}</div></div>
 <div class="room"><div class="room-main">${media}${c.description?`<div class="card" style="margin-top:16px"><h3>About this class</h3><p class="muted" style="margin-top:6px">${esc(c.description)}</p></div>`:""}${c.provider!=="external"?'<p class="muted small" style="margin-top:10px">Tip: allow camera and microphone when your browser asks. Students join muted; unmute to speak. On the free public video server the teacher may be asked to sign in once to start the room.</p>':""}</div>
 <aside class="room-side card"><h3>💬 Class chat</h3><div id="chatBox" class="chat-wrap"></div></aside></div>`;
 try{const t=await ensureChatThread(c);mountThread($("chatBox"),t.id,{compact:true})}catch(e){$("chatBox").innerHTML='<p class="muted small">Chat is not available for this class yet.</p>'}
 subscribe("lc-room","live_classes","id=eq."+c.id,p=>{const n=p.new;if(!n||!n.status)return;if(n.status==="ended"&&!host){showToast("Your teacher ended the class.");showSessions()}})}
async function showChat(c){cleanup();view="chat";markTab("sessions");$("pane").innerHTML=loading;
 try{const t=await ensureChatThread(c);$("pane").innerHTML=`<div class="room-bar"><button class="btn btn-outline btn-sm" data-act="leave">← Back to sessions</button><div class="room-title"><h2>Class chat · ${esc(c.title)}</h2><span class="muted small">${fmtDateTime(c.starts_at)}</span></div></div><div class="card chat-page"><div id="chatBox" class="chat-wrap big"></div></div>`;mountThread($("chatBox"),t.id,{compact:true})}
 catch(e){$("pane").innerHTML=`<div class="card empty">Chat is not available: ${esc(friendlyError(e.message))}</div>`}}

/* =====================  THREAD (shared by class chat + forum)  ===================== */
async function mountThread(box,tid,{compact=false}={}){
 box.innerHTML=`<div class="msgs" aria-live="polite"><p class="muted small">Loading messages…</p></div><form class="composer"><textarea name="body" rows="${compact?2:3}" maxlength="4000" placeholder="Write a message… (Enter to send, Shift+Enter for a new line)" required></textarea><button class="btn btn-primary btn-sm">Send</button></form>`;
 const msgs=box.querySelector(".msgs"),form=box.querySelector(".composer"),ta=form.querySelector("textarea");let first=true,sid=null;
 const load=async()=>{if(!box.isConnected)return;
  const [t,p]=await Promise.all([sb.from("discussion_threads").select("id,subject_id,is_locked").eq("id",tid).maybeSingle(),sb.from("discussion_posts").select("*,author:profiles!discussion_posts_author_id_fkey(full_name,role)").eq("thread_id",tid).order("created_at").limit(300)]);
  if(p.error){msgs.innerHTML=`<p class="muted small">Could not load messages: ${esc(friendlyError(p.error.message))}</p>`;return}
  sid=t.data?.subject_id;const locked=!!t.data?.is_locked,mod=canModerate(sid);
  ta.disabled=locked&&!mod;form.querySelector("button").disabled=locked&&!mod;if(locked)ta.placeholder="This topic is locked.";
  const near=first||msgs.scrollHeight-msgs.scrollTop-msgs.clientHeight<90;
  msgs.innerHTML=(p.data||[]).map(m=>{const mine=m.author_id===me.id,staff=["teacher","admin"].includes(m.author?.role);
   return`<div class="msg ${mine?"mine":""}"><div class="msg-h"><b>${esc(m.author?.full_name||"Member")}</b>${staff?`<span class="badge badge-blue">${m.author.role==="admin"?"Admin":"Teacher"}</span>`:""}<span class="muted">${timeAgo(m.created_at)}</span>${mine||mod?`<button class="msg-x" data-del-post="${m.id}" title="Delete message" aria-label="Delete message">🗑</button>`:""}</div><div class="msg-b">${linkify(esc(m.body))}</div></div>`}).join("")||`<p class="muted small empty-msg">${compact?"No messages yet. Say hello 👋":"No replies yet. Be the first to reply."}</p>`;
  if(near)msgs.scrollTop=msgs.scrollHeight;first=false};
 msgs.addEventListener("click",async e=>{const d=e.target.closest("[data-del-post]");if(!d||!confirm("Delete this message?"))return;const {error}=await sb.from("discussion_posts").delete().eq("id",d.dataset.delPost);if(error)return showToast(error.message,"error");load()});
 form.addEventListener("submit",async e=>{e.preventDefault();const body=ta.value.trim();if(!body)return;const btn=form.querySelector("button");btn.disabled=true;
  const {error}=await sb.from("discussion_posts").insert({thread_id:tid,author_id:me.id,body});btn.disabled=false;if(error)return showToast(error.message,"error");ta.value="";first=true;load()});
 ta.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();form.requestSubmit()}});
 subscribe("posts-"+tid,"discussion_posts","thread_id=eq."+tid,debounce(load,250));every(15000,load);await load()}

/* =====================  FORUM  ===================== */
let threads=[];
async function loadThreads(){const {data,error}=await sb.from("discussion_threads").select("*,subjects(name),author:profiles!discussion_threads_author_id_fkey(full_name,role),discussion_posts(count)").eq("kind","topic").order("is_pinned",{ascending:false}).order("last_activity_at",{ascending:false}).limit(150);if(error)throw error;threads=data||[]}
async function showForum(){view="forum";cleanup();markTab("forum");$("pane").innerHTML=loading;
 try{await loadThreads()}catch(e){return dbMissing(e)?setupCard(e):($("pane").innerHTML=`<div class="card empty">Could not load the forum: ${esc(friendlyError(e.message))}</div>`)}
 drawForum();subscribe("th-all","discussion_threads",null,debounce(async()=>{if(view!=="forum")return;try{await loadThreads();drawForumList()}catch(e){}}));
 subscribe("th-posts","discussion_posts",null,debounce(async()=>{if(view!=="forum")return;try{await loadThreads();drawForumList()}catch(e){}},800))}
function drawForum(){const canNew=mySubs.length>0||me.role==="admin";
 $("pane").innerHTML=`<div class="live-toolbar"><select id="fSubj" aria-label="Filter by subject">${subjectOptions(subjFilter)}</select><input type="search" id="fSearch" placeholder="Search topics…" aria-label="Search topics" value="${esc(search)}">${canNew?'<button class="btn btn-primary" data-act="forum-new" style="margin-left:auto">＋ New topic</button>':""}</div>
 ${canNew?`<form class="card new-topic ${forumOpen?"":"hidden"}" id="newTopic"><h3>Start a discussion</h3><div class="grid grid-2"><label>Subject<select name="subject_id" required>${me.role==="admin"?'<option value="">Whole school (everyone)</option>':""}${mySubs.map(s=>`<option value="${s.id}" ${s.id===subjFilter?"selected":""}>${esc(s.name)} — ${esc(s.classes?.name||"")}</option>`).join("")}</select></label><label>Title<input name="title" required maxlength="200" placeholder="What do you want to discuss?"></label></div><label>Details <span class="muted" style="font-weight:400">(optional)</span><textarea name="body" rows="4" maxlength="4000"></textarea></label><div class="modal-actions"><button type="button" class="btn btn-outline" data-act="forum-new">Cancel</button><button class="btn btn-primary">Post topic</button></div></form>`:'<div class="card notice">Enroll in a subject to join its forum.</div>'}
 <div id="threadList"></div>`;
 $("fSubj").onchange=e=>{subjFilter=e.target.value;drawForumList()};$("fSearch").oninput=e=>{search=e.target.value;drawForumList()};
 const nf=$("newTopic");if(nf)nf.onsubmit=async e=>{e.preventDefault();const f=new FormData(nf),btn=nf.querySelector(".btn-primary");btn.disabled=true;
  const {data,error}=await sb.from("discussion_threads").insert({subject_id:f.get("subject_id")||null,title:f.get("title").toString().trim(),body:(f.get("body")||"").toString().trim(),author_id:me.id,kind:"topic"}).select("id").single();btn.disabled=false;
  if(error)return showToast(error.message,"error");forumOpen=false;showToast("Topic posted.");openThread(data.id)};
 drawForumList()}
function drawForumList(){const box=$("threadList");if(!box||view!=="forum")return;const q=search.toLowerCase();
 const list=threads.filter(t=>(!subjFilter||t.subject_id===subjFilter)&&(!q||(t.title+" "+t.body).toLowerCase().includes(q)));
 box.innerHTML=list.map(t=>{const n=t.discussion_posts?.[0]?.count||0,staff=["teacher","admin"].includes(t.author?.role);
  return`<div class="card thread-card ${t.is_pinned?"pinned":""}" data-thread="${t.id}" role="button" tabindex="0"><div class="thread-main"><div class="thread-badges">${t.is_pinned?'<span class="badge badge-amber">📌 Pinned</span>':""}${t.is_locked?'<span class="badge badge-red">🔒 Locked</span>':""}<span class="pill">${esc(t.subjects?.name||"Whole school")}</span></div><h3>${esc(t.title)}</h3><p class="muted small">${esc(t.author?.full_name||"Member")}${staff?` · <b>${t.author.role==="admin"?"Admin":"Teacher"}</b>`:""} · ${timeAgo(t.created_at)}</p></div><div class="thread-stat"><strong>${n}</strong><span>repl${n===1?"y":"ies"}</span><span class="muted small">${timeAgo(t.last_activity_at)}</span></div></div>`}).join("")||'<div class="card empty">No topics yet. Start the first discussion!</div>'}
async function openThread(id){cleanup();view="thread";markTab("forum");$("pane").innerHTML=loading;
 const {data:t,error}=await sb.from("discussion_threads").select("*,subjects(name),author:profiles!discussion_threads_author_id_fkey(full_name,role)").eq("id",id).maybeSingle();
 if(error||!t){showToast(error?error.message:"That topic no longer exists.","error");return showForum()}
 const mod=canModerate(t.subject_id),mine=t.author_id===me.id;
 $("pane").innerHTML=`<div class="room-bar"><button class="btn btn-outline btn-sm" data-act="back-forum">← All topics</button><div class="room-tools" style="margin-left:auto">${mod?`<button class="btn btn-outline btn-sm" id="pinBtn">${t.is_pinned?"Unpin":"📌 Pin"}</button><button class="btn btn-outline btn-sm" id="lockBtn">${t.is_locked?"🔓 Unlock":"🔒 Lock"}</button>`:""}${mod||mine?'<button class="btn btn-danger btn-sm" id="delBtn">Delete topic</button>':""}</div></div>
 <article class="card topic-head"><div class="thread-badges">${t.is_pinned?'<span class="badge badge-amber">📌 Pinned</span>':""}${t.is_locked?'<span class="badge badge-red">🔒 Locked</span>':""}<span class="pill">${esc(t.subjects?.name||"Whole school")}</span></div><h1>${esc(t.title)}</h1><p class="muted small">${esc(t.author?.full_name||"Member")}${["teacher","admin"].includes(t.author?.role)?` · <b>${t.author.role==="admin"?"Admin":"Teacher"}</b>`:""} · ${fmtDateTime(t.created_at)}</p>${t.body?`<div class="topic-body">${linkify(esc(t.body))}</div>`:""}</article>
 <div class="card chat-page"><h3 style="margin-bottom:10px">Replies</h3><div id="chatBox" class="chat-wrap big"></div></div>`;
 const upd=async patch=>{const {error}=await sb.from("discussion_threads").update(patch).eq("id",id);if(error)return showToast(error.message,"error");openThread(id)};
 $("pinBtn")?.addEventListener("click",()=>upd({is_pinned:!t.is_pinned}));$("lockBtn")?.addEventListener("click",()=>upd({is_locked:!t.is_locked}));
 $("delBtn")?.addEventListener("click",async()=>{if(!confirm("Delete this topic and all replies?"))return;const {error}=await sb.from("discussion_threads").delete().eq("id",id);if(error)return showToast(error.message,"error");showToast("Topic deleted.");showForum()});
 mountThread($("chatBox"),id,{compact:false})}

/* =====================  START  ===================== */
async function init(){
 if(!sb){root.innerHTML='<div class="card empty">The site could not connect. Refresh the page and try again.</div>';return}
 me=await getProfile();
 if(!me){root.innerHTML=`<div class="card welcome"><h2>Sign in to join live classes</h2><p class="muted" style="margin:8px 0 18px">Live classes and discussion forums are for registered students and teachers of ModernEduMedia.</p><div class="steps grid grid-3"><div><b>1 · Register</b><p class="muted small">Create a free account and pick your class.</p></div><div><b>2 · Enroll</b><p class="muted small">Choose your subjects in the dashboard.</p></div><div><b>3 · Join</b><p class="muted small">Open Live Classes when your teacher starts a lesson.</p></div></div><div class="hero-actions" style="margin-top:22px"><a class="btn btn-primary" href="login.html?next=live.html">Sign in</a><a class="btn btn-outline" href="register.html">Create account</a></div></div>`;return}
 if(!["student","teacher","admin"].includes(me.role)){root.innerHTML='<div class="card empty"><h3>Waiting for approval</h3><p style="margin-top:8px">Your account has no access yet. An admin will approve it shortly.</p></div>';return}
 mySubs=await fetchMySubjects(me);shell();root.addEventListener("click",e=>{const th=e.target.closest("[data-thread]");if(th)return openThread(th.dataset.thread);onClick(e)});root.addEventListener("keydown",e=>{const th=e.target.closest?.("[data-thread]");if(th&&(e.key==="Enter"||e.key===" ")&&e.target===th){e.preventDefault();openThread(th.dataset.thread)}});
 const q=new URLSearchParams(location.search),cid=q.get("class");
 if(cid){try{await loadClasses()}catch(e){return dbMissing(e)?setupCard(e):showToast(e.message,"error")}
  const c=byId(cid);if(c&&(c.status==="live"||own(c))&&c.status!=="cancelled")return enterRoom(c);showToast(c?"That class is not live right now.":"That class was not found.","error")}
 if(q.get("tab")==="forum")return showForum();showSessions()}
init();
})();

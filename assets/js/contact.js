/* Contact form. Saves to contact_messages. Works even on an older database that has no "subject" column yet. */
(()=>{const form=document.getElementById("contactForm"),msg=document.getElementById("formMsg"),btn=document.getElementById("sendBtn");if(!form)return;
const say=(t,ok)=>{msg.textContent=t;msg.className="form-msg "+(t?(ok?"ok":"bad"):"")};
form.addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(form);
 const name=(f.get("name")||"").toString().trim(),email=(f.get("email")||"").toString().trim(),subject=(f.get("subject")||"").toString().trim(),message=(f.get("message")||"").toString().trim();
 if(!name||!email||!message)return say("Please fill in your name, email and message.",false);
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return say("Please enter a valid email address.",false);
 if(!sb)return say("The site could not load. Refresh the page and try again.",false);
 btn.disabled=true;btn.textContent="Sending…";say("",true);
 try{
  let {error}=await sb.from("contact_messages").insert({name,email,subject:subject||null,message});
  /* older database without the subject column: keep the subject inside the message instead of failing */
  if(error&&/subject/i.test(error.message)&&/(schema cache|column)/i.test(error.message)){
   console.warn("contact_messages.subject is missing – run the latest supabase/schema.sql. Sending without it.");
   ({error}=await sb.from("contact_messages").insert({name,email,message:subject?`Subject: ${subject}\n\n${message}`:message}))}
  if(error)throw error;
  form.reset();say("Thank you! Your message has been sent. We will reply by email.",true);showToast("Message sent successfully.")
 }catch(err){say(friendlyError(err.message),false);showToast(err.message,"error")}
 finally{btn.disabled=false;btn.textContent="Send message"}})})();

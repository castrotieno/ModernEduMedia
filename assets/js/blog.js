/* Blog v6: featured article, category chips, search, load more */
let posts=[],cat="",shown=9;const $=id=>document.getElementById(id);
async function load(){const {data}=await sb.from("blogs").select("*").eq("is_published",true).order("created_at",{ascending:false});posts=data||[];
 const cats=[...new Set(posts.map(p=>p.category).filter(Boolean))];
 $("catChips").innerHTML=['<button class="chip active" data-c="">All</button>',...cats.map(c=>`<button class="chip" data-c="${esc(c)}">${esc(c)}</button>`)].join("");
 $("catChips").onclick=e=>{const b=e.target.closest("[data-c]");if(!b)return;cat=b.dataset.c;shown=9;document.querySelectorAll("#catChips .chip").forEach(x=>x.classList.toggle("active",x===b));render()};render()}
function render(){const q=$("blogSearch").value.trim().toLowerCase();
 const out=posts.filter(p=>(!q||(p.title+" "+p.content+" "+(p.category||"")).toLowerCase().includes(q))&&(!cat||p.category===cat));
 const lead=!q&&!cat?(out.find(p=>p.featured)||out[0]):null,rest=lead?out.filter(p=>p!==lead):out,vis=rest.slice(0,shown);
 $("empty").classList.toggle("hidden",out.length>0);$("blogCount").textContent=out.length?`${out.length} article${out.length>1?"s":""}`:"";
 $("blogGrid").innerHTML=(lead?blogCard(lead,true):"")+vis.map(p=>blogCard(p)).join("");$("moreBtn").classList.toggle("hidden",rest.length<=shown)}
$("blogFilters").onsubmit=e=>{e.preventDefault();render()};$("blogSearch").oninput=()=>{shown=9;render()};$("moreBtn").onclick=()=>{shown+=9;render()};load();

let posts=[];
async function load(){const {data}=await sb.from("blogs").select("*").eq("is_published",true).order("created_at",{ascending:false});posts=data||[];
const cats=[...new Set(posts.map(p=>p.category).filter(Boolean))];categoryFilter.innerHTML='<option value="">All categories</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join("");render()}
function render(){const q=blogSearch.value.toLowerCase(),c=categoryFilter.value;const out=posts.filter(p=>(!q||(p.title+" "+p.content).toLowerCase().includes(q))&&(!c||p.category===c));
empty.classList.toggle("hidden",out.length>0);blogGrid.innerHTML=out.map((p,i)=>blogCard(p,i===0&&!q&&!c&&out.length>1)).join("")}
blogFilters.onsubmit=e=>{e.preventDefault();render()};blogSearch.oninput=render;categoryFilter.onchange=render;load();

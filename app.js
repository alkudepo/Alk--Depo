
const allData = window.INVENTORY_DATA || [];
const validCabinets = ["D1","D2","D3","D4"];
let selectedCabinet = validCabinets.includes(location.hash.replace("#","").toUpperCase())
  ? location.hash.replace("#","").toUpperCase() : "ALL";

const q = document.getElementById("search");
const tableBody = document.getElementById("tableBody");
const empty = document.getElementById("empty");
const title = document.getElementById("sectionTitle");
const updated = document.getElementById("updated");

function normalize(v){ return String(v || "").toLocaleLowerCase("tr-TR"); }
function getFiltered(){
  const term = normalize(q.value.trim());
  return allData.filter(item => {
    const cabinetMatch = selectedCabinet === "ALL" || item.cabinet === selectedCabinet;
    const haystack = normalize([item.code,item.category,item.name,item.brand,item.model,item.cabinet,item.status,item.usage].join(" "));
    return cabinetMatch && (!term || haystack.includes(term));
  });
}
function badge(status){ return `<span class="badge ${status==="Eksik"?"bad":"ok"}">${status}</span>`; }
function renderStats(list){
  const system = list.reduce((s,x)=>s+Number(x.system||0),0);
  const physical = list.reduce((s,x)=>s+Number(x.physical||0),0);
  document.getElementById("statKinds").textContent=list.length;
  document.getElementById("statSystem").textContent=system;
  document.getElementById("statPhysical").textContent=physical;
  document.getElementById("statMissing").textContent=Math.max(0,system-physical);
}
function renderCabinets(){
  const grid=document.getElementById("cabinetGrid");
  grid.innerHTML=validCabinets.map(code=>{
    const items=allData.filter(x=>x.cabinet===code);
    const physical=items.reduce((s,x)=>s+Number(x.physical||0),0);
    return `<article class="cabinet ${selectedCabinet===code?"active":""}" data-code="${code}">
      <div class="cabinet-code">${code}</div>
      <div class="cabinet-meta">${items.length} ürün çeşidi • ${physical} fiziksel stok</div>
    </article>`;
  }).join("");
  grid.querySelectorAll(".cabinet").forEach(el=>el.addEventListener("click",()=>{
    selectedCabinet=el.dataset.code;
    location.hash=selectedCabinet;
    render();
  }));
}
function render(){
  const list=getFiltered();
  renderStats(list);
  renderCabinets();
  title.textContent=selectedCabinet==="ALL"?"Tüm Envanter":`${selectedCabinet} Dolabı`;
  updated.textContent="Son görüntüleme: "+new Date().toLocaleString("tr-TR");
  tableBody.innerHTML=list.map(x=>`<tr>
    <td><strong>${x.code}</strong></td>
    <td>${x.category}</td>
    <td>${x.name}</td>
    <td>${x.brand||"-"}</td>
    <td>${x.model||"-"}</td>
    <td>${x.system}</td>
    <td>${x.physical}</td>
    <td><strong>${x.cabinet}</strong></td>
    <td>${badge(x.status)}</td>
  </tr>`).join("");
  empty.hidden=list.length>0;
  document.querySelector(".table-shell").hidden=list.length===0;
}
document.getElementById("showAll").addEventListener("click",()=>{
  selectedCabinet="ALL"; q.value=""; history.replaceState(null,"",location.pathname); render();
});
q.addEventListener("input",render);
window.addEventListener("hashchange",()=>{
  const h=location.hash.replace("#","").toUpperCase();
  selectedCabinet=validCabinets.includes(h)?h:"ALL"; render();
});
render();

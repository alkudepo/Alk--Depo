
const STORAGE_KEY="alku_depo_v3";
const cabinets=["ALL","D1","D2","D3","D4"];
let state=loadState();
let cabinet=(location.hash||"").replace("#","").toUpperCase();
if(!cabinets.includes(cabinet)) cabinet="ALL";

function loadState(){
  const saved=localStorage.getItem(STORAGE_KEY);
  if(saved){
    try{return JSON.parse(saved)}catch(e){}
  }
  return {inventory:structuredClone(window.INITIAL_INVENTORY||[]),movements:[]};
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.style.display="block";setTimeout(()=>t.style.display="none",3000)}
function normalize(v){return String(v||"").toLocaleLowerCase("tr-TR")}
function filtered(){
  const q=normalize(document.getElementById("search").value);
  return state.inventory.filter(x=>(cabinet==="ALL"||x.cabinet===cabinet)&&(!q||normalize([x.code,x.category,x.name,x.brand,x.model,x.cabinet].join(" ")).includes(q)));
}
function render(){
  const list=filtered();
  document.getElementById("inventoryTitle").textContent=cabinet==="ALL"?"Tüm Envanter":cabinet+" Dolabı";
  document.getElementById("statKinds").textContent=list.length;
  const sys=list.reduce((s,x)=>s+Number(x.system||0),0), phy=list.reduce((s,x)=>s+Number(x.physical||0),0);
  document.getElementById("statSystem").textContent=sys;
  document.getElementById("statPhysical").textContent=phy;
  document.getElementById("statMissing").textContent=Math.max(0,sys-phy);
  document.getElementById("cabinetTabs").innerHTML=cabinets.map(c=>`<button class="tab ${c===cabinet?"active":""}" data-c="${c}">${c==="ALL"?"Tümü":c}</button>`).join("");
  document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{cabinet=b.dataset.c;history.replaceState(null,"",cabinet==="ALL"?location.pathname:"#"+cabinet);render()});
  document.getElementById("inventoryBody").innerHTML=list.map(x=>`<tr><td><b>${x.code}</b></td><td>${x.category}</td><td>${x.name}</td><td>${x.brand||"-"}</td><td>${x.model||"-"}</td><td>${x.system}</td><td>${x.physical}</td><td><b>${x.cabinet}</b></td><td><span class="badge ${x.status==="Eksik"?"bad":"ok"}">${x.status}</span></td></tr>`).join("");
  document.getElementById("movementBody").innerHTML=state.movements.slice().reverse().map(m=>`<tr><td>${m.date}</td><td>${m.type}</td><td>${m.name}</td><td>${m.qty}</td><td>${m.person}</td><td>${m.unit||"-"}</td><td>${m.operator||"-"}</td><td><span class="badge ${m.status==="Açık"?"warn":"ok"}">${m.status}</span></td></tr>`).join("");
  fillSelects();
}
function fillSelects(){
  document.getElementById("giveCode").innerHTML=state.inventory.map(x=>`<option value="${x.code}">${x.code} — ${x.name} (${x.physical} adet)</option>`).join("");
  const open=state.movements.filter(m=>m.status==="Açık");
  document.getElementById("receiveMovement").innerHTML=open.map(m=>`<option value="${m.id}">${m.name} — ${m.person} — ${m.qty} adet</option>`).join("");
}
function openModal(id){document.getElementById(id).classList.add("show")}
function closeModal(id){document.getElementById(id).classList.remove("show")}
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
document.getElementById("giveBtn").onclick=()=>openModal("giveModal");
document.getElementById("receiveBtn").onclick=()=>openModal("receiveModal");
document.getElementById("search").addEventListener("input",render);
document.getElementById("resetBtn").onclick=()=>{cabinet="ALL";document.getElementById("search").value="";history.replaceState(null,"",location.pathname);render()};

document.getElementById("saveGive").onclick=()=>{
  const code=document.getElementById("giveCode").value;
  const qty=Number(document.getElementById("giveQty").value);
  const person=document.getElementById("givePerson").value.trim();
  const unit=document.getElementById("giveUnit").value.trim();
  const operator=document.getElementById("giveOperator").value.trim();
  if(!person||!qty||qty<1){toast("Alan kişi ve adet zorunlu.");return}
  const item=state.inventory.find(x=>x.code===code);
  if(!item||qty>item.physical){toast("Yeterli fiziksel stok yok.");return}
  item.physical-=qty;
  item.status=item.physical<item.system?"Eksik":"Depoda";
  state.movements.push({
    id:crypto.randomUUID(),date:new Date().toLocaleString("tr-TR"),type:"VERİLDİ",
    code,name:item.name,qty,person,unit,operator,status:"Açık",
    plannedReturn:document.getElementById("giveReturn").value,
    note:document.getElementById("giveNote").value
  });
  saveState();closeModal("giveModal");render();toast("Malzeme çıkışı kaydedildi.");
};

document.getElementById("saveReceive").onclick=()=>{
  const id=document.getElementById("receiveMovement").value;
  const qty=Number(document.getElementById("receiveQty").value);
  const operator=document.getElementById("receiveOperator").value.trim();
  const m=state.movements.find(x=>x.id===id&&x.status==="Açık");
  if(!m||!qty||qty<1||qty>m.qty){toast("İade adedini kontrol et.");return}
  const item=state.inventory.find(x=>x.code===m.code);
  item.physical+=qty;
  item.status=item.physical<item.system?"Eksik":"Depoda";
  if(qty===m.qty){m.status="İade Edildi";m.returnDate=new Date().toLocaleString("tr-TR")}
  else{m.qty-=qty}
  state.movements.push({
    id:crypto.randomUUID(),date:new Date().toLocaleString("tr-TR"),type:"TESLİM ALINDI",
    code:m.code,name:m.name,qty,person:m.person,unit:m.unit,operator,status:"Tamamlandı",
    note:document.getElementById("receiveNote").value
  });
  saveState();closeModal("receiveModal");render();toast("İade kaydedildi.");
};

document.getElementById("exportBtn").onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  a.download="ALKU_Depo_Yedek_"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(a.href);
};
document.getElementById("importInput").onchange=e=>{
  const file=e.target.files[0];if(!file)return;
  const r=new FileReader();r.onload=()=>{
    try{state=JSON.parse(r.result);saveState();render();toast("Yedek yüklendi.")}
    catch(err){toast("Yedek dosyası geçersiz.")}
  };r.readAsText(file);
};
render();

const STORAGE_KEY="alku_depo_v4";
const OLD_STORAGE_KEY="alku_depo_v3";
const cabinets=["ALL","D1","D2","D3","D4"];
let state=loadState();
let cabinet=(location.hash||"").replace("#","").toUpperCase();
let selectedCountCode=null;
if(!cabinets.includes(cabinet)) cabinet="ALL";

function cloneInitial(){
  return JSON.parse(JSON.stringify(window.INITIAL_INVENTORY||[]));
}
function loadState(){
  const saved=localStorage.getItem(STORAGE_KEY);
  if(saved){
    try{return normalizeState(JSON.parse(saved))}catch(e){}
  }
  const old=localStorage.getItem(OLD_STORAGE_KEY);
  if(old){
    try{
      const migrated=normalizeState(JSON.parse(old));
      localStorage.setItem(STORAGE_KEY,JSON.stringify(migrated));
      return migrated;
    }catch(e){}
  }
  return normalizeState({inventory:cloneInitial(),movements:[]});
}
function normalizeState(s){
  if(!s||!Array.isArray(s.inventory)) s={inventory:cloneInitial(),movements:[]};
  if(!Array.isArray(s.movements)) s.movements=[];
  s.inventory.forEach(updateStatus);
  return s;
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function toast(msg){
  const t=document.getElementById("toast");t.textContent=msg;t.style.display="block";
  clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>t.style.display="none",3200);
}
function esc(v){
  return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
function normalize(v){return String(v||"").toLocaleLowerCase("tr-TR")}
function updateStatus(item){
  item.system=Math.max(0,Number(item.system)||0);
  item.physical=Math.max(0,Number(item.physical)||0);
  item.status=item.physical<item.system?"Eksik":item.physical>item.system?"Fazla":"Depoda";
  return item;
}
function statusClass(status){return status==="Eksik"?"bad":status==="Fazla"?"warn":"ok"}
function filtered(){
  const q=normalize(document.getElementById("search").value);
  return state.inventory.filter(x=>(cabinet==="ALL"||x.cabinet===cabinet)&&(!q||normalize([x.code,x.category,x.name,x.brand,x.model,x.cabinet].join(" ")).includes(q)));
}
function movementChange(m){
  if(m.change)return m.change;
  return m.qty!==undefined?`${m.qty} adet`:"-";
}
function render(){
  state.inventory.forEach(updateStatus);
  const list=filtered();
  document.getElementById("inventoryTitle").textContent=cabinet==="ALL"?"Tüm Envanter":cabinet+" Dolabı";
  document.getElementById("statKinds").textContent=list.length;
  const sys=list.reduce((s,x)=>s+Number(x.system||0),0);
  const phy=list.reduce((s,x)=>s+Number(x.physical||0),0);
  const missing=list.reduce((s,x)=>s+Math.max(0,Number(x.system||0)-Number(x.physical||0)),0);
  document.getElementById("statSystem").textContent=sys;
  document.getElementById("statPhysical").textContent=phy;
  document.getElementById("statMissing").textContent=missing;

  document.getElementById("cabinetTabs").innerHTML=cabinets.map(c=>`<button class="tab ${c===cabinet?"active":""}" data-c="${c}">${c==="ALL"?"Tümü":c}</button>`).join("");
  document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
    cabinet=b.dataset.c;
    history.replaceState(null,"",cabinet==="ALL"?location.pathname:"#"+cabinet);
    render();
  });

  const body=document.getElementById("inventoryBody");
  body.innerHTML=list.length?list.map(x=>`<tr>
    <td><b>${esc(x.code)}</b></td><td>${esc(x.category)}</td><td>${esc(x.name)}</td>
    <td>${esc(x.brand||"-")}</td><td>${esc(x.model||"-")}</td>
    <td>${x.system}</td><td>${x.physical}</td><td><b>${esc(x.cabinet)}</b></td>
    <td><span class="badge ${statusClass(x.status)}">${esc(x.status)}</span></td>
    <td><div class="row-actions">
      <button class="mini primary" data-count="${esc(x.code)}">Sayım</button>
      <button class="mini ghost" data-edit="${esc(x.code)}">Düzenle</button>
      <button class="mini danger" data-delete="${esc(x.code)}">Sil</button>
    </div></td>
  </tr>`).join(""):`<tr><td colspan="10" class="empty">Kayıt bulunamadı.</td></tr>`;

  document.querySelectorAll("[data-count]").forEach(b=>b.onclick=()=>openCount(b.dataset.count));
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openEdit(b.dataset.edit));
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteItem(b.dataset.delete));

  document.getElementById("movementBody").innerHTML=state.movements.length?state.movements.slice().reverse().map(m=>`<tr>
    <td>${esc(m.date)}</td><td>${esc(m.type)}</td><td>${esc(m.name)}</td>
    <td>${esc(movementChange(m))}</td><td>${esc(m.person||"-")}</td><td>${esc(m.unit||"-")}</td>
    <td>${esc(m.operator||"-")}</td><td><span class="badge ${m.status==="Açık"?"warn":"ok"}">${esc(m.status||"Tamamlandı")}</span></td>
  </tr>`).join(""):`<tr><td colspan="8" class="empty">Henüz hareket kaydı yok.</td></tr>`;
  fillSelects();
}
function fillSelects(){
  document.getElementById("giveCode").innerHTML=state.inventory.map(x=>`<option value="${esc(x.code)}">${esc(x.code)} — ${esc(x.name)} (${x.physical} adet)</option>`).join("");
  const open=state.movements.filter(m=>m.status==="Açık");
  document.getElementById("receiveMovement").innerHTML=open.length?open.map(m=>`<option value="${esc(m.id)}">${esc(m.name)} — ${esc(m.person)} — ${m.qty} adet</option>`).join(""):`<option value="">Açık hareket yok</option>`;
}
function openModal(id){document.getElementById(id).classList.add("show")}
function closeModal(id){document.getElementById(id).classList.remove("show")}
function uuid(){return crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(16).slice(2)}
function now(){return new Date().toLocaleString("tr-TR")}
function addMovement(m){
  state.movements.push({id:uuid(),date:now(),status:"Tamamlandı",person:"-",unit:"-",operator:"-",...m});
}
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
document.querySelectorAll(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModal(m.id)}));
document.getElementById("giveBtn").onclick=()=>openModal("giveModal");
document.getElementById("receiveBtn").onclick=()=>openModal("receiveModal");
document.getElementById("addBtn").onclick=openAdd;
document.getElementById("search").addEventListener("input",render);
document.getElementById("resetBtn").onclick=()=>{
  cabinet="ALL";document.getElementById("search").value="";
  history.replaceState(null,"",location.pathname);render();
};

function openCount(code){
  const item=state.inventory.find(x=>x.code===code);if(!item)return;
  selectedCountCode=code;
  document.getElementById("countItemTitle").textContent=`${item.code} — ${item.name}`;
  document.getElementById("countSystem").textContent=item.system;
  document.getElementById("countOldPhysical").textContent=item.physical;
  document.getElementById("countPhysical").value=item.physical;
  document.getElementById("countOperator").value="";
  document.getElementById("countNote").value="";
  openModal("countModal");
}
document.getElementById("saveCount").onclick=()=>{
  const item=state.inventory.find(x=>x.code===selectedCountCode);
  const newPhysical=Number(document.getElementById("countPhysical").value);
  const operator=document.getElementById("countOperator").value.trim();
  if(!item||!Number.isFinite(newPhysical)||newPhysical<0){toast("Geçerli bir fiziksel sayı gir.");return}
  if(!operator){toast("İşlemi yapan kişiyi yaz.");return}
  const old=item.physical;
  item.physical=newPhysical;updateStatus(item);
  addMovement({type:"SAYIM GÜNCELLENDİ",code:item.code,name:item.name,change:`${old} → ${newPhysical}`,operator,status:item.status,note:document.getElementById("countNote").value.trim()});
  saveState();closeModal("countModal");render();toast(`Sayım güncellendi: ${item.status}`);
};

function clearItemForm(){
  ["editOriginalCode","itemCode","itemCategory","itemName","itemBrand","itemModel","itemOperator"].forEach(id=>document.getElementById(id).value="");
  document.getElementById("itemSystem").value=0;
  document.getElementById("itemPhysical").value=0;
  document.getElementById("itemCabinet").value="D1";
  document.getElementById("itemUsage").value="Aktif";
}
function openAdd(){
  clearItemForm();document.getElementById("itemModalTitle").textContent="Yeni Malzeme Ekle";openModal("itemModal");
}
function openEdit(code){
  const x=state.inventory.find(i=>i.code===code);if(!x)return;
  document.getElementById("itemModalTitle").textContent="Malzemeyi Düzenle";
  document.getElementById("editOriginalCode").value=x.code;
  document.getElementById("itemCode").value=x.code;
  document.getElementById("itemCategory").value=x.category||"";
  document.getElementById("itemName").value=x.name||"";
  document.getElementById("itemBrand").value=x.brand||"";
  document.getElementById("itemModel").value=x.model||"";
  document.getElementById("itemSystem").value=x.system;
  document.getElementById("itemPhysical").value=x.physical;
  document.getElementById("itemCabinet").value=x.cabinet||"D1";
  document.getElementById("itemUsage").value=x.usage||"Aktif";
  document.getElementById("itemOperator").value="";
  openModal("itemModal");
}
document.getElementById("saveItem").onclick=()=>{
  const original=document.getElementById("editOriginalCode").value.trim();
  const data={
    code:document.getElementById("itemCode").value.trim().toUpperCase(),
    category:document.getElementById("itemCategory").value.trim(),
    name:document.getElementById("itemName").value.trim(),
    brand:document.getElementById("itemBrand").value.trim(),
    model:document.getElementById("itemModel").value.trim(),
    system:Number(document.getElementById("itemSystem").value),
    physical:Number(document.getElementById("itemPhysical").value),
    cabinet:document.getElementById("itemCabinet").value,
    usage:document.getElementById("itemUsage").value
  };
  const operator=document.getElementById("itemOperator").value.trim();
  if(!data.code||!data.category||!data.name){toast("Kod, kategori ve malzeme adı zorunlu.");return}
  if(!Number.isFinite(data.system)||data.system<0||!Number.isFinite(data.physical)||data.physical<0){toast("Stok değerlerini kontrol et.");return}
  if(!operator){toast("İşlemi yapan kişiyi yaz.");return}
  const duplicate=state.inventory.find(x=>x.code===data.code&&x.code!==original);
  if(duplicate){toast("Bu ürün kodu zaten kullanılıyor.");return}
  updateStatus(data);
  if(original){
    const index=state.inventory.findIndex(x=>x.code===original);if(index<0)return;
    const old=state.inventory[index];
    state.inventory[index]={...old,...data};
    addMovement({type:"MALZEME DÜZENLENDİ",code:data.code,name:data.name,change:`Stok ${old.system}/${old.physical} → ${data.system}/${data.physical}`,operator,status:data.status});
  }else{
    state.inventory.push(data);
    addMovement({type:"MALZEME EKLENDİ",code:data.code,name:data.name,change:`${data.physical} adet`,operator,status:data.status});
  }
  saveState();closeModal("itemModal");render();toast(original?"Malzeme güncellendi.":"Malzeme eklendi.");
};
function deleteItem(code){
  const item=state.inventory.find(x=>x.code===code);if(!item)return;
  const openMove=state.movements.some(m=>m.code===code&&m.status==="Açık");
  if(openMove){toast("Bu malzemeye ait açık teslim hareketi var; önce teslim al.");return}
  if(!confirm(`${item.code} — ${item.name}\n\nBu kaydı silmek istediğine emin misin?`))return;
  const operator=prompt("İşlemi yapan kişinin adını yaz:");
  if(!operator||!operator.trim()){toast("Silme işlemi iptal edildi.");return}
  state.inventory=state.inventory.filter(x=>x.code!==code);
  addMovement({type:"MALZEME SİLİNDİ",code:item.code,name:item.name,change:`${item.physical} adet`,operator:operator.trim(),status:"Silindi"});
  saveState();render();toast("Malzeme silindi.");
}

document.getElementById("saveGive").onclick=()=>{
  const code=document.getElementById("giveCode").value;
  const qty=Number(document.getElementById("giveQty").value);
  const person=document.getElementById("givePerson").value.trim();
  const unit=document.getElementById("giveUnit").value.trim();
  const operator=document.getElementById("giveOperator").value.trim();
  if(!person||!qty||qty<1){toast("Alan kişi ve adet zorunlu.");return}
  if(!operator){toast("İşlemi yapan kişiyi yaz.");return}
  const item=state.inventory.find(x=>x.code===code);
  if(!item||qty>item.physical){toast("Yeterli fiziksel stok yok.");return}
  item.physical-=qty;updateStatus(item);
  state.movements.push({
    id:uuid(),date:now(),type:"VERİLDİ",code,name:item.name,qty,person,unit,operator,status:"Açık",
    plannedReturn:document.getElementById("giveReturn").value,note:document.getElementById("giveNote").value
  });
  saveState();closeModal("giveModal");render();toast("Malzeme çıkışı kaydedildi.");
};

document.getElementById("saveReceive").onclick=()=>{
  const id=document.getElementById("receiveMovement").value;
  const qty=Number(document.getElementById("receiveQty").value);
  const operator=document.getElementById("receiveOperator").value.trim();
  const m=state.movements.find(x=>x.id===id&&x.status==="Açık");
  if(!m||!qty||qty<1||qty>m.qty){toast("İade adedini kontrol et.");return}
  if(!operator){toast("İşlemi yapan kişiyi yaz.");return}
  const item=state.inventory.find(x=>x.code===m.code);
  if(!item){toast("Malzeme kaydı bulunamadı.");return}
  item.physical+=qty;updateStatus(item);
  if(qty===m.qty){m.status="İade Edildi";m.returnDate=now()}else{m.qty-=qty}
  addMovement({type:"TESLİM ALINDI",code:m.code,name:m.name,qty,person:m.person,unit:m.unit,operator,status:"Tamamlandı",note:document.getElementById("receiveNote").value});
  saveState();closeModal("receiveModal");render();toast("İade kaydedildi.");
};

document.getElementById("exportBtn").onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  a.download="ALKU_Depo_V4_Yedek_"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(a.href);
};
document.getElementById("importInput").onchange=e=>{
  const file=e.target.files[0];if(!file)return;
  const r=new FileReader();r.onload=()=>{
    try{
      const imported=normalizeState(JSON.parse(r.result));
      if(!confirm("Mevcut veriler yedek dosyasındaki verilerle değiştirilecek. Devam edilsin mi?"))return;
      state=imported;saveState();render();toast("Yedek yüklendi.");
    }catch(err){toast("Yedek dosyası geçersiz.")}
  };r.readAsText(file);
};
render();
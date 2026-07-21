const STORAGE_KEY="alku_depo_v6";
const LEGACY_KEYS=["alku_depo_v5","alku_depo_v4","alku_depo_v3"];
let state=loadState(), currentWarehouse=null, currentLocation="ALL", selectedCountCode=null;
let reportHeaders=[],reportRows=[],reportTitle="";

function clone(v){return JSON.parse(JSON.stringify(v))}
function initialState(){return {warehouses:clone(window.INITIAL_WAREHOUSES||[]),inventory:clone(window.INITIAL_INVENTORY||[]),movements:[]}}
function migrate(s){
  if(!s||!Array.isArray(s.inventory))s=initialState();
  if(!Array.isArray(s.warehouses))s.warehouses=clone(window.INITIAL_WAREHOUSES||[]);
  if(!Array.isArray(s.movements))s.movements=[];
  s.inventory.forEach(x=>{if(!x.warehouse){x.warehouse="SES";x.warehouseName="Ses Sistemi Deposu"}updateStatus(x)});
  return s;
}
function loadState(){
  const saved=localStorage.getItem(STORAGE_KEY);
  if(saved){try{return migrate(JSON.parse(saved))}catch(e){}}
  for(const k of LEGACY_KEYS){const v=localStorage.getItem(k);if(v){try{const s=migrate(JSON.parse(v));localStorage.setItem(STORAGE_KEY,JSON.stringify(s));return s}catch(e){}}}
  return initialState();
}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function norm(v){return String(v||"").toLocaleLowerCase("tr-TR")}
function uuid(){return crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(16).slice(2)}
function now(){return new Date().toLocaleString("tr-TR")}
function toast(t){const e=document.getElementById("toast");e.textContent=t;e.style.display="block";clearTimeout(window.__t);window.__t=setTimeout(()=>e.style.display="none",3000)}
function updateStatus(x){x.system=Math.max(0,Number(x.system)||0);x.physical=Math.max(0,Number(x.physical)||0);x.status=x.physical<x.system?"Eksik":x.physical>x.system?"Fazla":"Depoda"}
function statusClass(s){return s==="Eksik"?"bad":s==="Fazla"?"warn":"ok"}
function warehouse(id){return state.warehouses.find(w=>w.id===id)}
function openModal(id){document.getElementById(id).classList.add("show")}
function closeModal(id){document.getElementById(id).classList.remove("show")}
function addMovement(m){state.movements.push({id:uuid(),date:now(),status:"Tamamlandı",person:"-",unit:"-",operator:"-",...m})}

document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
document.querySelectorAll(".modal").forEach(m=>m.onclick=e=>{if(e.target===m)closeModal(m.id)});

function showWarehouses(){
  currentWarehouse=null;currentLocation="ALL";
  document.getElementById("warehouseView").classList.remove("hidden");
  document.getElementById("inventoryView").classList.add("hidden");
  renderWarehouseCards();
}
function openWarehouse(id){
  currentWarehouse=id;currentLocation="ALL";
  document.getElementById("warehouseView").classList.add("hidden");
  document.getElementById("inventoryView").classList.remove("hidden");
  renderInventory();
}
function renderWarehouseCards(){
  document.getElementById("warehouseCards").innerHTML=state.warehouses.map(w=>{
    const items=state.inventory.filter(x=>x.warehouse===w.id);
    const total=items.reduce((s,x)=>s+x.physical,0);
    return `<article class="warehouse-card" data-w="${esc(w.id)}"><div class="warehouse-icon">${esc(w.icon||"📦")}</div><h3>${esc(w.name)}</h3><p>${esc(w.description||"")}</p><div class="warehouse-meta"><span>${items.length} çeşit</span><span>${total} adet</span></div></article>`
  }).join("");
  document.querySelectorAll("[data-w]").forEach(c=>c.onclick=()=>openWarehouse(c.dataset.w));
}
function warehouseItems(){
  const q=norm(document.getElementById("search").value);
  return state.inventory.filter(x=>x.warehouse===currentWarehouse&&(currentLocation==="ALL"||x.cabinet===currentLocation)&&(!q||norm([x.code,x.category,x.name,x.brand,x.model,x.cabinet].join(" ")).includes(q)));
}
function renderInventory(){
  const w=warehouse(currentWarehouse);if(!w)return showWarehouses();
  document.getElementById("warehouseTitle").textContent=(w.icon||"📦")+" "+w.name;
  document.getElementById("warehouseDescription").textContent=w.description||"";
  const locations=["ALL",...(w.locations||[])];
  if(!locations.includes(currentLocation))currentLocation="ALL";
  document.getElementById("locationTabs").innerHTML=locations.map(l=>`<button class="tab ${l===currentLocation?"active":""}" data-l="${esc(l)}">${l==="ALL"?"Tümü":esc(l)}</button>`).join("");
  document.querySelectorAll("[data-l]").forEach(b=>b.onclick=()=>{currentLocation=b.dataset.l;renderInventory()});
  const list=warehouseItems();list.forEach(updateStatus);
  document.getElementById("inventoryTitle").textContent=currentLocation==="ALL"?"Tüm Envanter":currentLocation+" Dolap / Raf";
  document.getElementById("statKinds").textContent=list.length;
  document.getElementById("statSystem").textContent=list.reduce((s,x)=>s+x.system,0);
  document.getElementById("statPhysical").textContent=list.reduce((s,x)=>s+x.physical,0);
  document.getElementById("statMissing").textContent=list.reduce((s,x)=>s+Math.max(0,x.system-x.physical),0);
  document.getElementById("inventoryBody").innerHTML=list.length?list.map(x=>`<tr>
    <td><b>${esc(x.code)}</b></td><td>${esc(x.category)}</td><td>${esc(x.name)}</td><td>${esc(x.brand||"-")}</td><td>${esc(x.model||"-")}</td>
    <td>${x.system}</td><td>${x.physical}</td><td><b>${esc(x.cabinet||"-")}</b></td><td><span class="badge ${statusClass(x.status)}">${esc(x.status)}</span></td>
    <td><div class="row-actions"><button class="mini primary" data-count="${esc(x.code)}">Sayım</button><button class="mini ghost" data-edit="${esc(x.code)}">Düzenle</button><button class="mini danger" data-delete="${esc(x.code)}">Sil</button></div></td>
  </tr>`).join(""):`<tr><td colspan="10" class="empty">Bu depoda henüz malzeme yok. “Malzeme Ekle” ile başlayabilirsiniz.</td></tr>`;
  document.querySelectorAll("[data-count]").forEach(b=>b.onclick=()=>openCount(b.dataset.count));
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openEdit(b.dataset.edit));
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteItem(b.dataset.delete));
  const movements=state.movements.filter(m=>m.warehouse===currentWarehouse).slice().reverse();
  document.getElementById("movementBody").innerHTML=movements.length?movements.map(m=>`<tr><td>${esc(m.date)}</td><td>${esc(m.type)}</td><td>${esc(m.name)}</td><td>${esc(m.change||((m.qty||"-")+" adet"))}</td><td>${esc(m.person||"-")}</td><td>${esc(m.unit||"-")}</td><td>${esc(m.operator||"-")}</td><td><span class="badge ${m.status==="Açık"?"warn":"ok"}">${esc(m.status||"Tamamlandı")}</span></td></tr>`).join(""):`<tr><td colspan="8" class="empty">Henüz hareket yok.</td></tr>`;
  fillSelects();
}
function fillSelects(){
  const items=state.inventory.filter(x=>x.warehouse===currentWarehouse);
  document.getElementById("giveCode").innerHTML=items.map(x=>`<option value="${esc(x.code)}">${esc(x.code)} — ${esc(x.name)} (${x.physical})</option>`).join("");
  const open=state.movements.filter(m=>m.warehouse===currentWarehouse&&m.status==="Açık");
  document.getElementById("receiveMovement").innerHTML=open.length?open.map(m=>`<option value="${esc(m.id)}">${esc(m.name)} — ${esc(m.person)} — ${m.qty} adet</option>`).join(""):`<option value="">Açık hareket yok</option>`;
}
function fillLocations(selected){
  const w=warehouse(currentWarehouse), list=(w&&w.locations)||[];
  document.getElementById("itemLocation").innerHTML=list.length?list.map(l=>`<option ${l===selected?"selected":""}>${esc(l)}</option>`).join(""):`<option>Genel</option>`;
}

document.getElementById("homeBtn").onclick=showWarehouses;
document.getElementById("backBtn").onclick=showWarehouses;
document.getElementById("search").oninput=renderInventory;
document.getElementById("resetBtn").onclick=()=>{currentLocation="ALL";document.getElementById("search").value="";renderInventory()};

document.getElementById("addWarehouseBtn").onclick=()=>openModal("warehouseModal");
document.getElementById("saveWarehouse").onclick=()=>{
  const id=document.getElementById("warehouseCode").value.trim().toUpperCase();
  const name=document.getElementById("warehouseName").value.trim();
  if(!id||!name)return toast("Depo kodu ve adı zorunlu.");
  if(state.warehouses.some(w=>w.id===id))return toast("Bu depo kodu kullanılıyor.");
  const locations=document.getElementById("warehouseLocations").value.split(",").map(x=>x.trim()).filter(Boolean);
  state.warehouses.push({id,name,icon:document.getElementById("warehouseIcon").value.trim()||"📦",description:document.getElementById("warehouseDesc").value.trim(),locations});
  save();closeModal("warehouseModal");renderWarehouseCards();toast("Yeni depo eklendi.");
};

document.getElementById("manageLocationsBtn").onclick=()=>{
  const w=warehouse(currentWarehouse);document.getElementById("locationsText").value=(w.locations||[]).join(", ");openModal("locationsModal")
};
document.getElementById("saveLocations").onclick=()=>{
  const w=warehouse(currentWarehouse);w.locations=[...new Set(document.getElementById("locationsText").value.split(",").map(x=>x.trim()).filter(Boolean))];
  save();closeModal("locationsModal");renderInventory();toast("Dolap / raf listesi güncellendi.");
};

function clearItem(){
  ["editOriginalCode","itemCode","itemCategory","itemName","itemBrand","itemModel","itemOperator"].forEach(id=>document.getElementById(id).value="");
  document.getElementById("itemSystem").value=0;document.getElementById("itemPhysical").value=0;document.getElementById("itemUsage").value="Aktif";fillLocations();
}
document.getElementById("addBtn").onclick=()=>{clearItem();document.getElementById("itemModalTitle").textContent="Yeni Malzeme Ekle";openModal("itemModal")};
function openEdit(code){
  const x=state.inventory.find(i=>i.code===code);if(!x)return;
  document.getElementById("itemModalTitle").textContent="Malzemeyi Düzenle";document.getElementById("editOriginalCode").value=x.code;
  document.getElementById("itemCode").value=x.code;document.getElementById("itemCategory").value=x.category||"";document.getElementById("itemName").value=x.name||"";
  document.getElementById("itemBrand").value=x.brand||"";document.getElementById("itemModel").value=x.model||"";document.getElementById("itemSystem").value=x.system;
  document.getElementById("itemPhysical").value=x.physical;document.getElementById("itemUsage").value=x.usage||"Aktif";document.getElementById("itemOperator").value="";
  fillLocations(x.cabinet);openModal("itemModal");
}
document.getElementById("saveItem").onclick=()=>{
  const original=document.getElementById("editOriginalCode").value.trim();
  const item={code:document.getElementById("itemCode").value.trim().toUpperCase(),category:document.getElementById("itemCategory").value.trim(),name:document.getElementById("itemName").value.trim(),brand:document.getElementById("itemBrand").value.trim(),model:document.getElementById("itemModel").value.trim(),system:Number(document.getElementById("itemSystem").value),physical:Number(document.getElementById("itemPhysical").value),cabinet:document.getElementById("itemLocation").value,usage:document.getElementById("itemUsage").value,warehouse:currentWarehouse,warehouseName:warehouse(currentWarehouse).name};
  const operator=document.getElementById("itemOperator").value.trim();
  if(!item.code||!item.category||!item.name||!operator)return toast("Kod, kategori, malzeme adı ve işlemi yapan zorunlu.");
  if(state.inventory.some(x=>x.code===item.code&&x.code!==original))return toast("Ürün kodu bütün sistemde benzersiz olmalı.");
  updateStatus(item);
  if(original){const i=state.inventory.findIndex(x=>x.code===original),old=state.inventory[i];state.inventory[i]={...old,...item};addMovement({warehouse:currentWarehouse,type:"MALZEME DÜZENLENDİ",code:item.code,name:item.name,change:`${old.system}/${old.physical} → ${item.system}/${item.physical}`,operator,status:item.status})}
  else{state.inventory.push(item);addMovement({warehouse:currentWarehouse,type:"MALZEME EKLENDİ",code:item.code,name:item.name,change:`${item.physical} adet`,operator,status:item.status})}
  save();closeModal("itemModal");renderInventory();toast(original?"Malzeme güncellendi.":"Malzeme eklendi.");
};
function deleteItem(code){
  const x=state.inventory.find(i=>i.code===code);if(!x)return;
  if(state.movements.some(m=>m.code===code&&m.status==="Açık"))return toast("Önce açık teslim hareketini kapatın.");
  if(!confirm(`${x.code} — ${x.name}\nSilinsin mi?`))return;
  const operator=prompt("İşlemi yapan kişinin adı:");if(!operator)return;
  state.inventory=state.inventory.filter(i=>i.code!==code);addMovement({warehouse:currentWarehouse,type:"MALZEME SİLİNDİ",code,name:x.name,change:`${x.physical} adet`,operator,status:"Silindi"});save();renderInventory();toast("Malzeme silindi.");
}

function openCount(code){
  const x=state.inventory.find(i=>i.code===code);selectedCountCode=code;document.getElementById("countTitle").textContent=x.code+" — "+x.name;document.getElementById("countSystem").textContent=x.system;document.getElementById("countOld").textContent=x.physical;document.getElementById("countNew").value=x.physical;document.getElementById("countOperator").value="";document.getElementById("countNote").value="";openModal("countModal")
}
document.getElementById("saveCount").onclick=()=>{
  const x=state.inventory.find(i=>i.code===selectedCountCode),n=Number(document.getElementById("countNew").value),op=document.getElementById("countOperator").value.trim();if(!x||n<0||!op)return toast("Sayı ve işlemi yapan zorunlu.");
  const old=x.physical;x.physical=n;updateStatus(x);addMovement({warehouse:currentWarehouse,type:"SAYIM GÜNCELLENDİ",code:x.code,name:x.name,change:`${old} → ${n}`,operator:op,status:x.status,note:document.getElementById("countNote").value.trim()});save();closeModal("countModal");renderInventory();toast("Sayım kaydedildi.");
};

document.getElementById("giveBtn").onclick=()=>openModal("giveModal");
document.getElementById("receiveBtn").onclick=()=>openModal("receiveModal");
document.getElementById("saveGive").onclick=()=>{
  const code=document.getElementById("giveCode").value,qty=Number(document.getElementById("giveQty").value),person=document.getElementById("givePerson").value.trim(),operator=document.getElementById("giveOperator").value.trim(),x=state.inventory.find(i=>i.code===code);
  if(!x||qty<1||qty>x.physical||!person||!operator)return toast("Bilgileri ve fiziksel stoku kontrol edin.");
  x.physical-=qty;updateStatus(x);state.movements.push({id:uuid(),date:now(),warehouse:currentWarehouse,type:"VERİLDİ",code,name:x.name,qty,person,unit:document.getElementById("giveUnit").value.trim(),operator,status:"Açık",plannedReturn:document.getElementById("giveReturn").value,note:document.getElementById("giveNote").value.trim()});save();closeModal("giveModal");renderInventory();toast("Malzeme çıkışı kaydedildi.");
};
document.getElementById("saveReceive").onclick=()=>{
  const id=document.getElementById("receiveMovement").value,qty=Number(document.getElementById("receiveQty").value),op=document.getElementById("receiveOperator").value.trim(),m=state.movements.find(x=>x.id===id&&x.status==="Açık");
  if(!m||qty<1||qty>m.qty||!op)return toast("İade bilgilerini kontrol edin.");
  const x=state.inventory.find(i=>i.code===m.code);if(x){x.physical+=qty;updateStatus(x)}
  m.qty-=qty;if(m.qty===0)m.status="İade Edildi";
  addMovement({warehouse:currentWarehouse,type:"TESLİM ALINDI",code:m.code,name:m.name,qty,person:m.person,unit:m.unit,operator:op,status:"Tamamlandı",note:document.getElementById("receiveNote").value.trim()});save();closeModal("receiveModal");renderInventory();toast("İade kaydedildi.");
};

document.getElementById("backupBtn").onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`ALKU_Depo_Yedek_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)
};
document.getElementById("restoreInput").onchange=e=>{
  const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{state=migrate(JSON.parse(r.result));save();showWarehouses();toast("Yedek yüklendi.")}catch(err){toast("Geçersiz yedek dosyası.")}};r.readAsText(f)
};

document.getElementById("reportBtn").onclick=()=>{fillReportWarehouses();openModal("reportModal");buildReport()};
function fillReportWarehouses(){
  const s=document.getElementById("reportWarehouse"),old=s.value;s.innerHTML=`<option value="ALL">Tüm Depolar</option>`+state.warehouses.map(w=>`<option value="${esc(w.id)}">${esc(w.name)}</option>`).join("");s.value=old||currentWarehouse||"ALL"
}
["reportType","reportWarehouse","reportStart","reportEnd"].forEach(id=>document.getElementById(id).onchange=buildReport);
document.getElementById("previewReport").onclick=buildReport;document.getElementById("printReport").onclick=()=>{buildReport();window.print()};document.getElementById("downloadCsv").onclick=downloadCsv;
function parseDate(v){if(!v)return null;const p=String(v).split(" ")[0].split(".");return p.length===3?new Date(+p[2],+p[1]-1,+p[0]):null}
function dateOk(m){const d=parseDate(m.date),s=document.getElementById("reportStart").value,e=document.getElementById("reportEnd").value;if(!d)return true;if(s&&d<new Date(s+"T00:00:00"))return false;if(e&&d>new Date(e+"T23:59:59"))return false;return true}
function buildReport(){
  const type=document.getElementById("reportType").value,wid=document.getElementById("reportWarehouse").value;
  const items=state.inventory.filter(x=>wid==="ALL"||x.warehouse===wid);
  const sys=items.reduce((s,x)=>s+x.system,0),phy=items.reduce((s,x)=>s+x.physical,0),miss=items.reduce((s,x)=>s+Math.max(0,x.system-x.physical),0);
  document.getElementById("reportSummary").innerHTML=`<div><span>Ürün çeşidi</span><strong>${items.length}</strong></div><div><span>Sistem stoku</span><strong>${sys}</strong></div><div><span>Fiziksel stok</span><strong>${phy}</strong></div><div><span>Eksik adet</span><strong>${miss}</strong></div>`;
  if(type==="inventory"){reportTitle="Güncel Envanter";reportHeaders=["Depo","Kod","Kategori","Malzeme","Marka","Model","Sistem","Fiziksel","Dolap/Raf","Durum"];reportRows=items.map(x=>[warehouse(x.warehouse)?.name||x.warehouse,x.code,x.category,x.name,x.brand||"-",x.model||"-",x.system,x.physical,x.cabinet||"-",x.status])}
  if(type==="exceptions"){reportTitle="Eksik / Fazla Malzemeler";reportHeaders=["Depo","Kod","Malzeme","Sistem","Fiziksel","Fark","Dolap/Raf","Durum"];reportRows=items.filter(x=>x.status!=="Depoda").map(x=>[warehouse(x.warehouse)?.name||x.warehouse,x.code,x.name,x.system,x.physical,x.physical-x.system,x.cabinet||"-",x.status])}
  if(type==="open"){reportTitle="Teslim Edilmemiş Malzemeler";reportHeaders=["Depo","Tarih","Kod","Malzeme","Adet","Alan Kişi","Birim/Etkinlik","Planlanan İade"];reportRows=state.movements.filter(m=>m.status==="Açık"&&dateOk(m)&&(wid==="ALL"||m.warehouse===wid)).map(m=>[warehouse(m.warehouse)?.name||m.warehouse,m.date,m.code,m.name,m.qty,m.person||"-",m.unit||"-",m.plannedReturn||"-"])}
  if(type==="movements"){reportTitle="Hareket Geçmişi";reportHeaders=["Depo","Tarih","İşlem","Kod","Malzeme","Adet/Değişiklik","Kişi","İşlemi Yapan","Durum"];reportRows=state.movements.filter(m=>dateOk(m)&&(wid==="ALL"||m.warehouse===wid)).map(m=>[warehouse(m.warehouse)?.name||m.warehouse,m.date,m.type,m.code||"-",m.name,m.change||((m.qty||"-")+" adet"),m.person||"-",m.operator||"-",m.status||"-"])}
  if(type==="warehouses"){reportTitle="Depo Özeti";reportHeaders=["Depo","Ürün Çeşidi","Sistem Stoku","Fiziksel Stok","Eksik","Fazla"];reportRows=state.warehouses.filter(w=>wid==="ALL"||w.id===wid).map(w=>{const a=state.inventory.filter(x=>x.warehouse===w.id);return[w.name,a.length,a.reduce((s,x)=>s+x.system,0),a.reduce((s,x)=>s+x.physical,0),a.reduce((s,x)=>s+Math.max(0,x.system-x.physical),0),a.reduce((s,x)=>s+Math.max(0,x.physical-x.system),0)]})}
  document.getElementById("reportArea").innerHTML=`<div class="report-title"><h2>ALKÜ Bilgi İşlem Daire Başkanlığı — ${esc(reportTitle)}</h2><p>Oluşturulma: ${new Date().toLocaleString("tr-TR")}</p></div><table><thead><tr>${reportHeaders.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${reportRows.length?reportRows.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join("")}</tr>`).join(""):`<tr><td colspan="${reportHeaders.length}" class="empty">Kayıt bulunamadı.</td></tr>`}</tbody></table>`
}
function downloadCsv(){buildReport();const cell=v=>`"${String(v??"").replace(/"/g,'""')}"`,text="\ufeff"+[reportHeaders,...reportRows].map(r=>r.map(cell).join(";")).join("\n"),blob=new Blob([text],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`ALKU_${reportTitle.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href);toast("Rapor indirildi.")}

showWarehouses();

import { firebaseConfig, ADMIN_UID } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, get, set, push } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";
import { getAuth, signInAnonymously, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

const $ = id => document.getElementById(id);
const categories = [
  ["brand","🔥 Brand / Rauchentwicklung"],["medizin","🚑 Medizinischer Notfall"],["vu","🚗 Verkehrsunfall"],
  ["abc","☣️ ABC / Gefahrgut"],["thl","🛠️ Technische Hilfeleistung"],["wasser","🌊 Wasser / Eis"],
  ["sturz","⬇️ Sturz / Höhe / Tiefe"],["gewalt","⚠️ Gewalt / Bedrohung"],["vergiftung","🧪 Vergiftung"],
  ["strom","⚡ Strom / Elektrische Gefährdung"],["geburt","👶 Geburtshilfe"],["sonst","❓ Sonstiger Einsatz"]
];

const defaults = {
  catalog: {
    medizin: {
      bewusstsein:{id:"bewusstsein",text:"Wie ist der Bewusstseinszustand?",type:"choice",options:["Wach und orientiert","Verwirrt / desorientiert","Somnolent","Soporös","Bewusstlos"],order:10},
      atmung:{id:"atmung",text:"Wie ist die Atmung?",type:"choice",options:["Normal","Dyspnoe / erschwerte Atmung","Keine normale Atmung","Atemstillstand"],order:20},
      vorerkrankungen:{id:"vorerkrankungen",text:"Bestehen relevante Vorerkrankungen?",type:"text",order:30,suggestionGroup:"vorerkrankungen"},
      schmerz:{id:"schmerz",text:"Bestehen starke oder plötzlich aufgetretene Beschwerden?",type:"choice",options:["Nein","Ja"],order:40}
    },
    brand: {
      feuersichtbar:{id:"feuersichtbar",text:"Ist Feuer sichtbar?",type:"choice",options:["Ja","Nein","Unklar"],order:10},
      rauch:{id:"rauch",text:"Ist Rauchentwicklung vorhanden?",type:"choice",options:["Stark","Leicht","Nein","Unklar"],order:20},
      personen:{id:"personen",text:"Sind Personen unmittelbar betroffen oder gefährdet?",type:"choice",options:["Ja","Nein","Unklar"],order:30},
      ausbreitung:{id:"ausbreitung",text:"Breitet sich das Ereignis aus?",type:"choice",options:["Ja","Nein","Unklar"],order:40}
    },
    vu: {
      beteiligte:{id:"beteiligte",text:"Sind Personen verletzt?",type:"choice",options:["Ja","Nein","Unklar"],order:10},
      eingeklemmt:{id:"eingeklemmt",text:"Sind Personen eingeklemmt oder eingeschlossen?",type:"choice",options:["Ja","Nein","Unklar"],order:20},
      gefahr:{id:"gefahr",text:"Bestehen besondere Gefahren, z. B. Rauch, Feuer oder auslaufende Stoffe?",type:"choice",options:["Ja","Nein","Unklar"],order:30}
    },
    abc: {
      stoff:{id:"stoff",text:"Ist ein Stoff bekannt oder auf Behältern gekennzeichnet?",type:"text",order:10,suggestionGroup:"gefahrstoffe"},
      austritt:{id:"austritt",text:"Tritt ein Stoff aus?",type:"choice",options:["Ja","Nein","Unklar"],order:20},
      betroffen:{id:"betroffen",text:"Sind Personen betroffen?",type:"choice",options:["Ja","Nein","Unklar"],order:30}
    },
    thl: {
      lage:{id:"lage",text:"Was ist die technische Lage?",type:"text",order:10},
      personen:{id:"personen",text:"Sind Personen gefährdet oder verletzt?",type:"choice",options:["Ja","Nein","Unklar"],order:20},
      akutegefahr:{id:"akutegefahr",text:"Besteht eine akute Gefahr?",type:"choice",options:["Ja","Nein","Unklar"],order:30}
    }
  },
  notarzt_rules: {
    bewusstlos:{category:"medizin",questionId:"bewusstsein",value:"Bewusstlos",reason:"Bewusstlosigkeit"},
    soporoes:{category:"medizin",questionId:"bewusstsein",value:"Soporös",reason:"Schwere Bewusstseinsstörung / Sopor"},
    atemstillstand:{category:"medizin",questionId:"atmung",value:"Atemstillstand",reason:"Atemstillstand"},
    nichtnormal:{category:"medizin",questionId:"atmung",value:"Keine normale Atmung",reason:"Keine normale Atmung"}
  },
  resource_rules: {
    med_rtw:{category:"medizin",questionId:"bewusstsein",value:"*",resources:["RTW"]},
    brand_feuer:{category:"brand",questionId:"feuersichtbar",value:"Ja",resources:["Feuerwehr"]},
    vu_eingeklemmt:{category:"vu",questionId:"eingeklemmt",value:"Ja",resources:["Feuerwehr / technische Rettung","Rettungsdienst"]},
    abc_austritt:{category:"abc",questionId:"austritt",value:"Ja",resources:["Feuerwehr / ABC-Gefahrgut-Komponente"]}
  },
  suggestions: {
    vorerkrankungen:["Diabetes mellitus","COPD","Asthma bronchiale","Epilepsie","Koronare Herzkrankheit","Herzinsuffizienz","Schlaganfall in der Vorgeschichte"],
    gefahrstoffe:["Benzin","Diesel","Heizöl","Ammoniak","Chlor","Unbekannter Stoff"]
  }
};

let fb = null, db = null, auth = null, user = null;
let data = structuredClone(defaults);
let currentCategory = null, currentQuestions = [], currentIndex = 0, answers = {};

function configured(){
  return !firebaseConfig.apiKey.includes("HIER_") && !firebaseConfig.appId.includes("HIER_");
}
function isAdmin(){ return !!user && user.uid === ADMIN_UID && !ADMIN_UID.includes("HIER_"); }
function esc(s){ return String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }
function fillCategories(){
  for(const id of ["qCategory","nCategory","rCategory"]){
    $(id).innerHTML = categories.map(([v,n])=>`<option value="${v}">${n}</option>`).join("");
  }
}
function setStatus(t){ $("status").textContent=t; }

async function initFirebase(){
  if(!configured()){
    setStatus("● Lokaler Startmodus – Firebase-Konfiguration fehlt");
    return;
  }
  try{
    fb=initializeApp(firebaseConfig); db=getDatabase(fb); auth=getAuth(fb);
    onAuthStateChanged(auth, async u=>{
      user=u;
      $("logoutBtn").hidden=!isAdmin();
      if(!u){
        try{ await signInAnonymously(auth); }
        catch(e){ console.warn(e); setStatus("⚠️ Firebase verbunden – anonyme Anmeldung muss in Firebase aktiviert werden"); }
      } else {
        setStatus(isAdmin() ? "● Firebase verbunden – Verwaltung angemeldet" : "● Firebase verbunden");
      }
    });
    await loadFirebase();
  }catch(e){
    console.error(e); setStatus("⚠️ Firebase konnte nicht geladen werden – lokaler Startmodus");
  }
}
async function loadFirebase(){
  if(!db) return;
  const paths=["catalog","notarzt_rules","resource_rules","suggestions"];
  for(const p of paths){
    const snap=await get(ref(db,p));
    if(snap.exists()) data[p]=snap.val();
  }
}
function questionsFor(category){
  const raw=Object.values(data.catalog?.[category] || {});
  if(raw.length) return raw.sort((a,b)=>(a.order||999)-(b.order||999));
  return Object.values(defaults.catalog?.[category] || {
    allgemein:{id:"beschreibung",text:"Bitte beschreiben Sie kurz das Ereignis.",type:"text",order:10}
  });
}
function start(category){
  currentCategory=category; currentQuestions=questionsFor(category); currentIndex=0; answers={};
  $("home").hidden=true; $("admin").hidden=true; $("call").hidden=false;
  $("categoryTitle").textContent=categories.find(x=>x[0]===category)?.[1]||category;
  renderQuestion(); evaluate();
}
function visibleQuestions(){
  return currentQuestions.filter(q=>{
    if(!q.whenQuestion) return true;
    return answers[q.whenQuestion] === q.whenValue;
  });
}
function renderQuestion(){
  const qs=visibleQuestions();
  if(!qs.length){ $("questionText").textContent="Keine Fragen vorhanden."; return; }
  currentIndex=Math.max(0,Math.min(currentIndex,qs.length-1));
  const q=qs[currentIndex];
  $("progress").textContent=`Frage ${currentIndex+1} von ${qs.length}`;
  $("questionText").textContent=q.text;
  const area=$("answerArea"); area.innerHTML="";
  if(q.type==="choice"){
    const wrap=document.createElement("div"); wrap.className="answer-options";
    (q.options||[]).forEach(v=>{
      const b=document.createElement("button"); b.className="answer-option"+(answers[q.id]===v?" selected":""); b.textContent=v;
      b.onclick=()=>{ answers[q.id]=v; evaluate(); const now=visibleQuestions(); if(currentIndex<now.length-1){ currentIndex++; renderQuestion(); } else renderQuestion(); };
      wrap.appendChild(b);
    }); area.appendChild(wrap);
  }else{
    const input=document.createElement(q.type==="text"?"textarea":"input");
    if(q.type==="number") input.type="number";
    input.value=answers[q.id]||"";
    input.oninput=()=>{ answers[q.id]=input.value; evaluate(); };
    area.appendChild(input);
    if(q.type==="text" && q.suggestionGroup){
      const group=data.suggestions?.[q.suggestionGroup]||[];
      if(group.length){
        const sw=document.createElement("div"); sw.className="suggestions";
        group.filter(x=>!input.value || x.toLowerCase().includes(input.value.toLowerCase())).slice(0,8).forEach(x=>{
          const b=document.createElement("button"); b.className="suggestion-btn"; b.textContent=x;
          b.onclick=()=>{ input.value=x; answers[q.id]=x; evaluate(); };
          sw.appendChild(b);
        }); area.appendChild(sw);
      }
    }
  }
  $("previousBtn").disabled=currentIndex===0;
  renderSummary();
}
function evaluate(){
  const reasons=[];
  for(const r of Object.values(data.notarzt_rules||{})){
    if(r.category===currentCategory && answers[r.questionId]===r.value) reasons.push(r.reason||r.id||"Regel erfüllt");
  }
  $("notarztSummary").innerHTML=reasons.length
    ? `<strong>Notarzt/NEF-Regel ausgelöst</strong><br>${reasons.map(x=>`<div class="item">• ${esc(x)}</div>`).join("")}`
    : "Keine hinterlegte Notarztregel durch die bisher gegebenen Antworten ausgelöst.";

  const resources=new Set();
  for(const r of Object.values(data.resource_rules||{})){
    if(r.category!==currentCategory) continue;
    if(r.value==="*" || answers[r.questionId]===r.value) (r.resources||[]).forEach(x=>resources.add(x));
  }
  if(reasons.length) resources.add("NEF / Notarzt (gemäß hinterlegter Regel)");
  if(!resources.size){
    if(currentCategory==="medizin") resources.add("Rettungsdienst – fachliche Disposition erforderlich");
    else if(currentCategory==="brand"||currentCategory==="thl"||currentCategory==="vu"||currentCategory==="abc") resources.add("Weitere Disposition anhand der zuständigen Vorgaben erforderlich");
  }
  $("resourceSummary").innerHTML=[...resources].map(x=>`<div class="item">• ${esc(x)}</div>`).join("");
  renderSummary();
}
function renderSummary(){
  $("answerSummary").innerHTML=Object.entries(answers).length
    ? Object.entries(answers).map(([k,v])=>`<div class="item"><strong>${esc(k)}:</strong> ${esc(v)}</div>`).join("")
    : "Noch keine Antworten.";
}
async function finish(){
  evaluate();
  if(db && user){
    try{
      await push(ref(db,`call_history/${user.uid}`),{
        category:currentCategory, answers, createdAt:Date.now(),
        source:"web"
      });
      setStatus("● Abfrage gespeichert");
    }catch(e){ console.error(e); alert("Abfrage konnte nicht gespeichert werden: "+e.message); }
  }else{
    const history=JSON.parse(localStorage.getItem("einsatzabfrage_history")||"[]");
    history.push({category:currentCategory,answers,createdAt:Date.now()});
    localStorage.setItem("einsatzabfrage_history",JSON.stringify(history));
    alert("Abfrage lokal gespeichert. Firebase ist noch nicht vollständig konfiguriert.");
  }
}
async function requireAdmin(){
  if(!isAdmin()) throw new Error("Nur der Administrator darf diesen Bereich speichern.");
}
async function write(path,value){
  await requireAdmin();
  await set(ref(db,path),value);
  await loadFirebase();
}
function lines(id){ return $(id).value.split("\n").map(x=>x.trim()).filter(Boolean); }
async function saveQuestion(){
  const c=$("qCategory").value, id=$("qId").value.trim();
  if(!id||!$("qText").value.trim()) throw new Error("Frage-ID und Frage sind erforderlich.");
  await write(`catalog/${c}/${id}`,{
    id,text:$("qText").value.trim(),type:$("qType").value,
    options:lines("qOptions"),whenQuestion:$("qWhenQuestion").value.trim(),
    whenValue:$("qWhenValue").value.trim(),order:Number($("qOrder").value||100),
    suggestionGroup:$("qSuggestionGroup").value.trim()
  });
  alert("Frage in Firebase gespeichert.");
}
async function saveNotarzt(){
  const id=$("nId").value.trim();
  if(!id) throw new Error("Regel-ID fehlt.");
  await write(`notarzt_rules/${id}`,{category:$("nCategory").value,questionId:$("nQuestion").value.trim(),value:$("nValue").value.trim(),reason:$("nReason").value.trim()});
  alert("Notarztregel gespeichert.");
}
async function saveResource(){
  const id=$("rId").value.trim();
  if(!id) throw new Error("Regel-ID fehlt.");
  await write(`resource_rules/${id}`,{category:$("rCategory").value,questionId:$("rQuestion").value.trim(),value:$("rValue").value.trim(),resources:lines("rResources")});
  alert("Einsatzmittelregel gespeichert.");
}
async function saveSuggestion(){
  const g=$("sGroup").value.trim(), t=$("sText").value.trim();
  if(!g||!t) throw new Error("Gruppe und Vorschlag sind erforderlich.");
  await requireAdmin();
  const arr=data.suggestions?.[g]||[];
  if(!arr.includes(t)) arr.push(t);
  await write(`suggestions/${g}`,arr);
  alert("Vorschlag gespeichert.");
}
async function seed(){
  await requireAdmin();
  for(const [path,val] of Object.entries(defaults)) await set(ref(db,path),val);
  await loadFirebase(); alert("Grunddaten wurden in Firebase gespeichert.");
}

document.querySelectorAll(".category").forEach(b=>b.onclick=()=>start(b.dataset.category));
$("backHome").onclick=()=>{ $("call").hidden=true; $("home").hidden=false; };
$("previousBtn").onclick=()=>{ currentIndex--; renderQuestion(); };
$("finishBtn").onclick=finish;
$("adminBtn").onclick=()=>{ if(isAdmin()){ $("home").hidden=true; $("call").hidden=true; $("admin").hidden=false; } else $("loginModal").hidden=false; };
$("closeAdmin").onclick=()=>{ $("admin").hidden=true; $("home").hidden=false; };
$("cancelLogin").onclick=()=>$("loginModal").hidden=true;
$("doLogin").onclick=async()=>{
  try{
    $("loginError").textContent="";
    if(!auth) throw new Error("Firebase ist noch nicht konfiguriert.");
    await signInWithEmailAndPassword(auth,$("loginEmail").value.trim(),$("loginPassword").value);
    if(!isAdmin()) $("loginError").textContent="Dieses Konto ist nicht als Administrator hinterlegt.";
    else { $("loginModal").hidden=true; $("home").hidden=true; $("admin").hidden=false; }
  }catch(e){ $("loginError").textContent=e.message; }
};
$("logoutBtn").onclick=async()=>{ await signOut(auth); };
document.querySelectorAll(".tab-btn").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".tab-btn").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(x=>x.hidden=true);
  b.classList.add("active"); $(b.dataset.tab).hidden=false;
});
$("saveQuestion").onclick=()=>saveQuestion().catch(e=>alert(e.message));
$("saveNotarzt").onclick=()=>saveNotarzt().catch(e=>alert(e.message));
$("saveResource").onclick=()=>saveResource().catch(e=>alert(e.message));
$("saveSuggestion").onclick=()=>saveSuggestion().catch(e=>alert(e.message));
$("seedBtn").onclick=()=>seed().catch(e=>alert(e.message));

fillCategories();

// Das Verwaltungsfenster darf niemals automatisch beim Öffnen erscheinen.
$("loginModal").hidden = true;
$("admin").hidden = true;
$("call").hidden = true;
$("home").hidden = false;

setStatus("● Startbereit");
initFirebase();

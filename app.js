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

const Q=(id,text,type,options,order,extra={})=>({id,text,type,options,order,...extra});

/*
  Die Startregeln sind als konfigurierbare Dispositionshilfe angelegt.
  Sie müssen vor einem operativen Echtbetrieb durch die zuständige Leitstelle/
  den Ärztlichen Leiter Rettungsdienst gegen die örtlich gültigen Vorgaben geprüft werden.
*/
const defaults = {
  catalog: {
    medizin: {
      betroffen:Q("betroffen","Wen betrifft der medizinische Notfall?","choice",["Mich selbst","Eine andere Person","Mehrere Personen / unklar"],10),
      geburtsdatum:Q("geburtsdatum","Wann ist die betroffene Person geboren?","date",[],20),
      geschlecht:Q("geschlecht","Welches Geschlecht hat die betroffene Person?","choice",["Männlich","Weiblich","Divers","Unbekannt / keine Angabe"],30),
      hauptbeschwerde:Q("hauptbeschwerde","Was ist die Hauptbeschwerde bzw. was ist passiert?","text",[],40),
      beginn:Q("beginn","Wann haben die Beschwerden begonnen?","choice",["Gerade eben / plötzlich","Vor weniger als 1 Stunde","Vor mehreren Stunden","Seit Tagen","Unklar"],50),
      bewusstsein:Q("bewusstsein","Wie ist der Bewusstseinszustand?","choice",["Wach und orientiert","Verwirrt / desorientiert","Somnolent","Soporös","Bewusstlos","Unklar"],60),
      atmung:Q("atmung","Wie ist die Atmung?","choice",["Normal","Dyspnoe / erschwerte Atmung","Ausgeprägte oder zunehmende Dyspnoe","Keine normale Atmung","Atemstillstand","Unklar"],70),
      kreislauf:Q("kreislauf","Wie ist der Kreislaufzustand?","choice",["Unauffällig","Schwindel / Kreislaufprobleme","Ausgeprägte Kreislaufinsuffizienz / Schockzeichen","Kreislaufstillstand","Unklar"],80),
      brustschmerz:Q("brustschmerz","Besteht akuter Brustschmerz oder Druckgefühl im Brustkorb?","choice",["Ja","Nein","Unklar"],90),
      blutung:Q("blutung","Besteht eine schwere oder nicht beherrschbare Blutung?","choice",["Ja","Nein","Unklar"],100),
      neurologie:Q("neurologie","Bestehen plötzlich aufgetretene neurologische Auffälligkeiten?","choice",["Keine","Lähmung / Kraftverlust","Sprachstörung","Gesichtslähmung","Krampfanfall","Mehrere / unklar"],110),
      schmerz:Q("schmerz","Wie stark sind die Schmerzen?","choice",["Keine","Leicht","Mittel","Stark","Sehr stark / nicht auszuhalten","Unklar"],120),
      vorerkrankung:Q("vorerkrankung","Bestehen relevante Vorerkrankungen?","choice",["Nein","Ja","Unklar"],130),
      vorerkrankungen:Q("vorerkrankungen","Welche Vorerkrankungen sind bekannt?","text",[],140,{whenQuestion:"vorerkrankung",whenValue:"Ja",suggestionGroup:"vorerkrankungen"}),
      medikamente:Q("medikamente","Werden regelmäßig Medikamente eingenommen?","choice",["Nein","Ja","Unklar"],150),
      medikamentenliste:Q("medikamentenliste","Welche Medikamente sind bekannt?","text",[],160,{whenQuestion:"medikamente",whenValue:"Ja",suggestionGroup:"medikamente"}),
      allergien:Q("allergien","Sind relevante Allergien bekannt?","choice",["Nein","Ja","Unklar"],170),
      allergieliste:Q("allergieliste","Welche Allergien sind bekannt?","text",[],180,{whenQuestion:"allergien",whenValue:"Ja",suggestionGroup:"allergien"}),
      schwangerschaft:Q("schwangerschaft","Besteht eine Schwangerschaft oder ist diese möglich?","choice",["Nein","Ja","Unklar / nicht relevant"],190),
      weitere:Q("weitere","Weitere wichtige Informationen?","text",[],200)
    },
    vu: {
      personen:Q("personen","Sind Personen verletzt oder medizinisch betroffen?","choice",["Ja","Nein","Unklar"],10),
      anzahl:Q("anzahl","Wie viele Personen sind betroffen?","number",[],20,{whenQuestion:"personen",whenValue:"Ja"}),
      eingeklemmt:Q("eingeklemmt","Ist eine Person eingeklemmt?","choice",["Ja","Nein","Unklar"],30),
      bewusstsein:Q("bewusstsein","Wie ist der Bewusstseinszustand der schwerstbetroffenen Person?","choice",["Wach und orientiert","Verwirrt / desorientiert","Somnolent","Soporös","Bewusstlos","Unklar / keine Person betroffen"],40),
      atmung:Q("atmung","Wie ist die Atmung der schwerstbetroffenen Person?","choice",["Normal","Dyspnoe / erschwerte Atmung","Ausgeprägte oder zunehmende Dyspnoe","Keine normale Atmung","Atemstillstand","Unklar / keine Person betroffen"],50),
      schwereverletzung:Q("schwereverletzung","Besteht der Verdacht auf eine schwere Verletzung?","choice",["Ja","Nein","Unklar"],60),
      blutung:Q("blutung","Besteht eine schwere Blutung?","choice",["Ja","Nein","Unklar"],70),
      brustbauch:Q("brustbauch","Besteht der Verdacht auf Thorax- oder Bauchtrauma?","choice",["Ja","Nein","Unklar"],80),
      fahrzeuglage:Q("fahrzeuglage","Wie ist die Lage der Fahrzeuge?","choice",["Normal stehend","Auf der Seite","Auf dem Dach","Mehrere Fahrzeuge / Trümmerfeld","Unklar"],90),
      geschwindigkeit:Q("geschwindigkeit","War eine hohe Aufprallenergie oder erhebliche Geschwindigkeit beteiligt?","choice",["Ja","Nein","Unklar"],100),
      gefahr:Q("gefahr","Bestehen besondere Gefahren?","choice",["Keine erkennbar","Feuer / Rauch","Auslaufende Betriebsstoffe","Gefahrstoff / unbekannter Stoff","Elektrische Gefahr","Unklar"],110),
      weitere:Q("weitere","Weitere wichtige Informationen zur Lage?","text",[],120)
    },
    brand: {
      feuersichtbar:Q("feuersichtbar","Ist Feuer sichtbar?","choice",["Ja","Nein","Unklar"],10),
      rauch:Q("rauch","Wie stark ist die Rauchentwicklung?","choice",["Stark","Leicht / mäßig","Keine sichtbar","Unklar"],20),
      personen:Q("personen","Sind Personen unmittelbar betroffen oder gefährdet?","choice",["Ja","Nein","Unklar"],30),
      vermisst:Q("vermisst","Werden Personen vermisst oder befinden sich möglicherweise noch Personen im Gefahrenbereich?","choice",["Ja","Nein","Unklar"],40),
      ausbreitung:Q("ausbreitung","Breitet sich Feuer oder Rauch aus?","choice",["Ja","Nein","Unklar"],50),
      gebaeude:Q("gebaeude","Handelt es sich um ein Gebäude / eine Wohnung / ein Objekt?","choice",["Ja","Nein","Unklar"],60),
      verletzte:Q("verletzte","Gibt es verletzte oder durch Rauch betroffene Personen?","choice",["Ja","Nein","Unklar"],70)
    },
    abc: {
      stoff:Q("stoff","Ist ein Stoff bekannt oder auf Behältern gekennzeichnet?","text",[],10,{suggestionGroup:"gefahrstoffe"}),
      austritt:Q("austritt","Tritt ein Stoff aus?","choice",["Ja","Nein","Unklar"],20),
      betroffen:Q("betroffen","Sind Personen betroffen?","choice",["Ja","Nein","Unklar"],30),
      symptom:Q("symptom","Haben Betroffene Beschwerden wie Atemnot, Bewusstseinsstörung oder Verätzungen?","choice",["Ja","Nein","Unklar"],40,{whenQuestion:"betroffen",whenValue:"Ja"})
    },
    thl: {
      lage:Q("lage","Was ist die technische Lage?","text",[],10),
      personen:Q("personen","Sind Personen gefährdet oder verletzt?","choice",["Ja","Nein","Unklar"],20),
      schwereverletzung:Q("schwereverletzung","Besteht eine schwere Verletzung oder unmittelbare Lebensgefahr?","choice",["Ja","Nein","Unklar"],30,{whenQuestion:"personen",whenValue:"Ja"}),
      akutegefahr:Q("akutegefahr","Besteht eine akute Gefahr?","choice",["Ja","Nein","Unklar"],40)
    },
    wasser: { personen:Q("personen","Sind Personen im Wasser oder akut gefährdet?","choice",["Ja","Nein","Unklar"],10), bewusstsein:Q("bewusstsein","Ist eine betroffene Person bewusstseinsgestört oder bewusstlos?","choice",["Ja","Nein","Unklar"],20,{whenQuestion:"personen",whenValue:"Ja"}), atmung:Q("atmung","Ist die Atmung normal?","choice",["Ja","Nein","Unklar"],30,{whenQuestion:"personen",whenValue:"Ja"}) },
    sturz: { hoehe:Q("hoehe","Aus welcher ungefähren Höhe ist die Person gestürzt?","text",[],10), bewusstsein:Q("bewusstsein","Wie ist der Bewusstseinszustand?","choice",["Wach und orientiert","Verwirrt / desorientiert","Somnolent","Soporös","Bewusstlos","Unklar"],20), atmung:Q("atmung","Wie ist die Atmung?","choice",["Normal","Dyspnoe / erschwerte Atmung","Keine normale Atmung","Atemstillstand","Unklar"],30), schwereverletzung:Q("schwereverletzung","Besteht Verdacht auf schwere Verletzung?","choice",["Ja","Nein","Unklar"],40) },
    vergiftung: { stoff:Q("stoff","Welcher Stoff oder welches Medikament wurde aufgenommen / eingeatmet?","text",[],10,{suggestionGroup:"gefahrstoffe"}), bewusstsein:Q("bewusstsein","Wie ist der Bewusstseinszustand?","choice",["Wach und orientiert","Verwirrt / desorientiert","Somnolent","Soporös","Bewusstlos","Unklar"],20), atmung:Q("atmung","Wie ist die Atmung?","choice",["Normal","Dyspnoe / erschwerte Atmung","Keine normale Atmung","Atemstillstand","Unklar"],30) }
  },
  notarzt_rules: {
    med_bewusstlos:{category:"medizin",questionId:"bewusstsein",value:"Bewusstlos",reason:"Bewusstlosigkeit / fehlende adäquate Reaktion"},
    med_sopor:{category:"medizin",questionId:"bewusstsein",value:"Soporös",reason:"Schwere Bewusstseinsstörung (Sopor)"},
    med_atemstill:{category:"medizin",questionId:"atmung",value:"Atemstillstand",reason:"Atemstillstand"},
    med_atmung:{category:"medizin",questionId:"atmung",value:"Keine normale Atmung",reason:"Keine normale Atmung"},
    med_dyspnoe:{category:"medizin",questionId:"atmung",value:"Ausgeprägte oder zunehmende Dyspnoe",reason:"Ausgeprägte oder zunehmende Dyspnoe"},
    med_kreislauf:{category:"medizin",questionId:"kreislauf",value:"Ausgeprägte Kreislaufinsuffizienz / Schockzeichen",reason:"Ausgeprägte Kreislaufinsuffizienz / Schockzeichen"},
    med_rea:{category:"medizin",questionId:"kreislauf",value:"Kreislaufstillstand",reason:"Kreislaufstillstand"},
    med_brust:{category:"medizin",questionId:"brustschmerz",value:"Ja",reason:"Akuter Brustschmerz / möglicher akuter kardialer Notfall"},
    med_blutung:{category:"medizin",questionId:"blutung",value:"Ja",reason:"Schwere Blutung"},
    med_neuro1:{category:"medizin",questionId:"neurologie",value:"Lähmung / Kraftverlust",reason:"Akute neurologische Ausfälle"},
    med_neuro2:{category:"medizin",questionId:"neurologie",value:"Sprachstörung",reason:"Akute neurologische Ausfälle"},
    med_neuro3:{category:"medizin",questionId:"neurologie",value:"Gesichtslähmung",reason:"Akute neurologische Ausfälle"},
    med_krampf:{category:"medizin",questionId:"neurologie",value:"Krampfanfall",reason:"Akuter Krampfanfall / neurologischer Notfall"},
    vu_bew:{category:"vu",questionId:"bewusstsein",value:"Bewusstlos",reason:"Bewusstlosigkeit nach Verkehrsunfall"},
    vu_sopor:{category:"vu",questionId:"bewusstsein",value:"Soporös",reason:"Schwere Bewusstseinsstörung nach Verkehrsunfall"},
    vu_atem:{category:"vu",questionId:"atmung",value:"Keine normale Atmung",reason:"Keine normale Atmung nach Trauma"},
    vu_atemstill:{category:"vu",questionId:"atmung",value:"Atemstillstand",reason:"Atemstillstand nach Trauma"},
    vu_schwer:{category:"vu",questionId:"schwereverletzung",value:"Ja",reason:"Verdacht auf schwere Verletzung / schweres Trauma"},
    vu_blutung:{category:"vu",questionId:"blutung",value:"Ja",reason:"Schwere Blutung nach Trauma"},
    vu_thorax:{category:"vu",questionId:"brustbauch",value:"Ja",reason:"Verdacht auf Thorax- oder Bauchtrauma"},
    thl_schwer:{category:"thl",questionId:"schwereverletzung",value:"Ja",reason:"Schwere Verletzung oder unmittelbare Lebensgefahr"},
    sturz_bew:{category:"sturz",questionId:"bewusstsein",value:"Bewusstlos",reason:"Bewusstlosigkeit nach Sturz"},
    sturz_atem:{category:"sturz",questionId:"atmung",value:"Atemstillstand",reason:"Atemstillstand nach Sturz"},
    sturz_schwer:{category:"sturz",questionId:"schwereverletzung",value:"Ja",reason:"Verdacht auf schwere Verletzung nach Sturz"},
    wasser_bew:{category:"wasser",questionId:"bewusstsein",value:"Ja",reason:"Bewusstseinsstörung nach Wasserunfall"},
    wasser_atem:{category:"wasser",questionId:"atmung",value:"Nein",reason:"Keine normale Atmung nach Wasserunfall"},
    gift_bew:{category:"vergiftung",questionId:"bewusstsein",value:"Bewusstlos",reason:"Bewusstlosigkeit bei Vergiftung"},
    gift_atem:{category:"vergiftung",questionId:"atmung",value:"Atemstillstand",reason:"Atemstillstand bei Vergiftung"}
  },
  resource_rules: {
    med_rtw:{category:"medizin",questionId:"hauptbeschwerde",value:"*",resources:["RTW"]},
    med_na:{category:"medizin",questionId:"bewusstsein",value:"Bewusstlos",resources:["NEF / Notarzt"]},
    brand_feuer:{category:"brand",questionId:"feuersichtbar",value:"Ja",resources:["Feuerwehr"]},
    brand_person:{category:"brand",questionId:"personen",value:"Ja",resources:["Rettungsdienst"]},
    vu_person:{category:"vu",questionId:"personen",value:"Ja",resources:["RTW"]},
    vu_eingeklemmt:{category:"vu",questionId:"eingeklemmt",value:"Ja",resources:["Feuerwehr / technische Rettung","RTW","NEF / Notarzt – Lage und Verletzungsmuster bewerten"]},
    vu_gefahr:{category:"vu",questionId:"gefahr",value:"Gefahrstoff / unbekannter Stoff",resources:["Feuerwehr / ABC-Gefahrgut-Komponente"]},
    abc_austritt:{category:"abc",questionId:"austritt",value:"Ja",resources:["Feuerwehr / ABC-Gefahrgut-Komponente"]},
    abc_betroffen:{category:"abc",questionId:"betroffen",value:"Ja",resources:["Rettungsdienst"]},
    thl_person:{category:"thl",questionId:"personen",value:"Ja",resources:["Rettungsdienst","Feuerwehr"]}
  },
  suggestions: {
    vorerkrankungen:["Diabetes mellitus","COPD","Asthma bronchiale","Epilepsie","Koronare Herzkrankheit","Herzinsuffizienz","Herzrhythmusstörung","Bluthochdruck","Schlaganfall in der Vorgeschichte","Demenz","Niereninsuffizienz","Krebserkrankung","Antikoagulation / Blutverdünner"],
    medikamente:["Insulin","Metformin","Salbutamol","Antikoagulans / Blutverdünner","Betablocker","ACE-Hemmer","Diuretikum","Antiepileptikum","Nitrospray"],
    allergien:["Penicillin","Latex","Insektengift","Kontrastmittel","Nahrungsmittelallergie"],
    gefahrstoffe:["Benzin","Diesel","Heizöl","Ammoniak","Chlor","Kohlenmonoxid","Lösemittel","Unbekannter Stoff"]
  }
};

let fb=null, db=null, auth=null, user=null;
let data=structuredClone(defaults);
let currentCategory=null, currentQuestions=[], currentIndex=0, answers={};

function configured(){ return firebaseConfig?.apiKey && firebaseConfig?.appId && !firebaseConfig.apiKey.includes("HIER_"); }
function isAdmin(){ return !!user && user.uid===ADMIN_UID && !ADMIN_UID.includes("HIER_"); }
function esc(s){ return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }
function setStatus(t){ $("status").textContent=t; }
function categoryName(id){ return categories.find(x=>x[0]===id)?.[1]||id; }
function fillCategories(){ for(const id of ["qCategory","nCategory","rCategory"]) $(id).innerHTML=categories.map(([v,n])=>`<option value="${v}">${n}</option>`).join(""); }

async function initFirebase(){
  if(!configured()){ setStatus("● Lokaler Startmodus – Firebase-Konfiguration fehlt"); return; }
  try{
    fb=initializeApp(firebaseConfig); db=getDatabase(fb); auth=getAuth(fb);
    onAuthStateChanged(auth,async u=>{
      user=u; $("logoutBtn").hidden=!isAdmin();
      if(isAdmin()){ $("loginModal").hidden=true; $("loginModal").style.display="none"; }
      if(!u){ try{ await signInAnonymously(auth); }catch(e){ console.warn(e); setStatus("⚠️ Firebase verbunden – anonyme Anmeldung muss aktiviert sein"); } }
      else setStatus(isAdmin()?"● Firebase verbunden – Verwaltung angemeldet":"● Firebase verbunden");
    });
    await loadFirebase();
  }catch(e){ console.error(e); setStatus("⚠️ Firebase konnte nicht initialisiert werden – lokaler Startmodus"); }
}
async function loadFirebase(){
  if(!db) return;
  for(const p of ["catalog","notarzt_rules","resource_rules","suggestions"]){ const snap=await get(ref(db,p)); if(snap.exists()) data[p]=snap.val(); }
}
function questionsFor(category){ const raw=Object.values(data.catalog?.[category]||{}); if(raw.length) return raw.sort((a,b)=>(a.order||999)-(b.order||999)); return [Q("beschreibung","Bitte beschreiben Sie kurz das Ereignis.","text",[],10)]; }
function visibleQuestions(){ return currentQuestions.filter(q=>!q.whenQuestion || answers[q.whenQuestion]===q.whenValue); }
function start(category){ currentCategory=category; currentQuestions=questionsFor(category); currentIndex=0; answers={}; $("home").hidden=true; $("admin").hidden=true; $("call").hidden=false; $("categoryTitle").textContent=categoryName(category); renderQuestion(); evaluate(); }

function calculateAge(dateString){
  if(!dateString) return "";
  const d=new Date(dateString+"T00:00:00");
  if(Number.isNaN(d.getTime())) return "";
  const now=new Date();
  let age=now.getFullYear()-d.getFullYear();
  const beforeBirthday=now.getMonth()<d.getMonth() || (now.getMonth()===d.getMonth() && now.getDate()<d.getDate());
  if(beforeBirthday) age--;
  return age>=0 && age<=130 ? String(age) : "";
}
function canContinue(q){
  if(!q) return false;
  const v=answers[q.id];
  return String(v??"").trim()!=="";
}
function nextQuestion(){
  const qs=visibleQuestions();
  const q=qs[currentIndex];
  if(!canContinue(q)){ alert("Bitte beantworte zuerst die aktuelle Frage."); return; }
  if(currentIndex<qs.length-1){ currentIndex++; renderQuestion(); }
  else finish();
}
function renderQuestion(){
  const qs=visibleQuestions(); if(!qs.length){ $("questionText").textContent="Keine Fragen vorhanden."; return; }
  currentIndex=Math.max(0,Math.min(currentIndex,qs.length-1)); const q=qs[currentIndex];
  $("progress").textContent=`Frage ${currentIndex+1} von ${qs.length}`; $("questionText").textContent=q.text;
  const area=$("answerArea"); area.innerHTML="";
  if(q.type==="choice"){
    const wrap=document.createElement("div"); wrap.className="answer-options";
    (q.options||[]).forEach(v=>{ const b=document.createElement("button"); b.type="button"; b.className="answer-option"+(answers[q.id]===v?" selected":""); b.textContent=v; b.onclick=()=>{ answers[q.id]=v; evaluate(); renderQuestion(); }; wrap.appendChild(b); }); area.appendChild(wrap);
  }else{
    const input=document.createElement(q.type==="text"?"textarea":"input");
    if(q.type==="number") input.type="number";
    if(q.type==="date") input.type="date";
    input.value=answers[q.id]||"";
    const ageInfo=document.createElement("div"); ageInfo.className="age-info";
    const updateValue=()=>{
      answers[q.id]=input.value;
      if(q.id==="geburtsdatum"){
        const age=calculateAge(input.value);
        if(age){ answers.alter=age; ageInfo.textContent=`Automatisch berechnetes Alter: ${age} Jahre`; }
        else { delete answers.alter; ageInfo.textContent=input.value?"Geburtsdatum bitte prüfen.":""; }
      }
      evaluate(); renderSuggestionButtons(input,q);
    };
    input.oninput=updateValue; input.onchange=updateValue;
    area.appendChild(input);
    if(q.id==="geburtsdatum"){ if(answers.alter) ageInfo.textContent=`Automatisch berechnetes Alter: ${answers.alter} Jahre`; area.appendChild(ageInfo); }
    if(q.type==="text"&&q.suggestionGroup){ const sw=document.createElement("div"); sw.className="suggestions"; sw.id="dynamicSuggestions"; area.appendChild(sw); renderSuggestionButtons(input,q); }
  }
  // Der große Weiter-Button wird bewusst DIREKT unter jeder Antwort angezeigt.
  // So bleibt der nächste Schritt auch bei vielen Vorschlägen (z. B. Benzin,
  // Gefahrstoffen, Vorerkrankungen oder Medikamenten) sofort erreichbar.
  const inlineAction=document.createElement("button");
  inlineAction.type="button";
  inlineAction.className="inline-continue";
  const isLastQuestion=currentIndex===qs.length-1;
  inlineAction.textContent=isLastQuestion?"Auswertung abschließen":"Weiter →";
  inlineAction.onclick=()=>{ if(isLastQuestion) finish(); else nextQuestion(); };
  area.appendChild(inlineAction);

  $("previousBtn").disabled=currentIndex===0;
  const last=currentIndex===qs.length-1;
  $("nextBtn").hidden=last;
  $("finishBtn").hidden=!last;
  $("nextBtn").textContent="Weiter →";
  renderSummary();
}
function renderSuggestionButtons(input,q){ const sw=$("dynamicSuggestions"); if(!sw) return; const group=data.suggestions?.[q.suggestionGroup]||[]; sw.innerHTML=""; group.filter(x=>!input.value||x.toLowerCase().includes(input.value.toLowerCase())).slice(0,10).forEach(x=>{ const b=document.createElement("button"); b.type="button"; b.className="suggestion-btn"; b.textContent=x; b.onclick=()=>{ input.value=x; answers[q.id]=x; evaluate(); renderSuggestionButtons(input,q); }; sw.appendChild(b); }); }

function matchedNotarztRules(){ const reasons=[]; for(const r of Object.values(data.notarzt_rules||{})){ if(r.category===currentCategory && answers[r.questionId]===r.value) reasons.push(r.reason||r.id||"Regel erfüllt"); } return [...new Set(reasons)]; }
function matchedResources(reasons){ const resources=new Set(); for(const r of Object.values(data.resource_rules||{})){ if(r.category!==currentCategory) continue; if(r.value==="*"||answers[r.questionId]===r.value) (r.resources||[]).forEach(x=>resources.add(x)); }
  if(reasons.length) resources.add("NEF / Notarzt (durch hinterlegte Regel ausgelöst)");
  if(!resources.size){ if(currentCategory==="medizin") resources.add("Rettungsdienst – fachliche Disposition erforderlich"); else resources.add("Einsatzmittel nach örtlicher AAO und Lagebild disponieren"); }
  return [...resources]; }
function evaluate(){ const reasons=matchedNotarztRules(); const resources=matchedResources(reasons);
  $("notarztSummary").innerHTML=reasons.length?`<strong class="status-danger">Notarzt-/NEF-Regel ausgelöst</strong><br>${reasons.map(x=>`<div class="item">• ${esc(x)}</div>`).join("")}`:`<strong class="status-good">Keine hinterlegte Notarztregel ausgelöst</strong><div class="item">Die endgültige Disposition bleibt fachlich zu prüfen.</div>`;
  $("resourceSummary").innerHTML=resources.map(x=>`<div class="item">• ${esc(x)}</div>`).join(""); renderSummary(); return {reasons,resources}; }
function renderSummary(){ const map=new Map(currentQuestions.map(q=>[q.id,q.text])); map.set("alter","Automatisch berechnetes Alter"); $("answerSummary").innerHTML=Object.entries(answers).length?Object.entries(answers).map(([k,v])=>`<div class="item"><strong>${esc(map.get(k)||k)}:</strong> ${esc(v)}${k==="alter"?" Jahre":""}</div>`).join(""):"Noch keine Antworten."; }
function generateTexts(){ const {reasons,resources}=evaluate(); const qs=new Map(currentQuestions.map(q=>[q.id,q.text])); qs.set("alter","Automatisch berechnetes Alter"); const lines=Object.entries(answers).filter(([,v])=>String(v).trim()).map(([k,v])=>`${qs.get(k)||k}: ${v}`);
  const summary=`Einsatzthema: ${categoryName(currentCategory)}.\n`+lines.join("\n")+`\n\nNotarzt-/NEF-Bewertung: ${reasons.length?"Regel ausgelöst – "+reasons.join("; "):"keine hinterlegte Regel ausgelöst."}\nEinsatzmittelvorschlag: ${resources.join(", ")}.`;
  const age=answers.alter?`${answers.alter} Jahre, `:""; const key=[];
  if(answers.hauptbeschwerde) key.push(answers.hauptbeschwerde); if(answers.eingeklemmt==="Ja") key.push("Person eingeklemmt"); if(answers.bewusstsein) key.push(`Bewusstsein: ${answers.bewusstsein}`); if(answers.atmung) key.push(`Atmung: ${answers.atmung}`); if(answers.schwereverletzung==="Ja") key.push("Verdacht auf schwere Verletzung"); if(answers.blutung==="Ja") key.push("schwere Blutung"); if(answers.brustschmerz==="Ja") key.push("akuter Brustschmerz"); if(answers.neurologie&&answers.neurologie!=="Keine") key.push(`neurologisch: ${answers.neurologie}`); if(answers.vorerkrankungen) key.push(`Vorerkrankungen: ${answers.vorerkrankungen}`);
  const dispatch=`${categoryName(currentCategory)} – ${age}${key.length?key.join("; "):"Lage wird weiter abgefragt"}. ${reasons.length?"Notarzt-/NEF-Regel ausgelöst: "+reasons.join("; ")+". ":"Keine hinterlegte Notarztregel ausgelöst. "}Vorschlag: ${resources.join(", ")}.`;
  $("finalSummary").textContent=summary; $("dispatchText").textContent=dispatch; return {summary,dispatch,reasons,resources}; }
async function finish(){ const result=generateTexts(); if(db&&user){ try{ await push(ref(db,`call_history/${user.uid}`),{category:currentCategory,answers,notarztReasons:result.reasons,resources:result.resources,summary:result.summary,dispatchText:result.dispatch,createdAt:Date.now(),source:"web"}); setStatus("● Abfrage gespeichert"); }catch(e){ console.error(e); alert("Abfrage konnte nicht gespeichert werden: "+e.message); } } else { const h=JSON.parse(localStorage.getItem("einsatzabfrage_history")||"[]"); h.push({category:currentCategory,answers,...result,createdAt:Date.now()}); localStorage.setItem("einsatzabfrage_history",JSON.stringify(h)); }
  $("finalSummary").scrollIntoView({behavior:"smooth",block:"start"}); }

async function requireAdmin(){ if(!isAdmin()) throw new Error("Nur der Administrator darf diesen Bereich speichern."); }
async function write(path,value){ await requireAdmin(); await set(ref(db,path),value); await loadFirebase(); }
function lines(id){ return $(id).value.split("\n").map(x=>x.trim()).filter(Boolean); }
async function saveQuestion(){ const c=$("qCategory").value,id=$("qId").value.trim(); if(!id||!$("qText").value.trim()) throw new Error("Frage-ID und Frage sind erforderlich."); await write(`catalog/${c}/${id}`,{id,text:$("qText").value.trim(),type:$("qType").value,options:lines("qOptions"),whenQuestion:$("qWhenQuestion").value.trim(),whenValue:$("qWhenValue").value.trim(),order:Number($("qOrder").value||100),suggestionGroup:$("qSuggestionGroup").value.trim()}); alert("Frage in Firebase gespeichert."); }
async function saveNotarzt(){ const id=$("nId").value.trim(); if(!id) throw new Error("Regel-ID fehlt."); await write(`notarzt_rules/${id}`,{category:$("nCategory").value,questionId:$("nQuestion").value.trim(),value:$("nValue").value.trim(),reason:$("nReason").value.trim()}); alert("Notarztregel gespeichert."); }
async function saveResource(){ const id=$("rId").value.trim(); if(!id) throw new Error("Regel-ID fehlt."); await write(`resource_rules/${id}`,{category:$("rCategory").value,questionId:$("rQuestion").value.trim(),value:$("rValue").value.trim(),resources:lines("rResources")}); alert("Einsatzmittelregel gespeichert."); }
async function saveSuggestion(){ const g=$("sGroup").value.trim(),t=$("sText").value.trim(); if(!g||!t) throw new Error("Gruppe und Vorschlag sind erforderlich."); await requireAdmin(); const arr=data.suggestions?.[g]||[]; if(!arr.includes(t)) arr.push(t); await write(`suggestions/${g}`,arr); alert("Vorschlag gespeichert."); }
async function seed(){ await requireAdmin(); for(const [path,val] of Object.entries(defaults)) await set(ref(db,path),val); await loadFirebase(); alert("Neue Grunddaten wurden in Firebase gespeichert und vorhandene gleichnamige Bereiche überschrieben."); }

document.querySelectorAll(".category").forEach(b=>b.onclick=()=>start(b.dataset.category));
$("backHome").onclick=()=>{ $("call").hidden=true; $("home").hidden=false; };
$("previousBtn").onclick=()=>{ currentIndex--; renderQuestion(); };
$("nextBtn").onclick=nextQuestion;
$("finishBtn").onclick=finish;
$("adminBtn").onclick=()=>{ if(isAdmin()){ $("loginModal").hidden=true; $("loginModal").style.display="none"; $("home").hidden=true; $("call").hidden=true; $("admin").hidden=false; } else { $("loginError").textContent=""; $("loginModal").hidden=false; $("loginModal").style.display="grid"; } };
$("closeAdmin").onclick=()=>{ $("admin").hidden=true; $("home").hidden=false; };
$("cancelLogin").onclick=()=>{ $("loginError").textContent=""; $("loginModal").hidden=true; $("loginModal").style.display="none"; };
$("doLogin").onclick=async()=>{ try{ $("loginError").textContent=""; if(!auth) throw new Error("Firebase ist noch nicht konfiguriert."); const credential=await signInWithEmailAndPassword(auth,$("loginEmail").value.trim(),$("loginPassword").value); if(credential.user.uid!==ADMIN_UID){ $("loginError").textContent="Dieses Konto ist nicht als Administrator hinterlegt."; return; } user=credential.user; $("logoutBtn").hidden=false; $("loginModal").hidden=true; $("loginModal").style.display="none"; $("home").hidden=true; $("call").hidden=true; $("admin").hidden=false; setStatus("● Firebase verbunden – Verwaltung angemeldet"); }catch(e){ $("loginError").textContent=e.message; } };
$("logoutBtn").onclick=async()=>{ await signOut(auth); };
document.querySelectorAll(".tab-btn").forEach(b=>b.onclick=()=>{ document.querySelectorAll(".tab-btn").forEach(x=>x.classList.remove("active")); document.querySelectorAll(".tab-content").forEach(x=>x.hidden=true); b.classList.add("active"); $(b.dataset.tab).hidden=false; });
$("saveQuestion").onclick=()=>saveQuestion().catch(e=>alert(e.message)); $("saveNotarzt").onclick=()=>saveNotarzt().catch(e=>alert(e.message)); $("saveResource").onclick=()=>saveResource().catch(e=>alert(e.message)); $("saveSuggestion").onclick=()=>saveSuggestion().catch(e=>alert(e.message)); $("seedBtn").onclick=()=>seed().catch(e=>alert(e.message));
fillCategories(); $("loginModal").hidden=true; $("loginModal").style.display="none"; $("admin").hidden=true; $("call").hidden=true; $("home").hidden=false; setStatus("● Startbereit"); initFirebase();

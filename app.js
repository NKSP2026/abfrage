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

/*
  WICHTIG:
  - Auswahlfragen (Ja/Nein/Unklar usw.) gehen sofort automatisch weiter.
  - Text-/Zahlen-/Listenfragen bekommen eine Weiter-Taste.
  - Bei der letzten Frage wird die Auswertung automatisch abgeschlossen.
  - Medizin: Bewusstlos + keine normale Atmung/Atemstillstand -> sofort REA-Anleitung.
*/
const defaults = {
  catalog: {
    medizin: {
      fuer_wen:{id:"fuer_wen",text:"Geht es um Sie selbst oder um eine andere Person?",type:"choice",options:["Mich selbst","Eine andere Person","Mehrere Personen / unklar"],order:10},
      geburtsdatum:{id:"geburtsdatum",text:"Wie lautet das Geburtsdatum?",type:"date",order:20},
      geschlecht:{id:"geschlecht",text:"Welches Geschlecht ist angegeben?",type:"choice",options:["Männlich","Weiblich","Divers","Unbekannt"],order:30},
      problem:{id:"problem",text:"Was ist gerade passiert bzw. was ist das Hauptproblem?",type:"text",order:40},
      erstmal:{id:"erstmal",text:"Treten diese Beschwerden zum ersten Mal auf oder gab es sie schon öfter?",type:"choice",options:["Zum ersten Mal","Schon öfter / bekannt","Unklar"],order:45},
      bewusstsein:{id:"bewusstsein",text:"Ist die Person wach und ansprechbar?",type:"choice",options:["Ja, wach und orientiert","Verwirrt / desorientiert","Somnolent","Soporös","Bewusstlos"],order:50},
      atmung:{id:"atmung",text:"Wie ist die Atmung?",type:"choice",options:["Normal","Dyspnoe / erschwerte Atmung","Keine normale Atmung","Atemstillstand"],order:60},
      brustschmerz:{id:"brustschmerz",text:"Bestehen akute oder starke Brustschmerzen?",type:"choice",options:["Ja","Nein","Unklar"],order:70},
      blutung:{id:"blutung",text:"Besteht eine starke Blutung?",type:"choice",options:["Ja","Nein","Unklar"],order:80},
      vorerkrankungen:{id:"vorerkrankungen",text:"Bestehen relevante Vorerkrankungen?",type:"text",order:90,suggestionGroup:"vorerkrankungen"},
      medikamente:{id:"medikamente",text:"Werden regelmäßig Medikamente eingenommen?",type:"choice",options:["Ja","Nein","Unklar"],order:100},
      allergien:{id:"allergien",text:"Sind relevante Allergien bekannt?",type:"choice",options:["Ja","Nein","Unklar"],order:110},
      schwangerschaft:{id:"schwangerschaft",text:"Besteht eine Schwangerschaft oder ist diese möglich?",type:"choice",options:["Ja","Nein","Unklar"],order:120,whenQuestion:"geschlecht",whenValue:"Weiblich,Divers"}
    },

    brand: {
      objekt:{id:"objekt",text:"Um was für ein Objekt handelt es sich?",type:"choice",options:["Wohngebäude / Wohnung","Gewerbe / öffentliches Gebäude","Fahrzeug","Freifläche","Sonstiges","Unklar"],order:10},
      feuersichtbar:{id:"feuersichtbar",text:"Ist Feuer sichtbar?",type:"choice",options:["Ja","Nein","Unklar"],order:20},
      rauch:{id:"rauch",text:"Ist Rauchentwicklung vorhanden?",type:"choice",options:["Stark","Leicht","Nein","Unklar"],order:30},
      etage:{id:"etage",text:"Welche Etage ist betroffen?",type:"choice",options:["Keller","Erdgeschoss","1. Obergeschoss","2. Obergeschoss","3. Obergeschoss oder höher","Unklar"],order:40,whenQuestion:"objekt",whenValue:"Wohngebäude / Wohnung"},
      wohneinheit:{id:"wohneinheit",text:"Welche Wohneinheit ist betroffen?",type:"choice",options:["Links","Rechts","Mitte","Unklar"],order:50,whenQuestion:"objekt",whenValue:"Wohngebäude / Wohnung"},
      weitere_etagen:{id:"weitere_etagen",text:"Gibt es weitere Etagen über der betroffenen Etage?",type:"choice",options:["Ja","Nein","Unklar"],order:60,whenQuestion:"objekt",whenValue:"Wohngebäude / Wohnung"},
      personen_im_objekt:{id:"personen_im_objekt",text:"Befinden sich noch Personen im Brandobjekt oder im unmittelbaren Gefahrenbereich?",type:"choice",options:["Ja","Nein","Unklar"],order:70},
      verletzte:{id:"verletzte",text:"Gibt es bereits gerettete verletzte oder durch Rauch betroffene Personen?",type:"choice",options:["Ja","Nein","Unklar"],order:80,skipWhenQuestion:"personen_im_objekt",skipWhenValue:"Ja"},
      ausbreitung:{id:"ausbreitung",text:"Breitet sich Feuer oder Rauch weiter aus?",type:"choice",options:["Ja","Nein","Unklar"],order:90}
    },

    vu: {
      beteiligte:{id:"beteiligte",text:"Sind Personen verletzt?",type:"choice",options:["Ja","Nein","Unklar"],order:10},
      eingeklemmt:{id:"eingeklemmt",text:"Sind Personen eingeklemmt oder eingeschlossen?",type:"choice",options:["Ja","Nein","Unklar"],order:20},
      anzahl:{id:"anzahl",text:"Wie viele Personen sind ungefähr betroffen?",type:"number",order:30},
      gefahr:{id:"gefahr",text:"Bestehen besondere Gefahren, z. B. Rauch, Feuer oder auslaufende Stoffe?",type:"choice",options:["Ja","Nein","Unklar"],order:40}
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
    nichtnormal:{category:"medizin",questionId:"atmung",value:"Keine normale Atmung",reason:"Keine normale Atmung"},
    dyspnoe:{category:"medizin",questionId:"atmung",value:"Dyspnoe / erschwerte Atmung",reason:"Schwere Atemnot / erschwerte Atmung"},
    brustschmerz:{category:"medizin",questionId:"brustschmerz",value:"Ja",reason:"Akuter Brustschmerz"},
    starke_blutung:{category:"medizin",questionId:"blutung",value:"Ja",reason:"Starke Blutung"},
    brand_personen_im_objekt:{category:"brand",questionId:"personen_im_objekt",value:"Ja",reason:"Personen im Brandobjekt – besondere Gefährdung / medizinische Versorgung erforderlich"},
    brand_rauchen:{category:"brand",questionId:"verletzte",value:"Ja",reason:"Verletzte bzw. mögliche Rauchgasbelastung"},
    vu_eingeklemmt:{category:"vu",questionId:"eingeklemmt",value:"Ja",reason:"Eingeklemmte Person"}
  },

  resource_rules: {
    med_rtw:{category:"medizin",questionId:"bewusstsein",value:"*",resources:["RTW"]},
    brand_feuer:{category:"brand",questionId:"feuersichtbar",value:"Ja",resources:["Feuerwehr"]},
    brand_personen_im_objekt:{category:"brand",questionId:"personen_im_objekt",value:"Ja",resources:["Feuerwehr","Rettungsdienst","NEF / Notarzt – nach örtlicher Disposition"]},
    brand_rauchen:{category:"brand",questionId:"verletzte",value:"Ja",resources:["Rettungsdienst","NEF / Notarzt – nach örtlicher Disposition"]},
    vu_eingeklemmt:{category:"vu",questionId:"eingeklemmt",value:"Ja",resources:["Feuerwehr / technische Rettung","Rettungsdienst","NEF / Notarzt – nach örtlicher Disposition"]},
    vu_verletzt:{category:"vu",questionId:"beteiligte",value:"Ja",resources:["Rettungsdienst"]},
    abc_austritt:{category:"abc",questionId:"austritt",value:"Ja",resources:["Feuerwehr / ABC-Gefahrgut-Komponente"]}
  },

  suggestions: {
    vorerkrankungen:[
      "Keine bekannt","Diabetes mellitus","COPD","Asthma bronchiale","Epilepsie",
      "Koronare Herzkrankheit","Herzinsuffizienz","Bluthochdruck",
      "Schlaganfall in der Vorgeschichte","Krebserkrankung"
    ],
    gefahrstoffe:["Benzin","Diesel","Heizöl","Ammoniak","Chlor","Unbekannter Stoff"]
  }
};

let fb = null, db = null, auth = null, user = null;
let data = structuredClone(defaults);
let currentCategory = null, currentQuestions = [], currentIndex = 0, answers = {};
let finishing = false;
let reaActive = false;

function configured(){
  return !firebaseConfig.apiKey.includes("HIER_") && !firebaseConfig.appId.includes("HIER_");
}
function isAdmin(){
  return !!user && user.uid === ADMIN_UID && !ADMIN_UID.includes("HIER_");
}
function esc(s){
  return String(s ?? "").replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}
function setStatus(t){
  $("status").textContent=t;
}
function fillCategories(){
  for(const id of ["qCategory","nCategory","rCategory"]){
    const el=$(id);
    if(el) el.innerHTML = categories.map(([v,n])=>`<option value="${v}">${n}</option>`).join("");
  }
}

/* Defaults bleiben immer erhalten. Firebase ergänzt bzw. überschreibt nur vorhandene Einträge. */
function mergeData(base, incoming){
  const out = structuredClone(base);
  if(!incoming || typeof incoming !== "object") return out;
  for(const [key,val] of Object.entries(incoming)){
    if(val && typeof val === "object" && !Array.isArray(val) &&
       out[key] && typeof out[key] === "object" && !Array.isArray(out[key])){
      out[key] = mergeData(out[key], val);
    }else{
      out[key] = val;
    }
  }
  return out;
}

async function initFirebase(){
  if(!configured()){
    setStatus("● Lokaler Startmodus – Firebase-Konfiguration fehlt");
    return;
  }
  try{
    fb=initializeApp(firebaseConfig);
    db=getDatabase(fb);
    auth=getAuth(fb);

    onAuthStateChanged(auth, async u=>{
      user=u;
      $("logoutBtn").hidden=!isAdmin();

      if(!u){
        try{
          await signInAnonymously(auth);
        }catch(e){
          console.warn(e);
          setStatus("⚠️ Firebase verbunden – anonyme Anmeldung muss in Firebase aktiviert werden");
        }
      }else{
        setStatus(isAdmin() ? "● Firebase verbunden – Verwaltung angemeldet" : "● Firebase verbunden");
      }
    });

    try{
      await loadFirebase();
    }catch(e){
      console.error("Firebase-Daten konnten noch nicht geladen werden:", e);
      setStatus("⚠️ Firebase verbunden – Datenbankdaten konnten noch nicht geladen werden");
    }
  }catch(e){
    console.error(e);
    setStatus("⚠️ Firebase konnte nicht initialisiert werden – lokaler Startmodus");
  }
}

async function loadFirebase(){
  if(!db) return;
  const paths=["catalog","notarzt_rules","resource_rules","suggestions"];

  for(const p of paths){
    const snap=await get(ref(db,p));
    if(snap.exists()){
      data[p]=mergeData(defaults[p], snap.val());
      // Die aktuellen Standardfragen haben Vorrang vor alten Firebase-Versionen.
      // Zusätzliche, wirklich neue Verwaltungsfragen bleiben trotzdem erhalten.
      if(p==="catalog"){
        for(const [cat, standardQuestions] of Object.entries(defaults.catalog||{})){
          data.catalog[cat] ||= {};
          for(const [id, q] of Object.entries(standardQuestions)){
            data.catalog[cat][id]=structuredClone(q);
          }
        }
      }
    }else{
      data[p]=structuredClone(defaults[p]);
    }
  }
}

function questionKey(q){
  const id=String(q?.id||"").trim().toLowerCase();
  const text=String(q?.text||"").trim().toLowerCase();

  // Bekannte Kernfragen werden unabhängig von alten Firebase-IDs erkannt.
  if(id==="fuer_wen" || /(?:wen|wer).*betrifft.*(?:notfall|medizin)|(?:sie|dich) selbst.*andere person|mich selbst.*andere person/i.test(text)) return "medizin:fuer_wen";
  if(id==="geburtsdatum" || /geburts(?:datum|tag)|wann.*geboren/i.test(text)) return "medizin:geburtsdatum";
  if(id==="geschlecht" || /welches geschlecht|geschlecht.*angegeben/i.test(text)) return "medizin:geschlecht";
  if(["problem","hauptproblem","beschwerden","beschwerde","symptome"].includes(id) || /haupt(?:problem|beschwer)|was (?:ist|sind).*(?:problem|beschwer)|welche.*beschwer|aktuelle.*beschwer|symptom/i.test(text)) return "medizin:problem";
  if(id==="bewusstsein" || /bewusstseins|wach und ansprechbar|ansprechbar/i.test(text)) return "medizin:bewusstsein";
  if(id==="atmung" || /wie ist die atmung|atmet.*normal|atemstillstand/i.test(text)) return "medizin:atmung";
  if(id==="brustschmerz" || /brustschmerz|schmerzen.*brust/i.test(text)) return "medizin:brustschmerz";
  if(id==="blutung" || /starke blutung|blutung.*stark/i.test(text)) return "medizin:blutung";
  if(id==="vorerkrankungen" || /vorerkrank/i.test(text)) return "medizin:vorerkrankungen";
  if(id==="medikamente" || /medikament.*eingenommen|regelmäßig.*medikament/i.test(text)) return "medizin:medikamente";
  if(id==="allergien" || /allerg/i.test(text)) return "medizin:allergien";
  if(id==="schwangerschaft" || /schwanger/i.test(text)) return "medizin:schwangerschaft";
  if(id==="erstmal" || /erste.?mal|schon öfter|öfter.*beschwer|beschwer.*wieder/i.test(text)) return "medizin:erstmal";

  if(id==="objekt" || /welch.*objekt|handelt.*gebäude|gebäude.*wohnung/i.test(text)) return "brand:objekt";
  if(id==="etage" || /welche etage|betroffene etage/i.test(text)) return "brand:etage";
  if(id==="wohneinheit" || /wohneinheit|links.*rechts.*mitte/i.test(text)) return "brand:wohneinheit";
  if(id==="weitere_etagen" || /weitere etagen.*über|etagen.*über.*betroffen/i.test(text)) return "brand:weitere_etagen";
  if(id==="personen_im_objekt" || /personen.*(?:brandobjekt|gebäude|gefahrenbereich)|noch.*personen.*(?:objekt|gebäude)/i.test(text)) return "brand:personen_im_objekt";
  if(id==="verletzte" || /verletzte.*rauch|rauchgas|durch rauch betroffene/i.test(text)) return "brand:verletzte";

  // Exakte Doppelungen werden für alle Kategorien entfernt.
  const normalizedText=text.replace(/[^a-z0-9äöüß]+/g," ").trim();
  return `${id || "ohne-id"}:${normalizedText}`;
}

function questionsFor(category){
  const raw=Object.values(data.catalog?.[category] || {})
    .filter(q=>q && q.id && q.text);

  const seen=new Map();
  const result=[];

  for(const q of raw){
    const key=questionKey(q);
    const existingIndex=seen.get(key);

    if(existingIndex === undefined){
      seen.set(key,result.length);
      result.push(q);
      continue;
    }

    // Bei einer doppelten Kernfrage hat die aktuelle Standardfrage Vorrang.
    const existing=result[existingIndex];
    const defaultIds=new Set(Object.keys(defaults.catalog?.[category] || {}));
    const existingIsDefault=defaultIds.has(existing.id);
    const currentIsDefault=defaultIds.has(q.id);

    if(currentIsDefault && !existingIsDefault){
      result[existingIndex]=q;
    }
  }

  if(result.length){
    return result.sort((a,b)=>(a.order||999)-(b.order||999));
  }

  return Object.values(defaults.catalog?.[category] || {
    allgemein:{id:"beschreibung",text:"Bitte beschreiben Sie kurz das Ereignis.",type:"text",order:10}
  });
}
function start(category){
  currentCategory=category;
  currentQuestions=questionsFor(category);
  currentIndex=0;
  answers={};
  finishing=false;
  reaActive=false;

  $("home").hidden=true;
  $("admin").hidden=true;
  $("call").hidden=false;

  $("categoryTitle").textContent=categories.find(x=>x[0]===category)?.[1]||category;

  const rea = document.getElementById("reaGuide");
  if(rea) rea.remove();

  renderQuestion();
  evaluate();
}

function valueMatches(actual, expected){
  const values=String(expected ?? "").split(",").map(x=>x.trim()).filter(Boolean);
  return values.length ? values.includes(String(actual ?? "")) : true;
}

function shouldSkipQuestion(q){
  if(q.whenQuestion && !valueMatches(answers[q.whenQuestion], q.whenValue)) return true;
  if(q.skipWhenQuestion && valueMatches(answers[q.skipWhenQuestion], q.skipWhenValue)) return true;

  // Medizinische Logik: bei männlich wird Schwangerschaft nicht abgefragt.
  if(q.id==="schwangerschaft" && answers.geschlecht==="Männlich") return true;

  // Brand: Wenn Personen noch im Brandobjekt sind, ist die Gefahr/Rauchbelastung bereits impliziert.
  if(currentCategory==="brand" && answers.personen_im_objekt==="Ja" &&
     ["verletzte","rauchgasvergiftung","rauchgas"].includes(String(q.id||"").toLowerCase())) return true;

  // Allgemeine semantische Doppelungen: bereits beantwortete gleiche Kernfrage nicht erneut fragen.
  const key=questionKey(q);
  const already=currentQuestions.find(x=>x!==q && questionKey(x)===key && answers[x.id]!==undefined && answers[x.id]!=="");
  if(already) return true;

  return false;
}

function visibleQuestions(){
  return currentQuestions.filter(q=>!shouldSkipQuestion(q));
}

function isReaCondition(){
  if(currentCategory !== "medizin") return false;

  return answers.bewusstsein === "Bewusstlos" &&
    ["Keine normale Atmung","Atemstillstand"].includes(answers.atmung);
}

function addNextButton(area, q){
  const next=document.createElement("button");
  next.className="next-answer-btn";
  next.textContent="Weiter →";

  next.onclick=()=>{
    const value=String(answers[q.id] ?? "").trim();

    if(!value){
      alert("Bitte zuerst eine Antwort eingeben oder auswählen.");
      return;
    }

    advanceOrFinish();
  };

  area.appendChild(next);
}

function renderQuestion(){
  if(reaActive) return;

  const qs=visibleQuestions();

  if(!qs.length){
    $("questionText").textContent="Keine Fragen vorhanden.";
    $("answerArea").innerHTML="";
    return;
  }

  if(currentIndex >= qs.length){
    finish();
    return;
  }

  currentIndex=Math.max(0,Math.min(currentIndex,qs.length-1));
  const q=qs[currentIndex];

  $("progress").textContent=`Frage ${currentIndex+1} von ${qs.length}`;
  $("questionText").textContent=q.text;

  const area=$("answerArea");
  area.innerHTML="";

  if(q.type==="choice"){
    const wrap=document.createElement("div");
    wrap.className="answer-options";

    (q.options||[]).forEach(v=>{
      const b=document.createElement("button");
      b.type="button";
      b.className="answer-option"+(answers[q.id]===v?" selected":"");
      b.textContent=v;

      b.onclick=()=>{
        answers[q.id]=v;
        evaluate();

        if(isReaCondition()){
          showReaGuide();
          return;
        }

        setTimeout(()=>advanceOrFinish(), 120);
      };

      wrap.appendChild(b);
    });

    area.appendChild(wrap);
  }else{
    const input=document.createElement(q.type==="text" ? "textarea" : "input");

    if(q.type==="number"){
      input.type="number";
      input.min="0";
      input.step="1";
    }

    if(q.type==="date"){
      input.type="date";
    }

    input.value=answers[q.id]||"";

    input.oninput=()=>{
      answers[q.id]=input.value;
      evaluate();
    };

    input.onchange=()=>{
      answers[q.id]=input.value;
      evaluate();
    };

    area.appendChild(input);

    if(q.type==="text" && q.suggestionGroup){
      const group=data.suggestions?.[q.suggestionGroup]||[];

      if(group.length){
        const sw=document.createElement("div");
        sw.className="suggestions";

        group.slice(0,20).forEach(x=>{
          const b=document.createElement("button");
          b.type="button";
          b.className="suggestion-btn";
          b.textContent=x;

          b.onclick=()=>{
            input.value=x;
            answers[q.id]=x;
            evaluate();
            input.focus();
          };

          sw.appendChild(b);
        });

        area.appendChild(sw);
      }
    }

    /* Nur bei eigener Eingabe, Datum, Zahl oder Vorschlagslisten ist Weiter nötig. */
    addNextButton(area, q);
  }

  $("previousBtn").disabled=currentIndex===0;
  $("finishBtn").style.display="none";
  renderSummary();
}

function advanceOrFinish(){
  if(reaActive) return;

  const qs=visibleQuestions();

  if(currentIndex < qs.length-1){
    currentIndex++;
    renderQuestion();
  }else{
    finish();
  }
}

function showReaGuide(){
  if(reaActive) return;
  reaActive=true;

  $("progress").textContent="KRITISCHER NOTFALL";
  $("questionText").textContent="⚠️ Reanimation sofort beginnen";
  $("answerArea").innerHTML=`
    <div id="reaGuide" class="rea-guide">
      <h3>🫀 PRÜFEN – RUFEN – DRÜCKEN</h3>
      <p><strong>1. Telefon auf Lautsprecher:</strong> Lassen Sie die Verbindung offen und folgen Sie zusätzlich den Anweisungen der Leitstelle.</p>
      <p><strong>2. Kurz prüfen:</strong> Reagiert die Person nicht und atmet sie nicht oder nicht normal, sofort handeln. Einen Pulstastversuch sollte nur durchführen, wer darin geschult ist – dadurch darf die Herzdruckmassage nicht verzögert werden.</p>
      <p><strong>3. Position:</strong> Person auf den Rücken auf eine möglichst feste Unterlage legen.</p>
      <p><strong>4. Hände:</strong> Einen Handballen in die Mitte des Brustkorbs auf das Brustbein legen, zweite Hand darüber. Arme möglichst gerade, Schultern über den Händen.</p>
      <p><strong>5. Drücken:</strong> Bei Erwachsenen etwa <strong>5–6 cm</strong> tief und <strong>100–120-mal pro Minute</strong>. Nach jedem Druck den Brustkorb vollständig entlasten.</p>
      <p><strong>6. AED:</strong> Wenn ein AED verfügbar ist, holen lassen und den Geräteanweisungen folgen. Die Herzdruckmassage nur so kurz wie nötig unterbrechen.</p>
      <p class="rea-hint">Diese Anleitung ersetzt nicht die Anleitung der Notrufleitstelle. Bei einem echten Notfall immer 112 und den Disponenten folgen.</p>
      <button type="button" id="reaFinishBtn">Auswertung / Einsatzmittel anzeigen</button>
    </div>
  `;

  $("previousBtn").disabled=false;
  $("finishBtn").style.display="none";
  $("reaFinishBtn").onclick=()=>finish();
  evaluate();
}

function calculateAge(dateString){
  if(!dateString) return null;

  const birth=new Date(dateString+"T00:00:00");
  if(Number.isNaN(birth.getTime())) return null;

  const today=new Date();
  let age=today.getFullYear()-birth.getFullYear();
  const month=today.getMonth()-birth.getMonth();

  if(month<0 || (month===0 && today.getDate()<birth.getDate())) age--;

  return age>=0 ? age : null;
}

function evaluate(){
  if(currentCategory==="medizin" && answers.geburtsdatum){
    const age=calculateAge(answers.geburtsdatum);
    if(age !== null) answers.alter=`${age} Jahre`;
  }

  const reasons=[];

  for(const r of Object.values(data.notarzt_rules||{})){
    if(r.category===currentCategory && answers[r.questionId]===r.value){
      reasons.push(r.reason||r.id||"Regel erfüllt");
    }
  }

  $("notarztSummary").innerHTML=reasons.length
    ? `<strong>Notarzt/NEF-Regel ausgelöst</strong><br>${reasons.map(x=>`<div class="item">• ${esc(x)}</div>`).join("")}`
    : "Keine hinterlegte Notarztregel durch die bisher gegebenen Antworten ausgelöst.";

  const resources=new Set();

  for(const r of Object.values(data.resource_rules||{})){
    if(r.category!==currentCategory) continue;

    if(r.value==="*" || answers[r.questionId]===r.value){
      (r.resources||[]).forEach(x=>resources.add(x));
    }
  }

  if(reasons.length) resources.add("NEF / Notarzt (gemäß hinterlegter Regel)");

  if(isReaCondition()){
    resources.add("RTW");
    resources.add("NEF / Notarzt");
    resources.add("AED, falls verfügbar");
  }

  if(!resources.size){
    if(currentCategory==="medizin"){
      resources.add("Rettungsdienst – fachliche Disposition erforderlich");
    }else if(["brand","thl","vu","abc"].includes(currentCategory)){
      resources.add("Weitere Disposition anhand der zuständigen Vorgaben erforderlich");
    }
  }

  $("resourceSummary").innerHTML=[...resources]
    .map(x=>`<div class="item">• ${esc(x)}</div>`)
    .join("");

  renderSummary();
  renderFinalTexts(reasons, [...resources]);
}

function renderFinalTexts(reasons=[], resources=[]){
  const title=(categories.find(x=>x[0]===currentCategory)?.[1]||currentCategory||"Einsatz").replace(/^[^A-Za-zÄÖÜäöü0-9]+\s*/, "");
  const lines=[];

  // Lesbare Zusammenfassung: alle bisher beantworteten Fragen.
  for(const q of currentQuestions){
    const v=answers[q.id];
    if(v !== undefined && v !== "") lines.push(`${q.text}: ${v}`);
  }
  if(answers.alter && !lines.some(x=>x.startsWith("Alter:"))) lines.unshift(`Alter: ${answers.alter}`);

  $("finalSummary").innerHTML = lines.length
    ? `<div class="item"><strong>${esc(title)}</strong></div>` + lines.map(x=>`<div class="item">• ${esc(x)}</div>`).join("")
    : "Noch keine Antworten vorhanden.";

  // DME-tauglicher Kurztext: nur Lage, Abweichungen und positive Befunde.
  const parts=[];
  const add=(txt, condition=true)=>{ if(condition && txt) parts.push(txt); };

  if(currentCategory==="medizin"){
    add(answers.alter);
    add(({"Männlich":"m","Weiblich":"w","Divers":"div."})[answers.geschlecht]);
    add(answers.problem);
    add(answers.bewusstsein, ["Verwirrt / desorientiert","Somnolent","Soporös","Bewusstlos"].includes(answers.bewusstsein));
    add(answers.atmung, ["Dyspnoe / erschwerte Atmung","Keine normale Atmung","Atemstillstand"].includes(answers.atmung));
    add("Brustschmerz", answers.brustschmerz==="Ja");
    add("starke Blutung", answers.blutung==="Ja");
    add(`Vorerkr.: ${answers.vorerkrankungen}`, answers.vorerkrankungen && answers.vorerkrankungen!=="Keine bekannt");
    add(`Medikamente: ${answers.medikamente}`, answers.medikamente==="Ja");
    add(`Allergien: ${answers.allergien}`, answers.allergien==="Ja");
  }else if(currentCategory==="brand"){
    add("Feuer sichtbar", answers.feuersichtbar==="Ja");
    add(`Rauch ${String(answers.rauch).toLowerCase()}`, ["Stark","Leicht"].includes(answers.rauch));
    add("Personen gefährdet", answers.personen==="Ja");
    add("Verletzte / Rauchgasverdacht", answers.verletzte==="Ja");
    add("Personen im Gefahrenbereich", answers.eingeschlossen==="Ja");
    add("Ausbreitung", answers.ausbreitung==="Ja");
    add(answers.objekt, answers.objekt && answers.objekt!=="Unklar");
  }else if(currentCategory==="vu"){
    add("Verletzte", answers.beteiligte==="Ja");
    add("Person eingeklemmt", answers.eingeklemmt==="Ja");
    add(`${answers.anzahl} Betroffene`, answers.anzahl);
    add("besondere Gefahr", answers.gefahr==="Ja");
  }else if(currentCategory==="abc"){
    add(answers.stoff, answers.stoff);
    add("Stoffaustritt", answers.austritt==="Ja");
    add("Personen betroffen", answers.betroffen==="Ja");
  }else if(currentCategory==="thl"){
    add(answers.lage, answers.lage);
    add("Personen betroffen", answers.personen==="Ja");
    add("akute Gefahr", answers.akutegefahr==="Ja");
  }else{
    for(const q of currentQuestions){
      const v=answers[q.id];
      if(v && !["Nein","Unklar","Unbekannt","Keine bekannt"].includes(v)) add(`${q.text}: ${v}`);
    }
  }

  // Doppelte und zu lange Einträge vermeiden.
  const unique=[...new Set(parts.map(x=>String(x).trim()).filter(Boolean))].slice(0,8);
  let dispatch = unique.length ? `${title.toUpperCase()} – ${unique.join("; ")}` : title.toUpperCase();
  if(resources.length) dispatch += ` | Mittel: ${resources.join(", ")}`;
  if(reasons.length) dispatch += " | NEF/NA";

  if(!reaActive){
    dispatch += " | Bei Verschlechterung sofort erneut 112 verständigen.";
  }
  $("dispatchText").textContent=dispatch;
}

function renderSummary(){
  const friendly={};

  for(const q of currentQuestions){
    if(answers[q.id] !== undefined && answers[q.id] !== ""){
      friendly[q.text]=answers[q.id];
    }
  }

  if(answers.alter){
    friendly["Alter (automatisch aus Geburtsdatum)"]=answers.alter;
  }

  $("answerSummary").innerHTML=Object.keys(friendly).length
    ? Object.entries(friendly)
        .map(([k,v])=>`<div class="item"><strong>${esc(k)}:</strong> ${esc(v)}</div>`)
        .join("")
    : "Noch keine Antworten.";
}

function escHtml(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function openPdfPrint(){
  // Druckansicht mit allen Fragen, Antworten und dem kurzen Einsatztext.
  // Im Android-/Browser-Druckdialog kann anschließend "Als PDF speichern" gewählt werden.
  evaluate();

  const title=(categories.find(x=>x[0]===currentCategory)?.[1]||currentCategory||"Einsatz")
    .replace(/^[^A-Za-zÄÖÜäöü0-9]+\s*/, "");
  const now=new Date().toLocaleString("de-DE");

  const rows=currentQuestions
    .filter(q=>answers[q.id] !== undefined && answers[q.id] !== "")
    .map(q=>`<tr><th>${escHtml(q.text)}</th><td>${escHtml(answers[q.id])}</td></tr>`)
    .join("");

  const ageRow=answers.alter
    ? `<tr><th>Alter (automatisch aus Geburtsdatum)</th><td>${escHtml(answers.alter)}</td></tr>`
    : "";

  const dispatch=$("dispatchText")?.textContent || "";
  const notarzt=$("notarztSummary")?.innerText || "";
  const resources=$("resourceSummary")?.innerText || "";

  const win=window.open("", "_blank");
  if(!win){
    alert("Das PDF-Fenster konnte nicht geöffnet werden. Bitte Pop-ups für diese Seite erlauben.");
    return;
  }

  win.document.open();
  win.document.write(`<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Einsatzabfrage – ${escHtml(title)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color:#111; line-height:1.35; }
  h1 { margin:0 0 4px; font-size:24px; }
  h2 { margin:22px 0 8px; font-size:18px; border-bottom:1px solid #bbb; padding-bottom:5px; }
  .meta { color:#555; margin-bottom:16px; }
  table { width:100%; border-collapse:collapse; }
  th,td { border:1px solid #bbb; padding:8px; vertical-align:top; text-align:left; }
  th { width:45%; background:#f3f3f3; }
  .box { border:1px solid #999; padding:12px; white-space:pre-wrap; margin-top:8px; }
  .dispatch { font-size:16px; font-weight:bold; }
  .hint { margin-top:20px; color:#666; font-size:12px; }
</style>
</head>
<body>
  <h1>Einsatzabfrage – ${escHtml(title)}</h1>
  <div class="meta">Erstellt am: ${escHtml(now)}</div>

  <h2>Fragen und Antworten</h2>
  <table><tbody>${rows}${ageRow}</tbody></table>

  <h2>Notarzt-/NEF-Bewertung</h2>
  <div class="box">${escHtml(notarzt)}</div>

  <h2>Einsatzmittelvorschlag</h2>
  <div class="box">${escHtml(resources)}</div>

  <h2>Einsatztext</h2>
  <div class="box dispatch">${escHtml(dispatch)}</div>

  <div class="hint">Diese Auswertung dient als Dokumentation und Einsatzunterstützung.</div>
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(()=>win.print(),300);
}

function returnToHome(){
  finishing=false;
  reaActive=false;
  currentCategory=null;
  currentQuestions=[];
  currentIndex=0;
  answers={};

  $("call").hidden=true;
  $("admin").hidden=true;
  $("home").hidden=false;
  $("progress").textContent="";
  $("questionText").textContent="";
  $("answerArea").innerHTML="";

  window.scrollTo({top:0,behavior:"smooth"});
}

async function finish(){
  if(finishing) return;
  finishing=true;

  evaluate();

  $("finishBtn").style.display="none";

  if(db && user){
    try{
      await push(ref(db,`call_history/${user.uid}`),{
        category:currentCategory,
        answers,
        createdAt:Date.now(),
        source:"web"
      });
      setStatus("● Abfrage gespeichert");
    }catch(e){
      console.error(e);
      alert("Abfrage konnte nicht gespeichert werden: "+e.message);
    }
  }else{
    const history=JSON.parse(localStorage.getItem("einsatzabfrage_history")||"[]");
    history.push({
      category:currentCategory,
      answers,
      createdAt:Date.now()
    });
    localStorage.setItem("einsatzabfrage_history",JSON.stringify(history));
    setStatus("● Abfrage lokal gespeichert");
  }

  $("progress").textContent="Auswertung abgeschlossen";
  $("questionText").textContent=reaActive
    ? "⚠️ Kritischer Notfall – Reanimationshinweise beachten"
    : "✓ Abfrage abgeschlossen";

  $("answerArea").innerHTML=`
    <div class="finish-message">
      <strong>${reaActive ? "Die Auswertung ist verfügbar – Reanimationshinweise beachten." : "Die Auswertung wurde automatisch abgeschlossen."}</strong>
      ${reaActive ? "" : "<p style=\"margin-top:12px;\">Wenn sich die Situation oder der Zustand verschlechtert, sofort erneut die <strong>112</strong> verständigen.</p>"}
      <div class="finish-actions" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:18px;">
        <button type="button" id="pdfBtn">📄 PDF erstellen / öffnen</button>
        <button type="button" id="homeBtn">🏠 Zur Startseite</button>
      </div>
    </div>
  `;

  $("pdfBtn").onclick=openPdfPrint;
  $("homeBtn").onclick=returnToHome;

  setTimeout(()=>{
    document.querySelector(".result-grid")?.scrollIntoView({
      behavior:"smooth",
      block:"start"
    });
  },150);
}

async function requireAdmin(){
  if(!isAdmin()) throw new Error("Nur der Administrator darf diesen Bereich speichern.");
}

async function write(path,value){
  await requireAdmin();
  await set(ref(db,path),value);
  await loadFirebase();
}

function lines(id){
  return $(id).value.split("\n").map(x=>x.trim()).filter(Boolean);
}

async function saveQuestion(){
  const c=$("qCategory").value;
  const id=$("qId").value.trim();

  if(!id||!$("qText").value.trim()){
    throw new Error("Frage-ID und Frage sind erforderlich.");
  }

  await write(`catalog/${c}/${id}`,{
    id,
    text:$("qText").value.trim(),
    type:$("qType").value,
    options:lines("qOptions"),
    whenQuestion:$("qWhenQuestion").value.trim(),
    whenValue:$("qWhenValue").value.trim(),
    order:Number($("qOrder").value||100),
    suggestionGroup:$("qSuggestionGroup").value.trim()
  });

  alert("Frage in Firebase gespeichert.");
}

async function saveNotarzt(){
  const id=$("nId").value.trim();

  if(!id) throw new Error("Regel-ID fehlt.");

  await write(`notarzt_rules/${id}`,{
    category:$("nCategory").value,
    questionId:$("nQuestion").value.trim(),
    value:$("nValue").value.trim(),
    reason:$("nReason").value.trim()
  });

  alert("Notarztregel gespeichert.");
}

async function saveResource(){
  const id=$("rId").value.trim();

  if(!id) throw new Error("Regel-ID fehlt.");

  await write(`resource_rules/${id}`,{
    category:$("rCategory").value,
    questionId:$("rQuestion").value.trim(),
    value:$("rValue").value.trim(),
    resources:lines("rResources")
  });

  alert("Einsatzmittelregel gespeichert.");
}

async function saveSuggestion(){
  const g=$("sGroup").value.trim();
  const t=$("sText").value.trim();

  if(!g||!t) throw new Error("Gruppe und Vorschlag sind erforderlich.");

  await requireAdmin();

  const arr=data.suggestions?.[g]||[];

  if(!arr.includes(t)) arr.push(t);

  await write(`suggestions/${g}`,arr);

  alert("Vorschlag gespeichert.");
}

async function seed(){
  await requireAdmin();

  for(const [path,val] of Object.entries(defaults)){
    await set(ref(db,path),val);
  }

  await loadFirebase();
  alert("Grunddaten wurden in Firebase gespeichert.");
}

/* Navigation */
document.querySelectorAll(".category").forEach(b=>{
  b.onclick=()=>start(b.dataset.category);
});

$("backHome").onclick=()=>{
  finishing=false;
  reaActive=false;
  $("call").hidden=true;
  $("home").hidden=false;
};

$("previousBtn").onclick=()=>{
  if(reaActive){
    reaActive=false;
    currentIndex=Math.max(0,currentIndex-1);
  }else{
    currentIndex=Math.max(0,currentIndex-1);
  }

  renderQuestion();
};

$("finishBtn").onclick=finish;

$("adminBtn").onclick=()=>{
  if(isAdmin()){
    $("home").hidden=true;
    $("call").hidden=true;
    $("admin").hidden=false;
  }else{
    $("loginModal").hidden=false;
  }
};

$("closeAdmin").onclick=()=>{
  $("admin").hidden=true;
  $("home").hidden=false;
};

$("cancelLogin").onclick=()=>{
  $("loginModal").hidden=true;
};

$("doLogin").onclick=async()=>{
  try{
    $("loginError").textContent="";

    if(!auth) throw new Error("Firebase ist noch nicht konfiguriert.");

    const credential = await signInWithEmailAndPassword(
      auth,
      $("loginEmail").value.trim(),
      $("loginPassword").value
    );

    if(credential.user.uid !== ADMIN_UID){
      $( "loginError").textContent = "Dieses Konto ist nicht als Administrator hinterlegt.";
      return;
    }

    user = credential.user;
    $("logoutBtn").hidden = false;
    $("loginModal").hidden = true;
    $("home").hidden = true;
    $("call").hidden = true;
    $("admin").hidden = false;

    setStatus("● Firebase verbunden – Verwaltung angemeldet");
  }catch(e){
    $("loginError").textContent=e.message;
  }
};

$("logoutBtn").onclick=async()=>{
  await signOut(auth);
};

document.querySelectorAll(".tab-btn").forEach(b=>{
  b.onclick=()=>{
    document.querySelectorAll(".tab-btn").forEach(x=>x.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(x=>x.hidden=true);
    b.classList.add("active");
    $(b.dataset.tab).hidden=false;
  };
});

$("saveQuestion").onclick=()=>saveQuestion().catch(e=>alert(e.message));
$("saveNotarzt").onclick=()=>saveNotarzt().catch(e=>alert(e.message));
$("saveResource").onclick=()=>saveResource().catch(e=>alert(e.message));
$("saveSuggestion").onclick=()=>saveSuggestion().catch(e=>alert(e.message));
$("seedBtn").onclick=()=>seed().catch(e=>alert(e.message));

fillCategories();

/* Das Verwaltungsfenster darf niemals automatisch beim Öffnen erscheinen. */
$("loginModal").hidden = true;
$("admin").hidden = true;
$("call").hidden = true;
$("home").hidden = false;

setStatus("● Startbereit");
initFirebase();

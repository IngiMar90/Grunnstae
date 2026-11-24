'use strict';
const TEACHER_PASSWORD = '11112222';
const STORAGE_KEY = 'grunnstaerdfraedi_v3_store';
const LAST_STUDENT_KEY = 'grunnstaerdfraedi_v3_last_student';
const EXERCISES = {
  counting:'Talning', findCount:'Finna réttan fjölda', nextNumber:'Hvaða tala kemur næst?',
  previousNumber:'Hvaða tala var á undan?', biggerNumber:'Hvor tala er stærri?',
  sameAmount:'Jafnmargir?', pattern:'Mynstur', mixed:'Blandaðar æfingar'
};
const DIFFICULTIES = {
  easy:{label:'Auðvelt',min:1,max:5}, medium:{label:'Miðlungs',min:1,max:10},
  hard:{label:'Erfitt',min:10,max:30}, legacy:{label:'Eldri lota'}
};
const MODE_MAP = {'Telja hluti':'counting','Talning':'counting','Finna réttan fjölda':'findCount','Hvað kemur næst?':'nextNumber','Hvað kemur á undan?':'previousNumber','Hvað er stærra?':'biggerNumber','Jafnmargir?':'sameAmount','Mynstur':'pattern'};
const META = {
  counting:{hint:'Teldu myndirnar.',color:'#fcf0d8',art:'count'},
  findCount:{hint:'Paraðu tölu og mynd.',color:'#e9e5fa',art:'match'},
  nextNumber:{hint:'Eitt skref áfram.',color:'#e4f1ed',art:'next'},
  previousNumber:{hint:'Eitt skref til baka.',color:'#e9eefc',art:'previous'},
  biggerNumber:{hint:'Berðu saman tvær tölur.',color:'#fae8e4',art:'bigger'},
  sameAmount:{hint:'Eru jafnmargir í hópunum?',color:'#e6f0f4',art:'equal'},
  pattern:{hint:'Finndu það sem kemur næst.',color:'#f5e8f3',art:'pattern'},
  mixed:{hint:'Prófaðu svolítið af öllu.',color:'#eeedf6',art:'mixed'}
};
const ui = {};
let deferredPrompt = null, nextTimer = null;
let store = loadStore();
let gameState = null;
const prefs = readJson('grunnstaerdfraedi_preferences') || {};

function readJson(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function byId(id){return document.getElementById(id);}
function round2(n){return Math.round(n*100)/100;}
function rand(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=rand(0,i);[a[i],a[j]]=[a[j],a[i]];}return a;}
function saveStore(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(store));}catch{byId('homeSummary').textContent='Vistun er ekki í boði í þessum vafra. Þú getur samt æft.';}}
function sessionIdentity(s){return JSON.stringify([s.student,s.date,s.exercise,s.difficulty,s.questionCount,s.correct,s.wrong,s.cpm]);}
function loadStore(){
  const old = readJson(STORAGE_KEY) || {};
  const data = {students:Array.isArray(old.students)?old.students.filter(x=>typeof x==='string'):[],sessions:Array.isArray(old.sessions)?old.sessions:[],goals:Object.assign(Object.create(null),old.goals&&typeof old.goals==='object'?old.goals:{}),importedLegacy:Array.isArray(old.importedLegacy)?old.importedLegacy:[]};
  const seen = new Set(data.sessions.map(sessionIdentity));
  for(const key of ['grunnstaerdfraedi_data_v1','leikskola_math_pwa_v1']){
    if(data.importedLegacy.includes(key)) continue;
    const legacy = readJson(key);
    if(!legacy || typeof legacy!=='object') continue;
    const names = Array.isArray(legacy.students)?legacy.students:Object.keys(legacy.students||{});
    names.filter(n=>typeof n==='string').forEach(n=>{if(!data.students.includes(n)) data.students.push(n);});
    for(const item of Array.isArray(legacy.sessions)?legacy.sessions:[]){
      const exercise = MODE_MAP[item.mode] || (EXERCISES[item.exercise]?item.exercise:null);
      const date = item.date || item.when;
      if(!exercise || typeof item.student!=='string' || !date) continue;
      const correct=Number(item.correct)||0,wrong=Number(item.wrong)||0;
      const s={date,student:item.student,exercise,difficulty:'legacy',questionCount:Number(item.total||item.questionCount)||correct,correct,wrong,accuracy:round2(correct/Math.max(1,correct+wrong)*100),cpm:Number(item.cpm)||0,bestStreak:Number(item.bestStreak)||0};
      const id=sessionIdentity(s);if(!seen.has(id)){data.sessions.push(s);seen.add(id);}
      if(!data.students.includes(s.student)) data.students.push(s.student);
    }
    data.importedLegacy.push(key);
  }
  data.students=[...new Set(data.students)].sort((a,b)=>a.localeCompare(b,'is'));
  data.sessions.sort((a,b)=>new Date(a.date)-new Date(b.date));
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));}catch{}
  return data;
}
function rememberPrefs(){try{localStorage.setItem('grunnstaerdfraedi_preferences',JSON.stringify({exercise:ui.exerciseSelect.value,difficulty:ui.difficultySelect.value,count:+ui.questionCountSelect.value,autoAdvance:ui.autoAdvance.checked}));}catch{}}

// Small vector illustrations remain crisp on classroom screens and work offline.
function svg(content,view='0 0 220 116',label=''){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" ${label?`role="img" aria-label="${escapeHtml(label)}"`:'aria-hidden="true"'}>${content}</svg>`;}
function shapeContent(type){
  if(type==='apple')return '<path d="M22 11c-8-7-18-1-16 9 1 7 5 14 10 14 3 0 3-2 6-2s3 2 6 2c5 0 9-7 10-14 2-10-8-16-16-9Z" fill="#d45c56"/><path d="M22 12c-2-5-1-8 1-10" fill="none" stroke="#765b44" stroke-width="3" stroke-linecap="round"/><path d="M24 7c0-6 7-7 10-5-1 5-5 7-10 5Z" fill="#57866b"/>';
  if(type==='star')return '<path d="m22 3 5.8 11.8 13 1.9-9.4 9.1 2.2 12.9L22 32.6l-11.6 6.1 2.2-12.9-9.4-9.1 13-1.9Z" fill="#d9a23a"/>';
  if(type==='triangle')return '<path d="m22 4 19 34H3Z" fill="#477d9a" stroke="#32637e" stroke-width="1.5" stroke-linejoin="round"/>';
  if(type==='square')return '<rect x="6" y="6" width="32" height="32" rx="6" fill="#719a78" stroke="#4f7b57" stroke-width="1.5"/>';
  return '<circle cx="22" cy="22" r="17" fill="#c46d90" stroke="#9c4e70" stroke-width="1.5"/>';
}
function shapeIcon(type,cls=''){return `<svg class="${cls}" viewBox="0 0 44 44" aria-hidden="true">${shapeContent(type)}</svg>`;}
function mini(type,x,y,size=32){return `<g transform="translate(${x} ${y}) scale(${size/44})">${shapeContent(type)}</g>`;}
function artText(text,x,y,size=25,color='#45416a'){return `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${size}" font-weight="700" fill="${color}">${text}</text>`;}
function artNumber(text,x,y,missing=false){return `<rect x="${x}" y="35" width="43" height="47" rx="10" fill="${missing?'#f8f6ff':'#fff'}" stroke="${missing?'#8c7db3':'#ffffff'}" ${missing?'stroke-dasharray="4 3"':''}/>${artText(text,x+21.5,66,25)}`;}
function exerciseArt(type){
 let s='';
 if(type==='count')s=[mini('apple',44,21,34),mini('apple',91,21,34),mini('apple',138,21,34),mini('apple',67,62,34),mini('apple',114,62,34)].join('');
 if(type==='match')s=artText('3',48,76,49)+artText('→',96,69,27)+mini('star',124,26,33)+mini('star',164,26,33)+mini('star',145,65,33);
 if(type==='next')s=artNumber('2',21)+artNumber('3',88)+artNumber('?',155,true)+artText('→',76,65,18)+artText('→',143,65,18);
 if(type==='previous')s=artNumber('?',21,true)+artNumber('4',88)+artNumber('5',155)+artText('→',76,65,18)+artText('→',143,65,18);
 if(type==='bigger')s=artText('3',58,41,25)+artText('6',162,41,25)+[0,1,2].map(i=>mini('circle',29+i*20,59,20)).join('')+[0,1,2,3,4,5].map(i=>mini('square',133+(i%3)*20,51+Math.floor(i/3)*23,20)).join('')+artText('<',110,76,28);
 if(type==='equal')s='<rect x="18" y="24" width="79" height="70" rx="13" fill="#fff"/><rect x="123" y="24" width="79" height="70" rx="13" fill="#fff"/>'+[0,1,2,3].map(i=>mini('apple',28+(i%2)*31,29+Math.floor(i/2)*30,28)+mini('star',133+(i%2)*31,29+Math.floor(i/2)*30,28)).join('')+artText('=',110,68,22);
 if(type==='pattern')s=mini('circle',19,43,32)+mini('triangle',60,43,32)+mini('circle',101,43,32)+mini('triangle',142,43,32)+artText('?',194,68,25);
 if(type==='mixed')s=mini('apple',28,28,40)+artText('2',110,61,34)+mini('triangle',153,26,40)+mini('star',66,72,29)+artText('+',136,94,27);
 return svg(s);
}
function objectsHtml(n,type='apple',small=false){
 if(n===0)return '<div class="zero-group" role="img" aria-label="Engir hlutir">∅</div>';
 return `<div class="object-group ${small?'small-group':''}" role="img" aria-label="${n} ${type==='apple'?'epli':'hlutir'}">${Array.from({length:n},()=>`<span class="object">${shapeIcon(type)}</span>`).join('')}</div>`;
}
function sequenceHtml(values){return `<div class="number-sequence">${values.map((v,i)=>`${i?'<span class="number-arrow" aria-hidden="true">→</span>':''}<span class="number-block ${v==='?'?'missing':''}">${v}</span>`).join('')}</div>`;}
function patternHtml(values){return `<div class="shape-pattern" role="img" aria-label="${escapeHtml(values.map(v=>SHAPE_NAMES[v]||v).join(', '))}">${values.map(v=>v==='?'?'<span class="number-block missing" aria-hidden="true">?</span>':shapeIcon(v)).join('')}</div>`;}
const SHAPE_NAMES={circle:'hringur',triangle:'þríhyrningur',square:'ferningur',star:'stjarna',apple:'epli'};

function renderCards(){
 ui.exerciseCards.innerHTML=Object.entries(EXERCISES).map(([key,label])=>`<button class="exercise-card" data-exercise="${key}" aria-pressed="${ui.exerciseSelect.value===key}" style="--tint:${META[key].color}"><span class="selection-check" aria-hidden="true">✓</span><span class="card-art">${exerciseArt(META[key].art)}</span><span class="card-title">${label}</span><span class="card-description">${META[key].hint}</span></button>`).join('');
 ui.exerciseCards.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
  ui.exerciseSelect.value=b.dataset.exercise;syncSelection();rememberPrefs();
  if(matchMedia('(max-width:640px)').matches)ui.startBtn.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'center'});
 }));syncSelection();
}
function syncSelection(){
 ui.exerciseCards.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.exercise===ui.exerciseSelect.value)));
 byId('selectedExerciseLabel').textContent=EXERCISES[ui.exerciseSelect.value];
 byId('difficultyButtons').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.level===ui.difficultySelect.value)));
}
function populateSelectors(){
 if(!ui.exerciseSelect.options.length)ui.exerciseSelect.innerHTML=Object.entries(EXERCISES).map(([key,label])=>`<option value="${key}">${label}</option>`).join('');
 const current=ui.studentSelect.value,last=readLastStudent();
 const teacherCurrent=ui.teacherStudentSelect.value;
 ui.studentSelect.innerHTML='<option value="">Æfa án nafns</option>';
 ui.teacherStudentSelect.innerHTML='<option value="">Velja nemanda</option>';
 for(const name of store.students){ui.studentSelect.add(new Option(name,name));ui.teacherStudentSelect.add(new Option(name,name));}
 ui.studentSelect.value=store.students.includes(current)?current:(store.students.includes(last)?last:'');
 ui.teacherStudentSelect.value=store.students.includes(teacherCurrent)?teacherCurrent:'';
}
function readLastStudent(){try{return localStorage.getItem(LAST_STUDENT_KEY)||'';}catch{return '';}}
function addStudent(){
 const name=ui.newStudentInput.value.trim().slice(0,60);if(!name){ui.newStudentInput.focus();return;}
 if(!store.students.includes(name)){store.students.push(name);store.students.sort((a,b)=>a.localeCompare(b,'is'));saveStore();}
 populateSelectors();ui.studentSelect.value=name;ui.newStudentInput.value='';
 try{localStorage.setItem(LAST_STUDENT_KEY,name);}catch{}renderHomeSummary();
}
function deleteStudent(){
 const name=ui.teacherStudentSelect.value;if(!name)return alert('Veldu nemanda á kennarasvæðinu fyrst.');
 if(!confirm(`Eyða nemanda „${name}“ og niðurstöðum hans úr þessu tæki?`))return;
 store.students=store.students.filter(s=>s!==name);store.sessions=store.sessions.filter(s=>s.student!==name);delete store.goals[name];saveStore();
 if(readLastStudent()===name){try{localStorage.removeItem(LAST_STUDENT_KEY);}catch{}}
 populateSelectors();renderTeacherArea();renderHomeSummary();
}
function renderHomeSummary(){
 const name=ui.studentSelect.value;if(!name){ui.homeSummary.textContent='Þú getur æft án nafns. Veldu nemanda til að vista niðurstöður á þessu tæki.';return;}
 const sessions=store.sessions.filter(s=>s.student===name);
 ui.homeSummary.textContent=`${name} · ${sessions.length} ${sessions.length===1?'lota':'lotur'}. Niðurstöður vistast á þessu tæki.`;
}
function optionsFor(correct,min,max,count){
 const nearby=[];for(let n=min;n<=max;n++)if(n!==correct)nearby.push(n);
 const wrong=shuffle(nearby).slice(0,count-1);return shuffle([correct,...wrong]);
}
function generateQuestionSet(exercise,difficulty,count){
 const out=[],seen=new Set();
 const modes=Object.keys(EXERCISES).filter(k=>k!=='mixed');
 for(let i=0;i<count;i++){
  const mode=exercise==='mixed'?modes[i%modes.length]:exercise;
  let q;for(let tries=0;tries<40;tries++){q=generateQuestion(mode,difficulty);if(!seen.has(q.key))break;}
  seen.add(q.key);out.push(q);
 }
 return exercise==='mixed'?shuffle(out):out;
}
function generateQuestion(exercise,difficulty){
 const cfg=DIFFICULTIES[difficulty],n=rand(cfg.min,cfg.max),choices=difficulty==='easy'?3:4;
 let q;
 if(exercise==='counting')q={prompt:'Teldu hlutina.',sub:'Hvað eru mörg epli?',visual:objectsHtml(n),options:optionsFor(n,cfg.min,cfg.max,choices),correct:n};
 if(exercise==='findCount'){
  q={prompt:'Finndu réttan fjölda.',sub:'Hvaða mynd passar við töluna?',visual:`<div class="target-number">${n}</div>`,options:optionsFor(n,cfg.min,cfg.max,3),correct:n,optionKind:'objects'};
 }
 if(exercise==='nextNumber'){
  const a=rand(cfg.min, cfg.max-1),correct=a+1;
  q={prompt:'Hvaða tala kemur næst?',sub:'Veldu töluna sem kemur á eftir.',visual:sequenceHtml([a,'?']),options:optionsFor(correct,cfg.min,cfg.max,choices),correct};
 }
 if(exercise==='previousNumber'){
  const a=rand(cfg.min+1,cfg.max),correct=a-1;
  q={prompt:'Hvaða tala var á undan?',sub:'Veldu töluna sem kemur á undan.',visual:sequenceHtml(['?',a]),options:optionsFor(correct,cfg.min,cfg.max,choices),correct};
 }
 if(exercise==='biggerNumber'){
  const a=n,b=optionsFor(a,cfg.min,cfg.max,2).find(v=>v!==a),values=shuffle([a,b]);
  q={prompt:'Hvor tala er stærri?',sub:'Veldu stærri töluna.',visual:`<div class="comparison">${values.map(v=>`<div class="group-box"><span class="group-number">${v}</span>${objectsHtml(v,'star',true)}</div>`).join('<span class="comparison-word">eða</span>')}</div>`,options:values,correct:Math.max(a,b)};
 }
 if(exercise==='sameAmount'){
  const a=n,b=Math.random()<.5?a:optionsFor(a,cfg.min,cfg.max,2).find(v=>v!==a);
  q={prompt:'Eru jafnmargir í hópunum?',sub:'Teldu og berðu saman.',visual:`<div class="comparison"><div class="group-box">${objectsHtml(a,'apple',true)}</div><div class="group-box">${objectsHtml(b,'star',true)}</div></div>`,options:['Já','Nei'],correct:a===b?'Já':'Nei'};
 }
 if(exercise==='pattern'){
  if(difficulty==='hard'){
   const step=rand(1,3),start=rand(10,30-step*3),seq=[start,start+step,start+step*2];
   const correct=start+step*3;q={prompt:'Hvað kemur næst í mynstrinu?',sub:'Skoðaðu hvernig tölurnar breytast.',visual:sequenceHtml([...seq,'?']),options:optionsFor(correct,10,30,4),correct};
  }else{
   const symbols=shuffle(['circle','triangle','square','star']);
   const unit=difficulty==='easy'?[symbols[0],symbols[1]]:Math.random()<.5?[symbols[0],symbols[0],symbols[1]]:[symbols[0],symbols[1],symbols[2]];
   const seq=[...unit,...unit],correct=unit[0];
   q={prompt:'Hvað kemur næst í mynstrinu?',sub:'Skoðaðu röðina og veldu næstu mynd.',visual:patternHtml([...seq,'?']),options:shuffle(symbols.slice(0,3).includes(correct)?symbols.slice(0,3):[correct,...symbols.filter(x=>x!==correct).slice(0,2)]),correct,optionKind:'shape'};
  }
 }
 q.exercise=exercise;q.key=JSON.stringify([exercise,q.visual,q.correct]);return q;
}
function startGame(){
 clearTimeout(nextTimer);rememberPrefs();
 const exercise=ui.exerciseSelect.value,difficulty=ui.difficultySelect.value,questionCount=+ui.questionCountSelect.value;
 const questions=generateQuestionSet(exercise,difficulty,questionCount),student=ui.studentSelect.value;
 gameState={student,exercise,difficulty,questionCount:questions.length,questions,index:0,correct:0,wrong:0,firstTry:0,streak:0,bestStreak:0,startedAt:Date.now(),active:true,locked:false,attempted:false};
 ui.gameStudent.textContent=student||'Æfum saman';ui.gameMeta.textContent=`${EXERCISES[exercise]} · ${DIFFICULTIES[difficulty].label}`;
 showScreen('game');renderQuestion();
}
function renderQuestion(){
 const s=gameState,q=s.questions[s.index];s.locked=false;s.attempted=false;
 ui.progressText.textContent=`${s.index+1} / ${s.questionCount}`;
 const track=document.querySelector('.progress-track');track.setAttribute('aria-valuemax',String(s.questionCount));track.setAttribute('aria-valuenow',String(s.index));
 byId('progressFill').style.width=`${s.index/s.questionCount*100}%`;
 ui.questionArea.innerHTML=`<h1 class="question-title">${q.prompt}</h1><p class="question-sub">${q.sub}</p>${q.visual}`;
 ui.feedback.textContent='';ui.feedback.className='feedback';ui.nextBtn.classList.add('hidden');
 ui.answers.className=`answers-grid ${q.options.length===2?'two-options':''} ${q.optionKind==='objects'?'object-options':''}`;
 ui.answers.style.gridTemplateColumns=q.options.length===4?'repeat(4,minmax(0,1fr))':'';
 ui.answers.innerHTML=q.options.map((opt,i)=>{
  const label=q.optionKind==='objects'?`${opt} epli`:q.optionKind==='shape'?SHAPE_NAMES[opt]:String(opt);
  const html=q.optionKind==='objects'?objectsHtml(opt,'apple',true):q.optionKind==='shape'?shapeIcon(opt,'shape-icon'):opt==='Já'?'<span class="answer-symbol" aria-hidden="true">✓</span>Já':opt==='Nei'?'<span class="answer-symbol" aria-hidden="true">✕</span>Nei':opt;
  return `<button class="answer-btn" data-option="${i}" aria-label="${escapeHtml(label)}">${html}</button>`;
 }).join('');
 ui.answers.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>submitAnswer(q.options[+b.dataset.option],b)));
 ui.questionArea.focus({preventScroll:true});
}
function submitAnswer(selected,button){
 const s=gameState;if(!s?.active||s.locked||!byId('screen-game').classList.contains('active')||button.disabled)return;
 const q=s.questions[s.index];
 if(selected===q.correct){
  s.locked=true;s.correct++;if(!s.attempted){s.firstTry++;s.streak++;}s.bestStreak=Math.max(s.bestStreak,s.streak);
  button.classList.add('correct');button.insertAdjacentHTML('beforeend','<span class="answer-feedback-icon" aria-hidden="true">✓</span>');
  ui.answers.querySelectorAll('button').forEach(b=>b.disabled=true);
  ui.feedback.textContent='✓ Rétt! Vel gert.';ui.feedback.className='feedback good';
  ui.nextBtn.textContent=s.index===s.questionCount-1?'Sjá niðurstöður →':'Næsta dæmi →';ui.nextBtn.classList.remove('hidden');
  if(ui.autoAdvance.checked)nextTimer=setTimeout(()=>{if(gameState===s&&s.active&&s.locked)nextQuestion();},1400);
  else ui.nextBtn.focus({preventScroll:true});
 }else{
  s.wrong++;s.attempted=true;s.streak=0;button.classList.add('wrong');button.disabled=true;
  button.insertAdjacentHTML('beforeend','<span class="answer-feedback-icon" aria-hidden="true">↻</span>');
  ui.feedback.textContent='↻ Reyndu aftur. Skoðaðu myndina vel.';ui.feedback.className='feedback bad';
  const next=Array.from(ui.answers.querySelectorAll('button')).find(b=>!b.disabled);next?.focus({preventScroll:true});
 }
 ui.scoreText.textContent=`Kláruð: ${s.correct} | Tilraunir aftur: ${s.wrong}`;
}
function nextQuestion(){
 const s=gameState;if(!s?.active||!s.locked)return;clearTimeout(nextTimer);s.locked=false;s.index++;
 if(s.index>=s.questions.length)finishGame();else renderQuestion();
}
function finishGame(){
 const s=gameState;s.active=false;clearTimeout(nextTimer);
 const elapsed=(Date.now()-s.startedAt)/1000;
 const session={date:new Date().toISOString(),student:s.student,exercise:s.exercise,difficulty:s.difficulty,questionCount:s.questionCount,correct:s.correct,wrong:s.wrong,firstTry:s.firstTry,accuracy:round2(s.firstTry/s.questionCount*100),cpm:round2(s.correct/Math.max(elapsed/60,1/60)),bestStreak:s.bestStreak,durationSeconds:round2(elapsed),schemaVersion:4};
 if(s.student){store.sessions.push(session);saveStore();}
 ui.resultsBox.innerHTML=`<div class="result-metrics"><div class="result-metric"><strong>${s.correct}</strong><span>Dæmi kláruð</span></div><div class="result-metric"><strong>${s.firstTry}</strong><span>Rétt í fyrstu tilraun</span></div><div class="result-metric"><strong>${s.bestStreak}</strong><span>Rétt í röð</span></div></div><p class="result-note">${s.student?'Niðurstöður hafa verið vistaðar á þessu tæki.':'Þú æfðir án nafns. Veldu nemanda á aðalsíðunni til að vista niðurstöður.'}</p>`;
 showScreen('results');
}
function confirmQuit(){
 if(!gameState?.active){showScreen('home');return;}
 if(confirm('Fara á aðalsíðu? Þessi lota hefur ekki verið vistuð.')){gameState.active=false;clearTimeout(nextTimer);showScreen('home');}
}
function showScreen(name){
 document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));
 const screen=byId(`screen-${name}`);screen.classList.add('active');screen.focus({preventScroll:true});
 ui.teacherBtn.disabled=name==='game';
 if(name==='home')renderHomeSummary();if(name==='teacher')renderTeacherArea();
 window.scrollTo({top:0,behavior:'instant'});
}

function cacheUi(){
 ['installBtn','studentSelect','deleteStudentBtn','newStudentInput','addStudentBtn','exerciseSelect','difficultySelect','questionCountSelect','autoAdvance','exerciseCards','startBtn','teacherBtn','homeSummary','gameStudent','gameMeta','progressText','scoreText','questionArea','feedback','answers','quitBtn','nextBtn','resultsBox','playAgainBtn','homeBtn','teacherModal','teacherPasswordInput','teacherLoginBtn','teacherCancelBtn','teacherLoginMsg','teacherHomeBtn','exportExcelBtn','exportPdfBtn','teacherSummary','progressChart','teacherStudentSelect','studentStats','goalCpmInput','goalAccInput','saveGoalsBtn','goalMsg'].forEach(id=>ui[id]=byId(id));
 ui.sessionsTableBody=document.querySelector('#sessionsTable tbody');
}
function closeTeacherModal(){ui.teacherModal.classList.add('hidden');ui.teacherBtn.focus();}
function bindEvents(){
 ui.addStudentBtn.onclick=addStudent;ui.newStudentInput.onkeydown=e=>{if(e.key==='Enter')addStudent();};
 ui.studentSelect.onchange=()=>{try{localStorage.setItem(LAST_STUDENT_KEY,ui.studentSelect.value);}catch{}renderHomeSummary();};
 ui.deleteStudentBtn.onclick=deleteStudent;ui.startBtn.onclick=startGame;ui.quitBtn.onclick=confirmQuit;ui.nextBtn.onclick=nextQuestion;
 ui.playAgainBtn.onclick=startGame;ui.homeBtn.onclick=()=>showScreen('home');ui.teacherHomeBtn.onclick=()=>showScreen('home');
 ui.teacherBtn.onclick=()=>{
  if(gameState?.active)return;
  ui.teacherModal.classList.remove('hidden');ui.teacherPasswordInput.value='';ui.teacherLoginMsg.textContent='';ui.teacherPasswordInput.focus();
 };
 ui.teacherCancelBtn.onclick=closeTeacherModal;ui.teacherLoginBtn.onclick=teacherLogin;
 ui.teacherPasswordInput.onkeydown=e=>{if(e.key==='Enter')teacherLogin();};
 ui.teacherModal.addEventListener('keydown',e=>{
  if(e.key==='Escape')closeTeacherModal();
  if(e.key==='Tab'){
   const nodes=ui.teacherModal.querySelectorAll('input,button');const first=nodes[0],last=nodes[nodes.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
 });
 ui.teacherStudentSelect.onchange=renderSelectedStudentStats;ui.saveGoalsBtn.onclick=saveGoals;
 ui.exportExcelBtn.onclick=exportExcel;ui.exportPdfBtn.onclick=exportPdf;
 byId('difficultyButtons').querySelectorAll('button').forEach(b=>b.onclick=()=>{ui.difficultySelect.value=b.dataset.level;syncSelection();rememberPrefs();});
 ui.questionCountSelect.onchange=rememberPrefs;ui.autoAdvance.onchange=rememberPrefs;
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;ui.installBtn.classList.remove('hidden');});
 ui.installBtn.onclick=async()=>{if(!deferredPrompt)return;await deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;ui.installBtn.classList.add('hidden');};
}
document.addEventListener('DOMContentLoaded',()=>{
 cacheUi();bindEvents();populateSelectors();
 ui.exerciseSelect.value=EXERCISES[prefs.exercise]?prefs.exercise:'counting';
 ui.difficultySelect.value=['easy','medium','hard'].includes(prefs.difficulty)?prefs.difficulty:'easy';
 ui.questionCountSelect.value=[5,10,15,20].includes(prefs.count)?String(prefs.count):'10';ui.autoAdvance.checked=!!prefs.autoAdvance;
 renderCards();showScreen('home');registerSW();
});

function bestFor(student, exercise, difficulty, beforeDate) {
  let items = store.sessions.filter(s => s.student===student && s.exercise===exercise && s.difficulty===difficulty);
  if (beforeDate) items = items.filter(s => s.date < beforeDate);
  if (!items.length) return { cpm: 0 };
  return items.reduce((best, s) => s.cpm > best.cpm ? s : best, items[0]);
}

function teacherLogin() {
  if (ui.teacherPasswordInput.value === TEACHER_PASSWORD) {
    ui.teacherModal.classList.add("hidden");
    showScreen("teacher");
  } else {
    ui.teacherLoginMsg.textContent = "Rangt lykilorð.";
    ui.teacherLoginMsg.className = "feedback bad";
  }
}

function renderTeacherArea() {
  populateSelectors();
  const students = store.students;
  const total = store.sessions.length;
  const totalCorrect = store.sessions.reduce((a,s)=>a+s.correct,0);
  const totalWrong = store.sessions.reduce((a,s)=>a+s.wrong,0);
  const bestCpm = total ? Math.max(...store.sessions.map(s=>s.cpm)) : 0;
  ui.teacherSummary.innerHTML = `
    <p><strong>Nemendur:</strong> ${students.length}</p>
    <p><strong>Lotur alls:</strong> ${total}</p>
    <p><strong>Rétt alls:</strong> ${totalCorrect}</p>
    <p><strong>Rangt alls:</strong> ${totalWrong}</p>
    <p><strong>Besta rétt/mín:</strong> ${round2(bestCpm)}</p>
  `;
  renderSessionsTable();
  renderChart();
  renderSelectedStudentStats();
}

function renderSessionsTable() {
  const rows = store.sessions.slice().reverse().map(s => `
    <tr>
      <td>${new Date(s.date).toLocaleString("is-IS")}</td>
      <td>${escapeHtml(s.student)}</td>
      <td>${EXERCISES[s.exercise] || "Eldri æfing"}</td>
      <td>${(DIFFICULTIES[s.difficulty] || DIFFICULTIES.legacy).label}</td>
      <td>${s.questionCount}</td>
      <td>${s.correct}</td>
      <td>${s.wrong}</td>
      <td>${s.accuracy}%${s.schemaVersion === 4 ? "" : " (eldri)"}</td>
      <td>${s.cpm}</td>
    </tr>`).join("");
  ui.sessionsTableBody.innerHTML = rows || `<tr><td colspan="9">Engin gögn ennþá.</td></tr>`;
}

function renderChart() {
  const canvas = ui.progressChart;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle = "#dbe7ff";
  ctx.strokeRect(0,0,canvas.width,canvas.height);

  const data = store.students.map(name => {
    const sessions = store.sessions.filter(s => s.student===name);
    const avg = sessions.length ? sessions.reduce((a,s)=>a+s.cpm,0)/sessions.length : 0;
    return { name, value: avg };
  });
  const max = Math.max(5, ...data.map(d=>d.value), 1);
  const slot = data.length ? (canvas.width - 60) / data.length : 60;
  const barW = Math.max(1, Math.min(90, slot - 8));
  data.forEach((d, i) => {
    const x = 30 + i * slot + Math.max(0, (slot - barW)/2);
    const h = (d.value / max) * (canvas.height - 60);
    const y = canvas.height - 30 - h;
    ctx.fillStyle = "#2563eb";
    ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = "#122033";
    ctx.font = "12px Arial";
    ctx.fillText(d.value.toFixed(1), x, Math.max(12, y - 6));
    const label = d.name.length > 10 ? d.name.slice(0,10) + "…" : d.name;
    ctx.save();
    ctx.translate(x + barW/2, canvas.height - 10);
    ctx.rotate(-0.3);
    ctx.fillText(label, -20, 0);
    ctx.restore();
  });
  if (!data.length) {
    ctx.fillStyle = "#557";
    ctx.font = "16px Arial";
    ctx.fillText("Engin gögn til að sýna ennþá.", 20, 40);
  }
}

function renderSelectedStudentStats() {
  const name = ui.teacherStudentSelect.value || ui.studentSelect.value || "";
  if (!name) {
    ui.studentStats.innerHTML = "<p>Veldu nemanda.</p>";
    return;
  }
  const sessions = store.sessions.filter(s => s.student === name);
  const goals = store.goals[name] || {};
  if (!sessions.length) {
    ui.studentStats.innerHTML = `<p><strong>${escapeHtml(name)}</strong></p><p>Engar lotur ennþá.</p>`;
    ui.goalCpmInput.value = goals.cpm || "";
    ui.goalAccInput.value = goals.accuracy || "";
    return;
  }
  const avgCpm = sessions.reduce((a,s)=>a+s.cpm,0)/sessions.length;
  const avgAcc = sessions.reduce((a,s)=>a+s.accuracy,0)/sessions.length;
  const best = Math.max(...sessions.map(s=>s.cpm));
  ui.studentStats.innerHTML = `
    <p><strong>${escapeHtml(name)}</strong></p>
    <p><strong>Lotur:</strong> ${sessions.length}</p>
    <p><strong>Meðal rétt/mín:</strong> ${round2(avgCpm)}</p>
    <p><strong>Meðal nákvæmni:</strong> ${round2(avgAcc)}%</p>
    <p><strong>Besta rétt/mín:</strong> ${round2(best)}</p>`;
  ui.goalCpmInput.value = goals.cpm || "";
  ui.goalAccInput.value = goals.accuracy || "";
}

function saveGoals() {
  const name = ui.teacherStudentSelect.value || ui.studentSelect.value;
  if (!name) return;
  store.goals[name] = {
    cpm: ui.goalCpmInput.value ? Math.max(0, Number(ui.goalCpmInput.value)) : "",
    accuracy: ui.goalAccInput.value ? Math.min(100, Math.max(0, Number(ui.goalAccInput.value))) : ""
  };
  saveStore();
  ui.goalMsg.textContent = "Markmið vistuð.";
  ui.goalMsg.className = "feedback good";
  renderHomeSummary();
  renderSelectedStudentStats();
}

function exportExcel() {
  const rows = [["Dagsetning","Nemandi","Æfing","Erfiðleiki","Dæmi","Rétt","Rangt","Nákvæmni","Rétt á mínútu"]];
  store.sessions.forEach(s => rows.push([
    new Date(s.date).toLocaleString("is-IS"), s.student, EXERCISES[s.exercise] || "Eldri æfing", (DIFFICULTIES[s.difficulty] || DIFFICULTIES.legacy).label,
    s.questionCount, s.correct, s.wrong, s.accuracy, s.cpm
  ]));
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><table border="1">${rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(String(c))}</td>`).join("")}</tr>`).join("")}</table></body></html>`;
  downloadBlob(new Blob([html], {type:"application/vnd.ms-excel"}), "grunnstaerdfraedi_nidurstodur.xls");
}

function exportPdf() {
  const w = window.open("", "_blank");
  if (!w) return alert("Leyfðu sprettiglugga til að opna prentskýrsluna.");
  const tableHtml = document.querySelector("#sessionsTable").outerHTML;
  const summary = ui.teacherSummary.innerHTML;
  w.document.write(`<!DOCTYPE html><html lang="is"><head><meta charset="UTF-8"><title>Grunnstærðfræði skýrsla</title><style>body{font-family:Arial;padding:20px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ccc;padding:8px;text-align:left} h1,h2{margin:0 0 12px}</style></head><body><h1>Grunnstærðfræði - skýrsla</h1><h2>Yfirlit</h2>${summary}<h2>Lotur</h2>${tableHtml}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}


function downloadBlob(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function registerSW(){if('serviceWorker' in navigator){try{const registration=await navigator.serviceWorker.register('sw.js',{updateViaCache:'none'});await registration.update();}catch{}}}

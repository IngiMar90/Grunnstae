const TEACHER_PASSWORD = "11112222";
const STORAGE_KEY = "grunnstaerdfraedi_v3_store";
const LAST_STUDENT_KEY = "grunnstaerdfraedi_v3_last_student";

const EXERCISES = {
  counting: "Talning",
  findCount: "Finna réttan fjölda",
  nextNumber: "Hvaða tala kemur næst?",
  previousNumber: "Hvaða tala var á undan?",
  biggerNumber: "Hvor tala er stærri?",
  sameAmount: "Jafnmargir?",
  pattern: "Mynstur"
};

const DIFFICULTIES = {
  easy: { label: "Auðvelt", min: 1, max: 5 },
  medium: { label: "Miðlungs", min: 1, max: 10 },
  hard: { label: "Erfitt", min: 10, max: 30 }
};

const ui = {};
let deferredPrompt = null;
let store = loadStore();

let gameState = {
  student: null, exercise: null, difficulty: null, questionCount: 10,
  questions: [], index: 0, correct: 0, wrong: 0, streak: 0, bestStreak: 0, startedAt: 0
};

document.addEventListener("DOMContentLoaded", () => {
  cacheUi();
  bindEvents();
  populateSelectors();
  renderHomeSummary();
  showScreen("home");
  registerSW();
});

function cacheUi() {
  ui.installBtn = byId("installBtn");
  ui.studentSelect = byId("studentSelect");
  ui.deleteStudentBtn = byId("deleteStudentBtn");
  ui.newStudentInput = byId("newStudentInput");
  ui.addStudentBtn = byId("addStudentBtn");
  ui.exerciseSelect = byId("exerciseSelect");
  ui.difficultySelect = byId("difficultySelect");
  ui.questionCountSelect = byId("questionCountSelect");
  ui.startBtn = byId("startBtn");
  ui.teacherBtn = byId("teacherBtn");
  ui.homeSummary = byId("homeSummary");
  ui.gameStudent = byId("gameStudent");
  ui.gameMeta = byId("gameMeta");
  ui.progressText = byId("progressText");
  ui.scoreText = byId("scoreText");
  ui.questionArea = byId("questionArea");
  ui.feedback = byId("feedback");
  ui.answers = byId("answers");
  ui.quitBtn = byId("quitBtn");
  ui.resultsBox = byId("resultsBox");
  ui.playAgainBtn = byId("playAgainBtn");
  ui.homeBtn = byId("homeBtn");
  ui.teacherModal = byId("teacherModal");
  ui.teacherPasswordInput = byId("teacherPasswordInput");
  ui.teacherLoginBtn = byId("teacherLoginBtn");
  ui.teacherCancelBtn = byId("teacherCancelBtn");
  ui.teacherLoginMsg = byId("teacherLoginMsg");
  ui.teacherHomeBtn = byId("teacherHomeBtn");
  ui.exportExcelBtn = byId("exportExcelBtn");
  ui.exportPdfBtn = byId("exportPdfBtn");
  ui.teacherSummary = byId("teacherSummary");
  ui.progressChart = byId("progressChart");
  ui.teacherStudentSelect = byId("teacherStudentSelect");
  ui.studentStats = byId("studentStats");
  ui.goalCpmInput = byId("goalCpmInput");
  ui.goalAccInput = byId("goalAccInput");
  ui.saveGoalsBtn = byId("saveGoalsBtn");
  ui.goalMsg = byId("goalMsg");
  ui.sessionsTableBody = document.querySelector("#sessionsTable tbody");
}

function bindEvents() {
  ui.addStudentBtn.addEventListener("click", addStudent);
  ui.newStudentInput.addEventListener("keydown", e => { if (e.key === "Enter") addStudent(); });
  ui.studentSelect.addEventListener("change", () => {
    localStorage.setItem(LAST_STUDENT_KEY, ui.studentSelect.value);
    renderHomeSummary();
  });
  ui.deleteStudentBtn.addEventListener("click", deleteStudent);
  ui.startBtn.addEventListener("click", startGame);
  ui.teacherBtn.addEventListener("click", () => {
    ui.teacherModal.classList.remove("hidden");
    ui.teacherPasswordInput.value = "";
    ui.teacherLoginMsg.textContent = "";
    setTimeout(() => ui.teacherPasswordInput.focus(), 50);
  });
  ui.teacherCancelBtn.addEventListener("click", () => ui.teacherModal.classList.add("hidden"));
  ui.teacherLoginBtn.addEventListener("click", teacherLogin);
  ui.teacherPasswordInput.addEventListener("keydown", e => { if (e.key === "Enter") teacherLogin(); });
  ui.quitBtn.addEventListener("click", confirmQuit);
  ui.playAgainBtn.addEventListener("click", () => showScreen("home"));
  ui.homeBtn.addEventListener("click", () => showScreen("home"));
  ui.teacherHomeBtn.addEventListener("click", () => showScreen("home"));
  ui.teacherStudentSelect.addEventListener("change", renderSelectedStudentStats);
  ui.saveGoalsBtn.addEventListener("click", saveGoals);
  ui.exportExcelBtn.addEventListener("click", exportExcel);
  ui.exportPdfBtn.addEventListener("click", exportPdf);

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    ui.installBtn.classList.remove("hidden");
  });
  ui.installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    ui.installBtn.classList.add("hidden");
  });
}

function populateSelectors() {
  ui.exerciseSelect.innerHTML = Object.entries(EXERCISES).map(([v,l]) => `<option value="${v}">${l}</option>`).join("");
  ui.studentSelect.innerHTML = "";
  ui.teacherStudentSelect.innerHTML = `<option value="">Velja nemanda</option>`;
  store.students.forEach(name => {
    ui.studentSelect.add(new Option(name, name));
    ui.teacherStudentSelect.add(new Option(name, name));
  });
  const last = localStorage.getItem(LAST_STUDENT_KEY);
  if (store.students.length) {
    ui.studentSelect.value = store.students.includes(last) ? last : store.students[0];
    localStorage.setItem(LAST_STUDENT_KEY, ui.studentSelect.value);
  } else {
    ui.studentSelect.innerHTML = `<option value="">Enginn nemandi</option>`;
  }
}

function addStudent() {
  const name = ui.newStudentInput.value.trim();
  if (!name) return;
  if (!store.students.includes(name)) {
    store.students.push(name);
    store.students.sort((a,b) => a.localeCompare(b, "is"));
    saveStore();
  }
  ui.newStudentInput.value = "";
  populateSelectors();
  ui.studentSelect.value = name;
  localStorage.setItem(LAST_STUDENT_KEY, name);
  renderHomeSummary();
}

function deleteStudent() {
  const name = ui.studentSelect.value;
  if (!name) return;
  if (!confirm(`Eyða nemanda "${name}" og tengdum gögnum?`)) return;
  store.students = store.students.filter(s => s !== name);
  store.sessions = store.sessions.filter(s => s.student !== name);
  delete store.goals[name];
  saveStore();
  populateSelectors();
  renderHomeSummary();
}

function startGame() {
  const student = ui.studentSelect.value;
  if (!student) return alert("Veldu eða búðu til nemanda fyrst.");
  const exercise = ui.exerciseSelect.value;
  const difficulty = ui.difficultySelect.value;
  const questionCount = parseInt(ui.questionCountSelect.value, 10);
  const questions = generateQuestionSet(exercise, difficulty, questionCount);
  gameState = { student, exercise, difficulty, questionCount, questions, index:0, correct:0, wrong:0, streak:0, bestStreak:0, startedAt:Date.now() };
  ui.gameStudent.textContent = student;
  ui.gameMeta.textContent = `${EXERCISES[exercise]} • ${DIFFICULTIES[difficulty].label}`;
  showScreen("game");
  renderQuestion();
}

function generateQuestionSet(exercise, difficulty, count) {
  const map = new Map();
  let guard = 0;
  while (map.size < count && guard < 3000) {
    const q = generateQuestion(exercise, difficulty);
    map.set(q.key, q);
    guard++;
  }
  return Array.from(map.values()).slice(0, count);
}

function generateQuestion(exercise, difficulty) {
  const cfg = DIFFICULTIES[difficulty];
  if (exercise === "counting") return genCounting(cfg, difficulty);
  if (exercise === "findCount") return genFindCount(cfg, difficulty);
  if (exercise === "nextNumber") return genNext(cfg, difficulty);
  if (exercise === "previousNumber") return genPrevious(cfg, difficulty);
  if (exercise === "biggerNumber") return genBigger(cfg, difficulty);
  if (exercise === "sameAmount") return genSameAmount(cfg, difficulty);
  return genPattern(cfg, difficulty);
}

function rand(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffle(arr){
  const a = arr.slice();
  for (let i = a.length -1; i>0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function uniqueOptions(correct, makeWrong, count=4){
  const set = new Set([correct]);
  while (set.size < count) set.add(makeWrong());
  return shuffle(Array.from(set));
}
function objectsHtml(n) {
  return `<div class="visual-row">${Array.from({length:n},()=>`<div class="obj">🍎</div>`).join("")}</div>`;
}
function boxesHtml(n) {
  return `<div class="visual-row">${Array.from({length:n},()=>`<div class="obj">●</div>`).join("")}</div>`;
}

function genCounting(cfg, difficulty){
  const n = rand(cfg.min, cfg.max);
  const options = uniqueOptions(n, ()=> Math.max(0, Math.min(DIFFICULTIES[difficulty].max, n + rand(-3,3))), 4);
  return { key:`count-${difficulty}-${n}`, prompt:"Teldu hlutina.", sub:"Hvað eru mörg epli?", visual:objectsHtml(n), options, correct:n };
}
function genFindCount(cfg, difficulty){
  const n = rand(cfg.min, cfg.max);
  const options = uniqueOptions(n, ()=> Math.max(cfg.min, Math.min(cfg.max, n + rand(-3,3))), 4);
  return { key:`find-${difficulty}-${n}`, prompt:"Finndu töluna sem passar við myndina.", sub:"Veldu réttan fjölda.", visual:boxesHtml(n), options, correct:n };
}
function genNext(cfg, difficulty){
  const maxStart = Math.max(cfg.min, cfg.max - 3);
  const n = rand(cfg.min, maxStart);
  const correct = n + 1;
  const options = uniqueOptions(correct, ()=> Math.max(cfg.min, Math.min(cfg.max+2, correct + rand(-3,3))), 4);
  return { key:`next-${difficulty}-${n}`, prompt:"Hvaða tala kemur næst?", sub:`${n}, ?`, visual:"", options, correct };
}
function genPrevious(cfg, difficulty){
  const startMin = Math.max(2, cfg.min + 1);
  const n = rand(startMin, cfg.max);
  const correct = n - 1;
  const options = uniqueOptions(correct, ()=> Math.max(1, Math.min(cfg.max, correct + rand(-3,3))), 4);
  return { key:`prev-${difficulty}-${n}`, prompt:"Hvaða tala var á undan?", sub:`?, ${n}`, visual:"", options, correct };
}
function genBigger(cfg, difficulty){
  let a = rand(cfg.min, cfg.max), b = rand(cfg.min, cfg.max);
  while (a === b) b = rand(cfg.min, cfg.max);
  let options;
  if (difficulty === "easy") options = [Math.max(a,b), Math.min(a,b)];
  else if (difficulty === "medium") options = shuffle([Math.max(a,b), Math.min(a,b), "Jafnar"]);
  else options = shuffle([Math.max(a,b), Math.min(a,b), "Jafnar", "Ekki hægt að vita"]);
  return { key:`bigger-${difficulty}-${a}-${b}`, prompt:"Hvor tala er stærri?", sub:`${a} eða ${b}`, visual:"", options, correct:Math.max(a,b) };
}
function genSameAmount(cfg, difficulty){
  const a = rand(cfg.min, cfg.max);
  let b = a;
  const shouldMatch = Math.random() < (difficulty === "easy" ? 0.6 : 0.5);
  if (!shouldMatch) { while (b === a) b = rand(cfg.min, cfg.max); }
  return { key:`same-${difficulty}-${a}-${b}`, prompt:"Eru jafn margir hlutir í báðum hópum?", sub:"", visual:`${objectsHtml(a)}${boxesHtml(b)}`, options:["Já","Nei"], correct: a===b ? "Já" : "Nei" };
}
function genPattern(cfg, difficulty){
  let arr, correct;
  if (difficulty === "easy") {
    const start = rand(1,4); arr = [start,start+1,start+2]; correct = start+3;
  } else if (difficulty === "medium") {
    const step = Math.random() < 0.5 ? 2 : 1; const start = rand(1,6); arr=[start,start+step,start+step*2]; correct=start+step*3;
  } else {
    const type = rand(1,3);
    if (type===1){ const start = rand(10,20); arr=[start,start+2,start+4,start+6]; correct=start+8; }
    else if (type===2){ const start = rand(10,20); arr=[start,start+1,start+3,start+4]; correct=start+6; }
    else { const a = rand(10,15), b=a+2; arr=[a,b,a,b]; correct=a; }
  }
  const options = uniqueOptions(correct, ()=> correct + rand(-4,4), 4);
  return { key:`pattern-${difficulty}-${arr.join("-")}`, prompt:"Hvað kemur næst í mynstrinu?", sub:`${arr.join(", ")}, ?`, visual:"", options, correct };
}

function renderQuestion() {
  const q = gameState.questions[gameState.index];
  ui.progressText.textContent = `${gameState.index + 1} / ${gameState.questionCount}`;
  ui.scoreText.textContent = `Rétt: ${gameState.correct} | Rangt: ${gameState.wrong}`;
  ui.questionArea.innerHTML = `<div class="question-title">${q.prompt}</div><div class="question-sub">${q.sub || ""}</div>${q.visual || ""}`;
  ui.answers.innerHTML = "";
  ui.feedback.textContent = "";
  ui.feedback.className = "feedback";
  q.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.textContent = opt;
    btn.addEventListener("click", () => submitAnswer(opt));
    ui.answers.appendChild(btn);
  });
}

function submitAnswer(selected) {
  const q = gameState.questions[gameState.index];
  if (String(selected) === String(q.correct)) {
    gameState.correct++;
    gameState.streak++;
    if (gameState.streak > gameState.bestStreak) gameState.bestStreak = gameState.streak;
    ui.feedback.textContent = "Rétt!";
    ui.feedback.className = "feedback good";
    ui.answers.querySelectorAll("button").forEach(b => b.disabled = true);
    setTimeout(nextQuestion, 450);
  } else {
    gameState.wrong++;
    gameState.streak = 0;
    ui.feedback.textContent = "Rangt, reyndu aftur.";
    ui.feedback.className = "feedback bad";
  }
  ui.scoreText.textContent = `Rétt: ${gameState.correct} | Rangt: ${gameState.wrong}`;
}

function nextQuestion() {
  gameState.index++;
  if (gameState.index >= gameState.questions.length) finishGame();
  else renderQuestion();
}

function finishGame() {
  const elapsedMin = Math.max((Date.now() - gameState.startedAt) / 60000, 1/60);
  const cpm = gameState.correct / elapsedMin;
  const accuracy = gameState.correct + gameState.wrong > 0 ? (gameState.correct / (gameState.correct + gameState.wrong)) * 100 : 0;
  const session = {
    date: new Date().toISOString(),
    student: gameState.student,
    exercise: gameState.exercise,
    difficulty: gameState.difficulty,
    questionCount: gameState.questionCount,
    correct: gameState.correct,
    wrong: gameState.wrong,
    accuracy: round2(accuracy),
    cpm: round2(cpm),
    bestStreak: gameState.bestStreak,
    durationSeconds: round2((Date.now() - gameState.startedAt) / 1000)
  };
  store.sessions.push(session);
  saveStore();
  const prior = bestFor(gameState.student, gameState.exercise, gameState.difficulty, session.date);
  const newBest = session.cpm > prior.cpm;
  ui.resultsBox.innerHTML = `
    <p><strong>Nemandi:</strong> ${escapeHtml(session.student)}</p>
    <p><strong>Æfing:</strong> ${EXERCISES[session.exercise]}</p>
    <p><strong>Erfiðleiki:</strong> ${DIFFICULTIES[session.difficulty].label}</p>
    <p><strong>Rétt:</strong> ${session.correct}</p>
    <p><strong>Rangt:</strong> ${session.wrong}</p>
    <p><strong>Nákvæmni:</strong> ${session.accuracy}%</p>
    <p><strong>Rétt á mínútu:</strong> ${session.cpm}</p>
    <p><strong>Besta röð:</strong> ${session.bestStreak}</p>
    <p><strong>${newBest ? "Nýtt met!" : "Best áður:"}</strong> ${round2(prior.cpm)}</p>
  `;
  renderHomeSummary();
  showScreen("results");
}

function bestFor(student, exercise, difficulty, beforeDate) {
  let items = store.sessions.filter(s => s.student===student && s.exercise===exercise && s.difficulty===difficulty);
  if (beforeDate) items = items.filter(s => s.date < beforeDate);
  if (!items.length) return { cpm: 0 };
  return items.reduce((best, s) => s.cpm > best.cpm ? s : best, items[0]);
}

function renderHomeSummary() {
  const name = ui.studentSelect.value;
  if (!name) { ui.homeSummary.innerHTML = "<p>Enginn nemandi valinn ennþá.</p>"; return; }
  const sessions = store.sessions.filter(s => s.student === name);
  const last = sessions.at(-1);
  const goals = store.goals[name] || {};
  let html = `<p><strong>Nemandi:</strong> ${escapeHtml(name)}</p>`;
  html += `<p><strong>Fjöldi lota:</strong> ${sessions.length}</p>`;
  if (last) {
    html += `<p><strong>Síðasta lota:</strong> ${EXERCISES[last.exercise]} • ${DIFFICULTIES[last.difficulty].label}</p>`;
    html += `<p><strong>Síðasta rétt/mín:</strong> ${last.cpm}</p>`;
  }
  if (goals.cpm || goals.accuracy) {
    html += `<p><strong>Markmið:</strong> ${goals.cpm ? goals.cpm + " rétt/mín" : ""} ${goals.accuracy ? " • " + goals.accuracy + "% nákvæmni" : ""}</p>`;
  }
  ui.homeSummary.innerHTML = html;
}

function teacherLogin() {
  if (ui.teacherPasswordInput.value === TEACHER_PASSWORD) {
    ui.teacherModal.classList.add("hidden");
    renderTeacherArea();
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
      <td>${EXERCISES[s.exercise]}</td>
      <td>${DIFFICULTIES[s.difficulty].label}</td>
      <td>${s.questionCount}</td>
      <td>${s.correct}</td>
      <td>${s.wrong}</td>
      <td>${s.accuracy}%</td>
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
  const barW = data.length ? Math.min(90, (canvas.width - 60) / data.length - 10) : 60;
  data.forEach((d, i) => {
    const x = 40 + i * (barW + 10);
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
    cpm: ui.goalCpmInput.value ? Number(ui.goalCpmInput.value) : "",
    accuracy: ui.goalAccInput.value ? Number(ui.goalAccInput.value) : ""
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
    new Date(s.date).toLocaleString("is-IS"), s.student, EXERCISES[s.exercise], DIFFICULTIES[s.difficulty].label,
    s.questionCount, s.correct, s.wrong, s.accuracy, s.cpm
  ]));
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><table border="1">${rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(String(c))}</td>`).join("")}</tr>`).join("")}</table></body></html>`;
  downloadBlob(new Blob([html], {type:"application/vnd.ms-excel"}), "grunnstaerdfraedi_nidurstodur.xls");
}

function exportPdf() {
  const w = window.open("", "_blank");
  const tableHtml = document.querySelector("#sessionsTable").outerHTML;
  const summary = ui.teacherSummary.innerHTML;
  w.document.write(`<!DOCTYPE html><html lang="is"><head><meta charset="UTF-8"><title>Grunnstærðfræði skýrsla</title><style>body{font-family:Arial;padding:20px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ccc;padding:8px;text-align:left} h1,h2{margin:0 0 12px}</style></head><body><h1>Grunnstærðfræði - skýrsla</h1><h2>Yfirlit</h2>${summary}<h2>Lotur</h2>${tableHtml}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

function confirmQuit() {
  if (confirm("Hætta í lotu og fara á aðalskjá?")) showScreen("home");
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(el => el.classList.remove("active"));
  byId(`screen-${name}`).classList.add("active");
  if (name === "home") renderHomeSummary();
  if (name === "teacher") renderTeacherArea();
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        students: Array.isArray(parsed.students) ? parsed.students : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        goals: parsed.goals && typeof parsed.goals === "object" ? parsed.goals : {}
      };
    }
  } catch {}
  return { students: [], sessions: [], goals: {} };
}
function saveStore() { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
function byId(id){ return document.getElementById(id); }
function round2(n){ return Math.round(n * 100) / 100; }
function escapeHtml(s){ return s.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function registerSW() {
  if ("serviceWorker" in navigator) {
    try { await navigator.serviceWorker.register("sw.js"); } catch {}
  }
}

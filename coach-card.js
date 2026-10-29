// ────────────────────────────────────────────
// 老玩客教練卡 — 共用邏輯
// API_URL 與 SHEET_NAME 由各班頁面設定
// ────────────────────────────────────────────

const INJURY_SEVERE = ['粉碎性','開放性','多處骨折','脊髓','截肢','置換','人工關節'];
const INJURY_MED    = ['骨折','手術','鋼板','鋼釘','撕裂','滑脫','關節炎','椎間盤突出','心臟','中風','糖尿病'];
const INJURY_LOW    = ['扭傷','拉傷','輕微','已復原','舊傷'];
const MED_HIGH      = ['抗凝血','Warfarin','華法林','心律不整','心臟病用藥','化療'];
const MED_MED       = ['降血壓','降血糖','利尿','類固醇','骨質疏鬆','雙磷酸鹽'];

const CAUTION_RULES = [
  { re: /粉碎性骨折|鋼板|鋼釘|內固定/, text: '衝擊性動作調整・跪姿改坐姿・骨折部位保護', level:'red' },
  { re: /髕骨骨折/,                     text: '深蹲範圍調整・膝關節負重留意', level:'yel' },
  { re: /腰椎滑脫|椎間盤突出/,         text: '腰椎屈伸動作調整・核心支撐優先', level:'yel' },
  { re: /旋轉肌|肩袖|肩關節/,          text: '過頭動作調整・肩推重量留意', level:'yel' },
  { re: /人工關節|關節置換/,            text: '關節活動範圍確認・避免超角度', level:'red' },
  { re: /中風|偏癱/,                    text: '單側功能差異・動作對稱性引導', level:'red' },
  { re: /降血壓/,                       text: '心率反應可能偏低・避免驟然站立', level:'yel' },
  { re: /降血糖|糖尿病/,                text: '確認是否進食・注意低血糖症狀', level:'yel' },
  { re: /抗凝血/,                       text: '避免碰撞或跌倒風險動作', level:'red' },
  { re: /骨質疏鬆|雙磷酸鹽/,           text: '衝擊性動作調整・跌倒預防優先', level:'red' },
];

function injuryLevel(text) {
  if (INJURY_SEVERE.some(k => text.includes(k))) return '重';
  if (INJURY_MED.some(k => text.includes(k)))    return '中';
  if (INJURY_LOW.some(k => text.includes(k)))    return '輕';
  return '無';
}

function calcRisk(s) {
  const combined = (s.injury||'') + ' ' + (s.meds||'');
  let score = 0;
  const lvl = injuryLevel(combined);
  if (lvl==='重') score+=3; else if (lvl==='中') score+=2; else if (lvl==='輕') score+=1;
  if (MED_HIGH.some(k=>combined.includes(k))) score+=3;
  else if (MED_MED.some(k=>combined.includes(k))) score+=1;
  const age = s.age||0;
  if (age>=80) score+=2; else if (age>=70) score+=1;
  if (score>=4) return 'red';
  if (score>=2) return 'yel';
  return 'grn';
}

function buildCautions(s) {
  const combined = (s.injury||'') + ' ' + (s.meds||'');
  return CAUTION_RULES.filter(r => r.re.test(combined));
}

function normalizeStudent(raw, idx) {
  const keys = Object.keys(raw);
  let name, classLabel, height, weight, bmi, birthStr, age=0, injury, meds, motivation, hope, note;

  name       = raw['姓名'] || raw[keys[1]] || '';
  classLabel = raw['班別'] || '';
  height     = parseFloat(raw['身高']) || 0;
  weight     = parseFloat(raw['體重']) || 0;
  birthStr   = raw['出生年月日'] || '';
  injury     = raw['身體不適'] || raw['受傷/手術史'] || '';
  meds       = raw['用藥情形'] || '';
  motivation = raw['動機'] || '';
  hope       = raw['期許'] || '';
  note       = raw['老玩客備註'] || '';

  if (height > 3) height = height / 100;
  bmi = (height > 0 && weight > 0) ? +(weight/(height*height)).toFixed(1) : 0;

  if (birthStr) {
    const d = new Date(birthStr);
    if (!isNaN(d)) {
      const now = new Date();
      age = now.getFullYear() - d.getFullYear();
      if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age--;
    }
  }
  return { idx, name, classLabel, height:height*100, weight, bmi, age, injury, meds, motivation, hope, note };
}

const AVATARS = ['🧓','👵','🧑','👴','👩','🧔','💪','🌟'];
const RISK_LABEL  = { red:'🔴 高關注', yel:'🟡 留意', grn:'🟢 一般關注' };
const RISK_CLASS  = { red:'risk-red',  yel:'risk-yel',  grn:'risk-grn'  };
const BADGE_CLASS = { red:'badge-red', yel:'badge-yel', grn:'badge-grn' };

function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function renderCard(s) {
  const risk     = calcRisk(s);
  const cautions = buildCautions(s);
  const avatarBg = risk==='red'?'var(--red-bg)':risk==='yel'?'var(--yel-bg)':'var(--grn-bg)';
  const metaChips = [s.age?`${s.age} 歲`:null, s.bmi?`BMI ${s.bmi}`:null, s.weight?`${s.weight} kg`:null]
    .filter(Boolean).map(t=>`<span class="meta-chip">${esc(t)}</span>`).join('');

  let cautionHTML = cautions.length
    ? cautions.map(c=>`<div class="caution-item caution-${c.level}"><span class="caution-icon">${c.level==='red'?'⚠️':c.level==='yel'?'⚡':'✅'}</span><span>${esc(c.text)}</span></div>`).join('')
    : `<div class="caution-item caution-grn"><span class="caution-icon">✅</span><span>無特殊注意事項</span></div>`;

  const noteHTML = s.note ? `<div class="note-block"><div class="note-label">🧩 老玩客備註</div>${esc(s.note)}</div>` : '';
  const motiveHTML = (s.motivation||s.hope) ? `<div class="info-block"><div class="block-label"><span class="block-label-icon">💬</span>動機與期許</div><div class="block-content">${s.motivation?`<b>動機：</b>${esc(s.motivation)}<br>`:''}${s.hope?`<b>期許：</b>${esc(s.hope)}`:''}</div></div>` : '';

  return `
  <div class="card-hero">
    <div class="avatar" style="background:${avatarBg}">${AVATARS[s.idx%AVATARS.length]}</div>
    <div class="hero-info">
      <h2>${esc(s.name)}</h2>
      <div class="hero-meta">${metaChips}</div>
    </div>
    <div class="risk-badge ${RISK_CLASS[risk]}">${RISK_LABEL[risk]}</div>
  </div>
  ${noteHTML}
  <div class="info-block">
    <div class="block-label"><span class="block-label-icon">⚙️</span>注意事項 / 建議調整方向</div>
    <div class="caution-list">${cautionHTML}</div>
  </div>
  <div class="info-block">
    <div class="block-label"><span class="block-label-icon">🩹</span>受傷／手術史</div>
    <div class="block-content">${s.injury?esc(s.injury):'<span class="none-text">無紀錄</span>'}</div>
  </div>
  <div class="info-block">
    <div class="block-label"><span class="block-label-icon">💊</span>用藥情形</div>
    <div class="block-content">${s.meds?esc(s.meds):'<span class="none-text">無</span>'}</div>
  </div>
  ${motiveHTML}`;
}

function buildUI(students, updatedStr, offline, classTitle) {
  const app       = document.getElementById('app');
  const tabBar    = document.getElementById('tab-bar');
  const container = document.getElementById('cards-container');
  const updBar    = document.getElementById('updated-bar');
  document.getElementById('class-label').textContent = classTitle || students[0]?.classLabel || '熟齡班';

  if (updatedStr) {
    try {
      const d = new Date(updatedStr);
      updBar.textContent = `資料更新：${d.toLocaleString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}`;
    } catch(e){}
  }
  if (offline) {
    const b = document.createElement('div');
    b.className='offline-data';
    b.textContent='⚠️ 目前顯示快取資料，連線恢復後自動更新';
    container.insertBefore(b, updBar.nextSibling);
  }

  tabBar.innerHTML = '';
  students.forEach((s,i) => {
    const risk = calcRisk(s);
    const btn = document.createElement('button');
    btn.className='tab-btn'+(i===0?' active':'');
    btn.setAttribute('role','tab');
    btn.innerHTML=`<span class="tab-name">${esc(s.name)}</span><span class="tab-badge ${BADGE_CLASS[risk]}">${RISK_LABEL[risk].split(' ')[1]||RISK_LABEL[risk]}</span>`;
    btn.addEventListener('click',()=>activate(i));
    tabBar.appendChild(btn);

    const card = document.createElement('div');
    card.className='student-card'+(i===0?' active':'');
    card.id=`card-${i}`;
    card.innerHTML=renderCard(s);
    container.appendChild(card);
  });

  app.hidden=false;
  document.getElementById('loading').hidden=true;
  tabBar.querySelector('.tab-btn.active')?.scrollIntoView({inline:'center',behavior:'instant'});
}

function activate(idx) {
  document.querySelectorAll('.tab-btn').forEach((b,i)=>{ b.classList.toggle('active',i===idx); b.setAttribute('aria-selected',i===idx?'true':'false'); });
  document.querySelectorAll('.student-card').forEach((c,i)=>c.classList.toggle('active',i===idx));
  document.querySelectorAll('.tab-btn')[idx]?.scrollIntoView({inline:'center',behavior:'smooth'});
}

const CACHE_PREFIX = 'owk_v1_';
function saveCache(key, data){ try{ localStorage.setItem(CACHE_PREFIX+key, JSON.stringify(data)); }catch(e){} }
function loadCache(key){ try{ return JSON.parse(localStorage.getItem(CACHE_PREFIX+key)||'null'); }catch(e){ return null; } }

async function loadData(apiUrl, sheetName, classTitle) {
  let data=null, offline=false;
  try {
    const res = await fetch(apiUrl+'?sheet='+encodeURIComponent(sheetName), {cache:'no-cache'});
    if (!res.ok) throw new Error('HTTP '+res.status);
    data = await res.json();
    saveCache(sheetName, data);
  } catch(e) {
    data = loadCache(sheetName);
    offline = true;
    if (!data) {
      document.getElementById('loading').hidden=true;
      document.getElementById('err').hidden=false;
      document.getElementById('err-msg').textContent='無法取得資料，且無快取可用。請確認網路連線後重試。';
      return;
    }
  }

  // Filter by sheet name if API returns all sheets
  let rawStudents = data.students || [];
  if (sheetName) rawStudents = rawStudents.filter(r => !r['班別'] || r['班別']===sheetName || r['班別']==='');

  if (!rawStudents.length) {
    document.getElementById('loading').hidden=true;
    document.getElementById('err').hidden=false;
    document.getElementById('err-msg').textContent=`「${sheetName}」目前無學員資料`;
    return;
  }

  const students = rawStudents.map((r,i)=>normalizeStudent(r,i)).filter(s=>s.name);
  if (!students.length) {
    document.getElementById('loading').hidden=true;
    document.getElementById('err').hidden=false;
    document.getElementById('err-msg').textContent='找不到有效學員資料';
    return;
  }
  buildUI(students, data.updated, offline, classTitle);
}

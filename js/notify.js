'use strict';
const NOTIFY_KEY = 'avrilNotifyV2';

function getSettings() {
  const defaults = {
    cleaning:  { on: true,  type: 'weekly',  dow: 1,  label: '매주 월요일' },
    pest:      { on: true,  type: 'monthly', dom: 1,  label: '매월 1일' },
    equipment: { on: true,  type: 'monthly', dom: 1,  months:[1,4,7,10], label: '분기 1일' },
    custom:    []
  };
  try {
    const saved = JSON.parse(localStorage.getItem(NOTIFY_KEY));
    return saved ? {...defaults, ...saved} : defaults;
  } catch(e) { return defaults; }
}
function saveSettings(s) { localStorage.setItem(NOTIFY_KEY, JSON.stringify(s)); }

async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}
function sendNotification(title, body) {
  if (Notification.permission !== 'granted') return;
  new Notification(title, { body, icon:'/icons/icon-192.png', tag:title });
}

async function checkNotifications() {
  if (Notification.permission !== 'granted') return;
  const todayStr = new Date().toISOString().split('T')[0];
  if (localStorage.getItem('avrilLastNotify') === todayStr) return;
  const s = getSettings();
  const now = new Date();
  const dow = now.getDay(), dom = now.getDate(), mon = now.getMonth()+1;

  if (s.cleaning.on) {
    const trigDow = s.cleaning.dow ?? 1;
    if (dow === trigDow) {
      const hyg = await DB.getAll('hygiene');
      if (!hyg.some(h=>h.type==='청소점검'&&h.date===todayStr))
        sendNotification('🧹 청소 점검 기록 필요', '작업장청소점검 (R-MH-01)을 기록해주세요.');
    }
  }
  if (s.pest.on) {
    const trigDom = s.pest.dom ?? 1;
    if (dom === trigDom) {
      const hyg = await DB.getAll('hygiene');
      const ym = `${now.getFullYear()}-${String(mon).padStart(2,'0')}`;
      if (!hyg.some(h=>h.type==='방충방서'&&h.date&&h.date.startsWith(ym)))
        sendNotification('🦟 방충·방서 월간 점검 필요', `${now.getFullYear()}년 ${mon}월 방충방서 점검을 기록해주세요.`);
    }
  }
  if (s.equipment.on) {
    const trigDom = s.equipment.dom ?? 1;
    const trigMonths = s.equipment.months ?? [1,4,7,10];
    if (dom === trigDom && trigMonths.includes(mon))
      sendNotification('🔧 설비관리 분기 점검 필요', `${now.getFullYear()}년 ${Math.ceil(mon/3)}/4분기 설비관리기록서 점검 기간입니다.`);
  }
  // 사용자 지정 알림
  if (s.custom && s.custom.length) {
    s.custom.forEach(c => {
      if (c.date === todayStr)
        sendNotification(`🔔 ${c.title}`, c.body||'');
    });
  }
  localStorage.setItem('avrilLastNotify', todayStr);
}

function renderNotifySettings(el) {
  const s = getSettings();
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const dows = ['일','월','화','수','목','금','토'];
  const doms = Array.from({length:28},(_,i)=>i+1);

  el.innerHTML = `
    <div class="page-header"><h2 class="page-title">알림 · 설정</h2></div>

    ${perm==='unsupported'
      ? `<div class="info-banner"><i class="ti ti-info-circle"></i><span>이 기기는 알림을 지원하지 않습니다.</span></div>`
      : perm!=='granted'
      ? `<div class="warn-banner" onclick="enableNotify()" style="cursor:pointer;margin:0">
           <i class="ti ti-bell"></i>
           <div><div class="warn-title">알림 권한 허용 필요</div><div class="warn-sub">탭해서 알림 권한을 허용하세요</div></div>
           <i class="ti ti-chevron-right ml-auto"></i>
         </div>`
      : `<div class="info-banner" style="background:var(--teal-light);border-color:var(--teal)">
           <i class="ti ti-bell-ringing" style="color:var(--teal)"></i>
           <span style="color:var(--teal-dark);font-weight:600">알림 활성화됨</span>
         </div>`}

    <div class="group-header">점검 주기 알림 설정</div>

    <!-- 청소 점검 -->
    <div class="notify-card">
      <div class="notify-card-head">
        <div class="notify-icon si-teal"><i class="ti ti-tool"></i></div>
        <div class="setting-info">
          <div class="setting-title">🧹 청소 점검 (R-MH-01)</div>
          <div class="setting-sub">매주 반복 · 요일 선택</div>
        </div>
        <label class="toggle">
          <input type="checkbox" id="n-clean" ${s.cleaning.on?'checked':''} onchange="saveNotifyOn('cleaning',this.checked)">
          <span class="slider"></span>
        </label>
      </div>
      <div class="notify-schedule">
        <span class="sched-label">알림 요일</span>
        <div class="dow-grid">
          ${dows.map((d,i)=>`<button class="dow-btn${(s.cleaning.dow??1)===i?' active':''}" onclick="setNotifyDow('cleaning',${i})">${d}</button>`).join('')}
        </div>
      </div>
    </div>

    <!-- 방충방서 -->
    <div class="notify-card">
      <div class="notify-card-head">
        <div class="notify-icon si-amber"><i class="ti ti-bug"></i></div>
        <div class="setting-info">
          <div class="setting-title">🦟 방충·방서 (R-MH-02)</div>
          <div class="setting-sub">매월 반복 · 날짜 선택</div>
        </div>
        <label class="toggle">
          <input type="checkbox" id="n-pest" ${s.pest.on?'checked':''} onchange="saveNotifyOn('pest',this.checked)">
          <span class="slider"></span>
        </label>
      </div>
      <div class="notify-schedule">
        <span class="sched-label">알림 날짜</span>
        <div class="dom-row">
          <span>매월</span>
          <select id="pest-dom" onchange="setNotifyDom('pest',+this.value)" style="margin:0 6px;padding:4px 8px;border:1.5px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);font-family:inherit;font-size:13px">
            ${doms.map(d=>`<option value="${d}" ${(s.pest.dom??1)===d?'selected':''}>${d}일</option>`).join('')}
          </select>
          <span>에 알림</span>
        </div>
      </div>
    </div>

    <!-- 설비관리 -->
    <div class="notify-card">
      <div class="notify-card-head">
        <div class="notify-icon si-mauve"><i class="ti ti-settings"></i></div>
        <div class="setting-info">
          <div class="setting-title">🔧 설비관리 (R-MMS-02)</div>
          <div class="setting-sub">지정 월 · 날짜 선택</div>
        </div>
        <label class="toggle">
          <input type="checkbox" id="n-equip" ${s.equipment.on?'checked':''} onchange="saveNotifyOn('equipment',this.checked)">
          <span class="slider"></span>
        </label>
      </div>
      <div class="notify-schedule">
        <span class="sched-label">알림 월 (복수 선택)</span>
        <div class="month-grid">
          ${[1,2,3,4,5,6,7,8,9,10,11,12].map(m=>`
            <button class="month-btn${(s.equipment.months??[1,4,7,10]).includes(m)?' active':''}"
              onclick="toggleNotifyMonth(${m})">${m}월</button>`).join('')}
        </div>
        <div class="dom-row" style="margin-top:8px">
          <span>해당 월</span>
          <select id="equip-dom" onchange="setNotifyDom('equipment',+this.value)" style="margin:0 6px;padding:4px 8px;border:1.5px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);font-family:inherit;font-size:13px">
            ${doms.map(d=>`<option value="${d}" ${(s.equipment.dom??1)===d?'selected':''}>${d}일</option>`).join('')}
          </select>
          <span>에 알림</span>
        </div>
      </div>
    </div>

    <!-- 사용자 지정 알림 -->
    <div class="group-header mt16">사용자 지정 알림</div>
    <div id="custom-notify-list"></div>
    <button class="save-btn mt16" onclick="openCustomNotifyForm()" style="background:var(--mauve)">
      <i class="ti ti-plus" style="margin-right:6px"></i>날짜 지정 알림 추가
    </button>

    <!-- 설비관리 기록 -->
    <div class="group-header mt16">설비관리기록서 (R-MMS-02)</div>
    <div id="equip-section"></div>
    <button class="save-btn mt16" onclick="openEquipForm()">+ 분기 점검 기록 추가</button>

    <!-- 데이터 관리 -->
    <div class="group-header mt16">데이터 관리</div>
    <div class="setting-row" onclick="exportData()">
      <div class="notify-icon si-teal"><i class="ti ti-download"></i></div>
      <div class="setting-info">
        <div class="setting-title">데이터 백업 (내보내기)</div>
        <div class="setting-sub">전체 데이터를 JSON 파일로 저장</div>
      </div>
      <i class="ti ti-chevron-right" style="color:var(--text3)"></i>
    </div>
    <div class="setting-row" onclick="document.getElementById('import-file').click()">
      <div class="notify-icon si-amber"><i class="ti ti-upload"></i></div>
      <div class="setting-info">
        <div class="setting-title">데이터 복원 (가져오기)</div>
        <div class="setting-sub">백업 파일로 데이터 복원</div>
      </div>
      <i class="ti ti-chevron-right" style="color:var(--text3)"></i>
    </div>
    <input type="file" id="import-file" accept=".json" style="display:none" onchange="importData(event)">
    <div class="setting-row" onclick="confirmReset()" style="border-top:2px solid var(--red-bg)">
      <div class="notify-icon" style="background:var(--red-bg);color:var(--red)"><i class="ti ti-trash"></i></div>
      <div class="setting-info">
        <div class="setting-title" style="color:var(--red)">데이터 초기화</div>
        <div class="setting-sub">모든 기록을 삭제하고 초기 상태로</div>
      </div>
      <i class="ti ti-chevron-right" style="color:var(--text3)"></i>
    </div>
  `;

  renderCustomNotifyList();
  renderEquipRecords(document.getElementById('equip-section'));
}

function renderCustomNotifyList() {
  const s = getSettings();
  const el = document.getElementById('custom-notify-list');
  if (!el) return;
  if (!s.custom || !s.custom.length) {
    el.innerHTML = '<div class="empty-hint" style="padding:12px 16px">지정된 알림이 없습니다</div>';
    return;
  }
  el.innerHTML = s.custom.map((c,i) => `
    <div class="list-item">
      <div class="item-left">
        <div class="item-title">${c.title}</div>
        <div class="item-sub">${c.date} ${c.body?'· '+c.body:''}</div>
      </div>
      <button class="icon-btn" onclick="removeCustomNotify(${i})"><i class="ti ti-trash" style="color:var(--red)"></i></button>
    </div>`).join('');
}

function openCustomNotifyForm() {
  const today = new Date().toISOString().split('T')[0];
  showSheet(`
    <div class="sheet-handle"></div>
    <div class="sheet-inner">
    <div class="sheet-title">날짜 지정 알림</div>
    <label>알림 제목<input id="cn-title" placeholder="예: 정기감시 제출 마감"></label>
    <label>알림 날짜<input type="date" id="cn-date" value="${today}"></label>
    <label>내용 (선택)<input id="cn-body" placeholder="예: 식약처 제출 기한"></label>
    <div class="sheet-btns">
      <button onclick="closeSheet()">취소</button>
      <button class="btn-save" onclick="saveCustomNotify()">저장</button>
    </div>
    </div>`);
}

function saveCustomNotify() {
  const title = document.getElementById('cn-title')?.value;
  const date  = document.getElementById('cn-date')?.value;
  const body  = document.getElementById('cn-body')?.value;
  if (!title || !date) { alert('제목과 날짜를 입력해주세요'); return; }
  const s = getSettings();
  if (!s.custom) s.custom = [];
  s.custom.push({title, date, body});
  s.custom.sort((a,b) => a.date.localeCompare(b.date));
  saveSettings(s);
  closeSheet();
  renderTab('notify');
}

function removeCustomNotify(i) {
  if (!confirm('삭제할까요?')) return;
  const s = getSettings();
  s.custom.splice(i, 1);
  saveSettings(s);
  renderCustomNotifyList();
}

function setNotifyDow(key, dow) {
  const s = getSettings();
  s[key].dow = dow;
  saveSettings(s);
  renderTab('notify');
}
function setNotifyDom(key, dom) {
  const s = getSettings();
  s[key].dom = dom;
  saveSettings(s);
}
function toggleNotifyMonth(m) {
  const s = getSettings();
  const months = s.equipment.months ?? [1,4,7,10];
  const idx = months.indexOf(m);
  if (idx >= 0) months.splice(idx,1); else months.push(m);
  months.sort((a,b)=>a-b);
  s.equipment.months = months;
  saveSettings(s);
  renderTab('notify');
}
function saveNotifyOn(key, val) {
  const s = getSettings();
  s[key].on = val;
  saveSettings(s);
}

async function enableNotify() {
  const perm = await requestPermission();
  if (perm === 'granted') {
    sendNotification('에이브릴팜 알림 활성화', '점검 주기 알림이 설정되었습니다.');
    renderTab('notify');
  } else {
    alert('알림 권한이 거부되었습니다.\n브라우저 설정에서 알림을 허용해주세요.');
  }
}

/* 데이터 관리 */
async function exportData() {
  const data = await DB.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `아브릴팜_백업_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!confirm(`"${file.name}" 파일로 데이터를 복원할까요?\n현재 데이터가 덮어씌워집니다.`)) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await DB.importAll(data);
    alert('데이터 복원 완료!');
    renderTab(currentTab);
  } catch(e) {
    alert('복원 실패: ' + e.message);
  }
}

async function confirmReset() {
  if (!confirm('⚠️ 모든 데이터를 삭제할까요?\n삭제 전 백업을 먼저 해두세요.')) return;
  if (!confirm('정말 삭제하시겠습니까? 되돌릴 수 없습니다.')) return;
  await DB.clearAll();
  await DB.seedIfEmpty();
  alert('초기화 완료');
  renderTab('hygiene');
}

async function renderEquipRecords(el) {
  if (!el) return;
  const list = await DB.getAll('equipment');
  if (!list.length) { el.innerHTML = '<div class="empty-hint">아직 설비 점검 기록이 없습니다</div>'; return; }
  el.innerHTML = list.map(r => `
    <div class="list-item" onclick="openEquipForm(${r.id})">
      <div class="item-left">
        <div class="item-title">${r.year}년 ${r.quarter}/4분기</div>
        <div class="item-sub">${r.확인자||''} · ${r.date||''}</div>
      </div>
      <span class="badge ${r.이상?'badge-red':'badge-green'}">${r.이상?'이상있음':'정상'}</span>
    </div>`).join('');
}

function openEquipForm(id) {
  DB.getAll('equipment').then(list => {
    const item = id ? list.find(e=>e.id===id) : {};
    const now = new Date();
    const q = Math.ceil((now.getMonth()+1)/3);
    showSheet(`
      <div class="sheet-handle"></div>
      <div class="sheet-inner">
      <div class="sheet-title">${id?'설비 점검 수정':'설비관리 분기 점검'}</div>
      <label>점검일<input type="date" id="eq1" value="${(item&&item.date)||now.toISOString().split('T')[0]}"></label>
      <label>연도<input type="number" id="eq2" value="${(item&&item.year)||now.getFullYear()}"></label>
      <label>분기<select id="eq3">${[1,2,3,4].map(n=>`<option ${((item&&item.quarter)||q)===n?'selected':''}>${n}/4분기</option>`).join('')}</select></label>
      ${['전자저울','스틱블렌더','온도계','실리콘몰드','스테인리스용기','기타기구'].map((g,i)=>`
        <label>${g}<select id="eq-g${i}">
          <option ${!(item&&item.기기&&item.기기[i]==='이상')?'selected':''}>정상</option>
          <option ${item&&item.기기&&item.기기[i]==='이상'?'selected':''}>이상</option>
        </select></label>`).join('')}
      <label>이상 내용 및 조치<input id="eq4" value="${(item&&item.이상내용)||''}"></label>
      <label>확인자<input id="eq5" value="${(item&&item.확인자)||'변민정'}"></label>
      <div class="sheet-btns">
        ${id?`<button class="btn-del" onclick="delItem('equipment',${id})">삭제</button>`:''}
        <button onclick="closeSheet()">취소</button>
        <button class="btn-save" onclick="saveEquip(${id||'null'})">저장</button>
      </div>
      </div>`);
  });
}

async function saveEquip(id) {
  const gears = ['전자저울','스틱블렌더','온도계','실리콘몰드','스테인리스용기','기타기구'];
  const 기기 = gears.map((_,i)=>document.getElementById(`eq-g${i}`)?.value||'정상');
  const data = {
    date:v('eq1'), year:+v('eq2'),
    quarter:+v('eq3').replace('/4분기',''),
    기기, 이상:기기.some(g=>g==='이상'), 이상내용:v('eq4'), 확인자:v('eq5')
  };
  if(id) await DB.put('equipment',{...data,id}); else await DB.add('equipment',data);
  closeSheet(); renderTab('notify');
}

window.renderNotifySettings = renderNotifySettings;
window.checkNotifications = checkNotifications;
window.enableNotify = enableNotify;
window.saveNotifyOn = saveNotifyOn;
window.setNotifyDow = setNotifyDow;
window.setNotifyDom = setNotifyDom;
window.toggleNotifyMonth = toggleNotifyMonth;
window.openCustomNotifyForm = openCustomNotifyForm;
window.saveCustomNotify = saveCustomNotify;
window.removeCustomNotify = removeCustomNotify;
window.openEquipForm = openEquipForm;
window.saveEquip = saveEquip;
window.exportData = exportData;
window.importData = importData;
window.confirmReset = confirmReset;

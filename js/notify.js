/* ═══════════════════════════════════════
   공방비서 알림 모듈 v2
   - 청소 점검: 매주 월요일
   - 방충방서: 매월 1일
   - 설비관리: 분기 첫 달 1일 (1/4/7/10월)
═══════════════════════════════════════ */

const NOTIFY_KEY = 'avrilNotifySettings';

function getSettings() {
  try { return JSON.parse(localStorage.getItem(NOTIFY_KEY)) || {cleaning:true, pest:true, equipment:true}; }
  catch(e) { return {cleaning:true, pest:true, equipment:true}; }
}
function saveSettings(s) { localStorage.setItem(NOTIFY_KEY, JSON.stringify(s)); }

async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

function sendNotification(title, body, icon) {
  if (Notification.permission !== 'granted') return;
  new Notification(title, {
    body,
    ...(icon ? {icon} : {}),
    tag: title,
    renotify: false
  });
}

async function checkNotifications() {
  if (Notification.permission !== 'granted') return;
  const s = getSettings();
  const now = new Date();
  const lastCheck = localStorage.getItem('avrilLastNotify');
  const todayStr = now.toISOString().split('T')[0];
  if (lastCheck === todayStr) return;

  const dow = now.getDay();
  const dom = now.getDate();
  const mon = now.getMonth() + 1;

  const cleanDow = s.cleanDow ?? 1;
  if (s.cleaning && dow === cleanDow) {
    const hyg = await DB.getAll('hygiene');
    const hasRecord = hyg.some(h => h.type === '청소점검' && h.date === todayStr);
    if (!hasRecord) sendNotification('🧹 청소 점검 기록 필요', '이번 주 작업장청소점검 (R-MH-01)을 기록해주세요.');
  }

  const pestDom = s.pestDom ?? 1;
  if (s.pest && dom === pestDom) {
    const hyg = await DB.getAll('hygiene');
    const ym = `${now.getFullYear()}-${String(mon).padStart(2,'0')}`;
    const hasRecord = hyg.some(h => h.type === '방충방서' && h.date?.startsWith(ym));
    if (!hasRecord) sendNotification('🦟 방충·방서 월간 점검 필요', `${now.getFullYear()}년 ${mon}월 방충방서 점검을 기록해주세요.`);
  }

  if (s.equipment && dom === 1 && [1,4,7,10].includes(mon)) {
    const quarter = Math.ceil(mon/3);
    sendNotification('🔧 설비관리 분기 점검 필요', `${now.getFullYear()}년 ${quarter}/4분기 설비관리기록서 점검 기간입니다.`);
  }

  if(s.custom && s.custom.length) {
    s.custom.forEach(ca => {
      if(ca.date === todayStr) sendNotification('🔔 '+ca.title, ca.date);
    });
  }

  localStorage.setItem('avrilLastNotify', todayStr);
}

function renderNotifySettings(el) {
  const s = getSettings();
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';

  el.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">알림·설정</h2>
    </div>
    ${perm === 'unsupported' ? `
      <div class="info-banner"><i class="ti ti-info-circle"></i><span>이 기기는 알림을 지원하지 않습니다.</span></div>
    ` : perm !== 'granted' ? `
      <div class="warn-banner" onclick="enableNotify()">
        <i class="ti ti-bell"></i>
        <div><div class="warn-title">알림 권한 허용 필요</div><div class="warn-sub">탭해서 알림 권한을 허용하세요</div></div>
        <i class="ti ti-chevron-right ml-auto"></i>
      </div>
    ` : `
      <div class="info-banner" style="background:var(--green-bg);border-color:#3DB88A">
        <i class="ti ti-bell-ringing" style="color:#0F6E56"></i>
        <span style="color:#0F6E56">알림 활성화됨</span>
      </div>
    `}

    <div class="group-header">점검 주기 알림</div>

    <div class="list-item" style="cursor:default">
      <div class="item-left">
        <div class="item-title">🧹 청소 점검</div>
        <div class="item-sub">매주 월요일 — R-MH-01 작업장청소점검표</div>
      </div>
      <label class="toggle">
        <input type="checkbox" id="n-clean" ${s.cleaning?'checked':''} onchange="saveNotifySetting('cleaning',this.checked)">
        <span class="slider"></span>
      </label>
    </div>

    <div class="list-item" style="cursor:default">
      <div class="item-left">
        <div class="item-title">🦟 방충·방서</div>
        <div class="item-sub">매월 1일 — R-MH-02 방충방서점검표</div>
      </div>
      <label class="toggle">
        <input type="checkbox" id="n-pest" ${s.pest?'checked':''} onchange="saveNotifySetting('pest',this.checked)">
        <span class="slider"></span>
      </label>
    </div>

    <div class="list-item" style="cursor:default">
      <div class="item-left">
        <div class="item-title">🔧 설비관리</div>
        <div class="item-sub">매분기 첫 달 1일 (1·4·7·10월) — R-MMS-02</div>
      </div>
      <label class="toggle">
        <input type="checkbox" id="n-equip" ${s.equipment?'checked':''} onchange="saveNotifySetting('equipment',this.checked)">
        <span class="slider"></span>
      </label>
    </div>

    <div class="group-header mt16">점검 날짜 직접 설정</div>
    <div class="list-item" style="cursor:default">
      <div class="item-left">
        <div class="item-title">🧹 청소 점검 요일</div>
        <div class="item-sub">매주 알림 받을 요일</div>
      </div>
      <select id="s-clean-dow" onchange="saveNotifySchedule()" style="padding:5px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);font-family:inherit;font-size:13px">
        ${['일','월','화','수','목','금','토'].map((d,i)=>`<option value="${i}" ${(s.cleanDow??1)===i?'selected':''}>${d}요일</option>`).join('')}
      </select>
    </div>
    <div class="list-item" style="cursor:default">
      <div class="item-left">
        <div class="item-title">🦟 방충방서 일자</div>
        <div class="item-sub">매월 알림 받을 날짜</div>
      </div>
      <select id="s-pest-dom" onchange="saveNotifySchedule()" style="padding:5px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);font-family:inherit;font-size:13px">
        ${Array.from({length:28},(_,i)=>i+1).map(d=>`<option value="${d}" ${(s.pestDom??1)===d?'selected':''}>${d}일</option>`).join('')}
      </select>
    </div>
    <div class="list-item" style="cursor:default">
      <div class="item-left">
        <div class="item-title">📅 사용자 지정 알림</div>
        <div class="item-sub">특정 날짜에 알림 추가</div>
      </div>
      <button class="btn-sm" onclick="openCustomAlarmForm()">+ 추가</button>
    </div>
    ${(s.custom||[]).map((c,i)=>`
      <div class="list-item">
        <div class="item-left">
          <div class="item-title">${c.title}</div>
          <div class="item-sub">${c.date}</div>
        </div>
        <button class="icon-btn" onclick="removeCustomAlarm(${i})"><i class="ti ti-trash" style="color:var(--red)"></i></button>
      </div>`).join('')}

    <div class="group-header mt16">설비관리기록서 (R-MMS-02)</div>
    <div id="equip-section"></div>
    <button class="save-btn mt16" onclick="openEquipForm()">+ 분기 점검 기록 추가</button>

    <div class="group-header mt16">데이터 관리</div>
    <div class="list-item" onclick="exportData()" style="cursor:pointer">
      <div class="item-left">
        <div class="item-title">💾 데이터 백업</div>
        <div class="item-sub">전체 데이터를 JSON 파일로 저장</div>
      </div>
      <i class="ti ti-download" style="color:var(--teal)"></i>
    </div>
    <div class="list-item" onclick="document.getElementById('restore-file').click()" style="cursor:pointer">
      <div class="item-left">
        <div class="item-title">📂 데이터 복원</div>
        <div class="item-sub">백업 JSON 파일로 복원</div>
      </div>
      <i class="ti ti-upload" style="color:var(--teal)"></i>
    </div>
    <input type="file" id="restore-file" accept=".json" style="display:none" onchange="restoreData(event)">
    <div class="list-item" onclick="resetAllData()" style="cursor:pointer;border-top:2px solid var(--red-bg)">
      <div class="item-left">
        <div class="item-title" style="color:var(--red)">🗑 데이터 전체 삭제</div>
        <div class="item-sub">모든 기록을 완전히 삭제합니다</div>
      </div>
      <i class="ti ti-trash" style="color:var(--red)"></i>
    </div>
    <div id="reset-status" style="padding:0 16px;font-size:11px;color:var(--text3);min-height:8px"></div>

    <div class="group-header mt16">클라우드 동기화</div>
    <div class="list-item" style="cursor:default">
      <div class="item-left">
        <div class="item-title">계정 동기화 (준비 중)</div>
        <div class="item-sub">로그인 기반 폰·PC 자동 동기화 기능을 준비하고 있습니다</div>
      </div>
    </div>

    <div class="group-header mt16">사업자 정보</div>
    <div class="list-item" onclick="openBizSetupWizard()" style="cursor:pointer">
      <div class="item-left">
        <div class="item-title">🏢 사업자 정보 설정</div>
        <div class="item-sub">상호명·인허가번호·문서번호 등 수정</div>
      </div>
      <i class="ti ti-chevron-right" style="color:var(--text3)"></i>
    </div>

    <div class="group-header mt16">앱 정보</div>
    <div class="list-item" style="cursor:default">
      <div class="item-left">
        <div class="item-title">공방비서 V1.0</div>
        <div class="item-sub">© 2026 공방비서 · Developed by 에이브릴팜</div>
      </div>
    </div>
  `;

  renderEquipRecords(document.getElementById('equip-section'));
}

async function renderEquipRecords(el) {
  const list = await DB.getAll('equipment');
  if (!list.length) { el.innerHTML = '<div class="empty-hint">아직 설비 점검 기록이 없습니다</div>'; return; }
  el.innerHTML = list.map(r => `
    <div class="list-item" onclick="openEquipForm(${r.id})">
      <div class="item-left">
        <div class="item-title">${r.year}년 ${r.quarter}/4분기</div>
        <div class="item-sub">${r.확인자} · ${r.date}</div>
      </div>
      <span class="badge ${r.이상?'badge-red':'badge-green'}">${r.이상?'이상있음':'정상'}</span>
    </div>`).join('');
}

function openEquipForm(id) {
  DB.getAll('equipment').then(list => {
    const item = id ? list.find(e => e.id === id) : {};
    const now = new Date();
    const q = Math.ceil((now.getMonth()+1)/3);
    showSheet(`
      <div class="sheet-handle"></div><div class="sheet-inner">
      <div class="sheet-title">${id?'설비 점검 수정':'설비관리 분기 점검'}</div>
      <label>점검일<input type="date" id="eq1" value="${item.date||now.toISOString().split('T')[0]}"></label>
      <label>연도<input type="number" id="eq2" value="${item.year||now.getFullYear()}"></label>
      <label>분기<select id="eq3">
        ${[1,2,3,4].map(n=>`<option ${(item.quarter||q)===n?'selected':''}>${n}/4분기</option>`).join('')}
      </select></label>
      <div class="group-header" style="padding:10px 0 6px">기기별 점검 결과</div>
      ${['전자저울','스틱블렌더','온도계','실리콘몰드','스테인리스용기','기타기구'].map((g,i)=>`
        <label>${g}
          <select id="eq-g${i}">
            <option ${(item.기기?.[i]||'정상')==='정상'?'selected':''}>정상</option>
            <option ${item.기기?.[i]==='이상'?'selected':''}>이상</option>
          </select>
        </label>`).join('')}
      <label>이상 내용 및 조치<input id="eq4" value="${item.이상내용||''}"></label>
      <label>확인자<input id="eq5" value="${item.확인자||getBiz().owner||''}"></label>
      <div class="sheet-btns">
        ${id?`<button class="btn-del" onclick="delItem('equipment',${id})">삭제</button>`:''}
        <button onclick="closeSheet()">취소</button>
        <button class="btn-save" onclick="saveEquip(${id||'null'})">저장</button>
      </div></div>`);
  });
}

async function saveEquip(id) {
  const gears = ['전자저울','스틱블렌더','온도계','실리콘몰드','스테인리스용기','기타기구'];
  const 기기 = gears.map((_,i) => document.getElementById(`eq-g${i}`)?.value || '정상');
  const hasIssue = 기기.some(g => g === '이상');
  const data = {
    date: v('eq1'), year: +v('eq2'),
    quarter: +v('eq3').replace('/4분기',''),
    기기, 이상: hasIssue, 이상내용: v('eq4'), 확인자: v('eq5')
  };
  id ? await DB.put('equipment', {...data, id}) : await DB.add('equipment', data);
  closeSheet();
  renderTab('notify');
}

async function enableNotify() {
  const perm = await requestPermission();
  if (perm === 'granted') {
    sendNotification('알림 활성화', '점검 주기 알림이 설정되었습니다.');
    renderTab('notify');
  } else {
    alert('알림 권한이 거부되었습니다.\n브라우저 설정에서 알림을 허용해주세요.');
  }
}

function saveNotifySetting(key, val) {
  const s = getSettings();
  s[key] = val;
  saveSettings(s);
}

function saveNotifySchedule() {
  const s = getSettings();
  const dowEl = document.getElementById('s-clean-dow');
  const domEl = document.getElementById('s-pest-dom');
  if(dowEl) s.cleanDow = +dowEl.value;
  if(domEl) s.pestDom  = +domEl.value;
  saveSettings(s);
}

function openCustomAlarmForm() {
  const ds = new Date().toISOString().split('T')[0];
  showSheet(`
    <div class="sheet-handle"></div><div class="sheet-inner">
    <div class="sheet-title">날짜 지정 알림 추가</div>
    <label>알림 제목<input id="ca-title" placeholder="예: 정기감시 제출 마감"></label>
    <label>날짜<input type="date" id="ca-date" value="${ds}"></label>
    <div class="sheet-btns">
      <button onclick="closeSheet()">취소</button>
      <button class="btn-save" onclick="saveCustomAlarm()">저장</button>
    </div></div>`);
}

function saveCustomAlarm() {
  const title = document.getElementById('ca-title')?.value;
  const date  = document.getElementById('ca-date')?.value;
  if(!title||!date){alert('제목과 날짜를 입력해주세요');return;}
  const s = getSettings();
  if(!s.custom) s.custom = [];
  s.custom.push({title,date});
  s.custom.sort((a,b)=>a.date.localeCompare(b.date));
  saveSettings(s);
  closeSheet();
  renderTab('notify');
}

function removeCustomAlarm(i) {
  if(!confirm('삭제할까요?')) return;
  const s = getSettings();
  s.custom.splice(i,1);
  saveSettings(s);
  renderTab('notify');
}

async function exportData() {
  try {
    const data = await DB.exportAll();
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (getBiz().name||'공방비서')+'_백업_'+new Date().toISOString().slice(0,10)+'.json';
    a.click();
    URL.revokeObjectURL(url);
  } catch(e) { alert('백업 실패: '+e.message); }
}

async function restoreData(e) {
  const file = e.target.files[0];
  if(!file) return;
  if(!confirm(`"${file.name}" 파일로 복원할까요?\n현재 데이터가 덮어씌워집니다.`)) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await DB.importAll(data);
    alert('복원 완료!');
    renderTab(currentTab||'hygiene');
  } catch(e) { alert('복원 실패: '+e.message); }
}

async function confirmReset() {
  if(!confirm('⚠️ 모든 데이터를 삭제하고 초기 상태로 되돌립니다.\n백업을 먼저 받아두세요.')) return;
  if(!confirm('정말 완전 초기화 하시겠습니까? 되돌릴 수 없습니다.')) return;
  try {
    await DB.clearAll();
    alert('초기화 완료 — 기본 데이터로 재시작되었습니다.');
    renderTab('hygiene');
  } catch(e) { alert('초기화 실패: '+e.message); }
}

/* v 함수 참조 */
function v(id) { const el=document.getElementById(id); return el?el.value:''; }

window.renderNotifySettings = renderNotifySettings;
window.checkNotifications = checkNotifications;
window.enableNotify = enableNotify;
window.saveNotifySetting = saveNotifySetting;
window.openEquipForm = openEquipForm;
window.saveEquip = saveEquip;
window.saveNotifySchedule = saveNotifySchedule;
window.openCustomAlarmForm = openCustomAlarmForm;
window.saveCustomAlarm = saveCustomAlarm;
window.removeCustomAlarm = removeCustomAlarm;
window.exportData = exportData;
window.restoreData = restoreData;
async function runMigrateEFtoAF() {
  if(!confirm('저장된 문서번호를 EF- → AF- 로 일괄 변환할까요?')) return;
  const count = await DB.migrateEFtoAF();
  alert(`완료! ${count}개 문서번호가 AF-로 변환됐습니다.`);
  if(typeof renderTab === 'function') renderTab('manufacture');
}

window.runMigrateEFtoAF = runMigrateEFtoAF;
window.confirmReset = confirmReset;



async function resetAllData() {
  if(!confirm('⚠️ 모든 데이터가 삭제됩니다.\n(원료·배치·위생·제품·생산·바코드·향료)\n\n정말 삭제할까요?')) return;
  if(!confirm('정말로 전체 삭제합니까? 이 작업은 되돌릴 수 없습니다.')) return;
  const st = document.getElementById('reset-status');
  if(st) st.textContent = '⏳ 삭제 중...';
  try {
    const stores = ['ingredients','batches','hygiene','equipment','products','production','barcodes','fragrances'];
    for (const s of stores) {
      const all = await DB.getAll(s);
      for (const item of all) await DB.remove(s, item.id);
    }
    localStorage.setItem('skip_seed', 'true');
    if(st) st.innerHTML = '<span style="color:var(--teal-dark)">✅ 전체 데이터 삭제 완료</span>';
    setTimeout(() => { if(typeof renderTab === 'function') renderTab('notify'); }, 1500);
  } catch(e) {
    if(st) st.innerHTML = '<span style="color:var(--red-text)">❌ 오류: ' + e.message + '</span>';
  }
}
window.resetAllData = resetAllData;

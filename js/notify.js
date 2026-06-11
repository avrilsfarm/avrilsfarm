/* ═══════════════════════════════════════
   에이브릴팜 알림 모듈
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
    body, icon: icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: title,
    renotify: false
  });
}

// 오늘 알림 체크 — 앱 열릴 때마다 호출
async function checkNotifications() {
  if (Notification.permission !== 'granted') return;
  const s = getSettings();
  const now = new Date();
  const lastCheck = localStorage.getItem('avrilLastNotify');
  const todayStr = now.toISOString().split('T')[0];
  if (lastCheck === todayStr) return; // 오늘 이미 체크함

  const dow = now.getDay(); // 0=일, 1=월
  const dom = now.getDate();
  const mon = now.getMonth() + 1;

  // 청소 점검 — 매주 월요일
  if (s.cleaning && dow === 1) {
    const hyg = await DB.getAll('hygiene');
    const thisWeekMonday = todayStr;
    const hasRecord = hyg.some(h => h.type === '청소점검' && h.date === thisWeekMonday);
    if (!hasRecord) sendNotification('🧹 청소 점검 기록 필요', '이번 주 작업장청소점검 (R-MH-01)을 기록해주세요.');
  }

  // 방충방서 — 매월 1일
  if (s.pest && dom === 1) {
    const hyg = await DB.getAll('hygiene');
    const ym = `${now.getFullYear()}-${String(mon).padStart(2,'0')}`;
    const hasRecord = hyg.some(h => h.type === '방충방서' && h.date?.startsWith(ym));
    if (!hasRecord) sendNotification('🦟 방충·방서 월간 점검 필요', `${now.getFullYear()}년 ${mon}월 방충방서 점검 (R-MH-02)을 기록해주세요.`);
  }

  // 설비관리 — 분기 첫 달 1일 (1/4/7/10월)
  if (s.equipment && dom === 1 && [1,4,7,10].includes(mon)) {
    const quarter = Math.ceil(mon/3);
    sendNotification('🔧 설비관리 분기 점검 필요', `${now.getFullYear()}년 ${quarter}/4분기 설비관리기록서 (R-MMS-02) 점검 기간입니다.`);
  }

  localStorage.setItem('avrilLastNotify', todayStr);
}

// 알림 설정 화면
function renderNotifySettings(el) {
  const s = getSettings();
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';

  el.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">알림 설정</h2>
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

    <div class="group-header mt16">설비관리기록서 (R-MMS-02)</div>
    <div id="equip-section"></div>
    <button class="save-btn mt16" onclick="openEquipForm()">+ 분기 점검 기록 추가</button>
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
      <label>확인자<input id="eq5" value="${item.확인자||'변민정'}"></label>
      <div class="sheet-btns">
        ${id?`<button class="btn-del" onclick="delItem('equipment',${id})">삭제</button>`:''}
        <button onclick="closeSheet()">취소</button>
        <button class="btn-save" onclick="saveEquip(${id||'null'})">저장</button>
      </div>`);
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
    sendNotification('에이브릴팜 알림 활성화', '점검 주기 알림이 설정되었습니다.');
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

window.renderNotifySettings = renderNotifySettings;
window.checkNotifications = checkNotifications;
window.enableNotify = enableNotify;
window.saveNotifySetting = saveNotifySetting;
window.openEquipForm = openEquipForm;
window.saveEquip = saveEquip;

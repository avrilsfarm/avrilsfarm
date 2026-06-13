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
    body, icon: icon || '/icons/logo.png',
    badge: '/icons/logo.png',
    tag: title,
    renotify: false
  });
}

// 오늘 알림 체크 — 앱 열릴 때마다 호출
async function checkNotifications() {
  if (Notification.permission !== 'granted') return;
  const s = getSettings();
  const now = new Date();
  const lastCheck = localStorage.getItem('avrilLastNotify') || '';
  const todayStr = now.toISOString().split('T')[0];
  
  if (lastCheck === todayStr) return; // 하루 한 번만
  
  if (s.cleaning && now.getDay() === 1) { // 월요일
    sendNotification('주간 청소 점검', '오늘은 매주 월요일 청소 점검일입니다.');
  }
  if (s.pest && now.getDate() === 1) { // 1일
    sendNotification('방충·방서 점검', '매월 1일 방충방서 점검을 기록해주세요.');
  }
  if (s.equipment && now.getDate() === 1 && [1,4,7,10].includes(now.getMonth()+1)) { // 분기 첫날
    sendNotification('분기별 설비 점검', '분기 첫 달입니다. 설비 점검을 진행해주세요.');
  }
  
  localStorage.setItem('avrilLastNotify', todayStr);
}

function renderNotifySettings(el) {
  const s = getSettings();
  const p = 'Notification' in window ? Notification.permission : 'unsupported';
  
  el.innerHTML = `
    <div class="page-header"><h2 class="page-title">알림 및 시스템 설정</h2></div>
    
    <div class="section-label">푸시 알림 설정</div>
    <div style="background:#fff;border-radius:8px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);margin-bottom:20px">
      ${p==='default'?`<button class="save-btn mb16" onclick="enablePush()">알림 권한 허용하기</button>`:
        p==='denied'?`<div style="color:var(--red);margin-bottom:16px">알림이 차단되어 있습니다. 기기 설정에서 허용해주세요.</div>`:
        p==='unsupported'?`<div style="color:var(--text3);margin-bottom:16px">이 기기는 푸시 알림을 지원하지 않습니다.</div>`:
        `<div style="color:var(--teal-dark);font-weight:600;margin-bottom:16px">✅ 알림이 활성화되어 있습니다</div>`}
      
      <label style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #eee">
        <span>주간 청소 점검 (매주 월요일)</span>
        <input type="checkbox" id="n-clean" ${s.cleaning?'checked':''} onchange="updateNotify()" ${p!=='granted'?'disabled':''}>
      </label>
      <label style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #eee">
        <span>방충방서 점검 (매월 1일)</span>
        <input type="checkbox" id="n-pest" ${s.pest?'checked':''} onchange="updateNotify()" ${p!=='granted'?'disabled':''}>
      </label>
      <label style="display:flex;justify-content:space-between;align-items:center;padding:10px 0">
        <span>분기별 설비 점검 (1,4,7,10월 1일)</span>
        <input type="checkbox" id="n-equip" ${s.equipment?'checked':''} onchange="updateNotify()" ${p!=='granted'?'disabled':''}>
      </label>
    </div>
    
    <div class="section-label">데이터 관리</div>
    <div style="background:#fff;border-radius:8px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
      <div style="font-size:12px;color:var(--text3);margin-bottom:12px">모든 기록을 파일로 저장하거나 복원할 수 있습니다. 주기적으로 백업하세요.</div>
      <button class="btn-sm solid" style="width:100%;margin-bottom:8px" onclick="backupData()">💾 전체 데이터 백업 (JSON)</button>
      
      <div style="position:relative;margin-bottom:24px">
        <button class="btn-sm" style="width:100%" onclick="document.getElementById('restore-file').click()">📂 백업 파일로 복원</button>
        <input type="file" id="restore-file" accept=".json" style="display:none" onchange="restoreData(event)">
      </div>
      
      <div style="border-top:1px solid #fee;padding-top:16px">
        <div style="font-size:12px;color:var(--red);margin-bottom:8px;font-weight:600">위험 구역</div>
        <button class="btn-sm" style="width:100%;background:#FDECEA;color:var(--red);border:1px solid #FADBD8" onclick="confirmReset()">⚠️ 모든 데이터 초기화</button>
      </div>
    </div>`;
}

async function enablePush() {
  const res = await requestPermission();
  if(res==='granted') alert('알림이 설정되었습니다!');
  else if(res==='denied') alert('알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.');
  if(window.renderTab) renderTab('notify');
}

function updateNotify() {
  saveSettings({
    cleaning: document.getElementById('n-clean').checked,
    pest: document.getElementById('n-pest').checked,
    equipment: document.getElementById('n-equip').checked
  });
}

async function backupData() {
  try {
    const data = await DB.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '에이브릴팜_백업_'+new Date().toISOString().slice(0,10)+'.json';
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
    alert('복원 완료! 안전한 적용을 위해 화면을 새로고침합니다.');
    location.reload(); 
  } catch(e) { alert('복원 실패: '+e.message); }
}

async function confirmReset() {
  if(!confirm('⚠️ 모든 데이터를 삭제합니다.\n먼저 백업을 해두세요.')) return;
  if(!confirm('정말 삭제하시겠습니까? 되돌릴 수 없습니다.')) return;
  try {
    await DB.clearAll();
    alert('초기화가 완료되었습니다. 깨끗한 상태로 새로고침합니다.');
    location.reload(); 
  } catch(e) { alert('초기화 실패: '+e.message); }
}

window.renderNotifySettings = renderNotifySettings;
window.checkNotifications = checkNotifications;
window.enablePush = enablePush;
window.updateNotify = updateNotify;
window.backupData = backupData;
window.restoreData = restoreData;
window.confirmReset = confirmReset;

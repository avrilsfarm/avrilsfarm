'use strict';

/* ════ 상태 ════ */
let currentTab  = 'hygiene';
let stockSubTab = '원료';
let selectedDate = null;
const today = new Date();
let calYear = today.getFullYear();
let calMonth = today.getMonth();

/* ════ 초기화 ════ */
async function init() {
  try { await DB.seedIfEmpty(); } catch(e) { console.warn(e); }
  setupTabs();
  await renderTab(currentTab);
  try { checkNotifications(); } catch(e) {}
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      currentTab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await renderTab(currentTab);
    });
  });
}

async function renderTab(tab) {
  const el = document.getElementById('page-content');
  if (!el) return;
  el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text3)"><i class="ti ti-loader" style="font-size:24px;animation:spin 1s linear infinite"></i></div>';
  try {
    if      (tab === 'stock')       await renderStock(el);
    else if (tab === 'manufacture') await renderManufacture(el);
    else if (tab === 'mfcheck')     await renderMfCheck(el);
    else if (tab === 'hygiene')     await renderHygiene(el);
    else if (tab === 'output')      await renderOutput(el);
    else if (tab === 'notify')      renderNotifySettings(el);
  } catch(e) {
    el.innerHTML = `<div style="padding:24px;color:var(--red-text)">오류: ${e.message}</div>`;
    console.error(e);
  }
  try { await updateBadges(); } catch(e) {}
}

async function updateBadges() {
  const ing = await DB.getAll('ingredients');
  const pending = ing.filter(i => i.판정 === '미기입').length;
  const hb = document.getElementById('badge-hygiene');
  if (hb) { hb.textContent = pending > 0 ? pending : ''; hb.style.display = pending > 0 ? 'inline' : 'none'; }
}

/* ════ 재료·포장재 재고 ════ */
async function renderStock(el) {
  const all = await DB.getAll('ingredients');
  const ingList = all.filter(i => i.stockType !== '포장재');
  const pkgList = all.filter(i => i.stockType === '포장재');
  const list = stockSubTab === '원료' ? ingList : pkgList;
  const cats = [...new Set(list.map(i => i.category))];
  const ok = list.filter(i => i.판정 === '적합').length;
  const pending = list.filter(i => i.판정 === '미기입').length;

  el.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">재료·포장재 재고</h2>
    </div>
    <div class="subtab-row">
      <button class="subtab ${stockSubTab==='원료'?'on':''}" onclick="switchStockTab('원료')">원료 <span class="subtab-cnt">${ingList.length}</span></button>
      <button class="subtab ${stockSubTab==='포장재'?'on':''}" onclick="switchStockTab('포장재')">포장재 <span class="subtab-cnt">${pkgList.length}</span></button>
    </div>
    <div class="summary-row">
      <div class="sum-chip sum-mauve">전체 ${list.length}종</div>
      <div class="sum-chip sum-green">적합 ${ok}종</div>
      ${pending > 0 ? `<div class="sum-chip sum-orange">미기입 ${pending}종</div>` : ''}
    </div>
    ${list.length === 0
      ? `<div class="empty-hint">등록된 ${stockSubTab}이 없습니다<br><small style="font-size:12px">아래 + 버튼으로 추가하세요</small></div>`
      : cats.map(cat => `
          <div class="group-header">${cat}</div>
          ${list.filter(i => i.category === cat).map(i => `
            <div class="list-item" onclick="openIngForm(${i.id})">
              <div class="item-left">
                <div class="item-title">${i.원료명}</div>
                <div class="item-sub">${i.제조처||''}${i.수량?' · '+i.수량:''}${i.입고일?' · '+i.입고일:''}</div>
              </div>
              <div class="item-right">
                <span class="badge ${badgeClass(i.판정)}">${i.판정}</span>
                <span class="badge ${i.CoA==='수취'?'badge-green':'badge-orange'}">CoA ${i.CoA}</span>
              </div>
            </div>`).join('')}
        `).join('')}
    <button class="fab" onclick="openIngForm(null,'${stockSubTab}')"><i class="ti ti-plus"></i></button>`;
}

function switchStockTab(tab) { stockSubTab = tab; renderTab('stock'); }

/* ════ 제품 제조 ════ */
async function renderManufacture(el) {
  const list = await DB.getAll('batches');
  el.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">제품 제조</h2>
    </div>
    <div class="summary-row">
      <div class="sum-chip sum-mauve">배치 ${list.length}건</div>
      <div class="sum-chip sum-green">KCL 완료 ${list.filter(b=>b.KCL).length}건</div>
    </div>
    ${list.length===0 ? `<div class="empty-hint">등록된 배치가 없습니다<br><small>아래 + 버튼으로 추가하세요</small></div>` : ''}
    ${list.map(b => `
      <div class="card-block">
        <div class="card-top" onclick="toggleCard(this)">
          <div class="card-left">
            <div class="card-title">${b.제품명||''}</div>
            <div class="card-sub">${b.문서번호||''} · ${b.제조번호||''}</div>
            <div class="card-sub">${b.date||''} · ${b.제조방법||''}</div>
          </div>
          <div class="card-right">
            <span class="badge ${badgeClass(b.상태)}">${b.상태||''}</span>
            <button class="icon-btn" onclick="event.stopPropagation(); openBatchForm(${b.id})" title="수정">
              <i class="ti ti-edit"></i>
            </button>
          </div>
        </div>
        <div class="card-detail hide">
          ${drow('투입량', b.투입량+'g')}
          ${drow('이론/실제 수량', (b.이론수량||'-')+'ea / '+(b.실제수량||'-')+'ea')}
          ${drow('목표 중량', b.목표중량||'90g ±5g')}
          ${drow('실측 중량', b.실측중량?b.실측중량+'g':'-')}
          ${drow('KCL 성적서', b.KCL||'미등록')}
          ${drow('내용량', b.내용량?b.내용량+'% (기준 97% 이상)':'-')}
          ${drow('유리알칼리', b.유리알칼리?b.유리알칼리+' (기준 0.1% 이하)':'-')}
          ${drow('알레르기 유발성분', b.알레르기||'-')}
          ${drow('이상 여부', b.이상||'-')}
          ${b.레시피&&b.레시피.length ? `
            <div style="margin-top:8px;font-size:11px;font-weight:700;color:var(--teal-dark);padding-bottom:4px">원료 배합표</div>
            <div style="overflow-x:auto">
            <table class="recipe-table">
              <thead><tr><th>No</th><th>원료명</th><th>INCI명칭</th><th>이론량(g)</th><th>비율(%)</th></tr></thead>
              <tbody>
                ${b.레시피.map((r,i)=>`<tr><td>${i+1}</td><td>${r.원료명||''}</td><td style="font-size:10px;color:var(--text3)">${r.INCI||''}</td><td>${r.이론량||''}</td><td>${r.비율||''}</td></tr>`).join('')}
                <tr><td colspan="3">합계</td><td>${b.투입량||''}</td><td>100</td></tr>
              </tbody>
            </table></div>` : ''}
          ${b.비고 ? drow('비고', b.비고) : ''}
        </div>
      </div>`).join('')}
    <button class="fab" onclick="openBatchForm()"><i class="ti ti-plus"></i></button>`;
}

/* ════ 제조 점검 ════ */
async function renderMfCheck(el) {
  el.innerHTML = `
    <div class="page-header"><h2 class="page-title">제조 점검</h2></div>
    <div class="info-banner">
      <i class="ti ti-info-circle"></i>
      <span>CP법 제조 전 체크리스트 · EF-MMS-001 §3 기준</span>
    </div>
    <div class="group-header">CP법 작업 전 필수</div>
    ${['내화학성 장갑 착용','고글 착용','마스크 착용','작업대 에탄올 소독','전자저울 영점 확인'].map(item=>`
      <div class="check-item" onclick="toggleCheck(this)">
        <div class="check-circle"></div>
        <span class="check-label">${item}</span>
      </div>`).join('')}
    <div class="group-header mt16">온도·습도 관리</div>
    ${['온도·습도 기록','혼합 온도 27~30°C 확인'].map(item=>`
      <div class="check-item" onclick="toggleCheck(this)">
        <div class="check-circle"></div>
        <span class="check-label">${item}</span>
      </div>`).join('')}
    <div class="group-header mt16">완제품 출하 전</div>
    ${['외관·성상 육안검사','목표 중량 확인','표시사항(전성분·사용기한) 확인','KCL 성적서 확인'].map(item=>`
      <div class="check-item" onclick="toggleCheck(this)">
        <div class="check-circle"></div>
        <span class="check-label">${item}</span>
      </div>`).join('')}
    <button class="save-btn mt20" onclick="saveChecklist()">점검 완료 저장</button>`;
}

/* ════ 위생 점검 ════ */
async function renderHygiene(el) {
  const hyg = await DB.getAll('hygiene');
  const ym = `${calYear}-${String(calMonth+1).padStart(2,'0')}`;
  const monthRecs = hyg.filter(h => h.date && h.date.startsWith(ym));
  const datesIssue  = new Set(hyg.filter(h=>h.status==='문제임박'&&h.date&&h.date.startsWith(ym)).map(h=>h.date));
  const datesRecord = new Set(monthRecs.map(h=>h.date));
  const displayRecs = selectedDate && selectedDate.startsWith(ym)
    ? monthRecs.filter(r=>r.date===selectedDate)
    : monthRecs;

  el.innerHTML = `
    <div class="page-header"><h2 class="page-title">위생 점검 기록</h2></div>
    <div class="warn-banner" onclick="openHygieneForm()">
      <i class="ti ti-plus-circle"></i>
      <div>
        <div class="warn-title">점검 기록 추가</div>
        <div class="warn-sub">탭해서 오늘 점검 내용을 기록하세요</div>
      </div>
      <i class="ti ti-chevron-right ml-auto"></i>
    </div>
    <div class="cal-nav">
      <button class="cal-arrow" onclick="changeMonth(-1)"><i class="ti ti-chevron-left"></i></button>
      <span class="cal-title">${calYear}년 ${calMonth+1}월</span>
      <button class="cal-arrow" onclick="changeMonth(1)"><i class="ti ti-chevron-right"></i></button>
    </div>
    <div class="calendar">${buildCalendar(calYear, calMonth, datesRecord, datesIssue)}</div>
    <div class="records-section">
      <div class="records-month">
        <span>${selectedDate&&selectedDate.startsWith(ym)?selectedDate+' 기록':calYear+'년 '+(calMonth+1)+'월'}</span>
        ${selectedDate&&selectedDate.startsWith(ym)?`
          <span style="display:flex;gap:6px">
            <button class="btn-sm" onclick="clearDateFilter()">전체보기</button>
            <button class="btn-sm solid" onclick="openHygieneForm('${selectedDate}')">+ 기록추가</button>
          </span>`:''
        }
      </div>
      ${displayRecs.length > 0
        ? displayRecs.map(r => recordItem(r)).join('')
        : `<div class="empty-hint">${selectedDate&&selectedDate.startsWith(ym)?'이 날 기록이 없습니다':'이번 달 기록이 없습니다'}</div>`}
    </div>
    <button class="fab" onclick="openHygieneForm()"><i class="ti ti-plus"></i></button>`;
}

function buildCalendar(year, month, hasRecord, hasIssue) {
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month+1, 0).getDate();
  const dow = ['월','화','수','목','금','토','일'];
  let html = `<div class="cal-grid">`;
  dow.forEach(d => html += `<div class="cal-dow">${d}</div>`);
  const offset = (firstDay+6)%7;
  for (let i=0;i<offset;i++) html += `<div class="cal-day empty"></div>`;
  for (let d=1;d<=days;d++) {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = ds === today.toISOString().split('T')[0];
    const isSel = ds === selectedDate;
    html += `<div class="cal-day${isToday?' today':''}${isSel?' selected':''}" onclick="selectDate('${ds}')">
      <span class="cal-num">${d}</span>
      ${hasIssue.has(ds)?'<span class="cal-dot dot-red"></span>':hasRecord.has(ds)?'<span class="cal-dot dot-green"></span>':''}
    </div>`;
  }
  return html + '</div>';
}

function recordItem(r) {
  const lbl = {'청소점검':'청소 점검','온도·습도':'온도·습도','제조위생':'제조 위생','방충방서':'방충·방서'}[r.type]||r.type;
  const title = r.type==='온도·습도' ? `온도 ${r.온도}°C / 습도 ${r.습도}%` : lbl;
  return `<div class="record-row" onclick="openHygieneEditForm(${r.id})">
    <div class="record-left">
      <div class="record-title">${title}</div>
      <div class="record-sub">${r.date||''} ${r.이슈?'· ⚠️ '+r.이슈:''}</div>
    </div>
    <div class="record-right">
      <div class="record-type-label">${lbl}</div>
      <span class="badge ${r.status==='완료'?'badge-green':r.status==='문제임박'?'badge-orange':'badge-gray'}">${r.status||''}</span>
    </div>
  </div>`;
}

function selectDate(ds) { selectedDate = selectedDate===ds ? null : ds; renderTab('hygiene'); }
function clearDateFilter() { selectedDate = null; renderTab('hygiene'); }

/* ════ 문서 출력 ════ */
async function renderOutput(el) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth()+1;
  const [hyg, batches] = await Promise.all([DB.getAll('hygiene'), DB.getAll('batches')]);
  const allDates = [...hyg.map(h=>h.date),...batches.map(b=>b.date)].filter(Boolean).sort();
  const earliest = allDates[0]||`${y}-01`;
  const ey = +earliest.slice(0,4), em = +earliest.slice(5,7);

  const periodDocs = [
    {key:'cover',icon:'ti-id-badge',      name:'정기감시 제출용 표지',  sub:'업체·기간 자동 기재',           def:true},
    {key:'mh',  icon:'ti-clipboard-check',name:'위생점검기록서',         sub:'R-MH-01 청소 · R-MH-02 방충방서',def:true},
    {key:'mms', icon:'ti-package',         name:'원료입고기록서',          sub:'R-MMS-01 · 전체 원료',           def:true},
    {key:'qcm', icon:'ti-check',           name:'완제품출하검사기록서',   sub:'R-QCM-01/02 · 보관검체 포함',    def:true},
  ];
  const batchDocs = [
    {key:'mi',icon:'ti-file-description',name:'제조지시서',  sub:'EF-MI · 원료배합표 포함'},
    {key:'tr',icon:'ti-microscope',       name:'시험성적서',  sub:'EF-TR · KCL + 자사 육안검사'},
    {key:'ps',icon:'ti-book',             name:'제품표준서',  sub:'EF-PS · 전성분 포함'},
  ];

  el.innerHTML = `
    <div class="page-header"><h2 class="page-title">문서 출력</h2></div>

    <div class="section-label">출력 기간 설정</div>
    <div class="output-range-card">
      <div class="range-row">
        <span class="range-label">시작</span>
        <div class="range-inputs">
          <input type="number" id="s-year"  value="${ey}" min="2024" max="${y+1}" style="width:68px">년
          <input type="number" id="s-month" value="${em}" min="1" max="12" style="width:46px">월
        </div>
      </div>
      <div class="range-divider">~</div>
      <div class="range-row">
        <span class="range-label">종료</span>
        <div class="range-inputs">
          <input type="number" id="e-year"  value="${y}" min="2024" max="${y+1}" style="width:68px">년
          <input type="number" id="e-month" value="${m}" min="1" max="12" style="width:46px">월
        </div>
      </div>
    </div>

    <div class="section-label mt16">📋 기간별 문서 선택</div>
    <div class="doc-select-list">
      ${periodDocs.map(d=>`
        <label class="doc-check-row">
          <input type="checkbox" id="chk-${d.key}" ${d.def?'checked':''}>
          <div class="doc-check-info">
            <div class="doc-check-name"><i class="ti ${d.icon}" style="color:var(--teal)"></i> ${d.name}</div>
            <div class="doc-check-sub">${d.sub}</div>
          </div>
        </label>`).join('')}
    </div>

    <div class="section-label mt16">📦 품목별 문서 선택</div>
    <div class="doc-select-list" style="margin-bottom:8px">
      ${batchDocs.map(d=>`
        <label class="doc-check-row">
          <input type="checkbox" id="chk-${d.key}" checked>
          <div class="doc-check-info">
            <div class="doc-check-name"><i class="ti ${d.icon}" style="color:var(--teal)"></i> ${d.name}</div>
            <div class="doc-check-sub">${d.sub}</div>
          </div>
        </label>`).join('')}
    </div>

    <div class="section-label">출력할 제품 선택</div>
    <div class="doc-select-list" style="margin-bottom:6px">
      ${batches.length===0
        ? `<div class="empty-hint" style="padding:14px">등록된 제품이 없습니다</div>`
        : batches.map(b=>`
          <label class="doc-check-row">
            <input type="checkbox" class="batch-chk" data-id="${b.id}" checked>
            <div class="doc-check-info">
              <div class="doc-check-name">${b.제품명||''}</div>
              <div class="doc-check-sub">${b.문서번호||''} · ${b.date||''} · <span class="badge ${badgeClass(b.상태)}" style="font-size:10px">${b.상태||''}</span></div>
            </div>
          </label>`).join('')}
    </div>
    <div style="display:flex;gap:8px;padding:0 0 12px">
      <button class="btn-sm" onclick="toggleAllBatches(true)">전체 선택</button>
      <button class="btn-sm" onclick="toggleAllBatches(false)">전체 해제</button>
    </div>

    <button class="output-btn" onclick="generatePDF()">
      <i class="ti ti-printer"></i> 선택한 문서 PDF 생성
    </button>

    <div class="section-label mt20">📁 파일 업로드로 자동 작성</div>
    <div style="padding:0 16px 8px;font-size:12px;color:var(--text3)">기존 docx 파일을 업로드하면 내용을 자동으로 읽어 DB에 저장합니다</div>
    <div class="dropzone" onclick="document.getElementById('file-upload').click()" id="dropzone-area"
         ondragover="event.preventDefault();this.style.borderColor='var(--teal-dark)'"
         ondrop="handleFileDrop(event)">
      <div class="dropzone-icon">📄</div>
      <div class="dropzone-text">파일을 드래그하거나 탭해서 선택</div>
      <div class="dropzone-sub">지원: .docx · 제조지시서, 위생점검, 원료입고기록서</div>
    </div>
    <input type="file" id="file-upload" accept=".docx,.txt" style="display:none" onchange="handleFileUpload(event)">
    <div id="upload-result" style="padding:0 16px;font-size:12px;color:var(--teal-dark)"></div>

    <div class="section-label mt20">🗂 과거 이력 조회</div>
    <div id="history-section"></div>`;

  renderHistory(document.getElementById('history-section'), hyg, batches);
}

function toggleAllBatches(val) { document.querySelectorAll('.batch-chk').forEach(c=>c.checked=val); }

/* 파일 업로드 처리 */
function handleFileDrop(e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) processUploadedFile(file);
}
function handleFileUpload(e) {
  const file = e.target.files[0];
  if (file) processUploadedFile(file);
}
async function processUploadedFile(file) {
  const el = document.getElementById('upload-result');
  el.innerHTML = '⏳ 파일 분석 중...';
  try {
    const text = await file.text();
    const name = file.name.toLowerCase();
    if (name.includes('제조지시서') || name.includes('mi')) {
      el.innerHTML = '✅ 제조지시서 파일이 감지되었습니다. 내용을 확인 후 배치 추가 폼에서 수동 입력해주세요.';
    } else if (name.includes('위생') || name.includes('mh')) {
      el.innerHTML = '✅ 위생점검 파일이 감지되었습니다. 위생점검 탭에서 기록을 추가해주세요.';
    } else if (name.includes('원료') || name.includes('mms')) {
      el.innerHTML = '✅ 원료입고 파일이 감지되었습니다. 재료·재고 탭에서 확인해주세요.';
    } else {
      el.innerHTML = `📄 <b>${file.name}</b> 업로드 완료. docx 파일은 내용 파싱이 제한될 수 있습니다.`;
    }
  } catch(e) {
    el.innerHTML = '❌ 파일 읽기 실패: ' + e.message;
  }
}

/* 과거 이력 */
function renderHistory(el, hyg, batches) {
  const months = {};
  [...hyg,...batches].forEach(r=>{
    const d = r.date||(r.createdAt&&r.createdAt.slice(0,10));
    if(!d) return;
    const ym = d.slice(0,7);
    if(!months[ym]) months[ym]={hyg:[],batch:[]};
    if(r.type) months[ym].hyg.push(r); else months[ym].batch.push(r);
  });
  const sorted = Object.keys(months).sort().reverse();
  if(!sorted.length){el.innerHTML='<div class="empty-hint">기록된 이력이 없습니다</div>';return;}
  el.innerHTML = sorted.map(ym=>`
    <div class="history-month-row" onclick="toggleHistory(this)">
      <div class="history-month-title">${ym.replace('-','년 ')}월</div>
      <div class="history-month-cnt">
        <span class="badge badge-green">위생 ${months[ym].hyg.length}건</span>
        ${months[ym].batch.length?`<span class="badge badge-mauve ml4">배치 ${months[ym].batch.length}건</span>`:''}
      </div>
      <i class="ti ti-chevron-down" style="color:var(--text3);font-size:14px;margin-left:auto"></i>
    </div>
    <div class="history-detail hide">
      ${months[ym].hyg.map(r=>`
        <div class="history-item" onclick="openHygieneEditForm(${r.id})" style="cursor:pointer">
          <span class="history-date">${r.date||''}</span>
          <span class="history-type">${r.type||''}</span>
          <span class="badge ${r.status==='완료'?'badge-green':'badge-orange'}">${r.status||''}</span>
          <i class="ti ti-edit" style="color:var(--text3);margin-left:auto"></i>
        </div>`).join('')}
      ${months[ym].batch.map(b=>`
        <div class="history-item" onclick="openBatchForm(${b.id})" style="cursor:pointer">
          <span class="history-date">${b.date||''}</span>
          <span class="history-type">${b.제품명||''}</span>
          <span class="badge ${badgeClass(b.상태)}">${b.상태||''}</span>
          <i class="ti ti-edit" style="color:var(--text3);margin-left:auto"></i>
        </div>`).join('')}
      <button class="btn-sm" style="margin:8px 14px" onclick="printRangeMonth('${ym}')">이 달 PDF 출력</button>
    </div>`).join('');
}

function toggleHistory(row) {
  const d=row.nextElementSibling; d.classList.toggle('hide');
  const ic=row.querySelector('.ti-chevron-down');
  if(ic) ic.style.transform=d.classList.contains('hide')?'':'rotate(180deg)';
}

async function printRangeMonth(ym) {
  const [y,m]=ym.split('-').map(Number);
  const [hyg,ing,batches]=await Promise.all([DB.getAll('hygiene'),DB.getAll('ingredients'),DB.getAll('batches')]);
  const sep='<div class="page-break"></div>';
  openPrint(buildCover(y,m,y,m)+sep+buildMH(hyg,y,m)+sep+buildMMS(ing)+sep+buildQCM(batches));
}

/* ════ 원료 폼 ════ */
async function openIngForm(id, defaultType) {
  const list = await DB.getAll('ingredients');
  const item = id ? list.find(i=>i.id===id) : {};
  const type = (item&&item.stockType)||defaultType||stockSubTab||'원료';
  const ingCats = ['베이스오일','버터·왁스','가성소다','정제수','첨가물·기능성','향료·색소','기타'];
  const pkgCats = ['단상자','선물박스','크라프트박스','라벨·스티커','수축필름','포장지','리본·끈','완충재','기타포장'];
  const cats = type==='포장재'?pkgCats:ingCats;

  showSheet(`
    <div class="sheet-handle"></div>
    <div class="sheet-inner">
    <div class="sheet-title">${id?(type==='포장재'?'포장재 수정':'원료 수정'):(type==='포장재'?'포장재 추가':'원료 추가')}</div>
    <label>구분<select id="f0" onchange="updateIngCats(this.value)">
      <option ${type==='원료'?'selected':''}>원료</option>
      <option ${type==='포장재'?'selected':''}>포장재</option>
    </select></label>
    <label>원료명 / 포장재명<input id="f1" value="${(item&&item.원료명)||''}"></label>
    <label>제조처 / 공급처<input id="f2" value="${(item&&item.제조처)||''}"></label>
    <label>수량 / 재고<input id="f3" value="${(item&&item.수량)||''}" placeholder="예: 500g, 100개"></label>
    <label>입고일<input type="date" id="f8" value="${(item&&item.입고일)||''}"></label>
    <label>카테고리<select id="f4">${cats.map(c=>`<option ${item&&item.category===c?'selected':''}>${c}</option>`).join('')}</select></label>
    <label>CoA 수취<select id="f5">${['수취','미수취','미기입','해당없음'].map(c=>`<option ${item&&item.CoA===c?'selected':''}>${c}</option>`).join('')}</select></label>
    <label>판정<select id="f6">${['적합','부적합','미기입'].map(c=>`<option ${item&&item.판정===c?'selected':''}>${c}</option>`).join('')}</select></label>
    <label>비고<input id="f7" value="${(item&&item.비고)||''}"></label>
    <div class="sheet-btns">
      ${id?`<button class="btn-del" onclick="delItem('ingredients',${id})">삭제</button>`:''}
      <button onclick="closeSheet()">취소</button>
      <button class="btn-save" onclick="saveIng(${id||'null'})">저장</button>
    </div>
    </div>`);
}

function updateIngCats(type) {
  const ingCats=['베이스오일','버터·왁스','가성소다','정제수','첨가물·기능성','향료·색소','기타'];
  const pkgCats=['단상자','선물박스','크라프트박스','라벨·스티커','수축필름','포장지','리본·끈','완충재','기타포장'];
  const sel=document.getElementById('f4');
  if(sel) sel.innerHTML=(type==='포장재'?pkgCats:ingCats).map(c=>`<option>${c}</option>`).join('');
}

async function saveIng(id) {
  const type=v('f0');
  const data={원료명:v('f1'),제조처:v('f2'),수량:v('f3'),입고일:v('f8'),category:v('f4'),CoA:v('f5'),판정:v('f6'),비고:v('f7'),stockType:type};
  if(id) await DB.put('ingredients',{...data,id}); else await DB.add('ingredients',data);
  stockSubTab=type; closeSheet(); await renderTab('stock');
}

/* ════ 배치 폼 ════ */
async function openBatchForm(id) {
  const list = await DB.getAll('batches');
  const item = id ? list.find(b=>b.id===id) : {};
  let nextMI = '';
  if(!id) {
    const nums=list.map(b=>b.문서번호).filter(Boolean).map(n=>parseInt(n.replace(/[^0-9]/g,'')||'0')).filter(n=>!isNaN(n));
    nextMI=`EF-MI-${String((nums.length?Math.max(...nums):5)+1).padStart(3,'0')}`;
  }

  showSheet(`
    <div class="sheet-handle"></div>
    <div class="sheet-inner">
    <div class="sheet-title">${id?'배치 수정 ('+((item&&item.제품명)||'')+')':'새 배치 추가'}</div>
    <label>제품명<input id="b1" value="${(item&&item.제품명)||''}"></label>
    <label>문서번호 (EF-MI)<input id="b2" value="${(item&&item.문서번호)||nextMI}" placeholder="${nextMI}"></label>
    <label>제조번호<input id="b3" value="${(item&&item.제조번호)||''}"></label>
    <label>제조일<input type="date" id="b4" value="${(item&&item.date)||''}"></label>
    <label>제조방법<select id="b5">
      <option ${item&&item.제조방법==='CP법'?'selected':''}>CP법</option>
      <option ${item&&item.제조방법==='MP법'?'selected':''}>MP법</option>
    </select></label>
    <label>투입량 (g)<input type="number" id="b6" value="${(item&&item.투입량)||''}"></label>
    <label>이론수량 (ea)<input type="number" id="b7" value="${(item&&item.이론수량)||''}"></label>
    <label>실제수량 (ea)<input type="number" id="b8" value="${(item&&item.실제수량)||''}"></label>
    <label>상태<select id="b9">${['제조중','숙성중','판매중','완료','부적합'].map(s=>`<option ${item&&item.상태===s?'selected':''}>${s}</option>`).join('')}</select></label>
    <label>바코드<input id="b15" value="${(item&&item.바코드)||''}"></label>
    <label>목표 중량<input id="b16" value="${(item&&item.목표중량)||'90g ±5g'}"></label>
    <label>실측 중량 (g) — 출하검사 시 직접 기입<input type="number" id="b17" placeholder="예: 100" value="${(item&&item.실측중량)||''}"></label>
    <label>색상 기준<input id="b18" value="${(item&&item.색상기준)||''}"></label>
    <label>색상 결과<input id="b19" value="${(item&&item.색상결과)||'이상없음'}"></label>
    <label>KCL 접수번호<input id="b10" value="${(item&&item.KCL)||''}"></label>
    <label>KCL 접수일<input type="date" id="b20" value="${(item&&item.KCL접수일)||''}"></label>
    <label>KCL 발행번호<input id="b21" value="${(item&&item.KCL발행번호)||''}"></label>
    <label>KCL 발행일<input type="date" id="b22" value="${(item&&item.KCL발행일)||''}"></label>
    <label>CT 성적서번호<input id="b23" value="${(item&&item.CT)||''}"></label>
    <label>CT 내용량 (g)<input id="b24" value="${(item&&item.CT내용량)||''}"></label>
    <label>CT 발행일<input type="date" id="b25" value="${(item&&item.CT발행일)||''}"></label>
    <label>내용량 결과 (%)<input id="b11" placeholder="예: 103" value="${(item&&item.내용량)||''}"></label>
    <label>유리알칼리 결과<input id="b12" placeholder="예: 검출 안 됨" value="${(item&&item.유리알칼리)||''}"></label>
    <label>알레르기 유발성분<input id="b30" value="${(item&&item.알레르기)||''}"></label>
    <label>전성분<textarea id="b26" rows="3">${(item&&item.전성분)||''}</textarea></label>
    <label>이상여부<select id="b13">
      <option ${item&&item.이상==='이상없음'?'selected':''}>이상없음</option>
      <option ${item&&item.이상==='이상있음'?'selected':''}>이상있음</option>
    </select></label>
    <label>비고<input id="b14" value="${(item&&item.비고)||''}"></label>
    <div class="sheet-btns">
      ${id?`<button class="btn-del" onclick="delItem('batches',${id})">삭제</button>`:''}
      <button onclick="closeSheet()">취소</button>
      <button class="btn-save" onclick="saveBatch(${id||'null'})">저장</button>
    </div>
    </div>`);
}

async function saveBatch(id) {
  const data = {
    제품명:v('b1'),문서번호:v('b2'),제조번호:v('b3'),date:v('b4'),
    제조방법:v('b5'),투입량:+v('b6'),이론수량:+v('b7'),실제수량:+v('b8'),
    상태:v('b9'),바코드:v('b15'),목표중량:v('b16'),
    실측중량:v('b17')?+v('b17'):null,
    색상기준:v('b18'),색상결과:v('b19'),
    KCL:v('b10'),KCL접수일:v('b20'),KCL발행번호:v('b21'),KCL발행일:v('b22'),
    CT:v('b23'),CT내용량:v('b24'),CT발행일:v('b25'),
    내용량:v('b11'),유리알칼리:v('b12'),
    알레르기:v('b30'),전성분:v('b26'),
    이상:v('b13'),비고:v('b14')
  };
  // 기존 레시피 보존
  if(id){
    const existing = await DB.getOne('batches',id);
    if(existing&&existing.레시피) data.레시피=existing.레시피;
    await DB.put('batches',{...data,id});
  } else {
    await DB.add('batches',data);
  }
  closeSheet(); await renderTab('manufacture');
}

/* ════ 위생 폼 ════ */
function openHygieneForm(preDate) {
  const ds = preDate||today.toISOString().split('T')[0];
  showSheet(`
    <div class="sheet-handle"></div>
    <div class="sheet-inner">
    <div class="sheet-title">위생 점검 기록</div>
    <label>점검일<input type="date" id="h1" value="${ds}"></label>
    <label>점검 유형
      <select id="h2" onchange="updateHygExtra()">
        <option>청소점검</option>
        <option>온도·습도</option>
        <option>제조위생</option>
        <option>방충방서</option>
      </select>
    </label>
    <div id="h-extra"></div>
    <label>이슈 내용<input id="h5" placeholder="이상 없으면 비워두세요"></label>
    <label>확인자<input id="h6" value="변민정"></label>
    <div class="sheet-btns">
      <button onclick="closeSheet()">취소</button>
      <button class="btn-save" onclick="saveHyg(null)">저장</button>
    </div>
    </div>`);
  updateHygExtra();
}

async function openHygieneEditForm(id) {
  const list = await DB.getAll('hygiene');
  const r = list.find(h=>h.id===id);
  if(!r) return;
  showSheet(`
    <div class="sheet-handle"></div>
    <div class="sheet-inner">
    <div class="sheet-title">위생 점검 수정</div>
    <label>점검일<input type="date" id="h1" value="${r.date||''}"></label>
    <label>점검 유형
      <select id="h2" onchange="updateHygExtra()">
        ${['청소점검','온도·습도','제조위생','방충방서'].map(t=>`<option ${r.type===t?'selected':''}>${t}</option>`).join('')}
      </select>
    </label>
    <div id="h-extra"></div>
    <label>이슈 내용<input id="h5" value="${r.이슈||''}"></label>
    <label>확인자<input id="h6" value="${r.확인자||'변민정'}"></label>
    <div class="sheet-btns">
      <button class="btn-del" onclick="delItem('hygiene',${id})">삭제</button>
      <button onclick="closeSheet()">취소</button>
      <button class="btn-save" onclick="saveHyg(${id})">저장</button>
    </div>
    </div>`);
  // 기존 값 채우기
  setTimeout(()=>{
    updateHygExtra();
    if(r.type==='온도·습도'){
      const t=document.getElementById('h3'),h=document.getElementById('h4');
      if(t)t.value=r.온도||''; if(h)h.value=r.습도||'';
    } else if(r.type==='방충방서'){
      const s=document.getElementById('h-screen'),p=document.getElementById('h-pest'),ro=document.getElementById('h-rodent');
      if(s)s.value=r.방충망||'양호'; if(p)p.value=r.해충||'없음'; if(ro)ro.value=r.설치류||'없음';
    } else if(r.type==='청소점검'&&r.items){
      ['원료보관','부자재','완제품','작업대','도구류','포장실'].forEach(k=>{
        const el=document.getElementById('h-'+k);
        if(el)el.value=r.items[k]||'청결';
      });
    }
  },50);
}

function updateHygExtra() {
  const sel=document.getElementById('h2'), el=document.getElementById('h-extra');
  if(!sel||!el) return;
  if(sel.value==='온도·습도') {
    el.innerHTML=`<label>온도 (°C)<input type="number" id="h3" placeholder="예: 23"></label>
                  <label>습도 (%)<input type="number" id="h4" placeholder="예: 58"></label>`;
  } else if(sel.value==='방충방서') {
    el.innerHTML=`<label>방충망 상태<select id="h-screen"><option>양호</option><option>불량</option></select></label>
                  <label>해충 발견<select id="h-pest"><option>없음</option><option>있음</option></select></label>
                  <label>설치류<select id="h-rodent"><option>없음</option><option>있음</option></select></label>`;
  } else if(sel.value==='청소점검') {
    el.innerHTML=`
      <label>원료보관<select id="h-원료보관"><option>청결</option><option>불량</option></select></label>
      <label>부자재보관<select id="h-부자재"><option>청결</option><option>불량</option></select></label>
      <label>완제품보관<select id="h-완제품"><option>청결</option><option>불량</option></select></label>
      <label>작업대(칭량)<select id="h-작업대"><option>청결</option><option>불량</option></select></label>
      <label>도구류(조제)<select id="h-도구류"><option>청결</option><option>불량</option></select></label>
      <label>포장실<select id="h-포장실"><option>청결</option><option>불량</option></select></label>`;
  } else {
    el.innerHTML='';
  }
}

async function saveHyg(id) {
  const type=v('h2');
  const data={date:v('h1'),type,확인자:v('h6'),이슈:v('h5'),status:'완료'};
  if(type==='온도·습도'){
    data.온도=+v('h3'); data.습도=+v('h4');
    if(data.온도>35||data.습도>80) data.status='문제임박';
  } else if(type==='방충방서'){
    data.방충망=v('h-screen')||'양호';
    data.해충=v('h-pest')||'없음';
    data.설치류=v('h-rodent')||'없음';
    if(data.해충==='있음'||data.설치류==='있음') data.status='문제임박';
  } else if(type==='청소점검'){
    data.items={
      원료보관:v('h-원료보관')||'청결',
      부자재:v('h-부자재')||'청결',
      완제품:v('h-완제품')||'청결',
      작업대:v('h-작업대')||'청결',
      도구류:v('h-도구류')||'청결',
      포장실:v('h-포장실')||'청결'
    };
  }
  if(id) await DB.put('hygiene',{...data,id}); else await DB.add('hygiene',data);
  closeSheet(); await renderTab('hygiene');
}

/* ════ 공통 유틸 ════ */
function v(id) { const el=document.getElementById(id); return el?el.value:''; }
function drow(l,val) { return `<div class="drow"><span class="drow-l">${l}</span><span class="drow-r">${val||'-'}</span></div>`; }
function badgeClass(val) {
  const g=['적합','판매중','완료','이상없음','수취'];
  const a=['미기입','미수취','숙성중','제조중'];
  const r=['부적합','이상있음','문제임박'];
  if(g.includes(val)) return 'badge-green';
  if(a.includes(val)) return 'badge-orange';
  if(r.includes(val)) return 'badge-red';
  return 'badge-gray';
}
function toggleCard(hd) { hd.nextElementSibling.classList.toggle('hide'); }
function toggleCheck(item) {
  const done=item.classList.toggle('checked');
  const c=item.querySelector('.check-circle');
  if(c) c.innerHTML=done?'<i class="ti ti-check"></i>':'';
}
async function saveChecklist() {
  await DB.add('hygiene',{date:today.toISOString().split('T')[0],type:'제조위생',확인자:'변민정',status:'완료'});
  alert('제조 점검 완료가 저장되었습니다.');
  await renderTab('mfcheck');
}
function changeMonth(d) {
  calMonth+=d;
  if(calMonth<0){calMonth=11;calYear--;} if(calMonth>11){calMonth=0;calYear++;}
  renderTab('hygiene');
}
function selectDate(ds) { selectedDate=selectedDate===ds?null:ds; renderTab('hygiene'); }
function clearDateFilter() { selectedDate=null; renderTab('hygiene'); }

function showSheet(html) {
  document.getElementById('sheet-body').innerHTML=html;
  document.getElementById('sheet').classList.remove('hide');
  document.getElementById('sheet-overlay').classList.remove('hide');
}
function closeSheet() {
  document.getElementById('sheet').classList.add('hide');
  document.getElementById('sheet-overlay').classList.add('hide');
}
async function delItem(store, id) {
  if(!confirm('삭제할까요?')) return;
  await DB.remove(store,id); closeSheet(); await renderTab(currentTab);
}

/* ════ window 노출 ════ */
window.switchStockTab=switchStockTab;
window.openIngForm=openIngForm; window.saveIng=saveIng; window.updateIngCats=updateIngCats;
window.openBatchForm=openBatchForm; window.saveBatch=saveBatch;
window.openHygieneForm=openHygieneForm; window.openHygieneEditForm=openHygieneEditForm;
window.updateHygExtra=updateHygExtra; window.saveHyg=saveHyg;
window.closeSheet=closeSheet; window.delItem=delItem;
window.toggleCard=toggleCard; window.toggleCheck=toggleCheck; window.saveChecklist=saveChecklist;
window.changeMonth=changeMonth; window.selectDate=selectDate; window.clearDateFilter=clearDateFilter;
window.toggleHistory=toggleHistory; window.printRangeMonth=printRangeMonth;
window.toggleAllBatches=toggleAllBatches;
window.handleFileDrop=handleFileDrop; window.handleFileUpload=handleFileUpload;

document.addEventListener('DOMContentLoaded', init);

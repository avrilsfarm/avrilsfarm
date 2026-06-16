'use strict';

/* ════ 상태 ════ */
let currentTab  = 'stock';
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
  el.innerHTML = '<div style="padding:48px;text-align:center;color:var(--text3)"><i class="ti ti-loader" style="font-size:28px;animation:spin 1s linear infinite"></i></div>';
  try {
    if      (tab === 'stock')       await renderStock(el);
    else if (tab === 'manufacture') await renderManufacture(el);
    else if (tab === 'mfcheck')     await renderMfCheck(el);
    else if (tab === 'hygiene')     await renderHygiene(el);
    else if (tab === 'production')  await renderProduction(el);
    else if (tab === 'output')      await renderOutput(el);
    else if (tab === 'notify')      renderNotifySettings(el);
    else if (tab === 'barcode')     await renderBarcode(el);
  } catch(e) {
    el.innerHTML = `<div style="padding:24px;color:var(--red-text)">오류: ${e.message}</div>`;
    console.error(e);
  }
  try { await updateBadges(); } catch(e) {}
}

async function updateBadges() {
  const ing = await DB.getAll('ingredients');
  const hyg = await DB.getAll('hygiene');
  const pending = ing.filter(i => i.판정 === '미기입').length;
  const hb = document.getElementById('badge-hygiene');
  const overdue = checkOverdue(hyg);
  const cnt = pending + (overdue ? 1 : 0);
  if (hb) { hb.textContent = cnt > 0 ? cnt : ''; hb.style.display = cnt > 0 ? 'inline' : 'none'; }
}

function checkOverdue(hyg) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay()+6)%7));
  const mondayStr = monday.toISOString().split('T')[0];
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const hasClean = hyg.some(h => h.type==='청소점검' && h.date >= mondayStr);
  const hasPest  = hyg.some(h => h.type==='방충방서' && h.date?.startsWith(thisMonthStr));
  return !hasClean || !hasPest;
}

/* ═══════════════════════════════════
   원료 재고 — 카테고리별 연속 번호
════════════════════════════════════*/
async function renderStock(el) {
  const all = await DB.getAll('ingredients');
  const ingList = all.filter(i => i.stockType !== '포장재');
  const pkgList = all.filter(i => i.stockType === '포장재');
  const list = stockSubTab === '원료' ? ingList : pkgList;
  const cats = [...new Set(list.map(i => i.category))];
  const ok = list.filter(i => i.판정 === '적합').length;
  const pending = list.filter(i => i.판정 === '미기입').length;

  /* 카테고리별로 각각 1번부터 순서 번호 부여 */
  const catCounters = {};

  el.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">원료 재고</h2>
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
      ? `<div class="empty-hint"><div class="empty-icon">📦</div>등록된 ${stockSubTab}이 없습니다<br><small>아래 + 버튼으로 추가하세요</small></div>`
      : cats.map(cat => {
          const catItems = list.filter(i => i.category === cat);
          return `
          <div class="group-header">${cat}</div>
          ${catItems.map((i, catIdx) => `
            <div class="list-item" onclick="openIngForm(${i.id})">
              <div class="item-no">${catIdx + 1}</div>
              <div class="item-left">
                <div class="item-title">${i.원료명}</div>
                <div class="item-sub">${i.제조처||''}${i.수량?' · '+i.수량:''}${i.입고일?' · '+i.입고일:''}</div>
              </div>
              <div class="item-right">
                <span class="badge ${badgeClass(i.판정)}">${i.판정}</span>
                <span class="badge ${i.CoA==='수취'?'badge-green':'badge-orange'}">CoA ${i.CoA}</span>
              </div>
            </div>`).join('')}
          `;
        }).join('')}
    <button class="fab" onclick="openIngForm(null,'${stockSubTab}')"><i class="ti ti-plus"></i> 원료 추가</button>`;
}

function switchStockTab(tab) { stockSubTab = tab; renderTab('stock'); }

/* ═══════════════════════════════════
   제품 제조 — 바로 서류 출력 버튼 추가
════════════════════════════════════*/
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
    ${list.length===0 ? `<div class="empty-hint"><div class="empty-icon">🧪</div>등록된 배치가 없습니다<br><small>아래 + 버튼으로 추가하세요</small></div>` : ''}
    ${list.map((b, idx) => `
      <div class="card-block">
        <div class="card-top" onclick="toggleCard(this)">
          <div class="card-num">${idx+1}</div>
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
          ${drow('이론/실제 수량 (1kg 몰드 기준)', (b.이론수량||'-')+'ea / '+(b.실제수량||'-')+'ea')}
          ${drow('목표 중량', b.목표중량||'90g ±5g')}
          ${drow('실측 중량', b.실측중량?b.실측중량+'g':'-')}
          ${drow('KCL 성적서', b.KCL||'미등록')}
          ${drow('내용량', b.내용량?b.내용량+'% (기준 97% 이상)':'-')}
          ${drow('유리알칼리', b.유리알칼리?b.유리알칼리+' (기준 0.1% 이하)':'-')}
          ${drow('알레르기 유발성분', b.알레르기||'-')}
          ${drow('이상 여부', b.이상||'-')}
          ${b.레시피&&b.레시피.length ? `
            <div style="margin-top:8px;font-size:11px;font-weight:700;color:var(--teal-dark);padding-bottom:4px">원료 배합표 (1kg 몰드 기준)</div>
            <div style="overflow-x:auto">
            <table class="recipe-table">
              <thead><tr><th>No</th><th>원료명</th><th>INCI명칭</th><th>이론량(g)</th><th>비율(%)</th></tr></thead>
              <tbody>
                ${b.레시피.map((r,i)=>`<tr><td>${i+1}</td><td>${r.원료명||''}</td><td style="font-size:10px;color:var(--text3)">${r.INCI||''}</td><td>${r.이론량||''}</td><td>${r.비율||''}</td></tr>`).join('')}
                <tr><td colspan="3">합계</td><td>${b.투입량||''}</td><td>100</td></tr>
              </tbody>
            </table></div>` : ''}
          ${b.비고 ? drow('비고', b.비고) : ''}
          <div style="padding:10px 0 4px;display:flex;gap:8px">
            <button class="btn-sm solid" style="flex:1" onclick="quickPrintBatch(${b.id})">
              <i class="ti ti-printer"></i> 이 배치 서류 출력
            </button>
          </div>
        </div>
      </div>`).join('')}
    <button class="fab" onclick="openBatchForm()"><i class="ti ti-plus"></i> 배치 추가</button>`;
}

/* 제품 제조 탭에서 바로 PDF 출력 */
async function quickPrintBatch(batchId) {
  const batch = await DB.getOne('batches', batchId);
  if(!batch) return;
  if(typeof generatePDF === 'function') {
    // pdf.js의 generatePDF를 특정 배치만 대상으로 호출
    await generatePDF({ singleBatchId: batchId });
  } else {
    alert('PDF 생성 기능을 불러오는 중입니다. 문서 출력 탭을 이용해 주세요.');
  }
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
    <div class="check-item" onclick="toggleCheck(this)">
      <div class="check-circle"></div>
      <span class="check-label">온도·습도 기록</span>
    </div>
    <div class="group-header mt16">완제품 출하 전</div>
    ${['외관·성상 육안검사','목표 중량 확인','표시사항(전성분·사용기한) 확인','KCL 성적서 확인'].map(item=>`
      <div class="check-item" onclick="toggleCheck(this)">
        <div class="check-circle"></div>
        <span class="check-label">${item}</span>
      </div>`).join('')}
    <button class="save-btn mt20" onclick="saveChecklist()">점검 완료 저장</button>`;
}

/* ═══════════════════════════════════
   위생 점검 — 설비점검 항목 추가
════════════════════════════════════*/
async function renderHygiene(el) {
  const hyg = await DB.getAll('hygiene');
  const ym = `${calYear}-${String(calMonth+1).padStart(2,'0')}`;
  const monthRecs = hyg.filter(h => h.date && h.date.startsWith(ym));
  const datesIssue  = new Set(hyg.filter(h=>h.status==='문제임박'&&h.date&&h.date.startsWith(ym)).map(h=>h.date));
  const datesRecord = new Set(monthRecs.map(h=>h.date));
  const displayRecs = selectedDate && selectedDate.startsWith(ym)
    ? monthRecs.filter(r=>r.date===selectedDate)
    : monthRecs;

  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay()+6)%7));
  const mondayStr = monday.toISOString().split('T')[0];
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const hasClean = hyg.some(h => h.type==='청소점검' && h.date >= mondayStr);
  const hasPest  = hyg.some(h => h.type==='방충방서' && h.date?.startsWith(thisMonthStr));
  const overdueItems = [];
  if (!hasClean) overdueItems.push('이번 주 청소점검 미기록');
  if (!hasPest)  overdueItems.push('이번 달 방충방서 미기록');

  el.innerHTML = `
    <div class="page-header"><h2 class="page-title">위생 점검 기록</h2></div>

    ${overdueItems.length > 0 ? `
      <div class="overdue-banner">
        <i class="ti ti-alert-triangle" style="font-size:16px;flex-shrink:0"></i>
        <div>
          <div style="font-weight:700;margin-bottom:2px">밀린 점검이 있습니다</div>
          <div style="font-size:11px">${overdueItems.join(' · ')}</div>
        </div>
      </div>` : ''}

    <div class="hygiene-banner" onclick="openHygieneForm()">
      <i class="ti ti-plus-circle"></i>
      <div class="hb-text">
        <div class="hb-title">오늘 점검 기록 추가</div>
        <div class="hb-sub">청소·온도습도·방충·설비 기록</div>
      </div>
      <i class="ti ti-chevron-right" style="color:var(--teal);margin-left:auto"></i>
    </div>

    <div class="cal-nav">
      <button class="cal-arrow" onclick="changeMonth(-1)"><i class="ti ti-chevron-left"></i></button>
      <span class="cal-title">${calYear}년 ${calMonth+1}월</span>
      <button class="cal-arrow" onclick="changeMonth(1)"><i class="ti ti-chevron-right"></i></button>
    </div>
    <div class="calendar">${buildCalendar(calYear, calMonth, datesRecord, datesIssue)}</div>

    <div class="records-section">
      <div class="records-month">
        <span>${selectedDate&&selectedDate.startsWith(ym)?selectedDate+' 기록':calYear+'년 '+(calMonth+1)+'월 전체'}</span>
        ${selectedDate&&selectedDate.startsWith(ym)?`
          <span style="display:flex;gap:6px">
            <button class="btn-sm" onclick="clearDateFilter()">전체보기</button>
            <button class="btn-sm solid" onclick="openHygieneForm('${selectedDate}')">+ 기록</button>
          </span>`:
          `<span class="badge ${monthRecs.length>0?'badge-green':'badge-gray'}">${monthRecs.length}건</span>`
        }
      </div>
      ${displayRecs.length > 0
        ? displayRecs.map(r => recordItem(r)).join('')
        : `<div class="empty-hint">
             <div class="empty-icon">${selectedDate&&selectedDate.startsWith(ym)?'📅':'📋'}</div>
             ${selectedDate&&selectedDate.startsWith(ym)?'이 날 기록이 없습니다':'이번 달 기록이 없습니다'}
             <br><small style="font-size:12px">위 + 버튼으로 기록하세요</small>
           </div>`}
    </div>
    <button class="fab" onclick="openHygieneForm()"><i class="ti ti-plus"></i> 점검 기록</button>`;
}

function buildCalendar(year, month, hasRecord, hasIssue) {
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month+1, 0).getDate();
  const dow = ['월','화','수','목','금','토','일'];
  let html = `<div class="cal-grid">`;
  dow.forEach(d => html += `<div class="cal-dow">${d}</div>`);
  const offset = (firstDay+6)%7;
  for (let i=0;i<offset;i++) html += `<div class="cal-day empty"></div>`;
  const todayStr = today.toISOString().split('T')[0];
  for (let d=1;d<=days;d++) {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = ds === todayStr;
    const isSel = ds === selectedDate;
    html += `<div class="cal-day${isToday?' today':''}${isSel?' selected':''}" onclick="selectDate('${ds}')">
      <span class="cal-num">${d}</span>
      ${hasIssue.has(ds)?'<span class="cal-dot dot-red"></span>':hasRecord.has(ds)?'<span class="cal-dot dot-green"></span>':''}
    </div>`;
  }
  return html + '</div>';
}

function recordItem(r) {
  const lbl = {'청소점검':'청소 점검','온도·습도':'온도·습도','제조위생':'제조 위생','방충방서':'방충·방서','설비점검':'설비 점검'}[r.type]||r.type;
  const title = r.type==='온도·습도' ? `온도 ${r.온도}°C / 습도 ${r.습도}%` : lbl;
  const icon = {'청소점검':'ti-wash','온도·습도':'ti-temperature','제조위생':'ti-flask','방충방서':'ti-bug','설비점검':'ti-tool'}[r.type]||'ti-clipboard';
  return `<div class="record-row" onclick="openHygieneEditForm(${r.id})">
    <div style="width:30px;height:30px;background:var(--teal-light);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:10px">
      <i class="ti ${icon}" style="color:var(--teal);font-size:15px"></i>
    </div>
    <div class="record-left">
      <div class="record-title">${title}</div>
      <div class="record-sub">${r.date||''} · ${r.확인자||''} ${r.이슈?'· ⚠️ '+r.이슈:''}</div>
    </div>
    <div class="record-right">
      <div class="record-type-label">${lbl}</div>
      <span class="badge ${r.status==='완료'?'badge-green':r.status==='문제임박'?'badge-orange':'badge-gray'}">${r.status||''}</span>
    </div>
  </div>`;
}

/* ═══════════════════════════════════
   생산실적 — 배치내역 제외, 판매채널 수정
════════════════════════════════════*/
async function renderProduction(el) {
  const prods = await DB.getAll('production');

  const totalQty = prods.reduce((s,p)=>s+(+p.수량||0),0);
  const byChannel = {};
  prods.forEach(p => {
    const ch = p.채널||'기타';
    byChannel[ch] = (byChannel[ch]||0) + (+p.수량||0);
  });

  el.innerHTML = `
    <div class="page-header"><h2 class="page-title">생산실적</h2></div>
    <div class="summary-row">
      <div class="sum-chip sum-mauve">기록 ${prods.length}건</div>
      <div class="sum-chip sum-green">총 ${totalQty}개</div>
    </div>

    ${Object.keys(byChannel).length > 0 ? `
    <div class="section-label">채널별 판매 현황</div>
    <div style="padding:0 16px 12px;display:flex;flex-wrap:wrap;gap:8px">
      ${Object.entries(byChannel).map(([ch,cnt])=>`
        <div style="background:var(--teal-light);border-radius:20px;padding:6px 14px;font-size:12px;color:var(--teal-dark)">
          ${ch} <strong>${cnt}개</strong>
        </div>`).join('')}
    </div>` : ''}

    <div class="section-label">생산실적 기록</div>
    ${prods.length===0?`<div class="empty-hint"><div class="empty-icon">📊</div>아직 생산실적이 없습니다<br><small>아래 + 버튼으로 추가하세요</small></div>`:''}
    ${prods.slice().reverse().map(p=>`
      <div class="list-item" onclick="openProductionForm(${p.id})">
        <div class="item-left">
          <div class="item-title">${p.제품명||''}</div>
          <div class="item-sub">${p.date||''} · ${p.수량||''}개 · ${p.유형||''} · ${p.채널||''}</div>
        </div>
        <div class="item-right">
          <span class="badge ${p.유형==='출하'?'badge-green':p.유형==='생산'?'badge-mauve':'badge-gray'}">${p.유형||''}</span>
          <button class="icon-btn" onclick="event.stopPropagation();openProductionForm(${p.id})"><i class="ti ti-edit"></i></button>
        </div>
      </div>`).join('')}
    <button class="fab" onclick="openProductionForm()"><i class="ti ti-plus"></i> 실적 추가</button>`;
}

/* ═══════════════════════════════════
   문서 출력 — 이미지 순서대로
   ① 제품별 서류 출력
   ② 월별 위생점검 출력
   ③ 파일 업로드 & 자동 등록 + 실행 버튼
   ④ 과거 이력 조회
════════════════════════════════════*/
async function renderOutput(el) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth()+1;
  const [hyg, batches] = await Promise.all([DB.getAll('hygiene'), DB.getAll('batches')]);

  el.innerHTML = `
    <div class="page-header"><h2 class="page-title">문서 출력</h2></div>

    <!-- ① 제품별 서류 출력 -->
    <div class="output-section-card">
      <div class="output-section-title">📄 제품별 서류 출력</div>
      <label class="output-field-label">제품 선택</label>
      <select id="out-product" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--card);color:var(--text);font-size:14px;margin-bottom:10px">
        <option value="">-- 제품을 선택하세요 --</option>
        ${batches.map(b=>`<option value="${b.id}">${b.제품명||''} (${b.date||''})</option>`).join('')}
      </select>
      <label class="output-field-label">출력할 서류 (1개 이상 선택)</label>
      <div class="doc-check-inline">
        ${[
          {key:'mi', name:'제조지시서'},
          {key:'tr', name:'시험성적서'},
          {key:'ps', name:'제품표준서'},
          {key:'mms', name:'원료입고기록서'},
          {key:'qcm', name:'완제품출하검사'},
          {key:'mh', name:'위생점검기록'},
        ].map(d=>`
          <label class="doc-check-pill">
            <input type="checkbox" id="chk-${d.key}" checked>
            <span>${d.name}</span>
          </label>`).join('')}
      </div>
      <button class="output-btn" onclick="generatePDF()">
        <i class="ti ti-file-type-pdf"></i> PDF 생성
      </button>
    </div>

    <!-- ② 월별 위생점검 기록 출력 -->
    <div class="output-section-card">
      <div class="output-section-title">🗒 월별 위생점검 기록 출력</div>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
        <select id="out-year" style="flex:1;padding:10px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--card);color:var(--text)">
          ${Array.from({length:3},(_,i)=>y-i).map(yr=>`<option ${yr===y?'selected':''}>${yr}</option>`).join('')}
        </select>
        <span style="color:var(--text3)">년</span>
        <select id="out-month" style="flex:1;padding:10px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--card);color:var(--text)">
          ${Array.from({length:12},(_,i)=>i+1).map(mo=>`<option ${mo===m?'selected':''}>${mo}</option>`).join('')}
        </select>
        <span style="color:var(--text3)">월</span>
      </div>
      <button class="output-btn-sec" onclick="printSelectedMonth()">
        <i class="ti ti-printer"></i> 이달의 위생점검 출력
      </button>
    </div>

    <!-- ③ 파일 업로드 & 자동 등록 -->
    <div class="output-section-card">
      <div class="output-section-title">📁 파일 업로드 & 자동 등록</div>
      <div style="font-size:12px;color:var(--text3);margin-bottom:10px">기존 docx 파일을 업로드하면 내용을 자동으로 읽어 DB에 저장합니다</div>
      <div class="dropzone" id="dropzone-area"
           ondragover="event.preventDefault();this.classList.add('drag-over')"
           ondragleave="this.classList.remove('drag-over')"
           ondrop="handleFileDrop(event)">
        <div class="dropzone-icon">📄</div>
        <div class="dropzone-text">파일을 드래그하거나 탭해서 선택</div>
        <div class="dropzone-sub">지원: .docx · 제조지시서, 위생점검, 원료입고기록서 · .json 백업</div>
        <input type="file" id="file-upload" accept=".docx,.txt,.json,.pdf" style="position:absolute;inset:0;opacity:0;cursor:pointer" onchange="handleFileUpload(event)">
      </div>
      <div id="upload-result" style="padding:8px 0;font-size:12px;min-height:28px;color:var(--text3)">파일을 선택하면 자동으로 분석합니다</div>
      <button class="output-btn-sec" id="btn-run-parse" onclick="runParseSaved()">
        <i class="ti ti-bolt"></i> 자동 작성 실행
      </button>
    </div>

    <!-- ④ 과거 이력 조회 -->
    <div class="output-section-card">
      <div class="output-section-title">🗂 과거 이력 조회</div>
      <div id="history-section"></div>
    </div>`;

  renderHistory(document.getElementById('history-section'), hyg, batches);
}

/* 선택한 월 위생점검 출력 */
async function printSelectedMonth() {
  const y = document.getElementById('out-year')?.value;
  const m = document.getElementById('out-month')?.value;
  if(!y||!m) return;
  const ym = `${y}-${String(m).padStart(2,'0')}`;
  await printRangeMonth(ym);
}

function toggleAllBatches(val) { document.querySelectorAll('.batch-chk').forEach(c=>c.checked=val); }

/* 저장된 파일 자동 작성 실행 버튼 */
let _savedFileForParse = null;
function runParseSaved() {
  if(_savedFileForParse) processUploadedFile(_savedFileForParse);
}

/* 파일 업로드 처리 */
function handleFileDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) prepareFile(file);
}
function handleFileUpload(e) {
  const file = e.target.files[0];
  if (file) prepareFile(file);
}

function prepareFile(file) {
  _savedFileForParse = file;
  const el = document.getElementById('upload-result');
  const btn = document.getElementById('btn-run-parse');
  if(el) el.innerHTML = `<span style="color:var(--teal-dark)">📎 <b>${file.name}</b> 선택됨 — 분석 실행 중...</span>`;
  // 자동 실행
  processUploadedFile(file);
}

async function processUploadedFile(file) {
  const el = document.getElementById('upload-result');
  if(!el) return;
  el.innerHTML = '<span style="color:var(--teal)">⏳ 파일 분석 중...</span>';
  const name = file.name.toLowerCase();

  try {
    if(name.endsWith('.json')) {
      const text = await file.text();
      const data = JSON.parse(text);
      if(data._exportedAt) {
        if(!confirm(`백업 파일(${new Date(data._exportedAt).toLocaleDateString()})로 데이터를 복원할까요?\n현재 데이터가 덮어씌워집니다.`)) return;
        await DB.importAll(data);
        el.innerHTML = '<span style="color:var(--teal-dark)">✅ 데이터 복원 완료!</span>';
        await renderTab(currentTab);
        return;
      }
      if(data.제품명) {
        await DB.add('batches', data);
        el.innerHTML = `<span style="color:var(--teal-dark)">✅ <b>${data.제품명}</b> 배치 등록 완료</span>`;
        return;
      }
    }

    if(name.endsWith('.docx')) {
      let text = '';
      if(window.JSZip) {
        try {
          const buf = await file.arrayBuffer();
          const zip = await JSZip.loadAsync(buf);
          const xmlFile = zip.file('word/document.xml');
          if(xmlFile) {
            const xml = await xmlFile.async('string');
            text = xml.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
          }
        } catch(zipErr) {
          text = await file.text().catch(()=>'');
        }
      } else {
        text = await file.text().catch(()=>'');
      }
      await parseDocumentText(name, text, file.name, el);
      return;
    }

    if(name.endsWith('.txt')) {
      const text = await file.text();
      await parseDocumentText(name, text, file.name, el);
      return;
    }

    if(name.endsWith('.pdf')) {
      el.innerHTML = `<span style="color:var(--teal-dark)">📋 <b>${file.name}</b> — KCL 성적서로 인식됐습니다.<br>제품 제조 탭에서 해당 배치를 수정하고 KCL 접수번호를 입력해주세요.</span>`;
      return;
    }

    el.innerHTML = `<span style="color:var(--text3)">📄 <b>${file.name}</b> 업로드됨. 지원 형식: .docx .txt .json .pdf</span>`;

  } catch(e) {
    el.innerHTML = `<span style="color:var(--red-text)">❌ 오류: ${e.message}</span>`;
  }
}

async function parseDocumentText(name, text, fileName, el) {
  const batches = await DB.getAll('batches');

  const isOrder   = name.includes('제조지시') || name.includes('-mi-') || name.includes('ef-mi');
  const isStd     = name.includes('제품표준') || name.includes('-ps-') || name.includes('ef-ps');
  const isTest    = name.includes('시험성적') || name.includes('-tr-') || name.includes('ef-tr');
  const isHygiene = name.includes('위생') || name.includes('-mh') || name.includes('r-mh');
  const isIng     = name.includes('원료') || name.includes('mms') || name.includes('r-mms');

  const productMatch = text.match(/에이브릴팜\s*([가-힣a-zA-Z]+비누)/);
  const productName  = productMatch ? productMatch[0].trim() : '';
  const docNoMatch   = text.match(/EF-[A-Z]{2}-\d{3}/i);
  const docNo        = docNoMatch ? docNoMatch[0].toUpperCase() : '';
  const barcodeMatch = text.match(/87[0-9]{11}/);
  const barcode      = barcodeMatch ? barcodeMatch[0] : '';
  const kclMatch     = text.match(/SC\d{2}-\d{5}[A-Z]/i);
  const kcl          = kclMatch ? kclMatch[0].toUpperCase() : '';

  const existing = batches.find(b => productName && b.제품명 && b.제품명.includes(productName.replace('에이브릴팜 ','')));

  if(isOrder || isStd || isTest) {
    if(existing) {
      const updated = {...existing};
      if(docNo && isOrder) updated.문서번호 = docNo;
      if(barcode) updated.바코드 = barcode;
      if(kcl) updated.KCL = kcl;
      await DB.put('batches', updated);
      el.innerHTML = `<span style="color:var(--teal-dark)">✅ <b>${existing.제품명}</b> 정보 업데이트 완료 (${fileName})</span>`;
    } else if(productName||docNo) {
      const newB = {제품명:productName||fileName.replace(/\.[^.]+$/,''), 문서번호:docNo, 바코드:barcode, KCL:kcl, 상태:'제조중'};
      await DB.add('batches', newB);
      el.innerHTML = `<span style="color:var(--teal-dark)">✅ <b>${newB.제품명}</b> 신규 배치 등록 완료 (${fileName})</span>`;
    } else {
      el.innerHTML = `<span style="color:var(--text3)">⚠️ 제품명을 찾을 수 없습니다. 배치 탭에서 직접 등록해주세요.</span>`;
    }
    await renderTab('manufacture');
  } else if(isHygiene) {
    const dateMatch = text.match(/20\d{2}[-./]\d{1,2}[-./]\d{1,2}/g);
    if(dateMatch) {
      const raw = dateMatch[0].replace(/[./]/g,'-');
      const parts = raw.split('-');
      const date = `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;
      await DB.add('hygiene',{date,type:'청소점검',확인자:'변민정',status:'완료',
        items:{원료보관:'청결',부자재:'청결',완제품:'청결',작업대:'청결',도구류:'청결',포장실:'청결'}});
      el.innerHTML = `<span style="color:var(--teal-dark)">✅ 위생점검 기록 등록 (${date})</span>`;
    } else {
      el.innerHTML = `<span style="color:var(--text3)">⚠️ 날짜 감지 실패. 위생점검 탭에서 직접 입력해주세요.</span>`;
    }
  } else if(isIng) {
    el.innerHTML = `<span style="color:var(--teal-dark)">📦 원료입고 파일 감지 — 원료 재고 탭에서 확인해주세요.</span>`;
  } else {
    el.innerHTML = `<span style="color:var(--text3)">📄 <b>${fileName}</b> 분석 완료. 파일 유형 미확인 — 해당 탭에서 직접 확인해주세요.</span>`;
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
  const hyg = await DB.getAll('hygiene');
  const monthHyg = hyg.filter(h=>h.date&&h.date.startsWith(ym));
  alert(`${y}년 ${m}월 위생점검 ${monthHyg.length}건 PDF 출력 (문서 출력 탭에서 상세 설정 가능)`);
}

/* ════ 원료 폼 ════ */
async function openIngForm(id, defaultType) {
  const list = await DB.getAll('ingredients');
  const item = id ? list.find(i=>i.id===id) : {};
  const type = (item&&item.stockType) || defaultType || '원료';
  const ingCats=['베이스오일','버터·왁스','가성소다','정제수','첨가물·기능성','향료·색소','기타'];
  const pkgCats=['단상자','선물박스','크라프트박스','라벨·스티커','수축필름','포장지','리본·끈','완충재','기타포장'];
  const cats = type==='포장재' ? pkgCats : ingCats;

  showSheet(`
    <div class="sheet-handle"></div>
    <div class="sheet-inner">
    <div class="sheet-title">${id?'원료 수정':'원료 추가'}</div>
    <label>종류<select id="f0" onchange="updateIngCats(this.value)">
      <option ${type!=='포장재'?'selected':''}>원료</option>
      <option ${type==='포장재'?'selected':''}>포장재</option>
    </select></label>
    <label>원료명 / 제품명<input id="f1" value="${(item&&item.원료명)||''}"></label>
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
    <label>이론수량 — 1kg 몰드 기준 (ea)<input type="number" id="b7" value="${(item&&item.이론수량)||''}"></label>
    <label>실제수량 — 1kg 몰드 기준 (ea)<input type="number" id="b8" value="${(item&&item.실제수량)||''}"></label>
    <label>상태<select id="b9">${['제조중','숙성중','판매중','완료','부적합'].map(s=>`<option ${item&&item.상태===s?'selected':''}>${s}</option>`).join('')}</select></label>
    <label>바코드<input id="b15" value="${(item&&item.바코드)||''}"></label>
    <label>목표 중량<input id="b16" value="${(item&&item.목표중량)||'90g ±5g'}"></label>
    <label>실측 중량 (g)<input type="number" id="b17" placeholder="예: 100" value="${(item&&item.실측중량)||''}"></label>
    <label>KCL 접수번호<input id="b10" value="${(item&&item.KCL)||''}"></label>
    <label>KCL 성적서 파일<div style="margin-top:6px;display:flex;gap:8px;align-items:center">
      <button type="button" class="btn-sm" onclick="document.getElementById('kcl-file').click()" style="flex-shrink:0">📎 파일 선택</button>
      <span id="kcl-filename" style="font-size:12px;color:var(--text3)">${(item&&item.KCL파일명)||'선택 없음'}</span>
    </div>
    <input type="file" id="kcl-file" accept=".pdf,.jpg,.jpeg,.png,.docx" style="display:none" onchange="handleKCLUpload(event)"></label>
    <label>내용량 결과 (%)<input id="b11" placeholder="예: 103" value="${(item&&item.내용량)||''}"></label>
    <label>유리알칼리 결과<input id="b12" placeholder="예: 검출 안 됨" value="${(item&&item.유리알칼리)||''}"></label>
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
    KCL:v('b10'),
    내용량:v('b11'),유리알칼리:v('b12'),
    전성분:v('b26'),
    이상:v('b13'),비고:v('b14')
  };
  if(id){
    const existing = await DB.getOne('batches',id);
    if(existing&&existing.레시피) data.레시피=existing.레시피;
    await DB.put('batches',{...data,id});
  } else {
    await DB.add('batches',data);
  }
  closeSheet(); await renderTab('manufacture');
}

function handleKCLUpload(e) {
  const file = e.target.files[0];
  const fn = document.getElementById('kcl-filename');
  if(fn && file) fn.textContent = file.name;
}

/* ═══════════════════════════════════
   위생 폼 — 설비점검 항목 추가
════════════════════════════════════*/
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
        <option>설비점검</option>
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
        ${['청소점검','온도·습도','제조위생','방충방서','설비점검'].map(t=>`<option ${r.type===t?'selected':''}>${t}</option>`).join('')}
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
        const el2=document.getElementById('h-'+k);
        if(el2)el2.value=r.items[k]||'청결';
      });
    } else if(r.type==='설비점검'&&r.items){
      ['전자저울','온습도계','제조기기','포장기기'].forEach(k=>{
        const el2=document.getElementById('h-equip-'+k);
        if(el2)el2.value=r.items[k]||'정상';
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
  } else if(sel.value==='설비점검') {
    el.innerHTML=`
      <label>전자저울<select id="h-equip-전자저울"><option>정상</option><option>이상</option><option>수리필요</option></select></label>
      <label>온습도계<select id="h-equip-온습도계"><option>정상</option><option>이상</option><option>수리필요</option></select></label>
      <label>제조기기<select id="h-equip-제조기기"><option>정상</option><option>이상</option><option>수리필요</option></select></label>
      <label>포장기기<select id="h-equip-포장기기"><option>정상</option><option>이상</option><option>수리필요</option></select></label>`;
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
  } else if(type==='설비점검'){
    data.items={
      전자저울:v('h-equip-전자저울')||'정상',
      온습도계:v('h-equip-온습도계')||'정상',
      제조기기:v('h-equip-제조기기')||'정상',
      포장기기:v('h-equip-포장기기')||'정상'
    };
    const hasIssue = Object.values(data.items).some(v=>v!=='정상');
    if(hasIssue) data.status='문제임박';
  }
  if(id) await DB.put('hygiene',{...data,id}); else await DB.add('hygiene',data);
  closeSheet(); await renderTab('hygiene');
}

/* ════ 생산실적 폼 — 판매채널 수정 가능 ════ */
async function openProductionForm(id) {
  const [list] = await Promise.all([DB.getAll('production')]);
  const item = id ? list.find(p=>p.id===id) : {};
  const ds = today.toISOString().split('T')[0];
  const batches = await DB.getAll('batches');
  showSheet(`
    <div class="sheet-handle"></div><div class="sheet-inner">
    <div class="sheet-title">${id?'생산실적 수정':'생산실적 추가'}</div>
    <label>날짜<input type="date" id="p1" value="${(item&&item.date)||ds}"></label>
    <label>제품명
      <select id="p2" onchange="document.getElementById('p2-custom-wrap').style.display=this.value==='__custom'?'block':'none'">
        ${batches.map(b=>`<option ${item&&item.제품명===b.제품명?'selected':''}>${b.제품명}</option>`).join('')}
        <option value="__custom" ${item&&item.__customName?'selected':''}>직접입력</option>
      </select>
    </label>
    <div id="p2-custom-wrap" style="${item&&item.__customName?'':'display:none'}">
      <label>제품명 직접입력<input id="p2c" value="${(item&&item.__customName)||''}"></label>
    </div>
    <label>수량 (판매 단위 개수)<input type="number" id="p3" value="${(item&&item.수량)||''}" placeholder="예: 55"></label>
    <label>유형<select id="p4">
      ${['생산','출하','반품','폐기'].map(t=>`<option ${item&&item.유형===t?'selected':''}>${t}</option>`).join('')}
    </select></label>
    <label>판매 채널
      <select id="p5" onchange="document.getElementById('p5-custom-wrap').style.display=this.value==='__custom'?'block':'none'">
        ${['아이디어스','스마트스토어','신세계 꿈상회','고향사랑기부제','직접판매','기타','직접입력'].map(c=>`
          <option value="${c==='직접입력'?'__custom':c}" ${item&&item.채널===c?'selected':''}>${c}</option>`).join('')}
      </select>
    </label>
    <div id="p5-custom-wrap" style="display:none">
      <label>채널 직접입력<input id="p5c" placeholder="예: 팝업스토어"></label>
    </div>
    <label>비고<input id="p6" value="${(item&&item.비고)||''}"></label>
    <div class="sheet-btns">
      ${id?`<button class="btn-del" onclick="delItem('production',${id})">삭제</button>`:''}
      <button onclick="closeSheet()">취소</button>
      <button class="btn-save" onclick="saveProd(${id||'null'})">저장</button>
    </div></div>`);
}

async function saveProd(id) {
  const selVal = v('p2');
  const prodName = selVal==='__custom' ? (v('p2c')||'기타') : selVal;
  const chVal = v('p5');
  const channel = chVal==='__custom' ? (v('p5c')||'기타') : chVal;
  const data = {
    date:v('p1'), 제품명:prodName, 수량:+v('p3'),
    유형:v('p4'), 채널:channel, 비고:v('p6'),
    __customName: selVal==='__custom' ? v('p2c') : undefined
  };
  if(id) await DB.put('production',{...data,id}); else await DB.add('production',data);
  closeSheet(); await renderTab('production');
}

/* ════ 바코드 탭 ════ */
async function renderBarcode(el) {
  renderBarcodeTab(el);
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
window.openBatchForm=openBatchForm; window.saveBatch=saveBatch; window.handleKCLUpload=handleKCLUpload;
window.quickPrintBatch=quickPrintBatch;
window.openHygieneForm=openHygieneForm; window.openHygieneEditForm=openHygieneEditForm;
window.updateHygExtra=updateHygExtra; window.saveHyg=saveHyg;
window.closeSheet=closeSheet; window.delItem=delItem;
window.toggleCard=toggleCard; window.toggleCheck=toggleCheck; window.saveChecklist=saveChecklist;
window.changeMonth=changeMonth; window.selectDate=selectDate; window.clearDateFilter=clearDateFilter;
window.toggleHistory=toggleHistory; window.printRangeMonth=printRangeMonth;
window.toggleAllBatches=toggleAllBatches; window.printSelectedMonth=printSelectedMonth;
window.openProductionForm=openProductionForm; window.saveProd=saveProd;
window.handleFileDrop=handleFileDrop; window.handleFileUpload=handleFileUpload;
window.parseDocumentText=parseDocumentText; window.runParseSaved=runParseSaved;
window.renderBarcode=renderBarcode;

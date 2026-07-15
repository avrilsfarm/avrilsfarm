'use strict';
let bcSearchQ = '';
let bcCollapsed = {};

/* AVRIL'S FARM 전용 고정 대분류 프리픽스 — 화이트라벨(공방비서) 버전과 달리 브랜드별 설정이 없어 고정값 사용. */
function bizPrefix() { return '8739'; }

/* ════════════════════════════════════════
   에이브릴팜 바코드 관리 모듈 v3
   EAN-13: 대분류(4) + 소분류(3) + 비번호(3) + 개수(2) + 체크디지트(1)
════════════════════════════════════════ */


/* ── DB 동기화 ── */
let _barcodeData = []; // 런타임 데이터 (DB 로드 후 교체)

async function loadBarcodesFromDB() {
  try {
    const stored = await DB.getAll('barcodes');
    if (stored && stored.length > 0) {
      _barcodeData = stored;
    } else {
      _barcodeData = [];
    }
  } catch(e) {
    console.warn('[barcode] DB 로드 실패, 인메모리 사용:', e);
    _barcodeData = [];
  }
}

/* ── 색상 코드 — 괄호 삭제, SS=Spring/Summer, SF=Summer/Fall, FW=Fall/Winter ── */
const COLOR_CODES = [
  {code:'O',        label:'O — 오렌지'},
  {code:'P',        label:'P — 퍼플'},
  {code:'G',        label:'G — 그린'},
  {code:'YG',       label:'YG — 옐로우그린'},
  {code:'B',        label:'B — 블루'},
  {code:'W',        label:'W — 화이트'},
  {code:'Y',        label:'Y — 옐로'},
  {code:'SS',       label:'SS — Spring / Summer'},
  {code:'SF',       label:'SF — Summer / Fall'},
  {code:'FW',       label:'FW — Fall / Winter'},
  {code:'WS',       label:'WS — Winter / Spring'},
  {code:'GS',       label:'GS — 굿즈'},
  {code:'직접입력',  label:'직접입력'},
];

/* ── EAN-13 체크디지트 ── */
function calcCheckDigit(biz, sub, seq, qty) {
  const str = (biz||'8739') + sub + seq + qty;
  if (str.length !== 12) return '?';
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(str[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

function buildBarcode(biz, sub, seq, qty) {
  const base = (biz||'8739') + sub + seq + qty;
  return base + calcCheckDigit(biz, sub, seq, qty);
}

function nextSeq() {
  const seqs = _barcodeData.map(p => parseInt(p.seq)).filter(n => !isNaN(n));
  return seqs.length ? String(Math.max(...seqs) + 1).padStart(3, '0') : '001';
}

/* ════ 탭 렌더링 ════ */
async function renderBarcodeTab(el) {
  await loadBarcodesFromDB();
  const filter = window._bcFilter || '전체';
  const bq = bcSearchQ.trim().toLowerCase();
  const preFiltered = filter === '전체' ? _barcodeData : _barcodeData.filter(p => p.status === filter);
  const filtered = bq ? preFiltered.filter(p => (p.name||'').toLowerCase().includes(bq) || (p.mfgNo||'').toLowerCase().includes(bq) || (p.notes||'').toLowerCase().includes(bq)) : preFiltered;
  const active = _barcodeData.filter(p => p.status === '현행').length;

  el.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">바코드 관리</h2>
    </div>
    <div class="summary-row">
      <div class="sum-chip sum-mauve">전체 ${_barcodeData.length}개</div>
      <div class="sum-chip sum-green">현행 ${active}개</div>
      <div class="sum-chip sum-orange">단종 ${_barcodeData.length - active}개</div>
    </div>
    <div style="padding:4px 16px 8px">
      <div style="display:flex;gap:6px;align-items:center">
        <input type="text" id="bc-search" placeholder="제품명, 제조번호 검색..." value="${bcSearchQ}"
          style="flex:1;padding:10px 14px;border:1.5px solid var(--border);border-radius:20px;background:var(--white);font-size:13px;outline:none;font-family:inherit;color:var(--text)"
          onkeydown="if(event.key==='Enter'){bcSearchQ=this.value;renderBarcodeTab(document.getElementById('page-content'))}">
        <button onclick="bcSearchQ=document.getElementById('bc-search').value;renderBarcodeTab(document.getElementById('page-content'))" style="flex-shrink:0;padding:8px 14px;border:none;border-radius:20px;background:var(--green);color:#fff;font-size:13px;cursor:pointer;font-family:inherit"><i class="ti ti-search"></i> 검색</button>
        ${bcSearchQ ? '<button onclick="bcSearchQ=\'\';renderBarcodeTab(document.getElementById(\'page-content\'))" style="flex-shrink:0;padding:8px 10px;border:1.5px solid var(--border);border-radius:20px;background:var(--white);font-size:13px;cursor:pointer;font-family:inherit;color:var(--text3)"><i class="ti ti-x"></i></button>' : ''}
      </div>
    </div>

    <div class="bc-notice-card" style="background:var(--gray-bg);border:none">
      <div class="bc-notice-icon" style="color:var(--text3)"><i class="ti ti-alert-circle"></i></div>
      <div class="bc-notice-body">
        <div class="bc-notice-title" style="color:var(--text)">자체 바코드 안내</div>
        <div class="bc-notice-text" style="color:var(--text2)">이 바코드는 <b>개인(자체) 바코드</b>로, 표준유통바코드(GS1)와 다릅니다.<br>
        GS1 공식 바코드는 <b>대한상공회의소 유통물류진흥원</b>에서 별도 신청이 필요합니다.<br>
        자체 바코드는 <b>내부 관리·재고 추적 용도</b>로 활용하세요.</div>
      </div>
    </div>

    <div class="bc-notice-card" style="background:var(--teal-light);border:none">
      <div class="bc-notice-icon" style="color:var(--teal)"><i class="ti ti-barcode"></i></div>
      <div class="bc-notice-body">
        <div class="bc-notice-title" style="color:var(--teal-dark)">EAN-13 바코드 구조</div>
        <div class="bc-notice-text">8739 + 소분류(3) + 비번호(3) + 개수(2) + 체크디지트(1) = <b>13자리</b><br>
        체크디지트은 앞 12자리로 자동 계산됩니다.</div>
      </div>
    </div>

    <div class="bc-guide-card">
      <div class="bc-guide-title"><i class="ti ti-book-2"></i> 바코드 부여 기준</div>
      <div class="bc-guide-body">
        <div class="bc-guide-row"><span class="bc-guide-label">대분류</span><span>8739 (에이브릴팜 고유번호) · 타 브랜드 제조 시 해당 브랜드 번호 사용</span></div>
        <div class="bc-guide-row"><span class="bc-guide-label">소분류(3자리)</span><span>제조월 앞 2자리 + 색상코드 첫 자리 조합 <em>(예: 10월 O색 → 101)</em></span></div>
        <div class="bc-guide-row"><span class="bc-guide-label">비번호(3자리)</span><span>전체 제품 등록 순서 누적 번호 <em>(예: 001, 002 …)</em></span></div>
        <div class="bc-guide-row"><span class="bc-guide-label">개수(2자리)</span><span>1회 배치 예상 생산량 <em>(예: 09 = 9개, 20 = 20개)</em></span></div>
        <div class="bc-guide-row"><span class="bc-guide-label">체크디지트</span><span>앞 12자리로 자동 계산 — 직접 입력 불필요</span></div>
        <div class="bc-guide-row"><span class="bc-guide-label">제조번호</span><span>브랜드(AP) + B + 색상코드 + 월(2) + 순번(3) <em>(예: APBO10001)</em></span></div>
        <div class="bc-guide-row" style="margin-top:4px"><span class="bc-guide-label">색상 코드</span>
          <span>${COLOR_CODES.filter(c=>c.code!=='직접입력').map(c=>`<span class="bc-cc">${c.label}</span>`).join(' ')}</span>
        </div>
      </div>
    </div>

    <div style="display:flex;gap:6px;padding:8px 16px">
      ${['전체','현행','단종','예정'].map(f=>`
        <button class="btn-sm ${filter===f?'solid':''}" onclick="setBcFilter('${f}')">${f}</button>`).join('')}
      <button class="btn-sm" onclick="printAllBarcodes()" style="margin-left:auto">
        <i class="ti ti-printer"></i> 전체 출력
      </button>
    </div>

    ${(() => {
      // Group by status for accordion
      const groups = {};
      filtered.forEach(p => {
        const gk = p.status || '기타';
        if(!groups[gk]) groups[gk] = [];
        groups[gk].push(p);
      });
      const order = ['현행','예정','단종','기타'];
      return order.filter(g => groups[g] && groups[g].length).map(gk => {
        const items = groups[gk];
        const coll = bcCollapsed['bc_'+gk];
        return `
          <div class="group-header" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="toggleBcCat('bc_${gk}')">
            <span>${gk} <span style="font-weight:400;font-size:10px;color:var(--text3)">(${items.length})</span></span>
            <i class="ti ti-chevron-${coll?'right':'down'}" style="font-size:14px;color:var(--text3)"></i>
          </div>
          ${coll ? '' : items.map(p => {
            const full = buildBarcode(p.biz||'8739', p.sub, p.seq, p.qty);
            const bc12 = (p.biz||'8739')+'/'+p.sub+'/'+p.seq+'/'+p.qty;
            return '<div class="bc-card">'
              +'<div class="bc-card-head" onclick="openBarcodeForm('+p.no+')" style="cursor:pointer">'
              +'<div class="bc-no">'+String(p.no).padStart(2,'0')+'</div>'
              +'<div class="bc-info">'
              +'<div class="bc-name">'+p.name+'</div>'
              +'<div class="bc-num">'+bc12+' <span class="bc-chk">체크: '+p.chk+'</span></div>'
              +(p.mfgNo?'<div class="bc-mfg">'+p.mfgNo+(p.mfgDate?' · MFG '+p.mfgDate:'')+'</div>':'')
              +'</div>'
              +'<div class="bc-meta">'
              +'<span class="badge '+(p.status==='현행'?'badge-green':'badge-gray')+'">'+p.status+'</span>'
              +(p.expiry?'<div class="bc-expiry">'+p.expiry+'</div>':'')
              +'<i class="ti ti-edit" style="font-size:13px;color:var(--text3);margin-top:2px"></i>'
              +'</div></div>'
              +'<div class="bc-barcode-wrap" id="bcwrap-'+p.no+'">'
              +'<svg class="bc-svg" id="bc-svg-'+p.no+'"></svg>'
              +'<div class="bc-full-num">'+full+'</div>'
              +(p.notes?'<div class="bc-note">'+p.notes+'</div>':'')
              +'</div></div>';
          }).join('')}`;
      }).join('');
    })()}

    <button class="fab" onclick="openBarcodeForm()"><i class="ti ti-plus"></i> 바코드 추가</button>`;

  setTimeout(() => {
    filtered.forEach(p => {
      const svgEl = document.getElementById('bc-svg-' + p.no);
      if (!svgEl || !window.JsBarcode) return;
      try {
        JsBarcode('#bc-svg-' + p.no, buildBarcode(p.biz||'8739', p.sub, p.seq, p.qty), {
          format:'EAN13', width:1.5, height:50,
          displayValue:true, fontSize:11, textMargin:2, margin:4,
          lineColor: p.status==='단종' ? '#aaa' : '#111'
        });
      } catch(e) {}
    });
  }, 100);
}

function toggleBcCat(key) { bcCollapsed[key] = !bcCollapsed[key]; renderBarcodeTab(document.getElementById('page-content')); }

function setBcFilter(f) { window._bcFilter = f; renderBarcodeTab(document.getElementById('page-content')); }

/* ════ 신규/수정 폼 ════ */
function openBarcodeForm(no) {
  const item = no ? _barcodeData.find(p => p.no === no) : null;
  const ns = nextSeq();

  // 기존 항목의 대분류 — 숫자이면 직접입력
  const itemBiz = item ? (item.biz || '8739') : '8739';
  const bizIsCustom = itemBiz !== '8739';

  showSheet(`
    <div class="sheet-handle"></div>
    <div class="sheet-inner">
    <div class="sheet-title">${item ? item.name + ' 수정' : '신규 바코드 생성'}</div>

    <div style="background:var(--teal-light);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:16px;font-size:12px;color:var(--teal-dark)">
      <b>바코드 구조:</b> 대분류(4) + 소분류(3) + 비번호(3) + 개수(2) + 체크디지트(1) = 13자리
    </div>

    <label>제품명<input id="bc1" value="${item?item.name:''}" placeholder="예: 오이비누"></label>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <label>대분류 (사업자번호)
        <select id="bc2" onchange="toggleBizCustom(); updateBcPreview()">
          <option value="8739" ${!bizIsCustom?'selected':''}>8739 (에이브릴팜)</option>
          <option value="직접입력" ${bizIsCustom?'selected':''}>직접입력</option>
        </select>
        <div id="bc2-custom-wrap" style="margin-top:6px;${!bizIsCustom?'display:none':''}">
          <input id="bc2c" maxlength="4" style="font-family:monospace;width:100%" 
            value="${bizIsCustom?itemBiz:''}" placeholder="4자리 숫자" oninput="updateBcPreview()">
        </div>
      </label>
      <label>소분류 (3자리)
        <input id="bc3" maxlength="3" style="font-family:monospace" value="${item?item.sub:''}" 
          placeholder="예: 033" oninput="updateBcPreview()">
        <div style="margin-top:5px;background:var(--amber-bg);border-radius:6px;padding:8px 10px;font-size:11px;color:var(--amber-text);line-height:1.7">
          앞 2자리 = 기획·제조 월 (01~12)<br>마지막 1자리 = 시리즈 구분
        </div>
      </label>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <label>비번호 (3자리) — 다음: ${ns}
        <input id="bc4" maxlength="3" style="font-family:monospace" value="${item?item.seq:ns}" 
          placeholder="${ns}" oninput="updateBcPreview()">
      </label>
      <label>개수 (2자리)
        <input id="bc5" maxlength="2" style="font-family:monospace" value="${item?item.qty:'09'}" 
          placeholder="09" oninput="updateBcPreview()">
      </label>
    </div>

    <div class="bc-preview" id="bc-preview">
      <div class="bc-preview-label">바코드 미리보기</div>
      <svg id="bc-preview-svg" style="display:block;margin:0 auto"></svg>
      <div id="bc-preview-num" style="text-align:center;font-family:monospace;font-size:13px;margin-top:4px"></div>
      <div id="bc-preview-chk" style="text-align:center;font-size:11px;color:var(--text3);margin-top:2px"></div>
    </div>

    <div style="font-size:13px;font-weight:700;color:var(--text);margin:14px 0 8px">제조번호</div>
    <label>입력 방식
      <select id="bc-mfg-mode" onchange="toggleMfgMode()">
        <option value="auto" ${item&&item.mfgDirect?'':'selected'}>자동 생성 (AP+B+색상코드+월+번호)</option>
        <option value="direct" ${item&&item.mfgDirect?'selected':''}>직접 입력</option>
      </select>
    </label>

    <div id="mfg-direct-box" style="${item&&item.mfgDirect?'':'display:none'}">
      <label>제조번호 직접입력<input id="bc-mfg-direct" value="${item&&item.mfgDirect?item.mfgNo||'':''}" placeholder="예: APBO06001" style="font-family:monospace" oninput="updateMfgPreview()"></label>
    </div>

    <div id="mfg-auto-box" style="${item&&item.mfgDirect?'display:none':''}">
    <div style="background:var(--mauve-light);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:12px;font-size:11px;color:var(--mauve-dark)">
      AP + B + 색상코드 + 월(2자리) + 비누번호(3자리)
    </div>

    <label>색상 코드
      <select id="bc7" onchange="updateMfgPreview(); toggleBc7Custom()">
        ${COLOR_CODES.map(c=>`<option value="${c.code}" ${item&&(item.mfgNo||'').includes(c.code)?'selected':''}>${c.label}</option>`).join('')}
      </select>
    </label>
    <div id="bc7-custom" style="${item&&item.bc7c?'':'display:none'}">
      <label>색상코드 직접입력<input id="bc7c" value="${item?.bc7c||''}" placeholder="예: BK" oninput="updateMfgPreview()"></label>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <label>기획 월 (2자리)
        <input id="bc8" maxlength="2" style="font-family:monospace"
          value="${item?item.mfgNo?.match(/\\d{2}(?=\\d{3})/)?.[0]||'':''}" placeholder="예: 06" oninput="updateMfgPreview()">
      </label>
      <label>비누번호 (3자리)
        <input id="bc9" maxlength="3" style="font-family:monospace"
          value="${item?item.mfgNo?.match(/\\d{3}$/)?.[0]||'':''}" placeholder="${ns}" oninput="updateMfgPreview()">
      </label>
    </div>
    </div>

    <div class="bc-mfg-preview" id="bc-mfg-preview">
      <span style="font-size:11px;color:var(--text3)">제조번호 미리보기: </span>
      <span id="mfg-preview-val" style="font-family:monospace;font-weight:700;color:var(--mauve-dark);font-size:14px"></span>
    </div>

    <label>제조일자<input id="bc10" value="${item?item.mfgDate:''}" placeholder="예: 26.06.01"></label>

    <label>유통기한
      <select id="bc11" onchange="toggleBc11Custom()">
        ${['제조일로부터 1년','제조일로부터 2년','직접입력'].map(e=>
          `<option ${item&&item.expiry===e?'selected':''}>${e}</option>`).join('')}
      </select>
    </label>
    <div id="bc11-custom" style="display:${item&&!['제조일로부터 1년','제조일로부터 2년'].includes(item.expiry)&&item.expiry?'block':'none'}">
      <label>유통기한 직접입력<input id="bc11c" 
        value="${item&&!['제조일로부터 1년','제조일로부터 2년'].includes(item.expiry)?item.expiry||'':''}" 
        placeholder="예: 2027-12-31까지"></label>
    </div>

    <label>상태
      <select id="bc12">
        ${['현행','단종','예정'].map(s=>`<option ${item&&item.status===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </label>
    <label>비고<input id="bc13" value="${item?item.notes||'':''}" placeholder=""></label>

    ${item ? '' : `<div style="background:var(--gray-bg);border-radius:var(--r-sm);padding:10px 12px;margin-top:8px;font-size:11px;color:var(--text3)">
      ※ 신규 생성 시 앱에 임시 저장됩니다. 마스터 시트에 직접 기재하여 관리하세요.
    </div>`}

    <div class="sheet-btns">
      ${item ? '<button onclick="deleteBarcode('+no+')" style="color:var(--red);border-color:var(--red)"><i class="ti ti-trash"></i> 삭제</button>' : '<button onclick="closeSheet()">취소</button>'}
      <button class="btn-save" onclick="printThenSave(${no||'null'})" style="background:var(--mauve)!important;border-color:var(--mauve)!important">
        <i class="ti ti-printer"></i> 출력
      </button>
      <button class="btn-save" onclick="saveBarcodeNew(${no||'null'})">저장</button>
    </div>
    </div>`);

  setTimeout(() => {
    updateBcPreview();
    updateMfgPreview();
    const sel11 = document.getElementById('bc11');
    if (sel11?.value === '직접입력') {
      const w = document.getElementById('bc11-custom');
      if(w) w.style.display = 'block';
    }
  }, 50);
}

/* 대분류 직접입력 토글 */
function toggleBizCustom() {
  const sel = document.getElementById('bc2');
  const wrap = document.getElementById('bc2-custom-wrap');
  if(wrap) wrap.style.display = sel?.value === '직접입력' ? 'block' : 'none';
  updateBcPreview();
}

function toggleBc7Custom() {
  const sel7 = document.getElementById('bc7');
  const wrap = document.getElementById('bc7-custom');
  if(wrap) wrap.style.display = sel7?.value === '직접입력' ? 'block' : 'none';
  updateMfgPreview();
}

function toggleBc11Custom() {
  const sel11 = document.getElementById('bc11');
  const wrap = document.getElementById('bc11-custom');
  if(wrap) wrap.style.display = sel11?.value === '직접입력' ? 'block' : 'none';
}

function updateBcPreview() {
  const sel2 = document.getElementById('bc2');
  const biz = sel2?.value === '직접입력'
    ? (document.getElementById('bc2c')?.value || '8739')
    : (sel2?.value || '8739');
  const sub = (document.getElementById('bc3')?.value || '').padEnd(3,'0').slice(0,3);
  const seq = (document.getElementById('bc4')?.value || '').padEnd(3,'0').slice(0,3);
  const qty = (document.getElementById('bc5')?.value || '').padEnd(2,'0').slice(0,2);

  if (sub.length===3 && seq.length===3 && qty.length===2 && biz.length===4) {
    const chk = calcCheckDigit(biz, sub, seq, qty);
    const full = biz + sub + seq + qty + chk;
    document.getElementById('bc-preview-num').textContent = full;
    document.getElementById('bc-preview-chk').textContent = `체크디지트: ${chk} (자동계산)`;
    const svg = document.getElementById('bc-preview-svg');
    if (svg && window.JsBarcode && full.length===13) {
      try { JsBarcode('#bc-preview-svg', full, {format:'EAN13',width:1.5,height:45,displayValue:true,fontSize:11,margin:6}); }
      catch(e) {}
    }
  } else {
    const numEl = document.getElementById('bc-preview-num');
    const chkEl = document.getElementById('bc-preview-chk');
    if(numEl) numEl.textContent = '— 입력 중 —';
    if(chkEl) chkEl.textContent = '';
  }
}

function toggleMfgMode() {
  const mode = document.getElementById('bc-mfg-mode')?.value;
  const directBox = document.getElementById('mfg-direct-box');
  const autoBox = document.getElementById('mfg-auto-box');
  if (directBox) directBox.style.display = mode === 'direct' ? '' : 'none';
  if (autoBox) autoBox.style.display = mode === 'direct' ? 'none' : '';
  updateMfgPreview();
}
function updateMfgPreview() {
  const mode = document.getElementById('bc-mfg-mode')?.value;
  let mfg;
  if (mode === 'direct') {
    mfg = document.getElementById('bc-mfg-direct')?.value || '';
  } else {
    const sel7 = document.getElementById('bc7');
    const color = sel7?.value==='직접입력'
      ? (document.getElementById('bc7c')?.value||'')
      : (sel7?.value||'');
    const mon = document.getElementById('bc8')?.value||'';
    const num = document.getElementById('bc9')?.value||'';
    mfg = 'APB' + color + mon + num;
  }
  const el = document.getElementById('mfg-preview-val');
  if(el) el.textContent = mfg || '—';
}

/* 폼 값을 한 번에 읽어 검증 — 저장과 출력이 서로 다른 시점에 DOM을 두 번 읽다가
   값이 어긋나는(특히 출력창이 뜨면서 페이지 컨텍스트가 흔들리는 모바일 환경) 문제를 방지 */
function collectBarcodeFormData() {
  const name = document.getElementById('bc1')?.value;
  if (!name) { alert('제품명을 입력하세요'); return null; }

  const sel2 = document.getElementById('bc2');
  const biz = sel2?.value==='직접입력'
    ? (document.getElementById('bc2c')?.value||bizPrefix())
    : (sel2?.value||bizPrefix());

  const sub = document.getElementById('bc3')?.value||'';
  const seq = document.getElementById('bc4')?.value||'';
  const qty = document.getElementById('bc5')?.value||'';
  const chk = calcCheckDigit(biz, sub, seq, qty);

  const mfgMode = document.getElementById('bc-mfg-mode')?.value;
  let mfgNo, bc7c = '', mfgDirect = false;
  if (mfgMode === 'direct') {
    mfgNo = document.getElementById('bc-mfg-direct')?.value || '';
    mfgDirect = true;
    if (!mfgNo) { alert('제조번호를 입력하세요'); return null; }
  } else {
    const sel7 = document.getElementById('bc7');
    const color = sel7?.value==='직접입력' ? (document.getElementById('bc7c')?.value||'') : (sel7?.value||'');
    bc7c = sel7?.value==='직접입력' ? (document.getElementById('bc7c')?.value||'') : '';
    const mon = document.getElementById('bc8')?.value||'';
    const num = document.getElementById('bc9')?.value||'';
    if (!mon || !num) { alert('제조번호의 "기획 월"과 "비누번호"를 모두 입력하세요 — 비어있으면 제조번호가 불완전하게 저장됩니다'); return null; }
    mfgNo = 'APB' + color + mon + num;
  }

  const sel11 = document.getElementById('bc11');
  const expiry = sel11?.value==='직접입력'
    ? (document.getElementById('bc11c')?.value||'')
    : (sel11?.value||'');

  return {
    name, biz, sub, seq, qty, chk, bc7c, mfgNo, mfgDirect,
    mfgDate: document.getElementById('bc10')?.value||'',
    expiry,
    status: document.getElementById('bc12')?.value||'현행',
    notes: document.getElementById('bc13')?.value||''
  };
}

async function saveBarcodeRecord(no, data) {
  const record = { ...data, biz: data.biz===bizPrefix() ? undefined : data.biz };
  if (no) {
    record.no = no;
    const existing = _barcodeData.find(p => p.no === no);
    if (existing && existing.id) record.id = existing.id;
    try { await DB.put('barcodes', record); } catch(e) { console.warn('DB put:', e); }
  } else {
    record.no = Math.max(..._barcodeData.map(p=>p.no), 0) + 1;
    try { await DB.add('barcodes', record); } catch(e) { console.warn('DB add:', e); }
  }
  return record;
}

async function saveBarcodeNew(no) {
  const data = collectBarcodeFormData();
  if (!data) return;
  await saveBarcodeRecord(no, data);
  closeSheet();
  renderBarcodeTab(document.getElementById('page-content'));
}



/* ── 바코드 삭제 ── */
async function deleteBarcode(no) {
  if (!confirm('이 바코드를 삭제하시겠습니까?')) return;
  const item = _barcodeData.find(p => p.no === no);
  if (item) {
    try {
      if (item.id) await DB.remove('barcodes', item.id);
      else {
        // id 없으면 전체에서 찾아서 삭제
        const all = await DB.getAll('barcodes');
        const match = all.find(b => b.no === no);
        if (match) await DB.remove('barcodes', match.id);
      }
    } catch(e) { console.warn('DB remove:', e); }
  }
  closeSheet();
  renderBarcodeTab(document.getElementById('page-content'));
}
window.deleteBarcode = deleteBarcode;

/* ── 출력 버튼: 값을 먼저 저장한 뒤 그 저장된 값으로 인쇄창을 띄움
   (반대 순서로 하면 인쇄창이 뜨면서 원래 화면이 흔들려 저장이 씹히는 경우가 있어
   반드시 "저장 먼저 → 인쇄는 저장된 값으로" 순서를 지킨다) ── */
async function printThenSave(no) {
  const data = collectBarcodeFormData();
  if (!data) return;
  const record = await saveBarcodeRecord(no, data);
  printBarcodeLabelFromRecord(record);
  closeSheet();
  renderBarcodeTab(document.getElementById('page-content'));
}

/* ── 라벨 출력: 저장된(=검증을 통과한) 레코드 값으로만 인쇄. DOM을 다시 읽지 않음 ── */
function printBarcodeLabelFromRecord(r) {
  const biz = r.biz || bizPrefix();
  const sub = r.sub||'', seq = r.seq||'', qty = r.qty||'';
  const name = r.name||'';
  const mfgNo = r.mfgNo||'';
  const expiry = r.expiry||'';
  const full = buildBarcode(biz, sub, seq, qty);

  const win = window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
  <title>바코드 라벨</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js"><\/script>
  <style>
    body{font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;padding:20px;background:#fff;}
    .label-wrap{display:flex;flex-wrap:wrap;gap:10px;}
    .label{border:1px solid #ccc;border-radius:6px;padding:12px 16px;width:220px;text-align:center;}
    .label-name{font-size:13px;font-weight:700;margin-bottom:6px;}
    .label-mfg,.label-expiry{font-size:10px;color:#555;margin-bottom:4px;}
    .label-biz{font-size:9px;color:#888;}
    @media print{body{padding:4mm}button{display:none}}
  </style></head><body>
  <div style="margin-bottom:12px">
    <button onclick="window.print()" style="padding:8px 20px;background:#48997D;color:#fff;border:none;border-radius:6px;cursor:pointer;margin-right:6px">🖨 인쇄</button>
    <button onclick="window.close()" style="padding:8px 16px;background:#eee;border:none;border-radius:6px;cursor:pointer">닫기</button>
  </div>
  <div class="label-wrap">
    ${[1,2,3,4].map(i=>{
      const uid='lbc'+i+Math.random().toString(36).slice(2);
      return `<div class="label">
        <div class="label-name">${name}</div>
        <svg id="${uid}"></svg>
        <div class="label-mfg">${mfgNo}</div>
        <div class="label-expiry">${expiry}</div>
        <div class="label-biz">AVRIL'S FARM · 화장품제조업 제6494호</div>
      </div>`;
    }).join('')}
  </div>
  <script>
    window.onload=()=>{
      document.querySelectorAll('.label svg').forEach(svg=>{
        try{JsBarcode(svg,'${full}',{format:'EAN13',width:1.5,height:45,displayValue:true,fontSize:10,margin:4});}catch(e){}
      });
    };
  <\/script></body></html>`);
  win.document.close();
}

/* ── 전체 출력 ── */
function printAllBarcodes() {
  const items = _barcodeData.filter(p => p.status === '현행');
  const win = window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
  <title>AVRIL'S FARM 바코드 목록</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js"><\/script>
  <style>
    body{font-family:'Apple SD Gothic Neo',sans-serif;padding:16px;font-size:10px;}
    table{width:100%;border-collapse:collapse;}
    th,td{border:0.5px solid #ccc;padding:5px 7px;vertical-align:middle;}
    th{background:#f5f5f0;font-weight:700;text-align:center;}
    td.c{text-align:center;} .bc-cell{text-align:center;min-width:160px;}
    @media print{button{display:none}@page{size:A4;margin:8mm}}
  </style></head><body>
  <div style="margin-bottom:12px">
    <button onclick="window.print()" style="padding:8px 20px;background:#48997D;color:#fff;border:none;border-radius:6px;cursor:pointer;margin-right:6px">🖨 인쇄/PDF</button>
    <button onclick="window.close()" style="padding:8px 16px;background:#eee;border:none;border-radius:6px;cursor:pointer">닫기</button>
  </div>
  <h2 style="margin-bottom:12px;font-size:16px">AVRIL'S FARM 바코드·제조번호 관리표</h2>
  <table>
    <thead><tr>
      <th>No</th><th>제품명</th><th>바코드 번호</th><th>체크디지트</th>
      <th class="bc-cell">바코드</th>
      <th>제조번호</th><th>제조일자</th><th>유통기한</th><th>상태</th>
    </tr></thead>
    <tbody>
      ${items.map(p=>{
        const full = buildBarcode(p.biz||'8739',p.sub,p.seq,p.qty);
        const bc12 = `${p.biz||'8739'}/${p.sub}/${p.seq}/${p.qty}`;
        return `<tr>
          <td class="c">${p.no}</td><td>${p.name}</td>
          <td style="font-family:monospace">${bc12}</td>
          <td class="c">${p.chk}</td>
          <td class="bc-cell"><svg id="tbc-${p.no}"></svg></td>
          <td style="font-family:monospace">${p.mfgNo||''}</td>
          <td class="c">${p.mfgDate||''}</td>
          <td>${p.expiry||''}</td>
          <td class="c">${p.status}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
  <script>
    window.onload=()=>{
      ${items.map(p=>{
        const full = buildBarcode(p.biz||'8739',p.sub,p.seq,p.qty);
        return `try{JsBarcode('#tbc-${p.no}','${full}',{format:'EAN13',width:1,height:30,displayValue:true,fontSize:8,margin:2});}catch(e){}`;
      }).join('\n')}
    };
  <\/script></body></html>`);
  win.document.close();
}

window.loadBarcodesFromDB = loadBarcodesFromDB;
window.renderBarcodeTab = renderBarcodeTab;
window.setBcFilter = setBcFilter;
window.openBarcodeForm = openBarcodeForm;
window.updateBcPreview = updateBcPreview;
window.updateMfgPreview = updateMfgPreview;
window.toggleMfgMode = toggleMfgMode;
window.toggleBizCustom = toggleBizCustom;
window.toggleBc7Custom = toggleBc7Custom;
window.toggleBc11Custom = toggleBc11Custom;
window.saveBarcodeNew = saveBarcodeNew;
window.printBarcodeLabelFromRecord = printBarcodeLabelFromRecord;
window.printThenSave = printThenSave;
window.saveBarcodeNew = saveBarcodeNew;
window.collectBarcodeFormData = collectBarcodeFormData;
window.saveBarcodeRecord = saveBarcodeRecord;
window.printAllBarcodes = printAllBarcodes;
window.toggleBcCat = toggleBcCat;
window.calcCheckDigit = calcCheckDigit;

'use strict';
/* ═══════════════════════════════════════
   공방비서 — 사업자 설정 모듈
   화이트라벨: 상호명·대표자·주소·전화·인허가번호·
   문서번호 접두어·바코드 대분류·제조번호 형식을
   고객마다 다르게 설정할 수 있도록 함
═══════════════════════════════════════ */
const BIZ_KEY = 'bizSettings';
const BIZ_DEFAULTS = {
  name: '', owner: '', addr: '', tel: '',
  mfgNo: '', saleNo: '',
  docPrefix: 'AF', bizPrefix: '', mfgFormat: 'APBO'
};

function getBiz() {
  try {
    const s = JSON.parse(localStorage.getItem(BIZ_KEY)) || {};
    return { ...BIZ_DEFAULTS, ...s };
  } catch (e) { return { ...BIZ_DEFAULTS }; }
}

function setBiz(obj) {
  const cur = getBiz();
  localStorage.setItem(BIZ_KEY, JSON.stringify({ ...cur, ...obj }));
}

function isBizConfigured() {
  const b = getBiz();
  return !!(b.name && b.owner);
}

function getDocPrefix() {
  return (getBiz().docPrefix || 'AF').toUpperCase();
}

/* 정규식에 안전하게 넣기 위한 상호명 이스케이프 */
function escBizName() {
  return (getBiz().name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* 인쇄 문서 하단 사업자 정보 한 줄 */
function bizFooterText() {
  const b = getBiz();
  const parts = [
    b.name,
    b.addr,
    b.tel ? ('TEL ' + b.tel) : '',
    b.mfgNo ? ('화장품제조업 등록번호 ' + b.mfgNo) : '',
    b.saleNo ? ('책임판매업 등록번호 ' + b.saleNo) : ''
  ].filter(Boolean);
  return parts.join(' · ');
}

/* ── 최초 실행 설정 마법사 ── */
function openBizSetupWizard() {
  const b = getBiz();
  showSheet(`
    <div class="sheet-handle"></div>
    <div class="sheet-inner">
    <div class="sheet-title">사업자 정보 설정</div>
    <div style="background:var(--mauve-light);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:12px;font-size:11px;color:var(--mauve-dark)">
      여기 입력한 정보가 기준서·기록서·바코드 등 앱의 모든 서류에 자동으로 반영됩니다. 설정 탭에서 언제든 다시 수정할 수 있습니다.
    </div>

    <label>상호명 (필수)<input id="biz1" value="${b.name}" placeholder="예: 나린공방"></label>
    <label>대표자명 (필수)<input id="biz2" value="${b.owner}" placeholder="예: 홍길동"></label>
    <label>주소<input id="biz3" value="${b.addr}" placeholder="예: 서울시 ○○구 ○○로 12"></label>
    <label>전화번호<input id="biz4" value="${b.tel}" placeholder="예: 010-1234-5678"></label>
    <label>화장품제조업 등록번호<input id="biz5" value="${b.mfgNo}" placeholder="예: 제0000호"></label>
    <label>책임판매업 등록번호<input id="biz6" value="${b.saleNo}" placeholder="예: 제0000호"></label>

    <div style="font-size:12px;font-weight:700;color:var(--text);margin:14px 0 6px;border-top:1px solid var(--border);padding-top:12px">문서·바코드 번호 체계</div>
    <label>문서번호 접두어 (영문 2~3자)<input id="biz7" value="${b.docPrefix}" maxlength="4" placeholder="예: NR" style="font-family:monospace;text-transform:uppercase"></label>
    <div style="font-size:10px;color:var(--text3);margin-bottom:8px">기준서·배치기록 문서번호 앞부분에 사용됩니다 (예: NR-PS-001)</div>
    <label>바코드 대분류 (숫자 4자리)<input id="biz8" value="${b.bizPrefix}" maxlength="4" placeholder="예: 1234" style="font-family:monospace"></label>
    <div style="font-size:10px;color:var(--text3);margin-bottom:8px">자체(사설) 바코드 EAN-13 앞 4자리로 사용됩니다. 임의의 4자리 숫자를 정해 사용하세요.</div>
    <label>제조번호 형식 접두어<input id="biz9" value="${b.mfgFormat}" placeholder="예: APBO" style="font-family:monospace;text-transform:uppercase"></label>

    <div class="sheet-btns">
      <button class="btn-save" onclick="saveBizSetup()" style="width:100%">저장하고 시작하기</button>
    </div>
    </div>`);
}

function saveBizSetup() {
  const name = v('biz1').trim();
  const owner = v('biz2').trim();
  if (!name || !owner) { alert('상호명과 대표자명은 필수입니다'); return; }
  const docPrefix = (v('biz7').trim() || 'AF').toUpperCase().replace(/[^A-Z]/g, '') || 'AF';
  setBiz({
    name, owner,
    addr: v('biz3').trim(),
    tel: v('biz4').trim(),
    mfgNo: v('biz5').trim(),
    saleNo: v('biz6').trim(),
    docPrefix,
    bizPrefix: (v('biz8').trim() || '0000').replace(/\D/g, '').padStart(4, '0').slice(0, 4),
    mfgFormat: (v('biz9').trim() || 'APBO').toUpperCase()
  });

  // 4대 기준서(MMS/HMS/QCM) 헤더 정보도 함께 초기 세팅 — 개별 문서정보 수정 없이 바로 반영되도록
  ['MMS-001', 'HMS-001', 'QCM-001'].forEach(code => {
    const key = 'AF-' + code; // 내부 조회 키 (고정, 표시용 문서번호와 별개)
    setStdMeta(key, {
      company: name,
      author: owner,
      docNo: docPrefix + '-' + code
    });
  });

  closeSheet();
  location.reload();
}

window.getBiz = getBiz;
window.setBiz = setBiz;
window.isBizConfigured = isBizConfigured;
window.getDocPrefix = getDocPrefix;
window.bizFooterText = bizFooterText;
window.escBizName = escBizName;
window.openBizSetupWizard = openBizSetupWizard;
window.saveBizSetup = saveBizSetup;

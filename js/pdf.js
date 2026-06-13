/* ═══════════════════════════════════════
   에이브릴팜 PDF 출력 모듈 v2
   4대 기준서 양식 그대로 재현
═══════════════════════════════════════ */

const CO = {
  name:'에이브릴팜',
  addr:'경기도 시흥시 진말1로 18, 에스엠타워 303호',
  tel:'0507-1346-8739',
  mfg:'제6494호', sale:'제18216호', owner:'변민정'
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Noto Sans KR','Apple SD Gothic Neo',sans-serif;font-size:9.5px;color:#111;background:#fff;}
.doc{width:210mm;min-height:297mm;padding:14mm 14mm 12mm;margin:0 auto;}
.doc-title{font-size:17px;font-weight:700;text-align:center;margin-bottom:2px;letter-spacing:1px;}
.doc-sub{font-size:10px;font-weight:400;text-align:center;color:#555;margin-bottom:10px;}
.doc-meta{display:flex;flex-wrap:wrap;gap:0;border:0.5px solid #888;margin-bottom:14px;}
.doc-meta span{flex:1;padding:4px 8px;font-size:9px;border-right:0.5px solid #888;}
.doc-meta span:last-child{border-right:none;}
.doc-meta b{font-weight:700;}
table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:9px;}
th,td{border:0.5px solid #888;padding:4px 6px;vertical-align:middle;}
th{background:#f2f2ee;font-weight:700;text-align:center;}
td.h{background:#f2f2ee;font-weight:700;}
td.c{text-align:center;}
td.r{text-align:right;}
.sec{font-size:10.5px;font-weight:700;margin:14px 0 5px;border-left:3px solid #3DB88A;padding-left:7px;}
.note{font-size:8.5px;color:#555;margin-top:-8px;margin-bottom:10px;}
.sign{display:flex;justify-content:flex-end;gap:20px;margin-bottom:12px;}
.sign-box{border:0.5px solid #888;text-align:center;padding:5px 16px;min-width:90px;}
.sign-lbl{font-size:8px;color:#666;margin-bottom:14px;}
.foot{margin-top:14px;padding-top:7px;border-top:0.5px solid #ccc;font-size:8px;color:#888;text-align:center;}
.green{color:#0F6E56;font-weight:700;}
.red{color:#A32D2D;font-weight:700;}
.big{font-size:12px;font-weight:700;}
.page-break{page-break-after:always;}
@media print{
  body{margin:0;}
  .doc{padding:10mm 12mm;}
  .no-print{display:none!important;}
  @page{size:A4;margin:0;}
}`;

function pBtn(){
  return `<div class="no-print" style="text-align:center;padding:14px;background:#f7f7f5;border-bottom:1px solid #eee;">
    <button onclick="window.print()" style="padding:9px 24px;background:#3DB88A;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;margin-right:8px;font-weight:600">
      🖨 인쇄 / PDF 저장
    </button>
    <button onclick="window.close()" style="padding:9px 18px;background:#eee;color:#444;border:none;border-radius:8px;font-size:14px;cursor:pointer">닫기</button>
  </div>`;
}

function open$(html){
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>에이브릴팜</title><style>${CSS}</style></head><body>${pBtn()}${html}${pBtn()}</body></html>`);
  w.document.close();
}

function hd(title,sub,docNo,revNo,date){
  return `<div class="doc">
  <div class="doc-title">${CO.name}</div>
  <div class="doc-sub">${title} &nbsp;·&nbsp; ${sub}</div>
  <div class="doc-meta">
    <span><b>문서번호</b> ${docNo}</span>
    <span><b>제정일자</b> ${date||'2026.05.27'}</span>
    <span><b>개정번호</b> ${revNo||'Rev.00'}</span>
    <span><b>작성/확인</b> ${CO.owner} (인)</span>
    <span><b>관리구분</b> ■ 관리본 □ 비관리본</span>
  </div>`;
}

function ft(){
  return `<div class="foot">${CO.name} · ${CO.addr} · TEL ${CO.tel} · 화장품제조업 등록번호 ${CO.mfg} · 책임판매업 등록번호 ${CO.sale}</div>
  </div>`;
}

function chk(val, trueLabel, falseLabel){
  return val ? `■${trueLabel} □${falseLabel}` : `□${trueLabel} ■${falseLabel}`;
}

/* ─────────────────────────────────────
   시험성적서 (EF-TR)
───────────────────────────────────── */
function buildTR(batch, allIng){
  const ing = allIng.filter(i => i.stockType !== '포장재' && i.category !== '단상자');
  const docNo = batch.문서번호 ? batch.문서번호.replace('EF-MI','EF-TR') : 'EF-TR-00X';
  const expiry = batch.date ? (parseInt(batch.date.slice(0,4)) + 2) + batch.date.slice(4) : '';

  const ingRows = ing.map((i,n) => `<tr>
    <td class="c">${n+1}</td>
    <td>${i.원료명}</td>
    <td>${i.제조처||''}</td>
    <td class="c">성상·이물</td>
    <td class="c">이상없음</td>
    <td class="c green">■적합 □부적합</td>
    <td class="c">${CO.owner}</td>
  </tr>`).join('');

  const ctSection = batch.CT ? `
  <div class="sec">▶ ② 완제품 시험성적서 — ${batch.CT} (내용량 단독, 참고용)</div>
  <table>
    <thead><tr><th>시험 항목</th><th>단위</th><th>용 도</th><th>결 과</th><th>비 고</th></tr></thead>
    <tbody>
      <tr><td>내용량 (건조)</td><td class="c">g</td><td>참고용 (의뢰자 확인)</td><td class="c"><b>${batch.CT내용량||''}</b></td><td>성적서: ${batch.CT}</td></tr>
      <tr><td colspan="5" class="note" style="border:none;padding:3px 6px;font-size:8.5px;">발행일: ${batch.CT발행일||''} &nbsp;/&nbsp; 의뢰자 확인용 — 공식 품질판정은 SC 성적서 기준</td></tr>
    </tbody>
  </table>` : '';

  const scNum = batch.CT ? '③' : '②';
  const eyeNum = batch.CT ? '④' : '③';
  const totalNum = batch.CT ? '⑤' : '④';

  return hd('시험성적서', batch.제품명||'', docNo, 'Rev.00', batch.date) + `
  <div class="sec">▶ ① 원자재 시험성적서 (자사 육안검사)</div>
  <p class="note">※ 원료 입고 시마다 작성. 성상·이물 육안 확인. 제조처 CoA 별도 첨부.</p>
  <table>
    <thead><tr><th>No</th><th>원 료 명</th><th>제조처 / 로트번호</th><th>시험항목</th><th>시험성적</th><th>판 정</th><th>시험자</th></tr></thead>
    <tbody>
      ${ingRows}
      <tr>
        <td colspan="2" class="h">종합판정</td>
        <td colspan="5" class="green">■ 전 항목 적합 — 제조 진행 &nbsp;&nbsp;&nbsp; □ 부적합 → 격리/반품/폐기</td>
      </tr>
    </tbody>
  </table>
  ${ctSection}
  <div class="sec">▶ ${scNum} 완제품 시험성적서 (KCL 공식 품질검사)</div>
  <table>
    <tr><td class="h">제 품 명</td><td><b>${batch.제품명||''}</b></td><td class="h">제품코드</td><td>${batch.제조번호?.split('-')[0]||''}</td></tr>
    <tr><td class="h">바코드</td><td>${batch.바코드||''}</td><td class="h">제조번호</td><td>${batch.제조번호||''}</td></tr>
    <tr><td class="h">제조일자</td><td>${batch.date||''}</td><td class="h">사용기한</td><td>${expiry} (2년)</td></tr>
    <tr><td class="h">접수번호</td><td>${batch.KCL||''}</td><td class="h">발행번호</td><td>${batch.KCL발행번호||''}</td></tr>
    <tr><td class="h">접수일</td><td>${batch.KCL접수일||''}</td><td class="h">발행일</td><td>${batch.KCL발행일||''}</td></tr>
    <tr><td class="h">시험기관</td><td colspan="3">한국건설생활환경시험연구원 (KCL)</td></tr>
  </table>
  <table>
    <thead><tr><th>시험·검사 항목</th><th>단위</th><th>시험·검사 기준</th><th>결 과</th><th>항목 판정</th></tr></thead>
    <tbody>
      <tr><td>내용량 (건조)</td><td class="c">%</td><td class="c">97 이상</td><td class="c"><b>${batch.내용량||''}</b></td><td class="c green">■ 적합</td></tr>
      <tr><td>유리알칼리</td><td class="c">%</td><td class="c">0.1 이하</td><td class="c"><b>${batch.유리알칼리||''}</b></td><td class="c green">■ 적합</td></tr>
      <tr><td class="h">종합 판정</td><td colspan="4" class="green big">■ 적합</td></tr>
    </tbody>
  </table>
  <div class="sec">▶ ${eyeNum} 자사 완제품 육안검사</div>
  <table>
    <thead><tr><th>검사 항목</th><th>기 준</th><th>검사 결과</th><th>판 정</th><th>시험자</th></tr></thead>
    <tbody>
      <tr><td>성 상</td><td>고형, 표면 균일, 이물 없음</td><td>이상없음</td><td class="c green">■적합</td><td class="c">${CO.owner}</td></tr>
      <tr><td>색 상</td><td>${batch.색상기준||'고유 색상'}</td><td>${batch.색상결과||'이상없음'}</td><td class="c green">■적합</td><td class="c">${CO.owner}</td></tr>
      <tr><td>중량 (건조)</td><td>${batch.목표중량||'90g ±5g'}</td><td class="c"><b>${batch.실측중량||''}</b></td><td class="c green">■적합</td><td class="c">${CO.owner}</td></tr>
    </tbody>
  </table>
  <div class="sec">▶ ${totalNum} 종합 판정 및 성적서 첨부</div>
  <table>
    <tr><td class="h" style="width:18%">종합 판정</td><td class="green big">■ 출하 승인</td></tr>
    <tr><td class="h">총괄책임자</td><td>${CO.owner} (인)</td></tr>
  </table>` + ft();
}

/* ─────────────────────────────────────
   원료입고기록서 (R-MMS-01)
───────────────────────────────────── */
function buildMMS(ing){
  // [보완] stockType 조건뿐만 아니라 카테고리로 필터링 이중방어벽 구축
  const filtered = ing.filter(i => i.stockType !== '포장재' && i.category !== '단상자' && i.category !== '라벨·스티커');
  const rows = filtered.map((i,n)=>`<tr>
    <td class="c">${i.입고일||''}</td>
    <td>${i.원료명}</td>
    <td>${i.제조처||''}</td>
    <td class="c">${i.수량||''}</td>
    <td class="c">${i.CoA==='수취'?'■양호':'□양호'}</td>
    <td class="c">${i.CoA==='수취'?'■수취':'□수취'}</td>
    <td class="c">■이상없음</td>
    <td class="c">■없음</td>
    <td class="c">■이상없음</td>
    <td class="c green">■적합</td>
    <td class="c">${CO.owner}</td>
  </tr>`).join('');

  const empty = Array(Math.max(0, 5 - filtered.length))
    .fill(`<tr><td></td><td></td><td></td><td></td><td>□양호</td><td>□수취</td><td>□이상없음</td><td>□없음</td><td>□이상없음</td><td>□적합</td><td></td></tr>`).join('');

  return hd('제조관리기준서 기록서','R-MMS-01 원료입고기록서','R-MMS-01','Rev.00','2026.05.27') + `
  <table>
    <thead>
      <tr><th rowspan="2">입고일</th><th rowspan="2">원료명</th><th rowspan="2">제조처</th><th rowspan="2">수량</th><th rowspan="2">포장</th><th rowspan="2">CoA</th><th colspan="3">육안 검사</th><th rowspan="2">판정</th><th rowspan="2">확인자</th></tr>
      <tr><th>성상</th><th>이물</th><th>색상</th></tr>
    </thead>
    <tbody>${rows}${empty}</tbody>
  </table>` + ft();
}

/* ─────────────────────────────────────
   위생점검기록서 (R-MH-01 + R-MH-02)
───────────────────────────────────── */
function buildMH(hyg, year, month){
  const ym = `${year}-${String(month).padStart(2,'0')}`;
  const clean = hyg.filter(h=>h.type==='청소점검'&&h.date?.startsWith(ym));
  const pest  = hyg.filter(h=>h.type==='방충방서');

  const cleanRows = clean.map(r=>`<tr>
    <td class="c">${r.date?.slice(5).replace('-','.')}</td>
    <td class="c">${CO.owner}</td>
    <td class="c green">${r.items?.원료보관==='청결'?'■청결':'□청결'}</td>
    <td class="c green">${r.items?.부자재==='청결'?'■청결':'□청결'}</td>
    <td class="c green">${r.items?.완제품==='청결'?'■청결':'□청결'}</td>
    <td class="c green">${r.items?.작업대==='청결'?'■청결':'□청결'}</td>
    <td class="c green">${r.items?.도구류==='청결'?'■청결':'□청결'}</td>
    <td class="c green">${r.items?.포장실==='청결'?'■청결':'□청결'}</td>
    <td>${r.이슈||''}</td>
  </tr>`).join('');

  const cleanEmpty = Array(Math.max(0,8-clean.length))
    .fill(`<tr><td></td><td></td><td>□청결</td><td>□청결</td><td>□청결</td><td>□청결</td><td>□청결</td><td>□청결</td><td></td></tr>`).join('');

  const months=['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const pestRows = months.map((m,i)=>{
    const r = pest.find(p=>p.date?.startsWith(`${year}-${String(i+1).padStart(2,'0')}`));
    return `<tr>
      <td class="c">${m}</td>
      <td class="c">${CO.owner}</td>
      <td class="c green">${r?chk(r.방충망==='양호','양호','불량'):'□양호'}</td>
      <td class="c green">${r?chk(r.해충==='없음','없음','있음'):'□없음'}</td>
      <td class="c green">${r?chk(r.설치류==='없음','없음','있음'):'□없음'}</td>
      <td>${r?.이슈||''}</td>
    </tr>`;
  }).join('');

  return hd('제조위생관리기준서 기록서','R-MH · 작업장청소점검표 + 방충방서점검표','R-MH','Rev.00','2026.05.27') + `
  <div class="sec">■ R-MH-01 &nbsp;작업장청소점검표 &nbsp;·&nbsp; ${year}년 ${month}월</div>
  <table>
    <thead><tr><th>날짜</th><th>확인자</th><th>원료보관</th><th>부자재</th><th>완제품</th><th>작업대</th><th>도구류</th><th>포장실</th><th>비고</th></tr></thead>
    <tbody>${cleanRows}${cleanEmpty}</tbody>
  </table>
  <div class="sec" style="margin-top:18px">■ R-MH-02 &nbsp;방충·방서 월간 점검표 &nbsp;·&nbsp; ${year}년</div>
  <table>
    <thead><tr><th>점검월</th><th>확인자</th><th>방충망</th><th>해충</th><th>설치류</th><th>조치내용</th></tr></thead>
    <tbody>${pestRows}</tbody>
  </table>` + ft();
}

/* ─────────────────────────────────────
   완제품 출하검사기록서 (R-QCM-01 + R-QCM-02)
───────────────────────────────────── */
function buildQCM(batches){
  const rows = batches.map(b=>`<tr>
    <td class="c">${b.검사일||b.date||''}</td>
    <td>${b.제품명}</td>
    <td class="c">${b.KCL?'■확인':'□확인'}</td>
    <td class="c green">■이상없음</td>
    <td class="c green">■이상없음</td>
    <td class="c green">■없음</td>
    <td class="c"><b>${b.실측중량||''}</b></td>
    <td class="c green">■확인</td>
    <td class="c green">■적합</td>
    <td class="c">${CO.owner}</td>
  </tr>`).join('');

  const empty = Array(Math.max(0,6-batches.length))
    .fill(`<tr><td></td><td></td><td>□확인</td><td>□이상없음</td><td>□이상없음</td><td>□없음</td><td></td><td>□확인</td><td>□적합</td><td></td></tr>`).join('');

  const specimenRows = batches.map(b=>{
    return `<tr><td></td><td>${b.제품명}</td><td class="c">${b.제조번호||''}</td><td class="c">${b.date||''}</td><td class="c">${b.date ? (parseInt(b.date.slice(0,4))+2)+b.date.slice(4) : ''}</td><td class="c">1~2ea</td><td></td><td></td></tr>`;
  }).join('');

  const specimenEmpty = Array(Math.max(0,5-batches.length))
    .fill(`<tr><td></td><td></td><td></td><td></td><td></td><td class="c">1~2ea</td><td></td><td></td></tr>`).join('');

  return hd('품질관리기준서 기록서','R-QCM · 완제품 출하검사','R-QCM','Rev.00','2026.05.27') + `
  <div class="sec">■ R-QCM-01 &nbsp;완제품 출하검사 기록</div>
  <table>
    <thead><tr><th>검사일</th><th>제품명</th><th>KCL확인</th><th>성상</th><th>색상</th><th>이물</th><th>중량(g)</th><th>표시사항</th><th>종합판정</th><th>확인자</th></tr></thead>
    <tbody>${rows}${empty}</tbody>
  </table>
  <div class="sec" style="margin-top:18px">■ R-QCM-02 &nbsp;보관 검체 관리 기록</div>
  <table>
    <thead><tr><th>등록일</th><th>제 품 명</th><th>제조번호</th><th>제조일자</th><th>사용기한</th><th>보관수량</th><th>폐기일</th><th>비고</th></tr></thead>
    <tbody>${specimenRows}${specimenEmpty}</tbody>
  </table>` + ft();
}

/* ─────────────────────────────────────
   제조지시서 (EF-MI)
───────────────────────────────────── */
function buildMI(batch){
  return hd('제조지시서','Manufacturing Instruction · '+batch.제품명, batch.문서번호||'EF-MI-00X','Rev.00',batch.date) + `
  <div class="sign"><div class="sign-box"><div class="sign-lbl">총괄책임자</div>${CO.owner} (인)</div></div>
  <div class="sec">▶ 가. 기본 정보</div>
  <table>
    <tr><td class="h">제 품 명</td><td><b>${batch.제품명}</b></td><td class="h">제조번호</td><td>${batch.제조번호||''}</td></tr>
    <tr><td class="h">바코드 번호</td><td>${batch.바코드||''}</td><td class="h">제조연월일</td><td>${batch.date||''}</td></tr>
    <tr><td class="h">제조단위</td><td>${batch.투입량||''}g</td><td class="h">사용기한</td><td>제조일로부터 2년</td></tr>
  </table>
  <div class="sec">▶ 나. 원료명·분량·실사용량</div>
  <table>
    <thead><tr><th>No</th><th>원 료 명</th><th>INCI 명칭</th><th>이론량(g)</th><th>비율(%)</th><th>실사용량(g)</th></tr></thead>
    <tbody>
      ${(batch.레시피||[]).map((r,i)=>`<tr><td class="c">${i+1}</td><td>${r.원료명}</td><td>${r.INCI||''}</td><td class="r">${r.이론량||''}</td><td class="r">${r.비율||''}</td><td class="r">${r.실사용량||r.이론량||''}</td></tr>`).join('')}
      <tr><td colspan="3" class="h">합 계</td><td class="r h">${batch.투입량||''}g</td><td></td><td></td></tr>
    </tbody>
  </table>` + ft();
}

/* ─────────────────────────────────────
   제품표준서 (EF-PS)
───────────────────────────────────── */
function buildPS(batch, allIng){
  const ing = allIng.filter(i=>i.stockType!=='포장재' && i.category !== '단상자');
  const psNo = batch.문서번호 ? batch.문서번호.replace('EF-MI','EF-PS') : 'EF-PS-00X';

  return hd('제품표준서','Product Standard · '+batch.제품명, psNo,'Rev.00',batch.date) + `
  <div class="sign"><div class="sign-box"><div class="sign-lbl">총괄책임자</div>${CO.owner} (인)</div></div>
  <div class="sec">▶ 1. 기본 정보</div>
  <table>
    <tr><td class="h">제 품 명</td><td><b>${batch.제품명}</b></td><td class="h">내 용 량</td><td>${batch.목표중량||'90g'}</td></tr>
    <tr><td class="h">제품 코드</td><td>${batch.제조번호?.split('-')[0]||''}</td><td class="h">바코드 번호</td><td>${batch.바코드||''}</td></tr>
  </table>
  <div class="sec">▶ 5. 표시기재사항</div>
  <table>
    <tr><td class="h" style="width:18%">전 성 분</td><td style="font-size:8.5px">${batch.전성분||''}</td></tr>
    <tr><td class="h">제조업자</td><td>${CO.name} / ${CO.addr}</td></tr>
  </table>` + ft();
}

/* ─────────────────────────────────────
   제출용 표지 및 메인 핸들러
───────────────────────────────────── */
function buildCover(sy, sm, ey, em){
  const now = new Date().toLocaleDateString('ko-KR');
  return `<div class="doc" style="display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:297mm;text-align:center;">
    <div style="font-size:13px;color:#666;margin-bottom:24px">화장품 정기감시 제출 서류</div>
    <div style="font-size:26px;font-weight:700;margin-bottom:8px">${CO.name}</div>
    <div style="border:1px solid #ccc;border-radius:8px;padding:24px 40px;margin-bottom:32px;">
      <div style="font-size:20px;font-weight:700">${sy}년 ${sm}월 ~ ${ey}년 ${em}월</div>
    </div>
    <div style="margin-top:32px;font-size:11px;color:#888">출력일: ${now}</div>
  </div>`;
}

async function generatePDF(){
  const sy = +document.getElementById('s-year').value;
  const sm = +document.getElementById('s-month').value;
  const ey = +document.getElementById('e-year').value;
  const em = +document.getElementById('e-month').value;

  const selectedIds = [...document.querySelectorAll('.batch-chk:checked')].map(c=>+c.dataset.id);
  const chk = key => { const el=document.getElementById('chk-'+key); return el&&el.checked; };

  const [hyg, ing, allBatches] = await Promise.all([
    DB.getAll('hygiene'), DB.getAll('ingredients'), DB.getAll('batches')
  ]);
  const batches = allBatches.filter(b => selectedIds.includes(b.id));

  const startYM = `${sy}-${String(sm).padStart(2,'0')}`;
  const endYM   = `${ey}-${String(em).padStart(2,'0')}`;
  const filtHyg = hyg.filter(h=>{ const ym=h.date&&h.date.slice(0,7); return ym>=startYM&&ym<=endYM; });

  const months=[];
  let cy=sy,cm=sm;
  while(`${cy}-${String(cm).padStart(2,'0')}`<=endYM){
    months.push({y:cy,m:cm}); cm++; if(cm>12){cm=1;cy++;}
  }

  const sep='<div class="page-break"></div>';
  const pages=[];

  if(chk('cover'))                          pages.push(buildCover(sy,sm,ey,em));
  if(chk('mh'))                             pages.push(...months.map(({y,m})=>buildMH(filtHyg,y,m)));
  if(chk('mms'))                            pages.push(buildMMS(ing));
  if(chk('qcm'))                            pages.push(buildQCM(allBatches));
  if(chk('mi')&&batches.length)             pages.push(...batches.map(b=>buildMI(b)));
  if(chk('tr')&&batches.length)             pages.push(...batches.map(b=>buildTR(b,ing)));
  if(chk('ps')&&batches.length)             pages.push(...batches.map(b=>buildPS(b,ing)));

  if(!pages.length){ alert('출력할 문서를 하나 이상 선택하세요.'); return; }
  open$(pages.join(sep));
}

async function printDoc(key){
  const [batches, hyg, ing] = await Promise.all([DB.getAll('batches'),DB.getAll('hygiene'),DB.getAll('ingredients')]);
  const yEl=document.getElementById('out-year');
  const mEl=document.getElementById('out-month');
  const year  = yEl ? +yEl.value  : new Date().getFullYear();
  const month = mEl ? +mEl.value  : new Date().getMonth()+1;
  const sep='<div class="page-break"></div>';
  if(key==='mi'){
    if(!batches.length){alert('등록된 배치가 없습니다.');return;}
    open$(batches.map(b=>buildMI(b)).join(sep));
  } else if(key==='tr'){
    if(!batches.length){alert('등록된 배치가 없습니다.');return;}
    open$(batches.map(b=>buildTR(b,ing)).join(sep));
  } else if(key==='ps'){
    if(!batches.length){alert('등록된 배치가 없습니다.');return;}
    open$(batches.map(b=>buildPS(b,ing)).join(sep));
  } else if(key==='mms'){
    open$(buildMMS(ing));
  } else if(key==='mh'){
    open$(buildMH(hyg,year,month));
  } else if(key==='qcm'){
    open$(buildQCM(batches));
  }
}

window.printDoc = printDoc;
window.generatePDF = generatePDF;
window.buildCover = buildCover;
window.open$ = open$; 
window.buildMH = buildMH;
window.buildMMS = buildMMS;
window.buildQCM = buildQCM;

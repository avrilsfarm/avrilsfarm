/* ═══════════════════════════════════════
   에이브릴팜 PDF 출력 모듈 v2
   4대 기준서 양식 그대로 재현
   화장품제조업 등록번호 제6494호
   책임판매업 등록번호 제18216호
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
   시험성적서 (AF-TR)
   법정검사(CT/SC) 삭제:
   ① 원자재 시험성적서 (자사 육안검사)
   ② 자사 완제품 육안검사
   ③ 종합 판정 및 성적서 첨부
───────────────────────────────────── */
function buildTR(data, allIng, products){
  // data는 localStorage trReport 또는 구형 batch 객체 모두 지원
  const isTrData = !!data.recipe; // localStorage trReport는 recipe 키를 가짐
  const prod = isTrData ? {} : ((products||[]).find(p=>p.id===data.productId) || {});
  const docNo = data.docNo || prod.시험성적서번호 || data.시험성적서번호 || 'AF-TR-00X';
  const recipe = isTrData ? (data.recipe||[]) : (prod.시험원료?.length ? prod.시험원료 : (prod.레시피?.length ? prod.레시피 : (data.시험원료?.length ? data.시험원료 : [])));
  const productName = data.productName || data.제품명 || prod.제품명 || '';
  const mw = prod.목표중량 || data.목표중량 || '90g ±5g';
  const cs = data.색상기준 || prod.색상기준 || '';
  // KCL 데이터: localStorage trReport 또는 product에서
  const kclNo = data.KCL || prod.KCL || '';
  const kclIssueNo = data.KCL발행번호 || prod.KCL발행번호 || '';
  const ctNo = data.CT접수번호 || prod.CT접수번호 || '';
  const kclContent = data.KCL내용량 || prod.KCL내용량 || '';
  const kclAlkali = data.KCL유리알칼리 || prod.KCL유리알칼리 || '';
  const kclDryWeight = data.KCL건조중량 || prod.KCL건조중량 || '';
  const kclRcvDate = data.KCL접수일 || prod.KCL접수일 || '';
  const kclIssueDate = data.KCL발행일 || prod.KCL발행일 || '';

  // ① 원자재 행 — 레시피 기준
  const ingRows = recipe.map((r,n) => {
    const matched = allIng.find(i=>i.원료명&&r.원료명&&(i.원료명===r.원료명||i.원료명.includes(r.원료명.replace(/^[EF]O\s/,''))));
    return `<tr>
      <td class="c">${n+1}</td>
      <td>${r.원료명}</td>
      <td>${r.제조처||matched?.제조처||''}</td>
      <td class="c">성상·이물</td>
      <td class="c">이상없음</td>
      <td class="c green">■적합 □부적합</td>
      <td class="c">${CO.owner}</td>
    </tr>`;
  }).join('');

  return hd('시험성적서','Test Report · '+productName, docNo, data.개정번호||'Rev.01', data.제정일자||data.date||'') + `

  <div class="sec">▶ ① 원자재 시험성적서 (자사 육안검사)</div>
  <p class="note">※ 원료 입고 시마다 작성. 성상·이물 육안 확인. CoA 별도 첨부</p>
  <table>
    <thead><tr><th>No</th><th>원 료 명</th><th>제조처 / 로트번호</th><th>시험항목</th><th>시험성적</th><th>판 정</th><th>시험자</th></tr></thead>
    <tbody>
      ${ingRows||`<tr><td colspan="7" style="color:#999;text-align:center">시험성적서 docx를 업로드해주세요</td></tr>`}
      <tr>
        <td colspan="2" class="h">종합판정</td>
        <td colspan="5" class="green">■ 전 항목 적합 — 제조 진행 &nbsp;&nbsp;&nbsp; □ 부적합 → 격리/반품/폐기</td>
      </tr>
    </tbody>
  </table>
  <p class="note">※ 제조처 CoA 별도 수취 첨부.</p>

  <div class="sec">▶ ② 자사 완제품 육안검사</div>
  <table>
    <thead><tr><th>검사 항목</th><th>기 준</th><th>검사 결과</th><th>판 정</th><th>시험자</th></tr></thead>
    <tbody>
      <tr>
        <td>성 상</td><td>고형, 표면 균일, 이물 없음</td><td>이상없음</td>
        <td class="c green">■적합 □부적합</td><td class="c">${CO.owner}</td>
      </tr>
      <tr>
        <td>색 상</td><td>${cs}</td><td>${data.색상결과||'이상없음'}</td>
        <td class="c green">■적합 □부적합</td><td class="c">${CO.owner}</td>
      </tr>
      <tr>
        <td>이 물</td><td>불검출</td><td>■불검출 &nbsp;□검출</td>
        <td class="c green">■적합 □부적합</td><td class="c">${CO.owner}</td>
      </tr>
      <tr>
        <td>중량 (건조)</td><td>${mw}</td>
        <td class="c"><b>${data.실측중량?data.실측중량+'g':''}</b></td>
        <td class="c ${data.실측중량?'green':''}">${data.실측중량?'■적합 □부적합':''}</td>
        <td class="c">${CO.owner}</td>
      </tr>
    </tbody>
  </table>

${kclNo ? `
  <div class="sec">▶ ③ 완제품 시험성적서 — ${kclNo.replace(/-.*$/,'')} (KCL 공식 품질검사)</div>
  <p class="note">※ 화장비누 법정 검사항목: 내용량(건조) · 유리알칼리</p>
  <table>
    <thead><tr><th>제 품 명</th><th colspan="2">${productName}</th><th>제품코드</th><th colspan="2">${data.barcode||''}</th></tr></thead>
    <tbody>
      <tr><td class="h">접수번호</td><td>${kclNo}</td><td class="h">발행번호</td><td>${kclIssueNo}</td></tr>
      <tr><td class="h">접수일</td><td>${kclRcvDate}</td><td class="h">발행일</td><td>${kclIssueDate}</td></tr>
      <tr><td class="h" colspan="4">시험기관: 한국건설생활환경시험연구원 (KCL) — 식약처 지정 화장품 제3호</td></tr>
    </tbody>
  </table>
  <table style="margin-top:4px">
    <thead><tr><th>시험·검사 항목</th><th>단 위</th><th>시험·검사 기준</th><th>결 과</th><th>합격 판정</th></tr></thead>
    <tbody>
      <tr><td>내용량 (건조)</td><td class="c">%</td><td class="c">97 이상</td><td class="c"><b>${kclContent}</b></td><td class="c green">■ 적합</td></tr>
      <tr><td>유리알칼리</td><td class="c">%</td><td class="c">0.1 이하</td><td class="c"><b>${kclAlkali}</b></td><td class="c green">■ 적합</td></tr>
    </tbody>
  </table>
  <table style="margin-top:4px">
    <tr><td class="h" style="width:22%">종합 판정</td><td class="green big">■ 적 합</td></tr>
  </table>
` : ''}
  <div class="sec">▶ ${kclNo ? '④' : '③'} 종합 판정 및 성적서 첨부</div>
  <table>
    <tr>
      <td class="h" style="width:22%">종합 판정</td>
      <td class="green big">■ 출하 승인 &nbsp;&nbsp;&nbsp; □ 출하 보류</td>
    </tr>
    <tr>
      <td class="h">SC 성적서<br>원본 첨부</td>
      <td>${kclNo ? `■ 첨부 완료 (접수번호: ${kclNo} / 발행번호: ${kclIssueNo})<br><span style="font-size:8px;color:#555">*본 KCL SC 성적서는 제품 출시 전 초도 생산품에 대한 품질 검사 결과로, 본 생산 건의 제형 및 품질 안전성 증빙 자료로 갈음함</span>` : '□ 미첨부 — 시험성적서 docx를 업로드해주세요'}</td>
    </tr>${ctNo ? `
    <tr>
      <td class="h">CT 성적서<br>원본 첨부</td>
      <td>■ 첨부 완료 (성적서번호: ${ctNo} — 참고용)</td>
    </tr>` : ''}
    <tr><td class="h">총괄책임자</td><td>${CO.owner} &nbsp;(인)</td></tr>
  </table>
  ` + ft();
}


/* ─────────────────────────────────────
   원료입고기록서 (R-MMS-01) + 설비관리기록서 (R-MMS-02)
───────────────────────────────────── */
function buildMMS(ing, hyg){
  const rows = ing.filter(i=>i.stockType!=='포장재').map((i,n)=>`<tr>
    <td class="c">${i.입고일||''}</td>
    <td>${i.원료명}</td>
    <td>${i.제조처||''}</td>
    <td class="c">${i.수량||''}</td>
    <td class="c">${i.CoA==='수취'?'■양호 □불량':'□양호 ■불량'}</td>
    <td class="c">${i.CoA==='수취'?'■수취 □미수취':i.CoA==='미수취'?'□수취 ■미수취':'□수취 □미수취'}</td>
    <td class="c">${i.판정==='적합'?'■이상없음 □이상있음':'□이상없음 □이상있음'}</td>
    <td class="c">${i.판정==='적합'?'■없음 □있음':'□없음 □있음'}</td>
    <td class="c">${i.판정==='적합'?'■이상없음 □이상있음':'□이상없음 □이상있음'}</td>
    <td class="c ${i.판정==='적합'?'green':i.판정==='부적합'?'red':''}">${i.판정==='적합'?'■적합 □부적합':i.판정==='부적합'?'□적합 ■부적합':'□적합 □부적합'}</td>
    <td class="c">${CO.owner}</td>
  </tr>`).join('');

  const empty = Array(Math.max(0,5-ing.filter(i=>i.stockType!=='포장재').length))
    .fill(`<tr><td></td><td></td><td></td><td></td><td>□양호 □불량</td><td>□수취 □미수취</td><td>□이상없음 □이상있음</td><td>□없음 □있음</td><td>□이상없음 □이상있음</td><td>□적합 □부적합</td><td></td></tr>`).join('');

  /* R-MMS-02: 설비관리기록서 (분기별) */
  const allEquip = (hyg||[]).filter(h=>h.type==='설비점검');
  const equipItems = ['전자저울','스틱블렌더','온도계','실리콘몰드','스테인리스용기','기타기구'];
  const quarters = [
    {label:'1/4분기 (1~3월)', months:['01','02','03']},
    {label:'2/4분기 (4~6월)', months:['04','05','06']},
    {label:'3/4분기 (7~9월)', months:['07','08','09']},
    {label:'4/4분기 (10~12월)', months:['10','11','12']},
  ];
  const curYear = new Date().getFullYear();
  const equipRows = quarters.map(q=>{
    const rec = allEquip.find(h=>{
      const m = h.date?.slice(5,7);
      return q.months.includes(m);
    });
    const itemCells = equipItems.map(k=>{
      if(!rec) return `<td class="c">□정상 □이상</td>`;
      const v = rec.items?.[k]||'정상';
      return `<td class="c ${v==='정상'?'green':'red'}">${v==='정상'?'■정상 □이상':'□정상 ■이상'}</td>`;
    }).join('');
    return `<tr>
      <td class="c">${curYear} ${q.label}</td>
      <td class="c">${rec?CO.owner:CO.owner}</td>
      ${itemCells}
      <td>${rec?.이슈||(!rec?'':rec.status==='완료'?'이상 없음':'')}</td>
    </tr>`;
  }).join('');

  return hd('제조관리기준서 기록서','R-MMS-01 원료입고기록서 (입고확인 + 품질검사 통합)','R-MMS-01','Rev.00','2026.05.27') + `
  <p class="note">※ 원료 입고 시마다 기록. CoA 수취 후 이 기록서와 함께 보관.</p>
  <table>
    <thead>
      <tr>
        <th rowspan="2">입고일<br>(주문일)</th>
        <th rowspan="2">원 료 명</th>
        <th rowspan="2">제조처/<br>로트번호</th>
        <th rowspan="2">수량</th>
        <th rowspan="2">포장<br>상태</th>
        <th rowspan="2">CoA<br>수취</th>
        <th colspan="3">육안 검사</th>
        <th rowspan="2">판 정</th>
        <th rowspan="2">확인자</th>
      </tr>
      <tr><th>성상</th><th>이물</th><th>색상</th></tr>
    </thead>
    <tbody>${rows}${empty}</tbody>
  </table>
  <p class="note">※ 포장 불량·이물 발견·CoA 미수취 시 해당 원료 즉시 격리 후 반품/폐기. 부적합 사유는 별도 기재.</p>
  ` + ft() + `
  <div class="page-break"></div>
  ` + hd('제조관리기준서 기록서','R-MMS-02 설비관리기록서','R-MMS-02','Rev.00','2026.05.27') + `
  <p class="note">※ 분기 1회 이상 점검. 이상 시 이상 내용 및 조치 기재. 전자저울 연 1회 검교정.</p>
  <table>
    <thead>
      <tr>
        <th>점검 분기</th><th>확인자</th>
        <th>전자저울</th><th>스틱블렌더</th><th>온도계</th>
        <th>실리콘몰드</th><th>스테인리스용기</th><th>기타기구</th>
        <th>이상 내용 및 조치</th>
      </tr>
    </thead>
    <tbody>${equipRows}</tbody>
  </table>
  <p class="note">※ 이상 발견 시 즉시 사용 중단 → "사용불가" 표시 → 수리/교체 후 재점검.</p>
  ` + ft();
}

/* ─────────────────────────────────────
   위생점검기록서 (R-MH-01 + R-MH-02)
───────────────────────────────────── */
function buildMH(hyg, year, month, monthEnd){
  const startMo = month, endMo = monthEnd || month;
  const clean = hyg.filter(h=>{
    if(h.type!=='청소점검'||!h.date) return false;
    const m = +h.date.slice(5,7);
    return h.date.startsWith(String(year)) && m >= startMo && m <= endMo;
  }).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const pest  = hyg.filter(h=>h.type==='방충방서');
  const monthLabel = startMo === endMo ? `${month}월` : `${startMo}~${endMo}월`;

  const cleanRows = clean.map(r=>`<tr>
    <td class="c">${r.date?.slice(5).replace('-','.')}</td>
    <td class="c">${CO.owner}</td>
    <td class="c ${r.items?.원료보관==='청결'?'green':''}">${r.items?.원료보관==='청결'?'■청결 □불량':'□청결 ■불량'}</td>
    <td class="c ${r.items?.부자재==='청결'?'green':''}">${r.items?.부자재==='청결'?'■청결 □불량':'□청결 ■불량'}</td>
    <td class="c ${r.items?.완제품==='청결'?'green':''}">${r.items?.완제품==='청결'?'■청결 □불량':'□청결 ■불량'}</td>
    <td class="c ${r.items?.작업대==='청결'?'green':''}">${r.items?.작업대==='청결'?'■청결 □불량':'□청결 ■불량'}</td>
    <td class="c ${r.items?.도구류==='청결'?'green':''}">${r.items?.도구류==='청결'?'■청결 □불량':'□청결 ■불량'}</td>
    <td class="c ${r.items?.포장실==='청결'?'green':''}">${r.items?.포장실==='청결'?'■청결 □불량':'□청결 ■불량'}</td>
    <td>${r.이슈||''}</td>
  </tr>`).join('');

  const cleanEmpty = Array(Math.max(0,8-clean.length))
    .fill(`<tr><td></td><td></td><td>□청결 □불량</td><td>□청결 □불량</td><td>□청결 □불량</td><td>□청결 □불량</td><td>□청결 □불량</td><td>□청결 □불량</td><td></td></tr>`).join('');

  const months=['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const pestRows = months.map((m,i)=>{
    const r = pest.find(p=>p.date?.startsWith(`${year}-${String(i+1).padStart(2,'0')}`));
    return `<tr>
      <td class="c">${m}</td>
      <td class="c">${CO.owner}</td>
      <td class="c ${r?.방충망==='양호'?'green':''}">${r?chk(r.방충망==='양호','양호','불량'):'□양호 □불량'}</td>
      <td class="c ${r?.해충==='없음'?'green':'red'}">${r?chk(r.해충==='없음','없음','있음'):'□없음 □있음'}</td>
      <td class="c ${r?.설치류==='없음'?'green':'red'}">${r?chk(r.설치류==='없음','없음','있음'):'□없음 □있음'}</td>
      <td>${r?.이슈||''}</td>
    </tr>`;
  }).join('');

  return hd('제조위생관리기준서 기록서','R-MH · 작업장청소점검표 + 방충방서점검표','R-MH','Rev.00','2026.05.27') + `

  <div class="sec">■ R-MH-01 &nbsp;작업장청소점검표 &nbsp;✓청결 &nbsp;✗불량 &nbsp;·&nbsp; ${year}년 ${monthLabel}</div>
  <p class="note">※ 제조 작업 전·후 매회 기록.</p>
  <table>
    <thead><tr>
      <th>날짜</th><th>확인자</th>
      <th>원료보관</th><th>부자재보관</th><th>완제품보관</th>
      <th>작업대(칭량)</th><th>도구류(조제)</th><th>포장실</th><th>비고</th>
    </tr></thead>
    <tbody>${cleanRows}${cleanEmpty}</tbody>
  </table>

  <div class="sec" style="margin-top:18px">■ R-MH-02 &nbsp;방충·방서 월간 점검표 &nbsp;·&nbsp; ${year}년</div>
  <p class="note">※ 월 1회 이상 점검. 이상 발견 시 즉시 조치 후 내용 기재.</p>
  <table>
    <thead><tr><th>점검월</th><th>확인자</th><th>방충망 상태</th><th>해충 발견</th><th>설치류</th><th>조치 내용</th></tr></thead>
    <tbody>${pestRows}</tbody>
  </table>
  ` + ft();
}

/* ─────────────────────────────────────
   완제품 출하검사기록서 (R-QCM-01 + R-QCM-02)
   중량 직접 기입 포함
───────────────────────────────────── */
function buildQCM(batches, products){
  const prodMap = {};
  (products||[]).forEach(p=>{ prodMap[p.id]=p; });

  const rows = batches.map(b=>{
    const prod = prodMap[b.productId]||{};
    return `<tr>
    <td class="c">${b.검사일||b.date||''}</td>
    <td>${b.제품명} / ${b.제조번호||''}</td>
    <td class="c">${prod.KCL?'■확인 □미확인':'□확인 □미확인'}</td>
    <td class="c green">■이상없음 □이상있음</td>
    <td class="c green">■이상없음 □이상있음</td>
    <td class="c green">■없음 □있음</td>
    <td class="c"><b>${b.실측중량||''}</b></td>
    <td class="c green">■확인 □미확인</td>
    <td class="c ${b.이상==='이상없음'?'green':'red'}">${b.이상==='이상없음'?'■적합 □부적합':'□적합 ■부적합'}</td>
    <td class="c">${CO.owner}</td>
  </tr>`;}).join('');

  const empty = Array(Math.max(0,6-batches.length))
    .fill(`<tr><td></td><td></td><td>□확인 □미확인</td><td>□이상없음 □이상있음</td><td>□이상없음 □이상있음</td><td>□없음 □있음</td><td></td><td>□확인 □미확인</td><td>□적합 □부적합</td><td>${CO.owner}</td></tr>`).join('');

  const specimenRows = batches.map(b=>{
    return `<tr>
      <td class="c"></td>
      <td>${b.제품명}</td>
      <td class="c">${b.제조번호||''}</td>
      <td class="c">${b.date||''}</td>
      <td class="c">${b.date ? b.date.slice(0,4)-(-2)+b.date.slice(4) : ''}</td>
      <td class="c">1~2ea</td>
      <td class="c"></td>
      <td></td>
    </tr>`;
  }).join('');

  const specimenEmpty = Array(Math.max(0,5-batches.length))
    .fill(`<tr><td></td><td></td><td></td><td></td><td></td><td class="c">1~2ea</td><td></td><td></td></tr>`).join('');

  return hd('품질관리기준서 기록서','R-QCM · 완제품 출하검사 + 보관 검체 관리','R-QCM','Rev.00','2026.05.27') + `
  <p class="note">※ 원료 입고검사 기록은 R-MMS-01에 통합 관리합니다.</p>

  <div class="sec">■ R-QCM-01 &nbsp;완제품 출하검사 기록</div>
  <p class="note">※ 포장 완료 후 출하 전 배치마다 작성. KCL 성적서 있는 품목은 성적서 확인 체크.</p>
  <table>
    <thead>
      <tr>
        <th>검사일</th><th>제품명 / 제조번호</th><th>KCL성적서확인</th>
        <th>성상(육안)</th><th>색상(육안)</th><th>이물(육안)</th>
        <th>중량(g)</th><th>표시사항확인</th><th>종합판정</th><th>확인자</th>
      </tr>
    </thead>
    <tbody>${rows}${empty}</tbody>
  </table>
  <p class="note">※ KCL 성적서 없는 품목은 자사 시험성적서(3-2) 작성. 부적합 시 출하 즉시 중단 후 원인 조사.</p>

  <div class="sec" style="margin-top:18px">■ R-QCM-02 &nbsp;보관 검체 관리 기록</div>
  <p class="note">※ 각 배치 완제품 1~2개를 사용기한까지 보관. 라벨(제조번호·제조일·사용기한) 필수 부착.</p>
  <table>
    <thead><tr><th>등록일</th><th>제 품 명</th><th>제조번호</th><th>제조일자</th><th>사용기한</th><th>보관수량</th><th>폐기예정일</th><th>비 고</th></tr></thead>
    <tbody>${specimenRows}${specimenEmpty}</tbody>
  </table>
  ` + ft();
}

/* ─────────────────────────────────────
   제조지시서·제조기록서 통합양식 (AF-MI) — 시제품·본생산 공통
   데스크탑 양식(03_제조·인증/09_양식·기타/…AF-MI…docx)과 같은 구조
   PDF(buildMI)와 워드(createDocx)가 모두 miModel()을 쓴다
───────────────────────────────────── */
function miModel(batch, prod){
  batch = batch||{}; prod = prod||{};
  const recipe = prod.레시피?.length ? prod.레시피 : (batch.레시피||[]);
  const mfgNo = batch.제조번호||'';
  const isTrial = /^APB-T/i.test(mfgNo) || batch.구분==='시제품';
  const isMain = !!mfgNo && !isTrial;
  const method = prod.제조방법||batch.제조방법||'';
  const ck = (on)=> on?'■':'☐';
  const input = batch.투입량 ? Number(batch.투입량) : 0;
  const theory = prod.이론수량 || batch.이론수량 || '';
  const yieldPct = (batch.실제수량 && theory) ? Math.round(batch.실제수량/theory*100) : '';
  const steps = (batch.공정?.length ? batch.공정 : (prod.공정||[])).map(s=>[String(s.단계||''), [s.공정명,s.작업내용].filter(Boolean).join(' — '), s.관리기준||'']);
  const isMP = /MP/i.test(method);
  const defCP = [
    ['1','가성소다액 제조 (물에 가성소다 투입)','완전 용해 / 레시피 기준 ____℃'],
    ['2','오일 용해·혼합','레시피 기준 ____℃'],
    ['3','가성소다액 + 오일 혼합','레시피 기준 ____℃ (팜 배합 시 융점 아래 금지)'],
    ['4','블렌더 교반','레시피 기준 ____초 후 주걱 교반'],
    ['5','트레이스 판정 ① (색소 투입 직전)','라이트 / 미디엄 / 헤비'],
    ['6','색상별 비커 분할 → 비커에서 색소 분산','벌크에서 색소 혼합 금지'],
    ['7','후첨 오일·향 투입','배합표 지시량'],
    ['8','트레이스 판정 ② (몰드 투입 직전)','라이트 / 미디엄 / 헤비'],
    ['9','분주 (붓기 직전 블렌더 3~5초)','컬러 구간 8분 이내, 마지막 몰드까지 부어서 퍼질 것'],
    ['10','잔량 처리','긁은 잔량은 소형 몰드로 분리 (출고 제외)'],
    ['11','보온','24시간'],
    ['12','탈형·절단','일자 기록'],
    ['13','건조','최소 2주 / 완료 예정일'],
  ];
  const defMP = [
    ['1','베이스 계량·용해','레시피 기준 ____℃'],
    ['2','첨가물·색소·향 투입','배합표 지시량 / 레시피 기준 ____℃'],
    ['3','몰드 투입','기포 제거'],
    ['4','냉각·탈형','일자 기록'],
    ['5','포장','밀봉 (수분 맺힘 방지)'],
  ];
  return {
    isTrial, isMain,
    docNo: batch.문서번호||'AF-MI-____',
    rev: batch.개정번호||'Rev.00',
    kindLine: `${ck(isTrial)} 시제품 (TEST)     ${ck(isMain)} 본생산`,
    methodLine: `${ck(/CP/i.test(method))} CP   ${ck(isMP)} MP   ${ck(/HP/i.test(method))} HP`,
    info: [
      ['제 품 명', batch.제품명||prod.제품명||'', '제조번호', mfgNo],
      ['바코드', prod.바코드||batch.바코드||'', '제조지시자', CO.owner+' (인)'],
      ['제품표준서 번호', isTrial?'해당 없음 (시제품)':(prod.문서번호||'AF-PS-____'), '배합표 버전', prod.개정번호||'Rev.__'],
      ['제조연월일', batch.date||'     .    .', '작업 시간', '  :   ~   :  '],
      ['제조단위', input?`${input.toLocaleString()}g${theory?` (목표 ${theory}개)`:''}`:'          g (목표     개)', '몰드 규격 × 수', '          g ×     개'],
      ['배치 설계량', '몰드 정량 합계 × (1 + 여유분 __%) =          g', '이론수량', theory?`${theory}개 (1kg 몰드당 9개)`:'몰드 kg × 9개 =       개'],
      ['작업장 온도/습도', '        ℃  /       %', '사용기한', prod.유통기한||'제조일로부터 2년'],
    ],
    infoNote: '※ 제조번호: 본생산 APB+색상코드+월(2)+번호(3) 예 APBO10001 / 시제품 APB-T+색상코드+월(2)+순번(3) 예 APB-TP11001  ※ 수율 기준 1kg당 9개  ※ 여유분 증량 시 전 원료에 같은 계수 (가성소다 누락 금지)',
    recipeHead: ['No','원 료 명','INCI 명칭','이론량(g)','비율(%)','로트·시험번호','실사용량(g)','확인'],
    recipe: recipe.length
      ? recipe.map((r,i)=>[String(i+1), r.원료명||'', r.INCI||'', String(r.이론량??''), String(r.비율??''), r.로트||'', r.실사용량!=null?String(r.실사용량):'', '☐'])
      : Array.from({length:12},(_,i)=>[String(i+1),'','','','','','','☐']),
    recipeTotal: input?`${input.toLocaleString()}g`:'',
    allergy: prod.알레르기||batch.알레르기||'',
    summary: [['총 오일','          g','W : L','     :  1','가성소다 농도','        %'],['Super Fat','        %','후첨 오일 비율','        %','계산 근거','SoapCalc']],
    recipeNote: '※ 원료명은 원료목록보고 등록명  ※ 칭량 허용오차 ±1% 이내  ※ CP Super Fat −1%는 가성소다 순도 99% 보정값  ※ MP는 베이스명·로트를 원료 칸에 기입',
    equip: [['전자저울',''],['스틱블렌더',''],['실리콘몰드',''],['스테인리스 용기',''],['온도계',''],['보호구 (장갑·고글·마스크)','']],
    equipNote: '※ 설비 점검 기록은 R-MMS-02 (분기 점검)',
    checks: [['작업장·기구 위생 처리 (AF-HMS-001)','저울 영점 확인'],['보호구 착용 (장갑·보안경·마스크)','원료 외관·사용기한 확인'],['팜오일 녹여 균질화 후 계량 (소분분 포함)','잔량용 소형 몰드(150~200g) 비치'],['빈 벌크 용기 무게 측정:          g','몰드 수평·라벨(제조번호) 부착']],
    stepHead: ['No','작업','기준','실측','시각','확인'],
    steps: (steps.length ? steps : (isMP?defMP:defCP)).map(s=>[s[0],s[1],s[2],'','','☐']).concat([['','','','','',''],['','','','','','']]),
    stepNote: '※ 공정 기준값(온도·시간)은 레시피마다 다름 — 해당 배합표 값 기입  ※ 트레이스: 라이트 = 자국 1~2초 소멸 / 미디엄 = 3~5초 유지 / 헤비 = 자국 유지  ※ 마지막 몰드를 떠 넣었으면 7항에 공정 이탈로 기록',
    result: [
      ['이론수량', theory?`${theory}개`:'          개', '생산 수량', batch.실제수량?`${batch.실제수량}개`:'          개'],
      ['수율', yieldPct!==''?`${yieldPct}%`:'생산 ÷ 이론 × 100 =       %', '출고 가능 수량', '          개'],
      ['불량 수량', '          개', '잔량 몰드(출고 제외)', '          개 /        g'],
    ],
    defectLine: '☐ 미혼합 자국  ☐ 글리세린강  ☐ 부분젤  ☐ 팜꽃  ☐ 기타(          )',
    faultLine: batch.이상==='이상있음' ? '☐ 이상 없음     ■ 이상 있음' : (batch.이상==='이상없음' ? '■ 이상 없음     ☐ 이상 있음' : '☐ 이상 없음     ☐ 이상 있음'),
    faultHead: ['발생 단계','내용','원인 (추정)','조치','다음 배치 반영'],
    faults: [['', batch.이상==='이상있음'?(batch.비고||''):'', '', '', ''],['','','','',''],['','','','','']],
    trialHead: ['항목','탈형 시','2주','4주','메모'],
    trial: ['외관·색','향','경도·무름','거품·사용감','pH','땀(발한)·변색'].map(x=>[x,'','','','']),
    judge: [['판정','☐ 본생산 승격     ☐ 수정 후 재시험 (Rev.__ 로)     ☐ 폐기'],['승격 시 후속','☐ 배합표 버전 확정   ☐ 제품표준서 작성·개정 (AF-PS-____)   ☐ KCL 시험 의뢰 검토']],
    links: [['제조번호 공방비서 등록','신규 원료 입고 시 R-MMS-01 기록'],['완제품 출하검사 R-QCM-01','보관 검체 R-QCM-02 (수량·위치·기한)'],['라벨 데이터 전달 (전성분·제조번호·사용기한)','재고 반영 (페이히어)']],
  };
}

function buildMI(batch, products){
  const prod = (products||[]).find(p=>p.id===batch.productId) || {};
  const M = miModel(batch, prod);
  const esc = t => String(t??'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const kv = rows => `<table>${rows.map(r=>`<tr>${r.map((c,i)=>i%2===0?`<td class="h" style="width:16%">${esc(c)}</td>`:`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;
  const grid = (head, rows, c) => `<table><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((x,i)=>`<td${(c||[]).includes(i)?' class="c"':''}>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const chk = rows => `<table>${rows.map(r=>`<tr>${r.map(x=>`<td class="c" style="width:4%">☐</td><td>${esc(x)}</td>`).join('')}</tr>`).join('')}</table>`;
  const sec = t => `<div class="sec">▶ ${t}</div>`;
  const note = t => `<p class="note" style="margin-top:-6px">${esc(t)}</p>`;

  return hd('제조지시서 · 제조기록서','시제품·본생산 공통 · '+(batch.제품명||''), M.docNo, M.rev, batch.date||'') + `
  <table><tr><td class="h" style="width:16%">구분</td><td>${M.kindLine}</td><td class="h" style="width:16%">제법</td><td>${M.methodLine}</td></tr></table>
  ${sec('1. 배치 정보')}${kv(M.info)}${note(M.infoNote)}
  ${sec('2. 원료명·분량·시험번호·실사용량')}
  ${grid(M.recipeHead, M.recipe.concat([['합 계','','',M.recipeTotal,'100','','','']]), [0,3,4,6,7])}
  ${kv(M.summary)}${M.allergy?note('※ 향료 유래 알레르기 유발성분: '+M.allergy):''}${note(M.recipeNote)}
  ${sec('3. 사용 설비')}${grid(['설비명','관리번호 / 점검 상태'], M.equip)}${note(M.equipNote)}
  ${sec('4. 작업 전 점검')}${chk(M.checks)}
  ${sec('5. 공정 기록')}${grid(M.stepHead, M.steps, [0,5])}${note(M.stepNote)}
  ${sec('6. 결과 · 수율')}${kv(M.result)}<table style="margin-top:-12px"><tr><td class="h" style="width:16%">불량 유형</td><td>${M.defectLine}</td></tr></table>
  ${sec('7. 이상 · 공정 이탈 기록')}<table><tr><td class="h" style="width:16%">이상 여부</td><td>${M.faultLine}</td></tr></table>${grid(M.faultHead, M.faults)}
  ${sec('8. 시제품 평가 (시제품만)')}${grid(M.trialHead, M.trial)}${kv(M.judge)}
  ${sec('9. 본생산 연계 (본생산만)')}${chk(M.links)}
  ${sec('10. 서명')}<table><tr><td class="h" style="width:16%">작성자</td><td>(서명)    /    /</td><td class="h" style="width:16%">확인자</td><td>(서명)    /    /</td></tr></table>
  ` + ft();
}

/* ─────────────────────────────────────
   제품표준서 (AF-PS)  ← 앱 내 신규 작성 가능
───────────────────────────────────── */
function buildPS(batch, allIng, products){
  const prod = (products||[]).find(p=>p.id===batch.productId) || {};
  const psNo = (prod.문서번호 || batch.문서번호 || 'AF-PS-00X').replace('AF-MI','AF-PS');
  const recipe = prod.시험원료?.length ? prod.시험원료 : (prod.레시피?.length ? prod.레시피 : (batch.시험원료?.length ? batch.시험원료 : []));
  const mw = prod.목표중량 || batch.목표중량 || '90g ±5g';
  const iTheory = prod.이론수량 || batch.이론수량 || 9;
  const allergy = prod.알레르기 || batch.알레르기 || '';
  const barcode = prod.바코드 || batch.바코드 || '';

  const psRevNo = prod.개정번호 || 'Rev.01';
  const psEstDate = prod.제정일자 || batch.date || '';

  return hd('제품표준서','Product Standard · '+batch.제품명, psNo, psRevNo, psEstDate) + `
  <div class="sign"><div class="sign-box"><div class="sign-lbl">총괄책임자(제조관리담당자)</div>${CO.owner} (인)</div></div>

  <div class="sec">▶ 1. 기본 정보</div>
  <table>
    <tr><td class="h">표준서 번호</td><td>${psNo}</td><td class="h">제정일자</td><td>${psEstDate||'2024-12-01'}</td></tr>
    <tr><td class="h">제 품 명</td><td><b>${batch.제품명}</b></td><td class="h">내 용 량</td><td>${prod.용량||'90g'} (건조 기준)</td></tr>
    <tr><td class="h">제품 코드</td><td>${batch.제조번호?.split('-')[0]||''}</td><td class="h">바코드 번호</td><td>${barcode}</td></tr>
    <tr><td class="h">유형 및 성상</td><td>인체 세정용 제품류 / 화장비누(고형) / ${prod.색상기준||''}</td><td class="h">제조방법</td><td>${prod.제조방법||'CP법'} (Cold Process, Water:Lye = 1.7:1)</td></tr>
    <tr><td class="h">사용기한</td><td>제조일로부터 2년</td><td class="h">보관방법</td><td>${prod.보관방법||'직사광선 피해 서늘하고 건조한 곳. 물이 잘 빠지는 건조한 곳에 보관.'}</td></tr>
    <tr><td class="h">작성자</td><td>${CO.owner}</td><td class="h">확인 (인)</td><td>${CO.owner}</td></tr>
  </table>

  <div class="sec">▶ 2. 원료 배합표</div>
  <p class="note">※ 기준: 800g 오일 배치 / SoapCalc 레시피 기준 / 비율은 전체 투입량 기준</p>
  <table>
    <thead><tr><th>No</th><th>원 료 명</th><th>INCI 명칭</th><th>이론량(g)</th><th>비율(%)</th><th>비 고</th></tr></thead>
    <tbody>
      ${recipe.map((r,n)=>`<tr>
        <td class="c">${n+1}</td><td>${r.원료명}</td>
        <td style="font-size:8px">${r.INCI||''}</td>
        <td class="r">${r.이론량||''}</td><td class="r">${r.비율||''}</td>
        <td style="font-size:8px">${r.비고||''}</td>
      </tr>`).join('')}
      ${!recipe.length?`<tr><td colspan="6" style="color:#999;text-align:center">표준서에 레시피를 등록해주세요</td></tr>`:''}
      <tr><td colspan="3" class="h" style="text-align:center">합 계</td><td class="r h">${batch.투입량||prod.기준투입량||''}g</td><td></td><td></td></tr>
    </tbody>
  </table>
  ${allergy?`<p class="note">※ 향료 유래 알레르기 유발성분: ${allergy}</p>`:''}
  ${recipe.some(r=>r.원료명.includes('카로틴'))?`<p class="note">※ 카로틴오일 구성: 두날리엘라살리나추출물 20% + 해바라기씨오일 80% / 비누화 반응 전 투입량 기준</p>`:''}

  <div class="sec">▶ 3. 공정별 작업내용 및 이론 생산량</div>
  <table>
    <thead><tr><th>단계</th><th>공정명</th><th>상세 작업 내용</th><th>관리기준</th><th>이론 생산량</th></tr></thead>
    <tbody>
      ${(prod.공정?.length ? prod.공정 : [
        {단계:1,공정명:'칭량',작업내용:'원료를 제조지시서 기준량에 따라 전자저울로 계량 (±1% 이내)',관리기준:'±1% 이내',이론생산량:''},
        {단계:2,공정명:'소다수',작업내용:'정제수에 소듐하이드록사이드 천천히 용해 → 실온 냉각 (내화학성 장갑·고글·마스크 착용 필수)',관리기준:'실온 25~35°C',이론생산량:''},
        {단계:3,공정명:'혼합',작업내용:'오일류 계량 혼합 후 소다수와 지정 온도에서 혼합',관리기준:'27~30°C',이론생산량:''},
        {단계:4,공정명:'첨가물',작업내용:'트레이스 이후 배합표의 첨가물 성분 후첨 교반',관리기준:'트레이스 이후',이론생산량:''},
        {단계:5,공정명:'향료',작업내용:'배합표의 향료 성분 혼합 후 몰드 투입',관리기준:'트레이스 이후',이론생산량:''},
        {단계:6,공정명:'보온·탈형',작업내용:'24시간 보온 후 탈형',관리기준:'24시간',이론생산량:''},
        {단계:7,공정명:'건조',작업내용:'통풍이 잘 되는 곳에서 건조',관리기준:'최소 2주',이론생산량:''},
        {단계:8,공정명:'커팅·포장',작업내용:`1kg 몰드 기준 ${iTheory}개 커팅 → 외관 검사(성상·색상·이물·중량) → 포장·출하`,관리기준:mw,이론생산량:`${iTheory}ea`},
      ]).map(s=>`<tr><td class="c">${s.단계}</td><td>${s.공정명}</td><td>${s.작업내용}</td><td>${s.관리기준||''}</td><td class="r">${s.이론생산량||''}</td></tr>`).join('')}
    </tbody>
  </table>
  <p class="note">※ 수율 계산: 1kg 몰드 기준 ${iTheory}개 커팅 / 포장 완성 시 실제 수율 기록</p>

  <div class="sec">▶ 4. 원자재·완제품 품질 기준 및 시험방법</div>
  <table>
    <thead><tr><th>검사 항목</th><th>기 준</th><th>시험방법</th><th>시험기관</th><th>비 고</th></tr></thead>
    <tbody>
      <tr><td>원자재 (전 원료)</td><td>고유 색택·성상, 이물 불검출</td><td>육안 관능검사</td><td>자사</td><td>입고 시마다. CoA 수취.</td></tr>
      <tr><td>내용량 (건조)</td><td>97% 이상</td><td>화장품 안전기준 등에 관한 규정</td><td>KCL (위탁)</td><td>${prod.KCL||''}</td></tr>
      <tr><td>유리알칼리</td><td>0.1% 이하</td><td>화장품 안전기준 등에 관한 규정</td><td>KCL (위탁)</td><td>${prod.KCL발행일?'발행: '+prod.KCL발행일:''}</td></tr>
      <tr><td>성상 / 색상</td><td>고형, 이물 없음, 표면 균일</td><td>육안 검사</td><td>자사</td><td>포장 전 전수 확인</td></tr>
      <tr><td>중량 (건조)</td><td>${mw}</td><td>저울 계량</td><td>자사</td><td>포장 전 전수 확인</td></tr>
    </tbody>
  </table>

  <div class="sec">▶ 5. 제조 및 품질관리에 필요한 시설·기구</div>
  <p style="padding:5px 8px;border:0.5px solid #ccc;font-size:9px;margin-bottom:12px">전자저울  |  스틱블렌더  |  실리콘몰드(1kg)  |  스테인리스 용기 2개  |  온도계  |  내화학성 장갑·고글·마스크</p>

  <div class="sec">▶ 6. 사용상 주의사항</div>
  <p style="font-size:9px;line-height:1.9;padding:6px 8px;border:0.5px solid #ccc;margin-bottom:12px">
    1. 화장품 사용 후 이상 증상 시 전문의 상담 &nbsp; 2. 상처 부위 사용 자제 &nbsp; 3. 어린이 손 닿지 않는 곳 보관 &nbsp; 4. 직사광선 피해 보관 &nbsp; 5. 눈에 들어갔을 경우 즉시 씻어낼 것 &nbsp; 6. 처음 물이 닿을 때 색상이 빠질 수 있으나 품질에는 이상 없음 (이염 주의)
  </p>

  <div class="sec">▶ 7. 표시기재사항</div>
  <table>
    <tr><td class="h" style="width:20%">제 품 명</td><td>${batch.제품명}</td></tr>
    <tr><td class="h">바코드 번호</td><td>${barcode}</td></tr>
    <tr><td class="h">내 용 량</td><td>${prod.용량||'90g'} (건조 기준)</td></tr>
    <tr><td class="h">전 성 분</td><td style="font-size:8.5px">${prod.전성분||batch.전성분||''}</td></tr>
    <tr><td class="h">사 용 기 한</td><td>제조일로부터 2년</td></tr>
    <tr><td class="h">사 용 방 법</td><td>미온수에 충분히 거품을 낸 뒤 부드럽게 마사지 후 깨끗이 씻어냅니다.</td></tr>
    <tr><td class="h">주 의 사 항</td><td style="font-size:8.5px">1. 화장품 사용 후 이상 증상 시 전문의 상담 &nbsp; 2. 상처 부위 사용 자제 &nbsp; 3. 어린이 손 닿지 않는 곳 보관 &nbsp; 4. 직사광선 피해 보관 &nbsp; 5. 눈에 들어갔을 경우 즉시 씻어낼 것 &nbsp; 6. 처음 물이 닿을 때 색상이 빠질 수 있으나 품질에는 이상 없음 (이염 주의)</td></tr>
    <tr><td class="h">제조업자(책임판매업자)</td><td>${CO.name} / ${CO.addr} / ${CO.tel}</td></tr>
  </table>
  ` + ft();
}

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
   시험성적서 (EF-TR)
   원본 5개 섹션 그대로:
   ① 원자재 시험성적서
   ② 완제품 시험성적서 CT (내용량 단독, 참고용) — 해당시
   ③ 완제품 시험성적서 SC (KCL 공식)
   ④ 자사 완제품 육안검사
   ⑤ 종합 판정 및 성적서 첨부
───────────────────────────────────── */
function buildTR(batch, allIng){
  const ing = allIng.filter(i => i.stockType !== '포장재');
  const docNo = batch.문서번호 ? batch.문서번호.replace('EF-MI','EF-TR') : 'EF-TR-00X';
  const expiry = batch.date ? batch.date.slice(0,4)*1+2 + batch.date.slice(4) : '';

  // ① 원자재 행
  const ingRows = ing.map((i,n) => `<tr>
    <td class="c">${n+1}</td>
    <td>${i.원료명}</td>
    <td>${i.제조처||''}</td>
    <td class="c">성상·이물</td>
    <td class="c">이상없음</td>
    <td class="c green">■적합 □부적합</td>
    <td class="c">${CO.owner}</td>
  </tr>`).join('');

  // CT 성적서 섹션 (batch.CT 있을 때만)
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
  <p class="note">※ 제조처 CoA 별도 수취 첨부.</p>

  ${ctSection}

  <div class="sec">▶ ${scNum} 완제품 시험성적서 (KCL 공식 품질검사)</div>
  <p class="note">※ 화장비누 법정 검사항목: 내용량(건조) · 유리알칼리 / 화장품 안전기준 등에 관한 규정</p>
  <table>
    <tr>
      <td class="h">제 품 명</td><td><b>${batch.제품명||''}</b></td>
      <td class="h">제품코드</td><td>${batch.제조번호?.split('-')[0]||''}</td>
    </tr>
    <tr>
      <td class="h">바코드</td><td>${batch.바코드||''}</td>
      <td class="h">제조번호</td><td>${batch.제조번호||''}</td>
    </tr>
    <tr>
      <td class="h">제조일자</td><td>${batch.date||''}</td>
      <td class="h">사용기한</td><td>${expiry} (2년)</td>
    </tr>
    <tr>
      <td class="h">접수번호</td><td>${batch.KCL||''}</td>
      <td class="h">발행번호</td><td>${batch.KCL발행번호||''}</td>
    </tr>
    <tr>
      <td class="h">접수일</td><td>${batch.KCL접수일||''}</td>
      <td class="h">발행일</td><td>${batch.KCL발행일||''}</td>
    </tr>
    <tr>
      <td class="h">시험기관</td>
      <td colspan="3">한국건설생활환경시험연구원 (KCL) — 식약처 지정 화장품 제3호</td>
    </tr>
  </table>
  <table>
    <thead><tr><th>시험·검사 항목</th><th>단위</th><th>시험·검사 기준</th><th>결 과</th><th>항목 판정</th></tr></thead>
    <tbody>
      <tr>
        <td>내용량 (건조)</td><td class="c">%</td><td class="c">97 이상</td>
        <td class="c"><b>${batch.내용량||''}</b></td>
        <td class="c ${batch.내용량?'green':''}">${batch.내용량?'■ 적합':''}</td>
      </tr>
      <tr>
        <td>유리알칼리</td><td class="c">%</td><td class="c">0.1 이하</td>
        <td class="c"><b>${batch.유리알칼리||''}</b></td>
        <td class="c ${batch.유리알칼리?'green':''}">${batch.유리알칼리?'■ 적합':''}</td>
      </tr>
      <tr><td class="h">시험방법</td><td colspan="4">화장품 안전기준 등에 관한 규정</td></tr>
      <tr><td class="h">종합 판정</td><td colspan="4" class="green big">■ &nbsp; 적 &nbsp; 합</td></tr>
    </tbody>
  </table>

  <div class="sec">▶ ${eyeNum} 자사 완제품 육안검사</div>
  <table>
    <thead><tr><th>검사 항목</th><th>기 준</th><th>검사 결과</th><th>판 정</th><th>시험자</th></tr></thead>
    <tbody>
      <tr>
        <td>성 상</td><td>고형, 표면 균일, 이물 없음</td><td>이상없음</td>
        <td class="c green">■적합 □부적합</td><td class="c">${CO.owner}</td>
      </tr>
      <tr>
        <td>색 상</td><td>${batch.색상기준||'고유 색상'}</td><td>${batch.색상결과||'이상없음'}</td>
        <td class="c green">■적합 □부적합</td><td class="c">${CO.owner}</td>
      </tr>
      <tr>
        <td>이 물</td><td>불검출</td><td>■불검출 &nbsp;□검출</td>
        <td class="c green">■적합 □부적합</td><td class="c">${CO.owner}</td>
      </tr>
      <tr>
        <td>중량 (건조)</td><td>${batch.목표중량||'90g ±5g'}</td>
        <td class="c"><b>${batch.실측중량||''}</b></td>
        <td class="c ${batch.실측중량?'green':''}">${batch.실측중량?'■적합 □부적합':''}</td>
        <td class="c">${CO.owner}</td>
      </tr>
    </tbody>
  </table>

  <div class="sec">▶ ${totalNum} 종합 판정 및 성적서 첨부</div>
  <table>
    <tr>
      <td class="h" style="width:18%">종합 판정</td>
      <td class="green big">■ 출하 승인 &nbsp;&nbsp;&nbsp; □ 출하 보류</td>
    </tr>
    <tr>
      <td class="h">SC 성적서 원본 첨부</td>
      <td>${batch.KCL ? `■ 첨부 완료 (접수번호: ${batch.KCL} / 발행번호: ${batch.KCL발행번호||''})` : '□ 미첨부'}</td>
    </tr>
    ${batch.CT ? `<tr><td class="h">CT 성적서 원본 첨부</td><td>■ 첨부 완료 (성적서번호: ${batch.CT} — 참고용)</td></tr>` : ''}
    <tr><td class="h">총괄책임자</td><td>${CO.owner} &nbsp;(인)</td></tr>
  </table>
  ` + ft();
}

/* ─────────────────────────────────────
   원료입고기록서 (R-MMS-01)
───────────────────────────────────── */
function buildMMS(ing){
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
  ` + ft();
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

  <div class="sec">■ R-MH-01 &nbsp;작업장청소점검표 &nbsp;✓청결 &nbsp;✗불량 &nbsp;·&nbsp; ${year}년 ${month}월</div>
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
function buildQCM(batches){
  const rows = batches.map(b=>`<tr>
    <td class="c">${b.검사일||b.date||''}</td>
    <td>${b.제품명} / ${b.제조번호||''}</td>
    <td class="c">${b.KCL?'■확인 □미확인':'□확인 □미확인'}</td>
    <td class="c green">■이상없음 □이상있음</td>
    <td class="c green">■이상없음 □이상있음</td>
    <td class="c green">■없음 □있음</td>
    <td class="c"><b>${b.실측중량||''}</b></td>
    <td class="c green">■확인 □미확인</td>
    <td class="c ${b.이상==='이상없음'?'green':'red'}">${b.이상==='이상없음'?'■적합 □부적합':'□적합 ■부적합'}</td>
    <td class="c">${CO.owner}</td>
  </tr>`).join('');

  const empty = Array(Math.max(0,6-batches.length))
    .fill(`<tr><td></td><td></td><td>□확인 □미확인</td><td>□이상없음 □이상있음</td><td>□이상없음 □이상있음</td><td>□없음 □있음</td><td></td><td>□확인 □미확인</td><td>□적합 □부적합</td><td>${CO.owner}</td></tr>`).join('');

  const specimenRows = batches.map(b=>{
    const exp = b.date ? (parseInt(b.date)+2).toString().slice(-2)+b.date.slice(4) : '';
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
   제조지시서 (EF-MI)
───────────────────────────────────── */
function buildMI(batch){
  return hd('제조지시서','Manufacturing Instruction · '+batch.제품명, batch.문서번호||'EF-MI-00X','Rev.00',batch.date) + `
  <div class="sign"><div class="sign-box"><div class="sign-lbl">총괄책임자(제조관리담당자)</div>${CO.owner} (인)</div></div>

  <div class="sec">▶ 가. 기본 정보</div>
  <table>
    <tr><td class="h">제 품 명</td><td><b>${batch.제품명}</b></td><td class="h">제조번호</td><td>${batch.제조번호||''}</td></tr>
    <tr><td class="h">바코드 번호</td><td>${batch.바코드||''}</td><td class="h">제조연월일</td><td>${batch.date||''}</td></tr>
    <tr><td class="h">제조단위</td><td>${batch.투입량||''}g (800g 오일 배치)</td><td class="h">사용기한</td><td>제조일로부터 2년</td></tr>
    <tr><td class="h">이론수량</td><td>1kg 몰드 기준 ${batch.이론수량||11}개 / 배치 약 ${batch.이론수량||''}ea</td><td class="h">제조지시자</td><td>${CO.owner} (인)</td></tr>
  </table>

  <div class="sec">▶ 나. 원료명·분량·시험번호·실사용량</div>
  <p class="note">※ 시험번호: 원자재 시험성적서 번호 기입. 실사용량은 제조 후 실측값.</p>
  <table>
    <thead><tr><th>No</th><th>원 료 명</th><th>INCI 명칭</th><th>이론량(g)</th><th>비율(%)</th><th>실사용량(g)</th><th>확인</th></tr></thead>
    <tbody>
      ${(batch.레시피||[]).map((r,i)=>`<tr>
        <td class="c">${i+1}</td><td>${r.원료명}</td><td style="font-size:8px">${r.INCI||''}</td>
        <td class="r">${r.이론량||''}</td><td class="r">${r.비율||''}</td>
        <td class="r">${r.실사용량||r.이론량||''}</td><td class="c">□</td>
      </tr>`).join('')}
      ${!(batch.레시피?.length)?`<tr><td class="c">—</td><td colspan="6" style="color:#999;text-align:center">배치 수정에서 레시피 상세 입력</td></tr>`:''}
      <tr><td colspan="3" class="h" style="text-align:center">합 계</td><td class="r h">${batch.투입량||''}g</td><td></td><td></td><td></td></tr>
    </tbody>
  </table>
  ${batch.알레르기?`<p class="note">※ 향료 유래 알레르기 유발성분: ${batch.알레르기}</p>`:''}

  <div class="sec">▶ 다. 제조설비명</div>
  <p style="padding:5px 8px;border:0.5px solid #ccc;font-size:9px;margin-bottom:12px">전자저울 | 스틱블렌더 | 실리콘몰드(1kg) | 스테인리스 용기 2개 | 온도계 | 내화학성 장갑·고글·마스크</p>

  <div class="sec">▶ 라. 공정별 작업내용</div>
  <table>
    <thead><tr><th>단계</th><th>공정명</th><th>작업 내용</th><th>관리기준</th><th>이론생산량</th><th>확인</th></tr></thead>
    <tbody>
      <tr><td class="c">1</td><td>칭량</td><td>원료를 기준량에 따라 전자저울로 계량 (±1% 이내)</td><td>±1% 이내</td><td class="r">${batch.투입량||''}g</td><td class="c">□</td></tr>
      <tr><td class="c">2</td><td>소다수</td><td>정제수에 소듐하이드록사이드 천천히 용해 → 실온 냉각 (내화학성 장갑·고글·마스크 필수)</td><td>25~35°C</td><td></td><td class="c">□</td></tr>
      <tr><td class="c">3</td><td>혼합</td><td>오일류 혼합 후 소다수와 혼합 / 스틱블렌더 1분씩 2~3회</td><td>27~30°C</td><td></td><td class="c">□</td></tr>
      <tr><td class="c">4</td><td>첨가물</td><td>트레이스 이후 첨가물 후첨 교반</td><td>트레이스 이후</td><td></td><td class="c">□</td></tr>
      <tr><td class="c">5</td><td>향료</td><td>향료 혼합 후 몰드 투입</td><td>—</td><td></td><td class="c">□</td></tr>
      <tr><td class="c">6</td><td>보온·탈형</td><td>24~48시간 보온 후 탈형</td><td>24~48시간</td><td></td><td class="c">□</td></tr>
      <tr><td class="c">7</td><td>숙성</td><td>통풍이 잘 되는 곳에서 숙성</td><td>최소 4주</td><td></td><td class="c">□</td></tr>
      <tr><td class="c">8</td><td>커팅·포장</td><td>1kg 몰드 기준 11개 커팅 → 외관검사(성상·색상·이물·중량) → 포장·출하</td><td>${batch.목표중량||'90g ±5g'}</td><td class="r">${batch.이론수량||''}ea</td><td class="c">□</td></tr>
    </tbody>
  </table>

  <div class="sec">▶ 마. 수율</div>
  <table>
    <thead><tr><th>공정명</th><th>투입량</th><th>이론 생산량</th><th>실제 생산량</th><th>수 율</th></tr></thead>
    <tbody>
      <tr><td>칭량 (제조)</td><td class="r">${batch.투입량||''}g</td><td class="c">${batch.이론수량||''}ea</td><td class="c">${batch.실제수량||''}ea</td><td></td></tr>
    </tbody>
  </table>
  <p class="note">※ 수율 = 실제 완성량 ÷ 투입량 × 100 / 1kg 몰드 기준 11개 커팅 기준</p>

  <div class="sec">▶ 바. 이상 발생 기록</div>
  <table>
    <tr><td class="h" style="width:20%">이상 여부</td><td>${batch.이상==='이상없음'?'■ 이상 없음 &nbsp;&nbsp;&nbsp; □ 이상 있음':'□ 이상 없음 &nbsp;&nbsp;&nbsp; ■ 이상 있음'}</td></tr>
    <tr><td class="h">이상 내용 및 조치</td><td style="min-height:22px">${batch.이상==='이상있음'?batch.비고||'':''}</td></tr>
  </table>
  ` + ft();
}

/* ─────────────────────────────────────
   제품표준서 (EF-PS)  ← 앱 내 신규 작성 가능
───────────────────────────────────── */
function buildPS(batch, allIng){
  const ing = allIng.filter(i=>i.stockType!=='포장재');
  const psNo = batch.문서번호 ? batch.문서번호.replace('EF-MI','EF-PS') : 'EF-PS-00X';

  return hd('제품표준서','Product Standard · '+batch.제품명, psNo,'Rev.00',batch.date) + `
  <div class="sign"><div class="sign-box"><div class="sign-lbl">총괄책임자(제조관리담당자)</div>${CO.owner} (인)</div></div>

  <div class="sec">▶ 1. 기본 정보</div>
  <table>
    <tr><td class="h">표준서 번호</td><td>${psNo}</td><td class="h">제정일자</td><td>${batch.date||''}</td></tr>
    <tr><td class="h">제 품 명</td><td><b>${batch.제품명}</b></td><td class="h">내 용 량</td><td>${batch.목표중량||'90g'} (건조 기준)</td></tr>
    <tr><td class="h">제품 코드</td><td>${batch.제조번호?.split('-')[0]||''}</td><td class="h">바코드 번호</td><td>${batch.바코드||''}</td></tr>
    <tr><td class="h">유형 및 성상</td><td>인체 세정용 제품류 / 화장비누(고형) / ${batch.색상기준||''}</td><td class="h">제조방법</td><td>${batch.제조방법||'CP법'} (Cold Process, Water:Lye = 1.7:1)</td></tr>
    <tr><td class="h">사용기한</td><td>제조일로부터 2년</td><td class="h">보관방법</td><td>직사광선 피해 서늘하고 건조한 곳. 물이 잘 빠지는 건조한 곳에 보관.</td></tr>
    <tr><td class="h">작성자</td><td>${CO.owner}</td><td class="h">확인 (인)</td><td>${CO.owner}</td></tr>
  </table>

  <div class="sec">▶ 2. 원료 배합표</div>
  <p class="note">※ 기준: 800g 오일 배치 / 비율은 전체 투입량 기준</p>
  <table>
    <thead><tr><th>No</th><th>원 료 명</th><th>INCI 명칭</th><th>이론량(g)</th><th>비율(%)</th><th>비 고</th></tr></thead>
    <tbody>
      ${ing.map((i,n)=>`<tr>
        <td class="c">${n+1}</td><td>${i.원료명}</td>
        <td style="font-size:8px">${i.INCI||''}</td>
        <td class="r"></td><td class="r"></td>
        <td style="font-size:8px">${i.비고||''}</td>
      </tr>`).join('')}
      <tr><td colspan="3" class="h" style="text-align:center">합 계</td><td class="r h">${batch.투입량||''}g</td><td></td><td></td></tr>
    </tbody>
  </table>
  ${batch.알레르기?`<p class="note">※ 향료 유래 알레르기 유발성분: ${batch.알레르기}</p>`:''}

  <div class="sec">▶ 3. 공정별 작업내용 및 이론 생산량</div>
  <table>
    <thead><tr><th>단계</th><th>공정명</th><th>상세 작업 내용</th><th>관리기준</th><th>이론 생산량</th></tr></thead>
    <tbody>
      <tr><td class="c">1</td><td>칭량</td><td>원료를 기준량에 따라 전자저울로 계량 (±1% 이내)</td><td>±1% 이내</td><td></td></tr>
      <tr><td class="c">2</td><td>소다수</td><td>정제수에 소듐하이드록사이드 천천히 용해 → 실온 냉각 (내화학성 장갑·고글·마스크 필수)</td><td>25~35°C</td><td></td></tr>
      <tr><td class="c">3</td><td>혼합</td><td>오일류 혼합 후 소다수와 혼합 / 스틱블렌더 1분씩 2~3회</td><td>27~30°C</td><td></td></tr>
      <tr><td class="c">4</td><td>첨가물</td><td>트레이스 이후 첨가물 후첨 교반</td><td>트레이스 이후</td><td></td></tr>
      <tr><td class="c">5</td><td>향료</td><td>향료 혼합 후 몰드 투입</td><td>—</td><td></td></tr>
      <tr><td class="c">6</td><td>보온·탈형</td><td>48시간 보온 후 탈형</td><td>48시간</td><td></td></tr>
      <tr><td class="c">7</td><td>숙성</td><td>통풍이 잘 되는 곳에서 숙성</td><td>최소 4주</td><td></td></tr>
      <tr><td class="c">8</td><td>커팅·포장</td><td>1kg 몰드 기준 11개 커팅 → 외관검사 → 포장·출하</td><td>${batch.목표중량||'90g ±5g'}</td><td class="c">${batch.이론수량||''}ea</td></tr>
    </tbody>
  </table>

  <div class="sec">▶ 4. 원자재·완제품 품질 기준 및 시험방법</div>
  <table>
    <thead><tr><th>검사 항목</th><th>기 준</th><th>시험방법</th><th>시험기관</th><th>비 고</th></tr></thead>
    <tbody>
      <tr><td>원자재 (전 원료)</td><td>고유 색택·성상, 이물 불검출</td><td>육안 관능검사</td><td>자사</td><td>입고 시마다. CoA 수취.</td></tr>
      <tr><td>내용량 (건조)</td><td>97% 이상</td><td>화장품 안전기준 등에 관한 규정</td><td>KCL (위탁)</td><td>${batch.KCL||''}</td></tr>
      <tr><td>유리알칼리</td><td>0.1% 이하</td><td>화장품 안전기준 등에 관한 규정</td><td>KCL (위탁)</td><td></td></tr>
      <tr><td>성상 / 색상</td><td>고형, 이물 없음, 표면 균일</td><td>육안 검사</td><td>자사</td><td>포장 전 전수 확인</td></tr>
      <tr><td>중량 (건조)</td><td>${batch.목표중량||'90g ±5g'}</td><td>저울 계량</td><td>자사</td><td>포장 전 전수 확인</td></tr>
    </tbody>
  </table>

  <div class="sec">▶ 5. 사용상 주의사항 및 표시기재사항</div>
  <table>
    <tr><td class="h" style="width:18%">제 품 명</td><td>${batch.제품명}</td></tr>
    <tr><td class="h">바코드 번호</td><td>${batch.바코드||''}</td></tr>
    <tr><td class="h">내 용 량</td><td>${batch.목표중량||'90g'} (건조 기준)</td></tr>
    <tr><td class="h">전 성 분</td><td style="font-size:8.5px">${batch.전성분||''}</td></tr>
    <tr><td class="h">사용기한</td><td>제조일로부터 2년</td></tr>
    <tr><td class="h">사용방법</td><td>미온수에 충분히 거품을 낸 뒤 부드럽게 마사지 후 깨끗이 씻어냅니다.</td></tr>
    <tr><td class="h">주의사항</td><td style="font-size:8.5px">1. 화장품 사용 후 이상 증상 시 전문의 상담 &nbsp; 2. 상처 부위 사용 자제 &nbsp; 3. 어린이 손 닿지 않는 곳 보관 &nbsp; 4. 직사광선 피해 보관 &nbsp; 5. 눈에 들어갔을 경우 즉시 씻어낼 것 &nbsp; 6. 물이 잘 빠지는 건조한 곳에 보관</td></tr>
    <tr><td class="h">제조업자(책임판매업자)</td><td>${CO.name} / ${CO.addr} / ${CO.tel}</td></tr>
  </table>
  ` + ft();
}

/* ─────────────────────────────────────
   정기감시 제출용 표지
───────────────────────────────────── */
function buildCover(sy, sm, ey, em){
  const now = new Date().toLocaleDateString('ko-KR');
  return `<div class="doc" style="display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:297mm;text-align:center;">
    <div style="font-size:13px;color:#666;margin-bottom:24px">화장품 정기감시 제출 서류</div>
    <div style="font-size:26px;font-weight:700;margin-bottom:8px">${CO.name}</div>
    <div style="font-size:14px;color:#444;margin-bottom:32px">${CO.addr}</div>
    <div style="border:1px solid #ccc;border-radius:8px;padding:24px 40px;margin-bottom:32px;min-width:280px">
      <div style="font-size:12px;color:#888;margin-bottom:6px">제 출 기 간</div>
      <div style="font-size:20px;font-weight:700">${sy}년 ${sm}월 ~ ${ey}년 ${em}월</div>
    </div>
    <table style="width:320px;font-size:10px">
      <tr><td class="h" style="width:40%">화장품제조업 등록번호</td><td>${CO.mfg}</td></tr>
      <tr><td class="h">책임판매업 등록번호</td><td>${CO.sale}</td></tr>
      <tr><td class="h">대표자</td><td>${CO.owner}</td></tr>
      <tr><td class="h">연락처</td><td>${CO.tel}</td></tr>
      <tr><td class="h">출력일</td><td>${now}</td></tr>
    </table>
    <div style="margin-top:32px;font-size:11px;color:#888">
      포함 문서: 위생점검기록서(R-MH) · 원료입고기록서(R-MMS-01) · 완제품출하검사기록서(R-QCM)
    </div>
  </div>`;
}

/* ─────────────────────────────────────
   월간/범위 PDF 묶음 생성
───────────────────────────────────── */
async function generatePDF(){
  const sy = +document.getElementById('s-year').value;
  const sm = +document.getElementById('s-month').value;
  const ey = +document.getElementById('e-year').value;
  const em = +document.getElementById('e-month').value;

  const checked = key => {
    const el = document.getElementById('chk-' + key);
    return el ? el.checked : false;
  };

  const [hyg, ing, batches] = await Promise.all([
    DB.getAll('hygiene'), DB.getAll('ingredients'), DB.getAll('batches')
  ]);

  const startYM = `${sy}-${String(sm).padStart(2,'0')}`;
  const endYM   = `${ey}-${String(em).padStart(2,'0')}`;
  const filteredHyg = hyg.filter(h => {
    const ym = h.date && h.date.slice(0,7);
    return ym >= startYM && ym <= endYM;
  });

  const months = [];
  let cy = sy, cm = sm;
  while(`${cy}-${String(cm).padStart(2,'0')}` <= endYM){
    months.push({y:cy, m:cm});
    cm++; if(cm>12){cm=1;cy++;}
  }

  const sep = '<div class="page-break"></div>';
  const pages = [];

  if(checked('cover')) pages.push(buildCover(sy,sm,ey,em));
  if(checked('mh'))    pages.push(...months.map(({y,m}) => buildMH(filteredHyg, y, m)));
  if(checked('mms'))   pages.push(buildMMS(ing));
  if(checked('qcm'))   pages.push(buildQCM(batches));
  if(checked('mi') && batches.length) pages.push(...batches.map(b => buildMI(b)));
  if(checked('tr') && batches.length) pages.push(...batches.map(b => buildTR(b, ing)));
  if(checked('ps') && batches.length) pages.push(...batches.map(b => buildPS(b, ing)));

  if(!pages.length){ alert('출력할 문서를 하나 이상 선택하세요.'); return; }
  openPrint(pages.join(sep));
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

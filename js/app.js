let currentTab='hygiene';
const today=new Date();
let calYear=today.getFullYear(),calMonth=today.getMonth();

async function init(){
  await DB.seedIfEmpty();
  setupTabs();
  renderTab(currentTab);
  checkNotifications();
}

function setupTabs(){
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      currentTab=btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderTab(currentTab);
    });
  });
}

async function renderTab(tab){
  const el=document.getElementById('page-content');
  el.innerHTML='';
  if(tab==='stock') await renderStock(el);
  else if(tab==='manufacture') await renderManufacture(el);
  else if(tab==='mfcheck') await renderMfCheck(el);
  else if(tab==='hygiene') await renderHygiene(el);
  else if(tab==='output') await renderOutput(el);
  else if(tab==='notify') renderNotifySettings(el);
  await updateBadges();
}

async function updateBadges(){
  const hyg=await DB.getAll('hygiene');
  const ym=`${calYear}-${String(calMonth+1).padStart(2,'0')}`;
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
  // count missing days (rough: days with no record this month)
  const datesWithRecord=new Set(hyg.filter(h=>h.date&&h.date.startsWith(ym)).map(h=>h.date));
  // just show pending count from ingredients
  const ing=await DB.getAll('ingredients');
  const pending=ing.filter(i=>i.판정==='미기입').length;
  const hb=document.getElementById('badge-hygiene');
  if(hb){hb.textContent=pending>0?pending:'';hb.style.display=pending>0?'inline':'none';}
}

/* ───── 재료·포장재 재고 ───── */
let stockSubTab='원료';
async function renderStock(el){
  const all=await DB.getAll('ingredients');
  const ingList=all.filter(i=>i.stockType!=='포장재');
  const pkgList=all.filter(i=>i.stockType==='포장재');
  const list=stockSubTab==='원료'?ingList:pkgList;
  const cats=[...new Set(list.map(i=>i.category))];
  const ok=list.filter(i=>i.판정==='적합').length;
  const pending=list.filter(i=>i.판정==='미기입').length;

  el.innerHTML=`
    <div class="page-header">
      <h2 class="page-title">재료·포장재 재고</h2>
    </div>
    <div class="subtab-row">
      <button class="subtab ${stockSubTab==='원료'?'on':''}" onclick="switchStockTab('원료')">원료 <span class="subtab-cnt">${ingList.length}</span></button>
      <button class="subtab ${stockSubTab==='포장재'?'on':''}" onclick="switchStockTab('포장재')">포장재 <span class="subtab-cnt">${pkgList.length}</span></button>
    </div>
    <div class="summary-row">
      <div class="sum-chip sum-blue">등록 ${list.length}종</div>
      <div class="sum-chip sum-green">적합 ${ok}종</div>
      ${pending>0?`<div class="sum-chip sum-orange">미기입 ${pending}종`:''}
    </div>
    ${list.length===0?`
      <div class="empty-hint">등록된 ${stockSubTab}이 없습니다</div>
    `:cats.map(cat=>`
      <div class="group-header">${cat}</div>
      ${list.filter(i=>i.category===cat).map(i=>`
        <div class="list-item" onclick="openIngForm(${i.id})">
          <div class="item-left">
            <div class="item-title">${i.원료명}</div>
            <div class="item-sub">${i.제조처}${i.수량?' · '+i.수량:''}${i.입고일?' · '+i.입고일:''}</div>
          </div>
          <div class="item-right">
            <span class="badge ${badgeClass(i.판정)}">${i.판정}</span>
            <span class="badge ${i.CoA==='수취'?'badge-green':'badge-orange'} ml4">CoA ${i.CoA}</span>
          </div>
        </div>`).join('')}
    `).join('')}
    <button class="fab" onclick="openIngForm(null,'${stockSubTab}')"><i class="ti ti-plus"></i></button>
  `;
}

function switchStockTab(tab){
  stockSubTab=tab;
  renderTab('stock');
}

/* ───── 제조 점검 ───── */
async function renderMfCheck(el){
  const list=await DB.getAll('batches');
  el.innerHTML=`
    <div class="page-header">
      <h2 class="page-title">제조 점검</h2>
    </div>
    <div class="info-banner">
      <i class="ti ti-info-circle"></i>
      <span>제조 전 체크리스트 · EF-MMS-001 §3 기준</span>
    </div>
    <div class="group-header">CP법 작업 전 필수</div>
    ${['내화학성 장갑 착용','고글 착용','마스크 착용','작업대 에탄올 소독','전자저울 영점 확인','소다수 온도 25~35°C 확인'].map(item=>`
      <div class="check-item" onclick="toggleCheck(this)">
        <div class="check-circle"><i class="ti ti-check"></i></div>
        <span class="check-label">${item}</span>
      </div>`).join('')}
    <div class="group-header mt16">온도·습도 관리</div>
    ${['오전 온도·습도 기록','혼합 온도 27~30°C 확인','오후 온도·습도 기록'].map(item=>`
      <div class="check-item" onclick="toggleCheck(this)">
        <div class="check-circle"><i class="ti ti-check"></i></div>
        <span class="check-label">${item}</span>
      </div>`).join('')}
    <div class="group-header mt16">완제품 출하 전</div>
    ${['외관·성상 육안검사','중량 90g ±5g 확인','표시사항(전성분·사용기한) 확인','KCL 성적서 확인'].map(item=>`
      <div class="check-item" onclick="toggleCheck(this)">
        <div class="check-circle"><i class="ti ti-check"></i></div>
        <span class="check-label">${item}</span>
      </div>`).join('')}
    <button class="save-btn mt20" onclick="saveChecklist()">점검 완료 저장</button>
  `;
}

/* ───── 위생 점검 (캘린더) ───── */
async function renderHygiene(el){
  const hyg=await DB.getAll('hygiene');
  const ym=`${calYear}-${String(calMonth+1).padStart(2,'0')}`;
  const monthRecords=hyg.filter(h=>h.date&&h.date.startsWith(ym));
  const datesWithIssue=new Set(hyg.filter(h=>h.status==='문제임박'&&h.date?.startsWith(ym)).map(h=>h.date));
  const datesWithRecord=new Set(monthRecords.map(h=>h.date));

  // 밀린 점검 계산
  const todayStr=today.toISOString().split('T')[0];
  const allHyg=await DB.getAll('hygiene');
  const totalMissing=14; // placeholder from screenshot

  el.innerHTML=`
    <div class="page-header">
      <h2 class="page-title">위생 점검 작성한 기록</h2>
    </div>
    ${totalMissing>0?`
    <div class="warn-banner" onclick="openHygieneForm()">
      <i class="ti ti-alert-triangle"></i>
      <div>
        <div class="warn-title">밀린 점검 빠른 입력</div>
        <div class="warn-sub">누락된 점검 ${totalMissing}건을 빠르게 입력</div>
      </div>
      <i class="ti ti-chevron-right ml-auto"></i>
    </div>`:''}
    <div class="cal-nav">
      <button class="cal-arrow" onclick="changeMonth(-1)"><i class="ti ti-chevron-left"></i></button>
      <span class="cal-title">${calYear}년 ${calMonth+1}월</span>
      <button class="cal-arrow" onclick="changeMonth(1)"><i class="ti ti-chevron-right"></i></button>
    </div>
    <div class="calendar">${buildCalendar(calYear,calMonth,datesWithRecord,datesWithIssue)}</div>
    <div class="cal-footer">
      <button class="cal-foot-btn active" onclick="filterRecords('all')">전체 ↑</button>
      <button class="cal-foot-btn" onclick="filterRecords('type')">전체 ↓</button>
    </div>
    <div class="records-section">
      <div class="records-month">${calYear}년 ${calMonth+1}월</div>
      ${monthRecords.length>0?`
        <div class="records-date">${calYear}.${String(calMonth+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}</div>
        ${monthRecords.map(r=>recordItem(r)).join('')}
      `:`<div class="empty-hint">이번 달 기록이 없습니다</div>`}
    </div>
    <button class="fab" onclick="openHygieneForm()"><i class="ti ti-plus"></i></button>
  `;
}

function buildCalendar(year,month,hasRecord,hasIssue){
  const firstDay=new Date(year,month,1).getDay();
  const days=new Date(year,month+1,0).getDate();
  const weeks=['월','화','수','목','금','토','일'];
  let html=`<div class="cal-grid">`;
  weeks.forEach(d=>html+=`<div class="cal-dow">${d}</div>`);
  // offset (Monday=0)
  const offset=(firstDay+6)%7;
  for(let i=0;i<offset;i++)html+=`<div class="cal-day empty"></div>`;
  for(let d=1;d<=days;d++){
    const ds=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday=ds===today.toISOString().split('T')[0];
    const hasRec=hasRecord.has(ds);
    const hasIss=hasIssue.has(ds);
    html+=`<div class="cal-day ${isToday?'today':''}" onclick="selectDate('${ds}')">
      <span class="cal-num">${d}</span>
      ${hasIss?'<span class="cal-dot dot-red"></span>':hasRec?'<span class="cal-dot dot-green"></span>':''}
    </div>`;
  }
  html+=`</div>`;
  return html;
}

function recordItem(r){
  const typeLabel={'청소점검':'청소 점검','온도·습도':'온도·습도','제조위생':'제조 위생','방충방서':'방충·방서'}[r.type]||r.type;
  const sub=r.type==='온도·습도'?`${r.온도}°C / 습도 ${r.습도}%`:`${r.date}`;
  return `<div class="record-row">
    <div class="record-left">
      <div class="record-title">${r.type==='온도·습도'?(r.온도>30?'오전':'오후')+' 온도 '+r.온도+'°C / 습도 '+r.습도+'%':typeLabel}</div>
      <div class="record-sub">${r.date}</div>
    </div>
    <div class="record-right">
      <div class="record-type-label">${typeLabel}</div>
      <span class="badge ${r.status==='완료'?'badge-green':'badge-orange'}">${r.status}</span>
    </div>
  </div>`;
}

/* ───── 문서 출력 ───── */
async function renderOutput(el){
  const now=new Date();
  const y=now.getFullYear(), m=now.getMonth()+1;

  // 기록된 가장 오래된 연월 계산
  const hyg=await DB.getAll('hygiene');
  const batches=await DB.getAll('batches');
  const allDates=[...hyg.map(h=>h.date),...batches.map(b=>b.date)].filter(Boolean).sort();
  const earliest=allDates[0]||`${y}-01`;
  const ey=+earliest.slice(0,4), em=+earliest.slice(5,7);

  el.innerHTML=`
    <div class="page-header"><h2 class="page-title">출력</h2></div>

    <div class="section-label">정기감시 제출용 — 기간 설정</div>
    <div class="output-range-card">
      <div class="range-row">
        <span class="range-label">시작</span>
        <div class="range-inputs">
          <input type="number" id="s-year" value="${ey}" min="2024" max="${y+1}" style="width:68px">년
          <input type="number" id="s-month" value="${em}" min="1" max="12" style="width:46px">월
        </div>
      </div>
      <div class="range-divider">~</div>
      <div class="range-row">
        <span class="range-label">종료</span>
        <div class="range-inputs">
          <input type="number" id="e-year" value="${y}" min="2024" max="${y+1}" style="width:68px">년
          <input type="number" id="e-month" value="${m}" min="1" max="12" style="width:46px">월
        </div>
      </div>
    </div>
    <div class="output-desc">
      <p>선택한 기간의 모든 기록을 묶어 PDF로 생성합니다.</p>
      <p>화장품 정기감시 제출용 표지가 자동으로 추가됩니다.</p>
      <p>위생점검 + 원료입고 + 완제품출하 검사 전 기간 포함.</p>
    </div>
    <button class="output-btn" onclick="generatePDF()">
      <i class="ti ti-files"></i>
      정기감시 제출용 PDF 묶음 생성
    </button>

    <div class="section-label mt20">개별 문서 — 기간 지정 출력</div>
    <div class="output-range-card" style="margin-bottom:10px">
      <div class="range-row">
        <span class="range-label">출력 기준 월</span>
        <div class="range-inputs">
          <input type="number" id="out-year" value="${y}" min="2024" max="${y+1}" style="width:68px">년
          <input type="number" id="out-month" value="${m}" min="1" max="12" style="width:46px">월
        </div>
      </div>
    </div>
    ${[
      {icon:'ti-file-description',name:'제조지시서',sub:'EF-MI · 제품별 전체',key:'mi'},
      {icon:'ti-microscope',name:'시험성적서',sub:'EF-TR · KCL + 자사 육안검사',key:'tr'},
      {icon:'ti-book',name:'제품표준서',sub:'EF-PS · 전성분 포함',key:'ps'},
      {icon:'ti-clipboard-check',name:'위생점검기록서',sub:'R-MH-01 청소 · R-MH-02 방충방서',key:'mh'},
      {icon:'ti-package',name:'원료입고기록서',sub:'R-MMS-01 · 전체 원료',key:'mms'},
      {icon:'ti-check',name:'완제품출하검사기록서',sub:'R-QCM-01/02 · 보관검체 포함',key:'qcm'}
    ].map(d=>`
      <div class="doc-row" onclick="printDoc('${d.key}')">
        <div class="doc-icon"><i class="ti ${d.icon}"></i></div>
        <div class="doc-info"><div class="doc-name">${d.name}</div><div class="doc-sub">${d.sub}</div></div>
        <i class="ti ti-chevron-right doc-arrow"></i>
      </div>`).join('')}

    <div class="section-label mt20">과거 이력 조회</div>
    <div id="history-section"></div>
  `;

  renderHistory(document.getElementById('history-section'), hyg, batches);
}

async function renderHistory(el, hyg, batches){
  // 월별로 그룹핑
  const months={};
  [...hyg,...batches].forEach(r=>{
    const d=r.date||r.createdAt?.slice(0,10);
    if(!d)return;
    const ym=d.slice(0,7);
    if(!months[ym])months[ym]={hyg:[],batch:[]};
    if(r.type)months[ym].hyg.push(r);
    else months[ym].batch.push(r);
  });
  const sorted=Object.keys(months).sort().reverse();
  if(!sorted.length){el.innerHTML='<div class="empty-hint">기록된 이력이 없습니다</div>';return;}
  el.innerHTML=sorted.map(ym=>`
    <div class="history-month-row" onclick="toggleHistory(this)">
      <div class="history-month-title">${ym.replace('-','년 ')}월</div>
      <div class="history-month-cnt">
        <span class="badge badge-green">위생 ${months[ym].hyg.length}건</span>
        ${months[ym].batch.length?`<span class="badge badge-blue ml4">배치 ${months[ym].batch.length}건</span>`:''}
      </div>
      <i class="ti ti-chevron-down" style="color:var(--text3);font-size:14px;margin-left:auto"></i>
    </div>
    <div class="history-detail hide">
      ${months[ym].hyg.map(r=>`<div class="history-item">
        <span class="history-date">${r.date}</span>
        <span class="history-type">${r.type}</span>
        <span class="badge ${r.status==='완료'?'badge-green':'badge-orange'}">${r.status}</span>
      </div>`).join('')}
      ${months[ym].batch.map(b=>`<div class="history-item">
        <span class="history-date">${b.date||''}</span>
        <span class="history-type">${b.제품명}</span>
        <span class="badge ${badgeClass(b.상태)}">${b.상태}</span>
      </div>`).join('')}
      <button class="btn-sm" style="margin:8px 14px" onclick="printRangeMonth('${ym}')">이 달 PDF 출력</button>
    </div>
  `).join('');
}

function toggleHistory(row){
  row.nextElementSibling.classList.toggle('hide');
  row.querySelector('.ti-chevron-down').style.transform=
    row.nextElementSibling.classList.contains('hide')?'':'rotate(180deg)';
}

async function printRangeMonth(ym){
  const [y,m]=ym.split('-').map(Number);
  const [hyg,ing,batches]=await Promise.all([DB.getAll('hygiene'),DB.getAll('ingredients'),DB.getAll('batches')]);
  const sep='<div class="page-break"></div>';
  open$(buildCover(y,m,y,m) + sep + buildMH(hyg,y,m) + sep + buildMMS(ing) + sep + buildQCM(batches));
}

/* PDF 함수는 js/pdf.js에서 처리 */

/* ───── 폼들 ───── */
function openIngForm(id, defaultType){
  DB.getAll('ingredients').then(list=>{
    const item=id?list.find(i=>i.id===id):{};
    const type=item.stockType||defaultType||stockSubTab||'원료';
    const ingCats=['베이스오일','버터·왁스','가성소다','정제수','첨가물·기능성','향료·색소','기타'];
    const pkgCats=['단상자','선물박스','크라프트박스','라벨·스티커','수축필름','포장지','리본·끈','완충재','기타포장'];
    const cats=type==='포장재'?pkgCats:ingCats;
    const isNew=!id;
    showSheet(`
      <div class="sheet-title">${isNew?(type==='포장재'?'포장재 추가':'원료 추가'):(type==='포장재'?'포장재 수정':'원료 수정')}</div>
      <label>구분
        <select id="f0" onchange="updateIngCats(this.value)">
          <option ${type==='원료'?'selected':''}>원료</option>
          <option ${type==='포장재'?'selected':''}>포장재</option>
        </select>
      </label>
      <label>${type==='포장재'?'포장재명':'원료명'}<input id="f1" value="${item.원료명||''}"></label>
      <label>제조처/공급처<input id="f2" value="${item.제조처||''}"></label>
      <label>수량/재고<input id="f3" value="${item.수량||''}" placeholder="예: 500g, 100개"></label>
      <label>입고일<input type="date" id="f8" value="${item.입고일||''}"></label>
      <label>카테고리<select id="f4">${cats.map(c=>`<option ${item.category===c?'selected':''}>${c}</option>`).join('')}</select></label>
      <label>CoA 수취<select id="f5">${['수취','미수취','미기입','해당없음'].map(c=>`<option ${item.CoA===c?'selected':''}>${c}</option>`).join('')}</select></label>
      <label>판정<select id="f6">${['적합','부적합','미기입'].map(c=>`<option ${item.판정===c?'selected':''}>${c}</option>`).join('')}</select></label>
      <label>비고<input id="f7" value="${item.비고||''}"></label>
      <div class="sheet-btns">
        ${id?`<button class="btn-del" onclick="delItem('ingredients',${id})">삭제</button>`:''}
        <button onclick="closeSheet()">취소</button>
        <button class="btn-save" onclick="saveIng(${id||'null'})">저장</button>
      </div>`);
  });
}

function updateIngCats(type){
  const ingCats=['베이스오일','버터·왁스','가성소다','정제수','첨가물·기능성','향료·색소','기타'];
  const pkgCats=['단상자','선물박스','크라프트박스','라벨·스티커','수축필름','포장지','리본·끈','완충재','기타포장'];
  const cats=type==='포장재'?pkgCats:ingCats;
  const sel=document.getElementById('f4');
  if(sel)sel.innerHTML=cats.map(c=>`<option>${c}</option>`).join('');
}

async function saveIng(id){
  const type=v('f0');
  const data={원료명:v('f1'),제조처:v('f2'),수량:v('f3'),입고일:v('f8'),category:v('f4'),CoA:v('f5'),판정:v('f6'),비고:v('f7'),stockType:type};
  id?await DB.put('ingredients',{...data,id}):await DB.add('ingredients',data);
  stockSubTab=type;
  closeSheet();renderTab('stock');
}

async function openBatchForm(id){
  const list=await DB.getAll('batches');
  const item=id?list.find(b=>b.id===id):{};

  // 자동 채번: 기존 최대 번호 + 1
  let nextMI='';
  if(!id){
    const nums=list.map(b=>b.문서번호).filter(Boolean)
      .map(n=>parseInt(n.replace(/[^0-9]/g,'')||'0')).filter(n=>!isNaN(n));
    const nextNum=(nums.length?Math.max(...nums):5)+1;
    nextMI=`EF-MI-${String(nextNum).padStart(3,'0')}`;
  }
  showSheet(`
      <div class="sheet-title">${id?'배치 수정':'새 배치 추가'}</div>
      <label>제품명<input id="b1" value="${item.제품명||''}"></label>
      <label>문서번호(EF-MI)<input id="b2" value="${item.문서번호||nextMI}" placeholder="${nextMI}"></label>
      <label>제조번호<input id="b3" value="${item.제조번호||''}"></label>
      <label>제조일<input type="date" id="b4" value="${item.date||''}"></label>
      <label>제조방법<select id="b5"><option ${item.제조방법==='CP법'?'selected':''}>CP법</option><option ${item.제조방법==='MP법'?'selected':''}>MP법</option></select></label>
      <label>투입량(g)<input type="number" id="b6" value="${item.투입량||''}"></label>
      <label>이론수량<input type="number" id="b7" value="${item.이론수량||''}"></label>
      <label>실제수량<input type="number" id="b8" value="${item.실제수량||''}"></label>
      <label>상태<select id="b9">${['제조중','숙성중','판매중','완료','부적합'].map(s=>`<option ${item.상태===s?'selected':''}>${s}</option>`).join('')}</select></label>
      <label>바코드 번호<input id="b15" placeholder="예: 8739101009095" value="${item.바코드||''}"></label>
      <label>목표 중량<input id="b16" placeholder="예: 90g ±5g" value="${item.목표중량||'90g ±5g'}"></label>
      <label>실측 중량 (g) — 출하검사 시 직접 기입<input id="b17" type="number" placeholder="예: 100" value="${item.실측중량||''}"></label>
      <label>색상 기준<input id="b18" placeholder="예: 오렌지·아나토 계열" value="${item.색상기준||''}"></label>
      <label>색상 검사 결과<input id="b19" placeholder="예: 이상없음" value="${item.색상결과||'이상없음'}"></label>
      <label>KCL 성적서 접수번호<input id="b10" value="${item.KCL||''}"></label>
      <label>KCL 접수일<input type="date" id="b20" value="${item.KCL접수일||''}"></label>
      <label>KCL 발행번호<input id="b21" value="${item.KCL발행번호||''}"></label>
      <label>KCL 발행일<input type="date" id="b22" value="${item.KCL발행일||''}"></label>
      <label>CT 성적서번호 (참고용, 있을 경우)<input id="b23" placeholder="예: CT24-090322K" value="${item.CT||''}"></label>
      <label>CT 내용량 결과 (g)<input id="b24" placeholder="예: 93g" value="${item.CT내용량||''}"></label>
      <label>CT 발행일<input type="date" id="b25" value="${item.CT발행일||''}"></label>
      <label>내용량 결과 (%)<input id="b11" placeholder="예: 103" value="${item.내용량||''}"></label>
      <label>유리알칼리 결과<input id="b12" placeholder="예: 검출 안 됨" value="${item.유리알칼리||''}"></label>
      <label>전성분 (표시기재용)<textarea id="b26" rows="3" style="width:100%;margin-top:4px;padding:8px;border:0.5px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);font-size:13px">${item.전성분||''}</textarea></label>
      <label>이상여부<select id="b13"><option ${item.이상==='이상없음'?'selected':''}>이상없음</option><option ${item.이상==='이상있음'?'selected':''}>이상있음</option></select></label>
      <label>비고<input id="b14" value="${item.비고||''}"></label>
      <div class="sheet-btns">
        ${id?`<button class="btn-del" onclick="delItem('batches',${id})">삭제</button>`:''}
        <button onclick="closeSheet()">취소</button>
        <button class="btn-save" onclick="saveBatch(${id||'null'})">저장</button>
      </div>`);
  });
}
async function saveBatch(id){
  const data={
    제품명:v('b1'),문서번호:v('b2'),제조번호:v('b3'),date:v('b4'),
    제조방법:v('b5'),투입량:+v('b6'),이론수량:+v('b7'),실제수량:+v('b8'),
    상태:v('b9'),
    바코드:v('b15'),목표중량:v('b16'),실측중량:v('b17')?+v('b17'):null,
    색상기준:v('b18'),색상결과:v('b19'),
    KCL:v('b10'),KCL접수일:v('b20'),KCL발행번호:v('b21'),KCL발행일:v('b22'),
    CT:v('b23'),CT내용량:v('b24'),CT발행일:v('b25'),
    내용량:v('b11'),유리알칼리:v('b12'),
    전성분:v('b26'),
    이상:v('b13'),비고:v('b14')
  };
  id?await DB.put('batches',{...data,id}):await DB.add('batches',data);
  closeSheet();renderTab('manufacture');
}

/* ───── 제조 탭 FAB ───── */
async function renderManufacture(el){
  const list=await DB.getAll('batches');
  el.innerHTML=`
    <div class="page-header">
      <h2 class="page-title">제품 제조</h2>
    </div>
    <div class="summary-row">
      <div class="sum-chip sum-blue">배치 ${list.length}건</div>
      <div class="sum-chip sum-green">KCL완료 ${list.filter(b=>b.KCL).length}건</div>
    </div>
    ${list.length===0?`<div class="empty-hint">등록된 배치가 없습니다<br><small>아래 + 버튼으로 추가하세요</small></div>`:''}
    ${list.map(b=>`
      <div class="card-block" onclick="toggleCard(this)">
        <div class="card-top">
          <div class="card-left">
            <div class="card-title">${b.제품명}</div>
            <div class="card-sub">${b.문서번호} · ${b.제조번호}</div>
            <div class="card-sub">${b.date} · ${b.제조방법}</div>
          </div>
          <div class="card-right">
            <span class="badge ${badgeClass(b.상태)}">${b.상태}</span>
            <button class="icon-btn mt8" onclick="event.stopPropagation();openBatchForm(${b.id})"><i class="ti ti-edit"></i></button>
          </div>
        </div>
        <div class="card-detail hide">
          ${drow('투입량',b.투입량+'g')}
          ${drow('이론/실제',b.이론수량+'ea / '+b.실제수량+'ea')}
          ${drow('목표 중량',b.목표중량)}
          ${drow('실측 중량',b.실측중량?b.실측중량+'g':'-')}
          ${drow('KCL 성적서',b.KCL||'미등록')}
          ${drow('내용량',b.내용량?b.내용량+'% (기준 97% 이상)':'-')}
          ${drow('유리알칼리',b.유리알칼리?b.유리알칼리+' (기준 0.1% 이하)':'-')}
          ${drow('알레르기 유발성분',b.알레르기)}
          ${drow('이상 여부',b.이상)}
          ${b.비고?drow('비고',b.비고):''}
        </div>
      </div>`).join('')}
    <button class="fab" onclick="openBatchForm()"><i class="ti ti-plus"></i></button>
  `;
}

function openHygieneForm(){
  const todayStr=today.toISOString().split('T')[0];
  showSheet(`
    <div class="sheet-title">위생 점검 기록</div>
    <label>점검일<input type="date" id="h1" value="${todayStr}"></label>
    <label>점검 유형<select id="h2">
      <option>청소점검</option><option>온도·습도</option><option>제조위생</option><option>방충방서</option>
    </select></label>
    <div id="h-extra"></div>
    <label>이슈 내용<input id="h5" placeholder="이상 없으면 비워두세요"></label>
    <label>확인자<input id="h6" value="변민정"></label>
    <div class="sheet-btns">
      <button onclick="closeSheet()">취소</button>
      <button class="btn-save" onclick="saveHyg()">저장</button>
    </div>`);
  document.getElementById('h2').addEventListener('change',updateHygExtra);
  updateHygExtra();
}
function updateHygExtra(){
  const type=document.getElementById('h2').value;
  const el=document.getElementById('h-extra');
  if(type==='온도·습도'){
    el.innerHTML=`<label>온도(°C)<input type="number" id="h3" placeholder="예: 23"></label><label>습도(%)<input type="number" id="h4" placeholder="예: 58"></label>`;
  } else { el.innerHTML=''; }
}
async function saveHyg(){
  const type=v('h2');
  const data={date:v('h1'),type,확인자:v('h6'),이슈:v('h5'),status:'완료'};
  if(type==='온도·습도'){data.온도=+v('h3');data.습도=+v('h4');if(data.온도>35)data.status='문제임박';}
  await DB.add('hygiene',data);
  closeSheet();renderTab('hygiene');
}

/* ───── 공통 유틸 ───── */
function v(id){const el=document.getElementById(id);return el?el.value:'';}
function drow(l,val){return `<div class="drow"><span class="drow-l">${l}</span><span class="drow-r">${val||'-'}</span></div>`;}
function badgeClass(val){
  const g=['적합','판매중','완료','완료','이상없음'];
  const a=['미기입','미수취','숙성중','제조중'];
  const r=['부적합','이상있음','문제임박'];
  if(g.includes(val))return 'badge-green';
  if(a.includes(val))return 'badge-orange';
  if(r.includes(val))return 'badge-red';
  return 'badge-gray';
}
function toggleCard(card){card.querySelector('.card-detail').classList.toggle('hide');}
function toggleCheck(item){
  const done=item.classList.toggle('checked');
  item.querySelector('.check-circle').innerHTML=done?'<i class="ti ti-check"></i>':'';
}
async function saveChecklist(){
  const date=today.toISOString().split('T')[0];
  await DB.add('hygiene',{date,type:'제조위생',확인자:'변민정',status:'완료'});
  alert('점검 완료 저장되었습니다.');
  renderTab('mfcheck');
}
function changeMonth(d){calMonth+=d;if(calMonth<0){calMonth=11;calYear--;}if(calMonth>11){calMonth=0;calYear++;}renderTab('hygiene');}
function selectDate(ds){/* 날짜 선택 시 해당일 기록 필터 - 추후 구현 */}
function filterRecords(t){}
function openDocSettings(){alert('문서 설정\nPrefix: HYG-SIS\n개정번호: 1\n\n추후 수정 기능 추가 예정');}

function showSheet(html){
  document.getElementById('sheet-body').innerHTML=html;
  document.getElementById('sheet').classList.remove('hide');
  document.getElementById('sheet-overlay').classList.remove('hide');
}
function closeSheet(){
  document.getElementById('sheet').classList.add('hide');
  document.getElementById('sheet-overlay').classList.add('hide');
}
async function delItem(store,id){
  if(!confirm('삭제할까요?'))return;
  await DB.remove(store,id);closeSheet();renderTab(currentTab);
}

window.go=renderTab;
window.switchStockTab=switchStockTab;
window.openIngForm=openIngForm;window.saveIng=saveIng;window.updateIngCats=updateIngCats;
window.openBatchForm=openBatchForm;window.saveBatch=saveBatch;
window.openHygieneForm=openHygieneForm;window.saveHyg=saveHyg;
window.updateHygExtra=updateHygExtra;
window.closeSheet=closeSheet;window.delItem=delItem;
window.toggleCard=toggleCard;window.toggleCheck=toggleCheck;
window.saveChecklist=saveChecklist;
window.changeMonth=changeMonth;window.selectDate=selectDate;
window.filterRecords=filterRecords;window.openDocSettings=openDocSettings;
window.generatePDF=generatePDF;window.printDoc=printDoc;
window.toggleHistory=toggleHistory;window.printRangeMonth=printRangeMonth;

document.addEventListener('DOMContentLoaded',init);

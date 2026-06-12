'use strict';
const DB_NAME = 'AvrilFarmDB', DB_VER = 7;
let _db;

function openDB() {
  return new Promise((res, rej) => {
    if (_db) return res(_db);
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = e => {
      const d = e.target.result;
      Array.from(d.objectStoreNames).forEach(s => d.deleteObjectStore(s));
      const schema = {
        ingredients: [],
        batches:     [{n:'status',k:'status'}],
        hygiene:     [{n:'date',k:'date'},{n:'type',k:'type'}],
        equipment:   [{n:'year',k:'year'}],
        production:  [{n:'date',k:'date'},{n:'productId',k:'productId'}],
        standards:   [{n:'code',k:'code'}],
        barcodes:    [{n:'번호',k:'번호'},{n:'제품명',k:'제품명'}]
      };
      Object.entries(schema).forEach(([name, idxs]) => {
        const st = d.createObjectStore(name, {keyPath:'id', autoIncrement:true});
        idxs.forEach(({n,k}) => st.createIndex(n, k));
      });
    };
    r.onsuccess = e => { _db = e.target.result; res(_db); };
    r.onerror = () => rej(r.error);
  });
}

function tx(name, mode='readonly') { return _db.transaction(name, mode).objectStore(name); }

async function getAll(s) {
  await openDB();
  return new Promise((res,rej) => { const r=tx(s).getAll(); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
}
async function getOne(s, id) {
  await openDB();
  return new Promise((res,rej) => { const r=tx(s).get(id); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
}
async function add(s, data) {
  await openDB();
  return new Promise((res,rej) => { const r=tx(s,'readwrite').add({...data,createdAt:new Date().toISOString()}); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
}
async function put(s, data) {
  await openDB();
  return new Promise((res,rej) => { const r=tx(s,'readwrite').put({...data,updatedAt:new Date().toISOString()}); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
}
async function remove(s, id) {
  await openDB();
  return new Promise((res,rej) => { const r=tx(s,'readwrite').delete(id); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); });
}

async function exportAll() {
  await openDB();
  const stores = ['ingredients','batches','hygiene','equipment','production','standards'];
  const data = {};
  for (const s of stores) data[s] = await getAll(s);
  data._exportedAt = new Date().toISOString();
  data._version = DB_VER;
  return data;
}

async function importAll(data) {
  await openDB();
  const stores = ['ingredients','batches','hygiene','equipment','production','standards'];
  for (const s of stores) {
    if (!data[s]) continue;
    const st = tx(s,'readwrite');
    st.clear();
    for (const item of data[s]) {
      const {id, ...rest} = item;
      st.add(rest);
    }
  }
}

async function clearAll() {
  await openDB();
  const stores = ['ingredients','batches','hygiene','equipment','production','standards'];
  for (const s of stores) tx(s,'readwrite').clear();
}

async function seedIfEmpty() {
  await openDB();
  const [exIng, exBat] = await Promise.all([getAll('ingredients'), getAll('batches')]);
  if (exIng.length > 0 && exBat.length > 0) return;

  const carrotRecipe = [
    {원료명:'올리브오일',    INCI:'Olea Europaea Fruit Oil',          이론량:320, 비율:26.8},
    {원료명:'코코넛야자오일',INCI:'Cocos Nucifera Oil',               이론량:240, 비율:20.1},
    {원료명:'오일팜오일',   INCI:'Elaeis Guineensis Oil',             이론량:160, 비율:13.4},
    {원료명:'피마자씨오일', INCI:'Ricinus Communis Seed Oil',         이론량:40,  비율:3.3},
    {원료명:'시어버터',     INCI:'Butyrospermum Parkii Butter',       이론량:40,  비율:3.3},
    {원료명:'소듐하이드록사이드',INCI:'Sodium Hydroxide',             이론량:97,  비율:8.1},
    {원료명:'정제수',       INCI:'Water',                             이론량:252, 비율:21.1},
    {원료명:'당근추출물',   INCI:'Daucus Carota Sativa Root Extract', 이론량:6,   비율:0.5},
    {원료명:'카로틴오일',   INCI:'Helianthus Annuus Seed Oil',        이론량:6,   비율:0.5},
    {원료명:'나이아신아마이드',INCI:'Niacinamide',                    이론량:8,   비율:0.7},
    {원료명:'FO 라임바질만다린',INCI:'Fragrance',                     이론량:22,  비율:1.8},
    {원료명:'EO 당근씨오일',INCI:'Daucus Carota Sativa Seed Oil',     이론량:2,   비율:0.2},
    {원료명:'아나토 분말',  INCI:'Bixa Orellana Seed Extract',        이론량:2,   비율:0.2},
  ];
  const wcRecipe = [
    {원료명:'올리브오일',         INCI:'Olea Europaea Fruit Oil',      이론량:280, 비율:23.5},
    {원료명:'코코넛야자오일',     INCI:'Cocos Nucifera Oil',            이론량:240, 비율:20.2},
    {원료명:'오일팜오일',         INCI:'Elaeis Guineensis Oil',         이론량:120, 비율:10.1},
    {원료명:'마카다미아씨오일',   INCI:'Macadamia Integrifolia Seed Oil',이론량:80, 비율:6.7},
    {원료명:'피마자씨오일',       INCI:'Ricinus Communis Seed Oil',     이론량:40,  비율:3.4},
    {원료명:'시어버터',           INCI:'Butyrospermum Parkii Butter',   이론량:40,  비율:3.4},
    {원료명:'소듐하이드록사이드', INCI:'Sodium Hydroxide',              이론량:96,  비율:8.1},
    {원료명:'정제수',             INCI:'Water',                         이론량:246, 비율:20.7},
    {원료명:'세라마이드엔피',     INCI:'Ceramide NP',                   이론량:2,   비율:0.2},
    {원료명:'살리실릭애씨드',     INCI:'Salicylic Acid',                이론량:2,   비율:0.2},
    {원료명:'마데카소사이드',     INCI:'Madecassoside',                 이론량:2,   비율:0.2},
    {원료명:'미나리가루',         INCI:'Oenanthe Javanica Powder',      이론량:7,   비율:0.6},
    {원료명:'FO 아르테미시아',    INCI:'Fragrance',                     이론량:17,  비율:1.4},
    {원료명:'EO 티트리오일',      INCI:'Melaleuca Alternifolia Leaf Oil',이론량:7,  비율:0.6},
    {원료명:'크로뮴옥사이드그린', INCI:'Chromium Oxide Greens',         이론량:2,   비율:0.2},
    {원료명:'어성초가루',         INCI:'Houttuynia Cordata Powder',     이론량:3,   비율:0.3},
    {원료명:'클로렐라불가리스가루',INCI:'Chlorella Vulgaris Powder',    이론량:3,   비율:0.3},
  ];

  const ing = [
    {원료명:'올리브오일',         제조처:'Ziani',               수량:'16kg',category:'베이스오일',   CoA:'수취',  판정:'적합'},
    {원료명:'코코넛야자오일',     제조처:'오뚜기',              수량:'15kg',category:'베이스오일',   CoA:'수취',  판정:'적합'},
    {원료명:'오일팜오일',         제조처:'오뚜기',              수량:'15kg',category:'베이스오일',   CoA:'수취',  판정:'적합'},
    {원료명:'피마자씨오일',       제조처:'O&3',                 수량:'5kg', category:'베이스오일',   CoA:'수취',  판정:'적합'},
    {원료명:'마카다미아씨오일',   제조처:'Sri Venkatesh Aromas',수량:'',   category:'베이스오일',   CoA:'수취',  판정:'적합'},
    {원료명:'시어버터',           제조처:'O&3',                 수량:'5kg', category:'버터·왁스',    CoA:'수취',  판정:'적합'},
    {원료명:'카로틴오일',         제조처:'O&3',                 수량:'',   category:'버터·왁스',    CoA:'수취',  판정:'적합',비고:'두날리엘라살리나 20%+해바라기 80%'},
    {원료명:'소듐하이드록사이드', 제조처:'덕산케미칼',          수량:'10kg',category:'가성소다',     CoA:'수취',  판정:'적합',비고:'밀폐 용기 별도 보관'},
    {원료명:'정제수',             제조처:'주식회사케어팜',      수량:'12L', category:'정제수',       CoA:'미수취',판정:'적합'},
    {원료명:'세라마이드엔피',     제조처:'SCM Tech',            수량:'',   category:'첨가물·기능성', CoA:'미기입',판정:'미기입'},
    {원료명:'살리실릭애씨드',     제조처:'㈜대명케미칼',        수량:'',   category:'첨가물·기능성', CoA:'미기입',판정:'미기입'},
    {원료명:'마데카소사이드',     제조처:'NURIPLUS',            수량:'',   category:'첨가물·기능성', CoA:'미기입',판정:'미기입'},
    {원료명:'나이아신아마이드',   제조처:'LASONS',              수량:'1kg', category:'첨가물·기능성', CoA:'미기입',판정:'미기입'},
    {원료명:'당근추출물',         제조처:'월터엔터프라이즈',    수량:'200g',category:'첨가물·기능성', CoA:'미기입',판정:'미기입',비고:'20,000ppm'},
    {원료명:'아나토 분말',        제조처:'스킨메이트',          수량:'3kg', category:'향료·색소',    CoA:'수취',  판정:'적합'},
    {원료명:'크로뮴옥사이드그린', 제조처:'Sun Chemical',        수량:'',   category:'향료·색소',    CoA:'미기입',판정:'미기입',비고:'CI 77288'},
    {원료명:'FO 라임바질만다린',  제조처:'Aromaline',           수량:'500g',category:'향료·색소',    CoA:'수취',  판정:'적합'},
    {원료명:'FO 아르테미시아',    제조처:'Aromaline',           수량:'',   category:'향료·색소',    CoA:'미기입',판정:'미기입'},
    {원료명:'EO 당근씨오일',      제조처:'Moksha',              수량:'',   category:'향료·색소',    CoA:'수취',  판정:'적합'},
    {원료명:'EO 티트리오일',      제조처:'O&3',                 수량:'',   category:'향료·색소',    CoA:'미기입',판정:'미기입'},
    {원료명:'미나리가루',         제조처:'(주)토종마을',        수량:'',   category:'첨가물·기능성', CoA:'미기입',판정:'미기입'},
    {원료명:'어성초가루',         제조처:'오일공구',            수량:'',   category:'첨가물·기능성', CoA:'미기입',판정:'미기입'},
    {원료명:'클로렐라불가리스가루',제조처:'오일공구',           수량:'',   category:'첨가물·기능성', CoA:'미기입',판정:'미기입'},
  ];
  const bat = [
    { 제품명:'에이브릴팜 당근비누', 문서번호:'EF-MI-004', 제조번호:'APBO10001-D1354',
      date:'2025-12-13', 제조방법:'CP법', 투입량:1195, 이론수량:11, 실제수량:11, 상태:'판매중',
      바코드:'8739101009095', 목표중량:'90g ±5g', 실측중량:100,
      색상기준:'오렌지·아나토 계열', 색상결과:'이상없음',
      KCL:'SC24-04502K', KCL접수일:'2024-10-22', KCL발행번호:'240304502', KCL발행일:'2024-11-01',
      CT:'CT24-090322K', CT내용량:'93', CT발행일:'2024-10-28',
      내용량:'103', 유리알칼리:'검출 안 됨',
      알레르기:'부틸페닐메틸프로피오날, 리날룰, 리모넨', 이상:'이상없음', 비고:'EF-PS-004',
      전성분:'올리브오일, 정제수, 코코넛야자오일, 오일팜오일, 소듐하이드록사이드, 시어버터, 피마자씨오일, 당근추출물(20,000ppm), 향료, 아나토, 해바라기씨오일, 나이아신아마이드, 두날리엘라살리나추출물, 당근씨오일',
      레시피: carrotRecipe },
    { 제품명:'에이브릴팜 미나리비누', 문서번호:'EF-MI-005', 제조번호:'APBG10004-N1354',
      date:'2025-11-13', 제조방법:'CP법', 투입량:1190, 이론수량:13, 실제수량:11, 상태:'판매중',
      바코드:'8739020413096', 목표중량:'90g ±5g', 실측중량:103,
      색상기준:'그린 계열 (크로뮴옥사이드그린)', 색상결과:'짙은 녹색',
      KCL:'SC25-00244K', KCL접수일:'2025-01-31', KCL발행번호:'250300244', KCL발행일:'2025-02-07',
      내용량:'109', 유리알칼리:'검출 안 됨',
      알레르기:'리날룰, 리모넨', 이상:'이상없음', 비고:'EF-PS-005',
      전성분:'올리브오일, 코코넛야자오일, 정제수, 오일팜오일, 소듐하이드록사이드, 마카다미아씨오일, 시어버터, 피마자씨오일, 향료, 세라마이드엔피, 살리실릭애씨드, 마데카소사이드, 미나리가루, 크로뮴옥사이드그린, 어성초가루, 클로렐라불가리스가루',
      레시피: wcRecipe }
  ];
  const hyg = [
    {date:'2026-05-01',type:'청소점검',items:{원료보관:'청결',부자재:'청결',완제품:'청결',작업대:'청결',도구류:'청결',포장실:'청결'},확인자:'변민정',status:'완료'},
    {date:'2026-05-08',type:'청소점검',items:{원료보관:'청결',부자재:'청결',완제품:'청결',작업대:'청결',도구류:'청결',포장실:'청결'},확인자:'변민정',status:'완료'},
    {date:'2026-05-15',type:'온도·습도',온도:23,습도:55,확인자:'변민정',status:'완료'},
    {date:'2026-06-04',type:'제조위생',확인자:'변민정',status:'완료'},
    {date:'2026-06-04',type:'온도·습도',온도:23,습도:47,확인자:'변민정',status:'완료'},
    {date:'2026-06-04',type:'청소점검',items:{원료보관:'청결',부자재:'청결',완제품:'청결',작업대:'청결',도구류:'청결',포장실:'청결'},확인자:'변민정',status:'완료'},
  ];
  for (const i of ing) await add('ingredients', i);
  for (const b of bat) await add('batches', b);
  for (const h of hyg) await add('hygiene', h);
}

window.DB = { openDB, getAll, getOne, add, put, remove, exportAll, importAll, clearAll, seedIfEmpty };

/* ── 바코드 시드 데이터 추가 ── */
async function seedBarcodes() {
  await openDB();
  const ex = await getAll('barcodes');
  if (ex.length > 0) return;

  const products = [
    {번호:1,  제품명:'캐롯숍',           소분류:'071',비번호:'001',개수:'09',제조번호:'',       제조일:'',      유통기한:'',    상태:'단종', 비고:'2023'},
    {번호:2,  제품명:'크리스마스숍',      소분류:'112',비번호:'002',개수:'09',제조번호:'',       제조일:'',      유통기한:'단종',상태:'단종', 비고:''},
    {번호:3,  제품명:'젤리베어숍',        소분류:'113',비번호:'003',개수:'20',제조번호:'',       제조일:'',      유통기한:'단종',상태:'단종', 비고:''},
    {번호:4,  제품명:'새해비누',          소분류:'011',비번호:'004',개수:'50',제조번호:'',       제조일:'',      유통기한:'',    상태:'활성', 비고:''},
    {번호:5,  제품명:'카네이션비누',      소분류:'004',비번호:'005',개수:'24',제조번호:'',       제조일:'',      유통기한:'단종',상태:'단종', 비고:''},
    {번호:6,  제품명:'아이스쿨바',        소분류:'715',비번호:'006',개수:'06',제조번호:'APBSF06006',제조일:'25.06.25',유통기한:'1년',상태:'활성', 비고:'2024'},
    {번호:7,  제품명:'명절선물 비누',     소분류:'815',비번호:'007',개수:'09',제조번호:'APBFW08007',제조일:'24.8.15',유통기한:'2년',상태:'활성', 비고:'2024'},
    {번호:8,  제품명:'명절선물 비누세트', 소분류:'815',비번호:'008',개수:'02',제조번호:'',       제조일:'',      유통기한:'',    상태:'활성', 비고:'2024'},
    {번호:9,  제품명:'당근 비누',         소분류:'101',비번호:'009',개수:'09',제조번호:'APBO10001',제조일:'',      유통기한:'',    상태:'활성', 비고:'2024'},
    {번호:10, 제품명:'가지 비누',         소분류:'102',비번호:'010',개수:'09',제조번호:'APBP10002',제조일:'',      유통기한:'',    상태:'활성', 비고:''},
    {번호:11, 제품명:'크리스마스 비누',   소분류:'112',비번호:'811',개수:'09',제조번호:'APBFW11001',제조일:'',     유통기한:'',    상태:'활성', 비고:''},
    {번호:12, 제품명:'아보카도 비누',     소분류:'020',비번호:'412',개수:'09',제조번호:'APBYG10003',제조일:'',    유통기한:'',    상태:'활성', 비고:''},
    {번호:13, 제품명:'미나리 비누',       소분류:'020',비번호:'413',개수:'09',제조번호:'APBG10004',제조일:'',     유통기한:'',    상태:'활성', 비고:''},
    {번호:14, 제품명:'선인장 캄비누',     소분류:'021',비번호:'502',개수:'01',제조번호:'APBSS02001',제조일:'25.02.17',유통기한:'',상태:'활성', 비고:''},
    {번호:15, 제품명:'카네이션 캄비누',   소분류:'021',비번호:'915',개수:'07',제조번호:'APBSS02002',제조일:'25.02.19',유통기한:'',상태:'활성', 비고:''},
    {번호:16, 제품명:'해로 굿즈 비누',   소분류:'040',비번호:'416',개수:'07',제조번호:'APBGS-104003',제조일:'25.04.17',유통기한:'',상태:'활성', 비고:''},
    {번호:17, 제품명:'토로 굿즈 비누',   소분류:'040',비번호:'417',개수:'07',제조번호:'APBGS-204004',제조일:'25.04.21',유통기한:'',상태:'활성', 비고:''},
    {번호:18, 제품명:'쿨비누',           소분류:'052',비번호:'918',개수:'06',제조번호:'APBSF05005',제조일:'25.05.29',유통기한:'',상태:'활성', 비고:''},
    {번호:19, 제품명:'제이쫌 쿨 비누',  소분류:'401',비번호:'527',개수:'05',제조번호:'JPBSF05006',제조일:'25.06.27',유통기한:'1kg',상태:'활성', 비고:'사업자 6590'},
    {번호:20, 제품명:'투명비누-핑크',    소분류:'120',비번호:'119',개수:'20',제조번호:'APBGS-312005',제조일:'25.12.02',유통기한:'56kg',상태:'활성', 비고:''},
    {번호:21, 제품명:'투명비누-옐로',    소분류:'120',비번호:'120',개수:'20',제조번호:'APBGS-412006',제조일:'25.12.02',유통기한:'',상태:'활성', 비고:''},
    {번호:22, 제품명:'투명비누-블루',    소분류:'120',비번호:'121',개수:'20',제조번호:'APBGS-512007',제조일:'25.12.02',유통기한:'',상태:'활성', 비고:''},
    {번호:23, 제품명:'투명비누 세트',    소분류:'120',비번호:'122',개수:'20',제조번호:'APBGS-612008',제조일:'25.12.02',유통기한:'',상태:'활성', 비고:''},
    {번호:24, 제품명:'당근복비누',       소분류:'012',비번호:'223',개수:'09',제조번호:'APBFW12002',제조일:'26.01.22',유통기한:'',상태:'활성', 비고:'2026'},
    {번호:25, 제품명:'말비누',           소분류:'012',비번호:'224',개수:'04',제조번호:'APBFW12003',제조일:'',     유통기한:'',    상태:'활성', 비고:''},
    {번호:26, 제품명:'새해 비누 2구세트',소분류:'012',비번호:'225',개수:'04',제조번호:'APBFW12004',제조일:'',     유통기한:'',    상태:'활성', 비고:''},
    {번호:27, 제품명:'투명비누-화이트',  소분류:'013',비번호:'026',개수:'12',제조번호:'APBGS-701009',제조일:'26.01.30',유통기한:'',상태:'활성', 비고:'세트 개별 생산량에서 분배'},
    {번호:28, 제품명:'카네이션 미니화분 비누',소분류:'033',비번호:'027',개수:'06',제조번호:'APBSS03003',제조일:'26.03.30',유통기한:'',상태:'활성', 비고:'3/30-10, 4/25-50'},
    {번호:29, 제품명:'선인장 미니화분 비누',소분류:'033',비번호:'028',개수:'06',제조번호:'APBSS03004',제조일:'26.03.30',유통기한:'',상태:'활성', 비고:'3/30-10, 4/28-20'},
    {번호:30, 제품명:'듀얼 세트(카네이션+선인장)',소분류:'033',비번호:'029',개수:'03',제조번호:'APBSS03005',제조일:'',유통기한:'',상태:'활성', 비고:'4/28-20'},
    {번호:31, 제품명:'듀오 세트(카네이션)',소분류:'033',비번호:'030',개수:'03',제조번호:'APBSS03003',제조일:'',유통기한:'',상태:'활성', 비고:'4/25-20'},
    {번호:32, 제품명:'듀오 세트(선인장)', 소분류:'033',비번호:'031',개수:'03',제조번호:'APBSS03004',제조일:'',유통기한:'',상태:'활성', 비고:'3/30-10'},
  ];

  // 바코드 자동 계산 후 저장
  for (const p of products) {
    const d12 = `8739${p.소분류}${p.비번호}${p.개수}`;
    p.바코드12 = d12;
    p.체크디지트 = calcCheckDigit(d12);
    p.바코드전체 = d12 + p.체크디지트;
    await add('barcodes', p);
  }
}

function calcCheckDigit(digits12) {
  let s = 0;
  for (let i = 0; i < 12; i++) s += parseInt(digits12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (s % 10)) % 10;
}

// DB에 barcodes 스토어가 없을 경우 추가
window.DB.seedBarcodes = seedBarcodes;
window.DB.calcCheckDigit = calcCheckDigit;

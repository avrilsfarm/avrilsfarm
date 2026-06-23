'use strict';
const DB_NAME = 'AvrilFarmDB', DB_VER = 10;
let _db;

function openDB() {
  return new Promise((res, rej) => {
    if (_db) return res(_db);
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = e => {
      const d = e.target.result;
      const tr = e.target.transaction;
      const schema = {
        products:    [{n:'제품명',k:'제품명'}],
        ingredients: [],
        batches:     [{n:'상태',k:'상태'},{n:'productId',k:'productId'}],
        hygiene:     [{n:'date',k:'date'},{n:'type',k:'type'}],
        equipment:   [{n:'year',k:'year'}],
        production:  [{n:'date',k:'date'}],
        barcodes:    [{n:'번호',k:'번호'}]
      };
      // 기존 스토어는 절대 삭제하지 않음 — 없는 스토어/인덱스만 추가
      Object.entries(schema).forEach(([name, idxs]) => {
        const st = d.objectStoreNames.contains(name)
          ? tr.objectStore(name)
          : d.createObjectStore(name, {keyPath:'id', autoIncrement:true});
        idxs.forEach(({n,k}) => { if (!st.indexNames.contains(n)) st.createIndex(n, k); });
      });
    };
    r.onsuccess = e => { _db = e.target.result; res(_db); };
    r.onerror = () => rej(r.error);
  });
}

function tx(name, mode='readonly') {
  return _db.transaction(name, mode).objectStore(name);
}

async function getAll(s) {
  await openDB();
  return new Promise((res,rej) => {
    const r = tx(s).getAll();
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function getOne(s, id) {
  await openDB();
  return new Promise((res,rej) => {
    const r = tx(s).get(id);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function add(s, data) {
  await openDB();
  return new Promise((res,rej) => {
    const r = tx(s,'readwrite').add({...data, createdAt: new Date().toISOString()});
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function put(s, data) {
  await openDB();
  return new Promise((res,rej) => {
    const r = tx(s,'readwrite').put({...data, updatedAt: new Date().toISOString()});
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function remove(s, id) {
  await openDB();
  return new Promise((res,rej) => {
    const r = tx(s,'readwrite').delete(id);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

/* ══════════════════════════════════════
   제품 마스터 시드 (products 스토어)
   → 제품의 영구 기준 정보
══════════════════════════════════════ */
/* 당근비누 레시피 — AF-PS-004 / AF-MI-004 Rev.01 기준 (800g 오일 배치) */
const carrotRecipe = [
  {원료명:'올리브오일',          INCI:'Olea Europaea (Olive) Fruit Oil',                                          이론량:280, 비율:23.0},
  {원료명:'코코넛야자오일',       INCI:'Cocos Nucifera (Coconut) Oil',                                             이론량:240, 비율:20.0},
  {원료명:'정제수',               INCI:'Water (Aqua)',                                                              이론량:207, 비율:17.0},
  {원료명:'오일팜오일',           INCI:'Elaeis Guineensis (Palm) Oil',                                             이론량:200, 비율:16.0},
  {원료명:'소듐하이드록사이드',   INCI:'Sodium Hydroxide',                                                         이론량:122, 비율:10.0},
  {원료명:'시어버터',             INCI:'Butyrospermum Parkii (Shea) Butter',                                       이론량:40,  비율:3.0},
  {원료명:'피마자씨오일',         INCI:'Ricinus Communis (Castor) Seed Oil',                                       이론량:40,  비율:3.0},
  {원료명:'향료 (라임바질)',      INCI:'Fragrance (Parfum)',                                                        이론량:22.8,비율:1.89},
  {원료명:'당근추출물 (20,000ppm)',INCI:'Daucus Carota Sativa Root Extract',                                       이론량:24,  비율:2.0},
  {원료명:'카로틴오일',           INCI:'Dunaliella Salina Extract, Helianthus Annuus (Sunflower) Seed Oil',        이론량:12,  비율:1.0},
  {원료명:'아나토',               INCI:'Bixa Orellana Seed Extract (Annatto)',                                     이론량:10,  비율:0.8},
  {원료명:'나이아신아마이드',     INCI:'Niacinamide',                                                              이론량:6,   비율:0.5},
  {원료명:'EO 당근씨오일',        INCI:'Daucus Carota Sativa (Carrot) Seed Oil',                                   이론량:1.2, 비율:0.09},
];

const watercressRecipe = [
  {원료명:'올리브오일',           INCI:'Olea Europaea Fruit Oil',              이론량:280, 비율:23.5},
  {원료명:'코코넛야자오일',       INCI:'Cocos Nucifera Oil',                   이론량:240, 비율:20.2},
  {원료명:'오일팜오일',           INCI:'Elaeis Guineensis Oil',                이론량:120, 비율:10.1},
  {원료명:'마카다미아씨오일',     INCI:'Macadamia Integrifolia Seed Oil',      이론량:80,  비율:6.7},
  {원료명:'피마자씨오일',         INCI:'Ricinus Communis Seed Oil',            이론량:40,  비율:3.4},
  {원료명:'시어버터',             INCI:'Butyrospermum Parkii Butter',          이론량:40,  비율:3.4},
  {원료명:'소듐하이드록사이드',   INCI:'Sodium Hydroxide',                     이론량:96,  비율:8.1},
  {원료명:'정제수',               INCI:'Water',                                이론량:246, 비율:20.7},
  {원료명:'세라마이드엔피',       INCI:'Ceramide NP',                          이론량:2,   비율:0.2},
  {원료명:'살리실릭애씨드',       INCI:'Salicylic Acid',                       이론량:2,   비율:0.2},
  {원료명:'마데카소사이드',       INCI:'Madecassoside',                        이론량:2,   비율:0.2},
  {원료명:'미나리가루',           INCI:'Oenanthe Javanica Powder',             이론량:7,   비율:0.6},
  {원료명:'FO 아르테미시아',      INCI:'Fragrance',                            이론량:17,  비율:1.4},
  {원료명:'EO 티트리오일',        INCI:'Melaleuca Alternifolia Leaf Oil',      이론량:7,   비율:0.6},
  {원료명:'크로뮴옥사이드그린',   INCI:'Chromium Oxide Greens',               이론량:2,   비율:0.2},
  {원료명:'어성초가루',           INCI:'Houttuynia Cordata Powder',            이론량:3,   비율:0.3},
  {원료명:'클로렐라불가리스가루', INCI:'Chlorella Vulgaris Powder',            이론량:3,   비율:0.3},
];

/* 제품 마스터 데이터 — 표준서 기준 고정값 */
const productMasters = [
  {
    제품명: '에이브릴팜 당근비누',
    문서번호: 'AF-PS-004',
    제조방법: 'CP법 (Water:Lye = 1.7:1)',
    목표중량: '90g ±5g',
    기준투입량: 1205,
    이론수량: 9,
    유통기한: '제조일로부터 2년',
    용량: '90g',
    색상기준: '오렌지·아나토 계열',
    알레르기: '부틸페닐메틸프로피오날, 리날룰, 리모넨',
    전성분: '올리브오일, 정제수, 코코넛야자오일, 오일팜오일, 소듐하이드록사이드, 시어버터, 피마자씨오일, 당근추출물(20,000ppm), 향료, 아나토, 해바라기씨오일, 나이아신아마이드, 두날리엘라살리나추출물, 당근씨오일, 부틸페닐메틸프로피오날, 리날룰, 리모넨',
    품질기준: {내용량:'97% 이상', 유리알칼리:'0.1% 이하'},
    보관방법: '직사광선 차단, 서늘하고 건조한 곳 보관',
    바코드: '8739101009095',
    제조번호형식: 'APBO',
    KCL: 'SC24-04502K',
    KCL발행번호: '240304502',
    KCL접수일: '2024-10-22',
    KCL발행일: '2024-11-01',
    KCL내용량: '103',
    KCL유리알칼리: '검출 안 됨',
    레시피: carrotRecipe,
    비고: '',
  },
  {
    제품명: '에이브릴팜 미나리비누',
    문서번호: 'AF-PS-005',
    제조방법: 'CP법',
    목표중량: '90g ±5g',
    기준투입량: 1190,
    이론수량: 13,
    유통기한: '제조일로부터 2년',
    용량: '90g',
    색상기준: '그린 계열 (크로뮴옥사이드그린)',
    알레르기: '리날룰, 리모넨',
    전성분: '올리브오일, 코코넛야자오일, 정제수, 오일팜오일, 소듐하이드록사이드, 마카다미아씨오일, 시어버터, 피마자씨오일, 향료, 세라마이드엔피, 살리실릭애씨드, 마데카소사이드, 미나리가루, 크로뮴옥사이드그린, 어성초가루, 클로렐라불가리스가루',
    품질기준: {내용량:'97% 이상', 유리알칼리:'0.1% 이하'},
    보관방법: '직사광선 차단, 서늘하고 건조한 곳 보관',
    바코드: '8739020413096',
    제조번호형식: 'APBG',
    KCL: 'SC25-00244K',
    KCL발행번호: '',
    KCL접수일: '2025-01-31',
    KCL발행일: '',
    KCL내용량: '',
    KCL유리알칼리: '검출 안 됨',
    레시피: watercressRecipe,
    비고: '',
  }
];

async function seedIfEmpty() {
  return; // 시드 데이터 비활성화
  await openDB();
  const [exProd, exIng, exBat] = await Promise.all([
    getAll('products'), getAll('ingredients'), getAll('batches')
  ]);

  /* ── 제품 마스터 시드 ── */
  if (exProd.length === 0) {
    for (const p of productMasters) await add('products', p);
  }

  /* ── 원료 시드 ── */
  if (exIng.length === 0) {
    const ing = [
      {원료명:'올리브오일',          제조처:'Ziani',                수량:'16kg', category:'베이스오일',    CoA:'수취', 판정:'적합'},
      {원료명:'코코넛야자오일',       제조처:'오뚜기',               수량:'15kg', category:'베이스오일',    CoA:'수취', 판정:'적합'},
      {원료명:'오일팜오일',           제조처:'오뚜기',               수량:'15kg', category:'베이스오일',    CoA:'수취', 판정:'적합'},
      {원료명:'피마자씨오일',         제조처:'O&3',                  수량:'5kg',  category:'베이스오일',    CoA:'수취', 판정:'적합'},
      {원료명:'마카다미아씨오일',     제조처:'Sri Venkatesh Aromas', 수량:'',     category:'베이스오일',    CoA:'수취', 판정:'적합'},
      {원료명:'시어버터',             제조처:'O&3',                  수량:'5kg',  category:'버터·왁스',     CoA:'수취', 판정:'적합'},
      {원료명:'카로틴오일',           제조처:'O&3',                  수량:'',     category:'버터·왁스',     CoA:'수취', 판정:'적합', 비고:'두날리엘라살리나 20%+해바라기 80%'},
      {원료명:'소듐하이드록사이드',   제조처:'덕산케미칼',           수량:'10kg', category:'가성소다',      CoA:'수취', 판정:'적합', 비고:'밀폐 용기 별도 보관'},
      {원료명:'정제수',               제조처:'주식회사케어팜',       수량:'12L',  category:'정제수',        CoA:'미수취',판정:'적합'},
      {원료명:'세라마이드엔피',       제조처:'SCM Tech',             수량:'',     category:'첨가물·기능성', CoA:'미기입',판정:'미기입'},
      {원료명:'살리실릭애씨드',       제조처:'㈜대명케미칼',         수량:'',     category:'첨가물·기능성', CoA:'미기입',판정:'미기입'},
      {원료명:'마데카소사이드',       제조처:'NURIPLUS',             수량:'',     category:'첨가물·기능성', CoA:'미기입',판정:'미기입'},
      {원료명:'나이아신아마이드',     제조처:'LASONS',               수량:'1kg',  category:'첨가물·기능성', CoA:'미기입',판정:'미기입'},
      {원료명:'당근추출물',           제조처:'월터엔터프라이즈',     수량:'200g', category:'첨가물·기능성', CoA:'미기입',판정:'미기입', 비고:'20,000ppm'},
      {원료명:'아나토 분말',          제조처:'스킨메이트',           수량:'3kg',  category:'향료·색소',     CoA:'수취', 판정:'적합'},
      {원료명:'크로뮴옥사이드그린',   제조처:'Sun Chemical',         수량:'',     category:'향료·색소',     CoA:'미기입',판정:'미기입', 비고:'CI 77288'},
      {원료명:'FO 라임바질만다린',    제조처:'Aromaline',            수량:'500g', category:'향료·색소',     CoA:'수취', 판정:'적합'},
      {원료명:'FO 아르테미시아',      제조처:'Aromaline',            수량:'',     category:'향료·색소',     CoA:'미기입',판정:'미기입'},
      {원료명:'EO 당근씨오일',        제조처:'Moksha',               수량:'',     category:'향료·색소',     CoA:'수취', 판정:'적합'},
      {원료명:'EO 티트리오일',        제조처:'O&3',                  수량:'',     category:'향료·색소',     CoA:'미기입',판정:'미기입'},
      {원료명:'미나리가루',           제조처:'(주)토종마을',         수량:'',     category:'첨가물·기능성', CoA:'미기입',판정:'미기입'},
      {원료명:'어성초가루',           제조처:'오일공구',             수량:'',     category:'첨가물·기능성', CoA:'미기입',판정:'미기입'},
      {원료명:'클로렐라불가리스가루', 제조처:'오일공구',             수량:'',     category:'첨가물·기능성', CoA:'미기입',판정:'미기입'},
    ];
    for (const i of ing) await add('ingredients', i);
  }

  /* ── 배치 시드 (productId 연결, 레시피/전성분 제거 → 표준서 참조) ── */
  if (exBat.length === 0) {
    const prods = await getAll('products');
    const carrotProd   = prods.find(p=>p.제품명.includes('당근'));
    const watercressProd = prods.find(p=>p.제품명.includes('미나리'));

    const bat = [
      {
        productId: carrotProd?.id,
        제품명: '에이브릴팜 당근비누',
        문서번호: 'AF-MI-004',
        제조번호: 'APBO10001-D1354',
        date: '2025-12-13',
        투입량: 1205,
        실제수량: 9,
        상태: '판매중',
        실측중량: 93,
        색상결과: '이상없음',
        이상: '이상없음',
        비고: '',
      },
      {
        productId: watercressProd?.id,
        제품명: '에이브릴팜 미나리비누',
        문서번호: 'AF-MI-005',
        제조번호: 'APBG10004',
        date: '2025-11-13',
        투입량: 1190,
        실제수량: 11,
        상태: '판매중',
        실측중량: 103,
        색상결과: '짙은 녹색',
        이상: '이상없음',
        비고: '',
      }
    ];
    for (const b of bat) await add('batches', b);

    /* 위생 시드 */
    const hyg = [
      {date:'2026-05-01', type:'청소점검', items:{원료보관:'청결',부자재:'청결',완제품:'청결',작업대:'청결',도구류:'청결',포장실:'청결'}, 확인자:'변민정', status:'완료'},
      {date:'2026-05-08', type:'청소점검', items:{원료보관:'청결',부자재:'청결',완제품:'청결',작업대:'청결',도구류:'청결',포장실:'청결'}, 확인자:'변민정', status:'완료'},
      {date:'2026-05-15', type:'온도·습도', 온도:23, 습도:55, 확인자:'변민정', status:'완료'},
      {date:'2026-05-22', type:'청소점검', items:{원료보관:'청결',부자재:'청결',완제품:'청결',작업대:'청결',도구류:'청결',포장실:'청결'}, 확인자:'변민정', status:'완료'},
      {date:'2026-06-04', type:'제조위생', 확인자:'변민정', status:'완료'},
      {date:'2026-06-04', type:'온도·습도', 온도:23, 습도:47, 확인자:'변민정', status:'완료'},
      {date:'2026-06-04', type:'청소점검', items:{원료보관:'청결',부자재:'청결',완제품:'청결',작업대:'청결',도구류:'청결',포장실:'청결'}, 확인자:'변민정', status:'완료'},
    ];
    for (const h of hyg) await add('hygiene', h);
  }
}

async function exportAll() {
  await openDB();
  const stores = ['products','ingredients','batches','hygiene','equipment','production','barcodes'];
  const data = {_exportedAt: new Date().toISOString(), _version: DB_VER};
  for (const s of stores) {
    try { data[s] = await getAll(s); } catch(e) { data[s] = []; }
  }
  return data;
}

async function importAll(data) {
  await openDB();
  if (data._version && data._version !== DB_VER) {
    console.warn(`[importAll] 데이터 버전(\${data._version}) ≠ 현재 DB 버전(\${DB_VER}) — 필드 누락 가능`);
  }
  const stores = ['products','ingredients','batches','hygiene','equipment','production','barcodes'];
  for (const s of stores) {
    if (!data[s] || !data[s].length) continue;
    const st = _db.transaction(s,'readwrite').objectStore(s);
    await new Promise((res,rej) => { const r=st.clear(); r.onsuccess=res; r.onerror=rej; });
    for (const item of data[s]) {
      await new Promise((res,rej) => { const r=st.put(item); r.onsuccess=res; r.onerror=rej; });
    }
  }
}

async function clearAll() {
  await openDB();
  const stores = ['products','ingredients','batches','hygiene','equipment','production','barcodes'];
  for (const s of stores) {
    const st = _db.transaction(s,'readwrite').objectStore(s);
    await new Promise((res,rej) => { const r=st.clear(); r.onsuccess=res; r.onerror=rej; });
  }
}

/* 기존 DB의 EF- 문서번호를 AF-로 일괄 변환 */
async function migrateEFtoAF() {
  await openDB();
  let count = 0;

  // batches 마이그레이션
  const batches = await getAll('batches');
  for(const b of batches) {
    let changed = false;
    const updated = {...b};
    if(updated.문서번호 && updated.문서번호.startsWith('EF-')) {
      updated.문서번호 = updated.문서번호.replace(/^EF-/, 'AF-');
      changed = true;
    }
    if(updated.비고 && updated.비고.includes('EF-PS')) {
      updated.비고 = updated.비고.replace(/EF-PS/g, 'AF-PS');
      changed = true;
    }
    if(changed) { await put('batches', updated); count++; }
  }

  // products 마이그레이션
  const products = await getAll('products');
  for(const p of products) {
    if(p.문서번호 && p.문서번호.startsWith('EF-')) {
      await put('products', {...p, 문서번호: p.문서번호.replace(/^EF-/, 'AF-')});
      count++;
    }
  }

  return count;
}

window.DB = { openDB, getAll, getOne, add, put, remove, seedIfEmpty, exportAll, importAll, clearAll, migrateEFtoAF };

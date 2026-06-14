'use strict';
const DB_NAME = 'AvrilFarmDB', DB_VER = 9;
let _db;

function openDB() {
  return new Promise((res, rej) => {
    if (_db) return res(_db);
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = e => {
      const d = e.target.result;
      // 기존 스토어 삭제 안 함 — 없는 것만 추가
      const schema = {
        ingredients: [],
        batches:     [{n:'status',k:'status'}],
        hygiene:     [{n:'date',k:'date'},{n:'type',k:'type'}],
        equipment:   [{n:'year',k:'year'}],
        production:  [{n:'date',k:'date'}],
        barcodes:    [{n:'번호',k:'번호'}]
      };
      Object.entries(schema).forEach(([name, idxs]) => {
        if (!d.objectStoreNames.contains(name)) {
          const st = d.createObjectStore(name, {keyPath:'id', autoIncrement:true});
          idxs.forEach(({n,k}) => st.createIndex(n, k));
        }
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

async function seedIfEmpty() {
  await openDB();
  const [exIng, exBat] = await Promise.all([getAll('ingredients'), getAll('batches')]);
  if (exIng.length > 0 && exBat.length > 0) return;

  // 당근비누 레시피 (800g 오일 배치, 투입량 합계 1195g)
  const carrotRecipe = [
    {원료명:'올리브오일',    INCI:'Olea Europaea Fruit Oil',         이론량:320, 비율:26.8},
    {원료명:'코코넛야자오일', INCI:'Cocos Nucifera Oil',              이론량:240, 비율:20.1},
    {원료명:'오일팜오일',    INCI:'Elaeis Guineensis Oil',            이론량:160, 비율:13.4},
    {원료명:'피마자씨오일',  INCI:'Ricinus Communis Seed Oil',        이론량:40,  비율:3.3},
    {원료명:'시어버터',      INCI:'Butyrospermum Parkii Butter',      이론량:40,  비율:3.3},
    {원료명:'소듐하이드록사이드', INCI:'Sodium Hydroxide',            이론량:97,  비율:8.1},
    {원료명:'정제수',        INCI:'Water',                            이론량:252, 비율:21.1},
    {원료명:'당근추출물',    INCI:'Daucus Carota Sativa Root Extract',이론량:6,   비율:0.5},
    {원료명:'카로틴오일',    INCI:'Helianthus Annuus Seed Oil',       이론량:6,   비율:0.5},
    {원료명:'나이아신아마이드',INCI:'Niacinamide',                    이론량:8,   비율:0.7},
    {원료명:'FO 라임바질만다린',INCI:'Fragrance',                    이론량:22,  비율:1.8},
    {원료명:'EO 당근씨오일',  INCI:'Daucus Carota Sativa Seed Oil',  이론량:2,   비율:0.2},
    {원료명:'아나토 분말',   INCI:'Bixa Orellana Seed Extract',       이론량:2,   비율:0.2},
  ];

  // 미나리비누 레시피
  const watercressRecipe = [
    {원료명:'올리브오일',     INCI:'Olea Europaea Fruit Oil',         이론량:280, 비율:23.5},
    {원료명:'코코넛야자오일', INCI:'Cocos Nucifera Oil',              이론량:240, 비율:20.2},
    {원료명:'오일팜오일',     INCI:'Elaeis Guineensis Oil',           이론량:120, 비율:10.1},
    {원료명:'마카다미아씨오일',INCI:'Macadamia Integrifolia Seed Oil', 이론량:80,  비율:6.7},
    {원료명:'피마자씨오일',   INCI:'Ricinus Communis Seed Oil',       이론량:40,  비율:3.4},
    {원료명:'시어버터',       INCI:'Butyrospermum Parkii Butter',     이론량:40,  비율:3.4},
    {원료명:'소듐하이드록사이드',INCI:'Sodium Hydroxide',             이론량:96,  비율:8.1},
    {원료명:'정제수',         INCI:'Water',                           이론량:246, 비율:20.7},
    {원료명:'세라마이드엔피', INCI:'Ceramide NP',                     이론량:2,   비율:0.2},
    {원료명:'살리실릭애씨드', INCI:'Salicylic Acid',                  이론량:2,   비율:0.2},
    {원료명:'마데카소사이드', INCI:'Madecassoside',                   이론량:2,   비율:0.2},
    {원료명:'미나리가루',     INCI:'Oenanthe Javanica Powder',        이론량:7,   비율:0.6},
    {원료명:'FO 아르테미시아',INCI:'Fragrance',                       이론량:17,  비율:1.4},
    {원료명:'EO 티트리오일',  INCI:'Melaleuca Alternifolia Leaf Oil', 이론량:7,   비율:0.6},
    {원료명:'크로뮴옥사이드그린',INCI:'Chromium Oxide Greens',        이론량:2,   비율:0.2},
    {원료명:'어성초가루',     INCI:'Houttuynia Cordata Powder',       이론량:3,   비율:0.3},
    {원료명:'클로렐라불가리스가루',INCI:'Chlorella Vulgaris Powder',  이론량:3,   비율:0.3},
  ];

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
    {원료명:'세라마이드엔피',        제조처:'SCM Tech',             수량:'',     category:'첨가물·기능성', CoA:'미기입',판정:'미기입'},
    {원료명:'살리실릭애씨드',       제조처:'㈜대명케미칼',         수량:'',     category:'첨가물·기능성', CoA:'미기입',판정:'미기입'},
    {원료명:'마데카소사이드',        제조처:'NURIPLUS',             수량:'',     category:'첨가물·기능성', CoA:'미기입',판정:'미기입'},
    {원료명:'나이아신아마이드',      제조처:'LASONS',               수량:'1kg',  category:'첨가물·기능성', CoA:'미기입',판정:'미기입'},
    {원료명:'당근추출물',            제조처:'월터엔터프라이즈',     수량:'200g', category:'첨가물·기능성', CoA:'미기입',판정:'미기입', 비고:'20,000ppm'},
    {원료명:'아나토 분말',           제조처:'스킨메이트',           수량:'3kg',  category:'향료·색소',     CoA:'수취', 판정:'적합'},
    {원료명:'크로뮴옥사이드그린',   제조처:'Sun Chemical',         수량:'',     category:'향료·색소',     CoA:'미기입',판정:'미기입', 비고:'CI 77288'},
    {원료명:'FO 라임바질만다린',    제조처:'Aromaline',            수량:'500g', category:'향료·색소',     CoA:'수취', 판정:'적합'},
    {원료명:'FO 아르테미시아',      제조처:'Aromaline',            수량:'',     category:'향료·색소',     CoA:'미기입',판정:'미기입'},
    {원료명:'EO 당근씨오일',        제조처:'Moksha',               수량:'',     category:'향료·색소',     CoA:'수취', 판정:'적합'},
    {원료명:'EO 티트리오일',        제조처:'O&3',                  수량:'',     category:'향료·색소',     CoA:'미기입',판정:'미기입'},
    {원료명:'미나리가루',            제조처:'(주)토종마을',         수량:'',     category:'첨가물·기능성', CoA:'미기입',판정:'미기입'},
    {원료명:'어성초가루',            제조처:'오일공구',             수량:'',     category:'첨가물·기능성', CoA:'미기입',판정:'미기입'},
    {원료명:'클로렐라불가리스가루', 제조처:'오일공구',             수량:'',     category:'첨가물·기능성', CoA:'미기입',판정:'미기입'},
  ];

  const bat = [
    {
      제품명:'에이브릴팜 당근비누', 문서번호:'EF-MI-004', 제조번호:'APBO10001-D1354',
      date:'2025-12-13', 제조방법:'CP법', 투입량:1195, 이론수량:11, 실제수량:11, 상태:'판매중',
      바코드:'8739101009095', 목표중량:'90g ±5g', 실측중량:100,
      색상기준:'오렌지·아나토 계열', 색상결과:'이상없음',
      KCL:'SC24-04502K', KCL접수일:'2024-10-22', KCL발행번호:'240304502', KCL발행일:'2024-11-01',
      CT:'CT24-090322K', CT내용량:'93', CT발행일:'2024-10-28',
      내용량:'103', 유리알칼리:'검출 안 됨',
      알레르기:'부틸페닐메틸프로피오날, 리날룰, 리모넨', 이상:'이상없음', 비고:'EF-PS-004',
      전성분:'올리브오일, 정제수, 코코넛야자오일, 오일팜오일, 소듐하이드록사이드, 시어버터, 피마자씨오일, 당근추출물(20,000ppm), 향료, 아나토, 해바라기씨오일, 나이아신아마이드, 두날리엘라살리나추출물, 당근씨오일, 부틸페닐메틸프로피오날, 리날룰, 리모넨',
      레시피: carrotRecipe
    },
    {
      제품명:'에이브릴팜 미나리비누', 문서번호:'EF-MI-005', 제조번호:'APBG10004-N1354',
      date:'2025-11-13', 제조방법:'CP법', 투입량:1190, 이론수량:13, 실제수량:11, 상태:'판매중',
      바코드:'8739020413096', 목표중량:'90g ±5g', 실측중량:103,
      색상기준:'그린 계열 (크로뮴옥사이드그린)', 색상결과:'짙은 녹색',
      KCL:'SC25-00244K', KCL접수일:'2025-01-31', KCL발행번호:'250300244', KCL발행일:'2025-02-07',
      내용량:'109', 유리알칼리:'검출 안 됨',
      알레르기:'리날룰, 리모넨', 이상:'이상없음', 비고:'EF-PS-005',
      전성분:'올리브오일, 코코넛야자오일, 정제수, 오일팜오일, 소듐하이드록사이드, 마카다미아씨오일, 시어버터, 피마자씨오일, 향료, 세라마이드엔피, 살리실릭애씨드, 마데카소사이드, 미나리가루, 크로뮴옥사이드그린, 어성초가루, 클로렐라불가리스가루',
      레시피: watercressRecipe
    }
  ];

  const hyg = [
    {date:'2026-05-01', type:'청소점검', items:{원료보관:'청결',부자재:'청결',완제품:'청결',작업대:'청결',도구류:'청결',포장실:'청결'}, 확인자:'변민정', status:'완료'},
    {date:'2026-05-08', type:'청소점검', items:{원료보관:'청결',부자재:'청결',완제품:'청결',작업대:'청결',도구류:'청결',포장실:'청결'}, 확인자:'변민정', status:'완료'},
    {date:'2026-05-15', type:'온도·습도', 온도:23, 습도:55, 확인자:'변민정', status:'완료'},
    {date:'2026-05-22', type:'청소점검', items:{원료보관:'청결',부자재:'청결',완제품:'청결',작업대:'청결',도구류:'청결',포장실:'청결'}, 확인자:'변민정', status:'완료'},
    {date:'2026-06-04', type:'제조위생', 확인자:'변민정', status:'완료'},
    {date:'2026-06-04', type:'온도·습도', 온도:23, 습도:47, 확인자:'변민정', status:'완료'},
    {date:'2026-06-04', type:'온도·습도', 온도:40, 습도:10, 확인자:'변민정', status:'문제임박', 이슈:'온도 기준 초과'},
    {date:'2026-06-04', type:'청소점검', items:{원료보관:'청결',부자재:'청결',완제품:'청결',작업대:'청결',도구류:'청결',포장실:'청결'}, 확인자:'변민정', status:'완료'},
  ];

  for (const i of ing) await add('ingredients', i);
  for (const b of bat) await add('batches', b);
  for (const h of hyg) await add('hygiene', h);
}

async function exportAll() {
  await openDB();
  const stores = ['ingredients','batches','hygiene','equipment','production','barcodes'];
  const data = {_exportedAt: new Date().toISOString(), _version: DB_VER};
  for (const s of stores) {
    try { data[s] = await getAll(s); } catch(e) { data[s] = []; }
  }
  return data;
}

async function importAll(data) {
  await openDB();
  const stores = ['ingredients','batches','hygiene','equipment','production','barcodes'];
  for (const s of stores) {
    if (!data[s] || !data[s].length) continue;
    const st = _db.transaction(s,'readwrite').objectStore(s);
    await new Promise((res,rej) => { const r=st.clear(); r.onsuccess=res; r.onerror=rej; });
    for (const item of data[s]) {
      const {id, createdAt, updatedAt, ...rest} = item;
      await new Promise((res,rej) => { const r=st.add(rest); r.onsuccess=res; r.onerror=rej; });
    }
  }
}

async function clearAll() {
  await openDB();
  const stores = ['ingredients','batches','hygiene','equipment','production','barcodes'];
  for (const s of stores) {
    const st = _db.transaction(s,'readwrite').objectStore(s);
    await new Promise((res,rej) => { const r=st.clear(); r.onsuccess=res; r.onerror=rej; });
  }
}

function calcCheckDigit(digits12) {
  let s = 0;
  for (let i = 0; i < 12; i++) s += parseInt(digits12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (s % 10)) % 10;
}

window.DB = { openDB, getAll, getOne, add, put, remove, seedIfEmpty, exportAll, importAll, clearAll, calcCheckDigit };

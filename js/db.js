/* ============================================================
   DB.js — IndexedDB 래퍼  (에이브릴팜 공방관리 v3)
   ============================================================ */
const DB_NAME = 'avril-farm-db';
const DB_VER  = 3;

function openDB(){
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e=>{
      const db = e.target.result;
      ['ingredients','batches','hygiene','sales','settings'].forEach(s=>{
        if(!db.objectStoreNames.contains(s))
          db.createObjectStore(s,{keyPath:'id',autoIncrement:true});
      });
    };
    req.onsuccess = e=> resolve(e.target.result);
    req.onerror   = e=> reject(e.target.error);
  });
}
async function getAll(store){
  const db = await openDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(store,'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = ()=>res(req.result);
    req.onerror   = ()=>rej(req.error);
  });
}
async function getOne(store, id){
  const db = await openDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(store,'readonly');
    const req = tx.objectStore(store).get(id);
    req.onsuccess = ()=>res(req.result);
    req.onerror   = ()=>rej(req.error);
  });
}
async function add(store, data){
  const db = await openDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(store,'readwrite');
    const req = tx.objectStore(store).add(data);
    req.onsuccess = ()=>res(req.result);
    req.onerror   = ()=>rej(req.error);
  });
}
async function put(store, data){
  const db = await openDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(store,'readwrite');
    const req = tx.objectStore(store).put(data);
    req.onsuccess = ()=>res(req.result);
    req.onerror   = ()=>rej(req.error);
  });
}
async function remove(store, id){
  const db = await openDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(store,'readwrite');
    const req = tx.objectStore(store).delete(id);
    req.onsuccess = ()=>res(req.result);
    req.onerror   = ()=>rej(req.error);
  });
}
async function clearAll(){
  const db = await openDB();
  const stores = ['ingredients','batches','hygiene','sales','settings'];
  for(const s of stores){
    await new Promise((res,rej)=>{
      const tx = db.transaction(s,'readwrite');
      const req = tx.objectStore(s).clear();
      req.onsuccess = ()=>res();
      req.onerror   = ()=>rej(req.error);
    });
  }
}
async function exportAll(){
  const data={};
  for(const s of ['ingredients','batches','hygiene','sales','settings']){
    data[s] = await getAll(s);
  }
  return JSON.stringify(data, null, 2);
}
async function importAll(jsonStr){
  await clearAll();
  const data = JSON.parse(jsonStr);
  for(const [store, rows] of Object.entries(data)){
    for(const row of (rows||[])){
      const r = {...row};
      delete r.id;
      await add(store, r);
    }
  }
}
function calcCheckDigit(digits12){
  const d = digits12.split('').map(Number);
  const sum = d.reduce((acc,v,i)=> acc + (i%2===0 ? v : v*3), 0);
  return (10 - (sum%10)) % 10;
}

async function seedIfEmpty(){
  const existing = await getAll('ingredients');
  if(existing.length > 0) return;

  const ings = [
    {type:'원료', name:'올리브오일',          supplier:'Ziani',           unit:'kg', stock:12,  minStock:2,   note:''},
    {type:'원료', name:'코코넛야자오일',        supplier:'오뚜기',          unit:'kg', stock:10,  minStock:2,   note:''},
    {type:'원료', name:'정제수',               supplier:'주식회사케어팜',   unit:'L',  stock:8,   minStock:2,   note:''},
    {type:'원료', name:'오일팜오일',            supplier:'오뚜기',          unit:'kg', stock:10,  minStock:2,   note:''},
    {type:'원료', name:'소듐하이드록사이드',    supplier:'덕산케미칼',       unit:'kg', stock:7,   minStock:1,   note:'밀폐보관필수'},
    {type:'원료', name:'시어버터',             supplier:'O&3',             unit:'kg', stock:4,   minStock:1,   note:''},
    {type:'원료', name:'피마자씨오일',          supplier:'O&3',             unit:'kg', stock:4,   minStock:1,   note:''},
    {type:'원료', name:'마카다미아씨오일',      supplier:'Sri Venkatesh',   unit:'kg', stock:2,   minStock:0.5, note:''},
    {type:'원료', name:'당근추출물',            supplier:'월터엔터프라이즈', unit:'g',  stock:150, minStock:50,  note:'20000ppm'},
    {type:'원료', name:'카로틴오일',            supplier:'O&3',             unit:'g',  stock:80,  minStock:20,  note:'두날리엘라20%+해바라기80%'},
    {type:'원료', name:'아나토',               supplier:'스킨메이트',       unit:'g',  stock:500, minStock:100, note:''},
    {type:'원료', name:'나이아신아마이드',      supplier:'LASONS',          unit:'g',  stock:200, minStock:50,  note:''},
    {type:'원료', name:'세라마이드엔피',        supplier:'SCM Tech',        unit:'g',  stock:100, minStock:20,  note:''},
    {type:'원료', name:'살리실릭애씨드',        supplier:'대명케미칼',       unit:'g',  stock:100, minStock:20,  note:''},
    {type:'원료', name:'마데카소사이드',        supplier:'NURIPLUS',        unit:'g',  stock:80,  minStock:20,  note:''},
    {type:'원료', name:'미나리가루',            supplier:'토종마을',         unit:'g',  stock:50,  minStock:10,  note:''},
    {type:'원료', name:'크로뮴옥사이드그린',    supplier:'Sun Chemical',    unit:'g',  stock:30,  minStock:5,   note:'CI 77288'},
    {type:'원료', name:'어성초가루',            supplier:'오일공구',         unit:'g',  stock:30,  minStock:5,   note:''},
    {type:'원료', name:'클로렐라불가리스가루',  supplier:'오일공구',         unit:'g',  stock:30,  minStock:5,   note:''},
    {type:'원료', name:'F.O 라임바질만다린',   supplier:'Aromaline',        unit:'g',  stock:300, minStock:50,  note:''},
    {type:'원료', name:'F.O 아르테미시아',     supplier:'Aromaline',        unit:'g',  stock:200, minStock:50,  note:''},
    {type:'원료', name:'E.O 당근씨오일',       supplier:'Moksha',           unit:'g',  stock:50,  minStock:10,  note:''},
    {type:'원료', name:'E.O 티트리오일',       supplier:'O&3',              unit:'g',  stock:50,  minStock:10,  note:''},
    {type:'포장재', name:'비누박스(당근)',      supplier:'자체',             unit:'개', stock:50,  minStock:10,  note:''},
    {type:'포장재', name:'비누박스(미나리)',    supplier:'자체',             unit:'개', stock:50,  minStock:10,  note:''},
    {type:'포장재', name:'OPP 비닐',           supplier:'자체',             unit:'개', stock:200, minStock:50,  note:''},
    {type:'포장재', name:'스티커 라벨',         supplier:'자체',             unit:'매', stock:200, minStock:50,  note:''},
  ];
  for(const i of ings) await add('ingredients', i);

  const batches = [
    {제품명:'에이브릴팜 당근비누', 문서번호:'EF-MI-004', 제조번호:'APBO10001-D1354',
     date:'2025-12-13', 제조방법:'CP법', 투입량:1195, 이론수량:11, 실제수량:11,
     상태:'판매중', 바코드:'8739101009095', 목표중량:'90g ±5g', 실측중량:100,
     KCL:'SC24-04502K', KCL발행일:'2024-11-01', 내용량:'103', 유리알칼리:'검출 안 됨',
     알레르기:'부틸페닐메틸프로피오날, 리날룰, 리모넨', 이상:'이상없음',
     전성분:'올리브오일, 정제수, 코코넛야자오일, 오일팜오일, 소듐하이드록사이드, 시어버터, 피마자씨오일, 당근추출물(20,000ppm), 향료, 아나토, 해바라기씨오일, 나이아신아마이드, 두날리엘라살리나추출물, 당근씨오일, 부틸페닐메틸프로피오날, 리날룰, 리모넨',
     레시피:[
       {no:1,원료:'올리브오일',INCI:'Olea Europaea Fruit Oil',이론량:280,비율:23.43,실사용량:280},
       {no:2,원료:'코코넛야자오일',INCI:'Cocos Nucifera Oil',이론량:240,비율:20.08,실사용량:240},
       {no:3,원료:'정제수',INCI:'Water (Aqua)',이론량:207,비율:17.31,실사용량:206},
       {no:4,원료:'오일팜오일',INCI:'Elaeis Guineensis Oil',이론량:200,비율:16.73,실사용량:200},
       {no:5,원료:'소듐하이드록사이드',INCI:'Sodium Hydroxide',이론량:122,비율:10.18,실사용량:121},
       {no:6,원료:'시어버터',INCI:'Butyrospermum Parkii Butter',이론량:40,비율:3.35,실사용량:40},
       {no:7,원료:'피마자씨오일',INCI:'Ricinus Communis Seed Oil',이론량:40,비율:3.35,실사용량:40},
       {no:8,원료:'향료(라임바질/당근 9.5:0.5)',INCI:'Fragrance (Parfum)',이론량:24,비율:2.01,실사용량:24},
       {no:9,원료:'당근추출물(20,000ppm)',INCI:'Daucus Carota Sativa Root Extract',이론량:24,비율:2.01,실사용량:24},
       {no:10,원료:'카로틴오일',INCI:'Dunaliella Salina Extract, Helianthus Annuus Seed Oil',이론량:12,비율:1.00,실사용량:12},
       {no:11,원료:'아나토',INCI:'Bixa Orellana Seed Extract',이론량:10,비율:0.84,실사용량:10},
       {no:12,원료:'나이아신아마이드',INCI:'Niacinamide',이론량:6,비율:0.50,실사용량:6},
     ]},
    {제품명:'에이브릴팜 미나리비누', 문서번호:'EF-MI-005', 제조번호:'APBG10004-N1354',
     date:'2025-11-13', 제조방법:'CP법', 투입량:1190, 이론수량:13, 실제수량:11,
     상태:'판매중', 바코드:'8739020413096', 목표중량:'90g ±5g', 실측중량:103,
     KCL:'SC25-00244K', KCL발행일:'2025-02-07', 내용량:'109', 유리알칼리:'검출 안 됨',
     알레르기:'리날룰, 리모넨', 이상:'이상없음',
     전성분:'올리브오일, 코코넛야자오일, 정제수, 오일팜오일, 소듐하이드록사이드, 마카다미아씨오일, 시어버터, 피마자씨오일, 향료, 세라마이드엔피, 살리실릭애씨드, 마데카소사이드, 미나리가루, 크로뮴옥사이드그린, 어성초가루, 클로렐라불가리스가루',
     레시피:[
       {no:1,원료:'올리브오일',INCI:'Olea Europaea Fruit Oil',이론량:296,비율:24.88,실사용량:296},
       {no:2,원료:'코코넛야자오일',INCI:'Cocos Nucifera Oil',이론량:264,비율:22.18,실사용량:264},
       {no:3,원료:'정제수',INCI:'Water (Aqua)',이론량:208,비율:17.50,실사용량:208},
       {no:4,원료:'오일팜오일',INCI:'Elaeis Guineensis Oil',이론량:120,비율:10.08,실사용량:120},
       {no:5,원료:'소듐하이드록사이드',INCI:'Sodium Hydroxide',이론량:123,비율:10.29,실사용량:123},
       {no:6,원료:'마카다미아씨오일',INCI:'Macadamia Integrifolia Seed Oil',이론량:40,비율:3.36,실사용량:40},
       {no:7,원료:'시어버터',INCI:'Butyrospermum Parkii Butter',이론량:40,비율:3.36,실사용량:40},
       {no:8,원료:'피마자씨오일',INCI:'Ricinus Communis Seed Oil',이론량:40,비율:3.36,실사용량:40},
       {no:9,원료:'향료(아르테/티트리 7:3)',INCI:'Fragrance (Parfum)',이론량:24,비율:2.02,실사용량:24},
       {no:10,원료:'세라마이드엔피',INCI:'Ceramide NP',이론량:12,비율:1.01,실사용량:12},
       {no:11,원료:'살리실릭애씨드',INCI:'Salicylic Acid',이론량:12,비율:1.01,실사용량:12},
       {no:12,원료:'마데카소사이드',INCI:'Madecassoside',이론량:6,비율:0.50,실사용량:6},
       {no:13,원료:'미나리가루',INCI:'Oenanthe Javanica Powder',이론량:3,비율:0.25,실사용량:3},
       {no:14,원료:'크로뮴옥사이드그린',INCI:'Chromium Oxide Greens (CI 77288)',이론량:2,비율:0.17,실사용량:2},
       {no:15,원료:'어성초가루',INCI:'Houttuynia Cordata Powder',이론량:1,비율:0.08,실사용량:1},
       {no:16,원료:'클로렐라불가리스가루',INCI:'Chlorella Vulgaris Powder',이론량:1,비율:0.08,실사용량:1},
     ]},
  ];
  for(const b of batches) await add('batches', b);

  const hygs = [
    {date:'2026-05-01',type:'청소점검',items:{원료보관:'청결',부자재:'청결',완제품:'청결',작업대:'청결',도구류:'청결',포장실:'청결'},확인자:'변민정',status:'완료'},
    {date:'2026-05-08',type:'청소점검',items:{원료보관:'청결',부자재:'청결',완제품:'청결',작업대:'청결',도구류:'청결',포장실:'청결'},확인자:'변민정',status:'완료'},
    {date:'2026-06-05',type:'청소점검',items:{원료보관:'청결',부자재:'청결',완제품:'청결',작업대:'청결',도구류:'청결',포장실:'청결'},확인자:'변민정',status:'완료'},
    {date:'2026-05-01',type:'방충방서',방충망:'양호',해충:'없음',설치류:'없음',조치:'',확인자:'변민정',status:'완료'},
    {date:'2026-06-05',type:'방충방서',방충망:'양호',해충:'없음',설치류:'없음',조치:'',확인자:'변민정',status:'완료'},
  ];
  for(const h of hygs) await add('hygiene', h);
}

window.DB = {openDB, getAll, getOne, add, put, remove, seedIfEmpty, exportAll, importAll, clearAll, calcCheckDigit};

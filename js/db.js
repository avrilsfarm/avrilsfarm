'use strict';
const DB_NAME = 'AvrilFarmDB', DB_VER = 11;
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
        barcodes:    [{n:'번호',k:'번호'}],
        fragrances:  [{n:'향료명',k:'향료명'}]
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

async function seedIfEmpty() { return; }


async function exportAll() {
  await openDB();
  const stores = ['products','ingredients','batches','hygiene','equipment','production','barcodes','fragrances'];
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
  const stores = ['products','ingredients','batches','hygiene','equipment','production','barcodes','fragrances'];
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
  const stores = ['products','ingredients','batches','hygiene','equipment','production','barcodes','fragrances'];
  for (const s of stores) {
    const st = _db.transaction(s,'readwrite').objectStore(s);
    await new Promise((res,rej) => { const r=st.clear(); r.onsuccess=res; r.onerror=rej; });
  }
  // localStorage 시험성적서·기준서 데이터도 함께 삭제
  const lsKeys = [];
  for (let i = 0; i < localStorage.length; i++) lsKeys.push(localStorage.key(i));
  lsKeys.filter(k => k.startsWith('trReport_') || k.startsWith('stdMeta_') || k.startsWith('stdSections_')).forEach(k => localStorage.removeItem(k));
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

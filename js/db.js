'use strict';
const DB_NAME = 'AvrilFarmDB', DB_VER = 8;
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
        production:  [{n:'date',k:'date'}],
        barcodes:    [{n:'번호',k:'번호'}]
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

function tx(name, mode='readonly') {
  return _db.transaction(name, mode).objectStore(name);
}

async function getAll(s) {
  await openDB();
  return new Promise((res, rej) => {
    const r = tx(s).getAll();
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function getOne(s, id) {
  await openDB();
  return new Promise((res, rej) => {
    const r = tx(s).get(id);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function add(s, data) {
  await openDB();
  data.createdAt = new Date().toISOString();
  return new Promise((res, rej) => {
    const r = tx(s, 'readwrite').add(data);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function put(s, data) {
  await openDB();
  data.updatedAt = new Date().toISOString();
  return new Promise((res, rej) => {
    const r = tx(s, 'readwrite').put(data);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function remove(s, id) {
  await openDB();
  return new Promise((res, rej) => {
    const r = tx(s, 'readwrite').delete(id);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function seedIfEmpty() {
  const ings = await getAll('ingredients');
  if (ings.length === 0) {
    const initialIngredients = [
      { 원료명: '올리브오일', 제조처: 'A사', 수량: '1kg', 입고일: '2026-05-01', category: '베이스오일', CoA: '수취', 판정: '적합', stockType: '원료' },
      { 원료명: '코코넛오일', 제조처: 'B사', 수량: '2kg', 입고일: '2026-05-10', category: '베이스오일', CoA: '미수취', 판정: '미기입', stockType: '원료' },
      { 원료명: '단상자(일반)', 제조처: 'C포장', 수량: '500개', 입고일: '2026-04-20', category: '단상자', CoA: '해당없음', 판정: '적합', stockType: '포장재' }
    ];
    for (const item of initialIngredients) await add('ingredients', item);
  }
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
    const st = _db.transaction(s,'readwrite').objectStore(s);
    await new Promise((res,rej) => { const r=st.clear(); r.onsuccess=res; r.onerror=rej; });
    
    if (data[s] && data[s].length) {
      for (const item of data[s]) {
        await new Promise((res,rej) => { const r=st.add(item); r.onsuccess=res; r.onerror=rej; });
      }
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

window.DB = { openDB, getAll, getOne, add, put, remove, seedIfEmpty, exportAll, importAll, clearAll };

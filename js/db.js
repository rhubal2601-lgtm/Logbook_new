'use strict';
// IndexedDB-Schicht. Alle Datensätze haben eine eindeutige id und (außer Profilen) eine profileId.
const DB={
  db:null,stores:['profiles','plans','workouts','drafts','food','body','machines'],
  open(){return new Promise((res,rej)=>{
    const r=indexedDB.open('logbook',2);
    r.onupgradeneeded=()=>DB.stores.forEach(s=>{if(!r.result.objectStoreNames.contains(s))r.result.createObjectStore(s,{keyPath:'id'})});
    r.onsuccess=()=>{DB.db=r.result;res()};r.onerror=()=>rej(r.error);
  })},
  req(q){return new Promise((res,rej)=>{q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})},
  all(s){return DB.req(DB.db.transaction(s).objectStore(s).getAll())},
  put(s,o){return DB.req(DB.db.transaction(s,'readwrite').objectStore(s).put(o))},
  del(s,id){return DB.req(DB.db.transaction(s,'readwrite').objectStore(s).delete(id))},
  // Atomar: bei einem Fehler bricht die ganze Transaktion ab und der alte Bestand bleibt unverändert.
  replaceAll(data){return new Promise((res,rej)=>{
    const t=DB.db.transaction(DB.stores,'readwrite');
    DB.stores.forEach(s=>{const o=t.objectStore(s);o.clear();(data[s]||[]).forEach(x=>o.put(x))});
    t.oncomplete=res;t.onerror=t.onabort=()=>rej(t.error||new Error('abgebrochen'));
  })}
};

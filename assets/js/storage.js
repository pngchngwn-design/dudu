/* ============ 存储层：学生 / 打卡 / 设置 / 资源(IndexedDB) ============ */
window.Store = (function () {
  const LS = window.localStorage;
  const KEY = "happyReaderV1";

  /* ---- localStorage 主数据 ---- */
  let db = load();
  function load() {
    try {
      const raw = LS.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { console.warn("存档损坏，重建", e); }
    return { students: [], records: {}, settings: { theme: "puppy", currentStudentId: null, customTexts: [] } };
  }
  function save() { LS.setItem(KEY, JSON.stringify(db)); }

  function uid() { return "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ---- 学生 ---- */
  function listStudents() { return db.students.slice(); }
  function addStudent(name) {
    name = (name || "").trim();
    if (!name) return { ok: false, msg: "请输入姓名" };
    if (db.students.some(function (s) { return s.name === name; })) return { ok: false, msg: "这个名字已经存在啦" };
    var s = { id: uid(), name: name, createdAt: Date.now() };
    db.students.push(s);
    if (!db.settings.currentStudentId) db.settings.currentStudentId = s.id;
    save();
    return { ok: true, student: s };
  }
  function removeStudent(id) {
    db.students = db.students.filter(function (s) { return s.id !== id; });
    delete db.records[id];
    if (db.settings.currentStudentId === id) {
      db.settings.currentStudentId = db.students.length ? db.students[0].id : null;
    }
    save();
  }
  function currentStudent() {
    var id = db.settings.currentStudentId;
    return db.students.find(function (s) { return s.id === id; }) || null;
  }
  function setCurrentStudent(id) { db.settings.currentStudentId = id; save(); }

  /* ---- 打卡记录 ---- */
  function addRecord(type, item, score) {
    var sid = db.settings.currentStudentId;
    if (!sid) return;
    if (!db.records[sid]) db.records[sid] = [];
    db.records[sid].push({
      ts: Date.now(),
      type: type,          // letter / word / sentence / custom / resource
      item: item,          // 学习内容
      score: score == null ? null : Math.round(score) // 0-100 或 null(纯点读)
    });
    save();
  }
  function getRecords(studentId) {
    return (db.records[studentId] || []).slice();
  }
  function todayCount(studentId) {
    var sid = studentId || db.settings.currentStudentId;
    if (!sid) return 0;
    var t = new Date(); t.setHours(0, 0, 0, 0);
    var t0 = t.getTime();
    return (db.records[sid] || []).filter(function (r) { return r.ts >= t0; }).length;
  }

  /* ---- 设置 / 进度 ---- */
  function getSettings() { return db.settings; }
  function setTheme(id) { db.settings.theme = id; save(); }
  function getCustomTexts() { return db.settings.customTexts.slice(); }
  function addCustomText(text) {
    if (!text || !text.trim()) return;
    db.settings.customTexts.unshift({ text: text.trim().slice(0, 500), ts: Date.now() });
    if (db.settings.customTexts.length > 20) db.settings.customTexts.length = 20;
    save();
  }
  function removeCustomText(ts) {
    db.settings.customTexts = db.settings.customTexts.filter(function (t) { return t.ts !== ts; });
    save();
  }

  /* ---- 备份：导出 / 导入 ---- */
  function exportAll() {
    var payload = {
      app: "快乐点读乐园", version: 1, exportedAt: new Date().toISOString(),
      data: db, resources: []
    };
    return new Promise(function (resolve) {
      Resources.all().then(function (list) {
        payload.resources = list;
        resolve(JSON.stringify(payload, null, 2));
      });
    });
  }
  function importAll(jsonStr) {
    var p;
    try { p = JSON.parse(jsonStr); } catch (e) { return { ok: false, msg: "文件格式不对" }; }
    if (!p || !p.data) return { ok: false, msg: "这不是快乐点读乐园的备份文件" };
    if (p.data.students) db.students = p.data.students;
    if (p.data.records) db.records = p.data.records;
    if (p.data.settings) {
      db.settings.customTexts = p.data.settings.customTexts || [];
      if (p.data.settings.theme) db.settings.theme = p.data.settings.theme;
    }
    save();
    if (p.resources && p.resources.length) {
      p.resources.forEach(function (r) { Resources.put(r); });
    }
    return { ok: true, count: db.students.length };
  }

  /* ---- IndexedDB：上传的图片 / 视频 / 链接资源 ---- */
  var Resources = (function () {
    var DB_NAME = "happyReaderRes", STORE = "resources", dbp = null;

    function open() {
      if (dbp) return dbp;
      dbp = new Promise(function (resolve, reject) {
        var req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = function () {
          if (!req.result.objectStoreNames.contains(STORE)) {
            req.result.createObjectStore(STORE, { keyPath: "id" });
          }
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
      return dbp;
    }
    function tx(mode) {
      return open().then(function (d) { return d.transaction(STORE, mode).objectStore(STORE); });
    }
    return {
      put: function (res) {
        return tx("readwrite").then(function (st) {
          return new Promise(function (resolve, reject) {
            var r = st.put(res);
            r.onsuccess = function () { resolve(res.id); };
            r.onerror = function () { reject(r.error); };
          });
        });
      },
      all: function () {
        return tx("readonly").then(function (st) {
          return new Promise(function (resolve, reject) {
            var r = st.getAll();
            r.onsuccess = function () { resolve(r.result || []); };
            r.onerror = function () { reject(r.error); };
          });
        }).catch(function () { return []; });
      },
      get: function (id) {
        return tx("readonly").then(function (st) {
          return new Promise(function (resolve, reject) {
            var r = st.get(id);
            r.onsuccess = function () { resolve(r.result); };
            r.onerror = function () { reject(r.error); };
          });
        });
      },
      del: function (id) {
        return tx("readwrite").then(function (st) {
          return new Promise(function (resolve) {
            var r = st.delete(id);
            r.onsuccess = function () { resolve(); };
            r.onerror = function () { resolve(); };
          });
        });
      }
    };
  })();

  return {
    listStudents: listStudents, addStudent: addStudent, removeStudent: removeStudent,
    currentStudent: currentStudent, setCurrentStudent: setCurrentStudent,
    addRecord: addRecord, getRecords: getRecords, todayCount: todayCount,
    getSettings: getSettings, setTheme: setTheme,
    getCustomTexts: getCustomTexts, addCustomText: addCustomText, removeCustomText: removeCustomText,
    exportAll: exportAll, importAll: importAll,
    Resources: Resources
  };
})();

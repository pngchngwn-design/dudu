/* ============ 视图渲染：点读台 / 单词库 / 句子 / 资源 / 主题 ============ */
window.Views = (function () {

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ================= 1. 点读台（26字母自然拼读表） ================= */
  function renderLetters() {
    var el = document.getElementById("view-letters");
    var rows = DATA.letters.map(function (L, idx) {
      var cls = L.vowel ? "vowel" : "";
      return '<tr class="row-letter" data-idx="' + idx + '">' +
        '<td class="col-idx">' + L.i + "</td>" +
        '<td class="col-letter ' + cls + '">' + L.L + "</td>" +
        '<td class="col-phon ' + cls + '">' + L.phon + "</td>" +
        '<td class="col-sound ' + cls + '">' + L.sound + "</td>" +
        '<td class="col-hint">' + L.hint + "</td>" +
        '<td class="col-act">' +
          '<button class="mini-btn say" onclick="Views.sayLetter(' + idx + ',event)">🔊 读</button>' +
          '<button class="mini-btn follow" onclick="Views.followLetter(' + idx + ',event)">🎤 跟读</button>' +
        "</td></tr>";
    }).join("");

    el.innerHTML =
      '<div class="card">' +
        '<div class="card-title"><h2>🏠 26个英文字母 · 自然拼读发音</h2>' +
        '<span class="sub">点行或按钮听标准读音，红字是元音</span></div>' +
        '<div style="margin-bottom:12px;display:flex;gap:10px;flex-wrap:wrap;">' +
          '<button class="btn" onclick="Views.followAllLetters()">🎤 连续跟读 26 个字母</button>' +
          '<button class="btn btn-ghost" onclick="Views.slowAllLetters()">🐢 慢速朗读全表</button>' +
        "</div>" +
        '<div style="overflow-x:auto;"><table class="letters-table">' +
          "<thead><tr><th>序号</th><th>字母</th><th>音标</th><th>拼读</th><th>谐音</th><th>操作</th></tr></thead>" +
          "<tbody>" + rows + "</tbody></table></div>" +
      "</div>";
    // 点行朗读
    el.querySelectorAll(".row-letter").forEach(function (tr) {
      tr.addEventListener("click", function () { sayLetter(+tr.dataset.idx); });
    });
  }

  function sayLetter(idx, ev) {
    if (ev) ev.stopPropagation();
    var L = DATA.letters[idx];
    var tr = document.querySelectorAll("#view-letters .row-letter")[idx];
    if (tr) { tr.classList.add("playing"); setTimeout(function () { tr.classList.remove("playing"); }, 1200); }
    Speech.speakLetter(L);
    Store.addRecord("letter", L.L, null);
    App.refreshToday();
  }

  function followLetter(idx, ev) {
    if (ev) ev.stopPropagation();
    var L = DATA.letters[idx];
    Speech.openRead({ text: L.L.charAt(0).toUpperCase(), zh: "字母 " + L.L + " " + L.phon, type: "letter" });
  }

  function followAllLetters() {
    var list = DATA.letters.map(function (L) {
      return { text: L.L.charAt(0).toUpperCase(), zh: "字母 " + L.L, type: "letter" };
    });
    Speech.openRead(list[0], list, 0);
  }

  function slowAllLetters() {
    var text = DATA.letters.map(function (L) { return L.L.charAt(0); }).join(", ");
    Speech.speak(text, true);
  }

  /* ================= 2. 单词库 ================= */
  var wordCat = null;
  function renderWords() {
    var el = document.getElementById("view-words");
    var cats = Object.keys(DATA.words);
    if (!wordCat || !DATA.words[wordCat]) wordCat = cats[0];
    var chips = cats.map(function (c) {
      return '<button class="chip' + (c === wordCat ? " active" : "") + '" onclick="Views.pickWordCat(\'' + c + "')\">" + c + "</button>";
    }).join("");

    var cards = DATA.words[wordCat].map(function (w, i) {
      return '<div class="word-card" onclick="Speech.speak(\'' + esc(w.w) + '\')">' +
        '<div class="w">' + esc(w.w) + "</div>" +
        '<div class="z">' + esc(w.z) + "</div>" +
        '<div class="bar">' +
          '<button class="mini-btn say" onclick="Views.sayWord(\'' + esc(w.w) + "',event)\">🔊</button>" +
          '<button class="mini-btn follow" onclick="Views.followWord(\'' + esc(w.w) + '\',\'' + esc(w.z) + '\',event)">🎤</button>' +
        "</div></div>";
    }).join("");

    var followAllBtn = '<button class="btn" onclick="Views.followAllWords()">🎤 连续跟读本组单词</button>';

    el.innerHTML =
      '<div class="card">' +
        '<div class="card-title"><h2>📚 单词点读库</h2><span class="sub">三年级必备词汇 · 点单词听读音</span></div>' +
        '<div class="chip-row">' + chips + "</div>" +
        '<div style="margin-bottom:12px;">' + followAllBtn + "</div>" +
        '<div class="word-grid">' + cards + "</div>" +
      "</div>";
  }
  function pickWordCat(c) { wordCat = c; renderWords(); }
  function sayWord(w, ev) {
    if (ev) ev.stopPropagation();
    Speech.speak(w);
    Store.addRecord("word", w, null);
    App.refreshToday();
  }
  function followWord(w, z, ev) {
    if (ev) ev.stopPropagation();
    Speech.openRead({ text: w, zh: z, type: "word" });
  }
  function followAllWords() {
    var list = DATA.words[wordCat].map(function (w) {
      return { text: w.w, zh: w.z, type: "word" };
    });
    Speech.openRead(list[0], list, 0);
  }

  /* ================= 3. 句子 + 自编点读 ================= */
  function renderReader() {
    var el = document.getElementById("view-reader");
    var saved = Store.getCustomTexts().map(function (t, i) {
      return '<div class="sentence-item"><span class="s" style="min-width:150px;flex:1;">' + esc(t.text.slice(0, 60)) + "</span>" +
        '<button class="mini-btn say" onclick="Speech.speak(\'' + escJs(t.text).slice(0, 200) + '\')">🔊 读</button>' +
        '<button class="mini-btn del" style="background:linear-gradient(135deg,#ef5350,#c62828)" onclick="Views.delCustom(' + t.ts + ',event)">🗑</button></div>';
    }).join("") || '<p style="color:#bbb;text-align:center;">还没有保存的句子，在上方输入试试吧！</p>';

    var sents = DATA.sentences.map(function (it) {
      return '<div class="sentence-item">' +
        '<span class="s" onclick="Speech.speak(\'' + escJs(it.s) + '\')">' + esc(it.s) + "</span>" +
        '<span class="z">' + esc(it.z) + "</span>" +
        '<button class="mini-btn say" onclick="Views.saySentence(\'' + escJs(it.s) + '\',event)">🔊 读</button>' +
        '<button class="mini-btn follow" onclick="Views.followSentence(' + JSON.stringify(JSON.stringify(it)) + ')">🎤 跟读</button>' +
        "</div>";
    }).join("");

    el.innerHTML =
      '<div class="card reader-editor">' +
        '<div class="card-title"><h2>✏️ 我的小课文</h2><span class="sub">把课本句子打进来，想读什么点什么</span></div>' +
        '<textarea id="customText" placeholder="在这里输入任意英文句子或课文，例如：I like my school."></textarea>' +
        '<div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;">' +
          '<button class="btn" onclick="Views.speakCustom()">🔊 朗读全文</button>' +
          '<button class="btn btn-primary" onclick="Views.saveCustom()">💾 保存</button>' +
          '<button class="btn btn-mic" onclick="Views.followCustom()">🎤 逐句跟读</button>' +
        "</div>" +
        '<h3 style="margin:18px 0 8px;color:#8a7a5c;font-size:15px;">⭐ 我保存的句子</h3>' +
        '<div class="sentence-list">' + saved + "</div>" +
      "</div>" +
      '<div class="card">' +
        '<div class="card-title"><h2>📖 三年级常用句子</h2><span class="sub">点句子听读音，🎤 开口跟读打分</span></div>' +
        '<div class="sentence-list">' + sents + "</div>" +
      "</div>";
  }

  function speakCustom() {
    var v = document.getElementById("customText").value.trim();
    if (!v) { App.toast("先输入一些英文句子吧"); return; }
    Speech.speak(v);
    Store.addRecord("custom", v.slice(0, 40), null);
    App.refreshToday();
  }
  function saveCustom() {
    var v = document.getElementById("customText").value.trim();
    if (!v) { App.toast("先输入一些英文句子吧"); return; }
    Store.addCustomText(v);
    renderReader();
    App.toast("已保存到「我的小课文」");
  }
  function followCustom() {
    var v = document.getElementById("customText").value.trim();
    if (!v) { App.toast("先输入一些英文句子吧"); return; }
    var parts = v.split(/[.!?;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!parts.length) { App.toast("没找到可以跟读的句子"); return; }
    var list = parts.map(function (p) { return { text: p, type: "custom" }; });
    Speech.openRead(list[0], list, 0);
  }
  function delCustom(ts, ev) { if (ev) ev.stopPropagation(); Store.removeCustomText(ts); renderReader(); }
  function saySentence(s, ev) {
    if (ev) ev.stopPropagation();
    Speech.speak(s);
    Store.addRecord("sentence", s.slice(0, 40), null);
    App.refreshToday();
  }
  function followSentence(it) {
    try { it = JSON.parse(it); } catch (e) {}
    Speech.openRead({ text: it.s, zh: it.z, type: "sentence" });
  }

  /* ================= 4. 我的资源（上传/链接/优化） ================= */
  var filterKind = "all";
  function renderResources() {
    var el = document.getElementById("view-resources");
    el.innerHTML =
      '<div class="card">' +
        '<div class="card-title"><h2>📁 我的资源库</h2><span class="sub">上传图片/视频/链接，变成专属学习卡片</span></div>' +
        '<div class="upload-zone" id="uploadZone" onclick="document.getElementById(\'fileInput\').click()">' +
          '<div class="big">📤</div>' +
          "<p style='margin:6px 0 2px;font-weight:bold;color:#7a6a4c;font-size:16px;'>点击上传图片或视频</p>" +
          "<p style='margin:0;font-size:13px;'>图片会自动压缩优化，支持 jpg / png / gif / mp4 等</p>" +
        "</div>" +
        '<input type="file" id="fileInput" accept="image/*,video/*" multiple style="display:none" onchange="Views.handleFiles(this.files)">' +
        '<div class="link-row">' +
          '<input type="text" id="linkInput" placeholder="粘贴任意网站链接，如学习视频网页…" onkeydown="if(event.key===\'Enter\')Views.addLink()">' +
          '<button class="btn" onclick="Views.addLink()">🔗 添加链接</button>' +
        "</div>" +
      "</div>" +
      '<div class="card">' +
        '<div class="card-title"><h2>🎒 我的学习卡片</h2>' +
        '<div class="chip-row" style="margin:0;">' +
          ["all", "image", "video", "link"].map(function (k) {
            var name = { all: "全部", image: "图片", video: "视频", link: "链接" }[k];
            return '<button class="chip' + (filterKind === k ? " active" : "") + '" style="padding:6px 14px;min-height:36px;" onclick="Views.filterRes(\'' + k + "')\">" + name + "</button>";
          }).join("") +
        "</div></div>" +
        '<div class="resource-grid" id="resGrid"><p style="color:#bbb;grid-column:1/-1;text-align:center;">还没有资源，先上传一张图片或添加一个链接吧！</p></div>' +
      "</div>";
    loadResources();
  }

  function filterRes(k) { filterKind = k; renderResources(); }

  function loadResources() {
    Store.Resources.all().then(function (list) {
      list.sort(function (a, b) { return b.createdAt - a.createdAt; });
      if (filterKind !== "all") list = list.filter(function (r) { return r.kind === filterKind; });
      var grid = document.getElementById("resGrid");
      if (!grid) return;
      if (!list.length) {
        grid.innerHTML = '<p style="color:#bbb;grid-column:1/-1;text-align:center;">这个分类下还没有资源哦</p>';
        return;
      }
      grid.innerHTML = list.map(function (r) { return resCard(r); }).join("");
    });
  }

  function resCard(r) {
    var thumb;
    if (r.kind === "image") {
      thumb = '<img src="' + r.thumb + '" alt="" style="width:100%;height:100%;object-fit:cover;" loading="lazy">';
    } else if (r.kind === "video") {
      thumb = '<video src="' + r.url + '" muted preload="metadata"></video>';
    } else {
      thumb = "🔗";
    }
    var typeName = { image: "图片", video: "视频", link: "链接" }[r.kind];
    return '<div class="res-card" data-id="' + r.id + '">' +
      '<div class="thumb" onclick="Views.openRes(\'' + r.id + '\')">' + thumb +
        '<span class="tag" style="position:absolute;top:8px;left:8px;">' + typeName + "</span></div>" +
      '<div class="body">' +
        '<div class="t">' + esc(r.title || "未命名") + "</div>" +
        '<div class="meta">' + new Date(r.createdAt).toLocaleDateString() +
          (r.text ? " · 已挂点读文本" : "") + "</div>" +
        '<div class="text-edit-row">' +
          '<input type="text" placeholder="挂接点读文本（可选）" value="' + esc(r.text || "") + '" onchange="Views.setResText(\'' + r.id + "', this.value)\">" +
        "</div>" +
        '<div class="ops">' +
          '<button class="mini-btn say" onclick="Views.playRes(\'' + r.id + '\')">🔊 点读</button>' +
          '<button class="mini-btn follow" onclick="Views.followRes(\'' + r.id + '\')">🎤 跟读</button>' +
          '<button class="mini-btn del" onclick="Views.delRes(\'' + r.id + '\')">🗑</button>' +
        "</div>" +
      "</div></div>";
  }

  /* 图片压缩优化 */
  function optimizeImage(file) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var MAX = 1280;
          var scale = Math.min(1, MAX / Math.max(img.width, img.height));
          var cv = document.createElement("canvas");
          cv.width = Math.round(img.width * scale);
          cv.height = Math.round(img.height * scale);
          cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
          var dataUrl = cv.toDataURL("image/jpeg", 0.82);
          // 小缩略图
          var th = document.createElement("canvas");
          var ts = Math.min(1, 400 / Math.max(img.width, img.height));
          th.width = Math.round(img.width * ts); th.height = Math.round(img.height * ts);
          th.getContext("2d").drawImage(img, 0, 0, th.width, th.height);
          resolve({
            dataUrl: dataUrl, thumb: th.toDataURL("image/jpeg", 0.7),
            before: file.size, after: Math.round(dataUrl.length * 0.75)
          });
        };
        img.onerror = function () { resolve(null); };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function handleFiles(files) {
    if (!files || !files.length) return;
    Array.prototype.forEach.call(files, function (f) {
      if (f.type.indexOf("image/") === 0) {
        optimizeImage(f).then(function (res) {
          if (!res) { App.toast("这张图片读不出来：" + f.name); return; }
          Store.Resources.put({
            id: "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            kind: "image", title: f.name.replace(/\.[^.]+$/, ""),
            url: res.dataUrl, thumb: res.thumb, text: "",
            createdAt: Date.now()
          }).then(function () {
            loadResources();
            var pct = Math.round((1 - res.after / res.before) * 100);
            App.toast("图片已优化保存" + (pct > 0 ? "，体积减小 " + pct + "%" : ""));
          });
        });
      } else if (f.type.indexOf("video/") === 0) {
        if (f.size > 200 * 1024 * 1024) { App.toast("视频太大了（超过200MB），建议上传小片段"); return; }
        var reader = new FileReader();
        reader.onload = function () {
          Store.Resources.put({
            id: "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            kind: "video", title: f.name.replace(/\.[^.]+$/, ""),
            url: reader.result, text: "", createdAt: Date.now()
          }).then(function () { loadResources(); App.toast("视频已保存"); });
        };
        reader.readAsDataURL(f);
      } else {
        App.toast("这个文件类型不支持，只能上传图片或视频哦");
      }
    });
    document.getElementById("fileInput").value = "";
  }

  function addLink() {
    var inp = document.getElementById("linkInput");
    var url = (inp.value || "").trim();
    if (!url) { App.toast("先粘贴一个链接"); return; }
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    var title = "链接 · " + url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0].slice(0, 30);
    Store.Resources.put({
      id: "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      kind: "link", title: title, url: url, text: "", createdAt: Date.now()
    }).then(function () {
      inp.value = "";
      loadResources();
      App.toast("链接已保存到资源库");
    });
  }

  function openRes(id) {
    Store.Resources.get(id).then(function (r) {
      if (!r) return;
      if (r.kind === "link") { window.open(r.url, "_blank", "noopener"); return; }
      if (r.kind === "video") {
        var w = window.open("", "_blank");
        if (w) { w.document.write('<video src="' + r.url + '" controls autoplay style="width:100%;height:100%;background:#000"></video>'); }
        return;
      }
      // 图片：弹窗大图
      var w = window.open("", "_blank");
      if (w) w.document.write('<img src="' + r.url + '" style="max-width:100%">');
    });
  }

  function setResText(id, text) {
    Store.Resources.get(id).then(function (r) {
      if (!r) return;
      r.text = (text || "").trim().slice(0, 300);
      Store.Resources.put(r).then(function () { App.toast(r.text ? "已挂接点读文本" : "已清空文本"); });
    });
  }

  function playRes(id) {
    Store.Resources.get(id).then(function (r) {
      if (!r) return;
      if (!r.text) {
        if (r.kind === "link") { openRes(id); App.toast("先在卡片里挂接一段英文，就能点读啦"); return; }
        App.toast("先在卡片里输入要读的英文，再点「点读」");
        return;
      }
      Speech.speak(r.text);
      Store.addRecord("resource", r.title.slice(0, 30), null);
      App.refreshToday();
    });
  }

  function followRes(id) {
    Store.Resources.get(id).then(function (r) {
      if (!r) return;
      if (!r.text) { App.toast("先在卡片里输入要跟读的英文"); return; }
      Speech.openRead({ text: r.text, zh: r.title, type: "resource" });
    });
  }

  function delRes(id) {
    if (!confirm("确定删除这个资源吗？")) return;
    Store.Resources.del(id).then(function () { loadResources(); App.toast("已删除"); });
  }

  /* ================= 5. 主题选择 ================= */
  function renderThemes() {
    var el = document.getElementById("view-themes");
    var cur = Store.getSettings().theme;
    el.innerHTML =
      '<div class="card">' +
        '<div class="card-title"><h2>🎨 我的专属背景</h2><span class="sub">点一下换上新衣服，学习心情更好！</span></div>' +
        '<div class="theme-grid">' +
        DATA.themes.map(function (t) {
          return '<div class="theme-card' + (t.id === cur ? " active" : "") + '" onclick="App.setTheme(\'' + t.id + "')\">" +
            '<div class="bg" style="background-image:url(\'' + t.img + '\')"></div>' +
            '<div class="name">' + t.name + (t.id === cur ? '<span class="badge">使用中</span>' : "") + "</div>" +
            "</div>";
        }).join("") +
        "</div></div>";
  }

  /* JS 字符串安全转义（嵌入 onclick 属性） */
  function escJs(s) { return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\n/g, " "); }

  return {
    renderLetters: renderLetters, renderWords: renderWords, renderReader: renderReader,
    renderResources: renderResources, renderThemes: renderThemes,
    sayLetter: sayLetter, followLetter: followLetter, followAllLetters: followAllLetters, slowAllLetters: slowAllLetters,
    pickWordCat: pickWordCat, sayWord: sayWord, followWord: followWord, followAllWords: followAllWords,
    speakCustom: speakCustom, saveCustom: saveCustom, followCustom: followCustom, delCustom: delCustom,
    saySentence: saySentence, followSentence: followSentence,
    handleFiles: handleFiles, addLink: addLink, openRes: openRes, setResText: setResText,
    playRes: playRes, followRes: followRes, delRes: delRes, filterRes: filterRes
  };
})();

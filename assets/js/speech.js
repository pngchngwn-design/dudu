/* ============ 语音核心：标准读音(TTS) + 跟读识别 + 评分纠正 ============ */
window.Speech = (function () {
  var synth = window.speechSynthesis;
  var recog = null;
  var target = null;        // 当前跟读目标 {text, zh}
  var queue = null;         // 连续跟读队列 {list, index, makeTarget}
  var listening = false;

  /* ---------- 标准读音 ---------- */
  function pickVoice() {
    var voices = synth ? synth.getVoices() : [];
    // 优先美式/英式英语女声（更适合跟读），其次任意英语
    var prefs = [
      function (v) { return /en[-_]US/i.test(v.lang) && /female|zira|aria|jenny|samantha|susan|linda|heather/i.test(v.name); },
      function (v) { return /en[-_]GB/i.test(v.lang) && /female|libby|sonia|hazel|kate|emma/i.test(v.name); },
      function (v) { return /en[-_]US/i.test(v.lang); },
      function (v) { return /^en/i.test(v.lang); }
    ];
    for (var i = 0; i < prefs.length; i++) {
      for (var j = 0; j < voices.length; j++) {
        if (prefs[i](voices[j])) return voices[j];
      }
    }
    return null;
  }
  var cachedVoice = null;
  function bestVoice() {
    if (cachedVoice) return cachedVoice;
    cachedVoice = pickVoice();
    return cachedVoice;
  }
  if (synth) {
    synth.onvoiceschanged = function () { cachedVoice = null; bestVoice(); };
    bestVoice();
  }

  /* text: 要读的英文; slow: 慢速模式 */
  function speak(text, slow, onend) {
    if (!synth) { App.toast("这个浏览器不支持朗读，请用 Edge 或 Chrome 打开"); if (onend) onend(); return; }
    try { synth.cancel(); } catch (e) {}
    var u = new SpeechSynthesisUtterance(text);
    var v = bestVoice();
    if (v) u.voice = v;
    u.lang = (v && v.lang) || "en-US";
    u.rate = slow ? 0.55 : 0.85;
    u.pitch = 1.05;
    if (onend) {
      u.onend = onend;
      u.onerror = onend;
    }
    synth.speak(u);
  }

  /* 播放字母：先读字母名，再读拼读音（A -> [æ]） */
  function speakLetter(letter) {
    var text = letter.L + ". " + letter.L.charAt(0) + "."; // "Aa. a."
    speak(text, false);
  }

  /* ---------- 跟读识别 ---------- */
  function getRecognition() {
    if (recog) return recog;
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    recog = new SR();
    recog.lang = "en-US";
    recog.interimResults = false;
    recog.maxAlternatives = 3;
    recog.continuous = false;
    return recog;
  }

  function supported() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }

  /* 打开跟读弹层。item: {text, zh, type, queueList, queueIndex} */
  function openRead(item, list, index) {
    target = { text: item.text, zh: item.zh || "", type: item.type || "letter", item: item };
    queue = list ? { list: list, index: index || 0 } : null;

    var el = document.getElementById("readModal");
    document.getElementById("readTarget").innerHTML = escapeHtml(target.text) +
      (target.zh ? '<span class="zh">' + escapeHtml(target.zh) + "</span>" : "");
    document.getElementById("readTip").textContent = "先听标准读音，再点麦克风跟读吧！";
    document.getElementById("readResult").hidden = true;
    document.getElementById("readNext").hidden = true;
    document.getElementById("readAnim").classList.remove("listening");
    document.getElementById("btnMic").disabled = false;
    el.hidden = false;
    // 自动先读一遍
    setTimeout(function () { speak(target.text); }, 300);
  }

  function closeRead() {
    try { if (recog) recog.abort(); } catch (e) {}
    listening = false;
    try { synth.cancel(); } catch (e) {}
    document.getElementById("readModal").hidden = true;
    document.getElementById("btnMic").disabled = false;
  }

  function replayTarget() { speak(target.text); }

  function startRead() {
    if (!target) return;
    if (!supported()) {
      showResult({ score: -1, msg: "当前浏览器不支持语音识别。请用电脑版 Edge 或 Chrome 浏览器打开本站，对准麦克风跟读即可自动评分。" });
      return;
    }
    if (listening) { try { recog.abort(); } catch (e) {} listening = false; }
    var r = getRecognition();
    var animEl = document.getElementById("readAnim");
    var tipEl = document.getElementById("readTip");
    var micBtn = document.getElementById("btnMic");

    listening = true;
    animEl.classList.add("listening");
    tipEl.textContent = "🎤 正在听你读……大声一点哦！";
    micBtn.disabled = true;
    try { synth.cancel(); } catch (e) {}

    var timer = setTimeout(function () { // 12 秒没声音自动放弃
      try { r.abort(); } catch (e) {}
    }, 12000);

    r.onresult = function (ev) {
      clearTimeout(timer);
      var alts = [];
      for (var i = 0; i < ev.results[0].length; i++) alts.push(ev.results[0][i].transcript);
      var best = alts[0] || "";
      var score = scoreUtterance(target.text, alts);
      finish(best, score, alts);
    };
    r.onerror = function (ev) {
      clearTimeout(timer);
      listening = false;
      animEl.classList.remove("listening");
      micBtn.disabled = false;
      var m = { "not-allowed": "麦克风没开哦！请在浏览器地址栏允许使用麦克风", "no-speech": "没有听到声音，再试一次吧", "audio-capture": "找不到麦克风，请检查设备", network: "网络不稳定，再试一次吧" };
      tipEl.textContent = m[ev.error] || ("识别出错了：" + ev.error + "，再试一次吧");
    };
    r.onend = function () {
      clearTimeout(timer);
      listening = false;
      animEl.classList.remove("listening");
      micBtn.disabled = false;
    };
    try { r.start(); } catch (e) {
      listening = false; animEl.classList.remove("listening"); micBtn.disabled = false;
    }

    function finish(heard, res, alts) {
      listening = false;
      animEl.classList.remove("listening");
      micBtn.disabled = false;
      showResult(res, heard, alts);
      // 记录打卡
      if (res.score >= 0) {
        Store.addRecord(target.type, target.text, res.score);
        if (res.score >= 80) App.reward(heard);
        App.refreshToday();
        if (queue) { document.getElementById("readNext").hidden = false; }
      }
    }
  }

  /* ---------- 评分算法 ---------- */
  function normalize(s) {
    return (s || "").toLowerCase()
      .replace(/[^a-z0-9\s']/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function words(s) { return normalize(s).split(" ").filter(Boolean); }

  /* 编辑距离 */
  function editDistance(a, b) {
    var m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    var prev = new Array(n + 1), cur = new Array(n + 1), i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur[0] = i;
      for (j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      var t = prev; prev = cur; cur = t;
    }
    return prev[n];
  }

  /* 综合评分：字符级 + 单词级，取候选中最高的 */
  function scoreUtterance(targetText, alts) {
    var tNorm = normalize(targetText);
    var best = -1, bestAlt = "";
    for (var i = 0; i < alts.length; i++) {
      var a = normalize(alts[i]);
      if (!a) continue;
      // 字符级
      var cd = editDistance(tNorm, a);
      var charScore = Math.max(0, 1 - cd / Math.max(tNorm.length, a.length)) * 100;
      // 单词级
      var tw = words(targetText), aw = words(alts[i]);
      var hit = 0;
      tw.forEach(function (w) { if (aw.indexOf(w) >= 0) hit++; });
      var wordScore = tw.length ? (hit / tw.length) * 100 : charScore;
      var sc = Math.round(charScore * 0.55 + wordScore * 0.45);
      if (sc > best) { best = sc; bestAlt = a; }
    }
    return { score: best, alt: bestAlt };
  }

  /* ---------- 结果展示 + 纠正提示 ---------- */
  function showResult(res, heard, alts) {
    var box = document.getElementById("readResult");
    var tip = document.getElementById("readTip");
    var targetText = target ? target.text : "";
    if (res.score < 0 && res.msg) { // 不支持等场景
      box.hidden = false;
      box.innerHTML = '<div class="fix">' + escapeHtml(res.msg) + "</div>";
      tip.textContent = "";
      return;
    }
    var score = res.score;
    var stars, msg, cls;
    if (score >= 85)      { stars = "⭐⭐⭐"; msg = "太棒了！发音非常标准！"; cls = "good"; }
    else if (score >= 65) { stars = "⭐⭐";   msg = "读得不错！再听一遍会更完美！"; cls = "good"; }
    else if (score >= 40) { stars = "⭐";     msg = "有点接近了，跟着标准读音再读一次！"; cls = "fix"; }
    else                  { stars = "🌟";    msg = "别灰心！先慢慢跟读两遍标准读音，再试试！"; cls = "fix"; }

    // 纠错建议：找出没读准的单词
    var fixTips = "";
    if (score < 85) {
      var tw = words(targetText), aw = words(heard || "");
      var missed = tw.filter(function (w) { return aw.indexOf(w) < 0; });
      if (missed.length) {
        fixTips = '<div class="fix">💪 这' + (missed.length > 1 ? "几个" : "个") + "单词再练练：<b>" +
          escapeHtml(missed.join("、")) + "</b>&nbsp;试试点击下方【慢速听读音】</div>";
      }
    } else {
      fixTips = '<div class="good">🏆 ' + msg + "</div>";
    }

    box.hidden = false;
    box.innerHTML =
      '<div class="stars">' + stars + '</div>' +
      '<div style="font-size:15px;color:#666;">得分：<b style="color:' + (score >= 65 ? "#2e7d32" : "#c62828") + ';font-size:22px;">' + score + "</b> / 100</div>" +
      '<div class="heard">你读的是：' + escapeHtml(heard || "（没听清）") + "</div>" +
      fixTips;
    tip.textContent = msg;

    // 慢速重听按钮
    if (score < 85) {
      var btns = document.getElementById("readBtnsSlow");
      if (!btns) {
        var wrap = document.createElement("div");
        wrap.className = "read-btns"; wrap.id = "readBtnsSlow";
        wrap.innerHTML = '<button class="btn btn-ghost" onclick="Speech.speakSlow()">🐢 慢速听读音</button>';
        document.querySelector(".read-btns").appendChild(wrap);
        wrap.style.width = "100%";
      }
    }
  }

  function speakSlow() { speak(target.text, true); }

  /* 连续跟读：下一个 */
  function readNext() {
    if (!queue) return;
    queue.index++;
    if (queue.index >= queue.list.length) {
      document.getElementById("readTip").textContent = "🎉 全部读完啦！你真厉害！";
      document.getElementById("readNext").hidden = true;
      App.reward("全对");
      return;
    }
    var it = queue.list[queue.index];
    openRead(it, queue.list, queue.index);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  return {
    speak: speak, speakLetter: speakLetter, speakSlow: speakSlow,
    openRead: openRead, closeRead: closeRead, startRead: startRead,
    replayTarget: replayTarget, readNext: readNext, supported: supported
  };
})();

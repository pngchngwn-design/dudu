/* ============ 语音核心：标准读音 + 跟读 + 评分纠正 ============
   兼容策略：
   1. 朗读：电脑端优先 Web Speech API；手机/平板/微信内置等自动切换
      【在线 MP3 发音】兜底（有道短词 + 百度长句，任何浏览器有网即可读）。
   2. 跟读评分：
      - 桌面 Chrome/Edge：语音识别自动打分；
      - 手机/苹果/微信内置/不支持识别或网络失败：切换【录音跟读】模式——
        听标准音 → 录下孩子朗读 → 自动回放对比 → 孩子自评打分 → 照常打卡。
   3. 无网或接口异常给出友好提示，不影响其他功能。
*/
window.Speech = (function () {
  var synth = window.speechSynthesis;
  var recog = null;
  var target = null;        // 当前跟读目标 {text, zh}
  var queue = null;         // 连续跟读队列 {list, index}
  var listening = false;
  var curAudio = null;      // 当前播放的 MP3

  // 录音状态
  var recorder = null;
  var recStream = null;
  var recChunks = [];
  var recUrl = null;
  var recState = "idle";    // idle | recording | done

  /* ---------- 设备 / 能力检测 ---------- */
  function isMobile() {
    var ua = navigator.userAgent || "";
    return /Mobi|Android|iPhone|iPad|iPod|Quark|MicroMessenger|UCBrowser|Baidu/.test(ua);
  }
  function synthUsable() {
    if (!synth) return false;
    try {
      var vs = synth.getVoices();
      if (!vs || !vs.length) return false;
      return vs.some(function (v) { return /^en/i.test(v.lang); });
    } catch (e) { return false; }
  }
  function supported() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
  function canRecord() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  }

  /* ---------- 在线 MP3 发音兜底 ---------- */
  function ttsUrl(text, slow) {
    var t = encodeURIComponent(String(text).trim().slice(0, 400));
    if (text.trim().indexOf(" ") < 0) return "https://dict.youdao.com/dictvoice?audio=" + t + "&type=2";
    return "https://fanyi.baidu.com/gettts?lan=en&text=" + t + "&spd=" + (slow ? 3 : 4) + "&source=web";
  }
  function playMp3(url, onend) {
    stopAudio();
    var a = new Audio(url);
    curAudio = a;
    a.preload = "auto";
    var ended = false;
    var finish = function () { if (!ended) { ended = true; if (onend) onend(); } };
    a.onended = finish;
    a.onerror = function () { finish(); App.toast("语音加载失败，请检查网络后重试"); };
    var p = a.play();
    if (p && p.catch) p.catch(function () { finish(); });
    setTimeout(function () { if (curAudio === a) finish(); }, 15000);
  }
  function stopAudio() {
    if (curAudio) { try { curAudio.pause(); } catch (e) {} curAudio = null; }
  }

  /* ---------- 标准读音（统一入口） ---------- */
  function speak(text, slow, onend) {
    var done = onend || function () {};
    try { synth && synth.cancel(); } catch (e) {}
    stopAudio();
    if (!text || !String(text).trim()) { done(); return; }
    if (isMobile() || !synthUsable()) {
      playMp3(ttsUrl(text, slow), done);
      return;
    }
    var spoken = false;
    var guard = setTimeout(function () {
      if (!spoken) { spoken = true; playMp3(ttsUrl(text, slow), done); }
    }, 3000);
    try {
      var u = new SpeechSynthesisUtterance(text);
      var v = bestVoice();
      if (v) u.voice = v;
      u.lang = (v && v.lang) || "en-US";
      u.rate = slow ? 0.55 : 0.85;
      u.pitch = 1.05;
      u.onend = function () { if (!spoken) { spoken = true; clearTimeout(guard); done(); } };
      u.onerror = function () { if (!spoken) { spoken = true; clearTimeout(guard); playMp3(ttsUrl(text, slow), done); } };
      synth.speak(u);
    } catch (e) {
      if (!spoken) { spoken = true; clearTimeout(guard); playMp3(ttsUrl(text, slow), done); }
    }
  }

  function pickVoice() {
    var voices = synth ? synth.getVoices() : [];
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

  function speakLetter(letter) {
    speak(letter.L.charAt(0).toUpperCase(), false);
  }

  /* ---------- 跟读识别（桌面） ---------- */
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

  /* ---------- 打开跟读弹层 ---------- */
  function openRead(item, list, index) {
    target = { text: item.text, zh: item.zh || "", type: item.type || "letter" };
    queue = list ? { list: list, index: index || 0 } : null;

    var el = document.getElementById("readModal");
    document.getElementById("readTarget").innerHTML = escapeHtml(target.text) +
      (target.zh ? '<span class="zh">' + escapeHtml(target.zh) + "</span>" : "");
    document.getElementById("readTip").textContent = "先听标准读音，再点麦克风跟读吧！";
    document.getElementById("readResult").hidden = true;
    document.getElementById("readNext").hidden = true;
    document.getElementById("readAnim").classList.remove("listening");
    document.getElementById("selfAssess").hidden = true;
    var micBtn = document.getElementById("btnMic");
    micBtn.disabled = false;
    micBtn.textContent = "🎤 跟读";
    micBtn.onclick = startRead;
    resetRecordState();
    el.hidden = false;

    // 手机/不支持识别的设备 → 录音跟读模式
    if (!supported() || isMobile()) {
      enterRecordMode("先听标准读音，然后点「跟读」录下你的朗读吧！");
    } else {
      micBtn.onclick = startRead;
    }
    try { speak(target.text); } catch (e) {}
  }

  function closeRead() {
    try { if (recog) recog.abort(); } catch (e) {}
    listening = false;
    try { synth.cancel(); } catch (e) {}
    stopAudio();
    stopRecordStream();
    document.getElementById("readModal").hidden = true;
    document.getElementById("btnMic").disabled = false;
    document.getElementById("selfAssess").hidden = true;
  }

  function replayTarget() { speak(target.text); }

  /* ================= 录音跟读模式（手机/平板等） ================= */
  function resetRecordState() {
    recState = "idle";
    recUrl = null;
    recChunks = [];
    stopRecordStream();
  }

  function stopRecordStream() {
    if (recStream) {
      try { recStream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      recStream = null;
    }
    recorder = null;
  }

  function enterRecordMode(tipText) {
    var tip = document.getElementById("readTip");
    if (tipText) tip.textContent = tipText;
    var micBtn = document.getElementById("btnMic");
    micBtn.textContent = "🎤 跟读";
    micBtn.onclick = startRecordFlow;
    micBtn.disabled = false;
    // 隐藏自评，录音完成后再显示
    document.getElementById("selfAssess").hidden = true;
    document.getElementById("recordReplayBtn").hidden = true;
    document.getElementById("readAnim").classList.remove("listening");
  }

  function startRecordFlow() {
    if (!canRecord()) {
      // 不支持录音 → 纯自评
      showSelfButtons("这台设备不支持录音，请听标准音后自己评价吧：");
      return;
    }
    if (recState === "recording") { stopRecordFlow(); return; }
    var tip = document.getElementById("readTip");
    var animEl = document.getElementById("readAnim");
    var micBtn = document.getElementById("btnMic");
    stopAudio();
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      recStream = stream;
      try { recog && recog.abort(); } catch (e) {}
      recChunks = [];
      try {
        recorder = new MediaRecorder(stream);
      } catch (e) {
        stopRecordStream();
        showSelfButtons("无法启动录音，请听标准音后自己评价吧：");
        return;
      }
      recorder.ondataavailable = function (e) { if (e.data && e.data.size) recChunks.push(e.data); };
      recorder.onstop = function () {
        var mime = (recorder && recorder.mimeType) || "audio/webm";
        var blob = new Blob(recChunks, { type: mime });
        if (recUrl) { try { URL.revokeObjectURL(recUrl); } catch (e) {} }
        recUrl = URL.createObjectURL(blob);
        recState = "done";
        stopRecordStream();
        afterRecorded();
      };
      recorder.start();
      recState = "recording";
      tip.textContent = "🔴 正在录音……大声朗读，读完点「停止」";
      micBtn.textContent = "⏹ 停止跟读";
      animEl.classList.add("listening");
    }).catch(function () {
      showSelfButtons("没有拿到麦克风权限，请听标准音后自己评价吧：");
    });
  }

  function stopRecordFlow() {
    if (recorder && recorder.state === "recording") {
      try { recorder.stop(); } catch (e) {}
    }
  }

  function afterRecorded() {
    var animEl = document.getElementById("readAnim");
    var micBtn = document.getElementById("btnMic");
    animEl.classList.remove("listening");
    micBtn.textContent = "🔁 再读一次";
    // 自动回放孩子的录音
    var tip = document.getElementById("readTip");
    tip.textContent = "🎧 听听你刚才的录音（已自动播放），再对照标准音点「听读音」！";
    playRecording();
    showSelfButtons("对照标准音，你觉得刚才读得怎么样？");
  }

  function playRecording() {
    if (recUrl) {
      stopAudio();
      var a = new Audio(recUrl);
      curAudio = a;
      var p = a.play();
      if (p && p.catch) p.catch(function () {});
    }
  }

  function showSelfButtons(tipText) {
    var tip = document.getElementById("readTip");
    if (tipText) tip.textContent = tipText;
    document.getElementById("recordReplayBtn").hidden = !recUrl;
    document.getElementById("selfAssess").hidden = false;
  }

  /* 自评打分 */
  function selfRate(score) {
    var stars = score >= 85 ? "⭐⭐⭐" : score >= 65 ? "⭐⭐" : "⭐";
    var msg = score >= 85 ? "太棒了！继续加油！" : score >= 65 ? "不错！再练会更标准！" : "别灰心，再跟着读一遍！";
    var rs = document.getElementById("readResult");
    rs.innerHTML = '<div class="stars">' + stars + "</div>" +
      '<div style="font-size:15px;color:#666;">自评得分：<b style="color:' + (score >= 65 ? "#2e7d32" : "#c62828") + ';font-size:22px;">' + score + "</b> / 100</div>" +
      '<div class="good">' + msg + "</div>";
    rs.hidden = false;
    Store.addRecord(target.type, target.text, score);
    if (score >= 80) App.reward("");
    App.refreshToday();
    if (queue) document.getElementById("readNext").hidden = false;
    // 重新显示"听读音"便于对比
    var micBtn = document.getElementById("btnMic");
    if (recUrl) micBtn.textContent = "🔁 再读一次";
  }

  /* ---------- 跟读识别（桌面） ---------- */
  function startRead() {
    if (!target) return;
    // 手机/不支持识别 → 录音跟读
    if (!supported() || isMobile()) { enterRecordMode(); startRecordFlow(); return; }
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
    stopAudio();

    var timer = setTimeout(function () { try { r.abort(); } catch (e) {} }, 12000);

    r.onresult = function (ev) {
      clearTimeout(timer);
      var alts = [];
      for (var i = 0; i < ev.results[0].length; i++) alts.push(ev.results[0][i].transcript);
      var best = alts[0] || "";
      var res = scoreUtterance(target.text, alts);
      finish(best, res, alts);
    };
    r.onerror = function (ev) {
      clearTimeout(timer);
      listening = false;
      animEl.classList.remove("listening");
      micBtn.disabled = false;
      var m = {
        "not-allowed": "麦克风没开哦！请在浏览器地址栏允许使用麦克风",
        "no-speech": "没有听到声音，再试一次吧",
        "audio-capture": "找不到麦克风，请检查设备",
        network: "识别服务连不上（网络原因）"
      };
      tipEl.textContent = m[ev.error] || ("识别出错了：" + ev.error + "，再试一次吧");
      if (ev.error === "network" || ev.error === "service-not-allowed" || ev.error === "not-allowed" ||
          ev.error === "aborted") {
        enterRecordMode("自动打分不可用，已切换录音跟读：点「跟读」录下你的朗读吧！");
      }
    };
    r.onend = function () {
      clearTimeout(timer);
      listening = false;
      animEl.classList.remove("listening");
      micBtn.disabled = false;
    };
    try { r.start(); } catch (e) {
      listening = false;
      animEl.classList.remove("listening");
      micBtn.disabled = false;
      enterRecordMode("识别启动失败，已切换录音跟读：点「跟读」录下你的朗读吧！");
    }

    function finish(heard, res, alts) {
      listening = false;
      animEl.classList.remove("listening");
      micBtn.disabled = false;
      showResult(res, heard, alts);
      if (res.score >= 0) {
        Store.addRecord(target.type, target.text, res.score);
        if (res.score >= 80) App.reward(heard);
        App.refreshToday();
        if (queue) document.getElementById("readNext").hidden = false;
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
  function scoreUtterance(targetText, alts) {
    var tNorm = normalize(targetText);
    var best = -1, bestAlt = "";
    for (var i = 0; i < alts.length; i++) {
      var a = normalize(alts[i]);
      if (!a) continue;
      var cd = editDistance(tNorm, a);
      var charScore = Math.max(0, 1 - cd / Math.max(tNorm.length, a.length)) * 100;
      var tw = words(targetText), aw = words(alts[i]);
      var hit = 0;
      tw.forEach(function (w) { if (aw.indexOf(w) >= 0) hit++; });
      var wordScore = tw.length ? (hit / tw.length) * 100 : charScore;
      var sc = Math.round(charScore * 0.55 + wordScore * 0.45);
      if (sc > best) { best = sc; bestAlt = a; }
    }
    return { score: best, alt: bestAlt };
  }

  /* ---------- 结果展示（桌面自动识别） ---------- */
  function showResult(res, heard, alts) {
    var box = document.getElementById("readResult");
    var tip = document.getElementById("readTip");
    if (res.score < 0 && res.msg) {
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

    var fixTips = "";
    if (score < 85) {
      var tw = words(target ? target.text : ""), aw = words(heard || "");
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
    openRead(queue.list[queue.index], queue.list, queue.index);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  return {
    speak: speak, speakLetter: speakLetter, speakSlow: speakSlow,
    openRead: openRead, closeRead: closeRead, startRead: startRead,
    replayTarget: replayTarget, readNext: readNext, supported: supported,
    selfRate: selfRate, playRecording: playRecording
  };
})();

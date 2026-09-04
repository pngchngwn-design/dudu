/* ============ 入口：导航 / 主题 / 学生管理 / 奖励 ============ */
window.App = (function () {
  var viewRenderers = {
    letters: Views.renderLetters,
    words: Views.renderWords,
    reader: Views.renderReader,
    resources: Views.renderResources,
    records: RecordsView.render,
    themes: Views.renderThemes
  };
  var currentView = "letters";
  var todayEl = null;

  /* ---------- 导航 ---------- */
  function go(view) {
    currentView = view;
    document.querySelectorAll(".view").forEach(function (v) { v.classList.remove("active"); });
    var el = document.getElementById("view-" + view);
    if (el) { el.classList.add("active"); }
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("active", t.dataset.view === view);
    });
    if (viewRenderers[view]) viewRenderers[view]();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- 主题 ---------- */
  function applyTheme() {
    var t = Store.getSettings().theme || "puppy";
    document.body.dataset.theme = t;
  }
  function setTheme(id) {
    Store.setTheme(id);
    applyTheme();
    Views.renderThemes();
    var name = (DATA.themes.find(function (t) { return t.id === id; }) || {}).name || id;
    toast("已换上新背景：" + name + " ✨");
  }

  /* ---------- 学生 ---------- */
  function refreshStudents() {
    var sel = document.getElementById("studentSelect");
    var list = Store.listStudents();
    var cur = Store.currentStudent();
    if (!list.length) {
      sel.innerHTML = '<option value="">请添加学生</option>';
    } else {
      sel.innerHTML = list.map(function (s) {
        return '<option value="' + s.id + '"' + (cur && cur.id === s.id ? " selected" : "") + ">" + esc(s.name) + "</option>";
      }).join("");
    }
    renderStudentList();
  }
  function switchStudent(id) {
    if (!id) return;
    Store.setCurrentStudent(id);
    refreshStudents();
    if (currentView === "records") RecordsView.render();
    var s = Store.currentStudent();
    toast("切换到 " + (s ? s.name : "") + "，加油！");
  }
  function openStudentManager() { document.getElementById("studentModal").hidden = false; }
  function closeStudentManager() { document.getElementById("studentModal").hidden = true; }
  function addStudent() {
    var inp = document.getElementById("newStudentName");
    var res = Store.addStudent(inp.value);
    if (!res.ok) { toast(res.msg); return; }
    inp.value = "";
    refreshStudents();
    if (currentView === "records") RecordsView.render();
    toast("欢迎 " + res.student.name + "！开始今天的学习吧 🎉");
  }
  function removeStudent(id) {
    var s = Store.listStudents().find(function (x) { return x.id === id; });
    if (!s) return;
    if (!confirm("确定删除「" + s.name + "」吗？TA 的所有打卡记录也会一起删除。")) return;
    Store.removeStudent(id);
    refreshStudents();
    if (currentView === "records") RecordsView.render();
    toast("已删除");
  }
  function renderStudentList() {
    var ul = document.getElementById("studentList");
    if (!ul) return;
    var list = Store.listStudents();
    ul.innerHTML = list.map(function (s) {
      var cnt = Store.getRecords(s.id).length;
      var cur = Store.currentStudent();
      return "<li><span class=\"n\">" + esc(s.name) + (cur && cur.id === s.id ? ' <span class="tag">当前</span>' : "") +
        '</span><span class="cnt">' + cnt + ' 条记录</span>' +
        '<button class="mini-btn say" onclick="App.switchStudent(\'' + s.id + '\')">切换</button>' +
        '<button class="mini-btn del" style="background:linear-gradient(135deg,#ef5350,#c62828)" onclick="App.removeStudent(\'' + s.id + '\')">删除</button></li>';
    }).join("") || '<li style="color:#bbb;justify-content:center;">还没有学生，输入姓名添加一个吧！</li>';
  }

  /* ---------- 今日打卡角标 ---------- */
  function refreshToday() {
    if (!todayEl) return;
    var st = Store.currentStudent();
    todayEl.textContent = st ? "今日 " + Store.todayCount() + " 次" : "";
  }

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function toast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2400);
  }

  /* ---------- 星星奖励 ---------- */
  function reward(word) {
    var layer = document.getElementById("rewardLayer");
    var chars = ["⭐", "🌟", "✨", "🏅"];
    for (var i = 0; i < 12; i++) {
      (function (i) {
        setTimeout(function () {
          var s = document.createElement("span");
          s.className = "star-fly";
          s.textContent = chars[i % chars.length];
          s.style.left = (20 + Math.random() * 60) + "%";
          s.style.top = (30 + Math.random() * 40) + "%";
          s.style.setProperty("--dx", (Math.random() * 240 - 120) + "px");
          s.style.setProperty("--dy", (-120 - Math.random() * 160) + "px");
          layer.appendChild(s);
          setTimeout(function () { s.remove(); }, 1300);
        }, i * 70);
      })(i);
    }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- 启动 ---------- */
  function init() {
    applyTheme();
    refreshStudents();
    // 首次使用：自动弹出学生管理
    if (!Store.listStudents().length) {
      setTimeout(openStudentManager, 600);
    }
    // 语音列表预热（部分浏览器需要）
    if (window.speechSynthesis) { try { speechSynthesis.getVoices(); } catch (e) {} }
    go("letters");
    // 首次访问提示浏览器建议
    var flag = "happyReaderTipShown";
    if (!localStorage.getItem(flag) && !Speech.supported()) {
      localStorage.setItem(flag, "1");
      alert("小提示：跟读打分功能需要电脑版 Edge 或 Chrome 浏览器（允许麦克风）效果最佳。点读、打卡等其他功能任何浏览器都能用！");
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  return {
    go: go, setTheme: setTheme, applyTheme: applyTheme,
    switchStudent: switchStudent, openStudentManager: openStudentManager,
    closeStudentManager: closeStudentManager, addStudent: addStudent, removeStudent: removeStudent,
    refreshStudents: refreshStudents, refreshToday: refreshToday,
    toast: toast, reward: reward
  };
})();

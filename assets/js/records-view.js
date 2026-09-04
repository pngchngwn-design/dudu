/* ============ 打卡记录：统计 / 日历 / 明细 / 打印 / 备份 ============ */
window.RecordsView = (function () {

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtDate(ts) {
    var d = new Date(ts);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function fmtTime(ts) {
    var d = new Date(ts);
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  var TYPE_NAME = { letter: "字母", word: "单词", sentence: "句子", custom: "自编", resource: "资源" };

  function stats(records) {
    var days = {};
    var scores = [];
    records.forEach(function (r) {
      var d = fmtDate(r.ts);
      days[d] = (days[d] || 0) + 1;
      if (r.score != null) scores.push(r.score);
    });
    // 连续打卡天数（从今天往回数）
    var streak = 0;
    var cur = new Date(); cur.setHours(0, 0, 0, 0);
    // 今天没打卡也可以从昨天算连续（对孩子更友好），先看今天
    var t = cur.getTime();
    if (!days[fmtDate(t)]) t -= 86400000; // 今天没打，从昨天起算
    while (days[fmtDate(t)]) { streak++; t -= 86400000; }
    var avg = scores.length ? Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length) : 0;
    return {
      total: records.length,
      days: Object.keys(days).length,
      streak: streak,
      avg: avg,
      byDay: days
    };
  }

  function render() {
    var st = Store.currentStudent();
    var el = document.getElementById("view-records");
    if (!st) {
      el.innerHTML = '<div class="card" style="text-align:center;padding:40px 20px;">' +
        '<p style="font-size:40px;margin:0 0 10px;">🏆</p>' +
        '<h2 style="margin:0 0 8px;color:var(--accent-deep);">先添加一位同学吧！</h2>' +
        '<p style="color:#999;">点击右上角 ＋ 输入学生姓名，就能记录 TA 的每日打卡了</p>' +
        '<button class="btn btn-primary" style="margin-top:14px;" onclick="App.openStudentManager()">➕ 添加学生</button></div>';
      return;
    }
    var records = Store.getRecords(st.id);
    var s = stats(records);

    // 本月日历
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth();
    var first = new Date(y, m, 1);
    var startDow = first.getDay(); // 0=周日
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var dows = ["日", "一", "二", "三", "四", "五", "六"];
    var cells = dows.map(function (d) { return '<div class="dow">' + d + "</div>"; }).join("");
    for (var i = 0; i < startDow; i++) cells += '<div class="cal-cell"></div>';
    for (var d = 1; d <= daysInMonth; d++) {
      var key = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
      var cnt = s.byDay[key] || 0;
      var isToday = d === now.getDate();
      cells += '<div class="cal-cell' + (cnt ? " has" : "") + (isToday ? " today" : "") + '" title="' + key + " 打卡 " + cnt + ' 次">' +
        '<span class="dnum">' + d + "</span>" + (cnt ? cnt : "") + "</div>";
    }

    // 最近明细（最近60条）
    var rows = records.slice(-60).reverse().map(function (r) {
      var pill = r.score == null ? '<span class="score-pill s0">点读</span>' :
        r.score >= 85 ? '<span class="score-pill s3">' + r.score + "</span>" :
        r.score >= 65 ? '<span class="score-pill s2">' + r.score + "</span>" :
        '<span class="score-pill s1">' + r.score + "</span>";
      return "<tr><td>" + fmtDate(r.ts) + " " + fmtTime(r.ts) + "</td><td>" + (TYPE_NAME[r.type] || r.type) +
        "</td><td style='text-align:left;'>" + esc(r.item) + "</td><td>" + pill + "</td></tr>";
    }).join("") || '<tr><td colspan="4" style="color:#bbb;padding:20px;">还没有打卡记录，快去点读台学习吧！</td></tr>';

    el.innerHTML =
      '<div class="print-head"><h1>快乐点读乐园 · 学习打卡成绩单</h1>' +
      "<p>学生：" + esc(st.name) + " &nbsp;|&nbsp; 打卡 " + s.days + " 天 &nbsp;|&nbsp; 累计 " + s.total +
      " 次 &nbsp;|&nbsp; 跟读平均分 " + s.avg + " &nbsp;|&nbsp; 打印日期：" + fmtDate(Date.now()) + "</p></div>" +

      '<div class="card">' +
        '<div class="card-title"><h2>🏆 ' + esc(st.name) + " 的打卡成就</h2>" +
        '<div class="no-print" style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button class="btn btn-primary" onclick="window.print()">🖨 打印成绩单</button>' +
          '<button class="btn btn-ghost" onclick="RecordsView.exportBackup()">💾 导出备份</button>' +
          '<button class="btn btn-ghost" onclick="document.getElementById(\'importFile\').click()">📥 导入备份</button>' +
          '<input type="file" id="importFile" accept=".json" style="display:none" onchange="RecordsView.importBackup(this)">' +
        "</div></div>" +
        '<div class="stat-grid">' +
          '<div class="stat-card"><div class="num">' + s.streak + '</div><div class="lbl">连续打卡（天）🔥</div></div>' +
          '<div class="stat-card"><div class="num">' + s.days + '</div><div class="lbl">累计打卡（天）</div></div>' +
          '<div class="stat-card"><div class="num">' + s.total + '</div><div class="lbl">累计学习（次）</div></div>' +
          '<div class="stat-card"><div class="num">' + s.avg + '</div><div class="lbl">跟读平均分</div></div>' +
        "</div>" +
        '<h3 style="margin:6px 0 8px;font-size:15px;color:#8a7a5c;">📅 ' + y + " 年 " + (m + 1) + " 月打卡日历</h3>" +
        '<div class="calendar">' + cells + "</div>" +
        '<div class="cal-legend"><span><i style="background:linear-gradient(135deg,#ffb300,#ff8f00)"></i>已打卡（数字=次数）</span>' +
        "<span><i style=\"background:#f1ede4\"></i>未打卡</span><span><i style=\"background:none;box-shadow:0 0 0 2px var(--accent)\"></i>今天</span></div>" +
      "</div>" +

      '<div class="card">' +
        '<div class="card-title"><h2>📋 学习明细</h2><span class="sub">最近 60 条（打印时全部包含）</span></div>' +
        '<div style="overflow-x:auto;"><table class="record-table">' +
        "<thead><tr><th>时间</th><th>类型</th><th>内容</th><th>得分</th></tr></thead><tbody>" + rows + "</tbody></table></div>" +
      "</div>";
  }

  /* 导出备份（含全部学生记录与资源） */
  function exportBackup() {
    Store.exportAll().then(function (json) {
      var blob = new Blob([json], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "快乐点读乐园备份_" + fmtDate(Date.now()) + ".json";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
      App.toast("备份已导出，请妥善保存");
    });
  }

  function importBackup(input) {
    var f = input.files && input.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      var res = Store.importAll(reader.result);
      if (res.ok) {
        App.toast("导入成功！共 " + res.count + " 位学生");
        App.refreshStudents();
        App.applyTheme();
        render();
      } else {
        App.toast(res.msg || "导入失败");
      }
    };
    reader.readAsText(f);
    input.value = "";
  }

  return { render: render, exportBackup: exportBackup, importBackup: importBackup };
})();

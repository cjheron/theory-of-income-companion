/* Exam-prep widgets for the Theory of Income companion (Midterm 1 study guide).

   1. A question
      <div class="xq" id="wt-07" data-kind="tf" data-answer="F"
           data-study="../lessons/0004-first-welfare-theorem.html#pf-proof|L4 §3 · the 1WT proof, step (1)
                       ;; ../lessons/0005-…html#s3|L5 §3 · IRS and a single firm">
        <div class="xq-src"><span class="tag past">Past exam: Fall 2025 MT1 I.2</span> <span class="pts">20 pts</span></div>
        <div class="xq-stem">Statement…</div>
        <details class="hint">…</details>                (optional)
        <div class="xq-solution">Model answer…</div>   (hidden until the learner commits)
      </div>
      data-kind = "tf" (True/False + written justification; the T/F call is graded
                  automatically, the justification is self-graded against the model answer)
                | "derive" (work on paper, reveal, self-grade)
      data-study = links shown when the learner misses: "href|label" separated by ";;".
      The first link is the primary one.

   2. Exam mode: wrap questions in <div class="xq-exam" data-minutes="90">. Solutions stay
      hidden until "Finish and grade" (or time runs out). A timer bar is added on top.

   3. Scoreboards
      <div class="xq-score"></div>      per-page progress and the list of misses on this page
      <div class="xq-dashboard" data-pages="01-…html|Session 1 …;;02-…html|Session 2 …"></div>
                                         all pages: progress per session and the review queue

   Progress is stored in localStorage under "toi-mt1" (per browser, per origin).
*/
(function () {
  'use strict';

  var KEY = 'toi-mt1';
  var PAGE = location.pathname.split('/').pop() || 'index.html';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save(db) {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* storage disabled */ }
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function button(label, cls, fn) {
    var b = el('button', 'xq-btn' + (cls ? ' ' + cls : ''), label);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }
  function parseLinks(s) {
    return (s || '').split(';;').map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) {
      var i = x.indexOf('|');
      return i < 0 ? { href: x, label: x } : { href: x.slice(0, i).trim(), label: x.slice(i + 1).trim() };
    });
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  var STATUS_LABEL = { ok: 'Got it', partial: 'Partly', miss: 'Missed' };

  /* ── a single question ── */
  function initQuestion(q, num, exam) {
    var id = q.id;
    var kind = q.dataset.kind || 'derive';
    var sol = q.querySelector('.xq-solution');
    var stem = q.querySelector('.xq-stem');
    var links = parseLinks(q.dataset.study);
    var state = { choice: null };

    var head = q.querySelector('.xq-src') || el('div', 'xq-src');
    if (!head.parentNode) q.insertBefore(head, q.firstChild);
    var badge = el('span', 'xq-num', String(num));
    head.insertBefore(badge, head.firstChild);
    var stamp = el('span', 'xq-stamp');
    head.appendChild(stamp);

    if (sol) sol.hidden = true;

    // answer area
    var area = el('div', 'xq-answer');
    var tfRow, tfButtons = {};
    if (kind === 'tf') {
      tfRow = el('div', 'xq-tf');
      ['T', 'F'].forEach(function (v) {
        var b = button(v === 'T' ? 'True' : 'False', 'xq-tf-btn', function () {
          if (q.classList.contains('revealed')) return;
          state.choice = v;
          Object.keys(tfButtons).forEach(function (k) { tfButtons[k].classList.toggle('chosen', k === v); });
          if (!exam) reveal.disabled = false;
        });
        tfButtons[v] = b;
        tfRow.appendChild(b);
      });
      area.appendChild(tfRow);
    }
    var ta = el('textarea', 'xq-text');
    ta.rows = kind === 'tf' ? 3 : 4;
    ta.placeholder = kind === 'tf'
      ? 'Justify in 1–4 lines before you check (as on the exam).'
      : 'Sketch your answer here, or on paper. Commit before you reveal.';
    area.appendChild(ta);

    var bar = el('div', 'xq-bar');
    var reveal = button(kind === 'tf' ? 'Check' : 'Reveal solution', 'primary', function () { doReveal(); });
    if (kind === 'tf') reveal.disabled = true;
    if (!exam) bar.appendChild(reveal);
    area.appendChild(bar);

    // insert answer area before the hint (if any) or before the solution
    var anchor = q.querySelector('details.hint') || sol;
    q.insertBefore(area, anchor || null);

    // after reveal: verdict, self-grade, study links
    var verdict = el('div', 'xq-verdict');
    var grade = el('div', 'xq-grade');
    var study = el('div', 'xq-study');
    verdict.hidden = grade.hidden = study.hidden = true;
    if (sol) { sol.after(verdict); verdict.after(grade); grade.after(study); }
    else { q.appendChild(verdict); q.appendChild(grade); q.appendChild(study); }

    function doReveal() {
      if (q.classList.contains('revealed')) return;
      q.classList.add('revealed');
      reveal.disabled = true;
      Object.keys(tfButtons).forEach(function (k) { tfButtons[k].disabled = true; });
      ta.readOnly = true;
      if (sol) sol.hidden = false;
      if (kind === 'tf') {
        var ans = q.dataset.answer;
        var right = state.choice === ans;
        verdict.hidden = false;
        verdict.className = 'xq-verdict ' + (right ? 'ok' : 'no');
        verdict.textContent = state.choice == null
          ? 'No call made. The answer is ' + (ans === 'T' ? 'True' : 'False') + '.'
          : (right ? '✓ Right call: ' : '✗ Wrong call. The answer is ') + (ans === 'T' ? 'True' : 'False') + '.';
        if (tfButtons[ans]) tfButtons[ans].classList.add('is-answer');
        state.callRight = right;
      }
      grade.hidden = false;
      grade.innerHTML = '';
      grade.appendChild(el('span', 'xq-grade-q', kind === 'tf'
        ? 'Did your justification contain the key reason in the model answer?'
        : 'Grade yourself against the model answer:'));
      var opts = kind === 'tf'
        ? [['ok', 'Yes'], ['partial', 'Partly'], ['miss', 'No']]
        : [['ok', 'Got it'], ['partial', 'Partly'], ['miss', 'Missed it']];
      opts.forEach(function (o) {
        grade.appendChild(button(o[1], 'g-' + o[0], function () { record(o[0]); }));
      });
      if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([q]).catch(function () {});
    }
    q._reveal = doReveal;

    function record(self) {
      var status = self;
      if (kind === 'tf' && !state.callRight) status = 'miss';           // wrong call = miss
      else if (kind === 'tf' && self === 'miss') status = 'partial';    // right call, weak reason
      var db = load();
      var prev = db[id] || { attempts: 0 };
      db[id] = {
        status: status, date: today(), attempts: prev.attempts + 1,
        page: PAGE, title: (stem ? stem.textContent : '').replace(/\s+/g, ' ').trim().slice(0, 110),
        study: links.length ? links[0] : null,
        history: (prev.history || []).concat([status]).slice(-6)
      };
      save(db);
      showStatus(db[id], true);
      document.dispatchEvent(new CustomEvent('xq-change'));
    }

    function showStatus(rec, fresh) {
      q.classList.remove('st-ok', 'st-partial', 'st-miss');
      if (!rec) { stamp.textContent = ''; return; }
      q.classList.add('st-' + rec.status);
      stamp.textContent = STATUS_LABEL[rec.status] + ' · ' + rec.date + (rec.attempts > 1 ? ' · try ' + rec.attempts : '');
      if (fresh) {
        grade.hidden = true;
        study.hidden = false;
        study.innerHTML = '';
        var miss = rec.status !== 'ok';
        study.className = 'xq-study' + (miss ? ' is-miss' : '');
        study.appendChild(el('div', 'xq-study-h', miss
          ? (rec.status === 'miss' ? 'Study this before you retry:' : 'Shore this up:')
          : 'Where this lives:'));
        var ul = el('ul');
        links.forEach(function (l) {
          var li = el('li'); var a = el('a', null, l.label); a.href = l.href;
          li.appendChild(a); ul.appendChild(li);
        });
        study.appendChild(ul);
        if (miss) study.appendChild(el('div', 'xq-study-note', 'It is on your review queue. Monday\'s spaced review will send you back here.'));
        study.appendChild(button('Reset and retry', 'small', function () { resetQ(); }));
      }
    }

    function resetQ() {
      q.classList.remove('revealed');
      if (sol) sol.hidden = true;
      verdict.hidden = grade.hidden = study.hidden = true;
      ta.readOnly = false; ta.value = '';
      state.choice = null;
      Object.keys(tfButtons).forEach(function (k) {
        tfButtons[k].disabled = false; tfButtons[k].classList.remove('chosen', 'is-answer');
      });
      reveal.disabled = kind === 'tf';
      q.querySelectorAll('details').forEach(function (d) { d.open = false; });
      ta.focus();
    }

    var rec = load()[id];
    showStatus(rec, false);
  }

  /* ── exam mode ── */
  function initExam(box) {
    var minutes = parseFloat(box.dataset.minutes || '90');
    var bar = el('div', 'xq-timer');
    var clock = el('span', 'xq-clock', fmt(minutes * 60));
    var start = button('Start the clock', 'primary', toggle);
    var finish = button('Finish and grade', '', function () { end(false); });
    bar.appendChild(clock); bar.appendChild(start); bar.appendChild(finish);
    box.insertBefore(bar, box.firstChild);
    var left = minutes * 60, timer = null, done = false;
    function fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
    function toggle() {
      if (done) return;
      if (timer) { clearInterval(timer); timer = null; start.textContent = 'Resume'; return; }
      start.textContent = 'Pause';
      timer = setInterval(function () {
        left -= 1; clock.textContent = fmt(left);
        if (left <= 300) clock.classList.add('late');
        if (left <= 0) end(true);
      }, 1000);
    }
    function end(timeUp) {
      if (done) return;
      if (!timeUp && !confirm('Finish the exam and reveal all solutions?')) return;
      done = true; if (timer) clearInterval(timer);
      start.disabled = true; finish.disabled = true;
      clock.textContent = timeUp ? 'Time is up' : 'Finished with ' + fmt(left) + ' left';
      box.classList.add('graded');
      box.querySelectorAll('.xq').forEach(function (q) { if (q._reveal) q._reveal(); });
    }
  }

  /* ── scoreboards ── */
  function renderScore(sb) {
    var db = load();
    var qs = Array.from(document.querySelectorAll('.xq'));
    var n = { ok: 0, partial: 0, miss: 0 };
    var misses = [];
    qs.forEach(function (q, i) {
      var r = db[q.id];
      if (!r) return;
      n[r.status]++;
      if (r.status !== 'ok') misses.push({ q: q, i: i + 1, r: r });
    });
    var done = n.ok + n.partial + n.miss;
    sb.innerHTML = '';
    var line = el('div', 'xq-score-line');
    line.innerHTML = '<b>' + done + ' / ' + qs.length + '</b> attempted · <span class="c-ok">' + n.ok +
      ' got it</span> · <span class="c-partial">' + n.partial + ' partly</span> · <span class="c-miss">' + n.miss + ' missed</span>';
    sb.appendChild(line);
    sb.appendChild(meter(n, qs.length));
    if (misses.length) {
      sb.appendChild(el('div', 'xq-score-h', 'Your review list for this page'));
      var ul = el('ul', 'xq-queue');
      misses.forEach(function (m) {
        var li = el('li', 'q-' + m.r.status);
        var a = el('a', null, 'Q' + m.i); a.href = '#' + m.q.id;
        li.appendChild(a);
        li.appendChild(document.createTextNode(' ' + m.r.title.slice(0, 80) + '… '));
        if (m.r.study) { var s = el('a', 'xq-study-link', '→ ' + m.r.study.label); s.href = m.r.study.href; li.appendChild(s); }
        ul.appendChild(li);
      });
      sb.appendChild(ul);
    }
  }

  function meter(n, total) {
    var m = el('div', 'xq-meter');
    ['ok', 'partial', 'miss'].forEach(function (k) {
      var s = el('span', 'm-' + k);
      s.style.width = (total ? 100 * n[k] / total : 0) + '%';
      m.appendChild(s);
    });
    return m;
  }

  function renderDashboard(dash) {
    var db = load();
    var pages = parseLinks(dash.dataset.pages);
    var totals = {};
    (dash.dataset.totals || '').split(',').forEach(function (x, i) { if (pages[i]) totals[pages[i].href] = parseInt(x, 10) || 0; });
    dash.innerHTML = '';
    var table = el('table', 'simple xq-dash');
    table.innerHTML = '<tr><th>Session</th><th>Progress</th><th>Got it</th><th>Partly</th><th>Missed</th></tr>';
    pages.forEach(function (p) {
      var n = { ok: 0, partial: 0, miss: 0 };
      Object.keys(db).forEach(function (k) { if (db[k].page === p.href) n[db[k].status]++; });
      var tr = el('tr');
      var td = el('td'); var a = el('a', null, p.label); a.href = p.href; td.appendChild(a); tr.appendChild(td);
      var tdm = el('td'); tdm.appendChild(meter(n, totals[p.href] || (n.ok + n.partial + n.miss)));
      tdm.appendChild(el('span', 'xq-dash-n', (n.ok + n.partial + n.miss) + ' / ' + (totals[p.href] || '?')));
      tr.appendChild(tdm);
      ['ok', 'partial', 'miss'].forEach(function (k) { tr.appendChild(el('td', 'c-' + k, String(n[k]))); });
      table.appendChild(tr);
    });
    dash.appendChild(table);

    // review queue: misses first, then partials; oldest first
    var queue = Object.keys(db).filter(function (k) { return db[k].status !== 'ok'; }).map(function (k) {
      return Object.assign({ id: k }, db[k]);
    }).sort(function (a, b) {
      if (a.status !== b.status) return a.status === 'miss' ? -1 : 1;
      return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    });
    var h = el('div', 'xq-score-h', queue.length
      ? 'Review queue (' + queue.length + '): retry each item, then reread the linked section if you miss it again'
      : 'Review queue: empty. Every question you miss or half-get will land here.');
    dash.appendChild(h);
    if (queue.length) {
      var ul = el('ul', 'xq-queue');
      queue.forEach(function (r) {
        var li = el('li', 'q-' + r.status);
        var a = el('a', null, (r.status === 'miss' ? 'Missed' : 'Partly') + ' · ' + r.date);
        a.href = r.page + '#' + r.id;
        li.appendChild(a);
        li.appendChild(document.createTextNode(' ' + r.title.slice(0, 90) + '… '));
        if (r.study) { var s = el('a', 'xq-study-link', '→ ' + r.study.label); s.href = r.study.href; li.appendChild(s); }
        ul.appendChild(li);
      });
      dash.appendChild(ul);
    }
    var reset = button('Clear all saved progress', 'small', function () {
      if (confirm('Delete every saved answer and the review queue?')) { localStorage.removeItem(KEY); renderDashboard(dash); }
    });
    dash.appendChild(reset);
  }

  /* ── recall checklists (click a prompt to reveal its answer) ── */
  function initRecall(r) {
    r.querySelectorAll('li').forEach(function (li) {
      var ans = li.querySelector('.recall-a');
      if (!ans) return;
      ans.hidden = true;
      var b = button('Show', 'small', function () { ans.hidden = !ans.hidden; b.textContent = ans.hidden ? 'Show' : 'Hide'; });
      li.insertBefore(b, ans);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var num = 0;
    document.querySelectorAll('.xq').forEach(function (q) {
      num++;
      initQuestion(q, num, !!q.closest('.xq-exam'));
    });
    document.querySelectorAll('.xq-exam').forEach(initExam);
    document.querySelectorAll('.recall').forEach(initRecall);
    var sbs = document.querySelectorAll('.xq-score');
    var dashes = document.querySelectorAll('.xq-dashboard');
    function refresh() { sbs.forEach(renderScore); dashes.forEach(renderDashboard); }
    refresh();
    document.addEventListener('xq-change', refresh);
  });
})();

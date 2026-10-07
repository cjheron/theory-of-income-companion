/* Shared self-check widgets for Theory of Income companion lessons.

   1. Multiple choice
      <div class="quiz-section">
        <div class="quiz-question" data-correct="b">
          <div class="question-text">…</div>
          <ul class="quiz-options">
            <li class="quiz-option" data-option="a">…</li> …
          </ul>
          <div class="quiz-explain">Why the right answer is right (shown after any click).</div>
        </div>
        <div class="quiz-score"></div>
      </div>
      Options are shuffled on load, so letter position carries no information.

   2. Numeric answer
      <div class="numcheck" data-answer="0.25" data-tol="0.005"></div>
      Optional: data-placeholder, data-prompt. data-answer may be a JS expression
      such as "2/3".
*/
(function () {
  'use strict';

  function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function initQuiz(section) {
    const scoreEl = section.querySelector('.quiz-score');
    let answered = 0;

    section.querySelectorAll('.quiz-question').forEach(function (qEl) {
      const ul = qEl.querySelector('.quiz-options');
      const options = Array.from(qEl.querySelectorAll('.quiz-option'));
      shuffled(options).forEach(function (li) { ul.appendChild(li); });

      const correct = qEl.dataset.correct;
      const explain = qEl.querySelector('.quiz-explain');
      let done = false;

      options.forEach(function (opt) {
        opt.addEventListener('click', function () {
          if (done) return;
          done = true;
          answered++;
          const right = opt.dataset.option === correct;
          options.forEach(function (o) {
            o.classList.add('disabled');
            if (o.dataset.option === correct) o.classList.add('correct');
          });
          opt.classList.add('selected');
          if (!right) opt.classList.add('incorrect');
          if (explain) {
            if (!explain.querySelector('.verdict-word')) {
              const w = document.createElement('span');
              w.className = 'verdict-word';
              explain.insertBefore(w, explain.firstChild);
            }
            explain.querySelector('.verdict-word').textContent = right ? '✓ Correct.' : '✗ Not quite.';
            explain.classList.add(right ? 'is-correct' : 'is-wrong');
            explain.style.display = 'block';
          }
          if (scoreEl) {
            const n = section.querySelectorAll('.quiz-option.correct.selected').length;
            scoreEl.textContent = n + ' / ' + answered + ' correct so far';
          }
        });
      });
    });
  }

  function initNumcheck(el) {
    let target;
    try { target = Function('"use strict";return (' + el.dataset.answer + ')')(); }
    catch (e) { target = parseFloat(el.dataset.answer); }
    const tol = parseFloat(el.dataset.tol || '0.005');
    el.innerHTML = '';
    if (el.dataset.prompt) {
      const p = document.createElement('span'); p.textContent = el.dataset.prompt; el.appendChild(p);
    }
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = el.dataset.placeholder || 'your answer';
    const btn = document.createElement('button'); btn.textContent = 'Check';
    const fb = document.createElement('span'); fb.className = 'fb';
    el.append(input, btn, fb);
    function check() {
      let v;
      try { v = Function('"use strict";return (' + input.value.replace(/\^/g, '**') + ')')(); }
      catch (e) { v = NaN; }
      if (typeof v !== 'number' || !isFinite(v)) { fb.textContent = 'Enter a number (fractions like 2/3 are fine)'; fb.className = 'fb no'; return; }
      const ok = Math.abs(v - target) <= tol * Math.max(1, Math.abs(target));
      fb.textContent = ok ? '✓ Correct' : '✗ Try again';
      fb.className = 'fb ' + (ok ? 'ok' : 'no');
    }
    btn.addEventListener('click', check);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.quiz-section').forEach(initQuiz);
    document.querySelectorAll('.numcheck').forEach(initNumcheck);
  });
})();

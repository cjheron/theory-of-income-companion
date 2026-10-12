/* Site-wide tweaks for the published (GitHub Pages) version of the course.

   The slide PDFs in ../sources/ are not published (they are the instructor's
   course materials). When the course is served over http(s), links into
   sources/ are rewritten to the same PDF in the class Dropbox, keeping #page=N.
   Opened locally (file://), links go to the local copies in sources/.
*/
(function () {
  'use strict';
  // Per-file Dropbox links (raw=1 serves the PDF inline, so #page=N works in the browser's PDF viewer)
  var BASE = 'https://www.dropbox.com/scl/fo/fn9xoskx6ud23pimgo82p/';
  var RL = '?rlkey=vg06spyn2hsedldeyyaenifrn&raw=1';
  var DECK = {
    'slides1-welfare-theorems.pdf': BASE + 'AJ33gHxfLzEahGPug4HzuOk/1.%20Welfare%20Theorems/slidesnotes1theoryincome2026_revised.pdf' + RL,
    'slides2-olg.pdf': BASE + 'AJI5knp3cAcAJ5vNvKdLHHc/2-OLG%20Models/slidesnotes2theoryincome_Fall2026_revised.pdf' + RL,
    'slides3-olg-extensions.pdf': BASE + 'AIbU38ww5Uu37niEtoAsrfc/2-OLG%20Models/slidesnotes2theoryincome2026_OLG_extensions.pdf' + RL,
    'slides-blanchard-yaari.pdf': BASE + 'AKyvihV-XhYopjk9DdiBWDk/2-OLG%20Models/Blanchard-Yari/model_of_perpetual_youth_Blanchard_Yaari_Fall2026_revised.pdf' + RL
  };
  var CLASS_NOTES = BASE + 'ALVspsCuMymaBs2MzSqeOwQ?rlkey=vg06spyn2hsedldeyyaenifrn&dl=0';
  if (location.protocol === 'file:') return;
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('a[href*="sources/"]').forEach(function (a) {
      var href = a.getAttribute('href');
      var m = href.match(/sources\/([^#?]+)(?:#page=(\d+))?/);
      if (!m) return;
      a.setAttribute('href', (DECK[m[1]] || CLASS_NOTES) + (DECK[m[1]] && m[2] ? '#page=' + m[2] : ''));
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
      a.title = 'Opens the slides from the class Dropbox' + (m[2] ? ' at PDF page ' + m[2] : '');
    });
  });
})();

/* Site-wide tweaks for the published (GitHub Pages) version of the course.

   The slide PDFs in ../sources/ are not published (they are the instructor's
   course materials). When the course is served over http(s), links into
   sources/ are redirected to the class Dropbox folder, and the link text keeps
   the slide/page reference. Opened locally (file://), links still jump to the
   exact PDF page.
*/
(function () {
  'use strict';
  var CLASS_NOTES = 'https://www.dropbox.com/scl/fo/fn9xoskx6ud23pimgo82p/ALVspsCuMymaBs2MzSqeOwQ?rlkey=vg06spyn2hsedldeyyaenifrn&dl=0';
  var DECK = {
    'slides1-welfare-theorems.pdf': 'Folder 1: slidesnotes1theoryincome2026_revised.pdf',
    'slides2-olg.pdf': 'Folder 2: slidesnotes2theoryincome_Fall2026_revised.pdf',
    'slides3-olg-extensions.pdf': 'Folder 2: slidesnotes2theoryincome2026_OLG_extensions.pdf',
    'slides-blanchard-yaari.pdf': 'Folder 2 / Blanchard-Yari: model_of_perpetual_youth_Blanchard_Yaari_Fall2026_revised.pdf'
  };
  if (location.protocol === 'file:') return;
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('a[href*="sources/"]').forEach(function (a) {
      var href = a.getAttribute('href');
      var m = href.match(/sources\/([^#?]+)(?:#page=(\d+))?/);
      if (!m) return;
      a.setAttribute('href', CLASS_NOTES);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
      a.title = 'Class Dropbox → ' + (DECK[m[1]] || m[1]) + (m[2] ? ', PDF page ' + m[2] : '');
    });
  });
})();

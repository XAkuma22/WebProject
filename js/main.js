/* =============================================================================
   main.js  -  LOAD LAST
   Starts every feature once the page has loaded.
   ============================================================================= */
(() => {
  'use strict';
  const PF = window.PF;
  if (!PF || PF.redirecting) return;

  document.addEventListener('DOMContentLoaded', () => {
    PF.Theme.watch();
    PF.initLayout();
    PF.Theme.bindButtons();
    PF.initGate();
    PF.initProductPage();
    PF.initProducts();
    PF.hydrateIcons();
    const topics = PF.initTopics();
    PF.initSearch(topics);
    PF.initFeedback();
    PF.initAuth();
    PF.initTutorial();
    PF.initGuestUser();
    PF.initBackLink();
  });
})();

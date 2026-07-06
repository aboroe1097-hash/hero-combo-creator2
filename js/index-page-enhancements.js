(function wireIndexPageEnhancements() {
  var footerYear = document.getElementById('footerYear');
  if (footerYear) footerYear.textContent = String(new Date().getFullYear());

  var scrollTopBtn = document.getElementById('scrollTopBtn');
  if (scrollTopBtn) {
    window.addEventListener(
      'scroll',
      function () {
        if (window.scrollY > 300) scrollTopBtn.classList.add('visible');
        else scrollTopBtn.classList.remove('visible');
      },
      { passive: true }
    );
    scrollTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var iframe = entry.target;
          if (iframe.dataset.src) {
            iframe.src = iframe.dataset.src;
            iframe.removeAttribute('data-src');
          }
          observer.unobserve(iframe);
        });
      },
      { rootMargin: '200px' }
    );
    document.querySelectorAll('iframe[data-src]').forEach(function (el) {
      observer.observe(el);
    });
  }

  window.loadHtml2Canvas = function loadHtml2Canvas() {
    if (window._h2cPromise) return window._h2cPromise;
    window._h2cPromise = new Promise(function (resolve, reject) {
      if (window.html2canvas) {
        resolve(window.html2canvas);
        return;
      }
      var script = document.createElement('script');
      script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
      script.onload = function () {
        resolve(window.html2canvas);
      };
      script.onerror = function () {
        reject(new Error('Could not load html2canvas.'));
      };
      document.head.appendChild(script);
    });
    return window._h2cPromise;
  };
})();

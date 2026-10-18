(function () {
  var measurementId = "G-2VT1V5192S";

  if (window.location.protocol !== "https:") {
    return;
  }

  if (!/^G-[A-Z0-9]+$/.test(measurementId)) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };

  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    allow_ad_personalization_signals: false,
    allow_google_signals: false,
    anonymize_ip: true,
    send_page_view: true,
  });

  var script = document.createElement("script");
  script.async = true;
  script.src =
    "https://www.googletagmanager.com/gtag/js?id=" +
    encodeURIComponent(measurementId);
  document.head.appendChild(script);
})();

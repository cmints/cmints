let langaugeSelector = document.querySelector("#languageSelector");

langaugeSelector.addEventListener("change", e => {
  let locale = langaugeSelector.value;
  let page = langaugeSelector.dataset.page;
  let hostname = window.location.hostname;
  let protocol = window.location.protocol;
  let port = ":" + window.location.port;
  window.location.href = protocol + "//" + hostname + port + "/" +  locale + page;
});
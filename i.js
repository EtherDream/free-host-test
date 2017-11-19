//
// Service Worker Install
//
var flagS = 'nosw=1';
var flagR = /nosw=1/;


function reload() {
  var curr = +new Date();
  var last;
  try {
    last = +sessionStorage._ts || 0;
  } catch (err) {
    last = curr;
  }

  if (curr - last < 100) {
    show('waiting...');
    setTimeout(reload, 5000 * 100);
    return;
  }

  try {
    sessionStorage._ts = curr;
  } catch (err) {
  }
  location.reload();
}

function show(s) {
  var node = document.body || document.documentElement;
  node.innerHTML = s;
}

function unsupport() {
  fallback(
    'Sorry, Your browser is not supported, ' +
    'please use the latest Chrome.'
  );
}

function onfail(err) {
  fallback(err);
}

function fallback(desc) {
  if (flagR.test(document.cookie)) {
    show(desc);
    return;
  }

  document.cookie = flagS + '; path=/; max-age=600';

  if (!flagR.test(document.cookie)) {
    show('Cookie is disabled!');
    return;
  }
  reload();
}


function main() {
  var sw = navigator.serviceWorker;
  if (!sw) {
    return unsupport();
  }

  var asynFlag;
  try {
    asynFlag = eval('async _=>_');
  } catch(err) {
  }

  var streamFlag = self.ReadableStream;
  //...

  if (!asynFlag || !streamFlag) {
    unsupport();
    return;
  }

  sw
    .register('sw.js')
    .then(reload)
    .catch(onfail);

  sw.onerror = function(err) {
    console.warn('sw err:', err);
  };
}
main();
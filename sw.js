'use strict';

const EVENT_FETCH = 0;
const EVENT_MSG = 1;

let queue = [];

function addQueue() {
  queue.push(arguments);
}

function flushQueue() {
  queue.forEach(args => {
    let [type, e, y, n] = args;

    switch (type) {
    case EVENT_MSG:
      swMod.onmsg(e);
      break;

    case EVENT_FETCH:
      let p = swMod.onfetch(e);
      if (!p) {
        // sw bypass
        p = fetch(e.request);
      }
      p.then(y).catch(n);
      break;
    }
  });
  queue = [];
}


self.addEventListener('fetch', e => {
  let url = e.request.url;
  console.log('fetch:', url);

  // bypass Mixed-Content
  // if (/^http:/.test(url)) {
  //   return;
  // }

  let p;

  if (swMod) {
    p = swMod.onfetch(e);
  } else {
    p = new Promise((y, n) => {
      addQueue(EVENT_FETCH, e, y, n);
    });
  }

  if (p) {
    e.respondWith(p);
  }
});

self.addEventListener('message', e => {
  if (e.data === 'UPDATE') {
    load(true);
    return;
  }

  if (swMod) {
    swMod.onmsg(e);
  } else {
    addQueue(EVENT_MSG, e);
  }
});

self.addEventListener('install', e => {
  console.log('oninstall');
  skipWaiting();
});

self.addEventListener('activate', e => {
  console.log('onactivate');
});


let swUrl = 'sw_main.js';
let swMod;

function run(code) {
  let exports = {};

  let fn = Function('exports', code);
  fn(exports);

  swMod = exports;
  // swMod.oninit();

  flushQueue();
}


async function load(update) {
  let oldJs;
  let cache = await caches.open('v1');
  let req = new Request('/sw_main');
  let res = await cache.match(req);


  if (res && !update) {
    oldJs = await res.text();
    run(oldJs);
  }

  // fetch latest version
  res = await fetch(swUrl + '?v=' + Date.now());
  
  let newJs = await res.clone().text();
  if (!oldJs) {
    run(newJs);
  }
  // save
  cache.put(req, res);
}

load();

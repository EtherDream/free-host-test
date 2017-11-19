// from nginx's mime.types
const MIME_LIST = 'text/html:html htm shtml,text/css:css,text/xml:xml,image/gif:gif,image/jpeg:jpeg jpg,application/javascript:js,application/atom+xml:atom,application/rss+xml:rss,text/mathml:mml,text/plain:txt,text/vnd.sun.j2me.app-descriptor:jad,text/vnd.wap.wml:wml,text/x-component:htc,image/png:png,image/tiff:tif tiff,image/vnd.wap.wbmp:wbmp,image/x-icon:ico,image/x-jng:jng,image/x-ms-bmp:bmp,image/svg+xml:svg svgz,image/webp:webp,application/font-woff:woff,application/java-archive:jar war ear,application/json:json,application/mac-binhex40:hqx,application/msword:doc,application/pdf:pdf,application/postscript:ps eps ai,application/rtf:rtf,application/vnd.apple.mpegurl:m3u8,application/vnd.ms-excel:xls,application/vnd.ms-fontobject:eot,application/vnd.ms-powerpoint:ppt,application/vnd.wap.wmlc:wmlc,application/vnd.google-earth.kml+xml:kml,application/vnd.google-earth.kmz:kmz,application/x-7z-compressed:7z,application/x-cocoa:cco,application/x-java-archive-diff:jardiff,application/x-java-jnlp-file:jnlp,application/x-makeself:run,application/x-perl:pl pm,application/x-pilot:prc pdb,application/x-rar-compressed:rar,application/x-redhat-package-manager:rpm,application/x-sea:sea,application/x-shockwave-flash:swf,application/x-stuffit:sit,application/x-tcl:tcl tk,application/x-x509-ca-cert:der pem crt,application/x-xpinstall:xpi,application/xhtml+xml:xhtml,application/xspf+xml:xspf,application/zip:zip,application/octet-stream:bin exe dll,application/octet-stream:deb,application/octet-stream:dmg,application/octet-stream:iso img,application/octet-stream:msi msp msm,application/vnd.openxmlformats-officedocument.wordprocessingml.document:docx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:xlsx,application/vnd.openxmlformats-officedocument.presentationml.presentation:pptx,audio/midi:mid midi kar,audio/mpeg:mp3,audio/ogg:ogg,audio/x-m4a:m4a,audio/x-realaudio:ra,video/3gpp:3gpp 3gp,video/mp2t:ts,video/mp4:mp4,video/mpeg:mpeg mpg,video/quicktime:mov,video/webm:webm,video/x-flv:flv,video/x-m4v:m4v,video/x-mng:mng,video/x-ms-asf:asx asf,video/x-ms-wmv:wmv,video/x-msvideo:avi';
const MIME_MAP = {};

MIME_LIST.split(',').forEach(item => {
  let [mime, exts] = item.split(':');
  
  exts.split(' ').forEach(ext => {
    MIME_MAP[ext] = mime;
  });
});


function getExtFromUrl(url) {
  let m = url.match(/\.(\w+)\??/);
  return m && m[1];
}


function fixMime(hdr, ext) {
  let mime = MIME_MAP[ext];
  hdr.set('content-type', mime);
}


let textEnc = new TextEncoder('utf-8');

function utf8ToBytes(str) {
  return textEnc.encode(str);
}

function bytesToHex(bytes) {
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    let byt = bytes[i];
    let hex = byt.toString(16);
    if (byt < 16) {
      hex = '0' + hex;
    }
    str += hex;
  }
  return str;
}


const subtle = crypto.subtle;


async function sha256(str) {
  let src = utf8ToBytes(str);
  let buf = await subtle.digest('SHA-256', src);
  let dst = new Uint8Array(buf);
  return bytesToHex(dst);
}


class NodeBase {
  constructor() {
    this.onres = null;
    this.ondata = null;
    this.onend = null;
  }
}

// ----------
class NodeFetch extends NodeBase {
  constructor() {
    super();
  }

  async request(url) {
    let res = await fetch(url);
    this.onres(res);

    let reader = res.body.getReader();
    for (;;) {
      let r = await reader.read();
      if (r.done) {
        break;
      }
      this.ondata && this.ondata(r.value);
    }
    this.onend && this.onend();
  }
}


class GithubPage extends NodeFetch {
  constructor() {
    super();
  }

  request(path) {
    const BASE = 'http://127.0.0.1/';
    let url = BASE + path;
    super.request(url);
  }
}
// ==========

function doFetch(resolve, reject, req, url) {
  let path = url.pathname;
  if (path.endsWith('/')) {
    path += 'index.html';
  }

console.log('do fetch')

  let ext = getExtFromUrl(path);
  let node = new GithubPage();
  let output;

  node.onres = function(res) {
    // chrome
    let stream = new ReadableStream({
      start(controller) {
        output = controller;
      }
    });
    console.assert(output);


    let headers = new Headers(res.headers);

    fixMime(headers, ext);

    let response = new Response(stream, {
      status: res.status,
      statusText: res.statusText,
      headers: headers,
    });
    resolve(response);

    node.ondata = function(chunk) {
      output.enqueue(chunk);
    };
    
    node.onend = function() {
      output.close();
    };
  };


  node.request(path);
}


exports.onfetch = function(e) {
  console.warn('ver: 2017.11.19 14:00');

  let req = e.request;
  let url = new URL(req.url);
  console.log('req {mode: %o, url: %o, hdr: %o}',
    req.mode, url, new Map(req.headers)
  );

  let hdr = new Headers();

  req.headers.forEach((v, k) => {
    hdr.set(k, v);
  });

  // let hdr = new Headers(req.headers);
  let opt = {
    headers: hdr,
    // mode: req.mode === 'navigate' ? 'no-cors' : req.mode,

    // method: req.method,
    // credentials: req.credentials,
    // cache: req.cache,
    // redirect: req.redirect,
    // referrer: req.referrer,
    // integrity: req.integrity,
  };

  // if (url.hostname !== '') {
  //   return;
  // }

  return fetch(req.url, opt).then(res => {
    console.log('res:', res);
    if (res.status === 404) {
      let html =
        req.method + ' ' + url.pathname + ' ' +
        res.status + ':' +
        res.statusText + ' ';

      let buf = utf8ToBytes(html);

      let response = new Response(buf, {
        status: res.status,
        statusText: res.statusText,
      });
      return response;
    } else {
      return res;
    }
  });

  // return new Promise((y, n) => {
  //   doFetch(y, n, req, url);
  // });
}

exports.onmsg = function(e) {
  console.log('msg:', e);
};

exports.oninit = function() {
  
};

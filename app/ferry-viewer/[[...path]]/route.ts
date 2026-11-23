import { NextRequest, NextResponse } from "next/server";

/**
 * Same-origin proxy for Ferry (RustDesk web client).
 * Ferry ships with CSP `frame-ancestors 'none'`, which blanks an iframe embed.
 * We rewrite CSP so Hudl can embed the viewer, rewrite asset URLs under
 * /ferry-viewer/, and inject a bootstrap that autofills ID/password.
 */
const UPSTREAM = (
  process.env.RUSTDESK_WEB_UPSTREAM
  || process.env.NEXT_PUBLIC_RUSTDESK_WEB_URL
  || "https://rd.hudlapp.com"
).replace(/\/$/, "");

const VIEWER_PREFIX = "/ferry-viewer";

/** Soften AudioWorklet crash when a secure context still lacks a worklet path. */
const HUDL_AUDIO_SHIM_JS = `
(function () {
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC || AC.prototype.audioWorklet) return;
  Object.defineProperty(AC.prototype, "audioWorklet", {
    configurable: true,
    get: function () {
      return { addModule: function () { return Promise.resolve(); } };
    }
  });
  if (!window.AudioWorkletNode) {
    window.AudioWorkletNode = function () {
      this.port = { postMessage: function () {}, onmessage: null, addEventListener: function () {}, removeEventListener: function () {} };
      this.parameters = { get: function () { return { value: 0 }; } };
      this.connect = function (x) { return x || this; };
      this.disconnect = function () {};
    };
  }
})();
`.trim();

const HUDL_BOOTSTRAP_JS = `
(function () {
  // Drop Ferry's PWA worker so it can't keep an old ID-server host cached.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) { r.unregister(); });
    }).catch(function () {});
  }
  var MSG = "hudl:connect";
  var started = false;

  function setVal(el, v) {
    var desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    if (desc && desc.set) desc.set.call(el, v);
    else el.value = v;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function submitForm(form) {
    var btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.click();
      return;
    }
    try {
      if (typeof form.requestSubmit === "function") form.requestSubmit();
      else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    } catch (err) {
      console.warn("[hudl] Ferry submit blocked", err);
    }
  }

  function fill(id, password) {
    var peer = document.querySelector('input.id-input[name="peer"]');
    var pw = document.querySelector("#connect-pw");
    var form = document.querySelector("form.connect-form");
    if (!peer || !pw || !form) return false;
    setVal(peer, id);
    setVal(pw, password || "");
    setTimeout(function () { submitForm(form); }, 120);
    return true;
  }

  function tryConnect(id, password) {
    if (!id || started) return;
    started = true;
    var n = 0;
    var t = setInterval(function () {
      n += 1;
      if (fill(id, password) || n > 80) clearInterval(t);
    }, 100);
  }

  window.addEventListener("message", function (e) {
    if (e.origin !== window.location.origin) return;
    if (!e.data || e.data.type !== MSG) return;
    started = false;
    tryConnect(String(e.data.id || ""), String(e.data.password || ""));
  });

  try {
    var q = new URLSearchParams(window.location.search);
    var qid = q.get("id");
    if (qid) tryConnect(qid, q.get("password") || "");
  } catch (_) {}
})();
`.trim();

function ferryCsp(): string {
  const hostname = new URL(UPSTREAM).hostname;
  return [
    "default-src 'self'",
    "script-src 'self'",
    "worker-src 'self' blob:",
    // Ferry talks to hbbs/hbbr on 21118/21119; keep this broad so ws ports aren't CSP-blocked.
    `connect-src 'self' ws: wss: http://${hostname}:* https://${hostname}:* ws://${hostname}:* wss://${hostname}:*`,
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "style-src 'self'",
    "font-src 'self' data:",
    "base-uri 'self'",
    // 'none' blocks form.requestSubmit / submit button in Chromium.
    "form-action 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "manifest-src 'self'",
  ].join("; ");
}

function rewriteLocation(location: string): string {
  try {
    if (location.startsWith("http://") || location.startsWith("https://")) {
      const u = new URL(location);
      const path = u.pathname.replace(/^\/rustdesk\/?/, `${VIEWER_PREFIX}/`) + u.search + u.hash;
      return path.startsWith(VIEWER_PREFIX) ? path : `${VIEWER_PREFIX}${u.pathname}${u.search}${u.hash}`;
    }
  } catch {
    /* fall through */
  }
  return location
    .replace(/^\/rustdesk\/?/, `${VIEWER_PREFIX}/`)
    .replace(UPSTREAM, "");
}

function rewriteHtmlAssets(html: string): string {
  let out = html;
  if (!/<base\s/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1>\n    <base href="${VIEWER_PREFIX}/" />`);
  }
  out = out.replace(
    /\b(href|src)=["'](?!https?:|\/\/|\/|#|data:|blob:|mailto:)([^"']+)["']/gi,
    (_m, attr: string, path: string) => `${attr}="${VIEWER_PREFIX}/${path.replace(/^\.\//, "")}"`,
  );
  // Bust Ferry SW / browser cache so ID server host updates apply.
  out = out.replace(
    /\b(href|src)="(\/ferry-viewer\/(?:config\.js|app\.js|sw\.js)[^"]*)"/gi,
    (_m, attr: string, path: string) => {
      const sep = path.includes("?") ? "&" : "?";
      return `${attr}="${path}${sep}v=rd1"`;
    },
  );
  if (!out.includes("hudl-audio-shim.js")) {
    out = out.replace(
      /<script[^>]*src="[^"]*config\.js[^"]*"[^>]*><\/script>/i,
      `<script src="${VIEWER_PREFIX}/hudl-audio-shim.js"></script>\n    $&`,
    );
  }
  if (!out.includes("hudl-bootstrap.js")) {
    out = out.replace(
      /<\/body>/i,
      `<script src="${VIEWER_PREFIX}/hudl-bootstrap.js" defer></script>\n</body>`,
    );
  }
  return out;
}

async function proxyFerry(req: NextRequest, pathParts: string[] | undefined) {
  const suffix = pathParts?.length ? pathParts.join("/") : "";

  if (suffix === "hudl-bootstrap.js") {
    return new NextResponse(HUDL_BOOTSTRAP_JS, {
      status: 200,
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "cache-control": "no-store",
        "content-security-policy": ferryCsp(),
      },
    });
  }

  if (suffix === "hudl-audio-shim.js") {
    return new NextResponse(HUDL_AUDIO_SHIM_JS, {
      status: 200,
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "cache-control": "no-store",
        "content-security-policy": ferryCsp(),
      },
    });
  }

  const targetPath = suffix ? `/rustdesk/${suffix}` : "/rustdesk/";
  const target = `${UPSTREAM}${targetPath}${req.nextUrl.search}`;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: "GET",
      redirect: "manual",
      headers: {
        accept: req.headers.get("accept") || "*/*",
        "accept-language": req.headers.get("accept-language") || "en",
        "user-agent": req.headers.get("user-agent") || "Hudl-Ferry-Proxy",
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Remote viewer unreachable. Check Ferry on the RustDesk server." },
      { status: 502 },
    );
  }

  const headers = new Headers();
  for (const key of ["content-type", "cache-control", "etag", "last-modified", "accept-ranges"]) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }
  headers.set("content-security-policy", ferryCsp());
  headers.delete("x-frame-options");

  const location = upstream.headers.get("location");
  if (location) headers.set("location", rewriteLocation(location));

  const contentType = upstream.headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    const html = rewriteHtmlAssets(await upstream.text());
    headers.delete("content-length");
    return new NextResponse(html, { status: upstream.status, headers });
  }

  // TLS-only ID/relay on Caddy — pin host + wss (ignore stale IP in upstream config).
  if (suffix === "config.js") {
    const idServer = new URL(UPSTREAM).hostname;
    let key = process.env.NEXT_PUBLIC_RUSTDESK_KEY
      || "X6PHmyWPbmUvXpAl4wmE2+v0VItplnThGGVhS2kRDvI=";
    try {
      const raw = await upstream.text();
      const match = raw.match(/RUSTDESK_WEB_CONFIG\s*=\s*(\{[\s\S]*?\})\s*;/);
      if (match) {
        const parsed = JSON.parse(match[1]) as { key?: string };
        if (parsed.key) key = parsed.key;
      }
    } catch {
      /* keep fallback key */
    }
    const body = `window.RUSTDESK_WEB_CONFIG = ${JSON.stringify({ idServer, key, wss: true })};\n`;
    headers.set("content-type", "application/javascript; charset=utf-8");
    headers.set("cache-control", "no-store");
    headers.delete("content-length");
    headers.delete("etag");
    return new NextResponse(body, { status: 200, headers });
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}

type RouteCtx = { params: Promise<{ path?: string[] }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyFerry(req, path);
}

export async function HEAD(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyFerry(req, path);
}

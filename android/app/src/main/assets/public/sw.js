/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-8abc6ea3'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "3938fe5a56a889eb54feecb5c48f2952"
  }, {
    "url": "pwa-512x512.png",
    "revision": "59cc861c092310aed5d86d0c35d8027e"
  }, {
    "url": "pwa-192x192.png",
    "revision": "69b64acc2a962dfd37d58dde6b5e9e9d"
  }, {
    "url": "official-app-icon.png",
    "revision": "59cc861c092310aed5d86d0c35d8027e"
  }, {
    "url": "icon.svg",
    "revision": "e558c623ef3a1c86f9bc54e5c2141119"
  }, {
    "url": "favicon.png",
    "revision": "c6292a3e4346fab2fe2e5dc8ceab07c6"
  }, {
    "url": "favicon.ico",
    "revision": "0c9cfa0db3609aea04ab34eeed2bb2d6"
  }, {
    "url": "favicon-32x32.png",
    "revision": "752c1cdc465d92ea3644d501f5d7dbd8"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "5c8a875e607b527bb2205c530042976f"
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/index-RPrx9Nys.css",
    "revision": null
  }, {
    "url": "assets/index-BJuE2gb6.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "5c8a875e607b527bb2205c530042976f"
  }, {
    "url": "favicon-32x32.png",
    "revision": "752c1cdc465d92ea3644d501f5d7dbd8"
  }, {
    "url": "favicon.ico",
    "revision": "0c9cfa0db3609aea04ab34eeed2bb2d6"
  }, {
    "url": "favicon.png",
    "revision": "c6292a3e4346fab2fe2e5dc8ceab07c6"
  }, {
    "url": "official-app-icon.png",
    "revision": "59cc861c092310aed5d86d0c35d8027e"
  }, {
    "url": "pwa-192x192.png",
    "revision": "69b64acc2a962dfd37d58dde6b5e9e9d"
  }, {
    "url": "pwa-512x512.png",
    "revision": "59cc861c092310aed5d86d0c35d8027e"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "3938fe5a56a889eb54feecb5c48f2952"
  }, {
    "url": "manifest.webmanifest",
    "revision": "ec29c7936afcdc1767e4c395b9bf8557"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(({
    request
  }) => request.mode === "navigate" || request.destination === "document", new workbox.NetworkOnly(), 'GET');
  workbox.registerRoute(({
    url
  }) => url.pathname.startsWith("/api/"), new workbox.NetworkFirst({
    "cacheName": "psms-api-cache",
    "networkTimeoutSeconds": 5,
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 86400
    })]
  }), 'GET');
  workbox.registerRoute(({
    request
  }) => request.destination === "image", new workbox.CacheFirst({
    "cacheName": "psms-image-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 2592000
    })]
  }), 'GET');

}));

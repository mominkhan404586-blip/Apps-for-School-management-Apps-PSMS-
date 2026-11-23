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
define(['./workbox-d488705a'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "0b565bdf7817b8381bea6bb4e4f78569"
  }, {
    "url": "pwa-512x512.png",
    "revision": "a2fbe03caac9257068e95a84a241802d"
  }, {
    "url": "pwa-192x192.png",
    "revision": "db1773045b03b44b0589e963300673cd"
  }, {
    "url": "official-app-icon.png",
    "revision": "a2fbe03caac9257068e95a84a241802d"
  }, {
    "url": "index.html",
    "revision": "3275bb43369a638f895ee4d824f3cabd"
  }, {
    "url": "icon.svg",
    "revision": "1371b06582439a93d094b93acd717323"
  }, {
    "url": "favicon.png",
    "revision": "cb2d0633aa559602eb3e348397d32f40"
  }, {
    "url": "favicon.ico",
    "revision": "03bd3e9019661692e84df7e5c6e69720"
  }, {
    "url": "favicon-32x32.png",
    "revision": "0d9a4c169f3cfb7b055b2d3c3d1a125a"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "dc637e742e7341db7f4943311e408c52"
  }, {
    "url": "assets/index-Dan1WQpN.css",
    "revision": null
  }, {
    "url": "assets/index-Cocrei_y.js",
    "revision": null
  }, {
    "url": "assets/aistudio/teacher_reg_modal_47340f4f.png",
    "revision": null
  }, {
    "url": "assets/aistudio/teacher_login_modal_d73d5b0d.png",
    "revision": null
  }, {
    "url": "assets/aistudio/subject_module_f75e7faf.png",
    "revision": null
  }, {
    "url": "assets/aistudio/student_login_modal_8a914aa8.png",
    "revision": null
  }, {
    "url": "assets/aistudio/school_reg_modal_90ea8002.png",
    "revision": null
  }, {
    "url": "assets/aistudio/landing_full_dd58bfc5.png",
    "revision": null
  }, {
    "url": "assets/aistudio/landing_final_0610aecf.png",
    "revision": null
  }, {
    "url": "assets/aistudio/file_00000000bf648211a0baf5a214c4e65b_f7a3fc4c.png",
    "revision": null
  }, {
    "url": "assets/aistudio/file_00000000ad1c8206bad874d395b56178_a84f96ce.png",
    "revision": null
  }, {
    "url": "assets/aistudio/file_00000000ac208211a729d9e76594b6af_496ede27.png",
    "revision": null
  }, {
    "url": "assets/aistudio/file_000000009b88821196aebffdc7e342a1_6653c69f.png",
    "revision": null
  }, {
    "url": "assets/aistudio/file_0000000026e48211ba35f004a02825d3_21c92757.png",
    "revision": null
  }, {
    "url": "assets/aistudio/file_000000001cb0820b9dfa02c4d2acd18e_e623fb05.png",
    "revision": null
  }, {
    "url": "assets/aistudio/file_000000001104820bb454f5fa8a59d93d_c507fb60.png",
    "revision": null
  }, {
    "url": "assets/aistudio/admin_hidden_route_54142317.png",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "dc637e742e7341db7f4943311e408c52"
  }, {
    "url": "favicon-32x32.png",
    "revision": "0d9a4c169f3cfb7b055b2d3c3d1a125a"
  }, {
    "url": "favicon.png",
    "revision": "cb2d0633aa559602eb3e348397d32f40"
  }, {
    "url": "official-app-icon.png",
    "revision": "a2fbe03caac9257068e95a84a241802d"
  }, {
    "url": "pwa-192x192.png",
    "revision": "db1773045b03b44b0589e963300673cd"
  }, {
    "url": "pwa-512x512.png",
    "revision": "a2fbe03caac9257068e95a84a241802d"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "0b565bdf7817b8381bea6bb4e4f78569"
  }, {
    "url": "manifest.webmanifest",
    "revision": "03362492758a354fd98f48270401cda2"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("/index.html"), {
    denylist: [/^\/api\//]
  }));
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

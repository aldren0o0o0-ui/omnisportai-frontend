/* eslint-disable no-undef */

/**
 * OmniSport AI
 * Firebase Messaging Service Worker
 * Production Version
 */

const FIREBASE_VERSION = "10.13.2";

importScripts(
  `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app-compat.js`
);

importScripts(
  `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-messaging-compat.js`
);

/**
 * Firebase configuration
 */

firebase.initializeApp({
  apiKey: "AIzaSyBfb1heoQjfs9inpuPhJM7TmNGgWnt1RC4",
  authDomain: "omnisport-ai-16512.firebaseapp.com",
  projectId: "omnisport-ai-16512",
  storageBucket: "omnisport-ai-16512.firebasestorage.app",
  messagingSenderId: "614251444099",
  appId: "1:614251444099:web:0df7900d857484a362a8b6",
});

const messaging = firebase.messaging();

/**
 * Allowed internal routes
 */

const SAFE_PREFIXES = [
  "/notification-redirect",
  "/coordinator/",
  "/department/",
  "/sport-facilitator/",
  "/coach/",
  "/viewer/",
  "/profile",
];

/**
 * Validate notification links
 */



function sanitizePath(raw) {
  if (!raw) return null;

  try {
    const url = new URL(raw, self.location.origin);

    if (url.origin !== self.location.origin) {
      return null;
    }

    const allowed = SAFE_PREFIXES.some(prefix =>
      url.pathname.startsWith(prefix)
    );

    if (!allowed) {
      return null;
    }

    return url.pathname + url.search + url.hash;

  } catch {
    return null;
  }
}

/**
 * Build fallback route
 */

function buildFallback(data = {}) {

  const params = new URLSearchParams();

  [
    "notification_id",
    "event_type",
    "tournament_id",
    "match_id",
    "team_id",
    "venue_id",
    "schedule_id",
  ].forEach(key => {

    if (data[key]) {
      params.set(key, String(data[key]));
    }

  });

  return params.toString()
    ? `/notification-redirect?${params.toString()}`
    : "/notification-redirect";
}

/**
 * Background FCM messages
 */

messaging.onBackgroundMessage((payload) => {

  console.log(
    "[SW] Background Message",
    payload
  );

  const notification = payload.notification || {};
  const data = payload.data || {};

  const title =
    notification.title ||
    data.title ||
    "OmniSport AI";

  const body =
    notification.body ||
    data.message ||
    "You have a new notification.";

  const link =
    sanitizePath(data.link) ||
    buildFallback(data);

  const options = {

    body,

    icon: "/favicon.ico",

    badge: "/favicon.ico",

    tag:
      notification.tag ||
      "omnisport",

    renotify: false,

    requireInteraction: false,

    data: {

      ...data,

      link,

    },

  };

  self.registration.showNotification(
    title,
    options
  );

});

/**
 * Notification click
 */

self.addEventListener(
  "notificationclick",
  (event) => {

    event.notification.close();

    const target =
      event.notification.data?.link ||
      "/";

    event.waitUntil(

      (async () => {

        const clientsList =
          await clients.matchAll({

            type: "window",

            includeUncontrolled: true,

          });

        for (const client of clientsList) {

          if ("focus" in client) {

            await client.focus();

            if ("navigate" in client) {

              await client.navigate(target);

            }

            return;

          }

        }

        await clients.openWindow(target);

      })()

    );

  }
);
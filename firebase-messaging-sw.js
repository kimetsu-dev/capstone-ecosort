/* eslint-disable no-undef */
// Give the service worker access to Firebase Messaging.
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// 1. Initialize Firebase in the Service Worker.
const firebaseConfig = {
  apiKey: "AIzaSyDWRvunKHCqs3maebTRr1dICfxb04XGW6A",
  authDomain: "ecosort-51471.firebaseapp.com",
  projectId: "ecosort-51471",
  storageBucket: "ecosort-51471.appspot.com",
  messagingSenderId: "296718734304",
  appId: "1:296718734304:web:852095c72930c6b61a1185",
  measurementId: "G-31NRJCYK8P",
};

firebase.initializeApp(firebaseConfig);

// 2. Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// 3. Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png',
    badge: '/favicon.ico',
    tag: 'ecosort-notification', // Overwrites previous notifications with same tag
    renotify: true // Alerts user even if tag is same
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
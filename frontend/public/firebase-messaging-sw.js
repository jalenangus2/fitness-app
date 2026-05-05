// frontend/public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// PASTE YOUR EXACT FIREBASE CONFIG STRINGS HERE 👇
const firebaseConfig = {
  apiKey: "AIzaSyC2Ix8R-5kTEK090Ic5NOfLc7OMKDjE_WE",
  authDomain: "lifeos-e16fd.firebaseapp.com",
  projectId: "lifeos-e16fd",
  storageBucket: "lifeos-e16fd.firebasestorage.app",
  messagingSenderId: "288723626969",
  appId: "1:288723626969:web:84019159735ea21dbec7c8"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// This handles pushes when the app is running in the background
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg' 
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
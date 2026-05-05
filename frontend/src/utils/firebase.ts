import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Messaging and get a reference to the service
export const messaging = getMessaging(app);

// Helper function to request permission and get the token
export const requestForToken = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // NOTE: You will need a VAPID key here in the next step
      const currentToken = await getToken(messaging, { 
        vapidKey: 'BH4LnrjzztdfSabIXyYNA3a8blfcDJLkUQUWzLWSNbCFJc7z7CmI4uAkH0dEQIUzw_YNJABd0lLBy8OKcrT9W9Y' 
      });
      
      if (currentToken) {
        console.log('Got FCM device token:', currentToken);
        // TODO: Send this token to your FastAPI backend to save to the user's profile
        return currentToken;
      } else {
        console.log('No registration token available.');
      }
    } else {
      console.log('Notification permission denied.');
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
  }
};

// Listener for foreground messages (when the app is open)
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
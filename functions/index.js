const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

exports.sendPushNotification = onDocumentCreated({
  document: "notifications/{userId}/userNotifications/{notifId}",
  region: "asia-southeast1",
}, async (event) => {
  const userId = event.params.userId;
  const notifData = event.data.data();

  const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(userId)
      .get();

  const fcmToken = userDoc.data()?.fcmToken;

  if (!fcmToken) {
    console.log("No FCM token found for user:", userId);
    return;
  }

  const message = {
    notification: {
      title: "EcoSort Update",
      body: notifData.message,
    },
    webpush: {
      notification: {
        icon: "/logo192.png",
        badge: "/favicon.ico",
      },
      fcmOptions: {
        link: "https://ecosort-51471.web.app/dashboard",
      },
    },
    token: fcmToken,
  };

  try {
    await admin.messaging().send(message);
    console.log("Push sent successfully to user:", userId);
    return; 
  } catch (error) {
    console.error("Error sending push:", error);
    return; 
  }
});

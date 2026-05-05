import firebase_admin
from firebase_admin import credentials, messaging
import os

def initialize_firebase():
    """Initializes the Firebase Admin app on startup."""
    if not firebase_admin._apps:
        # Assuming the JSON file is in the root of the backend folder
        cred_path = os.path.join(os.path.dirname(__file__), "..", "firebase-credentials.json")
        try:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin initialized successfully.")
        except Exception as e:
            print(f"Failed to initialize Firebase: {e}")

def send_push_notification(device_token: str, title: str, body: str):
    """Sends a notification to a specific device."""
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            token=device_token,
        )
        response = messaging.send(message)
        return {"success": True, "message_id": response}
    except Exception as e:
        print(f"Error sending push: {e}")
        return {"success": False, "error": str(e)}
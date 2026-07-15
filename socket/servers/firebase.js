const admin =
  require("firebase-admin");

require("dotenv").config();

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountJson) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is missing.");
}

const serviceAccount = JSON.parse(serviceAccountJson);

if (!admin.getApps().length) {
  admin.initializeApp({
    credential:
      admin.cert(
        serviceAccount
      ),
  });
}

module.exports =
  admin;
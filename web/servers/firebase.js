const admin =
  require("firebase-admin");

const serviceAccount =
  require("./firebase-key.json");

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
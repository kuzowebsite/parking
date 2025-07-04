const { initializeApp } = require("firebase/app")
const { getDatabase, ref, set } = require("firebase/database")

const firebaseConfig = {
  apiKey: "AIzaSyDReM6qjmJb7EZCDoIoR5j1HsVLmiCRD9s",
  authDomain: "ajlitannurtgl.firebaseapp.com",
  databaseURL: "https://ajlitannurtgl-default-rtdb.firebaseio.com",
  projectId: "ajlitannurtgl",
  messagingSenderId: "1061708931334",
  appId: "1:1061708931334:web:661148d945845e1d7f3e87",
  measurementId: "G-ZRDQBCVXVF",
}

const app = initializeApp(firebaseConfig)
const database = getDatabase(app)

async function updateFirebaseRules() {
  console.log("🔧 Firebase Database Rules шинэчлэх заавар:")
  console.log("")
  console.log("1. Firebase Console руу орох: https://console.firebase.google.com/")
  console.log("2. Таны project сонгох")
  console.log("3. 'Realtime Database' хэсэг рүү орох")
  console.log("4. 'Rules' tab дээр дарах")
  console.log("5. Доорх rules-ийг хуулж тавих:")
  console.log("")
  console.log("=" * 50)
  console.log(`{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "siteConfig": {
      ".read": "true",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'manager'"
    },
    "users": {
      "$uid": {
        ".read": "auth != null && (auth.uid == $uid || root.child('users').child(auth.uid).child('role').val() == 'manager')",
        ".write": "auth != null && (auth.uid == $uid || root.child('users').child(auth.uid).child('role').val() == 'manager')"
      }
    },
    "parkingRecords": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "parking_records": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "employees": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "pricingConfig": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'manager'"
    }
  }
}`)
  console.log("=" * 50)
  console.log("")
  console.log("6. 'Publish' товч дээр дарж хадгалах")
  console.log("")
  console.log("⚠️ Анхаар: 'siteConfig' хэсэг нь '.read': 'true' байгаа нь")
  console.log("   нэвтрээгүй хэрэглэгчид зөвхөн site config унших боломжтой гэсэн үг")

  // Test if we can create siteConfig
  try {
    console.log("\n🧪 Testing siteConfig creation...")
    const siteConfig = {
      siteName: "ЗОГСООЛЫН УДИРДЛАГЫН СИСТЕМ",
      siteLogo: "/images/logo.png",
      siteBackground: "/images/background.webp",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: "1.0.0",
    }

    await set(ref(database, "siteConfig"), siteConfig)
    console.log("✅ siteConfig амжилттай үүсгэгдлээ!")
  } catch (error) {
    console.log("❌ siteConfig үүсгэхэд алдаа:", error.message)
  }
}

updateFirebaseRules()

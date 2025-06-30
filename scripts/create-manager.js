// Firebase Console дээр анхны manager хэрэглэгч үүсгэх
// Энэ script-ийг зөвхөн нэг удаа ажиллуулна

import { initializeApp } from "firebase/app"
import { getDatabase, ref, set } from "firebase/database"
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth"

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
const auth = getAuth(app)

async function createManager() {
  try {
    // Manager хэрэглэгч үүсгэх
    const managerEmail = "manager@parking.mn"
    const managerPassword = "manager123"

    console.log("Manager хэрэглэгч үүсгэж байна...")

    const userCredential = await createUserWithEmailAndPassword(auth, managerEmail, managerPassword)
    const managerId = userCredential.user.uid

    // Database дээр manager мэдээлэл хадгалах
    const managerData = {
      name: "Систем Админ",
      phone: "99999999",
      email: managerEmail,
      role: "manager",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await set(ref(database, `users/${managerId}`), managerData)

    console.log("✅ Manager амжилттай үүсгэгдлээ!")
    console.log("И-мэйл:", managerEmail)
    console.log("Нууц үг:", managerPassword)
    console.log("Холбоос: /manager")
  } catch (error) {
    console.error("❌ Алдаа гарлаа:", error)
  }
}

// Script ажиллуулах
createManager()

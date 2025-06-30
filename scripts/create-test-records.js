// Тест өгөгдөл үүсгэх script
import { initializeApp } from "firebase/app"
import { getDatabase, ref, push } from "firebase/database"

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

async function createTestRecords() {
  try {
    console.log("Тест өгөгдөл үүсгэж байна...")

    // Тест бүртгэлүүд
    const testRecords = [
      {
        carNumber: "1234 УНМ",
        driverName: "Систем Админ",
        parkingArea: "A",
        entryTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleString("mn-MN"),
        amount: 0,
        type: "entry",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        carNumber: "1234 УНМ",
        driverName: "Систем Админ",
        parkingArea: "A",
        exitTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toLocaleString("mn-MN"),
        amount: 5000,
        type: "exit",
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
      {
        carNumber: "5678 МНГ",
        driverName: "Систем Админ",
        parkingArea: "B",
        entryTime: new Date(Date.now() - 30 * 60 * 1000).toLocaleString("mn-MN"),
        amount: 0,
        type: "entry",
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
      {
        carNumber: "9999 ТЕС",
        driverName: "Систем Админ",
        parkingArea: "C",
        entryTime: new Date(Date.now() - 10 * 60 * 1000).toLocaleString("mn-MN"),
        amount: 0,
        type: "entry",
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
      {
        carNumber: "9999 ТЕС",
        driverName: "Систем Админ",
        parkingArea: "C",
        exitTime: new Date().toLocaleString("mn-MN"),
        amount: 5000,
        type: "exit",
        timestamp: new Date().toISOString(),
      },
    ]

    // Бүртгэлүүдийг database-д хадгалах
    for (const record of testRecords) {
      await push(ref(database, "parking_records"), record)
      console.log(`✅ Бүртгэл нэмэгдлээ: ${record.carNumber} - ${record.type}`)
    }

    console.log("🎉 Бүх тест өгөгдөл амжилттай үүсгэгдлээ!")
    console.log("Одоо аппликейшнд нэвтэрч 'Сүүлийн бүртгэл' болон 'Түүх' хэсгийг шалгана уу.")
  } catch (error) {
    console.error("❌ Алдаа гарлаа:", error)
  }
}

// Script ажиллуулах
createTestRecords()

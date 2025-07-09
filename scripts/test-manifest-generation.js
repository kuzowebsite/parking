const generateManifest = require("./generate-manifest-simple")

async function testManifestGeneration() {
  console.log("🧪 Manifest үүсгэх тестийг эхлүүлж байна...")

  try {
    await generateManifest()
    console.log("✅ Тест амжилттай дууслаа!")
  } catch (error) {
    console.error("❌ Тест амжилтгүй:", error)
  }
}

testManifestGeneration()

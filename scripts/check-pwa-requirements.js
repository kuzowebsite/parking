const fs = require("fs")
const path = require("path")

function checkPWARequirements() {
  console.log("🔍 PWA шаардлагуудыг шалгаж байна...")

  const checks = []

  // 1. Manifest файл шалгах
  const manifestPath = path.join(process.cwd(), "public", "manifest.json")
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
      checks.push({
        name: "Manifest файл",
        status: "✅",
        details: `Нэр: ${manifest.name}, Icons: ${manifest.icons?.length || 0}`,
      })

      // Manifest доторх шаардлагатай талбарууд шалгах
      const requiredFields = ["name", "short_name", "start_url", "display", "icons"]
      const missingFields = requiredFields.filter((field) => !manifest[field])

      if (missingFields.length > 0) {
        checks.push({
          name: "Manifest талбарууд",
          status: "⚠️",
          details: `Дутуу талбарууд: ${missingFields.join(", ")}`,
        })
      } else {
        checks.push({
          name: "Manifest талбарууд",
          status: "✅",
          details: "Бүх шаардлагатай талбарууд байна",
        })
      }

      // Icons шалгах
      if (manifest.icons && manifest.icons.length > 0) {
        const hasRequiredSizes =
          manifest.icons.some((icon) => icon.sizes === "192x192") &&
          manifest.icons.some((icon) => icon.sizes === "512x512")

        checks.push({
          name: "Icon хэмжээнүүд",
          status: hasRequiredSizes ? "✅" : "⚠️",
          details: hasRequiredSizes ? "192x192 болон 512x512 байна" : "192x192 эсвэл 512x512 дутуу",
        })
      }
    } catch (error) {
      checks.push({
        name: "Manifest файл",
        status: "❌",
        details: `JSON алдаа: ${error.message}`,
      })
    }
  } else {
    checks.push({
      name: "Manifest файл",
      status: "❌",
      details: "public/manifest.json файл олдсонгүй",
    })
  }

  // 2. Service Worker шалгах
  const swPath = path.join(process.cwd(), "public", "sw.js")
  if (fs.existsSync(swPath)) {
    checks.push({
      name: "Service Worker",
      status: "✅",
      details: "public/sw.js файл байна",
    })
  } else {
    checks.push({
      name: "Service Worker",
      status: "❌",
      details: "public/sw.js файл олдсонгүй",
    })
  }

  // 3. HTTPS шалгах (production дээр)
  checks.push({
    name: "HTTPS",
    status: "ℹ️",
    details: "Production дээр HTTPS шаардлагатай",
  })

  // 4. Icons файлууд шалгах
  const iconPaths = ["/images/logo.png"]
  iconPaths.forEach((iconPath) => {
    const fullPath = path.join(process.cwd(), "public", iconPath.substring(1))
    if (fs.existsSync(fullPath)) {
      checks.push({
        name: `Icon файл ${iconPath}`,
        status: "✅",
        details: "Файл байна",
      })
    } else {
      checks.push({
        name: `Icon файл ${iconPath}`,
        status: "⚠️",
        details: "Файл олдсонгүй",
      })
    }
  })

  // Үр дүн хэвлэх
  console.log("\n📋 PWA шаардлагын тайлан:")
  console.log("=" * 50)

  checks.forEach((check) => {
    console.log(`${check.status} ${check.name}: ${check.details}`)
  })

  const passedChecks = checks.filter((c) => c.status === "✅").length
  const totalChecks = checks.filter((c) => c.status !== "ℹ️").length

  console.log("\n📊 Нийт үнэлгээ:")
  console.log(`✅ Амжилттай: ${passedChecks}/${totalChecks}`)

  if (passedChecks === totalChecks) {
    console.log("🎉 PWA суулгахад бэлэн!")
  } else {
    console.log("⚠️  PWA суулгахын тулд дээрх асуудлуудыг засварлана уу")
  }
}

// Script ажиллуулах
if (require.main === module) {
  checkPWARequirements()
}

module.exports = checkPWARequirements

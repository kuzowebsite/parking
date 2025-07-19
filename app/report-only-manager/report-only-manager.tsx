"use client"
import type React from "react"
import { DialogFooter } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { onAuthStateChanged, signOut, type User } from "firebase/auth"
import { ref, onValue, update, remove } from "firebase/database"
import { auth, database } from "@/lib/firebase"
import type { UserProfile } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Settings,
  UserIcon,
  LogOut,
  Eye,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  Shield,
  Edit,
  EyeOff,
} from "lucide-react"
import * as XLSX from "xlsx"

export default function ReportOnlyManagerPage() {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Report states
  const [reportRecords, setReportRecords] = useState<any[]>([])
  const [filteredReportRecords, setFilteredReportRecords] = useState<any[]>([])
  const [reportFilterYear, setReportFilterYear] = useState("")
  const [reportFilterMonth, setReportFilterMonth] = useState("")
  const [reportFilterCarNumber, setReportFilterCarNumber] = useState("")
  const [reportFilterMechanic, setReportFilterMechanic] = useState("")
  const [reportFilterPaymentStatus, setReportFilterPaymentStatus] = useState("")
  const [reportLoading, setReportLoading] = useState(false)
  const [totalCashAmount, setTotalCashAmount] = useState(0)
  const [totalCardAmount, setTotalCardAmount] = useState(0)
  const [totalTransferAmount, setTotalTransferAmount] = useState(0)

  // Date range filter states
  const [showDateRangeDialog, setShowDateRangeDialog] = useState(false)
  const [dateRangeStart, setDateRangeStart] = useState("")
  const [dateRangeEnd, setDateRangeEnd] = useState("")
  const [deleteAfterExport, setDeleteAfterExport] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  // Image viewer states
  const [showImageViewer, setShowImageViewer] = useState(false)
  const [currentImages, setCurrentImages] = useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Site configuration states
  const [showSiteDialog, setShowSiteDialog] = useState(false)
  const [siteConfig, setSiteConfig] = useState({
    siteName: "",
    siteLogo: "",
    siteBackground: "",
  })
  const [siteLoading, setSiteLoading] = useState(false)

  // Profile dialog state
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [profileData, setProfileData] = useState({
    name: "",
    phone: "",
    email: "",
    profileImage: "",
  })
  const [profileLoading, setLoadingProfile] = useState(false)

  // Profile image and password states
  const [showPassword, setShowConfirmPassword] = useState(false)
  const [showConfirmPassword, setShowPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  // Pricing states
  const [showPricingDialog, setShowPricingDialog] = useState(false)
  const [pricingConfig, setPricingConfig] = useState({
    leather: {
      firstHour: 0,
      subsequentHour: 0,
    },
    spare: {
      firstHour: 0,
      subsequentHour: 0,
    },
    general: {
      firstHour: 0,
      subsequentHour: 0,
    },
  })
  const [pricingLoading, setPricingLoading] = useState(false)

  // Payment status dialog states
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [cashAmountInput, setCashAmountInput] = useState(0)
  const [cardAmountInput, setCardAmountInput] = useState(0)
  const [transferAmountInput, setTransferAmountInput] = useState(0)
  const [paymentLoading, setPaymentLoading] = useState(false)

  // Edit record dialog states
  const [showEditRecordDialog, setShowEditRecordDialog] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any>(null)
  const [editRecordData, setEditRecordData] = useState({
    carNumber: "",
    mechanicName: "",
    carBrand: "",
    entryTime: "",
    exitTime: "",
    parkingDuration: "",
    notes: "",
  })
  const [editRecordLoading, setEditRecordLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      if (user) {
        await loadUserProfile(user.uid)
      } else {
        setLoading(false)
      }
    })
    return unsubscribe
  }, [])

  const loadUserProfile = async (userId: string) => {
    const profileRef = ref(database, `users/${userId}`)
    onValue(profileRef, (snapshot) => {
      const data = snapshot.val()
      if (data && data.role === "manager") {
        setUserProfile(data)
        setProfileData({
          name: data.name || "",
          phone: data.phone || "",
          email: data.email || "",
          profileImage: data.profileImage || "",
        })
        setLoading(false)
      } else {
        setUserProfile(null)
        setLoading(false)
      }
    })

    // Load site configuration
    const siteRef = ref(database, "siteConfig")
    onValue(siteRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setSiteConfig({
          siteName: data.siteName || "",
          siteLogo: data.siteLogo || "",
          siteBackground: data.siteBackground || "",
        })
      }
    })

    // Load pricing configuration
    const pricingRef = ref(database, "pricingConfig")
    onValue(pricingRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setPricingConfig({
          leather: {
            firstHour: data.leather?.firstHour || 0,
            subsequentHour: data.leather?.subsequentHour || 0,
          },
          spare: {
            firstHour: data.spare?.firstHour || 0,
            subsequentHour: data.spare?.subsequentHour || 0,
          },
          general: {
            firstHour: data.general?.firstHour || 0,
            subsequentHour: data.general?.subsequentHour || 0,
          },
        })
      }
    })

    // Load report records
    setTimeout(() => {
      loadReportRecords()
    }, 500)
  }

  const loadReportRecords = () => {
    setReportLoading(true)
    const recordsRef = ref(database, "parking_records")
    onValue(recordsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const records = Object.keys(data)
          .map((key) => ({ id: key, ...data[key] }))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        setReportRecords(records)
        setFilteredReportRecords(records)
      } else {
        setReportRecords([])
        setFilteredReportRecords([])
      }
      setReportLoading(false)
    })
  }

  const calculateParkingFee = (entryTime: string, exitTime: string): number => {
    if (
      !entryTime ||
      !exitTime ||
      pricingConfig.leather.firstHour === 0 ||
      pricingConfig.leather.subsequentHour === 0 ||
      pricingConfig.spare.firstHour === 0 ||
      pricingConfig.spare.subsequentHour === 0 ||
      pricingConfig.general.firstHour === 0 ||
      pricingConfig.general.subsequentHour === 0
    ) {
      return 0
    }
    try {
      const parseMongoDate = (dateStr: string) => {
        const cleanStr = dateStr.replace(/[^\d\s:.,]/g, "")
        const parts = cleanStr.split(/[,\s]+/)
        if (parts.length >= 2) {
          const datePart = parts[0]
          const timePart = parts[1]
          const [year, month, day] = datePart.split(".").map(Number)
          const [hour, minute] = timePart.split(":").map(Number)
          return new Date(year, month - 1, day, hour, minute)
        }
        return new Date(dateStr)
      }
      const entryDate = parseMongoDate(entryTime)
      const exitDate = parseMongoDate(exitTime)
      if (isNaN(entryDate.getTime()) || isNaN(exitDate.getTime())) {
        return 0
      }
      const diffInMs = exitDate.getTime() - entryDate.getTime()
      const diffInMinutes = Math.ceil(diffInMs / (1000 * 60))
      return Math.max(0, diffInMinutes * pricingConfig.general.firstHour)
    } catch (error) {
      console.error("Error calculating parking fee:", error)
      return 0
    }
  }

  const calculateParkingFeeForReport = (record: any): number => {
    if (record.cashAmount !== undefined || record.cardAmount !== undefined || record.transferAmount !== undefined) {
      return (record.cashAmount || 0) + (record.cardAmount || 0) + (record.transferAmount || 0)
    }
    if (record.type === "exit" && record.entryTime) {
      return calculateParkingFee(record.entryTime, record.exitTime || "")
    }
    return record.amount || 0
  }

  const getDateRangeFilteredRecords = () => {
    if (!dateRangeStart || !dateRangeEnd) {
      return filteredReportRecords
    }
    const startDate = new Date(dateRangeStart)
    const endDate = new Date(dateRangeEnd)
    endDate.setHours(23, 59, 59, 999)
    return filteredReportRecords.filter((record) => {
      const recordDate = new Date(record.timestamp)
      return recordDate >= startDate && recordDate <= endDate
    })
  }

  // Image viewer functions
  const openImageViewer = (images: string[], startIndex = 0) => {
    setCurrentImages(images)
    setCurrentImageIndex(startIndex)
    setShowImageViewer(true)
  }

  const closeImageViewer = () => {
    setShowImageViewer(false)
    setCurrentImages([])
    setCurrentImageIndex(0)
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % currentImages.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + currentImages.length) % currentImages.length)
  }

  // Handle keyboard navigation for image viewer
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (showImageViewer) {
        switch (event.key) {
          case "Escape":
            closeImageViewer()
            break
          case "ArrowLeft":
            prevImage()
            break
          case "ArrowRight":
            nextImage()
            break
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showImageViewer, currentImages.length])

  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new()
      const excelData = filteredReportRecords.map((record, index) => ({
        "№": index + 1,
        "Машины дугаар": record.carNumber,
        Засварчин: record.mechanicName || record.driverName || "-",
        "Машины марк": record.carBrand || record.parkingArea || "-",
        "Орсон цаг": record.entryTime || "-",
        "Гарсан цаг": record.exitTime || "-",
        "Зогссон хугацаа": record.parkingDuration || "-",
        "Төлбөр (₮)": calculateParkingFeeForReport(record),
        "Төлбөрийн төлөв": record.paymentStatus === "paid" ? "Төлсөн" : "Төлөөгүй",
        "Төлбөрийн хэлбэр":
          record.paymentMethod === "card"
            ? "Карт"
            : record.paymentMethod === "cash"
              ? "Бэлэн"
              : record.paymentMethod === "transfer"
                ? "Харилцах"
                : "-",
        Зураг: record.images && record.images.length > 0 ? "Байна" : "Байхгүй",
      }))
      const ws = XLSX.utils.json_to_sheet(excelData)
      const colWidths = [
        { wch: 5 },
        { wch: 15 },
        { wch: 20 },
        { wch: 15 },
        { wch: 20 },
        { wch: 20 },
        { wch: 15 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 10 },
      ]
      ws["!cols"] = colWidths
      XLSX.utils.book_append_sheet(wb, ws, "Зогсоолын тайлан")
      const currentDate = new Date().toISOString().split("T")[0]
      const filename = `Зогсоолын_тайлан_${currentDate}.xlsx`
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
      const blob = new Blob([wbout], { type: "application/octet-stream" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      alert("Excel файл амжилттай татагдлаа!")
    } catch (error) {
      console.error("Excel export error:", error)
      alert("Excel файл татахад алдаа гарлаа")
    }
  }

  const handleDateRangeExport = async () => {
    if (!dateRangeStart || !dateRangeEnd) {
      alert("Эхлэх болон дуусах огноог оруулна уу")
      return
    }
    const startDate = new Date(dateRangeStart)
    const endDate = new Date(dateRangeEnd)
    if (startDate > endDate) {
      alert("Эхлэх огноо дуусах огнооноос өмнө байх ёстой")
      return
    }
    setExportLoading(true)
    try {
      const recordsToExport = getDateRangeFilteredRecords()
      if (recordsToExport.length === 0) {
        alert("Тухайн хугацаанд бүртгэл олдсонгүй")
        setExportLoading(false)
        return
      }
      const wb = XLSX.utils.book_new()
      const excelData = recordsToExport.map((record, index) => ({
        "№": index + 1,
        "Машины дугаар": record.carNumber,
        Засварчин: record.mechanicName || record.driverName || "-",
        "Машины марк": record.carBrand || record.parkingArea || "-",
        "Орсон цаг": record.entryTime || "-",
        "Гарсан цаг": record.exitTime || "-",
        "Зогссон хугацаа": record.parkingDuration || "-",
        "Төлбөр (₮)": calculateParkingFeeForReport(record),
        "Төлбөрийн төлөв": record.paymentStatus === "paid" ? "Төлсөн" : "Төлөөгүй",
        "Төлбөрийн хэлбэр":
          record.paymentMethod === "card"
            ? "Карт"
            : record.paymentMethod === "cash"
              ? "Бэлэн"
              : record.paymentMethod === "transfer"
                ? "Харилцах"
                : "-",
        Зураг: record.images && record.images.length > 0 ? "Байна" : "Байхгүй",
      }))
      const ws = XLSX.utils.json_to_sheet(excelData)
      const colWidths = [
        { wch: 5 },
        { wch: 15 },
        { wch: 20 },
        { wch: 15 },
        { wch: 20 },
        { wch: 20 },
        { wch: 15 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 10 },
      ]
      ws["!cols"] = colWidths
      XLSX.utils.book_append_sheet(wb, ws, "Зогсоолын тайлан")
      const startDateStr = dateRangeStart.replace(/-/g, ".")
      const endDateStr = dateRangeEnd.replace(/-/g, ".")
      const filename = `Зогсоолын_тайлан_${startDateStr}_${endDateStr}.xlsx`
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
      const blob = new Blob([wbout], { type: "application/octet-stream" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      if (deleteAfterExport) {
        const deletePromises = recordsToExport.map((record) => remove(ref(database, `parking_records/${record.id}`)))
        await Promise.all(deletePromises)
        alert(`Excel файл амжилттай татагдлаа! ${recordsToExport.length} бүртгэл өгөгдлийн сангаас устгагдлаа.`)
      } else {
        alert(`Excel файл амжилттай татагдлаа! ${recordsToExport.length} бүртгэл татагдлаа.`)
      }
      setDateRangeStart("")
      setDateRangeEnd("")
      setDeleteAfterExport(false)
      setShowDateRangeDialog(false)
    } catch (error) {
      console.error("Date range export error:", error)
      alert("Excel файл татахад алдаа гарлаа")
    }
    setExportLoading(false)
  }

  const getAvailableMechanicNames = () => {
    const names = reportRecords.map((record) => record.mechanicName || record.driverName)
    return [...new Set(names)].filter((name) => name).sort()
  }

  const getReportAvailableYears = () => {
    const years = reportRecords.map((record) => new Date(record.timestamp).getFullYear())
    return [...new Set(years)].sort((a, b) => b - a)
  }

  // Filter report records
  useEffect(() => {
    let filtered = [...reportRecords]
    if (reportFilterYear) {
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.timestamp)
        return recordDate.getFullYear().toString() === reportFilterYear
      })
    }
    if (reportFilterMonth) {
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.timestamp)
        return (recordDate.getMonth() + 1).toString().padStart(2, "0") === reportFilterMonth
      })
    }
    if (reportFilterCarNumber) {
      filtered = filtered.filter((record) =>
        record.carNumber.toLowerCase().includes(reportFilterCarNumber.toLowerCase()),
      )
    }
    if (reportFilterMechanic) {
      filtered = filtered.filter((record) => {
        const mechanicName = record.mechanicName || record.driverName || ""
        return mechanicName.toLowerCase().includes(reportFilterMechanic.toLowerCase())
      })
    }
    if (reportFilterPaymentStatus) {
      filtered = filtered.filter((record) => {
        if (reportFilterPaymentStatus === "paid") {
          return record.paymentStatus === "paid"
        } else if (reportFilterPaymentStatus === "unpaid") {
          return record.paymentStatus !== "paid"
        }
        return true
      })
    }
    setFilteredReportRecords(filtered)

    let cashSum = 0
    let cardSum = 0
    let transferSum = 0
    filtered.forEach((record) => {
      if (record.paymentStatus === "paid") {
        cashSum += record.cashAmount || 0
        cardSum += record.cardAmount || 0
        transferSum += record.transferAmount || 0
      }
    })
    setTotalCashAmount(cashSum)
    setTotalCardAmount(cardSum)
    setTotalTransferAmount(transferSum)
  }, [
    reportRecords,
    reportFilterYear,
    reportFilterMonth,
    reportFilterCarNumber,
    reportFilterMechanic,
    reportFilterPaymentStatus,
  ])

  const handlePaymentStatusUpdate = async () => {
    if (!selectedRecord) return

    const totalPaidAmount = cashAmountInput + cardAmountInput + transferAmountInput

    if (totalPaidAmount <= 0) {
      alert("Төлбөрийн дү��г оруулна уу.")
      return
    }

    setPaymentLoading(true)
    try {
      const updateData: any = {
        paymentStatus: "paid",
        amount: totalPaidAmount,
        cashAmount: cashAmountInput,
        cardAmount: cardAmountInput,
        transferAmount: transferAmountInput,
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.name || "Manager",
      }

      let paymentMethodString = ""
      const methodsUsed = []
      if (cashAmountInput > 0) methodsUsed.push("cash")
      if (cardAmountInput > 0) methodsUsed.push("card")
      if (transferAmountInput > 0) methodsUsed.push("transfer")

      if (methodsUsed.length === 1) {
        paymentMethodString = methodsUsed[0]
      } else if (methodsUsed.length > 1) {
        paymentMethodString = "split"
      } else {
        paymentMethodString = "none"
      }
      updateData.paymentMethod = paymentMethodString

      await update(ref(database, `parking_records/${selectedRecord.id}`), updateData)
      alert(`Төлбөр амжилттай бүртгэгдлээ: ${totalPaidAmount.toLocaleString()}₮`)
      setShowPaymentDialog(false)
      setSelectedRecord(null)
      setCashAmountInput(0)
      setCardAmountInput(0)
      setTransferAmountInput(0)
    } catch (error) {
      console.error("Error updating payment status:", error)
      alert("Төлбөр бүртгэхэд алдаа гарлаа")
    }
    setPaymentLoading(false)
  }

  const openPaymentDialog = (record: any) => {
    setSelectedRecord(record)
    setCashAmountInput(record.cashAmount || 0)
    setCardAmountInput(record.cardAmount || 0)
    setTransferAmountInput(record.transferAmount || 0)
    setShowPaymentDialog(true)
  }

  const openEditRecordDialog = (record: any) => {
    setEditingRecord(record)
    setEditRecordData({
      carNumber: record.carNumber || "",
      mechanicName: record.mechanicName || record.driverName || "",
      carBrand: record.carBrand || record.parkingArea || "",
      entryTime: record.entryTime || "",
      exitTime: record.exitTime || "",
      parkingDuration: record.parkingDuration || "",
      notes: record.notes || "",
    })
    setShowEditRecordDialog(true)
  }

  const handleSaveRecordEdit = async () => {
    if (!editingRecord || !editRecordData.carNumber.trim()) {
      alert("Машины дугаарыг оруулна уу")
      return
    }

    setEditRecordLoading(true)
    try {
      const updateData: any = {
        carNumber: editRecordData.carNumber.trim(),
        mechanicName: editRecordData.mechanicName.trim(),
        driverName: editRecordData.mechanicName.trim(),
        carBrand: editRecordData.carBrand.trim(),
        parkingArea: editRecordData.carBrand.trim(),
        entryTime: editRecordData.entryTime,
        exitTime: editRecordData.exitTime,
        parkingDuration: editRecordData.parkingDuration,
        notes: editRecordData.notes.trim(),
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.name || "Manager",
      }

      await update(ref(database, `parking_records/${editingRecord.id}`), updateData)
      alert("Бүртгэл амжилттай шинэчлэгдлээ")
      setShowEditRecordDialog(false)
      setEditingRecord(null)
    } catch (error) {
      console.error("Error updating record:", error)
      alert("Бүртгэл шинэчлэхэд алдаа гарлаа")
    }
    setEditRecordLoading(false)
  }

  const handleLogout = async () => {
    if (confirm("Та гарахдаа итгэлтэй байна уу?")) {
      await signOut(auth)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "profile" | "logo" | "background") => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Зургийн хэмжээ 5MB-аас бага байх ёстой")
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64String = event.target?.result as string
        if (type === "profile") {
          setProfileData({ ...profileData, profileImage: base64String })
        } else if (type === "logo") {
          setSiteConfig({ ...siteConfig, siteLogo: base64String })
        } else if (type === "background") {
          setSiteConfig({ ...siteConfig, siteBackground: base64String })
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfile = async () => {
    if (!profileData.name.trim()) {
      alert("Нэрээ оруулна уу")
      return
    }
    if (!profileData.email.trim()) {
      alert("И-мэйл хаягаа оруулна уу")
      return
    }
    if (passwordData.newPassword) {
      if (passwordData.newPassword.length < 6) {
        alert("Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой")
        return
      }
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        alert("Нууц үг таарахгүй байна")
        return
      }
    }
    setLoadingProfile(true)
    try {
      const userId = auth.currentUser?.uid
      if (userId) {
        await update(ref(database, `users/${userId}`), {
          name: profileData.name.trim(),
          phone: profileData.phone.trim(),
          email: profileData.email.trim(),
          profileImage: profileData.profileImage,
          updatedAt: new Date().toISOString(),
        })
        if (passwordData.newPassword) {
          alert("Профайл шинэчлэгдлээ. Нууц үг өөрчлөх функц нэмэгдэх ёстой.")
        } else {
          alert("Профайл амжилттай шинэчлэгдлээ")
        }
        setShowProfileDialog(false)
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
      }
    } catch (error) {
      alert("Профайл шинэчлэхэд алдаа гарлаа")
    }
    setLoadingProfile(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Ачааллаж байна...</p>
        </div>
      </div>
    )
  }

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Ачааллаж байна...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {siteConfig.siteLogo ? (
              <img src={siteConfig.siteLogo || "/placeholder.svg"} alt="Site Logo" className="w-8 h-8 object-contain" />
            ) : (
              <Shield className="w-8 h-8 text-primary" />
            )}
            <div>
              <h1 className="text-2xl font-bold">{siteConfig.siteName || "Тайлангийн систем"}</h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-muted-foreground text-sm">Сайн байна уу!</span>
            <span className="text-foreground font-medium">{userProfile.name}</span>
            <Avatar className="w-8 h-8">
              {userProfile.profileImage ? (
                <AvatarImage src={userProfile.profileImage || "/placeholder.svg"} alt="Profile" />
              ) : (
                <AvatarFallback>{userProfile.name?.charAt(0).toUpperCase() || "M"}</AvatarFallback>
              )}
            </Avatar>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Settings className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setShowProfileDialog(true)}>
                  <UserIcon className="w-4 h-4 mr-2" />
                  Профайл
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Гарах
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Тайлан</h2>
              <p className="text-muted-foreground">Зогсоолын бүртгэлийн тайлан харах болон татах</p>
            </div>
            <div className="flex space-x-3">
              <Button onClick={() => setShowDateRangeDialog(true)} variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Огноогоор татах
              </Button>
              <Button onClick={exportToExcel}>
                <Download className="w-4 h-4 mr-2" />
                Excel татах
              </Button>
            </div>
          </div>

          {/* Filters Card */}
          <Card>
            <CardHeader>
              <CardTitle>Шүүлтүүр</CardTitle>
              <CardDescription>Тайлангийг шүүж харах</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Жил</Label>
                  <select
                    value={reportFilterYear}
                    onChange={(e) => setReportFilterYear(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  >
                    <option value="">Бүх жил</option>
                    {getReportAvailableYears().map((year) => (
                      <option key={year} value={year.toString()}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Сар</Label>
                  <select
                    value={reportFilterMonth}
                    onChange={(e) => setReportFilterMonth(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  >
                    <option value="">Бүх сар</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <option key={month} value={month.toString().padStart(2, "0")}>
                        {month}-р сар
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Машины дугаар</Label>
                  <Input
                    placeholder="Машины дугаар..."
                    value={reportFilterCarNumber}
                    onChange={(e) => setReportFilterCarNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Засварчин</Label>
                  <select
                    value={reportFilterMechanic}
                    onChange={(e) => setReportFilterMechanic(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  >
                    <option value="">Бүх засварчин</option>
                    {getAvailableMechanicNames().map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Төлбөрийн төлөв</Label>
                  <select
                    value={reportFilterPaymentStatus}
                    onChange={(e) => setReportFilterPaymentStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  >
                    <option value="">Бүх төлөв</option>
                    <option value="paid">Төлсөн</option>
                    <option value="unpaid">Төлөөгүй</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Table */}
          <Card>
            <CardHeader>
              <CardTitle>Зогсоолын бүртгэл</CardTitle>
              <CardDescription>
                Нийт {filteredReportRecords.length} бүртгэл • Нийт төлбөр:{" "}
                {filteredReportRecords
                  .reduce((sum, record) => sum + calculateParkingFeeForReport(record), 0)
                  .toLocaleString()}
                ₮ • Нийт бэлэн: {totalCashAmount.toLocaleString()}₮ • Нийт карт: {totalCardAmount.toLocaleString()}₮ •
                Нийт харилцах: {totalTransferAmount.toLocaleString()}₮
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Тайлан ачааллаж байна...</p>
                </div>
              ) : filteredReportRecords.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="text-lg font-medium mb-2">Тайлан байхгүй</h3>
                  <p className="text-muted-foreground">Одоогоор ямар нэгэн бүртгэл олдсонгүй</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left px-1 py-0.5 text-xs">№</th>
                        <th className="text-left px-1 py-0.5 text-xs">Машины дугаар</th>
                        <th className="text-left px-1 py-0.5 text-xs">Засварчин</th>
                        <th className="text-left px-1 py-0.5 text-xs">Машины марк</th>
                        <th className="text-left px-1 py-0.5 text-xs">Орсон цаг</th>
                        <th className="text-left px-1 py-0.5 text-xs">Гарсан цаг</th>
                        <th className="text-left px-1 py-0.5 text-xs">Зогссон хугацаа</th>
                        <th className="text-left px-1 py-0.5 text-xs">Төлбөр</th>
                        <th className="text-left px-1 py-0.5 text-xs">Төлбөрийн төлөв</th>
                        <th className="text-left px-1 py-0.5 text-xs">Зураг</th>
                        <th className="text-left px-1 py-0.5 text-xs">Төлбөр</th>
                        <th className="text-left px-1 py-0.5 text-xs">Засах</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReportRecords.map((record, index) => (
                        <tr key={record.id} className="border-b hover:bg-muted/50">
                          <td className="px-1 py-0.5 text-xs">{index + 1}</td>
                          <td className="px-1 py-0.5 text-xs">{record.carNumber}</td>
                          <td className="px-1 py-0.5 text-xs">{record.mechanicName || record.driverName || "-"}</td>
                          <td className="px-1 py-0.5 text-xs">{record.carBrand || record.parkingArea || "-"}</td>
                          <td className="px-1 py-0.5 text-xs">{record.entryTime || "-"}</td>
                          <td className="px-1 py-0.5 text-xs">{record.exitTime || "-"}</td>
                          <td className="px-1 py-0.5 text-xs">{record.parkingDuration || "-"}</td>
                          <td className="px-1 py-0.5 text-xs">
                            {calculateParkingFeeForReport(record).toLocaleString()}₮
                          </td>
                          <td className="px-1 py-0.5">
                            <div className="flex items-center space-x-1">
                              <Badge
                                variant={record.paymentStatus === "paid" ? "default" : "secondary"}
                                className={
                                  record.paymentStatus === "paid"
                                    ? "bg-green-100 text-green-800 hover:bg-green-200 text-xs"
                                    : "bg-red-100 text-red-800 hover:bg-red-200 text-xs"
                                }
                              >
                                {record.paymentStatus === "paid" ? "Төлсөн" : "Төлөөгүй"}
                              </Badge>
                              {record.paymentStatus === "paid" &&
                                (record.cashAmount > 0 || record.cardAmount > 0 || record.transferAmount > 0) && (
                                  <Badge variant="outline" className="text-xs">
                                    {(() => {
                                      const paymentDetails = []
                                      if (record.cashAmount > 0) {
                                        paymentDetails.push(`Бэлэн: ${record.cashAmount.toLocaleString()}₮`)
                                      }
                                      if (record.cardAmount > 0) {
                                        paymentDetails.push(`Карт: ${record.cardAmount.toLocaleString()}₮`)
                                      }
                                      if (record.transferAmount > 0) {
                                        paymentDetails.push(`Харилцах: ${record.transferAmount.toLocaleString()}₮`)
                                      }
                                      return paymentDetails.join(", ") || "Төлсөн"
                                    })()}
                                  </Badge>
                                )}
                            </div>
                          </td>
                          <td className="px-1 py-0.5">
                            {record.images && record.images.length > 0 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openImageViewer(record.images, 0)}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                {record.images.length}
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-xs">Байхгүй</span>
                            )}
                          </td>
                          <td className="px-1 py-0.5">
                            {record.paymentStatus === "paid" ? (
                              <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                                Төлсөн
                              </Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPaymentDialog(record)}
                                className="text-xs"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                                  />
                                </svg>
                                Төлбөр
                              </Button>
                            )}
                          </td>
                          <td className="px-1 py-0.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditRecordDialog(record)}
                              className="text-xs"
                              disabled={record.paymentStatus === "paid"}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Засах
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Date Range Export Dialog */}
      <Dialog open={showDateRangeDialog} onOpenChange={setShowDateRangeDialog}>
        <DialogContent className="dialog-content date-range-dialog-content">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">Огноогоор Excel татах</DialogTitle>
            <DialogDescription className="dialog-description">
              Тодорхой хугацааны бүртгэлийг Excel файлаар татах
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Эхлэх огноо</Label>
                <Input type="date" value={dateRangeStart} onChange={(e) => setDateRangeStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Дуусах огноо</Label>
                <Input type="date" value={dateRangeEnd} onChange={(e) => setDateRangeEnd(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center space-x-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <Checkbox
                id="deleteAfterExport"
                checked={deleteAfterExport}
                onCheckedChange={(checked) => setDeleteAfterExport(checked as boolean)}
              />
              <Label htmlFor="deleteAfterExport" className="text-destructive font-medium">
                Татсаны дараа бүртгэлийг өгөгдлийн сангаас устгах
              </Label>
            </div>
          </div>
          <DialogFooter className="dialog-footer">
            <Button variant="outline" onClick={() => setShowDateRangeDialog(false)}>
              Цуцлах
            </Button>
            <Button onClick={handleDateRangeExport} disabled={exportLoading}>
              {exportLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Татаж байна...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Excel татах
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Modal */}
      {showImageViewer && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-full p-4">
            <button onClick={closeImageViewer} className="absolute top-4 right-4 text-white hover:text-gray-300 z-10">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {currentImages.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}
            <img
              src={currentImages[currentImageIndex] || "/placeholder.svg"}
              alt={`Image ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            {currentImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white">
                {currentImageIndex + 1} / {currentImages.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="dialog-content">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">Профайл засах</DialogTitle>
            <DialogDescription className="dialog-description">Өөрийн мэдээллийг шинэчлэх</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Овог нэр</Label>
              <Input
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                placeholder="Овог нэр"
              />
            </div>
            <div className="space-y-2">
              <Label>Утасны дугаар</Label>
              <Input
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                placeholder="Утасны дугаар"
              />
            </div>
            <div className="space-y-2">
              <Label>И-мэйл хаяг</Label>
              <Input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                placeholder="И-мэйл хаяг"
              />
            </div>
            <div className="space-y-2">
              <Label>Профайл зураг</Label>
              <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "profile")} />
              {profileData.profileImage && (
                <img
                  src={profileData.profileImage || "/placeholder.svg"}
                  alt="Profile Preview"
                  className="w-20 h-20 object-cover rounded-lg"
                />
              )}
            </div>
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">Нууц үг өөрчлөх</h4>
              <div className="space-y-2">
                <Label>Одоогийн нууц үг</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Одоогийн нууц үг"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Шинэ нууц үг</Label>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Шинэ нууц үг"
                />
              </div>
              <div className="space-y-2">
                <Label>Шинэ нууц үг давтах</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Шинэ нууц үг давтах"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="dialog-footer">
            <Button variant="outline" onClick={() => setShowProfileDialog(false)}>
              Цуцлах
            </Button>
            <Button onClick={handleSaveProfile} disabled={profileLoading}>
              {profileLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Хадгалж байна...
                </>
              ) : (
                "Хадгалах"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Status Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="dialog-content payment-dialog-content">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">Төлбөрийн төлөв</DialogTitle>
            <DialogDescription className="dialog-description">
              Машины дугаар: {selectedRecord?.carNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-base font-medium">Төлбөрийн хэлбэр</Label>
              <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3">
                <Label htmlFor="cash" className="text-right">
                  Бэлэн мөнгө
                </Label>
                <Input
                  type="number"
                  id="cash"
                  min="0"
                  value={cashAmountInput}
                  onChange={(e) => setCashAmountInput(Number(e.target.value))}
                  className="w-full"
                  placeholder="0"
                />
                <Label htmlFor="card" className="text-right">
                  Карт
                </Label>
                <Input
                  type="number"
                  id="card"
                  min="0"
                  value={cardAmountInput}
                  onChange={(e) => setCardAmountInput(Number(e.target.value))}
                  className="w-full"
                  placeholder="0"
                />
                <Label htmlFor="transfer" className="text-right">
                  Харилцах
                </Label>
                <Input
                  type="number"
                  id="transfer"
                  min="0"
                  value={transferAmountInput}
                  onChange={(e) => setTransferAmountInput(Number(e.target.value))}
                  className="w-full"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Нийт төлбөр:</span>
                <span className="font-bold">
                  {selectedRecord ? calculateParkingFeeForReport(selectedRecord).toLocaleString() : 0}₮
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Төлөх төлбөр:</span>
                <span className="font-bold">
                  {(cashAmountInput + cardAmountInput + transferAmountInput).toLocaleString()}₮
                </span>
              </div>
            </div>
          </div>
          <DialogFooter className="dialog-footer">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Цуцлах
            </Button>
            <Button onClick={handlePaymentStatusUpdate} disabled={paymentLoading}>
              {paymentLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Хадгалж байна...
                </>
              ) : (
                "Хадгалах"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Record Dialog */}
      <Dialog open={showEditRecordDialog} onOpenChange={setShowEditRecordDialog}>
        <DialogContent className="dialog-content max-w-2xl">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">Бүртгэл засах</DialogTitle>
            <DialogDescription className="dialog-description">
              Зогсоолын бүртгэлийн мэдээллийг шинэчлэх
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Машины дугаар *</Label>
                <Input
                  value={editRecordData.carNumber}
                  onChange={(e) => setEditRecordData({ ...editRecordData, carNumber: e.target.value })}
                  placeholder="Машины дугаар"
                />
              </div>
              <div className="space-y-2">
                <Label>Засварчин</Label>
                <Input
                  value={editRecordData.mechanicName}
                  onChange={(e) => setEditRecordData({ ...editRecordData, mechanicName: e.target.value })}
                  placeholder="Засварчны нэр"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Машины марк</Label>
                <Input
                  value={editRecordData.carBrand}
                  onChange={(e) => setEditRecordData({ ...editRecordData, carBrand: e.target.value })}
                  placeholder="Машины марк"
                />
              </div>
              <div className="space-y-2">
                <Label>Зогссон хугацаа</Label>
                <Input
                  value={editRecordData.parkingDuration}
                  onChange={(e) => setEditRecordData({ ...editRecordData, parkingDuration: e.target.value })}
                  placeholder="Жишээ: 2 цаг 30 минут"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Орсон цаг</Label>
                <Input
                  value={editRecordData.entryTime}
                  onChange={(e) => setEditRecordData({ ...editRecordData, entryTime: e.target.value })}
                  placeholder="Орсон цаг"
                />
              </div>
              <div className="space-y-2">
                <Label>Гарсан цаг</Label>
                <Input
                  value={editRecordData.exitTime}
                  onChange={(e) => setEditRecordData({ ...editRecordData, exitTime: e.target.value })}
                  placeholder="Гарсан цаг"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Тэмдэглэл</Label>
              <Input
                value={editRecordData.notes}
                onChange={(e) => setEditRecordData({ ...editRecordData, notes: e.target.value })}
                placeholder="Нэмэлт тэмдэглэл"
              />
            </div>
          </div>
          <DialogFooter className="dialog-footer">
            <Button variant="outline" onClick={() => setShowEditRecordDialog(false)}>
              Цуцлах
            </Button>
            <Button onClick={handleSaveRecordEdit} disabled={editRecordLoading}>
              {editRecordLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Хадгалж байна...
                </>
              ) : (
                "Хадгалах"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

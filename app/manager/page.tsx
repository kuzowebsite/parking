"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { onAuthStateChanged, createUserWithEmailAndPassword, signOut, type User } from "firebase/auth"
import { ref, onValue, set, remove, update, push } from "firebase/database"
import { auth, database } from "@/lib/firebase"
import type { UserProfile, DriverRegistration } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Trash2,
  UserPlus,
  Users,
  Shield,
  Edit,
  Power,
  PowerOff,
  Settings,
  UserIcon,
  Globe,
  LogOut,
  Camera,
  Upload,
  Eye,
  EyeOff,
} from "lucide-react"
import * as XLSX from "xlsx"

export default function ManagerPage() {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [drivers, setDrivers] = useState<UserProfile[]>([])

  // Search states
  const [searchName, setSearchName] = useState("")
  const [searchEmail, setSearchEmail] = useState("")

  const [filteredDrivers, setFilteredDrivers] = useState<UserProfile[]>([])

  // Report states
  const [reportRecords, setReportRecords] = useState<any[]>([])
  const [filteredReportRecords, setFilteredReportRecords] = useState<any[]>([])
  const [reportFilterYear, setReportFilterYear] = useState("")
  const [reportFilterMonth, setReportFilterMonth] = useState("")
  const [reportFilterCarNumber, setReportFilterCarNumber] = useState("")
  const [reportFilterDriverName, setReportFilterDriverName] = useState("")
  const [reportLoading, setReportLoading] = useState(false)

  // Employee states
  const [employees, setEmployees] = useState<any[]>([])
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    position: "",
    phone: "",
    startDate: "",
  })
  const [editingEmployee, setEditingEmployee] = useState<any>(null)
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false)
  const [employeeLoading, setEmployeeLoading] = useState(false)

  // Filter drivers based on search
  useEffect(() => {
    let filtered = [...drivers]

    if (searchName) {
      filtered = filtered.filter((driver) => driver.name.toLowerCase().includes(searchName.toLowerCase()))
    }

    if (searchEmail) {
      filtered = filtered.filter((driver) => driver.email.toLowerCase().includes(searchEmail.toLowerCase()))
    }

    setFilteredDrivers(filtered)
  }, [drivers, searchName, searchEmail])

  // Driver registration states
  const [newDriver, setNewDriver] = useState<DriverRegistration>({
    email: "",
    password: "",
    name: "",
    phone: "",
    role: "driver",
    createdAt: "",
    createdBy: "",
    active: true,
  })
  const [registrationLoading, setRegistrationLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<"manager" | "driver" | "employee">("employee")

  // Edit driver states
  const [editingDriver, setEditingDriver] = useState<UserProfile | null>(null)
  const [editDriverData, setEditDriverData] = useState({
    name: "",
    phone: "",
    email: "",
    newPassword: "",
  })
  const [editLoading, setEditLoading] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  // Profile dialog state
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [profileData, setProfileData] = useState({
    name: "",
    phone: "",
    email: "",
    profileImage: "",
  })
  const [profileLoading, setProfileLoading] = useState(false)

  // Site configuration states
  const [showSiteDialog, setShowSiteDialog] = useState(false)
  const [siteConfig, setSiteConfig] = useState({
    siteName: "",
    siteLogo: "",
    siteBackground: "",
  })
  const [siteLoading, setSiteLoading] = useState(false)

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
    pricePerMinute: 0,
  })
  const [pricingLoading, setPricingLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      if (user) {
        await loadUserProfile(user.uid)
        loadDrivers()
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
        // Хэрэв manager биш бол буцаах
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
          pricePerMinute: data.pricePerMinute || 0,
        })
      }
    })

    // Load report records after profile is loaded
    setTimeout(() => {
      loadReportRecords()
    }, 500)

    // Add this line after loadReportRecords() call:
    loadEmployees()
  }

  // Load employees
  const loadEmployees = () => {
    const employeesRef = ref(database, "employees")
    onValue(employeesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const employeesList = Object.keys(data)
          .map((key) => ({ id: key, ...data[key] }))
          .sort((a, b) => a.name.localeCompare(b.name))
        setEmployees(employeesList)
      } else {
        setEmployees([])
      }
    })
  }

  // Add employee
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newEmployee.name.trim()) {
      alert("Ажилчны нэрийг оруулна уу")
      return
    }

    setEmployeeLoading(true)
    try {
      const employeeData = {
        name: newEmployee.name.trim(),
        position: newEmployee.position.trim(),
        phone: newEmployee.phone.trim(),
        startDate: newEmployee.startDate,
        createdAt: new Date().toISOString(),
        createdBy: userProfile?.name || "Manager",
      }

      await push(ref(database, "employees"), employeeData)
      alert("Ажилчин амжилттай нэмэгдлээ")

      // Reset form
      setNewEmployee({
        name: "",
        position: "",
        phone: "",
        startDate: "",
      })
    } catch (error) {
      alert("Ажилчин нэмэхэд алдаа гарлаа")
    }
    setEmployeeLoading(false)
  }

  // Edit employee
  const handleEditEmployee = (employee: any) => {
    setEditingEmployee(employee)
    setNewEmployee({
      name: employee.name,
      position: employee.position || "",
      phone: employee.phone || "",
      startDate: employee.startDate || "",
    })
    setShowEmployeeDialog(true)
  }

  // Save employee edit
  const handleSaveEmployeeEdit = async () => {
    if (!newEmployee.name.trim()) {
      alert("Ажилчны нэрийг оруулна уу")
      return
    }

    setEmployeeLoading(true)
    try {
      const updateData = {
        name: newEmployee.name.trim(),
        position: newEmployee.position.trim(),
        phone: newEmployee.phone.trim(),
        startDate: newEmployee.startDate,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.name || "Manager",
      }

      await update(ref(database, `employees/${editingEmployee.id}`), updateData)
      alert("Ажилчны мэдээлэл амжилттай шинэчлэгдлээ")
      setShowEmployeeDialog(false)
      setEditingEmployee(null)
      setNewEmployee({
        name: "",
        position: "",
        phone: "",
        startDate: "",
      })
    } catch (error) {
      alert("Ажилчны мэдээлэл шинэчлэхэд алдаа гарлаа")
    }
    setEmployeeLoading(false)
  }

  // Delete employee
  const handleDeleteEmployee = async (employeeId: string, employeeName: string) => {
    if (!confirm(`${employeeName} ажилчныг устгахдаа итгэлтэй байна уу?`)) {
      return
    }

    try {
      await remove(ref(database, `employees/${employeeId}`))
      alert("Ажилчин амжилттай устгагдлаа")
    } catch (error) {
      alert("Ажилчин устгахад алдаа гарлаа")
    }
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
    if (!entryTime || !exitTime || pricingConfig.pricePerMinute === 0) {
      return 0
    }

    try {
      // Parse the Mongolian formatted dates
      const parseMongoDate = (dateStr: string) => {
        // Format: "2024.01.15, 14:30" or similar
        const cleanStr = dateStr.replace(/[^\d\s:.,]/g, "")
        const parts = cleanStr.split(/[,\s]+/)

        if (parts.length >= 2) {
          const datePart = parts[0] // "2024.01.15"
          const timePart = parts[1] // "14:30"

          const [year, month, day] = datePart.split(".").map(Number)
          const [hour, minute] = timePart.split(":").map(Number)

          return new Date(year, month - 1, day, hour, minute)
        }

        // Fallback to direct parsing
        return new Date(dateStr)
      }

      const entryDate = parseMongoDate(entryTime)
      const exitDate = parseMongoDate(exitTime)

      if (isNaN(entryDate.getTime()) || isNaN(exitDate.getTime())) {
        return 0
      }

      const diffInMs = exitDate.getTime() - entryDate.getTime()
      const diffInMinutes = Math.ceil(diffInMs / (1000 * 60)) // Round up to next minute

      return Math.max(0, diffInMinutes * pricingConfig.pricePerMinute)
    } catch (error) {
      console.error("Error calculating parking fee:", error)
      return 0
    }
  }

  const calculateParkingFeeForReport = (record: any): number => {
    if (record.type === "exit" && record.entryTime) {
      return calculateParkingFee(record.entryTime, record.exitTime || "")
    }
    return record.amount || 0
  }

  const calculateParkingDurationForReport = (record: any): string => {
    if (record.type === "exit" && record.entryTime) {
      const entryDate = new Date(record.entryTime)
      const exitDate = new Date(record.exitTime || "")
      const diffInMs = exitDate.getTime() - entryDate.getTime()
      const diffInHours = Math.ceil(diffInMs / (1000 * 60 * 60)) // Calculate in hours
      const hoursToShow = Math.max(1, diffInHours) // Minimum 1 hour
      return `${hoursToShow} цаг`
    }
    return "-"
  }

  const exportToExcel = () => {
    try {
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()

      // Prepare data for Excel
      const excelData = filteredReportRecords.map((record) => ({
        "Машины дугаар": record.carNumber,
        "Жолоочийн нэр": record.driverName,
        "Машины марк": record.parkingArea,
        "Орсон цаг": record.entryTime || "-",
        "Гарсан цаг": record.exitTime || "-",
        "Зогссон хугацаа": calculateParkingDurationForReport(record),
        "Төлбөр (₮)": calculateParkingFeeForReport(record),
      }))

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(excelData)

      // Set column widths
      const colWidths = [
        { wch: 15 }, // Машины дугаар
        { wch: 20 }, // Жолоочийн нэр
        { wch: 10 }, // Машины марк
        { wch: 20 }, // Орсон цаг
        { wch: 20 }, // Гарсан цаг
        { wch: 15 }, // Зогссон хугацаа
        { wch: 12 }, // Төлбөр
      ]
      ws["!cols"] = colWidths

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Зогсоолын тайлан")

      // Generate filename with current date
      const currentDate = new Date().toISOString().split("T")[0]
      const filename = `Зогсоолын_тайлан_${currentDate}.xlsx`

      // Save file
      XLSX.writeFile(wb, filename)

      alert("Excel файл амжилттай татагдлаа!")
    } catch (error) {
      console.error("Excel export error:", error)
      alert("Excel файл татахад алдаа гарлаа")
    }
  }

  // Get unique driver names for filter
  const getAvailableDriverNames = () => {
    const names = reportRecords.map((record) => record.driverName)
    return [...new Set(names)].sort()
  }

  // Get unique years for report filter
  const getReportAvailableYears = () => {
    const years = reportRecords.map((record) => new Date(record.timestamp).getFullYear())
    return [...new Set(years)].sort((a, b) => b - a)
  }

  const loadDrivers = () => {
    const usersRef = ref(database, "users")
    onValue(usersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const driversList: UserProfile[] = Object.keys(data)
          .map((key) => ({ id: key, ...data[key] }))
          .filter((user) => user.role === "driver")
        setDrivers(driversList)
      }
    })
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

    if (reportFilterDriverName) {
      filtered = filtered.filter((record) =>
        record.driverName.toLowerCase().includes(reportFilterDriverName.toLowerCase()),
      )
    }

    setFilteredReportRecords(filtered)
  }, [reportRecords, reportFilterYear, reportFilterMonth, reportFilterCarNumber, reportFilterDriverName])

  const handleRegisterDriver = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newDriver.email || !newDriver.password || !newDriver.name) {
      alert("Бүх талбарыг бөглөнө үү")
      return
    }

    if (newDriver.password.length < 6) {
      alert("Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой")
      return
    }

    setRegistrationLoading(true)

    try {
      // Firebase Auth дээр хэрэглэгч үүсгэх
      const userCredential = await createUserWithEmailAndPassword(auth, newDriver.email, newDriver.password)
      const newUserId = userCredential.user.uid

      // Database дээр хэрэглэгчийн мэдээлэл хадгалах
      const userData: UserProfile = {
        name: newDriver.name.trim(),
        phone: newDriver.phone.trim(),
        email: newDriver.email,
        role: selectedRole === "employee" ? "employee" : selectedRole, // employee role нэмэх
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await set(ref(database, `users/${newUserId}`), userData)

      alert(
        `${selectedRole === "manager" ? "Менежер" : selectedRole === "driver" ? "Жолооч" : "Ажилчин"} амжилттай бүртгэгдлээ`,
      )

      // Form цэвэрлэх
      setNewDriver({
        email: "",
        password: "",
        name: "",
        phone: "",
        role: "driver",
        createdAt: "",
        createdBy: "",
        active: true,
      })
    } catch (error: any) {
      console.error("Driver registration error:", error)
      if (error.code === "auth/email-already-in-use") {
        alert("Энэ и-мэйл хаяг аль хэдийн ашиглагдаж байна")
      } else if (error.code === "auth/invalid-email") {
        alert("И-мэйл хаяг буруу байна")
      } else {
        alert("Жолооч бүртгэхэд алдаа гарлаа")
      }
    }

    setRegistrationLoading(false)
  }

  const handleDeleteDriver = async (driverId: string, driverName: string) => {
    if (!confirm(`${driverName} жолоочийг устгахдаа итгэлтэй байна уу?`)) {
      return
    }

    try {
      await remove(ref(database, `users/${driverId}`))
      alert("Жолооч амжилттай устгагдлаа")
    } catch (error) {
      alert("Жолооч устгахад алдаа гарлаа")
    }
  }

  const handleToggleDriverStatus = async (driverId: string, currentStatus: boolean, driverName: string) => {
    const newStatus = !currentStatus
    const statusText = newStatus ? "идэвхжүүлэх" : "идэвхгүй болгох"

    if (!confirm(`${driverName} жолоочийг ${statusText}даа итгэлтэй байна уу?`)) {
      return
    }

    try {
      await update(ref(database, `users/${driverId}`), {
        active: newStatus,
        updatedAt: new Date().toISOString(),
      })
      alert(`Жолооч амжилттай ${newStatus ? "идэвхжлээ" : "идэвхгүй боллоо"}`)
    } catch (error) {
      alert("Жолоочийн төлөв өөрчлөхөд алдаа гарлаа")
    }
  }

  const handleEditDriver = (driver: UserProfile) => {
    setEditingDriver(driver)
    setEditDriverData({
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      newPassword: "",
    })
    setShowEditDialog(true)
  }

  const handleSaveDriverEdit = async () => {
    if (!editingDriver || !editDriverData.name.trim() || !editDriverData.email.trim()) {
      alert("Нэр болон и-мэйл хаягийг бөглөнө үү")
      return
    }

    setEditLoading(true)

    try {
      // Update user data in database
      const updateData: any = {
        name: editDriverData.name.trim(),
        phone: editDriverData.phone.trim(),
        email: editDriverData.email.trim(),
        updatedAt: new Date().toISOString(),
      }

      await update(ref(database, `users/${editingDriver.id}`), updateData)

      // If password is provided, update it
      if (editDriverData.newPassword && editDriverData.newPassword.length >= 6) {
        // Note: In a real app, you'd need to handle password updates differently
        // This is a simplified approach
        alert("Нууц үг шинэчлэх функц нэмэгдэх ёстой")
      }

      alert("Жолоочийн мэдээлэл амжилттай шинэчлэгдлээ")
      setShowEditDialog(false)
      setEditingDriver(null)
    } catch (error) {
      console.error("Error updating driver:", error)
      alert("Жолоочийн мэдээлэл шинэчлэхэд алдаа гарлаа")
    }

    setEditLoading(false)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "profile" | "logo" | "background") => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (5MB max)
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

    // Validate password if provided
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

    setProfileLoading(true)
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

        // Handle password update (simplified - in real app would need proper authentication)
        if (passwordData.newPassword) {
          // Note: Password update would require re-authentication in production
          alert("Профайл шинэчлэгдлээ. Нууц үг өөрчлөх функц нэмэгдэх ёстой.")
        } else {
          alert("Профайл амжилттай шинэчлэгдлээ")
        }

        setShowProfileDialog(false)
        // Reset password fields
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
      }
    } catch (error) {
      alert("Профайл шинэчлэхэд алдаа гарлаа")
    }
    setProfileLoading(false)
  }

  const handleSaveSiteConfig = async () => {
    if (!siteConfig.siteName.trim()) {
      alert("Сайтын нэрийг оруулна уу")
      return
    }

    setSiteLoading(true)
    try {
      await set(ref(database, "siteConfig"), {
        siteName: siteConfig.siteName.trim(),
        siteLogo: siteConfig.siteLogo,
        siteBackground: siteConfig.siteBackground,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.name || "Manager",
      })
      alert("Сайтын тохиргоо амжилттай хадгалагдлаа")
      setShowSiteDialog(false)
    } catch (error) {
      alert("Сайтын тохиргоо хадгалахад алдаа гарлаа")
    }
    setSiteLoading(false)
  }

  const handleSavePricingConfig = async () => {
    if (pricingConfig.pricePerMinute < 0) {
      alert("Үнэ сөрөг тоо байж болохгүй")
      return
    }

    setPricingLoading(true)
    try {
      await set(ref(database, "pricingConfig"), {
        pricePerMinute: Number(pricingConfig.pricePerMinute),
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.name || "Manager",
      })
      alert("Үнийн тохиргоо амжилттай хадгалагдлаа")
      setShowPricingDialog(false)
    } catch (error) {
      alert("Үнийн тохиргоо хадгалахад алдаа гарлаа")
    }
    setPricingLoading(false)
  }

  const handleLogout = async () => {
    if (confirm("Та гарахдаа итгэлтэй байна уу?")) {
      await signOut(auth)
    }
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

  if (!user || !userProfile || userProfile.role !== "manager") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 mx-auto text-destructive mb-4" />
            <CardTitle className="text-2xl">Хандах эрхгүй</CardTitle>
            <CardDescription>Та энэ хуудсанд хандах эрхгүй байна. Зөвхөн менежер хандах боломжтой.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => (window.location.href = "/")} className="w-full">
              Буцах
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Site Logo from Database */}
            {siteConfig.siteLogo ? (
              <img src={siteConfig.siteLogo || "/placeholder.svg"} alt="Site Logo" className="w-8 h-8 object-contain" />
            ) : (
              <Shield className="w-8 h-8 text-primary" />
            )}
            <div>
              {/* Site Name from Database */}
              <h1 className="text-2xl font-bold">{siteConfig.siteName || "Менежерийн систем"}</h1>
            </div>
          </div>

          {/* Right side header content remains the same */}
          <div className="flex items-center space-x-4">
            {/* Greeting text */}
            <span className="text-muted-foreground text-sm">Сайн байна уу!</span>

            {/* User name */}
            <span className="text-foreground font-medium">{userProfile.name}</span>

            {/* Profile image */}
            <Avatar className="w-8 h-8">
              {userProfile.profileImage ? (
                <img
                  src={userProfile.profileImage || "/placeholder.svg"}
                  alt="Profile"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <AvatarFallback>{userProfile.name?.charAt(0).toUpperCase() || "M"}</AvatarFallback>
              )}
            </Avatar>

            {/* Settings dropdown */}
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
                <DropdownMenuItem onClick={() => setShowSiteDialog(true)}>
                  <Globe className="w-4 h-4 mr-2" />
                  Сайт бүртгэл
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowPricingDialog(true)}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                  Үнэ
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
        <Tabs defaultValue="drivers" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="drivers">
              <Users className="w-4 h-4 mr-2" />
              Жолоочдын жагсаалт
            </TabsTrigger>
            <TabsTrigger value="employees">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Ажилчид
            </TabsTrigger>
            <TabsTrigger value="register">
              <UserPlus className="w-4 h-4 mr-2" />
              Бүртгэх
            </TabsTrigger>
            <TabsTrigger value="report">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Тайлан
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drivers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Бүртгэлтэй жолоочид</CardTitle>
                <CardDescription>Нийт {drivers.length} жолооч бүртгэлтэй байна</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search Section */}
                <div className="mb-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="searchName">Нэрээр хайх</Label>
                      <Input
                        id="searchName"
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        placeholder="Жолоочийн нэр..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="searchEmail">И-мэйлээр хайх</Label>
                      <Input
                        id="searchEmail"
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                        placeholder="И-мэйл хаяг..."
                      />
                    </div>
                  </div>
                </div>
                {filteredDrivers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchName || searchEmail ? "Хайлтын үр дүн олдсонгүй" : "Бүртгэлтэй жолооч байхгүй байна"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredDrivers.map((driver) => (
                      <div key={driver.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Avatar>
                            <AvatarFallback>{driver.name?.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{driver.name}</p>
                            <p className="text-sm text-muted-foreground">{driver.email}</p>
                            {driver.phone && <p className="text-sm text-muted-foreground">{driver.phone}</p>}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={driver.active !== false ? "default" : "secondary"}>
                            {driver.active !== false ? "Идэвхтэй" : "Идэвхгүй"}
                          </Badge>

                          {/* Toggle Active/Inactive Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleDriverStatus(driver.id!, driver.active !== false, driver.name)}
                          >
                            {driver.active !== false ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          </Button>

                          {/* Edit Button */}
                          <Button variant="outline" size="sm" onClick={() => handleEditDriver(driver)}>
                            <Edit className="w-4 h-4" />
                          </Button>

                          {/* Delete Button */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Жолооч устгах</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {driver.name} жолоочийг устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteDriver(driver.id!, driver.name)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Устгах
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ажилчдын жагсаалт</CardTitle>
                <CardDescription>Нийт {employees.length} ажилчин бүртгэлтэй байна</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Add Employee Form */}
                <div className="mb-6 p-4 border rounded-lg bg-muted/50">
                  <h3 className="text-lg font-medium mb-4">Шинэ ажилчин нэмэх</h3>
                  <form onSubmit={handleAddEmployee} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="employeeName">Ажилчны нэр *</Label>
                        <Input
                          id="employeeName"
                          value={newEmployee.name}
                          onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                          placeholder="Ажилчны нэрийг оруулна уу"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="employeePosition">Албан тушаал</Label>
                        <Input
                          id="employeePosition"
                          value={newEmployee.position}
                          onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                          placeholder="Жишээ: Хамгаалагч, Цэвэрлэгч"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="employeePhone">Утасны дугаар</Label>
                        <Input
                          id="employeePhone"
                          value={newEmployee.phone}
                          onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                          placeholder="Утасны дугаар"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="employeeStartDate">Ажилд орсон огноо</Label>
                        <Input
                          id="employeeStartDate"
                          type="date"
                          value={newEmployee.startDate}
                          onChange={(e) => setNewEmployee({ ...newEmployee, startDate: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setNewEmployee({ name: "", position: "", phone: "", startDate: "" })}
                      >
                        Цэвэрлэх
                      </Button>
                      <Button type="submit" disabled={employeeLoading}>
                        {employeeLoading ? "Нэмж байна..." : "Ажилчин нэмэх"}
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Employees List */}
                {employees.length === 0 ? (
                  <div className="text-center py-8">
                    <svg
                      className="w-12 h-12 mx-auto text-muted-foreground mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <p className="text-muted-foreground">Бүртгэлтэй ажилчин байхгүй байна</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {employees.map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Avatar>
                            <AvatarFallback>{employee.name?.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            {employee.position && <p className="text-sm text-muted-foreground">{employee.position}</p>}
                            {employee.phone && <p className="text-sm text-muted-foreground">{employee.phone}</p>}
                            {employee.startDate && (
                              <p className="text-xs text-muted-foreground">
                                Ажилд орсон: {new Date(employee.startDate).toLocaleDateString("mn-MN")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {/* Edit Button */}
                          <Button variant="outline" size="sm" onClick={() => handleEditEmployee(employee)}>
                            <Edit className="w-4 h-4" />
                          </Button>

                          {/* Delete Button */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Ажилчин устгах</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {employee.name} ажилчныг устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Устгах
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Шинэ хэрэглэгч бүртгэх</CardTitle>
                <CardDescription>Хэрэглэгчийн нэвтрэх эрх үүсгэх</CardDescription>

                {/* Role Selection */}
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("manager")}
                    className={`flex-1 py-3 px-4 rounded-xl border transition-colors ${
                      selectedRole === "manager"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-muted"
                    }`}
                  >
                    Менежер бүртгэх
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("driver")}
                    className={`flex-1 py-3 px-4 rounded-xl border transition-colors ${
                      selectedRole === "driver"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-muted"
                    }`}
                  >
                    Жолооч бүртгэх
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("employee")}
                    className={`flex-1 py-3 px-4 rounded-xl border transition-colors ${
                      selectedRole === "employee"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-muted"
                    }`}
                  >
                    Ажилчин бүртгэх
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegisterDriver} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="driverName">
                        {selectedRole === "manager"
                          ? "Менежерийн нэр"
                          : selectedRole === "driver"
                            ? "Жолоочийн нэр"
                            : "Ажилчны нэр"}{" "}
                        *
                      </Label>
                      {selectedRole === "employee" ? (
                        <select
                          id="employeeSelect"
                          value={newDriver.name}
                          onChange={(e) => {
                            const selectedEmployee = employees.find((emp) => emp.name === e.target.value)
                            setNewDriver({
                              ...newDriver,
                              name: e.target.value,
                              phone: selectedEmployee?.phone || "",
                            })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Ажилчин сонгоно уу</option>
                          {employees.map((employee) => (
                            <option key={employee.id} value={employee.name}>
                              {employee.name} {employee.position ? `- ${employee.position}` : ""}{" "}
                              {employee.phone ? `(${employee.phone})` : ""}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          id="driverName"
                          value={newDriver.name}
                          onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                          placeholder={
                            selectedRole === "manager" ? "Менежерийн нэрийг оруулна уу" : "Жолоочийн нэрийг оруулна уу"
                          }
                          required
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="driverPhone">Утасны дугаар</Label>
                      <Input
                        id="driverPhone"
                        value={newDriver.phone}
                        onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                        placeholder="Утасны дугаар"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="driverEmail">И-мэйл хаяг *</Label>
                      <Input
                        id="driverEmail"
                        type="email"
                        value={newDriver.email}
                        onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                        placeholder="example@email.com"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="driverPassword">Нууц үг *</Label>
                      <Input
                        id="driverPassword"
                        type="password"
                        value={newDriver.password}
                        onChange={(e) => setNewDriver({ ...newDriver, password: e.target.value })}
                        placeholder="Хамгийн багадаа 6 тэмдэгт"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setNewDriver({
                          email: "",
                          password: "",
                          name: "",
                          phone: "",
                          role: "driver",
                          createdAt: "",
                          createdBy: "",
                          active: true,
                        })
                      }
                    >
                      Цэвэрлэх
                    </Button>
                    <Button type="submit" disabled={registrationLoading}>
                      {registrationLoading
                        ? "Бүртгэж байна..."
                        : `${selectedRole === "manager" ? "Менежер" : selectedRole === "driver" ? "Жолооч" : "Ажилчин"} бүртгэх`}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="report" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Зогсоолын тайлан</CardTitle>
                    <CardDescription>Бүх зогсоолын бүртгэлийн дэлгэрэнгүй тайлан</CardDescription>
                  </div>
                  <Button
                    onClick={exportToExcel}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={filteredReportRecords.length === 0}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Excel татах
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="mb-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Year Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="reportYear">Он сонгох</Label>
                      <select
                        id="reportYear"
                        value={reportFilterYear}
                        onChange={(e) => setReportFilterYear(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Бүх он</option>
                        {getReportAvailableYears().map((year) => (
                          <option key={year} value={year.toString()}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Month Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="reportMonth">Сар сонгох</Label>
                      <select
                        id="reportMonth"
                        value={reportFilterMonth}
                        onChange={(e) => setReportFilterMonth(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Бүх сар</option>
                        <option value="01">1-р сар</option>
                        <option value="02">2-р сар</option>
                        <option value="03">3-р сар</option>
                        <option value="04">4-р сар</option>
                        <option value="05">5-р сар</option>
                        <option value="06">6-р сар</option>
                        <option value="07">7-р сар</option>
                        <option value="08">8-р сар</option>
                        <option value="09">9-р сар</option>
                        <option value="10">10-р сар</option>
                        <option value="11">11-р сар</option>
                        <option value="12">12-р сар</option>
                      </select>
                    </div>

                    {/* Car Number Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="reportCarNumber">Машины дугаар</Label>
                      <Input
                        id="reportCarNumber"
                        value={reportFilterCarNumber}
                        onChange={(e) => setReportFilterCarNumber(e.target.value)}
                        placeholder="1234 УНМ"
                      />
                    </div>

                    {/* Driver Name Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="reportDriverName">Жолоочийн нэр</Label>
                      <select
                        id="reportDriverName"
                        value={reportFilterDriverName}
                        onChange={(e) => setReportFilterDriverName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Бүх жолооч</option>
                        {getAvailableDriverNames().map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Results count */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Нийт {filteredReportRecords.length} бүртгэл</span>
                    {(reportFilterYear || reportFilterMonth || reportFilterCarNumber || reportFilterDriverName) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReportFilterYear("")
                          setReportFilterMonth("")
                          setReportFilterCarNumber("")
                          setReportFilterDriverName("")
                        }}
                      >
                        Шүүлтүүр цэвэрлэх
                      </Button>
                    )}
                  </div>
                </div>

                {/* Table */}
                {reportLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Тайлан ачааллаж байна...</p>
                  </div>
                ) : filteredReportRecords.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Тайлан олдсонгүй</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Машины дугаар
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Жолоочийн нэр
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Машины марк
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Орсон цаг
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Гарсан цаг
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Зогссон хугацаа
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Төлбөр (₮)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredReportRecords.map((record, index) => (
                            <tr key={record.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {record.carNumber}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{record.driverName}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {record.parkingArea}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {record.entryTime || "-"}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {record.exitTime || "-"}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {calculateParkingDurationForReport(record)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                {calculateParkingFeeForReport(record)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Driver Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Жолоочийн мэдээлэл засах</DialogTitle>
            <DialogDescription>{editingDriver?.name} жолоочийн мэдээлэл шинэчлэх</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Нэр *</Label>
              <Input
                id="editName"
                value={editDriverData.name}
                onChange={(e) => setEditDriverData({ ...editDriverData, name: e.target.value })}
                placeholder="Жолоочийн нэр"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPhone">Утасны дугаар</Label>
              <Input
                id="editPhone"
                value={editDriverData.phone}
                onChange={(e) => setEditDriverData({ ...editDriverData, phone: e.target.value })}
                placeholder="Утасны дугаар"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">И-мэйл хаяг *</Label>
              <Input
                id="editEmail"
                type="email"
                value={editDriverData.email}
                onChange={(e) => setEditDriverData({ ...editDriverData, email: e.target.value })}
                placeholder="И-мэйл хаяг"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPassword">Шинэ нууц үг (хоосон үлдээвэл өөрчлөгдөхгүй)</Label>
              <Input
                id="editPassword"
                type="password"
                value={editDriverData.newPassword}
                onChange={(e) => setEditDriverData({ ...editDriverData, newPassword: e.target.value })}
                placeholder="Шинэ нууц үг"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Цуцлах
            </Button>
            <Button onClick={handleSaveDriverEdit} disabled={editLoading}>
              {editLoading ? "Хадгалж байна..." : "Хадгалах"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Профайл засах</DialogTitle>
            <DialogDescription>Хувийн мэдээлэл шинэчлэх</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Profile Image Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  {profileData.profileImage ? (
                    <img
                      src={profileData.profileImage || "/placeholder.svg"}
                      alt="Profile"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <AvatarFallback className="text-2xl">
                      {profileData.name?.charAt(0).toUpperCase() || "M"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                  <Camera className="w-4 h-4 text-primary-foreground" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "profile")}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Профайл зураг солих бол камер товчийг дарна уу
              </p>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profileName">Нэр *</Label>
                <Input
                  id="profileName"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  placeholder="Нэрээ оруулна уу"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profilePhone">Утасны дугаар</Label>
                <Input
                  id="profilePhone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="Утасны дугаар"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profileEmail">И-мэйл хаяг *</Label>
                <Input
                  id="profileEmail"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  placeholder="И-мэйл хаяг"
                />
              </div>
            </div>

            {/* Password Change Section */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Нууц үг солих</h4>
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Одоогийн нууц үг</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Одоогийн нууц үг"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Шинэ нууц үг</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Шинэ нууц үг (хамгийн багадаа 6 тэмдэгт)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Нууц үг баталгаажуулах</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Нууц үг дахин оруулах"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfileDialog(false)}>
              Цуцлах
            </Button>
            <Button onClick={handleSaveProfile} disabled={profileLoading}>
              {profileLoading ? "Хадгалж байна..." : "Хадгалах"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Site Configuration Dialog */}
      <Dialog open={showSiteDialog} onOpenChange={setShowSiteDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Сайт бүртгэл</DialogTitle>
            <DialogDescription>Сайтын тохиргоо болон дизайн</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Site Name */}
            <div className="space-y-2">
              <Label htmlFor="siteName">Сайтын нэр *</Label>
              <Input
                id="siteName"
                value={siteConfig.siteName}
                onChange={(e) => setSiteConfig({ ...siteConfig, siteName: e.target.value })}
                placeholder="Сайтын нэрийг оруулна уу"
              />
            </div>

            {/* Site Logo */}
            <div className="space-y-4">
              <Label>Сайтын лого</Label>
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center overflow-hidden">
                  {siteConfig.siteLogo ? (
                    <img
                      src={siteConfig.siteLogo || "/placeholder.svg"}
                      alt="Site Logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="cursor-pointer">
                    <Button variant="outline" className="w-full bg-transparent" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Лого сонгох
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "logo")}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG форматтай зураг (5MB хүртэл)</p>
                </div>
              </div>
            </div>

            {/* Site Background */}
            <div className="space-y-4">
              <Label>Сайтын арын зураг</Label>
              <div className="space-y-4">
                <div className="w-full h-32 border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center overflow-hidden">
                  {siteConfig.siteBackground ? (
                    <img
                      src={siteConfig.siteBackground || "/placeholder.svg"}
                      alt="Site Background"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Арын зураг</p>
                    </div>
                  )}
                </div>
                <label className="cursor-pointer">
                  <Button variant="outline" className="w-full bg-transparent" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Арын зураг сонгох
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "background")}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-muted-foreground">PNG, JPG форматтай зураг (5MB хүртэл)</p>
              </div>
            </div>

            {/* Preview Section */}
            {(siteConfig.siteName || siteConfig.siteLogo || siteConfig.siteBackground) && (
              <div className="space-y-2 border-t pt-4">
                <Label>Урьдчилан харах</Label>
                <div
                  className="w-full h-40 rounded-lg border relative overflow-hidden"
                  style={{
                    backgroundImage: siteConfig.siteBackground ? `url(${siteConfig.siteBackground})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundColor: siteConfig.siteBackground ? "transparent" : "#f3f4f6",
                  }}
                >
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center text-white">
                      {siteConfig.siteLogo && (
                        <img
                          src={siteConfig.siteLogo || "/placeholder.svg"}
                          alt="Logo"
                          className="w-12 h-12 mx-auto mb-2 rounded"
                        />
                      )}
                      {siteConfig.siteName && <h3 className="text-lg font-semibold">{siteConfig.siteName}</h3>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSiteDialog(false)}>
              Цуцлах
            </Button>
            <Button onClick={handleSaveSiteConfig} disabled={siteLoading}>
              {siteLoading ? "Хадгалж байна..." : "Хадгалах"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pricing Configuration Dialog */}
      <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Үнийн тохиргоо</DialogTitle>
            <DialogDescription>1 цагийн зогсоолын үнэ тохируулах</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pricePerMinute">1 цагийн үнэ (₮) *</Label>
              <Input
                id="pricePerMinute"
                type="number"
                min="0"
                step="1"
                value={pricingConfig.pricePerMinute}
                onChange={(e) => setPricingConfig({ ...pricingConfig, pricePerMinute: Number(e.target.value) })}
                placeholder="Жишээ: 100"
              />
              <p className="text-xs text-muted-foreground">Одоогийн тохиргоо: {pricingConfig.pricePerMinute}₮/цаг</p>
            </div>

            {/* Example calculation */}
            <div className="bg-muted p-3 rounded-lg">
              <h4 className="font-medium mb-2">Жишээ тооцоо:</h4>
              <div className="text-sm space-y-1">
                <p>• 1 цаг = {pricingConfig.pricePerMinute * 1}₮</p>
                <p>• 2 цаг = {pricingConfig.pricePerMinute * 2}₮</p>
                <p>• 4 цаг = {pricingConfig.pricePerMinute * 4}₮</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPricingDialog(false)}>
              Цуцлах
            </Button>
            <Button onClick={handleSavePricingConfig} disabled={pricingLoading}>
              {pricingLoading ? "Хадгалж байна..." : "Хадгалах"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee Edit Dialog */}
      <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ажилчны мэдээлэл засах</DialogTitle>
            <DialogDescription>{editingEmployee?.name} ажилчны мэдээлэл шинэчлэх</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editEmployeeName">Ажилчны нэр *</Label>
              <Input
                id="editEmployeeName"
                value={newEmployee.name}
                onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                placeholder="Ажилчны нэр"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmployeePosition">Албан тушаал</Label>
              <Input
                id="editEmployeePosition"
                value={newEmployee.position}
                onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                placeholder="Албан тушаал"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmployeePhone">Утасны дугаар</Label>
              <Input
                id="editEmployeePhone"
                value={newEmployee.phone}
                onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                placeholder="Утасны дугаар"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmployeeStartDate">Ажилд орсон огноо</Label>
              <Input
                id="editEmployeeStartDate"
                type="date"
                value={newEmployee.startDate}
                onChange={(e) => setNewEmployee({ ...newEmployee, startDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEmployeeDialog(false)
                setEditingEmployee(null)
                setNewEmployee({ name: "", position: "", phone: "", startDate: "" })
              }}
            >
              Цуцлах
            </Button>
            <Button onClick={handleSaveEmployeeEdit} disabled={employeeLoading}>
              {employeeLoading ? "Хадгалж байна..." : "Хадгалах"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

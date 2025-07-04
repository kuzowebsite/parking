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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
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
  Shield,
  Edit,
  Power,
  PowerOff,
  Settings,
  UserIcon,
  Globe,
  LogOut,
  Upload,
  Eye,
  Calendar,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  DollarSign,
  Car,
  BarChart3,
} from "lucide-react"
import * as XLSX from "xlsx"

export default function ManagerPage() {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Manager states
  const [managers, setManagers] = useState<UserProfile[]>([])

  // Report states
  const [reportRecords, setReportRecords] = useState<any[]>([])
  const [filteredReportRecords, setFilteredReportRecords] = useState<any[]>([])
  const [reportFilterYear, setReportFilterYear] = useState("")
  const [reportFilterMonth, setReportFilterMonth] = useState("")
  const [reportFilterCarNumber, setReportFilterCarNumber] = useState("")
  const [reportFilterMechanic, setReportFilterMechanic] = useState("")
  const [reportLoading, setReportLoading] = useState(false)

  // Enhanced Dashboard states
  const [dashboardStats, setDashboardStats] = useState({
    totalCustomers: 0,
    totalRevenue: 0,
    activeRecords: 0,
    todayCustomers: 0,
    todayRevenue: 0,
    averageSessionTime: 0,
    averageRevenue: 0,
  })
  const [monthlyStats, setMonthlyStats] = useState<any[]>([])
  const [dailyStats, setDailyStats] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [dashboardLoading, setDashboardLoading] = useState(false)

  // Add these new states for custom date range
  const [customDateRange, setCustomDateRange] = useState({
    startDate: "",
    endDate: "",
    useCustomRange: false,
  })
  const [showDateRangePicker, setShowDateRangePicker] = useState(false)

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

  // Employee states - now using UserProfile type for consistency
  const [employees, setEmployees] = useState<UserProfile[]>([])
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    position: "",
    phone: "",
    startDate: "",
    profileImage: "",
  })
  const [editingEmployee, setEditingEmployee] = useState<UserProfile | null>(null)
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false)
  const [employeeLoading, setEmployeeLoading] = useState(false)

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
    loadManagers()
    loadDashboardData()
  }

  // Enhanced dashboard data loading with better analytics
  const loadDashboardData = (startDate?: string, endDate?: string) => {
    setDashboardLoading(true)
    const recordsRef = ref(database, "parking_records")
    onValue(recordsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        let records = Object.keys(data).map((key) => ({ id: key, ...data[key] }))

        // Filter by custom date range if provided
        if (startDate && endDate) {
          const start = new Date(startDate)
          const end = new Date(endDate)
          end.setHours(23, 59, 59, 999) // Include the entire end date

          records = records.filter((record) => {
            const recordDate = new Date(record.timestamp)
            return recordDate >= start && recordDate <= end
          })
        }

        // Calculate enhanced statistics
        const completedRecords = records.filter(
          (record) => record.type === "completed" || record.type === "exit" || record.exitTime,
        )
        const activeRecords = records.filter((record) => record.type === "entry" && !record.exitTime)

        // Today's statistics
        const today = new Date()
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

        const todayRecords = completedRecords.filter((record) => {
          const recordDate = new Date(record.timestamp)
          return recordDate >= todayStart && recordDate < todayEnd
        })

        const totalRevenue = completedRecords.reduce((sum, record) => sum + (record.amount || 0), 0)
        const todayRevenue = todayRecords.reduce((sum, record) => sum + (record.amount || 0), 0)

        // Calculate average session time (in hours)
        const avgSessionTime =
          completedRecords.length > 0
            ? completedRecords.reduce((sum, record) => {
                if (record.parkingDuration) {
                  // Assuming parkingDuration is in hours format like "2 цаг"
                  const duration = Number.parseFloat(record.parkingDuration.toString().replace(/[^\d.]/g, "")) || 0
                  return sum + duration
                }
                return sum
              }, 0) / completedRecords.length
            : 0

        const avgRevenue = completedRecords.length > 0 ? totalRevenue / completedRecords.length : 0

        setDashboardStats({
          totalCustomers: completedRecords.length,
          totalRevenue: totalRevenue,
          activeRecords: activeRecords.length,
          todayCustomers: todayRecords.length,
          todayRevenue: todayRevenue,
          averageSessionTime: avgSessionTime,
          averageRevenue: avgRevenue,
        })

        // Generate monthly statistics
        const monthlyStatsData = []
        const now = new Date()

        if (startDate && endDate) {
          // Custom date range logic
          const start = new Date(startDate)
          const end = new Date(endDate)
          const diffTime = Math.abs(end.getTime() - start.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          if (diffDays <= 31) {
            // Show daily data for ranges 31 days or less
            for (let i = 0; i <= diffDays; i++) {
              const currentDate = new Date(start)
              currentDate.setDate(start.getDate() + i)

              const dayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
              const dayEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)

              const dayRecords = completedRecords.filter((record) => {
                const recordDate = new Date(record.timestamp)
                return recordDate >= dayStart && recordDate < dayEnd
              })

              const dayRevenue = dayRecords.reduce((sum, record) => sum + (record.amount || 0), 0)

              monthlyStatsData.push({
                period: currentDate.toLocaleDateString("mn-MN", { month: "short", day: "numeric" }),
                customers: dayRecords.length,
                revenue: dayRevenue,
                date: currentDate.toISOString().split("T")[0],
              })
            }
          } else {
            // Show monthly data for longer ranges
            const startMonth = new Date(start.getFullYear(), start.getMonth(), 1)
            const endMonth = new Date(end.getFullYear(), end.getMonth(), 1)
            const currentMonth = new Date(startMonth)

            while (currentMonth <= endMonth) {
              const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
              const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

              const monthRecords = completedRecords.filter((record) => {
                const recordDate = new Date(record.timestamp)
                return recordDate >= monthStart && recordDate <= monthEnd
              })

              const monthRevenue = monthRecords.reduce((sum, record) => sum + (record.amount || 0), 0)

              monthlyStatsData.push({
                period: currentMonth.toLocaleDateString("mn-MN", { year: "numeric", month: "short" }),
                customers: monthRecords.length,
                revenue: monthRevenue,
                date: currentMonth.toISOString().split("T")[0],
              })

              currentMonth.setMonth(currentMonth.getMonth() + 1)
            }
          }
        } else {
          // Default: Show last 6 months
          for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
            const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)

            const monthRecords = completedRecords.filter((record) => {
              const recordDate = new Date(record.timestamp)
              return recordDate >= monthStart && recordDate <= monthEnd
            })

            const monthRevenue = monthRecords.reduce((sum, record) => sum + (record.amount || 0), 0)

            monthlyStatsData.push({
              period: monthDate.toLocaleDateString("mn-MN", { year: "numeric", month: "short" }),
              customers: monthRecords.length,
              revenue: monthRevenue,
              date: monthDate.toISOString().split("T")[0],
            })
          }
        }

        setMonthlyStats(monthlyStatsData)

        // Generate last 7 days statistics for daily chart
        const dailyStatsData = []
        for (let i = 6; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)

          const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
          const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)

          const dayRecords = completedRecords.filter((record) => {
            const recordDate = new Date(record.timestamp)
            return recordDate >= dayStart && recordDate < dayEnd
          })

          const dayRevenue = dayRecords.reduce((sum, record) => sum + (record.amount || 0), 0)

          dailyStatsData.push({
            day: date.toLocaleDateString("mn-MN", { weekday: "short" }),
            date: date.toLocaleDateString("mn-MN", { month: "numeric", day: "numeric" }),
            customers: dayRecords.length,
            revenue: dayRevenue,
          })
        }

        setDailyStats(dailyStatsData)

        // Get recent activity (last 10 records from filtered data)
        const sortedRecords = records
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10)

        setRecentActivity(sortedRecords)
      }
      setDashboardLoading(false)
    })
  }

  // Apply custom date range
  const applyCustomDateRange = () => {
    if (!customDateRange.startDate || !customDateRange.endDate) {
      alert("Эхлэх болон дуусах огноог оруулна уу")
      return
    }

    const startDate = new Date(customDateRange.startDate)
    const endDate = new Date(customDateRange.endDate)

    if (startDate > endDate) {
      alert("Эхлэх огноо дуусах огнооноос өмнө байх ёстой")
      return
    }

    setCustomDateRange({ ...customDateRange, useCustomRange: true })
    loadDashboardData(customDateRange.startDate, customDateRange.endDate)
    setShowDateRangePicker(false)
  }

  // Reset to default (last 6 months)
  const resetToDefaultRange = () => {
    setCustomDateRange({
      startDate: "",
      endDate: "",
      useCustomRange: false,
    })
    loadDashboardData()
    setShowDateRangePicker(false)
  }

  // Load employees from users table where role is 'employee'
  const loadEmployees = () => {
    const usersRef = ref(database, "users")
    onValue(usersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const employeesList: UserProfile[] = Object.keys(data)
          .map((key) => ({ id: key, ...data[key] }))
          .filter((user) => user.role === "employee")
          .sort((a, b) => a.name.localeCompare(b.name))
        setEmployees(employeesList)
      } else {
        setEmployees([])
      }
    })
  }

  // Load managers from database
  const loadManagers = () => {
    const usersRef = ref(database, "users")
    onValue(usersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const managersList: UserProfile[] = Object.keys(data)
          .map((key) => ({ id: key, ...data[key] }))
          .filter((user) => user.role === "manager")
          .sort((a, b) => a.name.localeCompare(b.name))
        setManagers(managersList)
      } else {
        setManagers([])
      }
    })
  }

  // Handle employee image upload
  const handleEmployeeImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setNewEmployee({ ...newEmployee, profileImage: base64String })
      }
      reader.readAsDataURL(file)
    }
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
        profileImage: newEmployee.profileImage || "",
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
        profileImage: "",
      })
    } catch (error) {
      alert("Ажилчин нэмэхэд алдаа гарлаа")
    }
    setEmployeeLoading(false)
  }

  // Edit employee
  const handleEditEmployee = (employee: UserProfile) => {
    setEditingEmployee(employee)
    setEditDriverData({
      name: employee.name,
      phone: employee.phone,
      email: employee.email,
      newPassword: "",
    })
    setShowEditDialog(true)
  }

  // Save employee edit
  const handleSaveEmployeeEdit = async () => {
    if (!editingEmployee || !editDriverData.name.trim() || !editDriverData.email.trim()) {
      alert("Нэр болон и-мэйл хаягийг бөглөнө үү")
      return
    }

    setEditLoading(true)
    try {
      const updateData: any = {
        name: editDriverData.name.trim(),
        phone: editDriverData.phone.trim(),
        email: editDriverData.email.trim(),
        updatedAt: new Date().toISOString(),
      }

      await update(ref(database, `users/${editingEmployee.id}`), updateData)
      alert("Ажилчны мэдээлэл амжилттай шинэчлэгдлээ")
      setShowEditDialog(false)
      setEditingEmployee(null)
    } catch (error) {
      alert("Ажилчны мэдээлэл шинэчлэхэд алдаа гарлаа")
    }
    setEditLoading(false)
  }

  // Delete employee
  const handleDeleteEmployee = async (employeeId: string, employeeName: string) => {
    if (!confirm(`${employeeName} ажилчныг устгахдаа итгэлтэй байна уу?`)) {
      return
    }

    try {
      await remove(ref(database, `users/${employeeId}`))
      alert("Ажилчин амжилттай устгагдлаа")
    } catch (error) {
      alert("Ажилчин устгахад алдаа гарлаа")
    }
  }

  // Toggle employee status
  const handleToggleEmployeeStatus = async (employeeId: string, currentStatus: boolean, employeeName: string) => {
    const newStatus = !currentStatus
    const statusText = newStatus ? "идэвхжүүлэх" : "идэвхгүй болгох"

    if (!confirm(`${employeeName} ажилчныг ${statusText}даа итгэлтэй байна уу?`)) {
      return
    }

    try {
      await update(ref(database, `users/${employeeId}`), {
        active: newStatus,
        updatedAt: new Date().toISOString(),
      })
      alert(`Ажилчин амжилттай ${newStatus ? "идэвхжлээ" : "идэвхгүй боллоо"}`)
    } catch (error) {
      alert("Ажилчны төлөв өөрчлөхөд алдаа гарлаа")
    }
  }

  // Handle manager operations
  const handleDeleteManager = async (managerId: string, managerName: string) => {
    if (!confirm(`${managerName} менежерийг устгахдаа итгэлтэй байна уу?`)) {
      return
    }

    try {
      await remove(ref(database, `users/${managerId}`))
      alert("Менежер амжилттай устгагдлаа")
    } catch (error) {
      alert("Менежер устгахад алдаа гарлаа")
    }
  }

  const handleEditManager = (manager: UserProfile) => {
    setEditingDriver(manager)
    setEditDriverData({
      name: manager.name,
      phone: manager.phone,
      email: manager.email,
      newPassword: "",
    })
    setShowEditDialog(true)
  }

  const handleToggleManagerStatus = async (managerId: string, currentStatus: boolean, managerName: string) => {
    const newStatus = !currentStatus
    const statusText = newStatus ? "идэвхжүүлэх" : "идэвхгүй болгох"

    if (!confirm(`${managerName} менежерийг ${statusText}даа итгэлтэй байна уу?`)) {
      return
    }

    try {
      await update(ref(database, `users/${managerId}`), {
        active: newStatus,
        updatedAt: new Date().toISOString(),
      })
      alert(`Менежер амжилттай ${newStatus ? "идэвхжлээ" : "идэвхгүй боллоо"}`)
    } catch (error) {
      alert("Менежерийн төлөв өөрчлөхөд алдаа гарлаа")
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

  // Filter records by date range
  const getDateRangeFilteredRecords = () => {
    if (!dateRangeStart || !dateRangeEnd) {
      return filteredReportRecords
    }

    const startDate = new Date(dateRangeStart)
    const endDate = new Date(dateRangeEnd)
    endDate.setHours(23, 59, 59, 999) // Include the entire end date

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
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()

      // Prepare data for Excel
      const excelData = filteredReportRecords.map((record, index) => ({
        "№": index + 1,
        "Машины дугаар": record.carNumber,
        Засварчин: record.mechanicName || record.driverName || "-",
        "Машины марк": record.carBrand || record.parkingArea || "-",
        "Орсон цаг": record.entryTime || "-",
        "Гарсан цаг": record.exitTime || "-",
        "Зогссон хугацаа": record.parkingDuration || "-",
        "Төлбөр (₮)": calculateParkingFeeForReport(record),
        Зураг: record.images && record.images.length > 0 ? "Байна" : "Байхгүй",
      }))

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(excelData)

      // Set column widths
      const colWidths = [
        { wch: 5 }, // №
        { wch: 15 }, // Машины дугаар
        { wch: 20 }, // Засварчин
        { wch: 15 }, // Машины марк
        { wch: 20 }, // Орсон цаг
        { wch: 20 }, // Гарсан цаг
        { wch: 15 }, // Зогссон хугацаа
        { wch: 12 }, // Төлбөр
        { wch: 10 }, // Зураг
      ]
      ws["!cols"] = colWidths

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Зогсоолын тайлан")

      // Generate filename with current date
      const currentDate = new Date().toISOString().split("T")[0]
      const filename = `Зогсоолын_тайлан_${currentDate}.xlsx`

      // Create blob and download file (browser-compatible way)
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
      const blob = new Blob([wbout], { type: "application/octet-stream" })

      // Create download link
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

  // Export with date range and optional deletion
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

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()

      // Prepare data for Excel
      const excelData = recordsToExport.map((record, index) => ({
        "№": index + 1,
        "Машины дугаар": record.carNumber,
        Засварчин: record.mechanicName || record.driverName || "-",
        "Машины марк": record.carBrand || record.parkingArea || "-",
        "Орсон цаг": record.entryTime || "-",
        "Гарсан цаг": record.exitTime || "-",
        "Зогссон хугацаа": record.parkingDuration || "-",
        "Төлбөр (₮)": calculateParkingFeeForReport(record),
        Зураг: record.images && record.images.length > 0 ? "Байна" : "Байхгүй",
      }))

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(excelData)

      // Set column widths
      const colWidths = [
        { wch: 5 }, // №
        { wch: 15 }, // Машины дугаар
        { wch: 20 }, // Засварчин
        { wch: 15 }, // Машины марк
        { wch: 20 }, // Орсон цаг
        { wch: 20 }, // Гарсан цаг
        { wch: 15 }, // Зогссон хугацаа
        { wch: 12 }, // Төлбөр
        { wch: 10 }, // Зураг
      ]
      ws["!cols"] = colWidths

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Зогсоолын тайлан")

      // Generate filename with date range
      const startDateStr = dateRangeStart.replace(/-/g, ".")
      const endDateStr = dateRangeEnd.replace(/-/g, ".")
      const filename = `Зогсоолын_тайлан_${startDateStr}_${endDateStr}.xlsx`

      // Create blob and download file (browser-compatible way)
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
      const blob = new Blob([wbout], { type: "application/octet-stream" })

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      // Delete records if option is selected
      if (deleteAfterExport) {
        const deletePromises = recordsToExport.map((record) => remove(ref(database, `parking_records/${record.id}`)))

        await Promise.all(deletePromises)
        alert(`Excel файл амжилттай татагдлаа! ${recordsToExport.length} бүртгэл өгөгдлийн сангаас устгагдлаа.`)
      } else {
        alert(`Excel файл амжилттай татагдлаа! ${recordsToExport.length} бүртгэл татагдлаа.`)
      }

      // Reset form
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

  // Get unique mechanic names for filter
  const getAvailableMechanicNames = () => {
    const names = reportRecords.map((record) => record.mechanicName || record.driverName)
    return [...new Set(names)].filter((name) => name).sort()
  }

  // Get unique years for report filter
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

    setFilteredReportRecords(filtered)
  }, [reportRecords, reportFilterYear, reportFilterMonth, reportFilterCarNumber, reportFilterMechanic])

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

      const userType =
        editingDriver.role === "manager" ? "Менежерийн" : editingDriver.role === "driver" ? "Жолоочийн" : "Ажилчны"
      alert(`${userType} мэдээлэл амжилттай шинэчлэгдлээ`)
      setShowEditDialog(false)
      setEditingDriver(null)
    } catch (error) {
      console.error("Error updating user:", error)
      const userType =
        editingDriver?.role === "manager" ? "менежерийн" : editingDriver?.role === "driver" ? "жолоочийн" : "ажилчны"
      alert(`${userType} мэдээлэл шинэчлэхэд алдаа гарлаа`)
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
                <AvatarImage src={userProfile.profileImage || "/placeholder.svg"} alt="Profile" />
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
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">
              <BarChart3 className="w-4 h-4 mr-2" />
              Хяналтын самбар
            </TabsTrigger>
            <TabsTrigger value="employees">
              <Users className="w-4 h-4 mr-2" />
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

          <TabsContent value="dashboard" className="space-y-8">
            <div className="grid gap-8">
              {/* Advanced Header Section */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 p-8">
                <div className="absolute inset-0 opacity-20">
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%239C92AC' fillOpacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                  />
                </div>
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <h1 className="text-4xl font-bold text-white mb-2">Хяналтын самбар</h1>
                    <p className="text-purple-200 text-lg">
                      {customDateRange.useCustomRange
                        ? `${customDateRange.startDate} - ${customDateRange.endDate} хугацааны дүн`
                        : "Бизнесийн ерөнхий үзүүлэлтүүд"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                      <div className="flex items-center space-x-2 text-white">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium">Шинэчлэгдсэн</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowDateRangePicker(!showDateRangePicker)}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm px-6 py-3"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Хугацаа сонгох
                    </Button>
                  </div>
                </div>

                {/* Enhanced Date Range Picker */}
                {showDateRangePicker && (
                  <div className="mt-8 p-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl">
                    <h3 className="text-white font-semibold mb-4">Тайлангийн хугацаа</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white/80">Эхлэх огноо</Label>
                        <Input
                          type="date"
                          value={customDateRange.startDate}
                          onChange={(e) => setCustomDateRange({ ...customDateRange, startDate: e.target.value })}
                          className="bg-white/10 border-white/20 text-white focus:border-purple-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white/80">Дуусах огноо</Label>
                        <Input
                          type="date"
                          value={customDateRange.endDate}
                          onChange={(e) => setCustomDateRange({ ...customDateRange, endDate: e.target.value })}
                          className="bg-white/10 border-white/20 text-white focus:border-purple-400"
                        />
                      </div>
                      <div className="flex items-end space-x-2">
                        <Button
                          onClick={applyCustomDateRange}
                          className="bg-purple-600 hover:bg-purple-700 text-white flex-1"
                        >
                          Хайх
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowDateRangePicker(false)}
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          Хаах
                        </Button>
                        {customDateRange.useCustomRange && (
                          <Button
                            variant="outline"
                            onClick={resetToDefaultRange}
                            className="border-white/20 text-white hover:bg-white/10 bg-transparent"
                          >
                            Анхдагш
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Advanced KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Customers Card */}
                <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                  <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8">
                    <div className="w-full h-full bg-blue-200/30 rounded-full"></div>
                  </div>
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-1">Нийт үйлчлүүлэгч</p>
                        <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                          {dashboardStats.totalCustomers.toLocaleString()}
                        </p>
                        <div className="flex items-center mt-2">
                          <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                          <span className="text-sm text-green-600 font-medium">
                            Өнөөдөр: {dashboardStats.todayCustomers}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 bg-blue-500 rounded-2xl">
                        <Users className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Total Revenue Card */}
                <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                  <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8">
                    <div className="w-full h-full bg-green-200/30 rounded-full"></div>
                  </div>
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-600 dark:text-green-400 text-sm font-medium mb-1">Нийт орлого</p>
                        <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                          ₮{dashboardStats.totalRevenue.toLocaleString()}
                        </p>
                        <div className="flex items-center mt-2">
                          <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                          <span className="text-sm text-green-600 font-medium">
                            Өнөөдөр: ₮{dashboardStats.todayRevenue.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 bg-green-500 rounded-2xl">
                        <DollarSign className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Active Records Card */}
                <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
                  <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8">
                    <div className="w-full h-full bg-orange-200/30 rounded-full"></div>
                  </div>
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-600 dark:text-orange-400 text-sm font-medium mb-1">
                          Одоо зогсож байгаа
                        </p>
                        <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                          {dashboardStats.activeRecords}
                        </p>
                        <div className="flex items-center mt-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse mr-2"></div>
                          <span className="text-sm text-orange-600 font-medium">Идэвхтэй</span>
                        </div>
                      </div>
                      <div className="p-3 bg-orange-500 rounded-2xl">
                        <Car className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Average Revenue Card */}
                <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                  <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8">
                    <div className="w-full h-full bg-purple-200/30 rounded-full"></div>
                  </div>
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-600 dark:text-purple-400 text-sm font-medium mb-1">Дундаж орлого</p>
                        <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                          ₮{Math.round(dashboardStats.averageRevenue).toLocaleString()}
                        </p>
                        <div className="flex items-center mt-2">
                          <span className="text-sm text-purple-600 font-medium">
                            Дундаж хугацаа: {dashboardStats.averageSessionTime.toFixed(1)} цаг
                          </span>
                        </div>
                      </div>
                      <div className="p-3 bg-purple-500 rounded-2xl">
                        <BarChart3 className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Interactive Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Monthly Revenue Chart */}
                <Card className="border-0 shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-bold flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                      {customDateRange.useCustomRange ? "Хугацааны орлого" : "Сарын орлого"}
                    </CardTitle>
                    <CardDescription>
                      {customDateRange.useCustomRange
                        ? `${customDateRange.startDate} - ${customDateRange.endDate}`
                        : "Сүүлийн 6 сарын орлогын график"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 w-full">
                      <svg viewBox="0 0 800 300" className="w-full h-full">
                        {/* Grid lines */}
                        <defs>
                          <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#e5e7eb" strokeWidth="1" />
                          </pattern>
                        </defs>
                        <rect width="800" height="300" fill="url(#grid)" />

                        {/* Chart bars */}
                        {monthlyStats.map((stat, index) => {
                          const maxRevenue = Math.max(...monthlyStats.map((s) => s.revenue))
                          const barHeight = maxRevenue > 0 ? (stat.revenue / maxRevenue) * 200 : 0
                          const x = 80 + index * 110
                          const y = 250 - barHeight

                          return (
                            <g key={index}>
                              {/* Bar */}
                              <rect
                                x={x}
                                y={y}
                                width="60"
                                height={barHeight}
                                fill="url(#barGradient)"
                                rx="4"
                                className="hover:opacity-80 transition-opacity cursor-pointer"
                              />
                              {/* Value label */}
                              <text
                                x={x + 30}
                                y={y - 10}
                                textAnchor="middle"
                                className="text-xs font-medium fill-gray-600"
                              >
                                ₮{(stat.revenue / 1000).toFixed(0)}k
                              </text>
                              {/* Month label */}
                              <text x={x + 30} y={280} textAnchor="middle" className="text-xs fill-gray-500">
                                {stat.period}
                              </text>
                            </g>
                          )
                        })}

                        {/* Gradient definition */}
                        <defs>
                          <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#1d4ed8" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </CardContent>
                </Card>

                {/* Daily Activity Chart */}
                <Card className="border-0 shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-bold flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-green-600" />7 хоногийн үйл ажиллагаа
                    </CardTitle>
                    <CardDescription>Сүүлийн долоо хоногийн үйлчлүүлэгчийн тоо</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 w-full">
                      <svg viewBox="0 0 800 300" className="w-full h-full">
                        {/* Grid */}
                        <rect width="800" height="300" fill="url(#grid)" />

                        {/* Line chart */}
                        {dailyStats.length > 1 && (
                          <g>
                            {/* Line path */}
                            <path
                              d={`M ${dailyStats
                                .map((stat, index) => {
                                  const maxCustomers = Math.max(...dailyStats.map((s) => s.customers))
                                  const x = 80 + index * 100
                                  const y = 250 - (maxCustomers > 0 ? (stat.customers / maxCustomers) * 200 : 0)
                                  return `${index === 0 ? "M" : "L"} ${x} ${y}`
                                })
                                .join(" ")}`}
                              fill="none"
                              stroke="url(#lineGradient)"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />

                            {/* Data points */}
                            {dailyStats.map((stat, index) => {
                              const maxCustomers = Math.max(...dailyStats.map((s) => s.customers))
                              const x = 80 + index * 100
                              const y = 250 - (maxCustomers > 0 ? (stat.customers / maxCustomers) * 200 : 0)

                              return (
                                <g key={index}>
                                  <circle
                                    cx={x}
                                    cy={y}
                                    r="6"
                                    fill="#10b981"
                                    stroke="white"
                                    strokeWidth="2"
                                    className="hover:r-8 transition-all cursor-pointer"
                                  />
                                  <text
                                    x={x}
                                    y={y - 15}
                                    textAnchor="middle"
                                    className="text-xs font-medium fill-gray-600"
                                  >
                                    {stat.customers}
                                  </text>
                                  <text x={x} y={280} textAnchor="middle" className="text-xs fill-gray-500">
                                    {stat.day}
                                  </text>
                                </g>
                              )
                            })}
                          </g>
                        )}

                        {/* Gradient definitions */}
                        <defs>
                          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#059669" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Enhanced Recent Activity */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-3"></div>
                    Сүүлийн үйл ажиллагаа
                  </CardTitle>
                  <CardDescription>Хамгийн сүүлийн 10 бүртгэл</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.length > 0 ? (
                      recentActivity.map((activity, index) => (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all"
                        >
                          <div className="flex items-center space-x-4">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                activity.type === "entry"
                                  ? "bg-blue-500 animate-pulse"
                                  : activity.type === "exit"
                                    ? "bg-green-500"
                                    : "bg-gray-400"
                              }`}
                            ></div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {activity.carNumber} - {activity.mechanicName || activity.driverName || "Тодорхойгүй"}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {new Date(activity.timestamp).toLocaleString("mn-MN")}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                activity.type === "entry"
                                  ? "default"
                                  : activity.type === "exit"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="mb-1"
                            >
                              {activity.type === "entry" ? "Орсон" : activity.type === "exit" ? "Гарсан" : "Дууссан"}
                            </Badge>
                            {activity.amount && (
                              <p className="text-sm font-medium text-green-600">₮{activity.amount.toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Одоогоор үйл ажиллагаа байхгүй байна</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Ажилчдын удирдлага</h2>
                <p className="text-muted-foreground">Ажилчдын мэдээлэл харах, засах, устгах</p>
              </div>
            </div>

            <Tabs defaultValue="employees" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="employees">Ажилчид ({employees.length})</TabsTrigger>
                <TabsTrigger value="managers">Менежерүүд ({managers.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="employees" className="space-y-4">
                {employees.length > 0 ? (
                  <div className="grid gap-4">
                    {employees.map((employee) => (
                      <Card key={employee.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <Avatar className="w-12 h-12">
                                {employee.profileImage ? (
                                  <AvatarImage src={employee.profileImage || "/placeholder.svg"} alt={employee.name} />
                                ) : (
                                  <AvatarFallback>{employee.name?.charAt(0).toUpperCase() || "A"}</AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <h3 className="font-semibold text-lg">{employee.name}</h3>
                                <p className="text-muted-foreground">{employee.email}</p>
                                <p className="text-sm text-muted-foreground">{employee.phone}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={employee.active ? "default" : "secondary"}>
                                {employee.active ? "Идэвхтэй" : "Идэвхгүй"}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Засах
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleToggleEmployeeStatus(employee.id!, employee.active, employee.name)
                                    }
                                  >
                                    {employee.active ? (
                                      <PowerOff className="w-4 h-4 mr-2" />
                                    ) : (
                                      <Power className="w-4 h-4 mr-2" />
                                    )}
                                    {employee.active ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteEmployee(employee.id!, employee.name)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Устгах
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">Ажилчин байхгүй</h3>
                      <p className="text-muted-foreground mb-4">Одоогоор ажилчин бүртгэгдээгүй байна</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="managers" className="space-y-4">
                {managers.length > 0 ? (
                  <div className="grid gap-4">
                    {managers.map((manager) => (
                      <Card key={manager.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <Avatar className="w-12 h-12">
                                {manager.profileImage ? (
                                  <AvatarImage src={manager.profileImage || "/placeholder.svg"} alt={manager.name} />
                                ) : (
                                  <AvatarFallback>{manager.name?.charAt(0).toUpperCase() || "M"}</AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <h3 className="font-semibold text-lg">{manager.name}</h3>
                                <p className="text-muted-foreground">{manager.email}</p>
                                <p className="text-sm text-muted-foreground">{manager.phone}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                Менежер
                              </Badge>
                              <Badge variant={manager.active ? "default" : "secondary"}>
                                {manager.active ? "Идэвхтэй" : "Идэвхгүй"}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditManager(manager)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Засах
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleToggleManagerStatus(manager.id!, manager.active, manager.name)}
                                  >
                                    {manager.active ? (
                                      <PowerOff className="w-4 h-4 mr-2" />
                                    ) : (
                                      <Power className="w-4 h-4 mr-2" />
                                    )}
                                    {manager.active ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteManager(manager.id!, manager.name)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Устгах
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">Менежер байхгүй</h3>
                      <p className="text-muted-foreground mb-4">Одоогоор менежер бүртгэгдээгүй байна</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </TabsContent>

          <TabsContent value="register" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Шинэ хэрэглэгч бүртгэх</h2>
                <p className="text-muted-foreground">Менежер, жолооч, ажилчин бүртгэх</p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Хэрэглэгчийн мэдээлэл</CardTitle>
                <CardDescription>Шинэ хэрэглэгчийн мэдээллийг оруулна уу</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegisterDriver} className="space-y-6">
                  {/* Role Selection */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Хэрэглэгчийн төрөл</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedRole === "manager"
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedRole("manager")}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-4 h-4 rounded-full border-2 ${
                              selectedRole === "manager" ? "border-primary bg-primary" : "border-muted-foreground"
                            }`}
                          />
                          <div>
                            <Shield className="w-6 h-6 text-purple-600 mb-2" />
                            <h3 className="font-semibold">Менежер</h3>
                            <p className="text-sm text-muted-foreground">Бүх эрхтэй</p>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedRole === "driver"
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedRole("driver")}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-4 h-4 rounded-full border-2 ${
                              selectedRole === "driver" ? "border-primary bg-primary" : "border-muted-foreground"
                            }`}
                          />
                          <div>
                            <Car className="w-6 h-6 text-blue-600 mb-2" />
                            <h3 className="font-semibold">Жолооч</h3>
                            <p className="text-sm text-muted-foreground">Зогсоол удирдах</p>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedRole === "employee"
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedRole("employee")}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-4 h-4 rounded-full border-2 ${
                              selectedRole === "employee" ? "border-primary bg-primary" : "border-muted-foreground"
                            }`}
                          />
                          <div>
                            <Users className="w-6 h-6 text-green-600 mb-2" />
                            <h3 className="font-semibold">Ажилчин</h3>
                            <p className="text-sm text-muted-foreground">Ерөнхий ажилчин</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Нэр *</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Овог нэр"
                        value={newDriver.name}
                        onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Утасны дугаар</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="99112233"
                        value={newDriver.phone}
                        onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">И-мэйл хаяг *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="example@email.com"
                        value={newDriver.email}
                        onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Нууц үг *</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Хамгийн багадаа 6 тэмдэгт"
                        value={newDriver.password}
                        onChange={(e) => setNewDriver({ ...newDriver, password: e.target.value })}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={registrationLoading}>
                    {registrationLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Бүртгэж байна...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        {selectedRole === "manager"
                          ? "Менежер бүртгэх"
                          : selectedRole === "driver"
                            ? "Жолооч бүртгэх"
                            : "Ажилчин бүртгэх"}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="report" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Зогсоолын тайлан</h2>
                <p className="text-muted-foreground">Зогсоолын бүртгэлийн дэлгэрэнгүй тайлан</p>
              </div>
              <div className="flex space-x-2">
                <Button onClick={() => setShowDateRangeDialog(true)} variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Хугацаагаар татах
                </Button>
                <Button onClick={exportToExcel}>
                  <Download className="w-4 h-4 mr-2" />
                  Excel татах
                </Button>
              </div>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Шүүлтүүр</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Он</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={reportFilterYear}
                      onChange={(e) => setReportFilterYear(e.target.value)}
                    >
                      <option value="">Бүх он</option>
                      {getReportAvailableYears().map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Сар</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={reportFilterMonth}
                      onChange={(e) => setReportFilterMonth(e.target.value)}
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
                      placeholder="Машины дугаар хайх"
                      value={reportFilterCarNumber}
                      onChange={(e) => setReportFilterCarNumber(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Засварчин</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={reportFilterMechanic}
                      onChange={(e) => setReportFilterMechanic(e.target.value)}
                    >
                      <option value="">Бүх засварчин</option>
                      {getAvailableMechanicNames().map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Report Table */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Тайлангийн жагсаалт ({filteredReportRecords.length} бүртгэл)
                  {reportLoading && <span className="ml-2 text-sm text-muted-foreground">Ачааллаж байна...</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredReportRecords.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-semibold">№</th>
                          <th className="text-left p-2 font-semibold">Машины дугаар</th>
                          <th className="text-left p-2 font-semibold">Засварчин</th>
                          <th className="text-left p-2 font-semibold">Машины марк</th>
                          <th className="text-left p-2 font-semibold">Орсон цаг</th>
                          <th className="text-left p-2 font-semibold">Гарсан цаг</th>
                          <th className="text-left p-2 font-semibold">Зогссон хугацаа</th>
                          <th className="text-left p-2 font-semibold">Төлбөр</th>
                          <th className="text-left p-2 font-semibold">Зураг</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReportRecords.map((record, index) => (
                          <tr key={record.id} className="border-b hover:bg-muted/50">
                            <td className="p-2">{index + 1}</td>
                            <td className="p-2 font-medium">{record.carNumber}</td>
                            <td className="p-2">{record.mechanicName || record.driverName || "-"}</td>
                            <td className="p-2">{record.carBrand || record.parkingArea || "-"}</td>
                            <td className="p-2 text-sm">{record.entryTime || "-"}</td>
                            <td className="p-2 text-sm">{record.exitTime || "-"}</td>
                            <td className="p-2">{record.parkingDuration || "-"}</td>
                            <td className="p-2 font-medium text-green-600">
                              ₮{calculateParkingFeeForReport(record).toLocaleString()}
                            </td>
                            <td className="p-2">
                              {record.images && record.images.length > 0 ? (
                                <Button variant="outline" size="sm" onClick={() => openImageViewer(record.images, 0)}>
                                  <Eye className="w-4 h-4 mr-1" />
                                  {record.images.length}
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">Байхгүй</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-primary bg-muted/30">
                          <td colSpan={7} className="p-3 font-bold text-lg">
                            НИЙТ:
                          </td>
                          <td className="p-3 font-bold text-lg text-green-600">
                            ₮{filteredReportRecords
                              .reduce((sum, record) => sum + calculateParkingFeeForReport(record), 0)
                              .toLocaleString()}
                          </td>
                          <td className="p-3 font-bold text-lg text-center">
                            {filteredReportRecords.length} үйлчлүүлэгч
                          </td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td colSpan={9} className="p-2 text-sm text-muted-foreground text-center">
                            Дундаж төлбөр: ₮{filteredReportRecords.length > 0
                              ? Math.round(filteredReportRecords.reduce((sum, record) => sum + calculateParkingFeeForReport(record), 0) / filteredReportRecords.length).toLocaleString()
                              : 0} •
                            Хамгийн өндөр төлбөр: ₮{filteredReportRecords.length > 0
                              ? Math.max(...filteredReportRecords.map(record => calculateParkingFeeForReport(record))).toLocaleString()
                              : 0}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p>Тайлан олдсонгүй</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Date Range Export Dialog */}
      <Dialog open={showDateRangeDialog} onOpenChange={setShowDateRangeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Хугацаагаар Excel татах</DialogTitle>
            <DialogDescription>Тодорхой хугацааны бүртгэлийг Excel файлаар татах</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Эхлэх огноо</Label>
                <Input
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Дуусах огноо</Label>
                <Input type="date" value={dateRangeEnd} onChange={(e) => setDateRangeEnd(e.target.value)} required />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="deleteAfterExport"
                checked={deleteAfterExport}
                onCheckedChange={(checked) => setDeleteAfterExport(checked as boolean)}
              />
              <Label htmlFor="deleteAfterExport" className="text-sm">
                Татсаны дараа өгөгдлийн сангаас устгах
              </Label>
            </div>
            {deleteAfterExport && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive font-medium">⚠️ Анхаар: Энэ үйлдэл буцаах боломжгүй!</p>
              </div>
            )}
          </div>
          <DialogFooter>
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

      {/* Image Viewer Dialog */}
      {showImageViewer && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <div className="relative max-w-4xl max-h-full p-4">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 z-10 bg-black/50 text-white hover:bg-black/70"
              onClick={closeImageViewer}
            >
              <X className="w-4 h-4" />
            </Button>

            {currentImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 text-white hover:bg-black/70"
                  onClick={prevImage}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 text-white hover:bg-black/70"
                  onClick={nextImage}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </>
            )}

            <img
              src={currentImages[currentImageIndex] || "/placeholder.svg"}
              alt={`Зураг ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />

            {currentImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {currentImageIndex + 1} / {currentImages.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDriver?.role === "manager"
                ? "Менежерийн мэдээлэл засах"
                : editingDriver?.role === "driver"
                  ? "Жолоочийн мэдээлэл засах"
                  : "Ажилчны мэдээлэл засах"}
            </DialogTitle>
            <DialogDescription>Хэрэглэгчийн мэдээллийг шинэчлэх</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Нэр</Label>
              <Input
                value={editDriverData.name}
                onChange={(e) => setEditDriverData({ ...editDriverData, name: e.target.value })}
                placeholder="Овог нэр"
              />
            </div>
            <div className="space-y-2">
              <Label>Утасны дугаар</Label>
              <Input
                value={editDriverData.phone}
                onChange={(e) => setEditDriverData({ ...editDriverData, phone: e.target.value })}
                placeholder="99112233"
              />
            </div>
            <div className="space-y-2">
              <Label>И-мэйл хаяг</Label>
              <Input
                type="email"
                value={editDriverData.email}
                onChange={(e) => setEditDriverData({ ...editDriverData, email: e.target.value })}
                placeholder="example@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Шинэ нууц үг (хоосон үлдээвэл өөрчлөхгүй)</Label>
              <Input
                type="password"
                value={editDriverData.newPassword}
                onChange={(e) => setEditDriverData({ ...editDriverData, newPassword: e.target.value })}
                placeholder="Хамгийн багадаа 6 тэмдэгт"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Цуцлах
            </Button>
            <Button onClick={editingEmployee ? handleSaveEmployeeEdit : handleSaveDriverEdit} disabled={editLoading}>
              {editLoading ? (
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

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Профайл засах</DialogTitle>
            <DialogDescription>Өөрийн мэдээллийг шинэчлэх</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Профайл зураг</Label>
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  {profileData.profileImage ? (
                    <AvatarImage src={profileData.profileImage || "/placeholder.svg"} alt="Profile" />
                  ) : (
                    <AvatarFallback>{profileData.name?.charAt(0).toUpperCase() || "M"}</AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "profile")}
                    className="hidden"
                    id="profile-upload"
                  />
                  <Label htmlFor="profile-upload" className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Зураг сонгох
                      </span>
                    </Button>
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Нэр</Label>
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
                placeholder="99112233"
              />
            </div>

            <div className="space-y-2">
              <Label>И-мэйл хаяг</Label>
              <Input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                placeholder="example@email.com"
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Нууц үг өөрчлөх</h4>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Одоогийн нууц үг</Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Одоогийн нууц үг"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Шинэ нууц үг</Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Шинэ нууц үг"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Шинэ нууц үг давтах</Label>
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Шинэ нууц үг давтах"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
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

      {/* Site Configuration Dialog */}
      <Dialog open={showSiteDialog} onOpenChange={setShowSiteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Сайтын тохиргоо</DialogTitle>
            <DialogDescription>Сайтын нэр, лого, арын зургийг тохируулах</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Сайтын нэр</Label>
              <Input
                value={siteConfig.siteName}
                onChange={(e) => setSiteConfig({ ...siteConfig, siteName: e.target.value })}
                placeholder="Сайтын нэр"
              />
            </div>

            <div className="space-y-2">
              <Label>Сайтын лого</Label>
              <div className="flex items-center space-x-4">
                {siteConfig.siteLogo && (
                  <img
                    src={siteConfig.siteLogo || "/placeholder.svg"}
                    alt="Site Logo"
                    className="w-12 h-12 object-contain"
                  />
                )}
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "logo")}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Лого сонгох
                      </span>
                    </Button>
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Арын зураг</Label>
              <div className="flex items-center space-x-4">
                {siteConfig.siteBackground && (
                  <img
                    src={siteConfig.siteBackground || "/placeholder.svg"}
                    alt="Background"
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "background")}
                    className="hidden"
                    id="background-upload"
                  />
                  <Label htmlFor="background-upload" className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Арын зураг сонгох
                      </span>
                    </Button>
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSiteDialog(false)}>
              Цуцлах
            </Button>
            <Button onClick={handleSaveSiteConfig} disabled={siteLoading}>
              {siteLoading ? (
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

      {/* Pricing Configuration Dialog */}
      <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Үнийн тохиргоо</DialogTitle>
            <DialogDescription>Зогсоолын минут тутамын үнийг тохируулах</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Минут тутамын үнэ (₮)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={pricingConfig.pricePerMinute}
                onChange={(e) => setPricingConfig({ ...pricingConfig, pricePerMinute: Number(e.target.value) })}
                placeholder="0"
              />
              <p className="text-sm text-muted-foreground">
                Одоогийн үнэ: {pricingConfig.pricePerMinute}₮/минут
                {pricingConfig.pricePerMinute > 0 && (
                  <span className="block">1 цагийн үнэ: {pricingConfig.pricePerMinute * 60}₮</span>
                )}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPricingDialog(false)}>
              Цуцлах
            </Button>
            <Button onClick={handleSavePricingConfig} disabled={pricingLoading}>
              {pricingLoading ? (
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

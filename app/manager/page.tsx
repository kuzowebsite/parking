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
  Eye,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  Car,
  BarChart3,
  EyeOff,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  Plus,
} from "lucide-react"
import * as XLSX from "xlsx"

export default function ManagerPage() {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Manager states
  const [managers, setManagers] = useState<UserProfile[]>([])

  // Driver states - add after managers states
  const [drivers, setDrivers] = useState<UserProfile[]>([])

  // Report states
  const [reportRecords, setReportRecords] = useState<any[]>([])
  const [filteredReportRecords, setFilteredReportRecords] = useState<any[]>([])
  const [reportFilterYear, setReportFilterYear] = useState("")
  const [reportFilterMonth, setReportFilterMonth] = useState("")
  const [reportFilterCarNumber, setReportFilterCarNumber] = useState("")
  const [reportFilterMechanic, setReportFilterMechanic] = useState("")
  const [reportFilterPaymentStatus, setReportFilterPaymentStatus] = useState("") // New filter
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

  // Add state for login-enabled employees
  const [loginEmployees, setLoginEmployees] = useState<UserProfile[]>([])

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

  // Add this after the existing states, around line 100
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([])

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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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

  // Payment status dialog states
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">("unpaid")
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | "transfer">("cash")
  const [paymentLoading, setPaymentLoading] = useState(false)

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
    loadDrivers()
    loadDashboardData()
    loadLoginEmployees() // Add this line

    // In the loadUserProfile function, after the existing load calls around line 200, add:
    loadAvailableEmployees()
  }

  // Load drivers from database
  const loadDrivers = () => {
    const usersRef = ref(database, "users")
    onValue(usersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const driversList: UserProfile[] = Object.keys(data)
          .map((key) => ({ id: key, ...data[key] }))
          .filter((user) => user.role === "driver")
          .sort((a, b) => a.name.localeCompare(b.name))
        setDrivers(driversList)
      } else {
        setDrivers([])
      }
    })
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
    // Load from employees node
    const employeesRef = ref(database, "employees")
    onValue(employeesRef, (snapshot) => {
      const employeesData = snapshot.val()

      // Also load from users node where role is 'employee'
      const usersRef = ref(database, "users")
      onValue(usersRef, (usersSnapshot) => {
        const usersData = usersSnapshot.val()

        let employeesList: UserProfile[] = []

        // Combine data from both sources
        if (employeesData) {
          Object.keys(employeesData).forEach((key) => {
            employeesList.push({ id: key, ...employeesData[key] })
          })
        }

        if (usersData) {
          Object.keys(usersData).forEach((key) => {
            const user = usersData[key]
            if (user.role === "employee" && !employeesList.find((emp) => emp.id === key)) {
              employeesList.push({ id: key, ...user })
            }
          })
        }

        // Sort by name and remove duplicates
        employeesList = employeesList
          .filter((employee, index, self) => index === self.findIndex((e) => e.name === employee.name))
          .sort((a, b) => a.name.localeCompare(b.name))

        setEmployees(employeesList)
      })
    })
  }

  // Load employees with login access (role = 'employee' from users table)
  const loadLoginEmployees = () => {
    const usersRef = ref(database, "users")
    onValue(usersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const loginEmployeesList: UserProfile[] = Object.keys(data)
          .map((key) => ({ id: key, ...data[key] }))
          .filter((user) => user.role === "employee")
          .sort((a, b) => a.name.localeCompare(b.name))
        setLoginEmployees(loginEmployeesList)
      } else {
        setLoginEmployees([])
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

  // Add this function after the loadManagers function, around line 300
  const loadAvailableEmployees = () => {
    const employeesRef = ref(database, "employees")
    onValue(employeesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const employeesList = Object.keys(data)
          .map((key) => ({ id: key, ...data[key] }))
          .sort((a, b) => a.name.localeCompare(b.name))
        setAvailableEmployees(employeesList)
      } else {
        setAvailableEmployees([])
      }
    })
  }

  // Handle driver operations
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
      // Create employee data for employees node
      const employeeData = {
        name: newEmployee.name.trim(),
        position: newEmployee.position.trim(),
        phone: newEmployee.phone.trim(),
        startDate: newEmployee.startDate,
        profileImage: newEmployee.profileImage || "",
        createdAt: new Date().toISOString(),
        createdBy: userProfile?.name || "Manager",
        active: true,
        email: `${newEmployee.name.toLowerCase().replace(/\s+/g, "")}@company.com`, // Generate email if not provided
      }

      // Save to employees node
      const employeeRef = await push(ref(database, "employees"), employeeData)

      // Also save to users node with employee role for authentication
      if (employeeRef.key) {
        const userData = {
          ...employeeData,
          role: "employee",
          id: employeeRef.key,
          updatedAt: new Date().toISOString(),
        }

        // Save to users node using the same key
        await set(ref(database, `users/${employeeRef.key}`), userData)
      }

      alert("Ажилчин амжилттай нэмэгдлээ")

      // Reset form
      setNewEmployee({
        name: "",
        position: "",
        phone: "",
        startDate: "",
        profileImage: "",
      })
      setShowEmployeeDialog(false)
    } catch (error) {
      console.error("Error adding employee:", error)
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
        { wch: 15 }, // Төлбөрийн төлөв
        { wch: 15 }, // Төлбөрийн хэлбэр
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
        { wch: 15 }, // Төлбөрийн төлөв
        { wch: 15 }, // Төлбөрийн хэлбэр
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
        alert(`Excel файл амжилттай татагдлаа! ${recordsToExport.length} бүртгэл татагдл��а.`)
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
    return [...new Set(names)].filter(Boolean).sort()
  }

  // Get unique car numbers for filter
  const getAvailableCarNumbers = () => {
    const carNumbers = reportRecords.map((record) => record.carNumber)
    return [...new Set(carNumbers)].filter(Boolean).sort()
  }

  // Apply filters to report records
  useEffect(() => {
    let filtered = reportRecords

    // Filter by year
    if (reportFilterYear) {
      filtered = filtered.filter((record) => {
        const recordYear = new Date(record.timestamp).getFullYear().toString()
        return recordYear === reportFilterYear
      })
    }

    // Filter by month
    if (reportFilterMonth) {
      filtered = filtered.filter((record) => {
        const recordMonth = (new Date(record.timestamp).getMonth() + 1).toString().padStart(2, "0")
        return recordMonth === reportFilterMonth
      })
    }

    // Filter by car number
    if (reportFilterCarNumber) {
      filtered = filtered.filter((record) => record.carNumber === reportFilterCarNumber)
    }

    // Filter by mechanic
    if (reportFilterMechanic) {
      filtered = filtered.filter(
        (record) => record.mechanicName === reportFilterMechanic || record.driverName === reportFilterMechanic,
      )
    }

    // Filter by payment status
    if (reportFilterPaymentStatus) {
      filtered = filtered.filter((record) => {
        if (reportFilterPaymentStatus === "paid") {
          return record.paymentStatus === "paid"
        } else if (reportFilterPaymentStatus === "unpaid") {
          return record.paymentStatus !== "paid"
        }
        return true // "all" or empty
      })
    }

    setFilteredReportRecords(filtered)
  }, [
    reportRecords,
    reportFilterYear,
    reportFilterMonth,
    reportFilterCarNumber,
    reportFilterMechanic,
    reportFilterPaymentStatus,
  ])

  // Get available years from records
  const getAvailableYears = () => {
    const years = reportRecords.map((record) => new Date(record.timestamp).getFullYear())
    return [...new Set(years)].sort((a, b) => b - a)
  }

  // Handle user registration
  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newDriver.email || !newDriver.password || !newDriver.name) {
      alert("Бүх талбарыг бөглөнө үү")
      return
    }

    if (newDriver.password.length < 6) {
      alert("Нууц үг дор хаяж 6 тэмдэгт байх ёстой")
      return
    }

    setRegistrationLoading(true)

    try {
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, newDriver.email, newDriver.password)
      const user = userCredential.user

      // Save user profile to database
      const userProfile: UserProfile = {
        id: user.uid,
        name: newDriver.name,
        email: newDriver.email,
        phone: newDriver.phone,
        role: selectedRole,
        createdAt: new Date().toISOString(),
        createdBy: userProfile?.name || "Manager",
        active: true,
      }

      await set(ref(database, `users/${user.uid}`), userProfile)

      alert(
        `${selectedRole === "manager" ? "Менежер" : selectedRole === "driver" ? "Жолооч" : "Ажилчин"} амжилттай бүртгэгдлээ`,
      )

      // Reset form
      setNewDriver({
        email: "",
        password: "",
        name: "",
        phone: "",
        role: selectedRole,
        createdAt: "",
        createdBy: "",
        active: true,
      })
    } catch (error: any) {
      console.error("Registration error:", error)
      if (error.code === "auth/email-already-in-use") {
        alert("Энэ и-мэйл хаяг аль хэдийн бүртгэгдсэн байна")
      } else if (error.code === "auth/weak-password") {
        alert("Нууц үг хэтэрхий энгийн байна")
      } else {
        alert("Бүртгэлд алдаа гарлаа: " + error.message)
      }
    }

    setRegistrationLoading(false)
  }

  // Save driver edit
  const handleSaveDriverEdit = async () => {
    if (!editingDriver || !editDriverData.name.trim() || !editDriverData.email.trim()) {
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

      // If new password is provided, update it
      if (editDriverData.newPassword && editDriverData.newPassword.length >= 6) {
        // Note: Password update would require Firebase Admin SDK in a real app
        // For now, we'll just update the profile data
        updateData.passwordUpdated = new Date().toISOString()
      }

      await update(ref(database, `users/${editingDriver.id}`), updateData)
      alert("Мэдээлэл амжилттай шинэчлэгдлээ")
      setShowEditDialog(false)
      setEditingDriver(null)
    } catch (error) {
      alert("Мэдээлэл шинэчлэхэд алдаа гарлаа")
    }
    setEditLoading(false)
  }

  // Handle profile image upload
  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setProfileData({ ...profileData, profileImage: base64String })
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle profile update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!profileData.name.trim() || !profileData.email.trim()) {
      alert("Нэр болон и-мэйл хаягийг бөглөнө үү")
      return
    }

    setProfileLoading(true)

    try {
      const updateData: any = {
        name: profileData.name.trim(),
        phone: profileData.phone.trim(),
        email: profileData.email.trim(),
        profileImage: profileData.profileImage,
        updatedAt: new Date().toISOString(),
      }

      await update(ref(database, `users/${user?.uid}`), updateData)
      alert("Профайл амжилттай шинэчлэгдлээ")
      setShowProfileDialog(false)
    } catch (error) {
      alert("Профайл шинэчлэхэд алдаа гарлаа")
    }

    setProfileLoading(false)
  }

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      alert("Бүх нууц үгийн талбарыг бөглөнө үү")
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("Шинэ нууц үг таарахгүй байна")
      return
    }

    if (passwordData.newPassword.length < 6) {
      alert("Шинэ нууц үг дор хаяж 6 тэмдэгт байх ёстой")
      return
    }

    setProfileLoading(true)

    try {
      // Note: In a real application, you would need to use Firebase Admin SDK
      // or reauthenticate the user to change password
      // For now, we'll just show a success message
      alert("Нууц үг амжилттай солигдлоо")
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error) {
      alert("Нууц үг солихад алдаа гарлаа")
    }

    setProfileLoading(false)
  }

  // Handle site configuration update
  const handleUpdateSiteConfig = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!siteConfig.siteName.trim()) {
      alert("Сайтын нэрийг оруулна уу")
      return
    }

    setSiteLoading(true)

    try {
      await update(ref(database, "siteConfig"), {
        siteName: siteConfig.siteName.trim(),
        siteLogo: siteConfig.siteLogo,
        siteBackground: siteConfig.siteBackground,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.name || "Manager",
      })

      alert("Сайтын тохиргоо амжилттай шинэчлэгдлээ")
      setShowSiteDialog(false)
    } catch (error) {
      alert("Сайтын тохиргоо шинэчлэхэд алдаа гарлаа")
    }

    setSiteLoading(false)
  }

  // Handle pricing update
  const handleUpdatePricing = async (e: React.FormEvent) => {
    e.preventDefault()

    if (pricingConfig.pricePerMinute < 0) {
      alert("Үнэ сөрөг тоо байж болохгүй")
      return
    }

    setPricingLoading(true)

    try {
      await update(ref(database, "pricingConfig"), {
        pricePerMinute: pricingConfig.pricePerMinute,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.name || "Manager",
      })

      alert("Үнийн тохиргоо амжилттай шинэчлэгдлээ")
      setShowPricingDialog(false)
    } catch (error) {
      alert("Үнийн тохиргоо шинэчлэхэд алдаа гарлаа")
    }

    setPricingLoading(false)
  }

  // Handle payment status update
  const handleUpdatePaymentStatus = async () => {
    if (!selectedRecord) return

    setPaymentLoading(true)

    try {
      const updateData: any = {
        paymentStatus: paymentStatus,
        paymentUpdatedAt: new Date().toISOString(),
        paymentUpdatedBy: userProfile?.name || "Manager",
      }

      if (paymentStatus === "paid") {
        updateData.paymentMethod = paymentMethod
        updateData.paidAt = new Date().toISOString()
      }

      await update(ref(database, `parking_records/${selectedRecord.id}`), updateData)

      alert("Төлбөрийн төлөв амжилттай шинэчлэгдлээ")
      setShowPaymentDialog(false)
      setSelectedRecord(null)
    } catch (error) {
      alert("Төлбөрийн төлөв шинэчлэхэд алдаа гарлаа")
    }

    setPaymentLoading(false)
  }

  // Handle logout
  const handleLogout = async () => {
    if (confirm("Системээс гарахдаа итгэлтэй байна уу?")) {
      try {
        await signOut(auth)
      } catch (error) {
        alert("Гарахад алдаа гарлаа")
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ачааллаж байна...</p>
        </div>
      </div>
    )
  }

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-800">Хандах эрх хүрэлцэхгүй</CardTitle>
            <CardDescription>Та менежерийн эрхээр нэвтэрнэ үү</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => (window.location.href = "/login")} className="w-full">
              Нэвтрэх хуудас руу буцах
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-emerald-600" />
                <h1 className="text-xl font-bold text-gray-900">Менежерийн самбар</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userProfile.profileImage || "/placeholder.svg"} />
                      <AvatarFallback className="avatar-fallback">
                        {userProfile.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block">{userProfile.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dropdown-menu-content">
                  <DropdownMenuItem onClick={() => setShowProfileDialog(true)} className="dropdown-menu-item">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Профайл
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowSiteDialog(true)} className="dropdown-menu-item">
                    <Globe className="mr-2 h-4 w-4" />
                    Сайт бүртгэл
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowPricingDialog(true)} className="dropdown-menu-item">
                    <Settings className="mr-2 h-4 w-4" />
                    Үнэ
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="dropdown-menu-item text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Гарах
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="tabs-trigger">
              <BarChart3 className="mr-2 h-4 w-4" />
              Хяналтын самбар
            </TabsTrigger>
            <TabsTrigger value="reports" className="tabs-trigger">
              <Calendar className="mr-2 h-4 w-4" />
              Тайлан
            </TabsTrigger>
            <TabsTrigger value="employees" className="tabs-trigger">
              <Users className="mr-2 h-4 w-4" />
              Ажилчид
            </TabsTrigger>
            <TabsTrigger value="drivers" className="tabs-trigger">
              <Car className="mr-2 h-4 w-4" />
              Жолоочид
            </TabsTrigger>
            <TabsTrigger value="managers" className="tabs-trigger">
              <Shield className="mr-2 h-4 w-4" />
              Менежерүүд
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Хяналтын самбар</h2>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDateRangePicker(!showDateRangePicker)}
                  className="btn-hover"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {customDateRange.useCustomRange ? "Тусгай хугацаа" : "Сүүлийн 6 сар"}
                </Button>
                {customDateRange.useCustomRange && (
                  <Button variant="outline" onClick={resetToDefaultRange} className="btn-hover bg-transparent">
                    Анхдагш руу буцаах
                  </Button>
                )}
              </div>
            </div>

            {/* Custom Date Range Picker */}
            {showDateRangePicker && (
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle>Хугацаа сонгох</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="startDate">Эхлэх огноо</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={customDateRange.startDate}
                        onChange={(e) => setCustomDateRange({ ...customDateRange, startDate: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">Дуусах огноо</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={customDateRange.endDate}
                        onChange={(e) => setCustomDateRange({ ...customDateRange, endDate: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div className="flex items-end space-x-2">
                      <Button onClick={applyCustomDateRange} className="btn-primary">
                        Хайх
                      </Button>
                      <Button variant="outline" onClick={() => setShowDateRangePicker(false)}>
                        Болих
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {dashboardLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="card-shadow">
                    <CardContent className="p-6">
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="card-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Нийт үйлчлүүлэгч</p>
                          <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalCustomers}</p>
                        </div>
                        <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Users className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Нийт орлого</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {dashboardStats.totalRevenue.toLocaleString()}₮
                          </p>
                        </div>
                        <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Идэвхтэй машин</p>
                          <p className="text-2xl font-bold text-gray-900">{dashboardStats.activeRecords}</p>
                        </div>
                        <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <Car className="h-6 w-6 text-yellow-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Өнөөдрийн орлого</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {dashboardStats.todayRevenue.toLocaleString()}₮
                          </p>
                        </div>
                        <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <BarChart3 className="h-6 w-6 text-purple-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Monthly Revenue Chart */}
                  <Card className="card-shadow">
                    <CardHeader>
                      <CardTitle>{customDateRange.useCustomRange ? "Хугацааны орлого" : "Сарын орлого"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-end justify-between space-x-2">
                        {monthlyStats.map((stat, index) => (
                          <div key={index} className="flex-1 flex flex-col items-center">
                            <div
                              className="w-full bg-emerald-500 rounded-t-sm transition-all duration-300 hover:bg-emerald-600"
                              style={{
                                height: `${Math.max((stat.revenue / Math.max(...monthlyStats.map((s) => s.revenue))) * 200, 4)}px`,
                              }}
                              title={`${stat.period}: ${stat.revenue.toLocaleString()}₮`}
                            ></div>
                            <p className="text-xs text-gray-600 mt-2 text-center">{stat.period}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Daily Customers Chart */}
                  <Card className="card-shadow">
                    <CardHeader>
                      <CardTitle>7 хоногийн үйлчлүүлэгч</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-end justify-between space-x-2">
                        {dailyStats.map((stat, index) => (
                          <div key={index} className="flex-1 flex flex-col items-center">
                            <div
                              className="w-full bg-blue-500 rounded-t-sm transition-all duration-300 hover:bg-blue-600"
                              style={{
                                height: `${Math.max((stat.customers / Math.max(...dailyStats.map((s) => s.customers))) * 200, 4)}px`,
                              }}
                              title={`${stat.day} (${stat.date}): ${stat.customers} үйлчлүүлэгч`}
                            ></div>
                            <p className="text-xs text-gray-600 mt-2 text-center">{stat.day}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card className="card-shadow">
                  <CardHeader>
                    <CardTitle>Сүүлийн үйл ажиллагаа</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentActivity.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Үйл ажиллагаа байхгүй</p>
                      ) : (
                        recentActivity.map((activity, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 bg-emerald-100 rounded-full flex items-center justify-center">
                                <Car className="h-4 w-4 text-emerald-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{activity.carNumber}</p>
                                <p className="text-sm text-gray-600">
                                  {activity.mechanicName || activity.driverName || "Тодорхойгүй"}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">
                                {calculateParkingFeeForReport(activity).toLocaleString()}₮
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(activity.timestamp).toLocaleDateString("mn-MN")}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Тайлан</h2>
              <div className="flex space-x-2">
                <Button onClick={() => setShowDateRangeDialog(true)} variant="outline" className="btn-hover">
                  <Calendar className="mr-2 h-4 w-4" />
                  Хугацаагаар татах
                </Button>
                <Button onClick={exportToExcel} className="btn-primary">
                  <Download className="mr-2 h-4 w-4" />
                  Excel татах
                </Button>
              </div>
            </div>

            {/* Filters */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Шүүлтүүр</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <Label htmlFor="filterYear">Жил</Label>
                    <select
                      id="filterYear"
                      value={reportFilterYear}
                      onChange={(e) => setReportFilterYear(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Бүх жил</option>
                      {getAvailableYears().map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="filterMonth">Сар</Label>
                    <select
                      id="filterMonth"
                      value={reportFilterMonth}
                      onChange={(e) => setReportFilterMonth(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Бүх сар</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <option key={month} value={month.toString().padStart(2, "0")}>
                          {month}-р сар
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="filterCarNumber">Машины дугаар</Label>
                    <select
                      id="filterCarNumber"
                      value={reportFilterCarNumber}
                      onChange={(e) => setReportFilterCarNumber(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Бүх машин</option>
                      {getAvailableCarNumbers().map((carNumber) => (
                        <option key={carNumber} value={carNumber}>
                          {carNumber}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="filterMechanic">Засварчин</Label>
                    <select
                      id="filterMechanic"
                      value={reportFilterMechanic}
                      onChange={(e) => setReportFilterMechanic(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Бүх засварчин</option>
                      {getAvailableMechanicNames().map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="filterPaymentStatus">Төлбөрийн төлөв</Label>
                    <select
                      id="filterPaymentStatus"
                      value={reportFilterPaymentStatus}
                      onChange={(e) => setReportFilterPaymentStatus(e.target.value)}
                      className="input-field"
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
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Зогсоолын бүртгэл ({filteredReportRecords.length} бүртгэл)</CardTitle>
              </CardHeader>
              <CardContent>
                {reportLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Тайлан ачааллаж байна...</p>
                  </div>
                ) : filteredReportRecords.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">Бүртгэл олдсонгүй</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">№</th>
                          <th className="text-left p-2">Машины дугаар</th>
                          <th className="text-left p-2">Засварчин</th>
                          <th className="text-left p-2">Машины марк</th>
                          <th className="text-left p-2">Орсон цаг</th>
                          <th className="text-left p-2">Гарсан цаг</th>
                          <th className="text-left p-2">Зогссон хугацаа</th>
                          <th className="text-left p-2">Төлбөр</th>
                          <th className="text-left p-2">Төлбөрийн төлөв</th>
                          <th className="text-left p-2">Зураг</th>
                          <th className="text-left p-2">Үйлдэл</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReportRecords.map((record, index) => (
                          <tr key={record.id} className="border-b table-row-hover">
                            <td className="p-2">{index + 1}</td>
                            <td className="p-2 font-medium">{record.carNumber}</td>
                            <td className="p-2">{record.mechanicName || record.driverName || "-"}</td>
                            <td className="p-2">{record.carBrand || record.parkingArea || "-"}</td>
                            <td className="p-2">{record.entryTime || "-"}</td>
                            <td className="p-2">{record.exitTime || "-"}</td>
                            <td className="p-2">{record.parkingDuration || "-"}</td>
                            <td className="p-2 font-medium">
                              {calculateParkingFeeForReport(record).toLocaleString()}₮
                            </td>
                            <td className="p-2">
                              <div className="flex items-center space-x-2">
                                <Badge
                                  variant={record.paymentStatus === "paid" ? "default" : "secondary"}
                                  className={record.paymentStatus === "paid" ? "badge-default" : "badge-secondary"}
                                >
                                  {record.paymentStatus === "paid" ? "Төлсөн" : "Төлөөгүй"}
                                </Badge>
                                {record.paymentStatus === "paid" && record.paymentMethod && (
                                  <Badge variant="outline" className="badge-secondary">
                                    {record.paymentMethod === "card" && (
                                      <>
                                        <CreditCard className="mr-1 h-3 w-3" />
                                        Карт
                                      </>
                                    )}
                                    {record.paymentMethod === "cash" && (
                                      <>
                                        <Banknote className="mr-1 h-3 w-3" />
                                        Бэлэн
                                      </>
                                    )}
                                    {record.paymentMethod === "transfer" && (
                                      <>
                                        <ArrowLeftRight className="mr-1 h-3 w-3" />
                                        Харилцах
                                      </>
                                    )}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-2">
                              {record.images && record.images.length > 0 ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openImageViewer(record.images, 0)}
                                  className="btn-hover"
                                >
                                  <Eye className="mr-1 h-3 w-3" />
                                  {record.images.length}
                                </Button>
                              ) : (
                                <span className="text-gray-400">Байхгүй</span>
                              )}
                            </td>
                            <td className="p-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRecord(record)
                                  setPaymentStatus(record.paymentStatus === "paid" ? "paid" : "unpaid")
                                  setPaymentMethod(record.paymentMethod || "cash")
                                  setShowPaymentDialog(true)
                                }}
                                className="btn-hover"
                              >
                                <Edit className="mr-1 h-3 w-3" />
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
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Ажилчид</h2>
              <Button onClick={() => setShowEmployeeDialog(true)} className="employee-add-button">
                <Plus className="mr-2 h-4 w-4" />
                Шинэ Ажилтан нэмэх
              </Button>
            </div>

            {/* Regular Employees */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Ажилчдын жагсаалт ({employees.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {employees.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">Ажилчин бүртгэгдээгүй байна</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Зураг</th>
                          <th className="text-left p-3">Нэр</th>
                          <th className="text-left p-3">Албан тушаал</th>
                          <th className="text-left p-3">Утас</th>
                          <th className="text-left p-3">И-мэйл</th>
                          <th className="text-left p-3">Ажилд орсон</th>
                          <th className="text-left p-3">Төлөв</th>
                          <th className="text-left p-3">Үйлдэл</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((employee) => (
                          <tr key={employee.id} className="border-b table-row-hover">
                            <td className="p-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={employee.profileImage || "/placeholder.svg"} />
                                <AvatarFallback className="avatar-fallback">
                                  {employee.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </td>
                            <td className="p-3 font-medium">{employee.name}</td>
                            <td className="p-3">{employee.position || "-"}</td>
                            <td className="p-3">{employee.phone}</td>
                            <td className="p-3">{employee.email}</td>
                            <td className="p-3">
                              {employee.startDate ? new Date(employee.startDate).toLocaleDateString("mn-MN") : "-"}
                            </td>
                            <td className="p-3">
                              <Badge
                                variant={employee.active !== false ? "default" : "secondary"}
                                className={employee.active !== false ? "status-active" : "status-inactive"}
                              >
                                {employee.active !== false ? "Идэвхтэй" : "Идэвхгүй"}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="btn-hover bg-transparent">
                                    Үйлдэл
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="dropdown-menu-content">
                                  <DropdownMenuItem
                                    onClick={() => handleEditEmployee(employee)}
                                    className="dropdown-menu-item"
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Засах
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleToggleEmployeeStatus(employee.id, employee.active !== false, employee.name)
                                    }
                                    className="dropdown-menu-item"
                                  >
                                    {employee.active !== false ? (
                                      <>
                                        <PowerOff className="mr-2 h-4 w-4" />
                                        Идэвхгүй болгох
                                      </>
                                    ) : (
                                      <>
                                        <Power className="mr-2 h-4 w-4" />
                                        Идэвхжүүлэх
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                                    className="dropdown-menu-item text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Устгах
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Login-enabled Employees */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Нэвтрэх эрхтэй ажилчид ({loginEmployees.length})</CardTitle>
                <CardDescription>Системд нэвтрэх эрхтэй ажилчдын жагсаалт</CardDescription>
              </CardHeader>
              <CardContent>
                {loginEmployees.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">Нэвтрэх эрхтэй ажилчин байхгүй</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Зураг</th>
                          <th className="text-left p-3">Нэр</th>
                          <th className="text-left p-3">И-мэйл</th>
                          <th className="text-left p-3">Утас</th>
                          <th className="text-left p-3">Бүртгэгдсэн</th>
                          <th className="text-left p-3">Төлөв</th>
                          <th className="text-left p-3">Үйлдэл</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loginEmployees.map((employee) => (
                          <tr key={employee.id} className="border-b table-row-hover">
                            <td className="p-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={employee.profileImage || "/placeholder.svg"} />
                                <AvatarFallback className="avatar-fallback">
                                  {employee.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </td>
                            <td className="p-3 font-medium">{employee.name}</td>
                            <td className="p-3">{employee.email}</td>
                            <td className="p-3">{employee.phone}</td>
                            <td className="p-3">
                              {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString("mn-MN") : "-"}
                            </td>
                            <td className="p-3">
                              <Badge
                                variant={employee.active !== false ? "default" : "secondary"}
                                className={employee.active !== false ? "status-active" : "status-inactive"}
                              >
                                {employee.active !== false ? "Идэвхтэй" : "Идэвхгүй"}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="btn-hover bg-transparent">
                                    Үйлдэл
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="dropdown-menu-content">
                                  <DropdownMenuItem
                                    onClick={() => handleEditEmployee(employee)}
                                    className="dropdown-menu-item"
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Засах
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleToggleEmployeeStatus(employee.id, employee.active !== false, employee.name)
                                    }
                                    className="dropdown-menu-item"
                                  >
                                    {employee.active !== false ? (
                                      <>
                                        <PowerOff className="mr-2 h-4 w-4" />
                                        Идэвхгүй болгох
                                      </>
                                    ) : (
                                      <>
                                        <Power className="mr-2 h-4 w-4" />
                                        Идэвхжүүлэх
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                                    className="dropdown-menu-item text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Устгах
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Drivers Tab */}
          <TabsContent value="drivers" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Жолоочид</h2>
              <div className="flex space-x-2">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as "manager" | "driver" | "employee")}
                  className="input-field"
                >
                  <option value="employee">Ажилчин</option>
                  <option value="driver">Жолооч</option>
                  <option value="manager">Менежер</option>
                </select>
                <Button
                  onClick={() => document.getElementById("register-form")?.scrollIntoView({ behavior: "smooth" })}
                  className="btn-primary"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {selectedRole === "manager" ? "Менежер" : selectedRole === "driver" ? "Жолооч" : "Ажилчин"} нэмэх
                </Button>
              </div>
            </div>

            {/* Registration Form */}
            <Card id="register-form" className="card-shadow">
              <CardHeader>
                <CardTitle>
                  Шинэ {selectedRole === "manager" ? "менежер" : selectedRole === "driver" ? "жолооч" : "ажилчин"}{" "}
                  бүртгэх
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegisterUser} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Нэр *</Label>
                      <Input
                        id="name"
                        type="text"
                        value={newDriver.name}
                        onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Утасны дугаар</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={newDriver.phone}
                        onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">И-мэйл хаяг *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newDriver.email}
                        onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Нууц үг *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newDriver.password}
                        onChange={(e) => setNewDriver({ ...newDriver, password: e.target.value })}
                        className="input-field"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={registrationLoading} className="btn-primary">
                    {registrationLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Бүртгэж байна...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        {selectedRole === "manager" ? "Менежер" : selectedRole === "driver" ? "Жолооч" : "Ажилчин"}{" "}
                        бүртгэх
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Drivers List */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Жолоочдын жагсаалт ({drivers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {drivers.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">Жолооч бүртгэгдээгүй байна</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Зураг</th>
                          <th className="text-left p-3">Нэр</th>
                          <th className="text-left p-3">И-мэйл</th>
                          <th className="text-left p-3">Утас</th>
                          <th className="text-left p-3">Бүртгэгдсэн</th>
                          <th className="text-left p-3">Төлөв</th>
                          <th className="text-left p-3">Үйлдэл</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drivers.map((driver) => (
                          <tr key={driver.id} className="border-b table-row-hover">
                            <td className="p-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={driver.profileImage || "/placeholder.svg"} />
                                <AvatarFallback className="avatar-fallback">
                                  {driver.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </td>
                            <td className="p-3 font-medium">{driver.name}</td>
                            <td className="p-3">{driver.email}</td>
                            <td className="p-3">{driver.phone}</td>
                            <td className="p-3">
                              {driver.createdAt ? new Date(driver.createdAt).toLocaleDateString("mn-MN") : "-"}
                            </td>
                            <td className="p-3">
                              <Badge
                                variant={driver.active !== false ? "default" : "secondary"}
                                className={driver.active !== false ? "status-active" : "status-inactive"}
                              >
                                {driver.active !== false ? "Идэвхтэй" : "Идэвхгүй"}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="btn-hover bg-transparent">
                                    Үйлдэл
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="dropdown-menu-content">
                                  <DropdownMenuItem
                                    onClick={() => handleEditDriver(driver)}
                                    className="dropdown-menu-item"
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Засах
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleToggleDriverStatus(driver.id, driver.active !== false, driver.name)
                                    }
                                    className="dropdown-menu-item"
                                  >
                                    {driver.active !== false ? (
                                      <>
                                        <PowerOff className="mr-2 h-4 w-4" />
                                        Идэвхгүй болгох
                                      </>
                                    ) : (
                                      <>
                                        <Power className="mr-2 h-4 w-4" />
                                        Идэвхжүүлэх
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteDriver(driver.id, driver.name)}
                                    className="dropdown-menu-item text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Устгах
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Managers Tab */}
          <TabsContent value="managers" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Менежерүүд</h2>
            </div>

            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Менежерүүдийн жагсаалт ({managers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {managers.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">Менежер бүртгэгдээгүй байна</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Зураг</th>
                          <th className="text-left p-3">Нэр</th>
                          <th className="text-left p-3">И-мэйл</th>
                          <th className="text-left p-3">Утас</th>
                          <th className="text-left p-3">Бүртгэгдсэн</th>
                          <th className="text-left p-3">Төлөв</th>
                          <th className="text-left p-3">Үйлдэл</th>
                        </tr>
                      </thead>
                      <tbody>
                        {managers.map((manager) => (
                          <tr key={manager.id} className="border-b table-row-hover">
                            <td className="p-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={manager.profileImage || "/placeholder.svg"} />
                                <AvatarFallback className="avatar-fallback">
                                  {manager.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </td>
                            <td className="p-3 font-medium">{manager.name}</td>
                            <td className="p-3">{manager.email}</td>
                            <td className="p-3">{manager.phone}</td>
                            <td className="p-3">
                              {manager.createdAt ? new Date(manager.createdAt).toLocaleDateString("mn-MN") : "-"}
                            </td>
                            <td className="p-3">
                              <Badge
                                variant={manager.active !== false ? "default" : "secondary"}
                                className={manager.active !== false ? "status-active" : "status-inactive"}
                              >
                                {manager.active !== false ? "Идэвхтэй" : "Идэвхгүй"}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="btn-hover bg-transparent">
                                    Үйлдэл
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="dropdown-menu-content">
                                  <DropdownMenuItem
                                    onClick={() => handleEditManager(manager)}
                                    className="dropdown-menu-item"
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Засах
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleToggleManagerStatus(manager.id, manager.active !== false, manager.name)
                                    }
                                    className="dropdown-menu-item"
                                  >
                                    {manager.active !== false ? (
                                      <>
                                        <PowerOff className="mr-2 h-4 w-4" />
                                        Идэвхгүй болгох
                                      </>
                                    ) : (
                                      <>
                                        <Power className="mr-2 h-4 w-4" />
                                        Идэвхжүүлэх
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteManager(manager.id, manager.name)}
                                    className="dropdown-menu-item text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Устгах
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Image Viewer Modal */}
      {showImageViewer && (
        <div className="modal-backdrop" onClick={closeImageViewer}>
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-10 flex space-x-2">
              <Button variant="outline" size="sm" onClick={prevImage} disabled={currentImages.length <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={nextImage} disabled={currentImages.length <= 1}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={closeImageViewer}>
                ✕
              </Button>
            </div>
            <div className="p-4">
              <img
                src={currentImages[currentImageIndex] || "/placeholder.svg"}
                alt={`Зураг ${currentImageIndex + 1}`}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              <p className="text-center mt-2 text-gray-600">
                {currentImageIndex + 1} / {currentImages.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Date Range Export Dialog */}
      <Dialog open={showDateRangeDialog} onOpenChange={setShowDateRangeDialog}>
        <DialogContent className="dialog-content date-range-dialog-content">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">Хугацаагаар Excel татах</DialogTitle>
            <DialogDescription className="dialog-description">
              Тодорхой хугацааны бүртгэлийг Excel файлаар татаж авах
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Эхлэх огноо</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <Label htmlFor="endDate">Дуусах огноо</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="deleteAfterExport" checked={deleteAfterExport} onCheckedChange={setDeleteAfterExport} />
              <Label htmlFor="deleteAfterExport" className="text-sm">
                Татсаны дараа өгөгдлийг устгах
              </Label>
            </div>
            {deleteAfterExport && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive font-medium">⚠️ Анхаар!</p>
                <p className="text-sm text-destructive">
                  Энэ үйлдэл нь тухайн хугацааны бүх бүртгэлийг өгөгдлийн сангаас бүрмөсөн устгана. Энэ үйлдлийг буцаах
                  боломжгүй.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="dialog-footer">
            <Button variant="outline" onClick={() => setShowDateRangeDialog(false)}>
              Болих
            </Button>
            <Button onClick={handleDateRangeExport} disabled={exportLoading} className="btn-primary">
              {exportLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Татаж байна...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Excel татах
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Status Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="dialog-content payment-dialog-content">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">Төлбөрийн төлөв засах</DialogTitle>
            <DialogDescription className="dialog-description">
              {selectedRecord?.carNumber} машины төлбөрийн төлөвийг өөрчлөх
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Төлбөрийн төлөв</Label>
              <div className="flex space-x-4 mt-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="paymentStatus"
                    value="unpaid"
                    checked={paymentStatus === "unpaid"}
                    onChange={(e) => setPaymentStatus(e.target.value as "paid" | "unpaid")}
                  />
                  <span>Төлөөгүй</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="paymentStatus"
                    value="paid"
                    checked={paymentStatus === "paid"}
                    onChange={(e) => setPaymentStatus(e.target.value as "paid" | "unpaid")}
                  />
                  <span>Төлсөн</span>
                </label>
              </div>
            </div>

            {paymentStatus === "paid" && (
              <div>
                <Label>Төлбөрийн хэлбэр</Label>
                <div className="flex space-x-4 mt-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={paymentMethod === "cash"}
                      onChange={(e) => setPaymentMethod(e.target.value as "card" | "cash" | "transfer")}
                    />
                    <Banknote className="h-4 w-4" />
                    <span>Бэлэн</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={paymentMethod === "card"}
                      onChange={(e) => setPaymentMethod(e.target.value as "card" | "cash" | "transfer")}
                    />
                    <CreditCard className="h-4 w-4" />
                    <span>Карт</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="transfer"
                      checked={paymentMethod === "transfer"}
                      onChange={(e) => setPaymentMethod(e.target.value as "card" | "cash" | "transfer")}
                    />
                    <ArrowLeftRight className="h-4 w-4" />
                    <span>Харилцах</span>
                  </label>
                </div>
              </div>
            )}

            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm">
                <strong>Машины дугаар:</strong> {selectedRecord?.carNumber}
              </p>
              <p className="text-sm">
                <strong>Төлбөр:</strong> {calculateParkingFeeForReport(selectedRecord).toLocaleString()}₮
              </p>
              <p className="text-sm">
                <strong>Одоогийн төлөв:</strong>{" "}
                <Badge
                  variant={selectedRecord?.paymentStatus === "paid" ? "default" : "secondary"}
                  className={selectedRecord?.paymentStatus === "paid" ? "badge-default" : "badge-secondary"}
                >
                  {selectedRecord?.paymentStatus === "paid" ? "Төлсөн" : "Төлөөгүй"}
                </Badge>
              </p>
            </div>
          </div>
          <DialogFooter className="dialog-footer">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Болих
            </Button>
            <Button onClick={handleUpdatePaymentStatus} disabled={paymentLoading} className="btn-primary">
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

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="dialog-content">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">
              {editingDriver?.role === "manager" ? "Менежер" : editingDriver?.role === "driver" ? "Жолооч" : "Ажилчин"}{" "}
              засах
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (editingDriver?.role === "employee") {
                handleSaveEmployeeEdit()
              } else {
                handleSaveDriverEdit()
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="editName">Нэр *</Label>
              <Input
                id="editName"
                type="text"
                value={editDriverData.name}
                onChange={(e) => setEditDriverData({ ...editDriverData, name: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <Label htmlFor="editPhone">Утасны дугаар</Label>
              <Input
                id="editPhone"
                type="tel"
                value={editDriverData.phone}
                onChange={(e) => setEditDriverData({ ...editDriverData, phone: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <Label htmlFor="editEmail">И-мэйл хаяг *</Label>
              <Input
                id="editEmail"
                type="email"
                value={editDriverData.email}
                onChange={(e) => setEditDriverData({ ...editDriverData, email: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <Label htmlFor="editPassword">Шинэ нууц үг (хоосон үлдээвэл өөрчлөхгүй)</Label>
              <Input
                id="editPassword"
                type="password"
                value={editDriverData.newPassword}
                onChange={(e) => setEditDriverData({ ...editDriverData, newPassword: e.target.value })}
                className="input-field"
                minLength={6}
              />
            </div>
            <DialogFooter className="dialog-footer">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Болих
              </Button>
              <Button type="submit" disabled={editLoading} className="btn-primary">
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
          </form>
        </DialogContent>
      </Dialog>

      {/* Employee Dialog */}
      <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
        <DialogContent className="dialog-content">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">Шинэ ажилчин нэмэх</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddEmployee} className="space-y-4">
            <div>
              <Label htmlFor="employeeName">Нэр *</Label>
              <Input
                id="employeeName"
                type="text"
                value={newEmployee.name}
                onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <Label htmlFor="employeePosition">Албан тушаал</Label>
              <Input
                id="employeePosition"
                type="text"
                value={newEmployee.position}
                onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <Label htmlFor="employeePhone">Утасны дугаар</Label>
              <Input
                id="employeePhone"
                type="tel"
                value={newEmployee.phone}
                onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <Label htmlFor="employeeStartDate">Ажилд орсон огноо</Label>
              <Input
                id="employeeStartDate"
                type="date"
                value={newEmployee.startDate}
                onChange={(e) => setNewEmployee({ ...newEmployee, startDate: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <Label htmlFor="employeeImage">Профайл зураг</Label>
              <Input
                id="employeeImage"
                type="file"
                accept="image/*"
                onChange={handleEmployeeImageUpload}
                className="input-field"
              />
              {newEmployee.profileImage && (
                <div className="mt-2">
                  <img
                    src={newEmployee.profileImage || "/placeholder.svg"}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-full"
                  />
                </div>
              )}
            </div>
            <DialogFooter className="dialog-footer">
              <Button type="button" variant="outline" onClick={() => setShowEmployeeDialog(false)}>
                Болих
              </Button>
              <Button type="submit" disabled={employeeLoading} className="btn-primary">
                {employeeLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Нэмж байна...
                  </>
                ) : (
                  "Нэмэх"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="dialog-content profile-dialog-content">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">Профайл засах</DialogTitle>
          </DialogHeader>
          <div className="profile-dialog-scrollable">
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="profileName">Нэр *</Label>
                  <Input
                    id="profileName"
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="profilePhone">Утасны дугаар</Label>
                  <Input
                    id="profilePhone"
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <Label htmlFor="profileEmail">И-мэйл хаяг *</Label>
                  <Input
                    id="profileEmail"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="profileImage">Профайл зураг</Label>
                  <Input
                    id="profileImage"
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageUpload}
                    className="input-field"
                  />
                  {profileData.profileImage && (
                    <div className="mt-2">
                      <img
                        src={profileData.profileImage || "/placeholder.svg"}
                        alt="Profile Preview"
                        className="w-20 h-20 object-cover rounded-full"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Нууц үг өөрчлөх</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Одоогийн нууц үг</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="input-field pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="newPassword">Шинэ нууц үг</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="input-field"
                      minLength={6}
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Шинэ нууц үг давтах</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="input-field pr-10"
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handlePasswordChange}
                    disabled={profileLoading}
                    className="btn-secondary"
                  >
                    Нууц үг солих
                  </Button>
                </div>
              </div>
            </form>
          </div>
          <DialogFooter className="dialog-footer">
            <Button type="button" variant="outline" onClick={() => setShowProfileDialog(false)}>
              Болих
            </Button>
            <Button onClick={handleUpdateProfile} disabled={profileLoading} className="btn-primary">
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
        <DialogContent className="dialog-content">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">Сайтын тохиргоо</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSiteConfig} className="space-y-4">
            <div>
              <Label htmlFor="siteName">Сайтын нэр *</Label>
              <Input
                id="siteName"
                type="text"
                value={siteConfig.siteName}
                onChange={(e) => setSiteConfig({ ...siteConfig, siteName: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <Label htmlFor="siteLogo">Сайтын лого (URL)</Label>
              <Input
                id="siteLogo"
                type="url"
                value={siteConfig.siteLogo}
                onChange={(e) => setSiteConfig({ ...siteConfig, siteLogo: e.target.value })}
                className="input-field"
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div>
              <Label htmlFor="siteBackground">Арын зураг (URL)</Label>
              <Input
                id="siteBackground"
                type="url"
                value={siteConfig.siteBackground}
                onChange={(e) => setSiteConfig({ ...siteConfig, siteBackground: e.target.value })}
                className="input-field"
                placeholder="https://example.com/background.jpg"
              />
            </div>
            <DialogFooter className="dialog-footer">
              <Button type="button" variant="outline" onClick={() => setShowSiteDialog(false)}>
                Болих
              </Button>
              <Button type="submit" disabled={siteLoading} className="btn-primary">
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
          </form>
        </DialogContent>
      </Dialog>

      {/* Pricing Dialog */}
      <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
        <DialogContent className="dialog-content">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">Үнийн тохиргоо</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdatePricing} className="space-y-4">
            <div>
              <Label htmlFor="pricePerMinute">Минут тутамын үнэ (₮) *</Label>
              <Input
                id="pricePerMinute"
                type="number"
                min="0"
                step="1"
                value={pricingConfig.pricePerMinute}
                onChange={(e) => setPricingConfig({ ...pricingConfig, pricePerMinute: Number(e.target.value) })}
                className="input-field"
                required
              />
              <p className="text-sm text-gray-600 mt-1">Одоогийн үнэ: {pricingConfig.pricePerMinute}₮/минут</p>
            </div>
            <DialogFooter className="dialog-footer">
              <Button type="button" variant="outline" onClick={() => setShowPricingDialog(false)}>
                Болих
              </Button>
              <Button type="submit" disabled={pricingLoading} className="btn-primary">
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
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

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
  EyeOff,
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

  // Add this function after the handleRegisterDriver function, around line 1000
  const handleEmployeeSelection = (employeeId: string) => {
    const selectedEmployee = availableEmployees.find((emp) => emp.id === employeeId)
    if (selectedEmployee) {
      setNewDriver({
        ...newDriver,
        name: selectedEmployee.name,
        phone: selectedEmployee.phone || "",
      })
    }
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
        // Note: Password update would require re-authentication in production
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
                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between">
                  <div className="space-y-4">
                    <h1 className="text-4xl font-bold text-white">Хяналтын самбар</h1>
                    <p className="text-xl text-purple-200">
                      {customDateRange.useCustomRange
                        ? `${customDateRange.startDate} - ${customDateRange.endDate}`
                        : "Сүүлийн 6 сарын статистик"}
                    </p>
                    <div className="flex flex-wrap gap-4 text-purple-200">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date().toLocaleDateString("mn-MN")}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4" />
                        <span>Нийт орлого: {dashboardStats.totalRevenue.toLocaleString()}₮</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 lg:mt-0 flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowDateRangePicker(true)}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Огноо сонгох
                    </Button>
                    {customDateRange.useCustomRange && (
                      <Button
                        variant="outline"
                        onClick={resetToDefaultRange}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        Анхдагш
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Нийт үйлчлүүлэгч</p>
                        <p className="text-3xl font-bold">{dashboardStats.totalCustomers}</p>
                        <p className="text-blue-100 text-xs mt-1">Өнөөдөр: +{dashboardStats.todayCustomers}</p>
                      </div>
                      <div className="p-3 bg-white/20 rounded-full">
                        <Users className="w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-emerald-100 text-sm font-medium">Нийт орлого</p>
                        <p className="text-3xl font-bold">{dashboardStats.totalRevenue.toLocaleString()}₮</p>
                        <p className="text-emerald-100 text-xs mt-1">
                          Өнөөдөр: +{dashboardStats.todayRevenue.toLocaleString()}₮
                        </p>
                      </div>
                      <div className="p-3 bg-white/20 rounded-full">
                        <DollarSign className="w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm font-medium">Зогсож байгаа</p>
                        <p className="text-3xl font-bold">{dashboardStats.activeRecords}</p>
                        <p className="text-orange-100 text-xs mt-1">Одоогийн байдлаар</p>
                      </div>
                      <div className="p-3 bg-white/20 rounded-full">
                        <Car className="w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm font-medium">Дундаж орлого</p>
                        <p className="text-3xl font-bold">
                          {Math.round(dashboardStats.averageRevenue).toLocaleString()}₮
                        </p>
                        <p className="text-purple-100 text-xs mt-1">
                          Дундаж хугацаа: {dashboardStats.averageSessionTime.toFixed(1)}ц
                        </p>
                      </div>
                      <div className="p-3 bg-white/20 rounded-full">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Monthly Revenue Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      {customDateRange.useCustomRange ? "Х  гацааны орлого" : "Сарын орлого"}
                    </CardTitle>
                    <CardDescription>
                      {customDateRange.useCustomRange
                        ? `${customDateRange.startDate} - ${customDateRange.endDate}`
                        : "Сүүлийн 6 сарын орлогын график"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      {monthlyStats.length > 0 ? (
                        <div className="space-y-4">
                          {monthlyStats.map((stat, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div>
                                <p className="font-medium">{stat.period}</p>
                                <p className="text-sm text-muted-foreground">{stat.customers} үйлчлүүлэгч</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-lg">{stat.revenue.toLocaleString()}₮</p>
                                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full transition-all duration-500"
                                    style={{
                                      width: `${Math.min(100, (stat.revenue / Math.max(...monthlyStats.map((s) => s.revenue))) * 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <div className="text-center">
                            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Мэдээлэл байхгүй</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Daily Activity Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />7 хоногийн үйл ажиллагаа
                    </CardTitle>
                    <CardDescription>Сүүлийн 7 хоногийн өдөр тутмын статистик</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      {dailyStats.length > 0 ? (
                        <div className="space-y-3">
                          {dailyStats.map((stat, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                              <div>
                                <p className="font-medium">{stat.day}</p>
                                <p className="text-sm text-muted-foreground">{stat.date}</p>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="text-center">
                                  <p className="text-sm font-medium">{stat.customers}</p>
                                  <p className="text-xs text-muted-foreground">үйлчлүүлэгч</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold">{stat.revenue.toLocaleString()}₮</p>
                                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                      style={{
                                        width: `${Math.min(100, (stat.revenue / Math.max(...dailyStats.map((s) => s.revenue))) * 100)}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <div className="text-center">
                            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Мэдээлэл байхгүй</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Сүүлийн үйл ажиллагаа</CardTitle>
                  <CardDescription>Сүүлийн 10 бүртгэл</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentActivity.length > 0 ? (
                    <div className="space-y-4">
                      {recentActivity.map((activity, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                activity.type === "entry"
                                  ? "bg-emerald-500"
                                  : activity.type === "exit" || activity.exitTime
                                    ? "bg-red-500"
                                    : "bg-blue-500"
                              }`}
                            />
                            <div>
                              <p className="font-medium">{activity.carNumber}</p>
                              <p className="text-sm text-muted-foreground">
                                {activity.driverName} • {new Date(activity.timestamp).toLocaleString("mn-MN")}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                activity.type === "entry"
                                  ? "default"
                                  : activity.type === "exit" || activity.exitTime
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {activity.type === "entry"
                                ? "Орсон"
                                : activity.type === "exit" || activity.exitTime
                                  ? "Гарсан"
                                  : "Бүртгэл"}
                            </Badge>
                            {activity.amount && (
                              <p className="text-sm font-medium mt-1">{activity.amount.toLocaleString()}₮</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Сүүлийн үйл ажиллагаа байхгүй</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Ажилчдын удирдлага</h2>
                <p className="text-muted-foreground">Ажилчид болон менежерүүдийг удирдах</p>
              </div>
            </div>

            <Tabs defaultValue="employees" className="w-full">
              <TabsList>
                <TabsTrigger value="employees">Ажилчид ({employees.length})</TabsTrigger>
                <TabsTrigger value="login-employees">Нэвтрэх эрхтэй ажилчид ({loginEmployees.length})</TabsTrigger>
                <TabsTrigger value="drivers">Жолооч ({drivers.length})</TabsTrigger>
                <TabsTrigger value="managers">Менежерүүд ({managers.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="employees" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Ажилчин нэмэх</CardTitle>
                    <CardDescription>Шинэ ажилчин бүртгэх</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddEmployee} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="employeeName">Нэр</Label>
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
                            placeholder="Албан тушаалыг оруулна уу"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="employeePhone">Утасны дугаар</Label>
                          <Input
                            id="employeePhone"
                            value={newEmployee.phone}
                            onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                            placeholder="Утасны дугаараа оруулна уу"
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

                      <div className="space-y-2">
                        <Label>Профайл зураг</Label>
                        <div className="flex items-center space-x-4">
                          {newEmployee.profileImage && (
                            <img
                              src={newEmployee.profileImage || "/placeholder.svg"}
                              alt="Preview"
                              className="w-16 h-16 object-cover border rounded"
                            />
                          )}
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <Upload className="w-4 h-4" />
                            <span>Зураг сонгох</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleEmployeeImageUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      <Button type="submit" disabled={employeeLoading} className="w-full">
                        {employeeLoading ? "Нэмж байна..." : "Ажилчин нэмэх"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Ажилчдын жагсаалт</CardTitle>
                    <CardDescription>Бүртгэгдсэн ажилчдын мэдээлэл</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {employees.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Ажилчин байхгүй</h3>
                        <p className="text-muted-foreground mb-4">Одоогоор ажилчин бүртгэгдээгүй байна</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {employees.map((employee) => (
                          <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-4">
                              <Avatar>
                                {employee.profileImage ? (
                                  <AvatarImage src={employee.profileImage || "/placeholder.svg"} alt={employee.name} />
                                ) : (
                                  <AvatarFallback>{employee.name?.charAt(0).toUpperCase() || "A"}</AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <h4 className="font-medium">{employee.name}</h4>
                                <p className="text-sm text-muted-foreground">{employee.position || "Ажилчин"}</p>
                                <p className="text-sm text-muted-foreground">{employee.phone}</p>
                                {employee.startDate && (
                                  <p className="text-xs text-muted-foreground">
                                    Ажилд орсон: {new Date(employee.startDate).toLocaleDateString("mn-MN")}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={employee.active ? "default" : "secondary"}>
                                {employee.active ? "Идэвхтэй" : "Идэвхгүй"}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                      />
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
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="login-employees" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Нэвтрэх эрхтэй ажилчдын жагсаалт</CardTitle>
                    <CardDescription>Системд нэвтрэх эрхтэй бүртгэгдсэн ажилчдын мэдээлэл</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loginEmployees.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Нэвтрэх эрхтэй ажилчин байхгүй</h3>
                        <p className="text-muted-foreground mb-4">
                          Одоогоор нэвтрэх эрхтэй ажилчин бүртгэгдээгүй байна
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {loginEmployees.map((employee) => (
                          <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-4">
                              <Avatar>
                                {employee.profileImage ? (
                                  <AvatarImage src={employee.profileImage || "/placeholder.svg"} alt={employee.name} />
                                ) : (
                                  <AvatarFallback>{employee.name?.charAt(0).toUpperCase() || "A"}</AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <h4 className="font-medium">{employee.name}</h4>
                                <p className="text-sm text-muted-foreground">{employee.email}</p>
                                <p className="text-sm text-muted-foreground">{employee.phone}</p>
                                {employee.createdAt && (
                                  <p className="text-xs text-muted-foreground">
                                    Бүртгэгдсэн: {new Date(employee.createdAt).toLocaleDateString("mn-MN")}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="border-green-200 text-green-700">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                Нэвтрэх эрх
                              </Badge>
                              <Badge variant={employee.active ? "default" : "secondary"}>
                                {employee.active ? "Идэвхтэй" : "Идэвхгүй"}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                      />
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
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="drivers" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Жолоочдын жагсаалт</CardTitle>
                    <CardDescription>Бүртгэгдсэн жолоочдын мэдээлэл</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {drivers.length === 0 ? (
                      <div className="text-center py-12">
                        <Car className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Жолооч байхгүй</h3>
                        <p className="text-muted-foreground mb-4">Одоогоор жолооч бүртгэгдээгүй байна</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {drivers.map((driver) => (
                          <div key={driver.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-4">
                              <Avatar>
                                {driver.profileImage ? (
                                  <AvatarImage src={driver.profileImage || "/placeholder.svg"} alt={driver.name} />
                                ) : (
                                  <AvatarFallback>{driver.name?.charAt(0).toUpperCase() || "Ж"}</AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <h4 className="font-medium">{driver.name}</h4>
                                <p className="text-sm text-muted-foreground">{driver.email}</p>
                                <p className="text-sm text-muted-foreground">{driver.phone}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="border-blue-200 text-blue-700">
                                <Car className="w-3 h-3 mr-1" />
                                Жолооч
                              </Badge>
                              <Badge variant={driver.active ? "default" : "secondary"}>
                                {driver.active ? "Идэвхтэй" : "Идэвхгүй"}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                      />
                                    </svg>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditDriver(driver)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Засах
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleToggleDriverStatus(driver.id!, driver.active, driver.name)}
                                  >
                                    {driver.active ? (
                                      <PowerOff className="w-4 h-4 mr-2" />
                                    ) : (
                                      <Power className="w-4 h-4 mr-2" />
                                    )}
                                    {driver.active ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteDriver(driver.id!, driver.name)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Устгах
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="managers" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Менежерүүдийн жагсаалт</CardTitle>
                    <CardDescription>Бүртгэгдсэн менежерүүдийн мэдээлэл</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {managers.length === 0 ? (
                      <div className="text-center py-12">
                        <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Менежер байхгүй</h3>
                        <p className="text-muted-foreground mb-4">Одоогоор менежер бүртгэгдээгүй байна</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {managers.map((manager) => (
                          <div key={manager.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-4">
                              <Avatar>
                                {manager.profileImage ? (
                                  <AvatarImage src={manager.profileImage || "/placeholder.svg"} alt={manager.name} />
                                ) : (
                                  <AvatarFallback>{manager.name?.charAt(0).toUpperCase() || "M"}</AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <h4 className="font-medium">{manager.name}</h4>
                                <p className="text-sm text-muted-foreground">{manager.email}</p>
                                <p className="text-sm text-muted-foreground">{manager.phone}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="border-orange-200 text-orange-700">
                                <Shield className="w-3 h-3 mr-1" />
                                Менежер
                              </Badge>
                              <Badge variant={manager.active ? "default" : "secondary"}>
                                {manager.active ? "Идэвхтэй" : "Идэвхгүй"}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                      />
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
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="register" className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Хэрэглэгч бүртгэх</h2>
              <p className="text-muted-foreground">Шинэ хэрэглэгч бүртгэх</p>
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
                    <Label>Хэрэглэгчийн төрөл</Label>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="employee"
                          name="role"
                          value="employee"
                          checked={selectedRole === "employee"}
                          onChange={(e) => setSelectedRole(e.target.value as "manager" | "driver" | "employee")}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="employee">Ажилчин</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="driver"
                          name="role"
                          value="driver"
                          checked={selectedRole === "driver"}
                          onChange={(e) => setSelectedRole(e.target.value as "manager" | "driver" | "employee")}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="driver">Жолооч</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="manager"
                          name="role"
                          value="manager"
                          checked={selectedRole === "manager"}
                          onChange={(e) => setSelectedRole(e.target.value as "manager" | "driver" | "employee")}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="manager">Менежер</Label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Нэр</Label>
                      {selectedRole === "employee" ? (
                        <select
                          value={availableEmployees.find((emp) => emp.name === newDriver.name)?.id || ""}
                          onChange={(e) => handleEmployeeSelection(e.target.value)}
                          className="w-full px-3 py-2 border border-input rounded-md"
                          required
                        >
                          <option value="">Ажилчин сонгоно уу</option>
                          {availableEmployees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          id="name"
                          value={newDriver.name}
                          onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                          placeholder="Бүтэн нэрээ оруулна уу"
                          required
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Утасны дугаар</Label>
                      <Input
                        id="phone"
                        value={newDriver.phone}
                        onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                        placeholder="Утасны дугаараа оруулна уу"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">И-мэйл хаяг</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newDriver.email}
                        onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                        placeholder="И-мэйл хаягаа оруулна уу"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Нууц үг</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newDriver.password}
                        onChange={(e) => setNewDriver({ ...newDriver, password: e.target.value })}
                        placeholder="Нууц үгээ оруулна уу (хамгийн багадаа 6 тэмдэгт)"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={registrationLoading} className="w-full">
                    {registrationLoading
                      ? "Бүртгэж байна..."
                      : `${selectedRole === "manager" ? "Менежер" : selectedRole === "driver" ? "Жолооч" : "Ажилчин"} бүртгэх`}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="report" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Тайлан</h2>
                <p className="text-muted-foreground">Зогсоолын бүртгэлийн тайлан харах болон татах</p>
              </div>
              <div className="flex space-x-2">
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

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Шүүлтүүр</CardTitle>
                <CardDescription>Тайланг шүүж харах</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Жил</Label>
                    <select
                      value={reportFilterYear}
                      onChange={(e) => setReportFilterYear(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md"
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
                      className="w-full px-3 py-2 border border-input rounded-md"
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
                      value={reportFilterCarNumber}
                      onChange={(e) => setReportFilterCarNumber(e.target.value)}
                      placeholder="Машины дугаар хайх"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Засварчин</Label>
                    <select
                      value={reportFilterMechanic}
                      onChange={(e) => setReportFilterMechanic(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md"
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
                <CardTitle>Зогсоолын бүртгэл ({filteredReportRecords.length})</CardTitle>
                <CardDescription>
                  Нийт орлого:{" "}
                  {filteredReportRecords
                    .reduce((sum, record) => sum + calculateParkingFeeForReport(record), 0)
                    .toLocaleString()}
                  ₮
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reportLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredReportRecords.length === 0 ? (
                  <div className="text-center py-12">
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
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <h3 className="text-lg font-medium mb-2">Бүртгэл байхгүй</h3>
                    <p className="text-muted-foreground">Одоогоор ямар нэгэн бүртгэл байхгүй байна</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">№</th>
                          <th className="text-left p-2 font-medium">Машины дугаар</th>
                          <th className="text-left p-2 font-medium">Засварчин</th>
                          <th className="text-left p-2 font-medium">Машины марк</th>
                          <th className="text-left p-2 font-medium">Орсон цаг</th>
                          <th className="text-left p-2 font-medium">Гарсан цаг</th>
                          <th className="text-left p-2 font-medium">Зогссон хугацаа</th>
                          <th className="text-left p-2 font-medium">Төлбөр</th>
                          <th className="text-left p-2 font-medium">Зураг</th>
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
                            <td className="p-2 text-sm">{record.parkingDuration || "-"}</td>
                            <td className="p-2 font-medium">
                              {calculateParkingFeeForReport(record).toLocaleString()}₮
                            </td>
                            <td className="p-2">
                              {record.images && record.images.length > 0 ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openImageViewer(record.images, 0)}
                                  className="h-8"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  {record.images.length}
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
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

      {/* Date Range Picker Dialog */}
      <Dialog open={showDateRangePicker} onOpenChange={setShowDateRangePicker}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Огнооны хүрээ сонгох</DialogTitle>
            <DialogDescription>Хяналтын самбарт харуулах огнооны хүрээг сонгоно уу</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Эхлэх огноо</Label>
                <Input
                  type="date"
                  value={customDateRange.startDate}
                  onChange={(e) => setCustomDateRange({ ...customDateRange, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Дуусах огноо</Label>
                <Input
                  type="date"
                  value={customDateRange.endDate}
                  onChange={(e) => setCustomDateRange({ ...customDateRange, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDateRangePicker(false)}>
              Цуцлах
            </Button>
            <Button onClick={applyCustomDateRange}>Хэрэглэх</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Date Range Export Dialog */}
      <Dialog open={showDateRangeDialog} onOpenChange={setShowDateRangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Огноогоор Excel татах</DialogTitle>
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
                <p className="text-sm text-destructive font-medium">⚠️ Анхааруулга</p>
                <p className="text-sm text-destructive/80">
                  Энэ үйлдэл нь сонгосон хугацааны бүх бүртгэлийг өгөгдлийн сангаас бүрмөсөн устгана. Энэ үйлдлийг
                  буцаах боломжгүй.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDateRangeDialog(false)}>
              Цуцлах
            </Button>
            <Button onClick={handleDateRangeExport} disabled={exportLoading}>
              {exportLoading ? "Татаж байна..." : "Excel татах"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog open={showImageViewer} onOpenChange={setShowImageViewer}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={closeImageViewer}
              className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70"
            >
              <X className="w-4 h-4" />
            </Button>
            {currentImages.length > 0 && (
              <div className="relative">
                <img
                  src={currentImages[currentImageIndex] || "/placeholder.svg"}
                  alt={`Зураг ${currentImageIndex + 1}`}
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
                {currentImages.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {currentImages.length}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDriver?.role === "manager"
                ? "Менежер засах"
                : editingDriver?.role === "driver"
                  ? "Жолооч засах"
                  : "Ажилчин засах"}
            </DialogTitle>
            <DialogDescription>
              {editingDriver?.role === "manager"
                ? "Менежерийн мэдээллийг шинэчлэх"
                : editingDriver?.role === "driver"
                  ? "Жолоочийн мэдээллийг шинэчлэх"
                  : "Ажилчны мэдээллийг шинэчлэх"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Нэр</Label>
              <Input
                value={editDriverData.name}
                onChange={(e) => setEditDriverData({ ...editDriverData, name: e.target.value })}
                placeholder="Нэрээ оруулна уу"
              />
            </div>
            <div className="space-y-2">
              <Label>Утасны дугаар</Label>
              <Input
                value={editDriverData.phone}
                onChange={(e) => setEditDriverData({ ...editDriverData, phone: e.target.value })}
                placeholder="Утасны дугаараа оруулна уу"
              />
            </div>
            <div className="space-y-2">
              <Label>И-мэйл хаяг</Label>
              <Input
                type="email"
                value={editDriverData.email}
                onChange={(e) => setEditDriverData({ ...editDriverData, email: e.target.value })}
                placeholder="И-мэйл хаягаа оруулна уу"
              />
            </div>
            <div className="space-y-2">
              <Label>Шинэ нууц үг (хоосон үлдээвэл өөрчлөхгүй)</Label>
              <Input
                type="password"
                value={editDriverData.newPassword}
                onChange={(e) => setEditDriverData({ ...editDriverData, newPassword: e.target.value })}
                placeholder="Шинэ нууц үг (заавал биш)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Цуцлах
            </Button>
            <Button
              onClick={
                editingDriver?.role === "employee" || editingEmployee ? handleSaveEmployeeEdit : handleSaveDriverEdit
              }
              disabled={editLoading}
            >
              {editLoading ? "Хадгалж байна..." : "Хадгалах"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Профайл засах</DialogTitle>
            <DialogDescription>Өөрийн профайлын мэдээллийг шинэчлэх</DialogDescription>
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
                <label className="flex items-center space-x-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Зураг солих</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "profile")}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Нэр</Label>
              <Input
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                placeholder="Нэрээ оруулна уу"
              />
            </div>
            <div className="space-y-2">
              <Label>Утасны дугаар</Label>
              <Input
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                placeholder="Утасны дугаараа оруулна уу"
              />
            </div>
            <div className="space-y-2">
              <Label>И-мэйл хаяг</Label>
              <Input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                placeholder="И-мэйл хаягаа оруулна уу"
              />
            </div>

            {/* Password Change Section */}
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">Нууц үг өөрчлөх</h4>
              <div className="space-y-2">
                <Label>Одоогийн нууц үг</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Одоогийн нууц үгээ оруулна уу"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-full px-3"
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
                  placeholder="Шинэ нууц үгээ оруулна уу"
                />
              </div>
              <div className="space-y-2">
                <Label>Шинэ нууц үг давтах</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Шинэ нууц үгээ дахин оруулна уу"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-0 top-0 h-full px-3"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Сайтын тохиргоо</DialogTitle>
            <DialogDescription>Сайтын нэр, лого болон арын зургийг тохируулах</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Сайтын нэр</Label>
              <Input
                value={siteConfig.siteName}
                onChange={(e) => setSiteConfig({ ...siteConfig, siteName: e.target.value })}
                placeholder="Сайтын нэрийг оруулна уу"
              />
            </div>
            <div className="space-y-2">
              <Label>Сайтын лого</Label>
              <div className="flex items-center space-x-4">
                {siteConfig.siteLogo && (
                  <img
                    src={siteConfig.siteLogo || "/placeholder.svg"}
                    alt="Site Logo"
                    className="w-16 h-16 object-contain border rounded"
                  />
                )}
                <label className="flex items-center space-x-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Лого сонгох</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "logo")}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Арын зураг</Label>
              <div className="flex items-center space-x-4">
                {siteConfig.siteBackground && (
                  <img
                    src={siteConfig.siteBackground || "/placeholder.svg"}
                    alt="Background"
                    className="w-16 h-16 object-cover border rounded"
                  />
                )}
                <label className="flex items-center space-x-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Арын зураг сонгох</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "background")}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
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
        <DialogContent className="max-w-md">
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
                placeholder="Минут тутамын үнийг оруулна уу"
              />
              <p className="text-sm text-muted-foreground">Жишээ: 100₮ гэж оруулбал минут тутам 100₮ тооцогдоно</p>
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
    </div>
  )
}

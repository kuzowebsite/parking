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

          <TabsContent value="dashboard" className="space-y-6">
            {/* Dashboard Header with Gradient Background */}
            <div className="relative bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 rounded-2xl p-8 text-white overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-4 left-8 w-20 h-20 bg-blue-400 rounded-full blur-2xl"></div>
                <div className="absolute bottom-4 right-12 w-16 h-16 bg-purple-400 rounded-full blur-xl"></div>
                <div className="absolute top-1/2 right-1/4 w-12 h-12 bg-cyan-400 rounded-full blur-lg"></div>
              </div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-4xl font-bold mb-2">Хяналтын самбар</h2>
                    <p className="text-blue-200 text-lg">
                      {customDateRange.useCustomRange
                        ? `${customDateRange.startDate} - ${customDateRange.endDate}`
                        : "Сүүлийн 6 сарын статистик"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowDateRangePicker(true)}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Огноо сонгох
                  </Button>
                </div>

                {/* Date and Revenue Display */}
                <div className="flex items-center space-x-4 text-lg">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-blue-300" />
                    <span>{new Date().toLocaleDateString("mn-MN")}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-green-300" />
                    <span>Нийт орлого: {dashboardStats.totalRevenue.toLocaleString()}₮</span>
                  </div>
                </div>

                {/* Reset button when custom range is active */}
                {customDateRange.useCustomRange && (
                  <Button
                    variant="ghost"
                    onClick={resetToDefaultRange}
                    className="mt-4 text-white/80 hover:text-white hover:bg-white/10"
                  >
                    Анхдагш харагдац
                  </Button>
                )}
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Customers Card */}
              <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white overflow-hidden">
                <div className="absolute top-4 right-4 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-white/10 rounded-full blur-sm"></div>

                <div className="relative z-10">
                  <p className="text-blue-100 text-sm font-medium mb-1">Нийт үйлчлүүлэгч</p>
                  <p className="text-4xl font-bold mb-2">{dashboardStats.totalCustomers}</p>
                  <p className="text-blue-200 text-sm">Өнөөдөр: +{dashboardStats.todayCustomers}</p>
                </div>
              </div>

              {/* Total Revenue Card */}
              <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white overflow-hidden">
                <div className="absolute top-4 right-4 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
                <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-white/10 rounded-full blur-sm"></div>

                <div className="relative z-10">
                  <p className="text-emerald-100 text-sm font-medium mb-1">Нийт орлого</p>
                  <p className="text-4xl font-bold mb-2">{dashboardStats.totalRevenue.toLocaleString()}₮</p>
                  <p className="text-emerald-200 text-sm">Өнөөдөр: +{dashboardStats.todayRevenue.toLocaleString()}₮</p>
                </div>
              </div>

              {/* Currently Parked Card */}
              <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white overflow-hidden">
                <div className="absolute top-4 right-4 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Car className="w-6 h-6" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-white/10 rounded-full blur-sm"></div>

                <div className="relative z-10">
                  <p className="text-orange-100 text-sm font-medium mb-1">Зогсож байгаа</p>
                  <p className="text-4xl font-bold mb-2">{dashboardStats.activeRecords}</p>
                  <p className="text-orange-200 text-sm">Одоогийн байдлаар</p>
                </div>
              </div>

              {/* Average Revenue Card */}
              <div className="relative bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white overflow-hidden">
                <div className="absolute top-4 right-4 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-white/10 rounded-full blur-sm"></div>

                <div className="relative z-10">
                  <p className="text-purple-100 text-sm font-medium mb-1">Дундаж орлого</p>
                  <p className="text-4xl font-bold mb-2">
                    {Math.round(dashboardStats.averageRevenue).toLocaleString()}₮
                  </p>
                  <p className="text-purple-200 text-sm">
                    Дундаж хугацаа: {dashboardStats.averageSessionTime.toFixed(1)}ц
                  </p>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Сарын орлого
                  </CardTitle>
                  <CardDescription>
                    {customDateRange.useCustomRange
                      ? `${customDateRange.startDate} - ${customDateRange.endDate}`
                      : "Сүүлийн 6 сарын орлогын график"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {monthlyStats.length > 0 ? (
                      monthlyStats.map((stat, index) => (
                        <div key={index} className="flex items-center justify-between py-2">
                          <div>
                            <p className="font-medium">{stat.period}</p>
                            <p className="text-sm text-muted-foreground">{stat.customers} үйлчлүүлэгч</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{stat.revenue.toLocaleString()}₮</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Мэдээлэл байхгүй</p>
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
                  <div className="space-y-3">
                    {dailyStats.length > 0 ? (
                      dailyStats.map((stat, index) => (
                        <div key={index} className="flex items-center justify-between py-2">
                          <div>
                            <p className="font-medium">{stat.day}</p>
                            <p className="text-sm text-muted-foreground">{stat.date}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{stat.customers} үйлчлүүлэгч</p>
                            <p className="font-bold">{stat.revenue.toLocaleString()}₮</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Мэдээлэл байхгүй</p>
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
          </TabsContent>

          <TabsContent value="employees">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Ажилчид</h2>
                <Button onClick={() => setShowEmployeeDialog(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Ажилчин нэмэх
                </Button>
              </div>

              {/* Employee List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees.map((employee) => (
                  <Card key={employee.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{employee.name}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Засах
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Устгах
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleEmployeeStatus(employee.id, employee.active, employee.name)}
                          >
                            {employee.active ? (
                              <>
                                <PowerOff className="w-4 h-4 mr-2" />
                                Идэвхгүй болгох
                              </>
                            ) : (
                              <>
                                <Power className="w-4 h-4 mr-2" />
                                Идэвхжүүлэх
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-10 h-10">
                          {employee.profileImage ? (
                            <AvatarImage src={employee.profileImage || "/placeholder.svg"} alt={employee.name} />
                          ) : (
                            <AvatarFallback>{employee.name?.charAt(0).toUpperCase() || "E"}</AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{employee.position || "Ажилчин"}</p>
                          <p className="text-xs text-muted-foreground">{employee.phone}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Manager List */}
              <h3 className="text-xl font-bold mt-6">Менежерүүд</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {managers.map((manager) => (
                  <Card key={manager.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{manager.name}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditManager(manager)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Засах
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteManager(manager.id, manager.name)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Устгах
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleManagerStatus(manager.id, manager.active, manager.name)}
                          >
                            {manager.active ? (
                              <>
                                <PowerOff className="w-4 h-4 mr-2" />
                                Идэвхгүй болгох
                              </>
                            ) : (
                              <>
                                <Power className="w-4 h-4 mr-2" />
                                Идэвхжүүлэх
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-10 h-10">
                          {manager.profileImage ? (
                            <AvatarImage src={manager.profileImage || "/placeholder.svg"} alt={manager.name} />
                          ) : (
                            <AvatarFallback>{manager.name?.charAt(0).toUpperCase() || "M"}</AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">Менежер</p>
                          <p className="text-xs text-muted-foreground">{manager.phone}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Driver List */}
              <h3 className="text-xl font-bold mt-6">Жолоочид</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {drivers.map((driver) => (
                  <Card key={driver.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{driver.name}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditDriver(driver)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Засах
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteDriver(driver.id, driver.name)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Устгах
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleDriverStatus(driver.id, driver.active, driver.name)}
                          >
                            {driver.active ? (
                              <>
                                <PowerOff className="w-4 h-4 mr-2" />
                                Идэвхгүй болгох
                              </>
                            ) : (
                              <>
                                <Power className="w-4 h-4 mr-2" />
                                Идэвхжүүлэх
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-10 h-10">
                          {driver.profileImage ? (
                            <AvatarImage src={driver.profileImage || "/placeholder.svg"} alt={driver.name} />
                          ) : (
                            <AvatarFallback>{driver.name?.charAt(0).toUpperCase() || "D"}</AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">Жолооч</p>
                          <p className="text-xs text-muted-foreground">{driver.phone}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="register">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Хэрэглэгч бүртгэх</h2>
                <Button onClick={() => setShowEmployeeDialog(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Ажилчин нэмэх
                </Button>
              </div>

              {/* Employee List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees.map((employee) => (
                  <Card key={employee.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{employee.name}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Засах
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Устгах
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleEmployeeStatus(employee.id, employee.active, employee.name)}
                          >
                            {employee.active ? (
                              <>
                                <PowerOff className="w-4 h-4 mr-2" />
                                Идэвхгүй болгох
                              </>
                            ) : (
                              <>
                                <Power className="w-4 h-4 mr-2" />
                                Идэвхжүүлэх
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-10 h-10">
                          {employee.profileImage ? (
                            <AvatarImage src={employee.profileImage || "/placeholder.svg"} alt={employee.name} />
                          ) : (
                            <AvatarFallback>{employee.name?.charAt(0).toUpperCase() || "E"}</AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{employee.position || "Ажилчин"}</p>
                          <p className="text-xs text-muted-foreground">{employee.phone}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Manager List */}
              <h3 className="text-xl font-bold mt-6">Менежерүүд</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {managers.map((manager) => (
                  <Card key={manager.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{manager.name}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditManager(manager)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Засах
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteManager(manager.id, manager.name)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Устгах
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleManagerStatus(manager.id, manager.active, manager.name)}
                          >
                            {manager.active ? (
                              <>
                                <PowerOff className="w-4 h-4 mr-2" />
                                Идэвхгүй болгох
                              </>
                            ) : (
                              <>
                                <Power className="w-4 h-4 mr-2" />
                                Идэвхжүүлэх
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-10 h-10">
                          {manager.profileImage ? (
                            <AvatarImage src={manager.profileImage || "/placeholder.svg"} alt={manager.name} />
                          ) : (
                            <AvatarFallback>{manager.name?.charAt(0).toUpperCase() || "M"}</AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">Менежер</p>
                          <p className="text-xs text-muted-foreground">{manager.phone}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Driver List */}
              <h3 className="text-xl font-bold mt-6">Жолоочид</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {drivers.map((driver) => (
                  <Card key={driver.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{driver.name}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditDriver(driver)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Засах
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteDriver(driver.id, driver.name)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Устгах
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleDriverStatus(driver.id, driver.active, driver.name)}
                          >
                            {driver.active ? (
                              <>
                                <PowerOff className="w-4 h-4 mr-2" />
                                Идэвхгүй болгох
                              </>
                            ) : (
                              <>
                                <Power className="w-4 h-4 mr-2" />
                                Идэвхжүүлэх
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-10 h-10">
                          {driver.profileImage ? (
                            <AvatarImage src={driver.profileImage || "/placeholder.svg"} alt={driver.name} />
                          ) : (
                            <AvatarFallback>{driver.name?.charAt(0).toUpperCase() || "D"}</AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">Жолооч</p>
                          <p className="text-xs text-muted-foreground">{driver.phone}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="register">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Хэрэглэгч бүртгэх</h2>
              <p className="text-muted-foreground">Менежер, жолооч, ажилчин бүртгэх</p>

              <form onSubmit={handleRegisterDriver} className="space-y-4">
                {/* Role Selection */}
                <div>
                  <Label htmlFor="role">Хэрэглэгчийн төрөл</Label>
                  <select
                    id="role"
                    className="w-full px-3 py-2 border rounded-md focus:ring focus:ring-primary focus:ring-opacity-50"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as "manager" | "driver" | "employee")}
                  >
                    <option value="manager">Менежер</option>
                    <option value="driver">Жолооч</option>
                    <option value="employee">Ажилчин</option>
                  </select>
                </div>

                {/* Employee Selection (Conditional) */}
                {selectedRole === "employee" && (
                  <div>
                    <Label htmlFor="employee">Ажилчин сонгох</Label>
                    <select
                      id="employee"
                      className="w-full px-3 py-2 border rounded-md focus:ring focus:ring-primary focus:ring-opacity-50"
                      onChange={(e) => handleEmployeeSelection(e.target.value)}
                    >
                      <option value="">Ажилчин сонгох</option>
                      {availableEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Name Input */}
                <div>
                  <Label htmlFor="name">Нэр</Label>
                  <Input
                    type="text"
                    id="name"
                    placeholder="Нэр"
                    value={newDriver.name}
                    onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                    required
                  />
                </div>

                {/* Phone Input */}
                <div>
                  <Label htmlFor="phone">Утасны дугаар</Label>
                  <Input
                    type="tel"
                    id="phone"
                    placeholder="Утасны дугаар"
                    value={newDriver.phone}
                    onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                  />
                </div>

                {/* Email Input */}
                <div>
                  <Label htmlFor="email">И-мэйл</Label>
                  <Input
                    type="email"
                    id="email"
                    placeholder="И-мэйл"
                    value={newDriver.email}
                    onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                    required
                  />
                </div>

                {/* Password Input */}
                <div>
                  <Label htmlFor="password">Нууц үг</Label>
                  <Input
                    type="password"
                    id="password"
                    placeholder="Нууц үг"
                    value={newDriver.password}
                    onChange={(e) => setNewDriver({ ...newDriver, password: e.target.value })}
                    required
                  />
                </div>

                {/* Submit Button */}
                <Button disabled={registrationLoading}>
                  {registrationLoading ? (
                    <>
                      Бүртгэж байна...
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Бүртгэх
                    </>
                  )}
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="report" className="space-y-6">
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                </div>
              </CardContent>
            </Card>

            {/* Report Results Card */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Зогсоолын бүртгэл ({filteredReportRecords.length})</CardTitle>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      Нийт орлого:{" "}
                      {filteredReportRecords
                        .reduce((sum, record) => sum + calculateParkingFeeForReport(record), 0)
                        .toLocaleString()}
                      ₮
                    </p>
                  </div>
                </div>
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
                          <th className="text-left p-3 font-medium">№</th>
                          <th className="text-left p-3 font-medium">Машины дугаар</th>
                          <th className="text-left p-3 font-medium">Засварчин</th>
                          <th className="text-left p-3 font-medium">Машины марк</th>
                          <th className="text-left p-3 font-medium">Орсон цаг</th>
                          <th className="text-left p-3 font-medium">Гарсан цаг</th>
                          <th className="text-left p-3 font-medium">Зогссон хугацаа</th>
                          <th className="text-left p-3 font-medium">Төлбөр</th>
                          <th className="text-left p-3 font-medium">Зураг</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReportRecords.map((record, index) => (
                          <tr key={record.id} className="border-b hover:bg-muted/50">
                            <td className="p-3">{index + 1}</td>
                            <td className="p-3 font-medium">{record.carNumber}</td>
                            <td className="p-3">{record.mechanicName || record.driverName || "-"}</td>
                            <td className="p-3">{record.carBrand || record.parkingArea || "-"}</td>
                            <td className="p-3 text-sm">{record.entryTime || "-"}</td>
                            <td className="p-3 text-sm">{record.exitTime || "-"}</td>
                            <td className="p-3 text-sm">{record.parkingDuration || "-"}</td>
                            <td className="p-3 font-medium">
                              {calculateParkingFeeForReport(record).toLocaleString()}₮
                            </td>
                            <td className="p-3">
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

        {/* Image Viewer Dialog */}
        <Dialog open={showImageViewer} onOpenChange={setShowImageViewer}>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Зураг харах</DialogTitle>
              <DialogDescription>Зогсоолын зургийг харах</DialogDescription>
            </DialogHeader>
            <div className="relative">
              {currentImages.length > 0 && (
                <img
                  src={currentImages[currentImageIndex] || "/placeholder.svg"}
                  alt={`Зураг ${currentImageIndex + 1}`}
                  className="w-full h-auto object-contain rounded-md"
                />
              )}
              {currentImages.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 rounded-full"
                  >
                    <ChevronLeft className="h-6 w-6 text-white" />
                    <span className="sr-only">Өмнөх зураг</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 rounded-full"
                  >
                    <ChevronRight className="h-6 w-6 text-white" />
                    <span className="sr-only">Дараагийн зураг</span>
                  </Button>
                </>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={closeImageViewer}>
                Хаах
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Employee Dialog */}
        <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Ажилчин нэмэх</DialogTitle>
              <DialogDescription>Шинэ ажилчин бүртгэх</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddEmployee} className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Нэр</Label>
                <Input
                  id="name"
                  placeholder="Нэр"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Албан тушаал</Label>
                <Input
                  id="position"
                  placeholder="Албан тушаал"
                  value={newEmployee.position}
                  onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Утасны дугаар</Label>
                <Input
                  id="phone"
                  placeholder="Утасны дугаар"
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Эхлэх огноо</Label>
                <Input
                  type="date"
                  id="startDate"
                  value={newEmployee.startDate}
                  onChange={(e) => setNewEmployee({ ...newEmployee, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profileImage">Профайл зураг</Label>
                <Input type="file" id="profileImage" accept="image/*" onChange={handleEmployeeImageUpload} />
                {newEmployee.profileImage && (
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={newEmployee.profileImage || "/placeholder.svg"} alt="Profile" />
                    <AvatarFallback>{newEmployee.name?.charAt(0).toUpperCase() || "E"}</AvatarFallback>
                  </Avatar>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={employeeLoading}>
                  {employeeLoading ? (
                    <>
                      Нэмж байна...
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Нэмэх
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Employee Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Ажилчин засах</DialogTitle>
              <DialogDescription>Ажилчны мэдээллийг засах</DialogDescription>
            </DialogHeader>
            {editingEmployee && (
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Нэр</Label>
                  <Input
                    id="name"
                    placeholder="Нэр"
                    value={editDriverData.name}
                    onChange={(e) => setEditDriverData({ ...editDriverData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Утасны дугаар</Label>
                  <Input
                    id="phone"
                    placeholder="Утасны дугаар"
                    value={editDriverData.phone}
                    onChange={(e) => setEditDriverData({ ...editDriverData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">И-мэйл</Label>
                  <Input
                    id="email"
                    placeholder="И-мэйл"
                    value={editDriverData.email}
                    onChange={(e) => setEditDriverData({ ...editDriverData, email: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleSaveEmployeeEdit} disabled={editLoading}>
                    {editLoading ? (
                      <>
                        Хадгалж байна...
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                      </>
                    ) : (
                      <>
                        <Edit className="w-4 h-4 mr-2" />
                        Хадгалах
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Profile Dialog */}
        <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Профайл засах</DialogTitle>
              <DialogDescription>Өөрийн мэдээллийг засах</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Нэр</Label>
                <Input
                  id="name"
                  placeholder="Нэр"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Утасны дугаар</Label>
                <Input
                  id="phone"
                  placeholder="Утасны дугаар"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">И-мэйл</Label>
                <Input
                  id="email"
                  placeholder="И-мэйл"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profileImage">Профайл зураг</Label>
                <Input
                  type="file"
                  id="profileImage"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "profile")}
                />
                {profileData.profileImage && (
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={profileData.profileImage || "/placeholder.svg"} alt="Profile" />
                    <AvatarFallback>{profileData.name?.charAt(0).toUpperCase() || "P"}</AvatarFallback>
                  </Avatar>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Одоогийн нууц үг</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  id="currentPassword"
                  placeholder="Одоогийн нууц үг"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                />
                <Button variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)} className="mt-2">
                  {showPassword ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Нуух
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Харах
                    </>
                  )}
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Шинэ нууц үг</Label>
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  id="newPassword"
                  placeholder="Шинэ нууц үг"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="mt-2"
                >
                  {showConfirmPassword ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Нуух
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Харах
                    </>
                  )}
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Нууц үг баталгаажуулах</Label>
                <Input
                  type="password"
                  id="confirmPassword"
                  placeholder="Нууц үг баталгаажуулах"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveProfile} disabled={profileLoading}>
                {profileLoading ? (
                  <>
                    Хадгалж байна...
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Хадгалах
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Site Configuration Dialog */}
        <Dialog open={showSiteDialog} onOpenChange={setShowSiteDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Сайт бүртгэл</DialogTitle>
              <DialogDescription>Сайтын тохиргоог засах</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">Сайтын нэр</Label>
                <Input
                  id="siteName"
                  placeholder="Сайтын нэр"
                  value={siteConfig.siteName}
                  onChange={(e) => setSiteConfig({ ...siteConfig, siteName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteLogo">Сайтын лого</Label>
                <Input type="file" id="siteLogo" accept="image/*" onChange={(e) => handleImageUpload(e, "logo")} />
                {siteConfig.siteLogo && (
                  <img
                    src={siteConfig.siteLogo || "/placeholder.svg"}
                    alt="Site Logo"
                    className="w-20 h-auto rounded-md"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteBackground">Сайтын фон</Label>
                <Input
                  type="file"
                  id="siteBackground"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "background")}
                />
                {siteConfig.siteBackground && (
                  <img
                    src={siteConfig.siteBackground || "/placeholder.svg"}
                    alt="Site Background"
                    className="w-20 h-auto rounded-md"
                  />
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveSiteConfig} disabled={siteLoading}>
                {siteLoading ? (
                  <>
                    Хадгалж байна...
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Хадгалах
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pricing Configuration Dialog */}
        <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Үнийн тохиргоо</DialogTitle>
              <DialogDescription>Зогсоолын үнийг тохируулах</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pricePerMinute">Минут тутамд (₮)</Label>
                <Input
                  type="number"
                  id="pricePerMinute"
                  placeholder="Минут тутамд"
                  value={pricingConfig.pricePerMinute}
                  onChange={(e) => setPricingConfig({ ...pricingConfig, pricePerMinute: Number(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSavePricingConfig} disabled={pricingLoading}>
                {pricingLoading ? (
                  <>
                    Хадгалж байна...
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Хадгалах
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Date Range Dialog */}
        <Dialog open={showDateRangeDialog} onOpenChange={setShowDateRangeDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Огнооны хооронд тайлан татах</DialogTitle>
              <DialogDescription>Тайлан татах огноог сонгоно уу</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dateRangeStart">Эхлэх огноо</Label>
                <Input
                  type="date"
                  id="dateRangeStart"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateRangeEnd">Дуусах огноо</Label>
                <Input
                  type="date"
                  id="dateRangeEnd"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Checkbox id="deleteAfterExport" checked={deleteAfterExport} onCheckedChange={setDeleteAfterExport} />
                <Label
                  htmlFor="deleteAfterExport"
                  className="ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed"
                >
                  Экспортын дараа устгах
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleDateRangeExport} disabled={exportLoading}>
                {exportLoading ? (
                  <>
                    Тайлан татаж байна...
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Тайлан татах
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Custom Date Range Picker */}
        <Dialog open={showDateRangePicker} onOpenChange={setShowDateRangePicker}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Огноо сонгох</DialogTitle>
              <DialogDescription>Тайлангийн огноог сонгоно уу</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Эхлэх огноо</Label>
                <Input
                  type="date"
                  id="startDate"
                  value={customDateRange.startDate}
                  onChange={(e) => setCustomDateRange({ ...customDateRange, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Дуусах огноо</Label>
                <Input
                  type="date"
                  id="endDate"
                  value={customDateRange.endDate}
                  onChange={(e) => setCustomDateRange({ ...customDateRange, endDate: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={applyCustomDateRange}>
                <Calendar className="w-4 h-4 mr-2" />
                Хадгалах
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}

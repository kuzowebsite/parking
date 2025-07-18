"use client"
import type React from "react"
import { DialogFooter } from "@/components/ui/dialog"

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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  Car,
  BarChart3,
  EyeOff,
} from "lucide-react"
import * as XLSX from "xlsx"
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  BarChart,
  Bar,
} from "recharts"
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
  const [totalCashAmount, setTotalCashAmount] = useState(0)
  const [totalCardAmount, setTotalCardAmount] = useState(0)
  const [totalTransferAmount, setTotalTransferAmount] = useState(0)
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
  const [profileLoading, setLoadingProfile] = useState(false)
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
  // Payment status dialog states
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  // New states for split payment amounts
  const [cashAmountInput, setCashAmountInput] = useState(0)
  const [cardAmountInput, setCardAmountInput] = useState(0)
  const [transferAmountInput, setTransferAmountInput] = useState(0)
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
    if (!confirm(`${driverName} бүртгэлийг устгахдаа итгэлтэй байна уу?`)) {
      return
    }
    try {
      await remove(ref(database, `users/${driverId}`))
      alert("Бүртгэл амжилттай устгагдлаа")
    } catch (error) {
      alert("Бүртгэл устгахад алдаа гарлаа")
    }
  }
  // In handleEditDriver function:
  const handleEditDriver = (driver: UserProfile) => {
    setEditingDriver(driver)
    setEditDriverData({
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      newPassword: "", // Ensure new password field is always empty on open
    })
    setShowEditDialog(true)
  }
  const handleToggleDriverStatus = async (driverId: string, currentStatus: boolean, driverName: string) => {
    const newStatus = !currentStatus
    const statusText = newStatus ? "идэвхжүүлэх" : "идэвхгүй болгох"
    if (!confirm(`${driverName} бүртгэлийг ${statusText}даа итгэлтэй байна уу?`)) {
      return
    }
    try {
      await update(ref(database, `users/${driverId}`), {
        active: newStatus,
        updatedAt: new Date().toISOString(),
      })
      alert(`Бүртгэл амжилттай ${newStatus ? "идэвхжлээ" : "идэвхгүй боллоо"}`)
    } catch (error) {
      alert("Бүргэлийн төлөв өөрчлөхөд алдаа гарлаа")
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
  // In handleEditEmployee function:
  const handleEditEmployee = (employee: UserProfile) => {
    setEditingEmployee(employee)
    setEditDriverData({
      name: employee.name,
      phone: employee.phone,
      email: employee.email,
      newPassword: "", // Ensure new password field is always empty on open
    })
    setShowEditDialog(true)
  }
  // In handleSaveEmployeeEdit function:
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
      // Update both users and employees nodes for employees
      await update(ref(database, `users/${editingEmployee.id}`), updateData)
      if (editingEmployee.role === "employee") {
        await update(ref(database, `employees/${editingEmployee.id}`), updateData)
      }

      alert("Ажилчны мэдээлэл амжилттай шинэчлэгдлээ")
      setShowEditDialog(false)
      setEditingEmployee(null)
    } catch (error) {
      console.error("Error updating user/employee:", error)
      alert("Мэдээлэл шинэчлэхэд алдаа гарлаа")
    }
    setEditLoading(false)
  }
  // Delete employee
  const handleDeleteEmployee = async (employeeId: string, employeeName: string) => {
    if (!confirm(`${employeeName} ажилчныг устгахдаа итгэлтэй байна уу?`)) {
      return
    }
    try {
      // Delete from both users and employees nodes
      await remove(ref(database, `users/${employeeId}`))
      await remove(ref(database, `employees/${employeeId}`)) // Also delete from employees node
      alert("Ажилчин амжилттай устгагдлаа")
    } catch (error) {
      console.error("Error deleting employee:", error)
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
      // Update status in both users and employees nodes
      await update(ref(database, `users/${employeeId}`), {
        active: newStatus,
        updatedAt: new Date().toISOString(),
      })
      await update(ref(database, `employees/${employeeId}`), {
        // Also update the employees node
        active: newStatus,
        updatedAt: new Date().toISOString(),
      })
      alert(`Ажилчин амжилттай ${newStatus ? "идэвхжлээ" : "идэвхгүй боллоо"}`)
    } catch (error) {
      console.error("Error toggling employee status:", error)
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
    }
    )
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
      \
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
    // If individual payment amounts are stored, sum them up
    if (record.cashAmount !== undefined || record.cardAmount !== undefined || record.transferAmount !== undefined) {
      return (record.cashAmount || 0) + (record.cardAmount || 0) + (record.transferAmount || 0)
    }
    // Fallback to old logic if individual amounts are not present
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
    // Add payment status filter
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

    // Calculate total amounts for each payment method
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
      // Одоогийн хэрэглэгчийн мэдээллийг хадгалах
      const currentUser = auth.currentUser

      // Firebase Auth дээр хэрэглэгч үүсгэх
      const userCredential = await createUserWithEmailAndPassword(auth, newDriver.email, newDriver.password)
      const newUserId = userCredential.user.uid

      // Шинэ хэрэглэгчээс гарах
      await signOut(auth)

      // Одоогийн менежерээр дахин нэвтрэх
      if (currentUser) {
        // Энэ хэсэг нь зөвхөн demonstration зорилготой
        // Бодит системд энэ нь илүү нарийн шийдэл шаардана
        console.log("Менежерийн сессийг сэргээж байна...")
      }

      // Database дээр хэрэглэгчийн мэдээлэл хадгалах
      const userData: UserProfile = {
        name: newDriver.name.trim(),
        phone: newDriver.phone.trim(),
        email: newDriver.email,
        role: selectedRole === "employee" ? "employee" : selectedRole,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await set(ref(database, `users/${newUserId}`), userData)

      alert(
        `${selectedRole === "manager" ? "Менежер" : selectedRole === "driver" ? "Бүртгэл" : "Ажилчин"} амжилттай бүртгэгдлээ`,
      )

      // Form цэвэрлэх
      setNewDriver({
        email: "",
        password: "",
        name: "",
        phone: "",
        role: "driver",
        createdAt: "",
      })

      // Хуудсыг дахин ачаалах (менежерийн сессийг сэргээхийн тулд)
      window.location.reload()
    } catch (error: any) {
      console.error("Driver registration error:", error)
      if (error.code === "auth/email-already-in-use") {
        alert("Энэ и-мэйл хаяг аль хэдийн ашиглагдаж байна")
      } else if (error.code === "auth/invalid-email") {
        alert("И-мэйл хаяг буруу байна")
      } else {
        alert("Бүртгэхэд алдаа гарлаа")
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
  // In handleSaveDriverEdit function:
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
      // Note: Password update requires re-authentication in a production environment.
      // This simplified example only updates profile data (name, phone, email).
      const userType =
        editingDriver.role === "manager" ? "Менежерийн" : editingDriver.role === "driver" ? "Бүртгэлийн" : "Ажилчны"
      alert(`${userType} мэдээлэл амжилттай шинэчлэгдлээ`)
      setShowEditDialog(false)
      setEditingDriver(null)
    } catch (error) {
      console.error("Error updating user:", error)
      const userType =
        editingDriver?.role === "manager" ? "менежерийн" : editingDriver?.role === "driver" ? "бүртгэлийн" : "ажилчны"
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
    setLoadingProfile(false)
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
  // Handle payment status update
  const handlePaymentStatusUpdate = async () => {
    if (!selectedRecord) return

    const totalPaidAmount = cashAmountInput + cardAmountInput + transferAmountInput

    if (totalPaidAmount <= 0) {
      alert("Төлбөрийн дүнг оруулна уу.")
      return
    }

    setPaymentLoading(true)
    try {
      const updateData: any = {
        paymentStatus: "paid", // Always set to paid if amounts are entered
        amount: totalPaidAmount, // Total amount paid
        cashAmount: cashAmountInput,
        cardAmount: cardAmountInput,
        transferAmount: transferAmountInput,
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.name || "Manager",
      }

      // Determine payment method string for display/excel if needed
      let paymentMethodString = ""
      const methodsUsed = []
      if (cashAmountInput > 0) methodsUsed.push("cash")
      if (cardAmountInput > 0) methodsUsed.push("card")
      if (transferAmountInput > 0) methodsUsed.push("transfer")

      if (methodsUsed.length === 1) {
        paymentMethodString = methodsUsed[0]
      } else if (methodsUsed.length > 1) {
        paymentMethodString = "split" // Or "mixed"
      } else {
        paymentMethodString = "none" // Should not happen if totalPaidAmount > 0
      }
      updateData.paymentMethod = paymentMethodString // Keep for backward compatibility/excel

      await update(ref(database, `parking_records/${selectedRecord.id}`), updateData)
      alert(`Төлбөр амжилттай бүртгэгдлээ: ${totalPaidAmount.toLocaleString()}₮`)
      setShowPaymentDialog(false)
      setSelectedRecord(null)
      // Reset input fields
      setCashAmountInput(0)
      setCardAmountInput(0)
      setTransferAmountInput(0)
    } catch (error) {
      console.error("Error updating payment status:", error)
      alert("Төлбөр бүртгэхэд алдаа гарлаа")
    }
    setPaymentLoading(false)
  }
  // Open payment dialog
  const openPaymentDialog = (record: any) => {
    setSelectedRecord(record)
    // Initialize amounts from record, or to 0
    setCashAmountInput(record.cashAmount || 0)
    setCardAmountInput(record.cardAmount || 0)
    setTransferAmountInput(record.transferAmount || 0)
    setShowPaymentDialog(true)
  }
  const handleLogout = async () => {
    if (confirm("Та гарахдаа итгэлтэй байна у��?")) {
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
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0
                  01.293.707H19a2 2 0 012 2v11a2 2 0 01-2 2z"
                />
              </svg>
              Тайлан
            </TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="sm:p-8">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Нийт үйлчлүүлэгч</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats.totalCustomers}</div>
                  <p className="text-xs text-muted-foreground">
                    {customDateRange.useCustomRange
                      ? `${customDateRange.startDate} - ${customDateRange.endDate} хооронд`
                      : "Сүүлийн 6 сарын байдлаар"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Нийт орлого</CardTitle>
                  <Car className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats.totalRevenue.toLocaleString()}₮</div>
                  <p className="text-xs text-muted-foreground">
                    {customDateRange.useCustomRange
                      ? `${customDateRange.startDate} - ${customDateRange.endDate} хооронд`
                      : "Сүүлийн 6 сарын байдлаар"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Идэвхтэй бүртгэл</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats.activeRecords}</div>
                  <p className="text-xs text-muted-foreground">Яг одоо зогсож байгаа</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Өнөөдрийн орлого</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats.todayRevenue.toLocaleString()}₮</div>
                  <p className="text-xs text-muted-foreground">Өнөөдрийн байдлаар</p>
                </CardContent>
              </Card>
            </div>
            <div className="flex justify-between items-center mt-4">
              <h2 className="text-xl font-bold">Статистик</h2>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={() => setShowDateRangePicker(true)}>
                  Огноо сонгох
                </Button>
                <Button variant="outline" size="sm" onClick={resetToDefaultRange}>
                  Анхны байдалд оруулах
                </Button>
              </div>
            </div>
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Сарчилсан орлого</CardTitle>
                  <CardDescription>Сүүлийн 6 сарын орлого</CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboardLoading ? (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-muted-foreground">Ачааллаж байна...</p>
                    </div>
                  ) : (
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Орлого" />
                          <Line type="monotone" dataKey="customers" stroke="#82ca9d" name="Үйлчлүүлэгч" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Өдөрчилсан орлого</CardTitle>
                  <CardDescription>Сүүлийн 7 хоногийн орлого</CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboardLoading ? (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-muted-foreground">Ачааллаж байна...</p>
                    </div>
                  ) : (
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="revenue" fill="#8884d8" name="Орлого" />
                          <Bar dataKey="customers" fill="#82ca9d" name="Үйлчлүүлэгч" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="mt-6">
              <h2 className="text-xl font-bold mb-4">Сүүлийн идэвхтэй үйл ажиллагаа</h2>
              {dashboardLoading ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Ачааллаж байна...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Машины дугаар
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Төрөл
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Огноо
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Төлбөр
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentActivity.map((record) => (
                        <tr key={record.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {record.carNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.type}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(record.timestamp).toLocaleDateString("mn-MN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "numeric",
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.amount ? `${record.amount.toLocaleString()}₮` : "Байхгүй"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="employees">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Ажилчид</h2>
              <Button onClick={() => setShowEmployeeDialog(true)}>Ажилчин нэмэх</Button>
            </div>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {employees.map((employee) => (
                <Card key={employee.id}>
                  <CardHeader>
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-10 h-10">
                        {employee.profileImage ? (
                          <AvatarImage src={employee.profileImage || "/placeholder.svg"} alt={employee.name} />
                        ) : (
                          <AvatarFallback>{employee.name?.charAt(0).toUpperCase() || "А"}</AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <CardTitle>{employee.name}</CardTitle>
                        <CardDescription>{employee.position}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Утас: {employee.phone}</p>
                    <p className="text-sm text-muted-foreground">И-мэйл: {employee.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Бүртгүүлсэн:{" "}
                      {new Date(employee.createdAt).toLocaleDateString("mn-MN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <Badge variant={employee.active ? "default" : "destructive"}>
                      {employee.active ? "Идэвхтэй" : "Идэвхгүй"}
                    </Badge>
                  </CardContent>
                  <DialogFooter className="justify-between">
                    <div className="space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEditEmployee(employee)}
                        disabled={employeeLoading}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Засах
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                        disabled={employeeLoading}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Устгах
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleEmployeeStatus(employee.id, employee.active, employee.name)}
                      disabled={employeeLoading}
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
                    </Button>
                  </DialogFooter>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="register">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Хэрэглэгч бүртгэх</CardTitle>
                  <CardDescription>Менежер, ажилчин, бүртгэлийн ажилтан нэмэх</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegisterDriver} className="space-y-4">
                    <div>
                      <Label htmlFor="role">Хэрэглэгчийн төрөл</Label>
                      <select
                        id="role"
                        className="w-full border rounded-md px-3 py-2 mt-1"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as "manager" | "driver" | "employee")}
                      >
                        <option value="employee">Ажилчин</option>
                        <option value="driver">Бүртгэлийн ажилтан</option>
                        <option value="manager">Менежер</option>
                      </select>
                    </div>
                    {selectedRole === "employee" && (
                      <div>
                        <Label htmlFor="employee">Ажилчин сонгох</Label>
                        <select
                          id="employee"
                          className="w-full border rounded-md px-3 py-2 mt-1"
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
                    <div>
                      <Label htmlFor="name">Нэр</Label>
                      <Input
                        type="text"
                        id="name"
                        value={newDriver.name}
                        onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Утас</Label>
                      <Input
                        type="tel"
                        id="phone"
                        value={newDriver.phone}
                        onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">И-мэйл</Label>
                      <Input
                        type="email"
                        id="email"
                        value={newDriver.email}
                        onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Нууц үг</Label>
                      <Input
                        type="password"
                        id="password"
                        value={newDriver.password}
                        onChange={(e) => setNewDriver({ ...newDriver, password: e.target.value })}
                        required
                      />
                    </div>
                    <Button disabled={registrationLoading}>
                      {registrationLoading ? "Бүртгэж байна..." : "Бүртгэх"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Менежерүүд</CardTitle>
                  <CardDescription>Бүртгэлтэй менежерүүд</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {managers.map((manager) => (
                      <Card key={manager.id}>
                        <CardHeader>
                          <div className="flex items-center space-x-4">
                            <Avatar className="w-8 h-8">
                              {manager.profileImage ? (
                                <AvatarImage src={manager.profileImage || "/placeholder.svg"} alt={manager.name} />
                              ) : (
                                <AvatarFallback>{manager.name?.charAt(0).toUpperCase() || "М"}</AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <CardTitle>{manager.name}</CardTitle>
                              <CardDescription>Менежер</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">Утас: {manager.phone}</p>
                          <p className="text-sm text-muted-foreground">И-мэйл: {manager.email}</p>
                          <Badge variant={manager.active ? "default" : "destructive"}>
                            {manager.active ? "Идэвхтэй" : "Идэвхгүй"}
                          </Badge>
                        </CardContent>
                        <DialogFooter className="justify-between">
                          <div className="space-x-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleEditManager(manager)}
                              disabled={editLoading}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Засах
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteManager(manager.id, manager.name)}
                              disabled={editLoading}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Устгах
                            </Button>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleManagerStatus(manager.id, manager.active, manager.name)}
                            disabled={editLoading}
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
                          </Button>
                        </DialogFooter>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Бүртгэлийн ажилтнууд</CardTitle>
                  <CardDescription>Бүртгэлтэй ажилтнууд</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {drivers.map((driver) => (
                      <Card key={driver.id}>
                        <CardHeader>
                          <div className="flex items-center space-x-4">
                            <Avatar className="w-8 h-8">
                              {driver.profileImage ? (
                                <AvatarImage src={driver.profileImage || "/placeholder.svg"} alt={driver.name} />
                              ) : (
                                <AvatarFallback>{driver.name?.charAt(0).toUpperCase() || "D"}</AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <CardTitle>{driver.name}</CardTitle>
                              <CardDescription>Бүртгэлийн ажилтан</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">Утас: {driver.phone}</p>
                          <p className="text-sm text-muted-foreground">И-мэйл: {driver.email}</p>
                          <Badge variant={driver.active ? "default" : "destructive"}>
                            {driver.active ? "Идэвхтэй" : "Идэвхгүй"}
                          </Badge>
                        </CardContent>
                        <DialogFooter className="justify-between">
                          <div className="space-x-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleEditDriver(driver)}
                              disabled={editLoading}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Засах
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteDriver(driver.id, driver.name)}
                              disabled={editLoading}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Устгах
                            </Button>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleDriverStatus(driver.id, driver.active, driver.name)}
                            disabled={editLoading}
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
                          </Button>
                        </DialogFooter>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="report">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Тайлан</h2>
              <Button onClick={() => setShowDateRangeDialog(true)}>Огноогоор экспортлох</Button>
            </div>
            <div className="flex flex-wrap gap-4 mb-4">
              <div>
                <Label htmlFor="reportFilterYear">Жил</Label>
                <select
                  id="reportFilterYear"
                  className="w-full border rounded-md px-3 py-2 mt-1"
                  value={reportFilterYear}
                  onChange={(e) => setReportFilterYear(e.target.value)}
                >
                  <option value="">Бүх жил</option>
                  {getReportAvailableYears().map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="reportFilterMonth">Сар</Label>
                <select
                  id="reportFilterMonth"
                  className="w-full border rounded-md px-3 py-2 mt-1"
                  value={reportFilterMonth}
                  onChange={(e) => setReportFilterMonth(e.target.value)}
                >
                  <option value="">Бүх сар</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month.toString().padStart(2, "0")}>
                      {month.toString().padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="reportFilterCarNumber">Машины дугаар</Label>
                <Input
                  type="text"
                  id="reportFilterCarNumber"
                  placeholder="Хайх..."
                  value={reportFilterCarNumber}
                  onChange={(e) => setReportFilterCarNumber(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="reportFilterMechanic">Засварчин</Label>
                <select
                  id="reportFilterMechanic"
                  className="w-full border rounded-md px-3 py-2 mt-1"
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
              <div>
                <Label htmlFor="reportFilterPaymentStatus">Төлбөрийн төлөв</Label>
                <select
                  id="reportFilterPaymentStatus"
                  className="w-full border rounded-md px-3 py-2 mt-1"
                  value={reportFilterPaymentStatus}
                  onChange={(e) => setReportFilterPaymentStatus(e.target.value)}
                >
                  <option value="">Бүх төлөв</option>
                  <option value="paid">Төлсөн</option>
                  <option value="unpaid">Төлөөгүй</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              {reportLoading ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Тайлан ачааллаж байна...</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        №
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Машины дугаар
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Засварчин
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Машины марк
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Орсон цаг
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Гарсан цаг
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Зогссон хугацаа
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Төлбөр
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Төлбөрийн төлөв
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Төлбөрийн хэлбэр
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Зураг
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Үйлдэл
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredReportRecords.map((record, index) => (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.carNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.mechanicName || record.driverName || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.carBrand || record.parkingArea || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.entryTime}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.exitTime}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.parkingDuration}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {calculateParkingFeeForReport(record).toLocaleString()}₮
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.paymentStatus === "paid" ? "Төлсөн" : "Төлөөгүй"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.paymentMethod === "card"
                            ? "Карт"
                            : record.paymentMethod === "cash"
                              ? "Бэлэн"
                              : record.paymentMethod === "transfer"
                                ? "Харилцах"
                                : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.images && record.images.length > 0 ? (
                            <Button variant="secondary" size="sm" onClick={() => openImageViewer(record.images)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Харах
                            </Button>
                          ) : (
                            "Байхгүй"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {record.paymentStatus !== "paid" ? (
                            <Button variant="outline" size="sm" onClick={() => openPaymentDialog(record)}>
                              Төлбөр төлөх
                            </Button>
                          ) : (
                            <Badge variant="outline">Төлөгдсөн</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="mt-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Нийт: {filteredReportRecords.length} бүртгэл</p>
                <p className="text-sm text-muted-foreground">
                  Бэлнээр: {totalCashAmount.toLocaleString()}₮, Картаар: {totalCardAmount.toLocaleString()}₮, Дансаар:{" "}
                  {totalTransferAmount.toLocaleString()}₮
                </p>
              </div>
              <Button onClick={exportToExcel}>Excel файл татах</Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      {/* Date Range Picker Modal */}
      <Dialog open={showDateRangePicker} onOpenChange={setShowDateRangePicker}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Огноо сонгох</DialogTitle>
            <DialogDescription>Хугацаа сонгож тайлан харах</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">
                Эхлэх огноо
              </Label>
              <Input
                type="date"
                id="startDate"
                className="col-span-3"
                value={customDateRange.startDate}
                onChange={(e) => setCustomDateRange({ ...customDateRange, startDate: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endDate" className="text-right">
                Дуусах огноо
              </Label>
              <Input
                type="date"
                id="endDate"
                className="col-span-3"
                value={customDateRange.endDate}
                onChange={(e) => setCustomDateRange({ ...customDateRange, endDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={applyCustomDateRange}>
              Хэрэглэх
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Date Range Export Modal */}
      <Dialog open={showDateRangeDialog} onOpenChange={setShowDateRangeDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Огноогоор экспортлох</DialogTitle>
            <DialogDescription>Хугацаа сонгож Excel файл татах</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dateRangeStart" className="text-right">
                Эхлэх огноо
              </Label>
              <Input
                type="date"
                id="dateRangeStart"
                className="col-span-3"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dateRangeEnd" className="text-right">
                Дуусах огноо
              </Label>
              <Input
                type="date"
                id="dateRangeEnd"
                className="col-span-3"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="deleteAfterExport"
                checked={deleteAfterExport}
                onCheckedChange={(checked) => setDeleteAfterExport(checked || false)}
              />
              <label
                htmlFor="deleteAfterExport"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed"
              >
                Экспортын дараа устгах
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleDateRangeExport} disabled={exportLoading}>
              {exportLoading ? "Экспортлож байна..." : "Экспортлох"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Image Viewer Modal */}
      <Dialog open={showImageViewer} onOpenChange={setShowImageViewer}>
        <DialogContent className="sm:max-w-[90%] sm:max-h-[90%] flex flex-col">
          <DialogHeader>
            <DialogTitle>Зураг харах</DialogTitle>
            <DialogDescription>Зургийг томруулан харах</DialogDescription>
          </DialogHeader>
          <div className="flex-grow relative">
            {currentImages.length > 0 && (
              <img
                src={currentImages[currentImageIndex] || "/placeholder.svg"}
                alt={`Зураг ${currentImageIndex + 1}`}
                className="max-w-full max-h-full object-contain mx-auto"
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 transform -translate-y-1/2"
              onClick={prevImage}
            >
              <ChevronLeft className="h-6 w-6" />
              <span className="sr-only">Өмнөх зураг</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              onClick={nextImage}
            >
              <ChevronRight className="h-6 w-6" />
              <span className="sr-only">Дараагийн зураг</span>
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" onClick={closeImageViewer}>
              Хаах
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Employee Add Modal */}
      <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ажилчин нэмэх</DialogTitle>
            <DialogDescription>Шинэ ажилчин бүртгэх</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <Label htmlFor="name">Нэр</Label>
                <Input
                  type="text"
                  id="name"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="position">Албан тушаал</Label>
                <Input
                  type="text"
                  id="position"
                  value={newEmployee.position}
                  onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Утас</Label>
                <Input
                  type="tel"
                  id="phone"
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="startDate">Эхлэх огноо</Label>
                <Input
                  type="date"
                  id="startDate"
                  value={newEmployee.startDate}
                  onChange={(e) => setNewEmployee({ ...newEmployee, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="profileImage">Зураг оруулах</Label>
                <Input type="file" id="profileImage" accept="image/*" onChange={handleEmployeeImageUpload} />
                {newEmployee.profileImage && (
                  <div className="mt-2">
                    <img
                      src={newEmployee.profileImage || "/placeholder.svg"}
                      alt="Ажилчны зураг"
                      className="w-20 h-20 object-cover rounded-full"
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={employeeLoading}>
                  {employeeLoading ? "Нэмж байна..." : "Нэмэх"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
      {/* Employee Edit Modal */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Хэрэглэгч засах</DialogTitle>
            <DialogDescription>Хэрэглэгчийн мэдээллийг засах</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Нэр
              </Label>
              <Input
                type="text"
                id="name"
                className="col-span-3"
                value={editDriverData.name}
                onChange={(e) => setEditDriverData({ ...editDriverData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Утас
              </Label>
              <Input
                type="tel"
                id="phone"
                className="col-span-3"
                value={editDriverData.phone}
                onChange={(e) => setEditDriverData({ ...editDriverData, phone: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                И-мэйл
              </Label>
              <Input
                type="email"
                id="email"
                className="col-span-3"
                value={editDriverData.email}
                onChange={(e) => setEditDriverData({ ...editDriverData, email: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleSaveEmployeeEdit} disabled={editLoading}>
              {editLoading ? "Хадгалж байна..." : "Хадгалах"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Profile Edit Modal */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Профайл засах</DialogTitle>
            <DialogDescription>Профайлын мэдээллийг засах</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Нэр
              </Label>
              <Input
                type="text"
                id="name"
                className="col-span-3"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Утас
              </Label>
              <Input
                type="tel"
                id="phone"
                className="col-span-3"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                И-мэйл
              </Label>
              <Input
                type="email"
                id="email"
                className="col-span-3"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="profileImage" className="text-right">
                Зураг
              </Label>
              <Input
                type="file"
                id="profileImage"
                className="col-span-3"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, "profile")}
              />
              {profileData.profileImage && (
                <div className="col-span-4 flex justify-center">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={profileData.profileImage || "/placeholder.svg"} alt="Profile" />
                    <AvatarFallback>{profileData.name?.charAt(0).toUpperCase() || "M"}</AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currentPassword" className="text-right">
                Одоогийн нууц үг
              </Label>
              <Input
                type={showPassword ? "text" : "password"}
                id="currentPassword"
                className="col-span-3"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              />
              <Button variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newPassword" className="text-right">
                Шинэ нууц үг
              </Label>
              <Input
                type={showConfirmPassword ? "text" : "password"}
                id="newPassword"
                className="col-span-3"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              />
              <Button variant="ghost" size="sm" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="confirmPassword" className="text-right">
                Нууц үг баталгаажуулах
              </Label>
              <Input
                type="password"
                id="confirmPassword"
                className="col-span-3"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleSaveProfile} disabled={profileLoading}>
              {profileLoading ? "Хадгалж байна..." : "Хадгалах"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Site Configuration Modal */}
      <Dialog open={showSiteDialog} onOpenChange={setShowSiteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Сайт бүртгэл засах</DialogTitle>
            <DialogDescription>Сайтын мэдээллийг засах</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="siteName" className="text-right">
                Сайтын нэр
              </Label>
              <Input
                type="text"
                id="siteName"
                className="col-span-3"
                value={siteConfig.siteName}
                onChange={(e) => setSiteConfig({ ...siteConfig, siteName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="siteLogo" className="text-right">
                Сайтын лого
              </Label>
              <Input
                type="file"
                id="siteLogo"
                className="col-span-3"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, "logo")}
              />
              {siteConfig.siteLogo && (
                <div className="col-span-4 flex justify-center">
                  <img
                    src={siteConfig.siteLogo || "/placeholder.svg"}
                    alt="Site Logo"
                    className="w-24 h-24 object-contain"
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="siteBackground" className="text-right">
                Сайтын фон
              </Label>
              <Input
                type="file"
                id="siteBackground"
                className="col-span-3"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, "background")}
              />
              {siteConfig.siteBackground && (
                <div className="col-span-4 flex justify-center">
                  <img
                    src={siteConfig.siteBackground || "/placeholder.svg"}
                    alt="Site Background"
                    className="w-full h-24 object-cover"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleSaveSiteConfig} disabled={siteLoading}>
              {siteLoading ? "Хадгалж байна..." : "Хадгалах"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Pricing Configuration Modal */}
      <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Үнэ засах</DialogTitle>
            <DialogDescription>Зогсоолын үнийг засах</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pricePerMinute" className="text-right">
                Минут тутамд (₮)
              </Label>
              <Input
                type="number"
                id="pricePerMinute"
                className="col-span-3"
                value={pricingConfig.pricePerMinute}
                onChange={(e) => setPricingConfig({ ...pricingConfig, pricePerMinute: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleSavePricingConfig} disabled={pricingLoading}>
              {pricingLoading ? "Хадгалж байна..." : "Хадгалах"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Payment Status Modal */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Төлбөр төлөх</DialogTitle>
            <DialogDescription>Төлбөрийн мэдээллийг оруулах</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cashAmount" className="text-right">
                Бэлэн (₮)
              </Label>
              <Input
                type="number"
                id="cashAmount"
                className="col-span-3"
                value={cashAmountInput}
                onChange={(e) => setCashAmountInput(Number(e.target.value))}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cardAmount" className="text-right">
                Карт (₮)
              </Label>
              <Input
                type="number"
                id="cardAmount"
                className="col-span-3"
                value={cardAmountInput}
                onChange={(e) => setCardAmountInput(Number(e.target.value))}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transferAmount" className="text-right">
                Дансаар (₮)
              </Label>
              <Input
                type="number"
                id="transferAmount"
                className="col-span-3"
                value={transferAmountInput}
                onChange={(e) => setTransferAmountInput(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handlePaymentStatusUpdate} disabled={paymentLoading}>
              {paymentLoading ? "Төлж байна..." : "Төлөх"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { ref, get, onValue, off, push, update } from "firebase/database"
import { auth, database } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Car,
  Clock,
  DollarSign,
  Users,
  LogOut,
  AlertCircle,
  User,
  Settings,
  Database,
  Wifi,
  WifiOff,
  FileText,
  Download,
  Filter,
  Edit,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Save,
} from "lucide-react"
import type { ParkingRecord, Employee, SiteConfig, Manager } from "@/types"
import * as XLSX from "xlsx"

export default function ManagerPage() {
  // Authentication states
  const [user, setUser] = useState<any>(null)
  const [manager, setManager] = useState<Manager | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState("")

  // Connection states
  const [isOnline, setIsOnline] = useState(true)
  const [dbConnected, setDbConnected] = useState(false)
  const [connectionError, setConnectionError] = useState("")

  // Data states
  const [parkingRecords, setParkingRecords] = useState<ParkingRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredRecords, setFilteredRecords] = useState<ParkingRecord[]>([])

  // Site configuration
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    siteName: "Зогсоолын систем",
    siteLogo: "",
    siteBackground: "",
    hourlyRate: 1000,
  })

  // UI states
  const [activeTab, setActiveTab] = useState("dashboard")
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false)
  const [showAddEmployeeDialog, setShowAddEmployeeDialog] = useState(false)
  const [showEditRecordDialog, setShowEditRecordDialog] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<ParkingRecord | null>(null)

  // Filter states
  const [dateFilter, setDateFilter] = useState("")
  const [employeeFilter, setEmployeeFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("")

  // Profile edit states
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    profileImage: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // New employee states
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    profileImage: "",
  })

  const router = useRouter()

  // Connection monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Test database connection
    const testConnection = async () => {
      try {
        const testRef = ref(database, ".info/connected")
        onValue(testRef, (snapshot) => {
          setDbConnected(snapshot.val() === true)
        })
      } catch (error: any) {
        setConnectionError(error.message)
        setDbConnected(false)
      }
    }

    testConnection()

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Authentication monitoring
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user)

        if (user) {
          // Load manager data
          const userRef = ref(database, `users/${user.uid}`)
          const snapshot = await get(userRef)

          if (snapshot.exists()) {
            const userData = snapshot.val()

            if (userData.role !== "manager") {
              setAuthError("Зөвхөн менежер энэ хуудсанд нэвтэрч болно")
              await signOut(auth)
              return
            }

            setManager(userData)
            setProfileData({
              name: userData.name || "",
              email: userData.email || "",
              phone: userData.phone || "",
              profileImage: userData.profileImage || "",
              currentPassword: "",
              newPassword: "",
              confirmPassword: "",
            })
          } else {
            setAuthError("Хэрэглэгчийн мэдээлэл олдсонгүй")
          }
        } else {
          setManager(null)
          router.push("/login")
        }
      } catch (error: any) {
        setAuthError(`Нэвтрэх алдаа: ${error.message}`)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router])

  // Load site configuration
  useEffect(() => {
    if (!dbConnected) return

    const loadSiteConfig = async () => {
      try {
        const siteRef = ref(database, "siteConfig")
        const snapshot = await get(siteRef)

        if (snapshot.exists()) {
          const data = snapshot.val()
          setSiteConfig({
            siteName: data.siteName || "Зогсоолын систем",
            siteLogo: data.siteLogo || "",
            siteBackground: data.siteBackground || "",
            hourlyRate: data.hourlyRate || 1000,
          })
        }
      } catch (error: any) {
        console.error("Error loading site config:", error)
      }
    }

    loadSiteConfig()
  }, [dbConnected])

  // Load employees
  useEffect(() => {
    if (!dbConnected) return

    const employeesRef = ref(database, "users")
    const unsubscribe = onValue(employeesRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.val()
          const employeeList = Object.entries(data)
            .filter(([_, emp]: [string, any]) => emp.role === "employee")
            .map(([id, emp]: [string, any]) => ({
              id,
              ...emp,
            }))
          setEmployees(employeeList)
        }
      } catch (error: any) {
        console.error("Error loading employees:", error)
      }
    })

    return () => off(employeesRef, "value", unsubscribe)
  }, [dbConnected])

  // Load parking records
  useEffect(() => {
    if (!dbConnected) return

    const recordsRef = ref(database, "parkingRecords")
    const unsubscribe = onValue(recordsRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.val()
          const records = Object.entries(data).map(([id, record]: [string, any]) => ({
            id,
            ...record,
          }))
          setParkingRecords(records.reverse())
        }
      } catch (error: any) {
        console.error("Error loading parking records:", error)
      }
    })

    return () => off(recordsRef, "value", unsubscribe)
  }, [dbConnected])

  // Filter records
  useEffect(() => {
    let filtered = [...parkingRecords]

    if (dateFilter) {
      const filterDate = new Date(dateFilter)
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.entryTime)
        return recordDate.toDateString() === filterDate.toDateString()
      })
    }

    if (employeeFilter) {
      filtered = filtered.filter((record) => record.employeeId === employeeFilter)
    }

    if (statusFilter) {
      filtered = filtered.filter((record) => record.status === statusFilter)
    }

    if (paymentStatusFilter) {
      filtered = filtered.filter((record) => record.paymentStatus === paymentStatusFilter)
    }

    setFilteredRecords(filtered)
  }, [parkingRecords, dateFilter, employeeFilter, statusFilter, paymentStatusFilter])

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error: any) {
      alert(`Гарах алдаа: ${error.message}`)
    }
  }

  // Handle profile update
  const handleProfileUpdate = async () => {
    if (!user) return

    try {
      const userRef = ref(database, `users/${user.uid}`)
      const updateData: any = {
        name: profileData.name,
        phone: profileData.phone,
        profileImage: profileData.profileImage,
      }

      await update(userRef, updateData)
      alert("Профайл амжилттай шинэчлэгдлээ")
      setShowProfileDialog(false)
    } catch (error: any) {
      alert(`Профайл шинэчлэх алдаа: ${error.message}`)
    }
  }

  // Handle add employee
  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.email || !newEmployee.password) {
      alert("Бүх талбарыг бөглөнө үү")
      return
    }

    try {
      const employeesRef = ref(database, "users")
      const newEmployeeData = {
        name: newEmployee.name,
        email: newEmployee.email,
        phone: newEmployee.phone,
        role: "employee",
        profileImage: newEmployee.profileImage,
        createdAt: new Date().toISOString(),
        createdBy: user?.uid,
      }

      await push(employeesRef, newEmployeeData)

      // Reset form
      setNewEmployee({
        name: "",
        email: "",
        phone: "",
        password: "",
        profileImage: "",
      })

      setShowAddEmployeeDialog(false)
      alert("Ажилтан амжилттай нэмэгдлээ")
    } catch (error: any) {
      alert(`Ажилтан нэмэх алдаа: ${error.message}`)
    }
  }

  // Handle record edit
  const handleRecordEdit = async () => {
    if (!selectedRecord) return

    try {
      const recordRef = ref(database, `parkingRecords/${selectedRecord.id}`)
      await update(recordRef, {
        paymentStatus: selectedRecord.paymentStatus,
        paymentMethod: selectedRecord.paymentMethod,
      })

      setShowEditRecordDialog(false)
      setSelectedRecord(null)
      alert("Бүртгэл амжилттай шинэчлэгдлээ")
    } catch (error: any) {
      alert(`Бүртгэл шинэчлэх алдаа: ${error.message}`)
    }
  }

  // Export to Excel
  const exportToExcel = () => {
    const exportData = filteredRecords.map((record) => ({
      "Машины дугаар": record.plateNumber,
      "Орсон цаг": new Date(record.entryTime).toLocaleString("mn-MN"),
      "Гарсан цаг": record.exitTime ? new Date(record.exitTime).toLocaleString("mn-MN") : "Гараагүй",
      "Хугацаа (цаг)": record.duration || 0,
      "Төлбөр (₮)": record.cost || 0,
      Ажилтан: record.employeeName,
      "Төлбөрийн төлөв": record.paymentStatus === "paid" ? "Төлсөн" : "Төлөөгүй",
      "Төлбөрийн хэлбэр": record.paymentMethod || "",
      Төлөв: record.status === "parked" ? "Зогсож байна" : "Гарсан",
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Зогсоолын тайлан")

    const fileName = `parking-report-${new Date().toISOString().split("T")[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <div className="loading-spinner rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Ачааллаж байна...</p>
        </div>
      </div>
    )
  }

  // Error screen
  if (authError || connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>Алдаа гарлаа</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{authError || connectionError}</AlertDescription>
              </Alert>
              <Button onClick={() => window.location.reload()} className="w-full">
                Дахин ачаалах
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              {siteConfig.siteLogo && (
                <img src={siteConfig.siteLogo || "/placeholder.svg"} alt="Logo" className="h-8 w-8 object-contain" />
              )}
              <h1 className="text-xl font-semibold text-gray-900">{siteConfig.siteName} - Менежер</h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Connection status */}
              <div className="flex items-center space-x-2">
                {isOnline ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
                {dbConnected ? (
                  <Database className="w-4 h-4 text-green-500" />
                ) : (
                  <Database className="w-4 h-4 text-red-500" />
                )}
              </div>

              {/* Manager info */}
              {manager && (
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{manager.name}</span>
                </div>
              )}

              {/* Profile */}
              <Button variant="ghost" size="sm" onClick={() => setShowProfileDialog(true)}>
                <Settings className="w-4 h-4" />
              </Button>

              {/* Logout */}
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <div className="flex">
        <nav className="sidebar-nav w-64 min-h-screen p-4">
          <div className="space-y-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`sidebar-nav-item w-full text-left ${activeTab === "dashboard" ? "active" : ""}`}
            >
              <Car className="w-5 h-5" />
              Хяналтын самбар
            </button>

            <button
              onClick={() => setActiveTab("reports")}
              className={`sidebar-nav-item w-full text-left ${activeTab === "reports" ? "active" : ""}`}
            >
              <FileText className="w-5 h-5" />
              Тайлан
            </button>

            <button
              onClick={() => setActiveTab("employees")}
              className={`sidebar-nav-item w-full text-left ${activeTab === "employees" ? "active" : ""}`}
            >
              <Users className="w-5 h-5" />
              Ажилчид
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`sidebar-nav-item w-full text-left ${activeTab === "settings" ? "active" : ""}`}
            >
              <Settings className="w-5 h-5" />
              Тохиргоо
            </button>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 p-8">
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Хяналтын самбар</h2>
                <p className="text-gray-600">Зогсоолын ерөнхий мэдээлэл</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="enhanced-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Нийт машин</CardTitle>
                    <Car className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{parkingRecords.length}</div>
                  </CardContent>
                </Card>

                <Card className="enhanced-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Зогсож байгаа</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {parkingRecords.filter((r) => r.status === "parked").length}
                    </div>
                  </CardContent>
                </Card>

                <Card className="enhanced-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Нийт орлого</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {parkingRecords
                        .filter((r) => r.cost)
                        .reduce((sum, r) => sum + (r.cost || 0), 0)
                        .toLocaleString()}
                      ₮
                    </div>
                  </CardContent>
                </Card>

                <Card className="enhanced-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ажилчид</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{employees.length}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Records */}
              <Card className="enhanced-card">
                <CardHeader>
                  <CardTitle>Сүүлийн бүртгэлүүд</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="enhanced-table">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="text-left">Машины дугаар</th>
                          <th className="text-left">Орсон цаг</th>
                          <th className="text-left">Ажилтан</th>
                          <th className="text-left">Төлөв</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parkingRecords.slice(0, 10).map((record) => (
                          <tr key={record.id}>
                            <td className="font-medium">{record.plateNumber}</td>
                            <td>{new Date(record.entryTime).toLocaleString("mn-MN")}</td>
                            <td>{record.employeeName}</td>
                            <td>
                              <Badge
                                className={`enhanced-badge ${
                                  record.status === "parked" ? "badge-info" : "badge-success"
                                }`}
                              >
                                {record.status === "parked" ? "Зогсож байна" : "Гарсан"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Тайлан</h2>
                  <p className="text-gray-600">Зогсоолын дэлгэрэнгүй тайлан</p>
                </div>
                <Button onClick={exportToExcel} className="btn-primary">
                  <Download className="w-4 h-4 mr-2" />
                  Excel татах
                </Button>
              </div>

              {/* Filters */}
              <Card className="enhanced-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Filter className="w-5 h-5" />
                    <span>Шүүлтүүр</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="form-label">Огноо</Label>
                      <Input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="form-label">Ажилтан</Label>
                      <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                        <SelectTrigger className="form-select">
                          <SelectValue placeholder="Бүгд" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Бүгд</SelectItem>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="form-label">Төлөв</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="form-select">
                          <SelectValue placeholder="Бүгд" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="parked">Зогсож байна</SelectItem>
                          <SelectItem value="exited">Гарсан</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="form-label">Төлбөрийн төлөв</Label>
                      <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                        <SelectTrigger className="form-select">
                          <SelectValue placeholder="Бүх төлөв" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paid">Төлсөн</SelectItem>
                          <SelectItem value="unpaid">Төлөөгүй</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Records Table */}
              <Card className="enhanced-card">
                <CardHeader>
                  <CardTitle>Бүртгэлүүд ({filteredRecords.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="enhanced-table">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="text-left">Машины дугаар</th>
                          <th className="text-left">Орсон цаг</th>
                          <th className="text-left">Гарсан цаг</th>
                          <th className="text-left">Хугацаа</th>
                          <th className="text-left">Төлбөр</th>
                          <th className="text-left">Ажилтан</th>
                          <th className="text-left">Төлбөрийн төлөв</th>
                          <th className="text-left">Үйлдэл</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecords.map((record) => (
                          <tr key={record.id}>
                            <td className="font-medium">{record.plateNumber}</td>
                            <td>{new Date(record.entryTime).toLocaleString("mn-MN")}</td>
                            <td>{record.exitTime ? new Date(record.exitTime).toLocaleString("mn-MN") : "Гараагүй"}</td>
                            <td>{record.duration ? `${record.duration} цаг` : "-"}</td>
                            <td>{record.cost ? `${record.cost.toLocaleString()}₮` : "-"}</td>
                            <td>{record.employeeName}</td>
                            <td>
                              <Badge
                                className={`enhanced-badge ${
                                  record.paymentStatus === "paid" ? "badge-success" : "badge-warning"
                                }`}
                              >
                                {record.paymentStatus === "paid" ? "Төлсөн" : "Төлөөгүй"}
                                {record.paymentMethod && ` (${record.paymentMethod})`}
                              </Badge>
                            </td>
                            <td>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedRecord(record)
                                  setShowEditRecordDialog(true)
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {filteredRecords.length === 0 && (
                      <div className="text-center py-8 text-gray-500">Шүүлтэд тохирох бүртгэл олдсонгүй</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Employees Tab */}
          {activeTab === "employees" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Ажилчид</h2>
                  <p className="text-gray-600">Ажилчдын жагсаалт</p>
                </div>
                <Button onClick={() => setShowAddEmployeeDialog(true)} className="btn-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Шинэ ажилтан нэмэх
                </Button>
              </div>

              <Card className="enhanced-card">
                <CardContent className="p-6">
                  <div className="enhanced-table">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="text-left">Нэр</th>
                          <th className="text-left">И-мэйл</th>
                          <th className="text-left">Утас</th>
                          <th className="text-left">Үүсгэсэн огноо</th>
                          <th className="text-left">Үйлдэл</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((employee) => (
                          <tr key={employee.id}>
                            <td className="font-medium">{employee.name}</td>
                            <td>{employee.email}</td>
                            <td>{employee.phone}</td>
                            <td>
                              {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString("mn-MN") : "-"}
                            </td>
                            <td>
                              <div className="flex space-x-2">
                                <Button size="sm" variant="outline">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {employees.length === 0 && (
                      <div className="text-center py-8 text-gray-500">Ажилтан байхгүй байна</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Тохиргоо</h2>
                <p className="text-gray-600">Системийн тохиргоо</p>
              </div>

              <Card className="enhanced-card">
                <CardHeader>
                  <CardTitle>Сайтын тохиргоо</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="form-label">Сайтын нэр</Label>
                    <Input
                      value={siteConfig.siteName}
                      onChange={(e) =>
                        setSiteConfig((prev) => ({
                          ...prev,
                          siteName: e.target.value,
                        }))
                      }
                      className="form-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="form-label">Цагийн төлбөр (₮)</Label>
                    <Input
                      type="number"
                      value={siteConfig.hourlyRate}
                      onChange={(e) =>
                        setSiteConfig((prev) => ({
                          ...prev,
                          hourlyRate: Number.parseInt(e.target.value) || 1000,
                        }))
                      }
                      className="form-input"
                    />
                  </div>

                  <Button className="btn-primary">
                    <Save className="w-4 h-4 mr-2" />
                    Хадгалах
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="dialog-content profile-dialog-content">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">Профайл засах</DialogTitle>
            <DialogDescription className="dialog-description">Өөрийн мэдээллийг шинэчлэх</DialogDescription>
          </DialogHeader>

          <div className="profile-dialog-body">
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Үндсэн мэдээлэл</h3>

                <div className="space-y-2">
                  <Label className="form-label">Нэр</Label>
                  <Input
                    value={profileData.name}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="form-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="form-label">Утасны дугаар</Label>
                  <Input
                    value={profileData.phone}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    className="form-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="form-label">И-мэйл хаяг</Label>
                  <Input value={profileData.email} disabled className="form-input bg-gray-100" />
                </div>

                <div className="space-y-2">
                  <Label className="form-label">Профайл зураг</Label>
                  <div className="flex items-center space-x-4">
                    {profileData.profileImage && (
                      <img
                        src={profileData.profileImage || "/placeholder.svg"}
                        alt="Profile"
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    )}
                    <Input type="file" accept="image/*" className="form-input" />
                  </div>
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* Password Change */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Нууц үг өөрчлөх</h3>

                <div className="space-y-2">
                  <Label className="form-label">Одоогийн нууц үг</Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      value={profileData.currentPassword}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }))
                      }
                      className="form-input pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-500" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="form-label">Шинэ нууц үг</Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={profileData.newPassword}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      className="form-input pr-10"
                      placeholder="Шинэ нууц үг"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-500" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="form-label">Шинэ нууц үг давтах</Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={profileData.confirmPassword}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      className="form-input pr-10"
                      placeholder="Шинэ нууц үг давтах"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-500" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="dialog-footer">
            <Button variant="outline" onClick={() => setShowProfileDialog(false)} className="btn-secondary">
              Цуцлах
            </Button>
            <Button onClick={handleProfileUpdate} className="btn-primary">
              Хадгалах
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Employee Dialog */}
      <Dialog open={showAddEmployeeDialog} onOpenChange={setShowAddEmployeeDialog}>
        <DialogContent className="dialog-content">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">Шинэ ажилтан нэмэх</DialogTitle>
            <DialogDescription className="dialog-description">Шинэ ажилтны мэдээлэл оруулна уу</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-6">
            <div className="space-y-2">
              <Label className="form-label">Нэр</Label>
              <Input
                value={newEmployee.name}
                onChange={(e) =>
                  setNewEmployee((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                className="form-input"
                placeholder="Ажилтны нэр"
              />
            </div>

            <div className="space-y-2">
              <Label className="form-label">И-мэйл</Label>
              <Input
                type="email"
                value={newEmployee.email}
                onChange={(e) =>
                  setNewEmployee((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                className="form-input"
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label className="form-label">Утасны дугаар</Label>
              <Input
                value={newEmployee.phone}
                onChange={(e) =>
                  setNewEmployee((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
                className="form-input"
                placeholder="99112233"
              />
            </div>

            <div className="space-y-2">
              <Label className="form-label">Нууц үг</Label>
              <Input
                type="password"
                value={newEmployee.password}
                onChange={(e) =>
                  setNewEmployee((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                className="form-input"
                placeholder="Нууц үг"
              />
            </div>
          </div>

          <DialogFooter className="dialog-footer">
            <Button variant="outline" onClick={() => setShowAddEmployeeDialog(false)} className="btn-secondary">
              Цуцлах
            </Button>
            <Button onClick={handleAddEmployee} className="btn-primary">
              Нэмэх
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Record Dialog */}
      <Dialog open={showEditRecordDialog} onOpenChange={setShowEditRecordDialog}>
        <DialogContent className="dialog-content">
          <DialogHeader className="dialog-header">
            <DialogTitle className="dialog-title">Бүртгэл засах</DialogTitle>
            <DialogDescription className="dialog-description">Төлбөрийн мэдээлэл шинэчлэх</DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4 p-6">
              <div className="space-y-2">
                <Label className="form-label">Машины дугаар</Label>
                <Input value={selectedRecord.plateNumber} disabled className="form-input bg-gray-100" />
              </div>

              <div className="space-y-2">
                <Label className="form-label">Төлбөрийн төлөв</Label>
                <Select
                  value={selectedRecord.paymentStatus}
                  onValueChange={(value) =>
                    setSelectedRecord((prev) =>
                      prev
                        ? {
                            ...prev,
                            paymentStatus: value,
                          }
                        : null,
                    )
                  }
                >
                  <SelectTrigger className="form-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Төлөөгүй</SelectItem>
                    <SelectItem value="paid">Төлсөн</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedRecord.paymentStatus === "paid" && (
                <div className="space-y-2">
                  <Label className="form-label">Төлбөрийн хэлбэр</Label>
                  <Select
                    value={selectedRecord.paymentMethod || ""}
                    onValueChange={(value) =>
                      setSelectedRecord((prev) =>
                        prev
                          ? {
                              ...prev,
                              paymentMethod: value,
                            }
                          : null,
                      )
                    }
                  >
                    <SelectTrigger className="form-select">
                      <SelectValue placeholder="Төлбөрийн хэлбэр сонгох" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Бэлэн мөнгө</SelectItem>
                      <SelectItem value="card">Карт</SelectItem>
                      <SelectItem value="transfer">Шилжүүлэг</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="dialog-footer">
            <Button variant="outline" onClick={() => setShowEditRecordDialog(false)} className="btn-secondary">
              Цуцлах
            </Button>
            <Button onClick={handleRecordEdit} className="btn-primary">
              Хадгалах
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

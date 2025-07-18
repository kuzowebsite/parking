"use client"
import type React from "react"
import { useState, useEffect, useRef } from "react"
import { onAuthStateChanged, signOut, updatePassword, type User as FirebaseUser } from "firebase/auth"
import { ref, push, onValue, set, update } from "firebase/database"
import { auth, database } from "@/lib/firebase"
import type { ParkingRecord, UserProfile } from "@/types"
import { Home, History, User, LogOut, Search, X, Car, Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ParkingSystem() {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSplash, setShowSplash] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const router = useRouter()

  // Home states
  const [carNumber, setCarNumber] = useState("")
  const [parkingArea, setParkingArea] = useState("")
  const [recentRecords, setRecentRecords] = useState<ParkingRecord[]>([])
  const [actionLoading, setActionLoading] = useState(false)

  // Add new state for images after other home states
  const [capturedImages, setCapturedImages] = useState<string[]>([])
  const [showCamera, setShowCamera] = useState(false)

  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Add camera facing state
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("environment")
  // Add zoom state
  const [cameraZoom, setCameraZoom] = useState(1)

  // History states
  const [allRecords, setAllRecords] = useState<ParkingRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<ParkingRecord[]>([])

  // Filter states
  const [filterYear, setFilterYear] = useState("")
  const [filterMonth, setFilterMonth] = useState("")
  const [filterCarNumber, setFilterCarNumber] = useState("")

  // Profile states
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    phone: "",
    email: "",
    role: "driver",
    profileImage: "",
    active: true,
  })
  const [editing, setEditing] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)

  // Employee profile states
  const [employeeProfile, setEmployeeProfile] = useState<any>(null)

  // Password change states for employees
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  // Pricing state
  const [pricingConfig, setPricingConfig] = useState({
    pricePerMinute: 0,
  })

  // Site configuration state
  const [siteConfig, setSiteConfig] = useState({
    siteName: "",
    siteLogo: "",
    siteBackground: "",
  })

  // Tabs-ийн оронд activeTab state нэмэх
  const [activeTab, setActiveTab] = useState("home")

  // Logout confirmation modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // Filter collapse state
  const [filterCollapsed, setFilterCollapsed] = useState(true)

  // Employee states for dropdown
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false)

  // Active parking records states
  const [activeParkingRecords, setActiveParkingRecords] = useState<ParkingRecord[]>([])
  const [filteredActiveParkingRecords, setFilteredActiveParkingRecords] = useState<ParkingRecord[]>([])
  const [activeRecordsSearch, setActiveRecordsSearch] = useState("")

  // Custom exit confirmation modal states
  const [showExitModal, setShowExitModal] = useState(false)
  const [exitingRecord, setExitingRecord] = useState<ParkingRecord | null>(null)
  const [exitDetails, setExitDetails] = useState({
    exitTime: "",
    duration: 0,
    fee: 0,
  })

  // Add state to track if user is manager to prevent showing main interface
  const [isManager, setIsManager] = useState(false)

  // Add duplicate car confirmation modal states
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateCarData, setDuplicateCarData] = useState<{
    carNumber: string
    existingRecord: ParkingRecord | null
  }>({
    carNumber: "",
    existingRecord: null,
  })

  // Image viewer states
  const [showImageViewer, setShowImageViewer] = useState(false)
  const [currentImages, setCurrentImages] = useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    // Splash screen loading animation
    if (showSplash) {
      const interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval)
            setTimeout(() => {
              setShowSplash(false)
            }, 500) // Жаахан хүлээж splash screen хаах
            return 100
          }
          return prev + 2 // 2% -аар нэмэгдэх (50 алхам = 2.5 секунд)
        })
      }, 50) // 50ms тутамд шинэчлэх
      return () => clearInterval(interval)
    }
  }, [showSplash])

  useEffect(() => {
    if (!showSplash) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setUser(user)
          loadProfile() // Эхлээд profile ачаалах, дараа нь records ачаалагдана
        } else {
          // Redirect to login page if not authenticated
          router.push("/login")
        }
      })
      return unsubscribe
    }
  }, [showSplash, router])

  // Filter records based on year, month, car number, and type
  useEffect(() => {
    let filtered = [...allRecords]

    // Filter by year
    if (filterYear) {
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.timestamp)
        return recordDate.getFullYear().toString() === filterYear
      })
    }

    // Filter by month
    if (filterMonth) {
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.timestamp)
        return (recordDate.getMonth() + 1).toString().padStart(2, "0") === filterMonth
      })
    }

    // Filter by car number
    if (filterCarNumber) {
      filtered = filtered.filter((record) => record.carNumber.toLowerCase().includes(filterCarNumber.toLowerCase()))
    }

    // Filter only completed/exit records for history tab
    filtered = filtered.filter(
      (record) =>
        record.type === "completed" || record.type === "exit" || (record.exitTime && record.exitTime.trim() !== ""),
    )

    // If user is employee, filter by employee name
    if (profile.role === "employee" && profile.name) {
      filtered = filtered.filter((record) => {
        // Check if the record's driverName contains the employee's name
        return record.driverName && record.driverName.includes(profile.name)
      })
    }

    setFilteredRecords(filtered)
  }, [allRecords, filterYear, filterMonth, filterCarNumber, profile.role, profile.name])

  // Update the loadRecentRecords function to ensure proper data fetching
  const loadRecentRecords = () => {
    if (!user?.uid) {
      console.log("No authenticated user, skipping recent records load")
      return
    }
    console.log("Loading recent records for user:", user.uid)
    const recordsRef = ref(database, "parking_records")
    onValue(
      recordsRef,
      (snapshot) => {
        const data = snapshot.val()
        if (data) {
          const records: ParkingRecord[] = Object.keys(data)
            .map((key) => ({ id: key, ...data[key] }))
            .filter((record) => {
              // Filter by current user's records (using user ID or driver name)
              if (profile.role === "employee" && profile.name) {
                // For employees, show records where their name is in driverName
                return record.driverName && record.driverName.includes(profile.name)
              }
              return (
                record.driverName === profile.name ||
                (user?.email && record.driverName === user.email.split("@")[0]) ||
                record.driverName === "Систем Админ" // Allow test records
              )
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 3) // Last 3 records
          setRecentRecords(records)
          console.log("Recent records loaded:", records.length, "records")
        } else {
          setRecentRecords([])
          console.log("No records found in database")
        }
      },
      (error) => {
        console.error("Error loading recent records:", error)
        // Don't show alert for permission errors during initial load
        if (error.code !== "PERMISSION_DENIED") {
          console.error("Database error:", error.message)
        }
        setRecentRecords([])
      },
    )
  }

  // loadActiveParkingRecords функцийг бүрэн засварлах
  const loadActiveParkingRecords = () => {
    console.log("Loading active parking records...")
    const recordsRef = ref(database, "parking_records")
    onValue(
      recordsRef,
      (snapshot) => {
        const data = snapshot.val()
        console.log("Raw parking records data:", data)
        if (data) {
          const allRecords = Object.keys(data).map((key) => ({ id: key, ...data[key] }))
          console.log("All records:", allRecords)
          // Илүү энгийн filtering logic ашиглах
          const activeRecords: ParkingRecord[] = allRecords
            .filter((record) => {
              // Зөвхөн entry type бөгөөд exitTime байхгүй бүртгэлүүдийг авах
              const isActive = record.type === "entry" && !record.exitTime && record.type !== "completed"
              // If user is employee, filter by employee name
              if (profile.role === "employee" && profile.name) {
                const isEmployeeRecord = record.driverName && record.driverName.includes(profile.name)
                return isActive && isEmployeeRecord
              }
              console.log(`Record ${record.id}: type=${record.type}, exitTime=${record.exitTime}, isActive=${isActive}`)
              return isActive
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          console.log("Filtered active records:", activeRecords)
          setActiveParkingRecords(activeRecords)
          setFilteredActiveParkingRecords(activeRecords)
        } else {
          console.log("No parking records data found")
          setActiveParkingRecords([])
          setFilteredActiveParkingRecords([])
        }
      },
      (error) => {
        console.error("Error loading active parking records:", error)
        setActiveParkingRecords([])
        setFilteredActiveParkingRecords([])
      },
    )
  }

  // loadAllRecords функцийг засварлах - бүх бүртгэлүүдийг ачаалах
  const loadAllRecords = () => {
    console.log("Loading all records...")
    const recordsRef = ref(database, "parking_records")
    onValue(
      recordsRef,
      (snapshot) => {
        const data = snapshot.val()
        console.log("All records raw data:", data)
        if (data) {
          const records: ParkingRecord[] = Object.keys(data)
            .map((key) => ({ id: key, ...data[key] }))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          console.log("All records processed:", records)
          setAllRecords(records)
        } else {
          console.log("No records found in database")
          setAllRecords([])
        }
      },
      (error) => {
        console.error("Error loading all records:", error)
        setAllRecords([])
      },
    )
  }

  // Load employees from database
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

  // Load employee profile from employees database
  const loadEmployeeProfile = (employeeName: string) => {
    const employeesRef = ref(database, "employees")
    onValue(employeesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const employee = Object.values(data).find((emp: any) => emp.name === employeeName)
        if (employee) {
          setEmployeeProfile(employee)
        }
      }
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

  // Update the loadProfile function to call record loading functions
  const loadProfile = () => {
    const userId = auth.currentUser?.uid
    if (!userId) {
      console.log("No authenticated user for profile load")
      setLoading(false)
      return
    }
    console.log("Loading profile for user:", userId)
    const profileRef = ref(database, `users/${userId}`)
    onValue(
      profileRef,
      (snapshot) => {
        const data = snapshot.val()
        if (data) {
          const userProfile = {
            name: data.name || "",
            phone: data.phone || "",
            email: auth.currentUser?.email || "",
            role: data.role || "driver",
            profileImage: data.profileImage || "",
            active: data.active !== false, // Default to true if not set
          }
          setProfile(userProfile)
          // Check if user is active
          if (userProfile.active === false) {
            alert("Таны эрх хаагдсан байна. Менежертэй холбогдоно уу.")
            signOut(auth)
            return
          }
          // Redirect manager to manager page immediately
          if (userProfile.role === "manager") {
            console.log("Manager detected, redirecting to manager page...")
            setIsManager(true)
            // Use window.location.replace instead of href to avoid showing main interface
            window.location.replace("/manager")
            return
          }
          // Load employee profile if user is employee
          if (userProfile.role === "employee" && userProfile.name) {
            loadEmployeeProfile(userProfile.name)
          }
          console.log("Profile loaded, now loading records...")
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
          // Load records after profile is loaded and we have user context
          setTimeout(() => {
            console.log("Loading all data after profile load...")
            loadRecentRecords()
            loadAllRecords()
            loadActiveParkingRecords()
            loadEmployees() // Load employees for dropdown
          }, 500)
          setLoading(false)
        } else {
          // Create default profile for new users
          const defaultProfile = {
            name: "",
            phone: "",
            email: auth.currentUser?.email || "",
            role: "driver",
            profileImage: "",
            active: true,
          }
          setProfile(defaultProfile)
          // Still try to load records even if profile is empty
          setTimeout(() => {
            console.log("Loading data with empty profile...")
            loadRecentRecords()
            loadAllRecords()
            loadActiveParkingRecords()
            loadEmployees() // Load employees for dropdown
          }, 500)
          setLoading(false)
        }
      },
      (error) => {
        console.error("Error loading profile:", error)
        // Set default profile on error
        setProfile({
          name: "",
          phone: "",
          email: auth.currentUser?.email || "",
          role: "driver",
          profileImage: "",
          active: true,
        })
        setLoading(false)
      },
    )
  }

  // Real-time parking fee calculation функцийг засварлах
  const calculateCurrentParkingFee = (entryTime: string): number => {
    if (!entryTime || pricingConfig.pricePerMinute === 0) {
      return 0
    }
    try {
      const entryDate = parseFlexibleDate(entryTime)
      const currentTime = new Date()
      if (isNaN(entryDate.getTime())) {
        console.error("Invalid entry time after parsing:", entryTime)
        return 0
      }
      const diffInMs = currentTime.getTime() - entryDate.getTime()
      const diffInHours = Math.ceil(diffInMs / (1000 * 60 * 60)) // Calculate in hours and round up
      // Хэрэв 1 цагаас бага бол 1 цаг гэж тооцох
      const hoursToCharge = Math.max(1, diffInHours)
      return hoursToCharge * (pricingConfig.pricePerMinute || 100) // pricePerMinute is now price per hour
    } catch (error) {
      console.error("Error calculating current parking fee:", error)
      return 0
    }
  }

  // Calculate parking duration функцийг засварлах
  const calculateParkingDuration = (entryTime: string, exitTime?: string): number => {
    try {
      const entryDate = parseFlexibleDate(entryTime)
      const endDate = exitTime ? parseFlexibleDate(exitTime) : new Date()
      if (isNaN(entryDate.getTime()) || isNaN(endDate.getTime())) {
        return 0
      }
      const diffInMs = endDate.getTime() - entryDate.getTime()
      const diffInHours = Math.ceil(diffInMs / (1000 * 60 * 60)) // Calculate in hours and round up
      // Хэрэв 1 цагаас бага бол 1 цаг гэж тооцох
      return Math.max(1, diffInHours)
    } catch (error) {
      console.error("Error calculating parking duration:", error)
      return 0
    }
  }

  // Unified date parsing function
  const parseFlexibleDate = (dateStr: string): Date => {
    if (!dateStr) return new Date()
    const cleanStr = dateStr.trim()
    // Format 1: "07/01/2025, 08:42 AM" (US format with AM/PM)
    if (cleanStr.includes("AM") || cleanStr.includes("PM")) {
      return new Date(cleanStr)
    }
    // Format 2: "2025.01.07, 14:30" (Mongolian format)
    if (cleanStr.includes(".")) {
      const parts = cleanStr.replace(/[^\d\s:.,]/g, "").split(/[,\s]+/)
      if (parts.length >= 2) {
        const datePart = parts[0] // "2025.01.07"
        const timePart = parts[1] // "14:30"
        const [year, month, day] = datePart.split(".").map(Number)
        const [hour, minute] = timePart.split(":").map(Number)
        return new Date(year, month - 1, day, hour, minute)
      }
    }
    // Format 3: ISO string or other standard formats
    const standardDate = new Date(cleanStr)
    if (!isNaN(standardDate.getTime())) {
      return new Date(cleanStr)
    }
    // Format 4: Try to parse as locale string
    try {
      return new Date(Date.parse(cleanStr))
    } catch {
      console.error("Unable to parse date:", cleanStr)
      return new Date()
    }
  }

  // Format detailed time display
  const formatDetailedTime = (timeString: string): string => {
    try {
      const date = parseFlexibleDate(timeString)
      if (isNaN(date.getTime())) {
        return timeString // Return original if parsing fails
      }
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const day = date.getDate()
      const hour = date.getHours()
      const minute = date.getMinutes()
      return `${year}/${month.toString().padStart(2, "0")}/${day.toString().padStart(2, "0")}, ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
    } catch (error) {
      console.error("Error formatting time:", error)
      return timeString // Return original string on error
    }
  }

  // Check if car number is already registered today
  const checkCarRegisteredToday = (carNumber: string): ParkingRecord | null => {
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

    // Check in all records for today's entries
    const todayRecord = allRecords.find((record) => {
      if (record.carNumber.toUpperCase() !== carNumber.toUpperCase()) {
        return false
      }

      const recordDate = new Date(record.timestamp)
      return recordDate >= todayStart && recordDate <= todayEnd && record.type === "entry"
    })

    return todayRecord || null
  }

  // Updated camera functionality functions
  const startCamera = async (facingMode: "user" | "environment" = cameraFacing) => {
    try {
      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      streamRef.current = stream
      setCameraFacing(facingMode)
      setShowCamera(true)
      // Wait for the modal to render before setting video source
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      }, 100)
    } catch (error) {
      console.error("Camera access error:", error)
      alert("Камер ашиглахад алдаа гарлаа. Камерын эрхийг олгоно уу.")
    }
  }

  const switchCamera = async () => {
    const newFacing = cameraFacing === "environment" ? "user" : "environment"
    await startCamera(newFacing)
  }

  const zoomIn = () => {
    setCameraZoom((prev) => Math.min(prev + 0.2, 3)) // Max zoom 3x
  }

  const zoomOut = () => {
    setCameraZoom((prev) => Math.max(prev - 0.2, 1)) // Min zoom 1x
  }

  const resetZoom = () => {
    setCameraZoom(1)
  }

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    // Draw the current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    // Convert canvas to base64 image
    const imageData = canvas.toDataURL("image/jpeg", 0.8)
    // Add image if less than 2 images
    if (capturedImages.length < 2) {
      setCapturedImages((prev) => [...prev, imageData])
    }
    // Close camera after capture
    stopCamera()
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraZoom(1) // Reset zoom when stopping camera
    setShowCamera(false)
  }

  const removeImage = (index: number) => {
    setCapturedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleImageUploadFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && capturedImages.length < 2) {
      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert("Зургийн хэмжээ 5MB-аас бага байх ёстой")
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64String = event.target?.result as string
        setCapturedImages((prev) => [...prev, base64String])
      }
      reader.readAsDataURL(file)
    }
  }

  // Function to actually create the parking record
  const createParkingRecord = async () => {
    setActionLoading(true)
    const currentTime = new Date()
    const record: Omit<ParkingRecord, "id"> = {
      carNumber: carNumber.trim().toUpperCase(),
      driverName: selectedEmployees.join(", "),
      parkingArea: parkingArea.trim().toUpperCase(),
      entryTime: currentTime.toLocaleString("mn-MN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      amount: 0,
      type: "entry",
      timestamp: currentTime.toISOString(),
      images: capturedImages, // Add images to the record
    }

    try {
      await push(ref(database, "parking_records"), record)
      alert("Орсон бүртгэл амжилттай хийгдлээ")
      // Refresh records after adding new entry
      setTimeout(() => {
        loadRecentRecords()
        loadAllRecords()
        loadActiveParkingRecords()
      }, 500)
      // Clear form after successful entry
      setCarNumber("")
      setParkingArea("")
      setSelectedEmployees([])
      setCapturedImages([]) // Clear captured images
    } catch (error) {
      console.error("Entry record error:", error)
      alert("Бүртгэл хийхэд алдаа гарлаа")
    }
    setActionLoading(false)
  }

  // Update handleEntry function to check for duplicates
  const handleEntry = async () => {
    if (!carNumber.trim()) {
      alert("Машины дугаарыг оруулна уу")
      return
    }
    if (!parkingArea.trim()) {
      alert("Машины маркийг оруулна уу")
      return
    }
    if (selectedEmployees.length === 0) {
      alert("Ажилчин сонгоно уу")
      return
    }

    // Check if car is already registered today
    const existingRecord = checkCarRegisteredToday(carNumber.trim())
    if (existingRecord) {
      // Show duplicate confirmation modal
      setDuplicateCarData({
        carNumber: carNumber.trim().toUpperCase(),
        existingRecord: existingRecord,
      })
      setShowDuplicateModal(true)
      return
    }

    // If no duplicate, proceed with registration
    await createParkingRecord()
  }

  // Handle duplicate confirmation
  const handleDuplicateConfirm = async () => {
    setShowDuplicateModal(false)
    setDuplicateCarData({ carNumber: "", existingRecord: null })
    // Proceed with registration
    await createParkingRecord()
  }

  // Handle duplicate cancellation
  const handleDuplicateCancel = () => {
    setShowDuplicateModal(false)
    setDuplicateCarData({ carNumber: "", existingRecord: null })
    // Don't clear the form, just close the modal
  }

  // Function to calculate parking fee
  const calculateParkingFee = (entryTime: string, exitTime: string): number => {
    const duration = calculateParkingDuration(entryTime, exitTime)
    return duration * (pricingConfig.pricePerMinute || 100) // pricePerMinute is now price per hour
  }

  // Handle exit from records tab - show custom confirmation
  const handleExitFromRecord = (recordId: string, record: ParkingRecord) => {
    const currentTime = new Date()
    const exitTimeFormatted = currentTime.toLocaleString("mn-MN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
    // Calculate parking duration and fee
    const calculatedFee = calculateParkingFee(record.entryTime || "", exitTimeFormatted)
    const parkingDuration = calculateParkingDuration(record.entryTime || "", exitTimeFormatted)
    // Set exit details and show modal
    setExitingRecord({ ...record, id: recordId })
    setExitDetails({
      exitTime: exitTimeFormatted,
      duration: parkingDuration,
      fee: calculatedFee,
    })
    setShowExitModal(true)
  }

  // Confirm exit action
  const confirmExit = async () => {
    if (!exitingRecord) return
    try {
      const currentTime = new Date()
      // Update existing entry record with exit information, duration, and fee
      await update(ref(database, `parking_records/${exitingRecord.id}`), {
        exitTime: exitDetails.exitTime,
        amount: exitDetails.fee,
        parkingDuration: exitDetails.duration,
        type: "completed",
        updatedAt: currentTime.toISOString(),
      })
      // Close modal and reset states
      setShowExitModal(false)
      setExitingRecord(null)
      setExitDetails({ exitTime: "", duration: 0, fee: 0 })
      // Refresh records after updating
      setTimeout(() => {
        loadRecentRecords()
        loadAllRecords()
        loadActiveParkingRecords()
      }, 500)
    } catch (error) {
      console.error("Exit record error:", error)
      alert("Гарсан бүртгэл хийхэд алдаа гарлаа")
    }
  }

  // Cancel exit action
  const cancelExit = () => {
    setShowExitModal(false)
    setExitingRecord(null)
    setExitDetails({ exitTime: "", duration: 0, fee: 0 })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Зургийн хэмжээ шалгах (5MB хүртэл)
      if (file.size > 5 * 1024 * 1024) {
        alert("Зургийн хэмжээ 5MB-аас бага байх ёстой")
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64String = event.target?.result as string
        setProfile({ ...profile, profileImage: base64String })
      }
      reader.readAsDataURL(file)
    }
  }

  // Save profile function for employees
  const saveEmployeeProfile = async () => {
    const userId = auth.currentUser?.uid
    if (!userId || !profile.name.trim()) {
      alert("Нэрээ оруулна уу")
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
      // Update user profile in users database
      await update(ref(database, `users/${userId}`), {
        name: profile.name.trim(),
        phone: profile.phone.trim(),
        email: profile.email.trim(),
        profileImage: profile.profileImage || "",
        updatedAt: new Date().toISOString(),
      })
      // Update employee profile in employees database if exists
      if (employeeProfile && employeeProfile.id) {
        await update(ref(database, `employees/${employeeProfile.id}`), {
          name: profile.name.trim(),
          phone: profile.phone.trim(),
          updatedAt: new Date().toISOString(),
        })
      }
      // Update password if provided
      if (passwordData.newPassword && auth.currentUser) {
        try {
          await updatePassword(auth.currentUser, passwordData.newPassword)
          alert("Профайл болон нууц үг амжилттай шинэчлэгдлээ")
        } catch (error: any) {
          if (error.code === "auth/requires-recent-login") {
            alert("Профайл шинэчлэгдлээ. Нууц үг солихын тулд дахин нэвтэрнэ үү.")
          } else {
            alert("Профайл шинэчлэгдлээ. Нууц үг солихад алдаа гарлаа.")
          }
        }
      } else {
        alert("Профайл амжилттай шинэчлэгдлээ")
      }
      setEditing(false)
      // Reset password fields
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error) {
      console.error("Error updating employee profile:", error)
      alert("Профайл шинэчлэхэд алдаа гарлаа")
    }
    setProfileLoading(false)
  }

  const saveProfile = async () => {
    if (profile.role === "employee") {
      await saveEmployeeProfile()
      return
    }
    const userId = auth.currentUser?.uid
    if (!userId || !profile.name.trim()) {
      alert("Нэрээ оруулна уу")
      return
    }
    setProfileLoading(true)
    try {
      await set(ref(database, `users/${userId}`), {
        name: profile.name.trim(),
        phone: profile.phone.trim(),
        email: auth.currentUser?.email,
        role: profile.role || "driver",
        profileImage: profile.profileImage || "",
        active: profile.active !== false,
        updatedAt: new Date().toISOString(),
      })
      setEditing(false)
      alert("Профайл шинэчлэгдлээ")
    } catch (error) {
      alert("Профайл шинэчлэхэд алдаа гарлаа")
    }
    setProfileLoading(false)
  }

  const handleLogoutClick = () => {
    setShowLogoutModal(true)
  }

  const confirmLogout = async () => {
    setShowLogoutModal(false)
    await signOut(auth)
  }

  const cancelLogout = () => {
    setShowLogoutModal(false)
  }

  // Get unique years from records for dropdown
  const getAvailableYears = () => {
    const years = allRecords.map((record) => new Date(record.timestamp).getFullYear())
    return [...new Set(years)].sort((a, b) => b - a)
  }

  // Add useEffect to load records when user changes
  useEffect(() => {
    if (user && !showSplash && user.uid && profile.name && !isManager) {
      console.log("User authenticated, loading data...")
      // Add a delay to ensure Firebase auth is fully initialized
      const timeoutId = setTimeout(() => {
        console.log("Loading data from useEffect...")
        loadRecentRecords()
        loadAllRecords()
        loadActiveParkingRecords()
      }, 1000)
      return () => clearTimeout(timeoutId)
    } else {
      console.log("User not ready:", { user: !!user, showSplash, uid: user?.uid, profileName: profile.name, isManager })
    }
  }, [user, profile.name, showSplash, isManager])

  // Close employee dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest(".employee-dropdown-container")) {
        setShowEmployeeDropdown(false)
      }
    }
    if (showEmployeeDropdown) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showEmployeeDropdown])

  // Filter active parking records based on search
  useEffect(() => {
    let filtered = [...activeParkingRecords]
    if (activeRecordsSearch) {
      filtered = filtered.filter((record) => record.carNumber.toLowerCase().includes(activeRecordsSearch.toLowerCase()))
    }
    setFilteredActiveParkingRecords(filtered)
  }, [activeParkingRecords, activeRecordsSearch])

  // Cleanup camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

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

  // Splash Screen
  if (showSplash) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-32 right-16 w-24 h-24 bg-cyan-400 rounded-full blur-2xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-emerald-400 rounded-full blur-xl animate-pulse delay-500"></div>
        </div>
        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center space-y-8">
          {/* Logo */}
          <div className="relative">
            <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
              <img src="/images/logo.png" alt="Logo" className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24" />
            </div>
            {/* Glow effect */}
            <div className="absolute inset-0 w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 bg-blue-400 rounded-2xl md:rounded-3xl blur-xl opacity-30 animate-pulse"></div>
          </div>
          {/* App Name */}
          <div className="text-center space-y-2 md:space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
              <span className="text-cyan-400">PARKY</span>
              <span className="text-white">SPOT</span>
            </h1>
          </div>
          {/* Loading Progress */}
          <div className="w-64 md:w-80 lg:w-96 space-y-4">
            {/* Progress Bar */}
            <div className="relative">
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-100 ease-out relative"
                  style={{ width: `${loadingProgress}%` }}
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              </div>
              {/* Glow effect for progress bar */}
              <div
                className="absolute top-0 h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-sm opacity-50 transition-all duration-100"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            {/* Progress Text */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-blue-200">Ачааллаж байна...</span>
              <span className="text-white font-mono font-bold">{loadingProgress}%</span>
            </div>
          </div>
          {/* Loading Dots */}
          <div className="flex space-x-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></div>
          </div>
        </div>
        {/* Bottom decoration */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center space-x-2 text-blue-300 text-xs">
            <div className="w-1 h-1 bg-blue-300 rounded-full animate-ping"></div>
            <span>Түр хүлээн үү...</span>
          </div>
        </div>
      </div>
    )
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

  // Don't render main interface if user is manager (they will be redirected)
  if (isManager) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Менежерийн хуудас руу шилжиж байна...</p>
        </div>
      </div>
    )
  }

  // If no user, the useEffect will redirect to login page
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Нэвтрэх хуудас руу шилжиж байна...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/background.webp')",
        }}
      >
        <div className="absolute inset-0 bg-black/70"></div>
      </div>

      {/* Header - Fixed at top, doesn't move when scrolling */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-sm bg-white/5">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 flex items-center justify-between">
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center">
              {siteConfig.siteLogo ? (
                <img
                  src={siteConfig.siteLogo || "/placeholder.svg"}
                  alt="Logo"
                  className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 object-contain"
                />
              ) : (
                <img src="/images/logo.png" alt="Logo" className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10" />
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4 md:space-x-6">
            {/* Manager холбоос - зөвхөн manager-д харагдах */}
            {profile.role === "manager" && (
              <button
                onClick={() => (window.location.href = "/manager")}
                className="px-4 py-2 md:px-6 md:py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white text-sm md:text-base hover:bg-white/20 transition-colors"
              >
                Менежер
              </button>
            )}
            {/* Greeting text */}
            <span className="text-white/70 text-sm md:text-base">Сайн байна уу!</span>
            {/* User name */}
            <span className="text-white text-sm md:text-base font-medium">
              {profile.name || user.email?.split("@")[0]}
            </span>
            {/* Profile image */}
            <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center overflow-hidden">
              {profile.profileImage ? (
                <img
                  src={profile.profileImage || "/placeholder.svg"}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-sm md:text-base font-medium">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area with Sidebar Layout */}
      <div className="lg:flex pt-16 md:pt-20 lg:pt-24">
        {/* Left Sidebar - Desktop Only */}
        <div className="hidden lg:block fixed left-0 top-16 md:top-20 lg:top-24 w-20 xl:w-24 h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] lg:h-[calc(100vh-6rem)] z-40">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-r-3xl shadow-lg h-full flex flex-col justify-center">
            <div className="flex flex-col justify-center space-y-8 items-center py-8">
              <button
                onClick={() => setActiveTab("home")}
                className={`flex flex-col items-center p-4 rounded-2xl transition-colors ${
                  activeTab === "home" ? "bg-emerald-400" : ""
                }`}
              >
                <Home className={`w-8 h-8 ${activeTab === "home" ? "text-black" : "text-white/70"}`} />
                <span className={`text-xs xl:text-sm mt-2 ${activeTab === "home" ? "text-black" : "text-white/70"}`}>
                  Нүүр
                </span>
              </button>
              {/* Hide records tab for employees */}
              {profile.role !== "employee" && (
                <button
                  onClick={() => setActiveTab("records")}
                  className={`flex flex-col items-center p-4 rounded-2xl transition-colors ${
                    activeTab === "records" ? "bg-emerald-400" : ""
                  }`}
                >
                  <Car className={`w-8 h-8 ${activeTab === "records" ? "text-black" : "text-white/70"}`} />
                  <span
                    className={`text-xs xl:text-sm mt-2 ${activeTab === "records" ? "text-black" : "text-white/70"}`}
                  >
                    Бүртгэл
                  </span>
                </button>
              )}
              <button
                onClick={() => setActiveTab("history")}
                className={`flex flex-col items-center p-4 rounded-2xl transition-colors ${
                  activeTab === "history" ? "bg-emerald-400" : ""
                }`}
              >
                <History className={`w-8 h-8 ${activeTab === "history" ? "text-black" : "text-white/70"}`} />
                <span className={`text-xs xl:text-sm mt-2 ${activeTab === "history" ? "text-black" : "text-white/70"}`}>
                  Түүх
                </span>
              </button>
              <button
                onClick={() => setActiveTab("profile")}
                className={`flex flex-col items-center p-4 rounded-2xl transition-colors ${
                  activeTab === "profile" ? "bg-emerald-400" : ""
                }`}
              >
                <User className={`w-8 h-8 ${activeTab === "profile" ? "text-black" : "text-white/70"}`} />
                <span className={`text-xs xl:text-sm mt-2 ${activeTab === "profile" ? "text-black" : "text-white/70"}`}>
                  Профайл
                </span>
              </button>
              <button
                onClick={handleLogoutClick}
                className="flex flex-col items-center p-4 rounded-2xl transition-colors hover:bg-red-500/20"
              >
                <LogOut className="w-8 h-8 text-white/70 hover:text-red-400" />
                <span className="text-xs xl:text-sm mt-2 text-white/70">Гарах</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="relative z-10 container mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 lg:py-10 pb-20 md:pb-24 lg:pb-10 lg:ml-20 xl:ml-24">
          {activeTab === "home" && (
            <div className="space-y-6 md:space-y-8 lg:space-y-10 max-w-4xl mx-auto">
              {/* Show entry form only for non-employee users */}
              {profile.role !== "employee" && (
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-10">
                  <div className="mb-6 md:mb-8">
                    <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-white mb-2">Машины бүртгэл</h2>
                    <p className="text-white/70 text-sm md:text-base">Машины орсон бүртгэл хийх</p>
                  </div>
                  <div className="space-y-4 md:space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-2">
                        <label className="text-white/70 text-sm md:text-base">Машины дугаар</label>
                        <input
                          value={carNumber}
                          onChange={(e) => setCarNumber(e.target.value.toUpperCase())}
                          placeholder="1234 УНМ"
                          className="w-full px-4 py-3 md:px-6 md:py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl md:rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 text-sm md:text-base"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-white/70 text-sm md:text-base">Машины марк</label>
                        <input
                          value={parkingArea}
                          onChange={(e) => setParkingArea(e.target.value.toUpperCase())}
                          placeholder="Жишээ: Приус, Камри, Соната"
                          className="w-full px-4 py-3 md:px-6 md:py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl md:rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 text-sm md:text-base"
                        />
                      </div>
                    </div>
                    <div className="employee-dropdown-container">
                      <div className="space-y-2">
                        <label className="text-white/70 text-sm md:text-base">Ажилчин</label>
                        <div className="relative">
                          <div
                            onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                            className="w-full px-4 py-3 md:px-6 md:py-4 bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl md:rounded-2xl text-white cursor-pointer flex items-center justify-between text-sm md:text-base min-h-[48px] md:min-h-[56px]"
                          >
                            <span className={selectedEmployees.length > 0 ? "text-white" : "text-white/50"}>
                              {selectedEmployees.length > 0 ? selectedEmployees.join(", ") : "Ажилчин сонгоно уу"}
                            </span>
                            <svg
                              className={`w-5 h-5 transition-transform ${showEmployeeDropdown ? "rotate-0" : "rotate-180"}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          {showEmployeeDropdown && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl md:rounded-2xl max-h-48 overflow-y-auto z-50 shadow-2xl">
                              {employees.length === 0 ? (
                                <div className="p-4 text-white/70 text-center text-sm">Ажилчин бүртгэлгүй байна</div>
                              ) : (
                                <div className="p-2 max-h-44 overflow-y-auto">
                                  {employees.map((employee) => (
                                    <div
                                      key={employee.id}
                                      onClick={() => {
                                        const isSelected = selectedEmployees.includes(employee.name)
                                        if (isSelected) {
                                          setSelectedEmployees(
                                            selectedEmployees.filter((name) => name !== employee.name),
                                          )
                                        } else {
                                          setSelectedEmployees([...selectedEmployees, employee.name])
                                        }
                                      }}
                                      className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                                        selectedEmployees.includes(employee.name)
                                          ? "bg-emerald-500/30 text-emerald-300 border border-emerald-400/40"
                                          : "hover:bg-gray-800/80 text-white border border-transparent"
                                      }`}
                                    >
                                      <div
                                        className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                                          selectedEmployees.includes(employee.name)
                                            ? "border-emerald-400 bg-emerald-400"
                                            : "border-gray-400"
                                        }`}
                                      >
                                        {selectedEmployees.includes(employee.name) && (
                                          <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                                            <path
                                              fillRule="evenodd"
                                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                              clipRule="evenodd"
                                            />
                                          </svg>
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">{employee.name}</div>
                                        {employee.phone && (
                                          <div className="text-xs text-gray-400">{employee.phone}</div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Image capture section */}
                    <div className="space-y-4">
                      <label className="text-white/70 text-sm md:text-base">Зураг авах (Заавал биш)</label>
                      <div className="flex flex-wrap gap-3">
                        {/* Camera button */}
                        {capturedImages.length < 2 && (
                          <button
                            onClick={() => startCamera()}
                            className="flex items-center space-x-2 px-4 py-3 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-300 hover:bg-blue-500/30 transition-colors text-sm"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            <span>Камер</span>
                          </button>
                        )}
                        {/* File upload button */}
                        {capturedImages.length < 2 && (
                          <label className="flex items-center space-x-2 px-4 py-3 bg-green-500/20 border border-green-400/30 rounded-xl text-green-300 hover:bg-green-500/30 transition-colors cursor-pointer text-sm">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                            <span>Файл</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUploadFromFile}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                      {/* Display captured images */}
                      {capturedImages.length > 0 && (
                        <div className="flex flex-wrap gap-3">
                          {capturedImages.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={image || "/placeholder.svg"}
                                alt={`Captured ${index + 1}`}
                                className="w-20 h-20 object-cover rounded-lg border border-white/20 cursor-pointer"
                                onClick={() => openImageViewer(capturedImages, index)}
                              />
                              <button
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleEntry}
                      disabled={actionLoading}
                      className="w-full px-6 py-4 md:px-8 md:py-5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white rounded-xl md:rounded-2xl font-medium transition-colors text-sm md:text-base"
                    >
                      {actionLoading ? "Бүртгэж байна..." : "Орсон бүртгэл"}
                    </button>
                  </div>
                </div>
              )}
              {/* Recent Records */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-10">
                <div className="mb-6 md:mb-8">
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-white mb-2">Сүүлийн бүртгэлүүд</h2>
                  <p className="text-white/70 text-sm md:text-base">Таны сүүлийн 3 бүртгэл</p>
                </div>
                <div className="space-y-4 md:space-y-6">
                  {recentRecords.length === 0 ? (
                    <div className="text-center py-8 md:py-12">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Car className="w-8 h-8 md:w-10 md:h-10 text-white/50" />
                      </div>
                      <p className="text-white/70 text-sm md:text-base">Бүртгэл байхгүй байна</p>
                    </div>
                  ) : (
                    recentRecords.map((record) => (
                      <div
                        key={record.id}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0">
                          <div className="space-y-1 md:space-y-2">
                            <div className="flex items-center space-x-3">
                              <span className="text-white font-medium text-sm md:text-base">{record.carNumber}</span>
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  record.type === "entry"
                                    ? "bg-blue-500/20 text-blue-300"
                                    : record.type === "completed"
                                      ? "bg-green-500/20 text-green-300"
                                      : "bg-gray-500/20 text-gray-300"
                                }`}
                              >
                                {record.type === "entry" ? "Орсон" : record.type === "completed" ? "Дууссан" : "Гарсан"}
                              </span>
                            </div>
                            <div className="text-white/70 text-xs md:text-sm">
                              <div>Орсон: {formatDetailedTime(record.entryTime || "")}</div>
                              {record.exitTime && <div>Гарсан: {formatDetailedTime(record.exitTime)}</div>}
                              {record.driverName && <div>Жолооч: {record.driverName}</div>}
                              {record.parkingArea && <div>Марк: {record.parkingArea}</div>}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            {record.type === "entry" && (
                              <div className="text-right">
                                <div className="text-white/70 text-xs">Одоогийн төлбөр</div>
                                <div className="text-emerald-400 font-medium text-sm md:text-base">
                                  {calculateCurrentParkingFee(record.entryTime || "").toLocaleString()}₮
                                </div>
                              </div>
                            )}
                            {record.amount !== undefined && record.amount > 0 && (
                              <div className="text-right">
                                <div className="text-white/70 text-xs">Төлбөр</div>
                                <div className="text-emerald-400 font-medium text-sm md:text-base">
                                  {record.amount.toLocaleString()}₮
                                </div>
                              </div>
                            )}
                            {/* Show images if available */}
                            {record.images && record.images.length > 0 && (
                              <button
                                onClick={() => openImageViewer(record.images || [], 0)}
                                className="flex items-center space-x-1 px-3 py-2 bg-blue-500/20 border border-blue-400/30 rounded-lg text-blue-300 hover:bg-blue-500/30 transition-colors text-xs"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                <span>{record.images.length}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "records" && profile.role !== "employee" && (
            <div className="space-y-6 md:space-y-8 lg:space-y-10 max-w-6xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-10">
                <div className="mb-6 md:mb-8">
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-white mb-2">Идэвхтэй бүртгэлүүд</h2>
                  <p className="text-white/70 text-sm md:text-base">Одоо зогсож байгаа машинууд</p>
                </div>
                {/* Search bar for active records */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                    <input
                      value={activeRecordsSearch}
                      onChange={(e) => setActiveRecordsSearch(e.target.value)}
                      placeholder="Машины дугаараар хайх..."
                      className="w-full pl-12 pr-4 py-3 md:py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl md:rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 text-sm md:text-base"
                    />
                  </div>
                </div>
                <div className="space-y-4 md:space-y-6">
                  {filteredActiveParkingRecords.length === 0 ? (
                    <div className="text-center py-8 md:py-12">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Car className="w-8 h-8 md:w-10 md:h-10 text-white/50" />
                      </div>
                      <p className="text-white/70 text-sm md:text-base">
                        {activeRecordsSearch ? "Хайлтын үр дүн олдсонгүй" : "Идэвхтэй бүртгэл байхгүй байна"}
                      </p>
                    </div>
                  ) : (
                    filteredActiveParkingRecords.map((record) => (
                      <div
                        key={record.id}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-3">
                              <span className="text-white font-medium text-base md:text-lg">{record.carNumber}</span>
                              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs">
                                Идэвхтэй
                              </span>
                            </div>
                            <div className="text-white/70 text-sm space-y-1">
                              <div>Орсон: {formatDetailedTime(record.entryTime || "")}</div>
                              {record.driverName && <div>Жолооч: {record.driverName}</div>}
                              {record.parkingArea && <div>Марк: {record.parkingArea}</div>}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                            <div className="text-left sm:text-right">
                              <div className="text-white/70 text-xs">Одоогийн төлбөр</div>
                              <div className="text-emerald-400 font-medium text-lg">
                                {calculateCurrentParkingFee(record.entryTime || "").toLocaleString()}₮
                              </div>
                              <div className="text-white/50 text-xs">
                                {calculateParkingDuration(record.entryTime || "")} цаг
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              {/* Show images if available */}
                              {record.images && record.images.length > 0 && (
                                <button
                                  onClick={() => openImageViewer(record.images || [], 0)}
                                  className="flex items-center space-x-1 px-3 py-2 bg-blue-500/20 border border-blue-400/30 rounded-lg text-blue-300 hover:bg-blue-500/30 transition-colors text-xs"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z"
                                    />
                                  </svg>
                                  <span>{record.images.length}</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleExitFromRecord(record.id || "", record)}
                                className="px-4 py-2 bg-red-500/20 border border-red-400/30 rounded-lg text-red-300 hover:bg-red-500/30 transition-colors text-sm"
                              >
                                Гарах
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-6 md:space-y-8 lg:space-y-10 max-w-6xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-10">
                <div className="mb-6 md:mb-8">
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-white mb-2">Түүх</h2>
                  <p className="text-white/70 text-sm md:text-base">Бүх дууссан бүртгэлүүд</p>
                </div>
                {/* Filters */}
                <div className="mb-6">
                  <button
                    onClick={() => setFilterCollapsed(!filterCollapsed)}
                    className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white hover:bg-white/20 transition-colors text-sm md:text-base"
                  >
                    <span>Шүүлтүүр</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${filterCollapsed ? "rotate-0" : "rotate-180"}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {!filterCollapsed && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-white/70 text-sm">Жил</label>
                        <select
                          value={filterYear}
                          onChange={(e) => setFilterYear(e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:border-emerald-400 text-sm"
                        >
                          <option value="" className="bg-gray-800">
                            Бүх жил
                          </option>
                          {getAvailableYears().map((year) => (
                            <option key={year} value={year.toString()} className="bg-gray-800">
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-white/70 text-sm">Сар</label>
                        <select
                          value={filterMonth}
                          onChange={(e) => setFilterMonth(e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:border-emerald-400 text-sm"
                        >
                          <option value="" className="bg-gray-800">
                            Бүх сар
                          </option>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                            <option key={month} value={month.toString().padStart(2, "0")} className="bg-gray-800">
                              {month}-р сар
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-white/70 text-sm">Машины дугаар</label>
                        <input
                          value={filterCarNumber}
                          onChange={(e) => setFilterCarNumber(e.target.value)}
                          placeholder="Хайх..."
                          className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-emerald-400 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-4 md:space-y-6">
                  {filteredRecords.length === 0 ? (
                    <div className="text-center py-8 md:py-12">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <History className="w-8 h-8 md:w-10 md:h-10 text-white/50" />
                      </div>
                      <p className="text-white/70 text-sm md:text-base">Түүх байхгүй байна</p>
                    </div>
                  ) : (
                    filteredRecords.map((record) => (
                      <div
                        key={record.id}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-3">
                              <span className="text-white font-medium text-base md:text-lg">{record.carNumber}</span>
                              <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs">
                                Дууссан
                              </span>
                            </div>
                            <div className="text-white/70 text-sm space-y-1">
                              <div>Орсон: {formatDetailedTime(record.entryTime || "")}</div>
                              {record.exitTime && <div>Гарсан: {formatDetailedTime(record.exitTime)}</div>}
                              {record.driverName && <div>Жолооч: {record.driverName}</div>}
                              {record.parkingArea && <div>Марк: {record.parkingArea}</div>}
                              {record.parkingDuration && <div>Хугацаа: {record.parkingDuration} цаг</div>}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                            {record.amount !== undefined && record.amount > 0 && (
                              <div className="text-left sm:text-right">
                                <div className="text-white/70 text-xs">Төлсөн төлбөр</div>
                                <div className="text-emerald-400 font-medium text-lg">
                                  {record.amount.toLocaleString()}₮
                                </div>
                              </div>
                            )}
                            {/* Show images if available */}
                            {record.images && record.images.length > 0 && (
                              <button
                                onClick={() => openImageViewer(record.images || [], 0)}
                                className="flex items-center space-x-1 px-3 py-2 bg-blue-500/20 border border-blue-400/30 rounded-lg text-blue-300 hover:bg-blue-500/30 transition-colors text-xs"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z"
                                  />
                                </svg>
                                <span>{record.images.length}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="space-y-6 md:space-y-8 lg:space-y-10 max-w-2xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-10">
                <div className="mb-6 md:mb-8">
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-white mb-2">Профайл</h2>
                  <p className="text-white/70 text-sm md:text-base">Хувийн мэдээлэл засах</p>
                </div>
                <div className="space-y-6 md:space-y-8">
                  {/* Profile Image */}
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center overflow-hidden">
                      {profile.profileImage ? (
                        <img
                          src={profile.profileImage || "/placeholder.svg"}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white text-2xl md:text-3xl font-medium">
                          {profile.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {editing && (
                      <label className="px-4 py-2 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-300 hover:bg-blue-500/30 transition-colors cursor-pointer text-sm">
                        Зураг солих
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                  {/* Profile Form */}
                  <div className="space-y-4 md:space-y-6">
                    <div className="space-y-2">
                      <label className="text-white/70 text-sm md:text-base">Нэр</label>
                      <input
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        disabled={!editing}
                        className="w-full px-4 py-3 md:px-6 md:py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl md:rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 disabled:opacity-50 text-sm md:text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-white/70 text-sm md:text-base">Утас</label>
                      <input
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        disabled={!editing}
                        className="w-full px-4 py-3 md:px-6 md:py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl md:rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 disabled:opacity-50 text-sm md:text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-white/70 text-sm md:text-base">И-мэйл</label>
                      <input
                        value={profile.email}
                        disabled
                        className="w-full px-4 py-3 md:px-6 md:py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl md:rounded-2xl text-white/50 disabled:opacity-50 text-sm md:text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-white/70 text-sm md:text-base">Эрх</label>
                      <input
                        value={
                          profile.role === "manager" ? "Менежер" : profile.role === "employee" ? "Ажилчин" : "Жолооч"
                        }
                        disabled
                        className="w-full px-4 py-3 md:px-6 md:py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl md:rounded-2xl text-white/50 disabled:opacity-50 text-sm md:text-base"
                      />
                    </div>
                    {/* Password change section for employees */}
                    {editing && profile.role === "employee" && (
                      <div className="space-y-4 border-t border-white/20 pt-6">
                        <h3 className="text-white font-medium text-lg">Нууц үг солих</h3>
                        <div className="space-y-2">
                          <label className="text-white/70 text-sm">Шинэ нууц үг</label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? "text" : "password"}
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                              placeholder="Шинэ нууц үг (заавал биш)"
                              className="w-full px-4 py-3 pr-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
                            >
                              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                        {passwordData.newPassword && (
                          <div className="space-y-2">
                            <label className="text-white/70 text-sm">Нууц үг давтах</label>
                            <div className="relative">
                              <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                placeholder="Нууц үг давтах"
                                className="w-full px-4 py-3 pr-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
                              >
                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
                      {editing ? (
                        <>
                          <button
                            onClick={saveProfile}
                            disabled={profileLoading}
                            className="flex-1 px-6 py-3 md:py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white rounded-xl md:rounded-2xl font-medium transition-colors text-sm md:text-base"
                          >
                            {profileLoading ? "Хадгалж байна..." : "Хадгалах"}
                          </button>
                          <button
                            onClick={() => {
                              setEditing(false)
                              setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
                            }}
                            className="flex-1 px-6 py-3 md:py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl md:rounded-2xl font-medium transition-colors text-sm md:text-base"
                          >
                            Цуцлах
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setEditing(true)}
                          className="w-full px-6 py-3 md:py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl md:rounded-2xl font-medium transition-colors text-sm md:text-base"
                        >
                          Засах
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Bottom Navigation - Mobile Only */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-sm border-t border-white/20">
          <div className="flex justify-around items-center py-2 md:py-3">
            <button
              onClick={() => setActiveTab("home")}
              className={`flex flex-col items-center p-2 md:p-3 rounded-xl transition-colors ${
                activeTab === "home" ? "bg-emerald-400" : ""
              }`}
            >
              <Home className={`w-5 h-5 md:w-6 md:h-6 ${activeTab === "home" ? "text-black" : "text-white/70"}`} />
              <span className={`text-xs mt-1 ${activeTab === "home" ? "text-black" : "text-white/70"}`}>Нүүр</span>
            </button>
            {/* Hide records tab for employees */}
            {profile.role !== "employee" && (
              <button
                onClick={() => setActiveTab("records")}
                className={`flex flex-col items-center p-2 md:p-3 rounded-xl transition-colors ${
                  activeTab === "records" ? "bg-emerald-400" : ""
                }`}
              >
                <Car className={`w-5 h-5 md:w-6 md:h-6 ${activeTab === "records" ? "text-black" : "text-white/70"}`} />
                <span className={`text-xs mt-1 ${activeTab === "records" ? "text-black" : "text-white/70"}`}>
                  Бүртгэл
                </span>
              </button>
            )}
            <button
              onClick={() => setActiveTab("history")}
              className={`flex flex-col items-center p-2 md:p-3 rounded-xl transition-colors ${
                activeTab === "history" ? "bg-emerald-400" : ""
              }`}
            >
              <History
                className={`w-5 h-5 md:w-6 md:h-6 ${activeTab === "history" ? "text-black" : "text-white/70"}`}
              />
              <span className={`text-xs mt-1 ${activeTab === "history" ? "text-black" : "text-white/70"}`}>Түүх</span>
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex flex-col items-center p-2 md:p-3 rounded-xl transition-colors ${
                activeTab === "profile" ? "bg-emerald-400" : ""
              }`}
            >
              <User className={`w-5 h-5 md:w-6 md:h-6 ${activeTab === "profile" ? "text-black" : "text-white/70"}`} />
              <span className={`text-xs mt-1 ${activeTab === "profile" ? "text-black" : "text-white/70"}`}>
                Профайл
              </span>
            </button>
            <button
              onClick={handleLogoutClick}
              className="flex flex-col items-center p-2 md:p-3 rounded-xl transition-colors hover:bg-red-500/20"
            >
              <LogOut className="w-5 h-5 md:w-6 md:h-6 text-white/70 hover:text-red-400" />
              <span className="text-xs mt-1 text-white/70">Гарах</span>
            </button>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 w-full max-w-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-white text-lg font-medium">Зураг авах</h3>
              <button
                onClick={stopCamera}
                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="relative bg-black rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover"
                  style={{ transform: `scale(${cameraZoom})` }}
                />
                {/* Zoom level indicator */}
                <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                  {cameraZoom.toFixed(1)}x
                </div>
              </div>
              {/* Camera controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={zoomOut}
                    disabled={cameraZoom <= 1}
                    className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-50"
                  >
                    <span className="text-lg">-</span>
                  </button>
                  <button
                    onClick={resetZoom}
                    className="px-3 py-1 bg-white/10 rounded-full text-white text-sm hover:bg-white/20 transition-colors"
                  >
                    1x
                  </button>
                  <button
                    onClick={zoomIn}
                    disabled={cameraZoom >= 3}
                    className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-50"
                  >
                    <span className="text-lg">+</span>
                  </button>
                </div>
                <button
                  onClick={switchCamera}
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
                <button
                  onClick={captureImage}
                  className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white hover:bg-emerald-600 transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 w-full max-w-sm">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <LogOut className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h3 className="text-white text-lg font-medium mb-2">Системээс гарах</h3>
                <p className="text-white/70 text-sm">Та системээс гарахдаа итгэлтэй байна уу?</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={cancelLogout}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors text-sm"
                >
                  Цуцлах
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors text-sm"
                >
                  Гарах
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitModal && exitingRecord && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 w-full max-w-md">
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Car className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-white text-lg font-medium mb-2">Гарсан бүртгэл</h3>
                <p className="text-white/70 text-sm">Машины гарсан бүртгэл хийх</p>
              </div>
              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/70 text-sm">Машины дугаар:</span>
                    <span className="text-white font-medium">{exitingRecord.carNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70 text-sm">Орсон цаг:</span>
                    <span className="text-white text-sm">{formatDetailedTime(exitingRecord.entryTime || "")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70 text-sm">Гарах цаг:</span>
                    <span className="text-white text-sm">{formatDetailedTime(exitDetails.exitTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70 text-sm">Зогссон хугацаа:</span>
                    <span className="text-white font-medium">{exitDetails.duration} цаг</span>
                  </div>
                  <div className="flex justify-between border-t border-white/20 pt-2">
                    <span className="text-white/70 text-sm">Төлөх төлбөр:</span>
                    <span className="text-emerald-400 font-bold text-lg">{exitDetails.fee.toLocaleString()}₮</span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={cancelExit}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors text-sm"
                >
                  Цуцлах
                </button>
                <button
                  onClick={confirmExit}
                  className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors text-sm"
                >
                  Баталгаажуулах
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Car Confirmation Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 w-full max-w-md">
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Car className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="text-white text-lg font-medium mb-2">Давхардсан машин</h3>
                <p className="text-white/70 text-sm">Энэ машин өнөөдөр аль хэдийн бүртгэгдсэн байна</p>
              </div>
              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/70 text-sm">Машины дугаар:</span>
                    <span className="text-white font-medium">{duplicateCarData.carNumber}</span>
                  </div>
                  {duplicateCarData.existingRecord && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-white/70 text-sm">Орсон цаг:</span>
                        <span className="text-white text-sm">
                          {formatDetailedTime(duplicateCarData.existingRecord.entryTime || "")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70 text-sm">Жолооч:</span>
                        <span className="text-white text-sm">{duplicateCarData.existingRecord.driverName}</span>
                      </div>
                    </>
                  )}
                </div>
                <p className="text-white/70 text-sm text-center">Та дахин бүртгэхийг хүсэж байна уу?</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleDuplicateCancel}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors text-sm"
                >
                  Цуцлах
                </button>
                <button
                  onClick={handleDuplicateConfirm}
                  className="flex-1 px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-medium transition-colors text-sm"
                >
                  Дахин бүртгэх
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageViewer && currentImages.length > 0 && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={closeImageViewer}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            {/* Navigation buttons */}
            {currentImages.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
            {/* Image counter */}
            {currentImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {currentImageIndex + 1} / {currentImages.length}
              </div>
            )}
            {/* Main image */}
            <img
              src={currentImages[currentImageIndex] || "/placeholder.svg"}
              alt={`Image ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}

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
  const [router] = useRouter()

  // Home states
  const [carNumber, setCarNumber] = useState("")
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

  // Add new state
  const [selectedArea, setSelectedArea] = useState("")

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
  const calculateCurrentParkingFee = (entryTime: string, area = "general"): number => {
    if (!entryTime) {
      return 0
    }

    const areaConfig = pricingConfig[area as keyof typeof pricingConfig] || pricingConfig.general
    if (areaConfig.firstHour === 0) {
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
      const diffInHours = Math.ceil(diffInMs / (1000 * 60 * 60))

      if (diffInHours <= 1) {
        return areaConfig.firstHour
      } else {
        return areaConfig.firstHour + (diffInHours - 1) * areaConfig.subsequentHour
      }
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
      const diffInHours = Math.ceil(diffInMs / (1000 * 60 * 60))
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
      parkingArea: selectedArea, // Changed from parkingArea.trim().toUpperCase()
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
      setSelectedArea("") // Changed from setParkingArea("")
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
    if (!selectedArea) {
      alert("Бүс сонгоно уу")
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
  const calculateParkingFee = (entryTime: string, exitTime: string, area = "general"): number => {
    const duration = calculateParkingDuration(entryTime, exitTime)
    const areaConfig = pricingConfig[area as keyof typeof pricingConfig] || pricingConfig.general

    if (duration <= 1) {
      return areaConfig.firstHour
    } else {
      return areaConfig.firstHour + (duration - 1) * areaConfig.subsequentHour
    }
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
    const calculatedFee = calculateParkingFee(record.entryTime || "", exitTimeFormatted, record.parkingArea)
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
                        <label className="text-white/70 text-sm md:text-base">Бүс сонгох</label>
                        <select
                          value={selectedArea}
                          onChange={(e) => setSelectedArea(e.target.value)}
                          className="w-full px-4 py-3 md:px-6 md:py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl md:rounded-2xl text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 text-sm md:text-base"
                        >
                          <option value="" className="bg-gray-800 text-white">
                            Бүс сонгоно уу
                          </option>
                          <option value="leather" className="bg-gray-800 text-white">
                            Арьс бүс
                          </option>
                          <option value="spare" className="bg-gray-800 text-white">
                            Сапари бүс
                          </option>
                          <option value="general" className="bg-gray-800 text-white">
                            Талбай бүс
                          </option>
                        </select>
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
                                        <p className="font-medium text-white">{employee.name}</p>
                                        <div className="flex items-center space-x-2 text-xs text-gray-300">
                                          {employee.position && <span>{employee.position}</span>}
                                          {employee.phone && (
                                            <>
                                              {employee.position && <span>•</span>}
                                              <span>{employee.phone}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {selectedEmployees.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedEmployees.map((employeeName) => {
                              const employee = employees.find((emp) => emp.name === employeeName)
                              return (
                                <span
                                  key={employeeName}
                                  className="inline-flex items-center px-3 py-1 bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 rounded-lg text-sm"
                                >
                                  <div className="flex flex-col">
                                    <span>{employeeName}</span>
                                    {employee?.phone && <span className="text-xs opacity-70">{employee.phone}</span>}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedEmployees(selectedEmployees.filter((name) => name !== employeeName))
                                    }}
                                    className="ml-2 hover:text-emerald-300"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="current" viewBox="0 0 24 24">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                      />
                                    </svg>
                                  </button>
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Image capture section */}
                    <div className="space-y-4">
                      <label className="text-white/70 text-sm md:text-base">Зураг авах (Заавал биш)</label>
                      <div className="flex flex-wrap gap-3">
                        {/* Camera button */}
                        <button
                          onClick={() => startCamera()}
                          disabled={capturedImages.length >= 2}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 border border-blue-400/30 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        {/* File upload button */}
                        <label className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 border border-green-400/30 rounded-lg text-green-400 hover:bg-green-500/30 transition-colors cursor-pointer text-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            disabled={capturedImages.length >= 2}
                          />
                        </label>
                        <span className="text-white/50 text-xs self-center">({capturedImages.length}/2 зураг)</span>
                      </div>
                      {/* Display captured images */}
                      {capturedImages.length > 0 && (
                        <div className="flex flex-wrap gap-3">
                          {capturedImages.map((image, index) => (
                            <div key={index} className="relative">
                              <img
                                src={image || "/placeholder.svg"}
                                alt={`Captured ${index + 1}`}
                                className="w-20 h-20 object-cover rounded-lg border border-white/20"
                              />
                              <button
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
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
                      className="w-full px-6 py-4 md:px-8 md:py-5 bg-emerald-400 text-black font-semibold rounded-xl md:rounded-2xl hover:bg-emerald-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                    >
                      {actionLoading ? "Бүртгэж байна..." : "Орсон бүртгэл хийх"}
                    </button>
                  </div>
                </div>
              )}
              {/* Recent Records */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-10">
                <div className="mb-6 md:mb-8">
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-white mb-2">Сүүлийн бүртгэлүүд</h2>
                  <p className="text-white/70 text-sm md:text-base">Таны хийсэн сүүлийн 3 бүртгэл</p>
                </div>
                <div className="space-y-4">
                  {recentRecords.length === 0 ? (
                    <div className="text-center py-8 md:py-12">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Car className="w-8 h-8 md:w-10 md:h-10 text-white/50" />
                      </div>
                      <p className="text-white/70 text-sm md:text-base">Одоогоор бүртгэл байхгүй байна</p>
                    </div>
                  ) : (
                    recentRecords.map((record) => (
                      <div
                        key={record.id}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-3">
                              <span className="text-white font-semibold text-sm md:text-base">{record.carNumber}</span>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  record.type === "entry"
                                    ? "bg-blue-500/20 text-blue-400 border border-blue-400/30"
                                    : record.type === "completed"
                                      ? "bg-green-500/20 text-green-400 border border-green-400/30"
                                      : "bg-gray-500/20 text-gray-400 border border-gray-400/30"
                                }`}
                              >
                                {record.type === "entry"
                                  ? "Орсон"
                                  : record.type === "completed"
                                    ? "Гарсан"
                                    : "Хаагдсан"}
                              </span>
                            </div>
                            <p className="text-white/70 text-xs md:text-sm">
                              {record.driverName} • {record.parkingArea}
                            </p>
                            <p className="text-white/50 text-xs">
                              {formatDetailedTime(record.entryTime || record.timestamp)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4">
                            {record.type === "entry" && (
                              <div className="text-right">
                                <p className="text-white/70 text-xs">Одоогийн төлбөр</p>
                                <p className="text-emerald-400 font-semibold text-sm md:text-base">
                                  {calculateCurrentParkingFee(
                                    record.entryTime || record.timestamp,
                                    record.parkingArea,
                                  ).toLocaleString()}
                                  ₮
                                </p>
                              </div>
                            )}
                            {record.type === "completed" && record.amount && (
                              <div className="text-right">
                                <p className="text-white/70 text-xs">Төлсөн дүн</p>
                                <p className="text-emerald-400 font-semibold text-sm md:text-base">
                                  {record.amount.toLocaleString()}₮
                                </p>
                              </div>
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
                <div className="space-y-4">
                  {filteredActiveParkingRecords.length === 0 ? (
                    <div className="text-center py-8 md:py-12">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Car className="w-8 h-8 md:w-10 md:h-10 text-white/50" />
                      </div>
                      <p className="text-white/70 text-sm md:text-base">
                        {activeRecordsSearch ? "Хайлтын үр дүн олдсонгүй" : "Одоогоор идэвхтэй бүртгэл байхгүй байна"}
                      </p>
                    </div>
                  ) : (
                    filteredActiveParkingRecords.map((record) => (
                      <div
                        key={record.id}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center space-x-3">
                              <span className="text-white font-semibold text-lg md:text-xl">{record.carNumber}</span>
                              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded-full text-xs font-medium">
                                Идэвхтэй
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              <p className="text-white/70">
                                <span className="text-white/50">Жолооч:</span> {record.driverName}
                              </p>
                              <p className="text-white/70">
                                <span className="text-white/50">Машины марк:</span> {record.parkingArea}
                              </p>
                              <p className="text-white/70">
                                <span className="text-white/50">Орсон цаг:</span>{" "}
                                {formatDetailedTime(record.entryTime || record.timestamp)}
                              </p>
                              <p className="text-white/70">
                                <span className="text-white/50">Зогссон хугацаа:</span>{" "}
                                {calculateParkingDuration(record.entryTime || record.timestamp)} цаг
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                            <div className="text-center sm:text-right">
                              <p className="text-white/70 text-sm">Одоогийн төлбөр</p>
                              <p className="text-emerald-400 font-bold text-xl md:text-2xl">
                                {calculateCurrentParkingFee(
                                  record.entryTime || record.timestamp,
                                  record.parkingArea,
                                ).toLocaleString()}
                                ₮
                              </p>
                            </div>
                            <button
                              onClick={() => handleExitFromRecord(record.id!, record)}
                              className="px-4 py-2 md:px-6 md:py-3 bg-red-500/20 border border-red-400/30 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors text-sm font-medium"
                            >
                              Гарсан
                            </button>
                          </div>
                        </div>
                        {/* Display images if available */}
                        {record.images && record.images.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <p className="text-white/70 text-sm mb-2">Зургууд:</p>
                            <div className="flex space-x-2">
                              {record.images.map((image, index) => (
                                <img
                                  key={index}
                                  src={image || "/placeholder.svg"}
                                  alt={`Record image ${index + 1}`}
                                  className="w-16 h-16 object-cover rounded-lg border border-white/20 cursor-pointer hover:scale-110 transition-transform"
                                  onClick={() => openImageViewer(record.images || [], index)}
                                />
                              ))}
                            </div>
                          </div>
                        )}
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
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-white mb-2">Бүртгэлийн түүх</h2>
                  <p className="text-white/70 text-sm md:text-base">Дууссан бүртгэлүүдийн жагсаалт</p>
                </div>
                {/* Filters */}
                <div className="mb-6">
                  <button
                    onClick={() => setFilterCollapsed(!filterCollapsed)}
                    className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white hover:bg-white/20 transition-colors mb-4"
                  >
                    <span className="text-sm md:text-base">Шүүлтүүр</span>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                      <div className="space-y-2">
                        <label className="text-white/70 text-sm">Жил</label>
                        <select
                          value={filterYear}
                          onChange={(e) => setFilterYear(e.target.value)}
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-400"
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
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-400"
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
                          className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/50 text-sm focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>
                  )}
                </div>
                {/* Records List */}
                <div className="space-y-4">
                  {filteredRecords.length === 0 ? (
                    <div className="text-center py-8 md:py-12">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <History className="w-8 h-8 md:w-10 md:h-10 text-white/50" />
                      </div>
                      <p className="text-white/70 text-sm md:text-base">Шүүлтэд тохирох бүртгэл олдсонгүй</p>
                    </div>
                  ) : (
                    filteredRecords.map((record) => (
                      <div
                        key={record.id}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center space-x-3">
                              <span className="text-white font-semibold text-lg md:text-xl">{record.carNumber}</span>
                              <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-400/30 rounded-full text-xs font-medium">
                                Дууссан
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                              <p className="text-white/70">
                                <span className="text-white/50">Жолооч:</span> {record.driverName}
                              </p>
                              <p className="text-white/70">
                                <span className="text-white/50">Машины марк:</span> {record.parkingArea}
                              </p>
                              <p className="text-white/70">
                                <span className="text-white/50">Орсон:</span>{" "}
                                {formatDetailedTime(record.entryTime || record.timestamp)}
                              </p>
                              <p className="text-white/70">
                                <span className="text-white/50">Гарсан:</span>{" "}
                                {record.exitTime ? formatDetailedTime(record.exitTime) : "Тодорхойгүй"}
                              </p>
                              <p className="text-white/70">
                                <span className="text-white/50">Хугацаа:</span>{" "}
                                {record.parkingDuration ||
                                  calculateParkingDuration(record.entryTime || record.timestamp, record.exitTime)}{" "}
                                цаг
                              </p>
                              <p className="text-emerald-400 font-semibold">
                                <span className="text-white/50">Төлбөр:</span> {(record.amount || 0).toLocaleString()}₮
                              </p>
                            </div>
                          </div>
                        </div>
                        {/* Display images if available */}
                        {record.images && record.images.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <p className="text-white/70 text-sm mb-2">Зургууд:</p>
                            <div className="flex space-x-2">
                              {record.images.map((image, index) => (
                                <img
                                  key={index}
                                  src={image || "/placeholder.svg"}
                                  alt={`Record image ${index + 1}`}
                                  className="w-16 h-16 object-cover rounded-lg border border-white/20 cursor-pointer hover:scale-110 transition-transform"
                                  onClick={() => openImageViewer(record.images || [], index)}
                                />
                              ))}
                            </div>
                          </div>
                        )}
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
                <div className="space-y-6">
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
                      <label className="px-4 py-2 bg-blue-500/20 border border-blue-400/30 text-blue-400 rounded-lg cursor-pointer hover:bg-blue-500/30 transition-colors text-sm">
                        Зураг солих
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                  {/* Profile Form */}
                  <div className="space-y-4">
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
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        disabled={!editing || profile.role === "employee"} // Employees can't change email
                        className="w-full px-4 py-3 md:px-6 md:py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl md:rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 disabled:opacity-50 text-sm md:text-base"
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
                      <div className="space-y-4 pt-4 border-t border-white/10">
                        <h3 className="text-white font-medium text-sm md:text-base">Нууц үг солих (Заавал биш)</h3>
                        <div className="space-y-2">
                          <label className="text-white/70 text-sm">Шинэ нууц үг</label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? "text" : "password"}
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                              placeholder="Шинэ нууц үг оруулах"
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
                      </div>
                    )}
                  </div>
                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                    {editing ? (
                      <>
                        <button
                          onClick={saveProfile}
                          disabled={profileLoading}
                          className="flex-1 px-6 py-3 md:py-4 bg-emerald-400 text-black font-semibold rounded-xl md:rounded-2xl hover:bg-emerald-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                        >
                          {profileLoading ? "Хадгалж байна..." : "Хадгалах"}
                        </button>
                        <button
                          onClick={() => {
                            setEditing(false)
                            // Reset password fields when canceling
                            setPasswordData({
                              currentPassword: "",
                              newPassword: "",
                              confirmPassword: "",
                            })
                          }}
                          className="flex-1 px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl md:rounded-2xl hover:bg-white/20 transition-colors text-sm md:text-base"
                        >
                          Цуцлах
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setEditing(true)}
                        className="w-full px-6 py-3 md:py-4 bg-blue-500/20 border border-blue-400/30 text-blue-400 rounded-xl md:rounded-2xl hover:bg-blue-500/30 transition-colors text-sm md:text-base"
                      >
                        Засах
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Bottom Navigation - Mobile Only */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-sm border-t border-white/20">
          <div className="flex justify-around items-center py-2">
            <button
              onClick={() => setActiveTab("home")}
              className={`flex flex-col items-center p-3 rounded-xl transition-colors ${
                activeTab === "home" ? "bg-emerald-400" : ""
              }`}
            >
              <Home className={`w-6 h-6 ${activeTab === "home" ? "text-black" : "text-white/70"}`} />
              <span className={`text-xs mt-1 ${activeTab === "home" ? "text-black" : "text-white/70"}`}>Нүүр</span>
            </button>
            {/* Hide records tab for employees */}
            {profile.role !== "employee" && (
              <button
                onClick={() => setActiveTab("records")}
                className={`flex flex-col items-center p-3 rounded-xl transition-colors ${
                  activeTab === "records" ? "bg-emerald-400" : ""
                }`}
              >
                <Car className={`w-6 h-6 ${activeTab === "records" ? "text-black" : "text-white/70"}`} />
                <span className={`text-xs mt-1 ${activeTab === "records" ? "text-black" : "text-white/70"}`}>
                  Бүртгэл
                </span>
              </button>
            )}
            <button
              onClick={() => setActiveTab("history")}
              className={`flex flex-col items-center p-3 rounded-xl transition-colors ${
                activeTab === "history" ? "bg-emerald-400" : ""
              }`}
            >
              <History className={`w-6 h-6 ${activeTab === "history" ? "text-black" : "text-white/70"}`} />
              <span className={`text-xs mt-1 ${activeTab === "history" ? "text-black" : "text-white/70"}`}>Түүх</span>
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex flex-col items-center p-3 rounded-xl transition-colors ${
                activeTab === "profile" ? "bg-emerald-400" : ""
              }`}
            >
              <User className={`w-6 h-6 ${activeTab === "profile" ? "text-black" : "text-white/70"}`} />
              <span className={`text-xs mt-1 ${activeTab === "profile" ? "text-black" : "text-white/70"}`}>
                Профайл
              </span>
            </button>
            <button
              onClick={handleLogoutClick}
              className="flex flex-col items-center p-3 rounded-xl transition-colors hover:bg-red-500/20"
            >
              <LogOut className="w-6 h-6 text-white/70 hover:text-red-400" />
              <span className="text-xs mt-1 text-white/70">Гарах</span>
            </button>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Зураг авах</h3>
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
                  style={{
                    transform: `${cameraFacing === "user" ? "scaleX(-1)" : ""} scale(${cameraZoom})`,
                    transformOrigin: "center center",
                  }}
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex justify-center space-x-2 flex-wrap gap-2">
                <button
                  onClick={switchCamera}
                  className="px-3 py-2 bg-blue-500/20 border border-blue-400/30 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                >
                  Камер солих
                </button>
                <button
                  onClick={zoomOut}
                  disabled={cameraZoom <= 1}
                  className="px-3 py-2 bg-purple-500/20 border border-purple-400/30 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Zoom -
                </button>
                <button
                  onClick={resetZoom}
                  className="px-3 py-2 bg-gray-500/20 border border-gray-400/30 text-gray-400 rounded-lg hover:bg-gray-500/30 transition-colors text-sm"
                >
                  {cameraZoom.toFixed(1)}x
                </button>
                <button
                  onClick={zoomIn}
                  disabled={cameraZoom >= 3}
                  className="px-3 py-2 bg-purple-500/20 border border-purple-400/30 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Zoom +
                </button>
                <button
                  onClick={captureImage}
                  className="px-4 py-2 bg-emerald-400 text-black font-semibold rounded-lg hover:bg-emerald-300 transition-colors text-sm"
                >
                  Зураг авах
                </button>
              </div>
            </div>
          </div>
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
                <h3 className="text-white font-semibold text-lg mb-2">Системээс гарах</h3>
                <p className="text-white/70 text-sm">Та системээс гарахдаа итгэлтэй байна уу?</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={cancelLogout}
                  className="flex-1 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors text-sm"
                >
                  Цуцлах
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 px-4 py-2 bg-red-500/20 border border-red-400/30 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
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
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Car className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-white font-semibold text-xl mb-2">Гарсан бүртгэл</h3>
                <p className="text-white/70 text-sm">Дараах мэдээллийг шалгаад баталгаажуулна уу</p>
              </div>

              <div className="space-y-4 bg-white/5 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-white/50">Машины дугаар:</p>
                    <p className="text-white font-semibold text-lg">{exitingRecord.carNumber}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Машины марк:</p>
                    <p className="text-white">{exitingRecord.parkingArea}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Жолооч:</p>
                    <p className="text-white">{exitingRecord.driverName}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Зогссон хугацаа:</p>
                    <p className="text-white font-semibold">{exitDetails.duration} цаг</p>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Орсон цаг:</span>
                    <span className="text-white text-sm">
                      {formatDetailedTime(exitingRecord.entryTime || exitingRecord.timestamp)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Гарах цаг:</span>
                    <span className="text-white text-sm">{formatDetailedTime(exitDetails.exitTime)}</span>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-lg p-4 text-center">
                  <p className="text-emerald-400 text-sm mb-1">Нийт төлбөр</p>
                  <p className="text-emerald-400 font-bold text-2xl">{exitDetails.fee.toLocaleString()}₮</p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={cancelExit}
                  className="flex-1 px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl hover:bg-white/20 transition-colors text-sm"
                >
                  Цуцлах
                </button>
                <button
                  onClick={confirmExit}
                  className="flex-1 px-4 py-3 bg-emerald-400 text-black font-semibold rounded-xl hover:bg-emerald-300 transition-colors text-sm"
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
                <h3 className="text-white font-semibold text-xl mb-2">Анхааруулга</h3>
                <p className="text-white/70 text-sm">
                  <span className="text-yellow-400 font-semibold">{duplicateCarData.carNumber}</span> дугаартай машин
                  өнөөдөр бүртгэгдсэн байна.
                </p>
              </div>

              {duplicateCarData.existingRecord && (
                <div className="space-y-3 bg-white/5 rounded-xl p-4">
                  <h4 className="text-white font-medium text-sm">Өмнөх бүртгэл:</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-white/50">Жолооч:</p>
                      <p className="text-white">{duplicateCarData.existingRecord.driverName}</p>
                    </div>
                    <div>
                      <p className="text-white/50">Машины марк:</p>
                      <p className="text-white">{duplicateCarData.existingRecord.parkingArea}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-white/50">Орсон цаг:</p>
                      <p className="text-white">
                        {formatDetailedTime(
                          duplicateCarData.existingRecord.entryTime || duplicateCarData.existingRecord.timestamp,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center">
                <p className="text-white text-sm mb-4">Энэ машинийг дахин бүртгэх үү?</p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleDuplicateCancel}
                  className="flex-1 px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl hover:bg-white/20 transition-colors text-sm"
                >
                  Үгүй
                </button>
                <button
                  onClick={handleDuplicateConfirm}
                  className="flex-1 px-4 py-3 bg-yellow-500/20 border border-yellow-400/30 text-yellow-400 rounded-xl hover:bg-yellow-500/30 transition-colors text-sm font-semibold"
                >
                  Тийм
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageViewer && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            {/* Close button */}
            <button
              onClick={closeImageViewer}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Navigation buttons */}
            {currentImages.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Main image */}
            <img
              src={currentImages[currentImageIndex] || "/placeholder.svg"}
              alt={`Image ${currentImageIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />

            {/* Image counter */}
            {currentImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white text-sm">
                {currentImageIndex + 1} / {currentImages.length}
              </div>
            )}

            {/* Instructions */}
            <div className="absolute bottom-4 right-4 text-white/70 text-xs">
              <p>ESC - Хаах | ← → - Навигаци</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

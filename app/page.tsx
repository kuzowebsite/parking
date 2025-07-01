"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User as FirebaseUser } from "firebase/auth"
import { ref, push, onValue, set, update } from "firebase/database"
import { auth, database } from "@/lib/firebase"
import type { ParkingRecord, UserProfile } from "@/types"
import { Home, History, User, LogOut, Search, X } from "lucide-react"

export default function ParkingSystem() {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSplash, setShowSplash] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)

  // Login states
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Home states
  const [carNumber, setCarNumber] = useState("")
  const [parkingArea, setParkingArea] = useState("")
  const [recentRecords, setRecentRecords] = useState<ParkingRecord[]>([])
  const [actionLoading, setActionLoading] = useState(false)

  // History states
  const [allRecords, setAllRecords] = useState<ParkingRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<ParkingRecord[]>([])

  // Filter states
  const [filterYear, setFilterYear] = useState("")
  const [filterMonth, setFilterMonth] = useState("")
  const [filterCarNumber, setFilterCarNumber] = useState("")
  const [filterType, setFilterType] = useState("") // Add this new state

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

  // Pricing state
  const [pricingConfig, setPricingConfig] = useState({
    pricePerMinute: 0,
  })

  // Tabs-ийн оронд activeTab state нэмэх
  const [activeTab, setActiveTab] = useState("home")

  // Logout confirmation modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // Filter collapse state
  const [filterCollapsed, setFilterCollapsed] = useState(true)

  // Add after other state declarations
  const [isCarParked, setIsCarParked] = useState(false)
  const [checkingParkingStatus, setCheckingParkingStatus] = useState(false)

  // Real-time pricing states
  const [currentParkingFees, setCurrentParkingFees] = useState<{ [key: string]: number }>({})
  const [parkingTimers, setParkingTimers] = useState<{ [key: string]: NodeJS.Timeout }>({})

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
        setUser(user)
        setLoading(false)
        if (user) {
          loadProfile() // Эхлээд profile ачаалах, дараа нь records ачаалагдана
        }
      })
      return unsubscribe
    }
  }, [showSplash])

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

    // Filter by type
    if (filterType) {
      filtered = filtered.filter((record) => record.type === filterType)
    }

    setFilteredRecords(filtered)
  }, [allRecords, filterYear, filterMonth, filterCarNumber, filterType])

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

  // Update the loadAllRecords function to ensure proper data fetching
  const loadAllRecords = () => {
    if (!user?.uid) {
      console.log("No authenticated user, skipping all records load")
      return
    }

    console.log("Loading all records for user:", user.uid)

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
              return (
                record.driverName === profile.name ||
                (user?.email && record.driverName === user.email.split("@")[0]) ||
                record.driverName === "Систем Админ" // Allow test records
              )
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

          setAllRecords(records)
          console.log("All records loaded:", records.length, "records")
        } else {
          setAllRecords([])
          console.log("No records found in database")
        }
      },
      (error) => {
        console.error("Error loading all records:", error)
        // Don't show alert for permission errors during initial load
        if (error.code !== "PERMISSION_DENIED") {
          console.error("Database error:", error.message)
        }
        setAllRecords([])
      },
    )
  }

  // Update the loadProfile function to call record loading functions
  const loadProfile = () => {
    const userId = auth.currentUser?.uid
    if (!userId) {
      console.log("No authenticated user for profile load")
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

          // Redirect manager to manager page
          if (userProfile.role === "manager") {
            console.log("Manager detected, redirecting to manager page...")
            window.location.href = "/manager"
            return
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

          // Load records after profile is loaded and we have user context
          setTimeout(() => {
            loadRecentRecords()
            loadAllRecords()
            // Load persistent parking status after profile and records are loaded
            setTimeout(() => {
              loadPersistentParkingStatus()
            }, 1000)
          }, 500)
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
            loadRecentRecords()
            loadAllRecords()
            // Load persistent parking status after profile and records are loaded
            setTimeout(() => {
              loadPersistentParkingStatus()
            }, 1000)
          }, 500)
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
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60)) // Use Math.floor instead of Math.ceil

      // Хэрэв 1 минутаас бага бол 0 буцаах
      if (diffInMinutes < 1) {
        return 0
      }

      return diffInMinutes * (pricingConfig.pricePerMinute || 100)
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
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60)) // Use Math.floor instead of Math.ceil

      // Хэрэв 1 минутаас бага бол 0 буцаах
      if (diffInMinutes < 1) {
        return 0
      }

      return diffInMinutes
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoginLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      alert("И-мэйл эсвэл нууц үг буруу байна")
    }
    setLoginLoading(false)
  }

  // Add function to check if car is currently parked:
  const checkCarParkingStatus = async (carNumber: string) => {
    if (!carNumber.trim()) {
      setIsCarParked(false)
      return
    }

    setCheckingParkingStatus(true)

    try {
      const recordsRef = ref(database, "parking_records")
      const snapshot = await new Promise((resolve, reject) => {
        onValue(recordsRef, resolve, reject, { onlyOnce: true })
      })

      const data = snapshot.val()
      let hasActiveEntry = false

      if (data) {
        // Check if there's an active entry (entry without exit) for this car and driver
        const records = Object.keys(data)
          .map((key) => ({ id: key, ...data[key] }))
          .filter(
            (record) =>
              record.carNumber.toUpperCase() === carNumber.trim().toUpperCase() &&
              record.driverName === (profile.name || user?.email?.split("@")[0] || "Тодорхойгүй") &&
              record.type === "entry" &&
              !record.exitTime,
          )

        hasActiveEntry = records.length > 0
      }

      setIsCarParked(hasActiveEntry)
    } catch (error) {
      console.error("Error checking parking status:", error)
      setIsCarParked(false)
    }

    setCheckingParkingStatus(false)
  }

  // Add this new function after the existing checkCarParkingStatus function
  const loadPersistentParkingStatus = async () => {
    if (!user?.uid || !profile.name) {
      return
    }

    try {
      const recordsRef = ref(database, "parking_records")
      const snapshot = await new Promise((resolve, reject) => {
        onValue(recordsRef, resolve, reject, { onlyOnce: true })
      })

      const data = snapshot.val()
      if (data) {
        // Find any active parking record for this driver
        const activeRecord = Object.keys(data)
          .map((key) => ({ id: key, ...data[key] }))
          .find((record) => record.driverName === profile.name && record.type === "entry" && !record.exitTime)

        if (activeRecord) {
          // Restore the car number and parking area from the active record
          setCarNumber(activeRecord.carNumber)
          setParkingArea(activeRecord.parkingArea)
          setIsCarParked(true)
          console.log("Restored parking status:", activeRecord)
        } else {
          setIsCarParked(false)
        }
      }
    } catch (error) {
      console.error("Error loading persistent parking status:", error)
      setIsCarParked(false)
    }
  }

  // handleEntry функцийг засварлах - шууд timer эхлүүлэхгүй
  const handleEntry = async () => {
    if (!carNumber.trim()) {
      alert("Машины дугаарыг оруулна уу")
      return
    }

    if (!parkingArea.trim()) {
      alert("Талбайг оруулна уу")
      return
    }

    setActionLoading(true)

    const currentTime = new Date()
    const record: Omit<ParkingRecord, "id"> = {
      carNumber: carNumber.trim().toUpperCase(),
      driverName: profile.name || user?.email?.split("@")[0] || "Тодорхойгүй",
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
    }

    try {
      await push(ref(database, "parking_records"), record)
      alert("Орсон бүртгэл амжилттай хийгдлээ")

      // Refresh records after adding new entry
      setTimeout(() => {
        loadRecentRecords()
        loadAllRecords()
      }, 500)

      // Don't clear form after entry, just update parking status
      setIsCarParked(true)
    } catch (error) {
      console.error("Entry record error:", error)
      alert("Бүртгэл хийхэд алдаа гарлаа")
    }
    setActionLoading(false)
  }

  // Function to calculate parking fee
  const calculateParkingFee = (entryTime: string, exitTime: string): number => {
    const duration = calculateParkingDuration(entryTime, exitTime)
    return duration * (pricingConfig.pricePerMinute || 100)
  }

  // Update the handleExit function to calculate and save duration & fee
  const handleExit = async () => {
    if (!carNumber.trim()) {
      alert("Машины дугаарыг оруулна уу")
      return
    }

    if (!parkingArea.trim()) {
      alert("Талбайг оруулна уу")
      return
    }

    setActionLoading(true)

    try {
      // Find the most recent entry record for this car and driver
      const recordsRef = ref(database, "parking_records")
      const snapshot = await new Promise((resolve, reject) => {
        onValue(recordsRef, resolve, reject, { onlyOnce: true })
      })

      const data = snapshot.val()
      let entryRecordId = null
      let entryRecord = null

      if (data) {
        // Find the most recent entry record for this car number and driver that doesn't have an exit time
        const records = Object.keys(data)
          .map((key) => ({ id: key, ...data[key] }))
          .filter(
            (record) =>
              record.carNumber.toUpperCase() === carNumber.trim().toUpperCase() &&
              record.driverName === (profile.name || user?.email?.split("@")[0] || "Тодорхойгүй") &&
              record.type === "entry" &&
              !record.exitTime,
          )
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

        if (records.length > 0) {
          entryRecord = records[0]
          entryRecordId = entryRecord.id
        }
      }

      const currentTime = new Date()
      const exitTimeFormatted = currentTime.toLocaleString("mn-MN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })

      if (entryRecordId && entryRecord) {
        // Calculate parking duration and fee
        const calculatedFee = calculateParkingFee(entryRecord.entryTime, exitTimeFormatted)
        const parkingDuration = calculateParkingDuration(entryRecord.entryTime, exitTimeFormatted)

        // Update existing entry record with exit information, duration, and fee
        await update(ref(database, `parking_records/${entryRecordId}`), {
          exitTime: exitTimeFormatted,
          amount: calculatedFee,
          parkingDuration: parkingDuration, // Зогссон хугацаа (минутаар)
          type: "completed", // Change type to indicate it's a completed parking session
          updatedAt: currentTime.toISOString(),
        })

        alert(
          `Гарсан бүртгэл амжилттай хийгдлээ.\nЗогссон хугацаа: ${parkingDuration} минут\nТөлбөр: ${calculatedFee}₮`,
        )
      } else {
        // No matching entry found, create a standalone exit record
        const record = {
          carNumber: carNumber.trim().toUpperCase(),
          driverName: profile.name || user?.email?.split("@")[0] || "Тодорхойгүй",
          parkingArea: parkingArea.trim().toUpperCase(),
          exitTime: exitTimeFormatted,
          amount: 0,
          parkingDuration: 0,
          type: "exit",
          timestamp: currentTime.toISOString(),
        }

        await push(ref(database, "parking_records"), record)
        alert("Гарсан бүртгэл хийгдлээ (Орсон бүртгэл олдсонгүй)")
      }

      // After successful exit, add:
      setIsCarParked(false)
      // Keep existing form clearing:
      setCarNumber("")
      setParkingArea("")

      // Refresh records after updating
      setTimeout(() => {
        loadRecentRecords()
        loadAllRecords()
      }, 500)
    } catch (error) {
      console.error("Exit record error:", error)
      alert("Бүртгэл хийхэд алдаа гарлаа")
    }
    setActionLoading(false)
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

  const saveProfile = async () => {
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
    if (user && !showSplash && user.uid && profile.name) {
      console.log("User authenticated, loading data...")
      // Add a delay to ensure Firebase auth is fully initialized
      const timeoutId = setTimeout(() => {
        loadRecentRecords()
        loadAllRecords()
        // Load persistent parking status
        const statusTimeoutId = setTimeout(() => {
          loadPersistentParkingStatus()
        }, 1500)

        return () => clearTimeout(statusTimeoutId)
      }, 1000)

      return () => clearTimeout(timeoutId)
    } else {
      console.log("User not ready:", { user: !!user, showSplash, uid: user?.uid, profileName: profile.name })
    }
  }, [user, profile.name, showSplash]) // More specific dependencies

  // Add this useEffect after other useEffects
  useEffect(() => {
    // Only check parking status if we're not already in a parked state
    // This prevents overriding the persistent status loaded from database
    if (carNumber.trim() && profile.name && !isCarParked) {
      const timeoutId = setTimeout(() => {
        checkCarParkingStatus(carNumber)
      }, 500) // Add small delay to prevent rapid calls

      return () => clearTimeout(timeoutId)
    }
  }, [carNumber, profile.name, isCarParked]) // Add isCarParked to dependencies

  // Setup real-time timers функцийг засварлах
  useEffect(() => {
    // Clear existing timers
    Object.values(parkingTimers).forEach((timer) => clearInterval(timer))

    // Filter active parking records (entry without exit)
    const activeRecords = recentRecords.filter((record) => record.type === "entry" && !record.exitTime)

    if (activeRecords.length === 0) {
      setParkingTimers({})
      setCurrentParkingFees({})
      return
    }

    const newTimers: { [key: string]: NodeJS.Timeout } = {}
    const newFees: { [key: string]: number } = {}

    activeRecords.forEach((record) => {
      // Calculate initial fee (0 эхлэх)
      const initialFee = calculateCurrentParkingFee(record.entryTime || "")
      newFees[record.id] = initialFee

      // Save initial state to database (only once)
      update(ref(database, `parking_records/${record.id}`), {
        currentAmount: initialFee,
        currentDuration: calculateParkingDuration(record.entryTime || ""),
        lastUpdated: new Date().toISOString(),
      }).catch((error) => console.error("Error updating initial parking data:", error))

      // Set up timer to update fee every 60 seconds (1 minute)
      newTimers[record.id] = setInterval(() => {
        const currentFee = calculateCurrentParkingFee(record.entryTime || "")
        const currentDuration = calculateParkingDuration(record.entryTime || "")

        console.log(`Updating fee for ${record.carNumber}: ${currentFee}₮, Duration: ${currentDuration} minutes`)

        // Update local state
        setCurrentParkingFees((prev) => ({
          ...prev,
          [record.id]: currentFee,
        }))

        // Update database with current fee and duration
        update(ref(database, `parking_records/${record.id}`), {
          currentAmount: currentFee,
          currentDuration: currentDuration,
          lastUpdated: new Date().toISOString(),
        }).catch((error) => console.error("Error updating parking data:", error))
      }, 60000) // Update every 60 seconds (1 minute)
    })

    setParkingTimers(newTimers)
    setCurrentParkingFees(newFees)

    // Cleanup function
    return () => {
      Object.values(newTimers).forEach((timer) => clearInterval(timer))
    }
  }, [recentRecords.length, pricingConfig.pricePerMinute]) // Only depend on length, not the entire array

  // Remove the separate duration timer useEffect and replace with this simpler one
  useEffect(() => {
    // Set up a separate timer for duration updates every minute
    const durationTimer = setInterval(() => {
      // Force re-render by updating a timestamp (this won't cause infinite loops)
      const now = Date.now()
      console.log("Duration update tick:", now)
    }, 60000) // Update every 60 seconds (1 minute)

    return () => clearInterval(durationTimer)
  }, []) // Empty dependency array - only run once

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

  if (!user) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/background.webp')",
          }}
        >
          <div className="absolute inset-0 bg-black/70"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-sm md:max-w-md lg:max-w-lg mx-4">
          {/* Logo and Welcome */}
          <div className="text-center mb-12 md:mb-16">
            <div className="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 mx-auto mb-6 md:mb-8 flex items-center justify-center">
              <img src="/images/logo.png" alt="Logo" className="w-12 h-12 md:w-16 md:h-16 lg:w-18 lg:h-18" />
            </div>
            <h1 className="text-white text-xl md:text-2xl lg:text-3xl font-semibold">ТАВТАЙ МОРИЛНО УУ</h1>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6 md:space-y-8">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-white/70 text-sm">И-мэйл хаяг</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="И-мэйл хаягаа оруулна уу"
                  className="w-full px-4 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-white/70 text-sm">Нууц үг</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Нууц үгээ оруулна уу"
                  className="w-full px-4 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M9.878 9.878a3 3 0 00-.007 4.243m4.242-4.242L15.536 15.536M14.122 14.122a3 3 0 01-4.243-.007m4.243.007l1.414 1.414M14.122 14.122L8.464 8.464"
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-4 bg-emerald-400 hover:bg-emerald-500 text-black font-semibold rounded-2xl transition-colors disabled:opacity-50"
            >
              {loginLoading ? "Нэвтэрч байна..." : "Нэвтрэх"}
            </button>
          </form>
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
              <img src="/images/logo.png" alt="Logo" className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10" />
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
              {/* Машины бүртгэл */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-10">
                <div className="mb-6 md:mb-8">
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-white mb-2">Машины бүртгэл</h2>
                  <p className="text-white/70 text-sm md:text-base">Машины орсон/гарсан бүртгэл хийх</p>
                </div>
                <div className="space-y-4 md:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <label className={`text-white/70 text-sm md:text-base ${isCarParked ? "opacity-50" : ""}`}>
                        Машины дугаар {isCarParked && <span className="text-yellow-400 text-xs">(Зогсоолд байна)</span>}
                      </label>
                      <input
                        value={carNumber}
                        onChange={(e) => setCarNumber(e.target.value.toUpperCase())}
                        placeholder="1234 УНМ"
                        disabled={isCarParked}
                        className="w-full px-4 py-3 md:px-6 md:py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl md:rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className={`text-white/70 text-sm md:text-base ${isCarParked ? "opacity-50" : ""}`}>
                        Талбай {isCarParked && <span className="text-yellow-400 text-xs">(Зогсоолд байна)</span>}
                      </label>
                      <input
                        value={parkingArea}
                        onChange={(e) => setParkingArea(e.target.value.toUpperCase())}
                        placeholder="Жишээ: A, B, C, D"
                        disabled={isCarParked}
                        className="w-full px-4 py-3 md:px-6 md:py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl md:rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-white/70 text-sm md:text-base">Жолоочийн нэр</label>
                    <div className="px-4 py-3 md:px-6 md:py-4 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl text-white/70 text-sm md:text-base">
                      {profile.name || "Профайлд нэр оруулна уу"}
                    </div>
                  </div>

                  <div className="flex flex-col pt-4">
                    <button
                      onClick={isCarParked ? handleExit : handleEntry}
                      disabled={actionLoading || checkingParkingStatus}
                      className={`w-full py-3 md:py-4 font-semibold rounded-xl md:rounded-2xl transition-colors disabled:opacity-50 text-sm md:text-base ${
                        isCarParked
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "bg-emerald-400 hover:bg-emerald-500 text-black"
                      }`}
                    >
                      {actionLoading
                        ? "Бүртгэж байна..."
                        : checkingParkingStatus
                          ? "Шалгаж байна..."
                          : isCarParked
                            ? "Гарсан"
                            : "Орсон"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Одоо зогсоолд байна */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Одоо зогсоолд байгаа</h2>
                {recentRecords.length === 0 ? (
                  <p className="text-center text-white/50 py-8">Одоо зогсоолд машин байхгүй байгаа</p>
                ) : (
                  <div className="space-y-3">
                    {recentRecords
                      .filter((record) => record.type === "entry" && !record.exitTime) // Show only active parking
                      .map((record) => {
                        const currentFee = currentParkingFees[record.id] || 0
                        const duration = calculateParkingDuration(record.entryTime || "")

                        return (
                          <div key={record.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className="px-2 py-1 rounded-lg text-xs font-medium bg-emerald-400/20 text-emerald-400 border border-emerald-400/30">
                                    Зогсож байна
                                  </span>
                                  <span className="text-white/50 text-xs">
                                    {formatDetailedTime(record.entryTime || "")}
                                  </span>
                                </div>
                                <p className="text-white text-sm">
                                  <span className="text-white/70">Машин:</span> {record.carNumber}
                                </p>
                                <p className="text-white text-sm">
                                  <span className="text-white/70">Жолооч:</span> {record.driverName}
                                </p>
                                <p className="text-white text-sm">
                                  <span className="text-white/70">Талбай:</span> {record.parkingArea}
                                </p>
                                <p className="text-white/50 text-xs">
                                  Зогссон хугацаа: {duration === 0 ? "1 минутаас бага" : `${duration} минут`}
                                </p>
                              </div>
                              <div className="text-right ml-4">
                                <p className="font-semibold text-emerald-400 text-lg animate-pulse">
                                  {currentFee === 0 ? "Үнэгүй" : `${currentFee} ₮`}
                                </p>
                                <p className="text-xs text-white/50">{pricingConfig.pricePerMinute}₮/минут</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    {recentRecords.filter((record) => record.type === "entry" && !record.exitTime).length === 0 && (
                      <p className="text-center text-white/50 py-8">Одоо зогсоолд машин байхгүй байгаа</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-6">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                {/* Filter Section */}
                <div className="mb-6 space-y-4">
                  {/* Header with Filter Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-2">Түүх харах</h2>
                      <p className="text-white/70 text-sm">Бүх орсон/гарсан бүртгэлийн түүх</p>
                    </div>
                    <button
                      onClick={() => setFilterCollapsed(!filterCollapsed)}
                      className="p-2 text-white/70 hover:text-white transition-all duration-200"
                    >
                      <svg
                        className={`w-6 h-6 transition-transform duration-300 ${filterCollapsed ? "" : "rotate-180"}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Collapsible Filter Content */}
                  {!filterCollapsed && (
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 animate-in slide-in-from-top duration-300 ease-out">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Year Filter */}
                        <div className="space-y-3">
                          <label className="text-white/80 text-sm font-medium flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            Он сонгох
                          </label>
                          <div className="relative">
                            <select
                              value={filterYear}
                              onChange={(e) => setFilterYear(e.target.value)}
                              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 appearance-none cursor-pointer"
                            >
                              <option value="" className="bg-gray-900 text-white">
                                Бүх он
                              </option>
                              {getAvailableYears().map((year) => (
                                <option key={year} value={year.toString()} className="bg-gray-900 text-white">
                                  {year}
                                </option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <svg
                                className="w-5 h-5 text-white/50"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Month Filter */}
                        <div className="space-y-3">
                          <label className="text-white/80 text-sm font-medium flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            Сар сонгох
                          </label>
                          <div className="relative">
                            <select
                              value={filterMonth}
                              onChange={(e) => setFilterMonth(e.target.value)}
                              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 appearance-none cursor-pointer"
                            >
                              <option value="" className="bg-gray-900 text-white">
                                Бүх сар
                              </option>
                              <option value="01" className="bg-gray-900 text-white">
                                1-р сар
                              </option>
                              <option value="02" className="bg-gray-900 text-white">
                                2-р сар
                              </option>
                              <option value="03" className="bg-gray-900 text-white">
                                3-р сар
                              </option>
                              <option value="04" className="bg-gray-900 text-white">
                                4-р сар
                              </option>
                              <option value="05" className="bg-gray-900 text-white">
                                5-р сар
                              </option>
                              <option value="06" className="bg-gray-900 text-white">
                                6-р сар
                              </option>
                              <option value="07" className="bg-gray-900 text-white">
                                7-р сар
                              </option>
                              <option value="08" className="bg-gray-900 text-white">
                                8-р сар
                              </option>
                              <option value="09" className="bg-gray-900 text-white">
                                9-р сар
                              </option>
                              <option value="10" className="bg-gray-900 text-white">
                                10-р сар
                              </option>
                              <option value="11" className="bg-gray-900 text-white">
                                11-р сар
                              </option>
                              <option value="12" className="bg-gray-900 text-white">
                                12-р сар
                              </option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <svg
                                className="w-5 h-5 text-white/50"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Type Filter - NEW */}
                        <div className="space-y-3">
                          <label className="text-white/80 text-sm font-medium flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                              />
                            </svg>
                            Төрөл сонгох
                          </label>
                          <div className="relative">
                            <select
                              value={filterType}
                              onChange={(e) => setFilterType(e.target.value)}
                              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 appearance-none cursor-pointer"
                            >
                              <option value="" className="bg-gray-900 text-white">
                                Бүх төрөл
                              </option>
                              <option value="entry" className="bg-gray-900 text-white">
                                Орсон
                              </option>
                              <option value="exit" className="bg-gray-900 text-white">
                                Гарсан
                              </option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <svg
                                className="w-5 h-5 text-white/50"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Car Number Filter */}
                        <div className="space-y-3">
                          <label className="text-white/80 text-sm font-medium flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0
01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            Машины дугаар
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={filterCarNumber}
                              onChange={(e) => setFilterCarNumber(e.target.value)}
                              placeholder="1234 УНМ"
                              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <Search className="w-5 h-5 text-white/50" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Active Filters Display */}
                      {(filterYear || filterMonth || filterCarNumber || filterType) && (
                        <div className="mt-6 pt-4 border-t border-white/10">
                          <div className="flex flex-wrap gap-2">
                            <span className="text-white/70 text-sm">Идэвхтэй шүүлтүүр:</span>
                            {filterYear && (
                              <span className="inline-flex items-center px-3 py-1 bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 rounded-lg text-sm">
                                Он: {filterYear}
                                <button onClick={() => setFilterYear("")} className="ml-2 hover:text-emerald-300">
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            )}
                            {filterMonth && (
                              <span className="inline-flex items-center px-3 py-1 bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 rounded-lg text-sm">
                                Сар: {filterMonth}
                                <button onClick={() => setFilterMonth("")} className="ml-2 hover:text-emerald-300">
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            )}
                            {filterType && (
                              <span className="inline-flex items-center px-3 py-1 bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 rounded-lg text-sm">
                                Төрөл: {filterType === "entry" ? "Орсон" : "Гарсан"}
                                <button onClick={() => setFilterType("")} className="ml-2 hover:text-emerald-300">
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            )}
                            {filterCarNumber && (
                              <span className="inline-flex items-center px-3 py-1 bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 rounded-lg text-sm">
                                Машин: {filterCarNumber}
                                <button onClick={() => setFilterCarNumber("")} className="ml-2 hover:text-emerald-300">
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Results Count */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3">
                    <div className="flex items-center text-white/80">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z"
                        />
                      </svg>
                      <span className="font-medium">{filteredRecords.length} бүртгэл олдлоо</span>
                    </div>
                  </div>
                </div>

                {/* Records List */}
                {filteredRecords.length === 0 ? (
                  <p className="text-center text-white/50 py-12">
                    {filterYear || filterMonth || filterCarNumber || filterType
                      ? "Хайлтын үр дүн олдсонгүй"
                      : "Түүх байхгүй байна"}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {filteredRecords
                      .filter(
                        (record) =>
                          record.type === "exit" ||
                          record.type === "completed" ||
                          (record.type === "entry" && record.exitTime),
                      )
                      .map((record) => (
                        <div key={record.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span
                              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                                record.type === "entry"
                                  ? "bg-emerald-400/20 text-emerald-400 border border-emerald-400/30"
                                  : "bg-red-500/20 text-red-400 border border-red-500/30"
                              }`}
                            >
                              {record.type === "entry" ? "Орсон" : "Гарсан"}
                            </span>
                            <span className="text-white/50 text-sm">{record.entryTime || record.exitTime}</span>
                          </div>
                          <div className="space-y-2">
                            <p className="text-white">
                              <span className="text-white/70">Машин:</span> {record.carNumber}
                            </p>
                            <p className="text-white">
                              <span className="text-white/70">Жолооч:</span> {record.driverName}
                            </p>
                            <p className="text-white">
                              <span className="text-white/70">Талбай:</span> {record.parkingArea}
                            </p>
                            <p className="text-emerald-400 text-lg font-semibold">
                              <span className="text-white/70 text-base font-normal">Төлбөр:</span> {record.amount} ₮
                            </p>
                            {record.parkingDuration && (
                              <p className="text-white/50 text-sm">Зогссон хугацаа: {record.parkingDuration} минут</p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-white mb-2">Профайл</h2>
                  <p className="text-white/70 text-sm">Хувийн мэдээлэл засах</p>
                </div>

                <div className="flex justify-center mb-8">
                  <div className="relative">
                    <div className="w-24 h-24 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center overflow-hidden">
                      {profile.profileImage ? (
                        <img
                          src={profile.profileImage || "/placeholder.svg"}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white text-3xl font-bold">
                          {profile.name ? profile.name.charAt(0).toUpperCase() : "👤"}
                        </span>
                      )}
                    </div>
                    {editing && (
                      <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-400 rounded-full flex items-center justify-center cursor-pointer hover:bg-emerald-500 transition-colors">
                        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-white/70 text-sm">Нэр</label>
                    <input
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      placeholder="Нэрээ оруулна уу"
                      disabled={!editing}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-white/70 text-sm">Утасны дугаар</label>
                    <input
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="Утасны дугаараа оруулна уу"
                      disabled={!editing}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-white/70 text-sm">И-мэйл</label>
                    <input
                      value={profile.email}
                      disabled
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/50"
                    />
                  </div>

                  <div className="border-t border-white/10 pt-6">
                    <div className="flex space-x-4">
                      {editing ? (
                        <>
                          <button
                            onClick={saveProfile}
                            disabled={profileLoading}
                            className="flex-1 py-3 bg-emerald-400 hover:bg-emerald-500 text-black font-semibold rounded-xl transition-colors disabled:opacity-50"
                          >
                            {profileLoading ? "Хадгалж байна..." : "Хадгалах"}
                          </button>
                          <button
                            onClick={() => {
                              setEditing(false)
                              loadProfile()
                            }}
                            disabled={profileLoading}
                            className="flex-1 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors"
                          >
                            Цуцлах
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setEditing(true)}
                          className="flex-1 py-3 bg-emerald-400 hover:bg-emerald-500 text-black font-semibold rounded-xl transition-colors"
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
      </div>

      {/* Bottom Navigation - Mobile/Tablet Only */}
      <div className="lg:hidden fixed bottom-3 md:bottom-6 left-4 right-4 md:left-12 md:right-12 z-50">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl md:rounded-2xl shadow-lg">
          <div className="flex justify-around items-center py-3 md:py-4 px-2 md:px-4">
            <button
              onClick={() => setActiveTab("home")}
              className="flex items-center justify-center p-3 md:p-4 rounded-lg transition-colors"
            >
              <Home
                className={`w-6 h-6 md:w-7 md:h-7 ${activeTab === "home" ? "text-emerald-400" : "text-white/70"}`}
              />
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className="flex items-center justify-center p-3 md:p-4 rounded-lg transition-colors"
            >
              <History
                className={`w-6 h-6 md:w-7 md:h-7 ${activeTab === "history" ? "text-emerald-400" : "text-white/70"}`}
              />
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className="flex items-center justify-center p-3 md:p-4 rounded-lg transition-colors"
            >
              <User
                className={`w-6 h-6 md:w-7 md:h-7 ${activeTab === "profile" ? "text-emerald-400" : "text-white/70"}`}
              />
            </button>
            <button
              onClick={handleLogoutClick}
              className="flex items-center justify-center p-3 md:p-4 rounded-lg transition-colors hover:bg-red-500/10"
            >
              <LogOut className="w-6 h-6 md:w-7 md:h-7 text-white/70 hover:text-red-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Custom Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cancelLogout}></div>

          {/* Modal */}
          <div className="relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mx-4 max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              {/* Icon */}
              <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                <LogOut className="w-8 h-8 text-red-400" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-white mb-2">Гарах</h3>

              {/* Message */}
              <p className="text-white/70 text-sm mb-6">Та гарахдаа итгэлтэй байна уу?</p>

              {/* Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={cancelLogout}
                  className="flex-1 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium rounded-xl hover:bg-white/20 transition-colors"
                >
                  Үгүй
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 py-3 bg-emerald-400 hover:bg-emerald-500 text-black font-medium rounded-xl transition-colors"
                >
                  Тийм
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

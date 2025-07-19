export interface User {
  uid: string
  email: string
  name: string
  role: "manager" | "employee" | "driver"
  createdAt: string
  profileImage?: string
}

export interface UserData {
  name: string
  email: string
  role: "manager" | "employee" | "driver"
  createdAt: string
  profileImage?: string
}

export interface UserProfile {
  id: string
  name: string
  email: string
  phone: string
  role: "manager" | "employee" | "driver"
  active: boolean
  createdAt: string
  updatedAt?: string
  profileImage?: string
  position?: string
  startDate?: string
  tempPassword?: string
  needsPasswordSetup?: boolean
  createdBy?: string
}

export interface DriverRegistration {
  email: string
  password: string
  name: string
  phone: string
  role: "manager" | "employee" | "driver"
  createdAt: string
}

export interface ParkingRecord {
  id?: string
  carNumber: string
  driverName?: string
  mechanicName?: string
  parkingArea?: string
  carBrand?: string
  entryTime?: string
  exitTime?: string
  timestamp: string
  type: "entry" | "exit" | "completed"
  amount?: number
  parkingDuration?: number | string
  images?: string[]
  paymentStatus?: "paid" | "unpaid"
  paymentMethod?: "cash" | "card" | "transfer" | "split"
  cashAmount?: number
  cardAmount?: number
  transferAmount?: number
  paidAt?: string
  updatedAt?: string
  updatedBy?: string
  employeeId?: string
  driverId?: string
}

export interface SiteConfig {
  siteName: string
  siteLogo: string
  siteBackground?: string
  updatedAt?: string
  updatedBy?: string
}

export interface PricingConfig {
  pricePerMinute: number
  updatedAt?: string
  updatedBy?: string
}

export interface ReportFilter {
  startDate: string
  endDate: string
  employeeId?: string
  status?: "all" | "parked" | "completed"
  plateNumber?: string
}

export interface DashboardStats {
  totalCustomers: number
  totalRevenue: number
  currentlyParked: number
  todayRevenue: number
  weeklyRevenue: number
  monthlyRevenue: number
}

export interface ChartData {
  name: string
  value: number
  date?: string
}

// Employee interface for the employees node in database
export interface Employee {
  id: string
  name: string
  position?: string
  phone?: string
  email?: string
  startDate?: string
  profileImage?: string
  active: boolean
  createdAt: string
  updatedAt?: string
  createdBy?: string
}

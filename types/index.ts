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
}

export interface DriverRegistration {
  email: string
  password: string
  name: string
  phone: string
  role: "manager" | "employee" | "driver"
  createdAt: string
  createdBy: string
  active: boolean
}

export interface ParkingRecord {
  id: string
  plateNumber: string
  entryTime: string
  exitTime?: string
  status: "parked" | "completed"
  duration?: number
  amount?: number
  employeeId: string
  employeeName: string
  carNumber: string
  carBrand?: string
  mechanicName?: string
  driverName?: string
  parkingArea?: string
  parkingDuration?: string
  timestamp: string
  type: "entry" | "exit" | "completed"
  images?: string[]
  paymentStatus?: "paid" | "unpaid"
  paymentMethod?: "card" | "cash" | "transfer"
  paidAt?: string
  updatedAt?: string
  updatedBy?: string
}

export interface SiteConfig {
  siteName: string
  siteLogo: string
  siteBackground: string
  backgroundColor?: string
  primaryColor?: string
  secondaryColor?: string
  parkingRate?: number
  additionalRate?: number
  createdAt?: string
  updatedAt?: string
  updatedBy?: string
  version?: string
  description?: string
  features?: {
    realTimeUpdates?: boolean
    imageSupport?: boolean
    multiUser?: boolean
    reporting?: boolean
    mobileSupport?: boolean
  }
  theme?: {
    primaryColor?: string
    secondaryColor?: string
    backgroundColor?: string
  }
}

export interface PricingConfig {
  pricePerMinute: number
  firstHourRate?: number
  additionalHourRate?: number
  dailyMaxRate?: number
  weeklyRate?: number
  monthlyRate?: number
  updatedAt?: string
  updatedBy?: string
}

export interface ReportFilter {
  startDate: string
  endDate: string
  employeeId?: string
  status?: "all" | "parked" | "completed"
  plateNumber?: string
  paymentStatus?: "all" | "paid" | "unpaid"
}

export interface DashboardStats {
  totalCustomers: number
  totalRevenue: number
  currentlyParked: number
  todayRevenue: number
  weeklyRevenue: number
  monthlyRevenue: number
  activeRecords: number
  todayCustomers: number
  averageSessionTime: number
  averageRevenue: number
}

export interface ChartData {
  name: string
  value: number
  date?: string
  period?: string
  customers?: number
  revenue?: number
}

export interface MonthlyStats {
  period: string
  customers: number
  revenue: number
  date: string
}

export interface DailyStats {
  day: string
  date: string
  customers: number
  revenue: number
}

export interface RecentActivity {
  id: string
  carNumber: string
  driverName: string
  timestamp: string
  type: "entry" | "exit" | "completed"
  amount?: number
  exitTime?: string
}

export interface Employee {
  id: string
  name: string
  position?: string
  phone: string
  email: string
  startDate?: string
  profileImage?: string
  active: boolean
  createdAt: string
  createdBy?: string
  updatedAt?: string
  role?: "employee"
}

export interface Manager {
  id: string
  name: string
  email: string
  phone: string
  role: "manager"
  active: boolean
  createdAt: string
  updatedAt?: string
  profileImage?: string
}

export interface Driver {
  id: string
  name: string
  email: string
  phone: string
  role: "driver"
  active: boolean
  createdAt: string
  updatedAt?: string
  profileImage?: string
}

export interface InstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

export interface PWAInstallState {
  isInstallable: boolean
  isInstalled: boolean
  canInstall: boolean
  installApp: () => Promise<boolean>
}

export interface CustomDateRange {
  startDate: string
  endDate: string
  useCustomRange: boolean
}

export interface PaymentDialogState {
  showPaymentDialog: boolean
  selectedRecord: ParkingRecord | null
  paymentStatus: "paid" | "unpaid"
  paymentMethod: "card" | "cash" | "transfer"
  paymentLoading: boolean
}

export interface ImageViewerState {
  showImageViewer: boolean
  currentImages: string[]
  currentImageIndex: number
}

export interface ProfileData {
  name: string
  phone: string
  email: string
  profileImage: string
}

export interface PasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface ExportOptions {
  dateRangeStart: string
  dateRangeEnd: string
  deleteAfterExport: boolean
  exportLoading: boolean
}

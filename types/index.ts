export interface ParkingRecord {
  id: string
  carNumber: string
  driverName: string
  parkingArea: string
  entryTime?: string
  exitTime?: string
  amount: number
  type: "entry" | "exit"
  timestamp: string
}

export interface UserProfile {
  name: string
  phone: string
  email: string
  role?: "manager" | "driver"
  profileImage?: string
  updatedAt?: string
  createdAt?: string
  active?: boolean // Add active status
}

export interface DriverRegistration {
  id?: string
  email: string
  password: string
  name: string
  phone: string
  role: "driver"
  createdAt: string
  createdBy: string
  active?: boolean // Add active status
}

export interface PricingConfig {
  pricePerMinute: number
  updatedAt?: string
  updatedBy?: string
}

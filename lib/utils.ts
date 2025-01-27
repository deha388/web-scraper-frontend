import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isAuthenticated() {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token")
    return !!token
  }
  return false
}

export function setAuthToken(token: string) {
  localStorage.setItem("token", token)
}

export function getAuthToken() {
  return localStorage.getItem("token")
}

export function removeAuthToken() {
  localStorage.removeItem("token")
  // Ek olarak, diğer yerel depolama verilerini de temizleyelim
  localStorage.removeItem("botState_Nausys")
  localStorage.removeItem("botState_MMK")
}


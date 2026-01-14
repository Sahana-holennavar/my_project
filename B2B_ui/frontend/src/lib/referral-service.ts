// src/lib/referral-service.ts

import { db } from './firebase-config'
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'

export interface ContestUser {
  projectName: string
  description: string
  startDate: string
  endDate: string
  fullName: string
  email: string
  phone: string
  qualification: string
  teamMembers: any[]
  referralCode: string
  referredBy: string | null
  referralCount: number
  createdAt: Date
  projectImageName?: string
  projectVideoName?: string
}

export class ReferralService {
  
  // Generate unique referral code
  static generateReferralCode(): string {
    return "REF" + Math.floor(100000 + Math.random() * 900000)
  }

  // Check if email already exists
  static async checkEmailExists(email: string): Promise<boolean> {
    const emailQuery = query(
      collection(db, "contest_users"), 
      where("email", "==", email)
    )
    const emailSnap = await getDocs(emailQuery)
    return !emailSnap.empty
  }

  // Check if phone already exists
  static async checkPhoneExists(phone: string): Promise<boolean> {
    const phoneQuery = query(
      collection(db, "contest_users"), 
      where("phone", "==", phone)
    )
    const phoneSnap = await getDocs(phoneQuery)
    return !phoneSnap.empty
  }

  // Verify referral code exists
  static async verifyReferralCode(referralCode: string): Promise<boolean> {
    const refQuery = query(
      collection(db, "contest_users"), 
      where("referralCode", "==", referralCode)
    )
    const refSnap = await getDocs(refQuery)
    return !refSnap.empty
  }

  // Register user with referral
  static async registerUser(userData: Omit<ContestUser, 'referralCode' | 'referralCount' | 'createdAt'>): Promise<{
    success: boolean
    referralCode?: string
    referralLink?: string
    error?: string
  }> {
    try {
      // Check duplicates
      const emailExists = await this.checkEmailExists(userData.email)
      if (emailExists) {
        return { success: false, error: "This email is already registered." }
      }

      const phoneExists = await this.checkPhoneExists(userData.phone)
      if (phoneExists) {
        return { success: false, error: "This phone number is already registered." }
      }

      // Verify referral code if provided
      if (userData.referredBy) {
        const isValidRef = await this.verifyReferralCode(userData.referredBy)
        if (!isValidRef) {
          return { success: false, error: "Invalid referral code." }
        }
      }

      // Generate unique referral code
      const referralCode = this.generateReferralCode()

      // Save user
      await addDoc(collection(db, "contest_users"), {
        ...userData,
        referralCode,
        referralCount: 0,
        createdAt: new Date()
      })

      // Update referrer's count
      if (userData.referredBy) {
        await this.incrementReferralCount(userData.referredBy)
      }

      // Generate referral link
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
      const referralLink = `${origin}${pathname}?ref=${referralCode}`

      return {
        success: true,
        referralCode,
        referralLink
      }

    } catch (error) {
      console.error("Registration error:", error)
      return { success: false, error: "Registration failed. Please try again." }
    }
  }

  // Increment referral count for referrer
  static async incrementReferralCount(referralCode: string): Promise<void> {
    const refQuery = query(
      collection(db, "contest_users"), 
      where("referralCode", "==", referralCode)
    )
    const refSnap = await getDocs(refQuery)

    refSnap.forEach(async (docu) => {
      await updateDoc(doc(db, "contest_users", docu.id), {
        referralCount: docu.data().referralCount + 1
      })
    })
  }

  // Get referral stats (optional - for leaderboard)
  static async getReferralStats(referralCode: string): Promise<number> {
    const refQuery = query(
      collection(db, "contest_users"), 
      where("referralCode", "==", referralCode)
    )
    const refSnap = await getDocs(refQuery)
    
    if (refSnap.empty) return 0
    
    return refSnap.docs[0].data().referralCount || 0
  }

  // Get top referrers (optional - for leaderboard)
  static async getTopReferrers(limit: number = 10): Promise<any[]> {
    const allUsers = await getDocs(collection(db, "contest_users"))
    const users = allUsers.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    return users
      .sort((a, b) => (b.referralCount || 0) - (a.referralCount || 0))
      .slice(0, limit)
  }
}
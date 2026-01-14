'use client'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Shield, FileText, AlertTriangle, UserX, Scale, Eye, Lock, CheckCircle } from 'lucide-react'

interface TermsPrivacyDialogProps {
  children: React.ReactNode
}

export function TermsPrivacyDialog({ children }: TermsPrivacyDialogProps) {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms')

  const termsContent = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 text-lg font-semibold text-brand-gray-800 mb-4">
        <Scale className="w-5 h-5 text-brand-blue-600" />
        Terms & Conditions
      </div>
      
      <div className="space-y-3 text-sm text-brand-gray-700">
        <p className="font-medium text-brand-gray-900">By using our platform, you agree to abide by the following rules:</p>
        
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-brand-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium">Prohibited Content:</span> Any posts, comments, or shared content that are political, party-affiliated, or religious in nature are strictly not allowed.
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <UserX className="w-4 h-4 text-brand-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium">Abuse & Harassment:</span> Abusive, offensive, or inappropriate language or behavior in posts or comments will not be tolerated.
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-brand-orange-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium">Uncivil Conduct:</span> Actions that disturb community harmony, spread misinformation, or show disrespect towards other users are prohibited.
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-brand-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium">Account Termination:</span> Users engaging in the above activities may face immediate suspension or permanent termination of their account without prior notice.
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <Scale className="w-4 h-4 text-brand-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium">Legal Action:</span> If required, legal measures may be taken against individuals violating these terms.
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )

  const privacyContent = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 text-lg font-semibold text-brand-gray-800 mb-4">
        <Eye className="w-5 h-5 text-brand-green-600" />
        Privacy Policy
      </div>
      
      <div className="space-y-3 text-sm text-brand-gray-700">
        <p className="font-medium text-brand-gray-900">We value your privacy and only collect information necessary to provide and improve our services.</p>
        
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-brand-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium">Data Protection:</span> User data is not shared with third parties except when required by law or to protect the rights and safety of the platform and its users.
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-brand-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium">Legal Compliance:</span> Any misuse of the platform that leads to legal concerns may result in disclosure of user information to appropriate authorities.
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-brand-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium">Consent:</span> By using our services, you consent to the collection and fair use of your information as described in this policy.
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">Legal Information</DialogTitle>
          <DialogDescription className="text-center">
            Please review our terms and privacy policy
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex border-b border-brand-gray-200">
            <button
              onClick={() => setActiveTab('terms')}
              className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                activeTab === 'terms'
                  ? 'border-b-2 border-brand-blue-600 text-brand-blue-600'
                  : 'text-brand-gray-500 hover:text-brand-gray-700'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Terms & Conditions
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                activeTab === 'privacy'
                  ? 'border-b-2 border-brand-blue-600 text-brand-blue-600'
                  : 'text-brand-gray-500 hover:text-brand-gray-700'
              }`}
            >
              <Shield className="w-4 h-4 inline mr-2" />
              Privacy Policy
            </button>
          </div>
          
          <Card>
            <CardContent className="p-4">
              {activeTab === 'terms' ? termsContent : privacyContent}
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button variant="outline" size="sm">
              View More
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

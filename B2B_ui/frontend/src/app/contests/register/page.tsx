'use client'

import { useState } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { FileText, Users, Calendar, ImageIcon, VideoIcon, CheckCircle, X, Trash2 } from "lucide-react"

/* ---------------- CONSTANTS ---------------- */
const QUALIFICATIONS = ["BE", "BTech", "MTech", "BCA", "MCA", "BSc", "MSc"]
const MAX_MEMBERS = 3
const SHARE_URL = "https://yourdomain.com/contest"
const SHARE_TEXT = "Techvruk Innovation Contest\n\nDon't let your friends miss out! Help us build a hub of innovation by inviting them to share their latest tech breakthroughs. Let's spark a wave of inspiration for young professionals everywhere!"

type TeamMember = {
  name: string
  email: string
}

export default function ContestRegisterPage() {
  /* ---------------- FORM STATES ---------------- */
  const [projectName, setProjectName] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [qualification, setQualification] = useState("")
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([{ name: "", email: "" }])
  const [projectImage, setProjectImage] = useState<File | null>(null)
  const [projectVideo, setProjectVideo] = useState<File | null>(null)

  /* ---------------- TERMS & SHARE STATES ---------------- */
  const [agreed, setAgreed] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shared, setShared] = useState(false)

  const isFormValid = projectName && description && startDate && endDate && fullName && email && phone.length === 10 && qualification && projectImage && projectVideo && agreed

  /* ---------------- TEAM LOGIC ---------------- */
  const addMember = () => {
    if (teamMembers.length < MAX_MEMBERS) setTeamMembers([...teamMembers, { name: "", email: "" }])
  }

  const updateMember = (i: number, field: keyof TeamMember, value: string) => {
    const updated = [...teamMembers]
    updated[i][field] = value
    setTeamMembers(updated)
  }

  const removeMember = (i: number) => {
    setTeamMembers(teamMembers.filter((_, idx) => idx !== i))
  }

  /* ---------------- SHARE LOGIC ---------------- */
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Techvruk Contest",
          text: SHARE_TEXT,
          url: SHARE_URL
        })
      } else {
        window.open(https://wa.me/?text=${encodeURIComponent(SHARE_TEXT + "\n" + SHARE_URL)}, "_blank")
      }
      setShared(true)
    } catch {
      console.log("Share cancelled")
    }
  }

  const handleFinalSubmit = () => {
    alert("✅ Project Submitted Successfully!")
    // Reset form
    setProjectName("")
    setDescription("")
    setStartDate("")
    setEndDate("")
    setFullName("")
    setEmail("")
    setPhone("")
    setQualification("")
    setTeamMembers([{ name: "", email: "" }])
    setProjectImage(null)
    setProjectVideo(null)
    setAgreed(false)
    setShared(false)
    setShowShareModal(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gray-50">
      <div className="w-full max-w-3xl bg-white rounded-3xl p-8 space-y-8 shadow-lg">
        {/* ---------------- PROJECT DETAILS ---------------- */}
        <Section title="Project Details" icon={<FileText />}>
          <Input 
            placeholder="Project Name" 
            value={projectName} 
            onChange={(e) => setProjectName(e.target.value)} 
          />
          <Textarea 
            placeholder="Project Description (Max 500 characters)" 
            value={description} 
            onChange={(e) => setDescription(e.target.value.slice(0, 500))} 
          />
          <p className="text-sm text-gray-500">{description.length}/500</p>
        </Section>

        {/* ---------------- PERSONAL DETAILS ---------------- */}
        <Section title="Personal Details" icon={<Users />}>
          <div className="grid md:grid-cols-2 gap-4">
            <Input placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input 
              placeholder="Phone" 
              maxLength={10} 
              value={phone} 
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} 
            />
            <select 
              className="bg-gray-100 rounded-md px-3 py-2" 
              value={qualification} 
              onChange={(e) => setQualification(e.target.value)}
            >
              <option value="">Qualification</option>
              {QUALIFICATIONS.map(q => <option key={q}>{q}</option>)}
            </select>
          </div>
        </Section>

        {/* ---------------- TEAM MEMBERS ---------------- */}
        <Section title="Team Members (Max 3)" icon={<Users />}>
          {teamMembers.map((m, i) => (
            <div key={i} className="grid md:grid-cols-4 gap-3 items-center">
              <Input 
                placeholder="Member Name *" 
                value={m.name} 
                onChange={(e) => updateMember(i, "name", e.target.value)} 
              />
              <Input 
                placeholder="Member Email *" 
                value={m.email} 
                onChange={(e) => updateMember(i, "email", e.target.value)} 
              />
              <Input 
                placeholder="Member Phone *" 
                maxLength={10} 
                value={m.phone || ""} 
                onChange={(e) => updateMember(i, "phone", e.target.value.replace(/\D/g, ""))} 
              />
              {teamMembers.length > 1 && (
                <button onClick={() => removeMember(i)} className="text-red-600 hover:text-red-800">
                  <Trash2 />
                </button>
              )}
            </div>
          ))}
          {teamMembers.length < MAX_MEMBERS && <Button variant="outline" onClick={addMember}>+ Add Member</Button>}
        </Section>

        {/* ---------------- PROJECT DURATION ---------------- */}
        <Section title="Project Duration" icon={<Calendar />}>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">End Date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </Section>

        {/* ---------------- PROJECT MEDIA ---------------- */}
        <Section title="Project Media">
          <div className="grid md:grid-cols-2 gap-4">
            <UploadBox icon={<ImageIcon />} label="Upload Image" accept="image/*" file={projectImage} onSelect={setProjectImage} />
            <UploadBox icon={<VideoIcon />} label="Upload Video" accept="video/*" file={projectVideo} onSelect={setProjectVideo} />
          </div>
        </Section>

        {/* ---------------- TERMS & PRIVACY ---------------- */}
        <div className="flex gap-3 items-start border-t pt-4">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
          <p className="text-sm text-gray-700">
            <strong>I have read and agree to the{' '}</strong>
            <span onClick={() => setShowTerms(true)} className="text-blue-600 cursor-pointer underline font-bold">
              Terms & Conditions
            </span>{' '}
            <strong>and</strong>{' '}
            <span onClick={() => setShowPrivacy(true)} className="text-blue-600 cursor-pointer underline font-bold">
              Privacy Policy
            </span>.
          </p>
        </div>

        {/* ---------------- SUBMIT BUTTON ---------------- */}
        <div className="flex justify-center mt-4">
          <Button disabled={!isFormValid} onClick={() => setShowShareModal(true)}>Submit</Button>
        </div>

        {/* ---------------- TERMS MODAL ---------------- */}
        {showTerms && (
          <Modal title="Terms & Conditions" onClose={() => setShowTerms(false)}>
            <div className="space-y-4 text-sm text-gray-700">
              <p className="font-semibold">1. Eligibility and Participation</p>
              <ul className="list-disc ml-5 space-y-1">
                <li><strong>Academic Qualification:</strong> The contest is open exclusively to final-year students enrolled in B.E., B.Tech, M.Tech, BCA, MCA, B.Sc., or M.Sc. programs from any recognized institution across India.</li>
                <li><strong>Originality:</strong> All submissions must be original. Any project found to be plagiarized, stolen, or infringing upon existing intellectual property will be disqualified immediately.</li>
              </ul>
              <p className="font-semibold">2. Project Scope and Criteria</p>
              <ul className="list-disc ml-5 space-y-1">
                <li><strong>Themes:</strong> Innovation and practical solutions in Engineering & Technology, Human Welfare, Environmental Sustainability, or related sectors.</li>
                <li><strong>Updates & Engagement:</strong> Teams must provide regular progress updates on the Techvruk platform.
                  <ul className="list-disc ml-5 mt-1">
                    <li>Mandatory: Minimum of one (1) update per month.</li>
                    <li>Recommended: Two (2) updates per month.</li>
                  </ul>
                </li>
              </ul>
              <p className="font-semibold">3. Intellectual Property and Ownership</p>
              <ul className="list-disc ml-5 space-y-1">
                <li><strong>Ownership:</strong> Full ownership of the project and intellectual property remains with the participants.</li>
                <li><strong>Liability:</strong> Techvruk is a facilitation platform and shall not be responsible for unauthorized use or copying by third parties.</li>
              </ul>
              <p className="font-semibold">4. Dispute Resolution and Disqualification</p>
              <ul className="list-disc ml-5 space-y-1">
                <li><strong>Ownership Claims:</strong> If valid third-party ownership claims arise, Techvruk reserves the right to disqualify the submission.</li>
                <li><strong>Final Decision:</strong> All eligibility and disqualification decisions rest solely with Techvruk.</li>
              </ul>
            </div>
          </Modal>
        )}

        {/* ---------------- PRIVACY MODAL ---------------- */}
        {showPrivacy && (
          <Modal title="Privacy Policy" onClose={() => setShowPrivacy(false)}>
            <div className="space-y-4 text-sm text-gray-700">
              <p className="font-semibold">1. Information We Collect</p>
              <p>To facilitate the contest, Techvruk collects the following information:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li><strong>Personal Identification:</strong> Names, contact numbers, email addresses, and college/university details.</li>
                <li><strong>Academic Proof:</strong> Information verifying your enrollment in final-year B.E, B.Tech, M.Tech, BCA, MCA, B.Sc, or M.Sc programs.</li>
                <li><strong>Project Content:</strong> Project titles, descriptions, images, videos, and progress updates posted on the platform.</li>
              </ul>
              <p className="font-semibold">2. How We Use Your Data</p>
              <p>The information collected is used strictly for:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Verifying eligibility for the contest.</li>
                <li>Communicating contest updates, milestones, and results.</li>
                <li>Promoting innovative ideas on the Techvruk platform to encourage young professionals.</li>
                <li>Judging and evaluating submissions for the final awards.</li>
              </ul>
              <p className="font-semibold">3. Public Visibility and Posts</p>
              <p>By participating, you acknowledge that project updates posted on the Techvruk platform are publicly visible. While Techvruk provides the platform for visibility, we are not responsible for how other users may view or interact with the information you choose to share publicly.</p>
              <p className="font-semibold">4. Data Sharing and Third Parties</p>
              <ul className="list-disc ml-5 space-y-1">
                <li><strong>No Sale of Data:</strong> Techvruk does not sell, trade, or rent your personal information to third parties.</li>
                <li><strong>Judges and Partners:</strong> Your project details may be shared with designated industry experts and judges for evaluation purposes.</li>
                <li><strong>Legal Compliance:</strong> Information may be disclosed if required by law or to protect the integrity of the contest.</li>
              </ul>
              <p className="font-semibold">5. Intellectual Property Protection</p>
              <p>While Techvruk hosts your project data, ownership remains with you as stated in our Terms and Conditions. Participants are encouraged not to share sensitive or patentable technical details publicly until appropriate protection has been secured.</p>
              <p className="font-semibold">6. Data Retention</p>
              <p>Personal and project information is retained for the duration of the contest and for a reasonable period thereafter for archiving, alumni recognition, and promotional highlights of past winners.</p>
              <p className="font-semibold">7. Consent</p>
              <p>By registering for the contest and creating a profile on the Techvruk platform, you consent to the collection and processing of your data as outlined in this Privacy Policy.</p>
            </div>
          </Modal>
        )}

        {/* ---------------- SHARE MODAL ---------------- */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-[999]">
            <motion.div 
              initial={{ y: 300, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              className="bg-white w-full sm:max-w-md rounded-3xl p-6 text-gray-900 relative shadow-lg"
            >
              <p className="text-sm mb-4 font-bold flex items-center gap-2">
                <span>📢</span>
                <span>Don't miss out! Invite your friends to share their tech breakthroughs and inspire young professionals!</span>
              </p>
              <img src="/tech-innovation-contest.png" alt="Poster" className="rounded-xl mb-4" />
              
              <Button 
                onClick={handleShare} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-4 flex items-center justify-center gap-2"
              >
                <span>🔗</span> Share Now
              </Button>
              
              {shared && (
                <Button 
                  onClick={handleFinalSubmit} 
                  className="bg-green-600 w-full mt-4 text-sm py-2 px-4 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="mr-2" /> Final Submit
                </Button>
              )}
              
              <button onClick={() => setShowShareModal(false)} className="absolute top-3 right-3">
                <X />
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------------- HELPERS ---------------- */
type SectionProps = {
  title: string
  icon: JSX.Element
  children: React.ReactNode
}

function Section({ title, icon, children }: SectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 font-semibold">{icon} {title}</h3>
      {children}
    </div>
  )
}

type UploadBoxProps = {
  icon: JSX.Element
  label: string
  accept: string
  file: File | null
  onSelect: (f: File) => void
}

function UploadBox({ icon, label, accept, file, onSelect }: UploadBoxProps) {
  return (
    <label className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer">
      <div className="flex flex-col items-center gap-2">
        {icon}
        <span>{label}</span>
        {file && <span className="text-green-600 text-xs">{file.name}</span>}
      </div>
      <input type="file" accept={accept} hidden onChange={(e) => e.target.files && onSelect(e.target.files[0])} />
    </label>
  )
}

type ModalProps = {
  title: string
  children: React.ReactNode
  onClose: () => void
}

function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <motion.div 
        initial={{ y: 300 }} 
        animate={{ y: 0 }} 
        className="bg-white w-full sm:max-w-2xl rounded-3xl p-6 max-h-[80vh] overflow-y-auto relative"
      >
        <h3 className="text-lg font-bold mb-4">{title}</h3>
        {children}
        <button onClick={onClose} className="absolute top-3 right-3">
          <X />
        </button>
      </motion.div>
    </div>
  )
}
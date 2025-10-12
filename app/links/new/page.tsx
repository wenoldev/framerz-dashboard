"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { motion } from "framer-motion"
import { UploadCloud, CheckCircle } from "lucide-react"

export default function NewLinkPage() {
  const router = useRouter()
  const [openSection, setOpenSection] = useState("step1")
  const [payload, setPayload] = useState({
    customer_name: "",
    mind_file_url: "",
    video_url: "",
    thumbnail_url: "",
  })
  const [error, setError] = useState<string | null>(null)

  const steps = [
    { id: "step1", label: "Customer Name" },
    { id: "step2", label: "Mind File Upload" },
    { id: "step3", label: "Video Upload" },
    { id: "step4", label: "Thumbnail Upload" },
  ]

  // Check if all fields are filled
  const isSubmitEnabled = 
    payload.customer_name.trim() !== "" &&
    payload.mind_file_url !== "" &&
    payload.video_url !== "" &&
    payload.thumbnail_url !== ""

  async function onSubmit() {
    try {
      if (!payload.customer_name) throw new Error("Customer name is required")
      if (!payload.mind_file_url) throw new Error("Mind file is required")

      const res = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 402) {
        window.location.href = data.payUrl
        return
      }

      if (!res.ok) throw new Error(data.error || "Failed to create link")

      toast.success("Link created successfully")
      router.push("/")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleNext = (currentId: string) => {
    const currentIndex = steps.findIndex(s => s.id === currentId)
    if (currentIndex < steps.length - 1) setOpenSection(steps[currentIndex + 1].id)
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-3xl font-semibold tracking-tight">Create Link</h1>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to Links
        </Button>
      </motion.div>

      <Accordion type="single" collapsible value={openSection} onValueChange={setOpenSection} className="space-y-4">
        {/* Step 1 */}
        <AccordionItem value="step1">
          <AccordionTrigger>Customer Name</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 p-4">
              <Label>Name</Label>
              <Input
                placeholder="Enter customer name"
                value={payload.customer_name}
                onChange={e => setPayload({ ...payload, customer_name: e.target.value })}
              />
              <Button className="w-full mt-3" onClick={() => handleNext("step1")}>
                Continue
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Step 2 */}
        <AccordionItem value="step2">
          <AccordionTrigger>Mind File Upload</AccordionTrigger>
          <AccordionContent>
            <DropZone
              label="Upload Mind File"
              fileUrl={payload.mind_file_url}
              onUpload={url => {
                setPayload({ ...payload, mind_file_url: url })
                handleNext("step2")
              }}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Step 3 */}
        <AccordionItem value="step3">
          <AccordionTrigger>Video Upload (Optional)</AccordionTrigger>
          <AccordionContent>
            <DropZone
              label="Upload Video"
              fileUrl={payload.video_url}
              onUpload={url => {
                setPayload({ ...payload, video_url: url })
                handleNext("step3")
              }}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Step 4 */}
        <AccordionItem value="step4">
          <AccordionTrigger>Thumbnail Upload (Optional)</AccordionTrigger>
          <AccordionContent>
            <DropZone
              label="Upload Thumbnail"
              fileUrl={payload.thumbnail_url}
              onUpload={url => setPayload({ ...payload, thumbnail_url: url })}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Submit Button */}
      <Button 
        className="w-full mt-5" 
        onClick={onSubmit}
        disabled={!isSubmitEnabled}
      >
        Submit
      </Button>

      {/* Error Dialog */}
      <Dialog open={!!error} onOpenChange={() => setError(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>⚠️ Missing Content</DialogTitle>
            <DialogDescription>{error}</DialogDescription>
          </DialogHeader>
          <Button onClick={() => setError(null)} className="w-full mt-3">
            OK
          </Button>
        </DialogContent>
      </Dialog>
    </main>
  )
}

/** DropZone component with click, drag, and file type validation */
function DropZone({
  label,
  fileUrl,
  onUpload,
}: {
  label: string
  fileUrl?: string
  onUpload: (url: string) => void
}) {
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Determine accepted file types based on label
  const getAccept = () => {
    if (label.toLowerCase().includes("mind")) return ".mind"
    if (label.toLowerCase().includes("video")) return "video/*"
    if (label.toLowerCase().includes("thumbnail")) return "image/*"
    return "*/*"
  }

  const validateFile = (file: File) => {
    const accept = getAccept()

    if (accept === ".mind" && !file.name.endsWith(".mind")) {
      toast.error("Please upload a valid .mind file")
      return false
    }
    if (accept === "video/*" && !file.type.startsWith("video/")) {
      toast.error("Please upload a valid video file")
      return false
    }
    if (accept === "image/*" && !file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file")
      return false
    }
    return true
  }

  const handleFile = (file: File) => {
    if (!validateFile(file)) return
    setFileName(file.name)
    onUpload(URL.createObjectURL(file)) // Mock upload preview
  }

  return (
    <motion.div
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 1 }}
      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors cursor-pointer ${
        dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:bg-gray-50"
      }`}
      onDragOver={e => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files?.[0]
        if (file) handleFile(file)
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={getAccept()}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {fileUrl ? (
        <div className="flex flex-col items-center gap-3">
          {/* Preview only for image/video */}
          {fileUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
            <img src={fileUrl} alt="preview" className="h-32 object-contain rounded-lg" />
          ) : fileUrl.match(/\.(mp4|webm)$/i) ? (
            <video src={fileUrl} controls className="h-32 rounded-lg" />
          ) : (
            <CheckCircle className="text-green-500 h-8 w-8" />
          )}
          <p className="font-medium text-sm">{fileName || "Uploaded successfully"}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <UploadCloud className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click or drag to upload {getAccept() === ".mind" ? ".mind file only" : ""}
          </p>
        </div>
      )}
    </motion.div>
  )
}
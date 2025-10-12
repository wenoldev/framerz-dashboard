"use client"
import { useState, useMemo, useRef, type DragEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { X, UploadCloud, FileText, ImageIcon, Film } from "lucide-react"

type InitialValues = {
  customer_name?: string
  mind_file_url?: string | null
  video_url?: string | null
  thumbnail_url?: string | null
}

type Props = {
  mode: "create" | "edit"
  initial?: InitialValues
  onSubmit: (payload: {
    customer_name: string
    mind_file_url?: string | null
    video_url?: string | null
    thumbnail_url?: string | null
    replaced?: {
      mind_file?: boolean
      video?: boolean
      thumbnail?: boolean
    }
  }) => Promise<void>
}

export default function LinkForm({ mode, initial, onSubmit }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [customerName, setCustomerName] = useState(initial?.customer_name || "")
  const [mindFile, setMindFile] = useState<File | null>(null)
  const [video, setVideo] = useState<File | null>(null)
  const [thumbnail, setThumbnail] = useState<File | null>(null)

  const mindInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)

  function formatSize(size: number) {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  async function uploadFile(file: File | null, fileType: "mind_file" | "video" | "thumbnail") {
    if (!file) return null
    const chunkSize = 5 * 1024 * 1024
    const totalChunks = Math.ceil(file.size / chunkSize)
    const uploadId = crypto.randomUUID()
    let uploadedChunks = 0
    const toastId = toast.loading(`Uploading ${labelForType(fileType)} 0%`)
    let url: string | null = null

    for (let index = 0; index < totalChunks; index++) {
      const start = index * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      const chunk = file.slice(start, end)

      const formData = new FormData()
      formData.append("chunk", chunk, file.name)
      formData.append("index", index.toString())
      formData.append("total", totalChunks.toString())
      formData.append("uploadId", uploadId)
      formData.append("fileName", file.name)
      formData.append("fileType", fileType)

      const response = await fetch("/api", { method: "POST", body: formData })
      if (!response.ok) {
        toast.error(`Failed to upload chunk ${index + 1} for ${labelForType(fileType)}`, { id: toastId })
        throw new Error(`Chunk upload failed for ${fileType}`)
      }
      const data = await response.json()
      if (data.status === "complete") url = data.url

      uploadedChunks++
      const progress = Math.round((uploadedChunks / totalChunks) * 100)
      toast.loading(`Uploading ${labelForType(fileType)} ${progress}%`, { id: toastId })
    }

    toast.dismiss(toastId)
    return url
  }

  function labelForType(t: "mind_file" | "video" | "thumbnail") {
    if (t === "mind_file") return ".mind file"
    if (t === "video") return "video"
    return "thumbnail"
  }

  function handleDrop(e: DragEvent, kind: "mind" | "video" | "thumb") {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (kind === "mind") {
      setMindFile(file)
    } else if (kind === "video") {
      setVideo(file)
    } else {
      setThumbnail(file)
    }
  }

  function prevent(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  async function handleSubmit() {
    setIsLoading(true)
    setError("")

    if (!customerName.trim()) {
      setError("Please enter a customer name")
      setIsLoading(false)
      return
    }

    try {
      if (mode === "create") {
        const pre = await fetch("/api/links/can-create", { cache: "no-store" })
        const can = pre.ok ? await pre.json() : { allowed: false }
        if (!can.allowed && can?.reason === "insufficient") {
          toast.error("Insufficient points. Redirecting to payment.")
          window.location.assign("/settings?topup=1")
          return
        }
      }

      // validations
      if (mindFile) {
        if (!mindFile.name.endsWith(".mind")) throw new Error("Please upload a valid .mind file")
        if (mindFile.size > 5 * 1024 * 1024) throw new Error("Mind file size must be less than 5MB")
      }
      if (video) {
        const validVideoTypes = ["video/mp4", "video/webm", "video/ogg"]
        if (!validVideoTypes.includes(video.type)) throw new Error("Please upload a valid video (MP4, WebM, or OGG)")
        if (video.size > 100 * 1024 * 1024) throw new Error("Video size must be less than 100MB")
      }
      if (thumbnail) {
        const validImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
        if (!validImageTypes.includes(thumbnail.type))
          throw new Error("Please upload a valid image thumbnail (JPEG, PNG, GIF, WebP)")
        if (thumbnail.size > 500 * 1024) throw new Error("Thumbnail size must be less than 500KB")
      }

      const [mind_file_url, video_url, thumbnail_url] = await Promise.all([
        uploadFile(mindFile, "mind_file"),
        uploadFile(video, "video"),
        uploadFile(thumbnail, "thumbnail"),
      ])

      await onSubmit({
        customer_name: customerName,
        mind_file_url: mind_file_url ?? (mode === "edit" ? (initial?.mind_file_url ?? null) : null),
        video_url: video_url ?? (mode === "edit" ? (initial?.video_url ?? null) : null),
        thumbnail_url: thumbnail_url ?? (mode === "edit" ? (initial?.thumbnail_url ?? null) : null),
        replaced: {
          mind_file: !!mindFile,
          video: !!video,
          thumbnail: !!thumbnail,
        },
      })
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error("Failed to submit")
      setError(err.message)
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const mindDisplay = useMemo(
    () =>
      mindFile
        ? { name: mindFile.name, size: formatSize(mindFile.size) }
        : initial?.mind_file_url
          ? { name: "Keeping current .mind file", size: "" }
          : null,
    [mindFile, initial?.mind_file_url],
  )
  const videoDisplay = useMemo(
    () =>
      video
        ? { name: video.name, size: formatSize(video.size) }
        : initial?.video_url
          ? { name: "Keeping current video", size: "" }
          : null,
    [video, initial?.video_url],
  )
  const thumbDisplay = useMemo(
    () =>
      thumbnail
        ? { name: thumbnail.name, size: formatSize(thumbnail.size) }
        : initial?.thumbnail_url
          ? { name: "Keeping current thumbnail", size: "" }
          : null,
    [thumbnail, initial?.thumbnail_url],
  )

  return (
    <Card className="border">
      <CardHeader>
        <CardTitle className="text-pretty">{mode === "edit" ? "Edit Link" : "Create New Link"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-2">
          <Label htmlFor="customer_name" className="text-sm font-medium">
            Customer name
          </Label>
          <Input
            id="customer_name"
            value={customerName}
            placeholder="Enter customer or project name"
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </section>

        <Separator />

        <section className="grid gap-6 md:grid-cols-3">
          {/* Mind file */}
          <div
            onDrop={(e) => handleDrop(e, "mind")}
            onDragOver={prevent}
            onDragEnter={prevent}
            className="rounded-md border bg-background p-4 text-center grid gap-3"
            aria-label=".mind file upload"
          >
            <div className="flex items-center justify-center">
              <UploadCloud className="h-6 w-6" aria-hidden />
            </div>
            <div className="text-sm">
              <p className="font-medium">Upload .mind file</p>
              <p className="text-muted-foreground">Drag & drop or choose file</p>
            </div>
            <div className="flex items-center justify-center">
              <Button variant="outline" size="sm" onClick={() => mindInputRef.current?.click()}>
                Choose file
              </Button>
              <input
                ref={mindInputRef}
                className="sr-only"
                type="file"
                accept=".mind"
                onChange={(e) => setMindFile(e.target.files?.[0] || null)}
              />
            </div>
            {mindDisplay && (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-left">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{mindDisplay.name}</span>
                </div>
                {mindFile && (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setMindFile(null)
                      mindInputRef.current && (mindInputRef.current.value = "")
                    }}
                    aria-label="Remove .mind file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">.mind, max 5MB</p>
          </div>

          {/* Video */}
          <div
            onDrop={(e) => handleDrop(e, "video")}
            onDragOver={prevent}
            onDragEnter={prevent}
            className="rounded-md border bg-background p-4 text-center grid gap-3"
            aria-label="video upload"
          >
            <div className="flex items-center justify-center">
              <UploadCloud className="h-6 w-6" aria-hidden />
            </div>
            <div className="text-sm">
              <p className="font-medium">Upload video</p>
              <p className="text-muted-foreground">Drag & drop or choose file</p>
            </div>
            <div className="flex items-center justify-center">
              <Button variant="outline" size="sm" onClick={() => videoInputRef.current?.click()}>
                Choose file
              </Button>
              <input
                ref={videoInputRef}
                className="sr-only"
                type="file"
                accept="video/mp4,video/webm,video/ogg"
                onChange={(e) => setVideo(e.target.files?.[0] || null)}
              />
            </div>
            {videoDisplay && (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-left">
                <div className="flex items-center gap-2">
                  <Film className="h-4 w-4" />
                  <span className="text-sm">{videoDisplay.name}</span>
                </div>
                {video && (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setVideo(null)
                      videoInputRef.current && (videoInputRef.current.value = "")
                    }}
                    aria-label="Remove video"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">MP4/WebM/OGG, max 100MB</p>
          </div>

          {/* Thumbnail */}
          <div
            onDrop={(e) => handleDrop(e, "thumb")}
            onDragOver={prevent}
            onDragEnter={prevent}
            className="rounded-md border bg-background p-4 text-center grid gap-3"
            aria-label="thumbnail upload"
          >
            <div className="flex items-center justify-center">
              <UploadCloud className="h-6 w-6" aria-hidden />
            </div>
            <div className="text-sm">
              <p className="font-medium">Upload thumbnail</p>
              <p className="text-muted-foreground">Drag & drop or choose file</p>
            </div>
            <div className="flex items-center justify-center">
              <Button variant="outline" size="sm" onClick={() => thumbInputRef.current?.click()}>
                Choose file
              </Button>
              <input
                ref={thumbInputRef}
                className="sr-only"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={(e) => setThumbnail(e.target.files?.[0] || null)}
              />
            </div>
            {thumbDisplay && (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-left">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  <span className="text-sm">{thumbDisplay.name}</span>
                </div>
                {thumbnail && (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setThumbnail(null)
                      thumbInputRef.current && (thumbInputRef.current.value = "")
                    }}
                    aria-label="Remove thumbnail"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">JPEG/PNG/GIF/WebP, max 500KB</p>
          </div>
        </section>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => history.back()}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isLoading || !customerName}>
            {isLoading
              ? mode === "edit"
                ? "Saving..."
                : "Creating..."
              : mode === "edit"
                ? "Save changes"
                : "Create link"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

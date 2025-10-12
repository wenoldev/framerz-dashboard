"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import LinkForm from "@/components/dashboard/LinkForm"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

type LinkRow = {
  id: string
  slug: string
  customer_name: string
  image_url?: string | null
  video_url?: string | null
  thumbnail_url?: string | null
}

export default function EditLinkPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [link, setLink] = useState<LinkRow | null>(null)

  useEffect(() => {
    async function fetchLink() {
      setLoading(true)
      const res = await fetch(`/api/links?id=${params.id}`)
      if (!res.ok) {
        toast.error("Failed to load link")
        router.push("/")
        return
      }
      const data = await res.json()
      setLink(data)
      setLoading(false)
    }
    fetchLink()
  }, [params.id, router])

  async function onSubmit(payload: {
    customer_name: string
    mind_file_url?: string | null
    video_url?: string | null
    thumbnail_url?: string | null
    replaced?: { mind_file?: boolean; video?: boolean; thumbnail?: boolean }
  }) {
    const res = await fetch("/api/links", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: params.id,
        customer_name: payload.customer_name,
        mind_file_url: payload.mind_file_url ?? null,
        video_url: payload.video_url ?? null,
        thumbnail_url: payload.thumbnail_url ?? null,
        replaced: payload.replaced || {},
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "Failed to update link")
    }
    toast.success("Link updated successfully")
    router.push("/")
  }

  async function onDelete() {
    const confirmed = window.confirm("Delete this link and all its associated files? This cannot be undone.")
    if (!confirmed) return
    const res = await fetch("/api/links", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: params.id }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || "Failed to delete link")
      return
    }
    toast.success("Link and its files deleted")
    router.push("/")
  }

  if (loading) return <main className="mx-auto w-full max-w-4xl p-6">Loading...</main>
  if (!link) return null

  return (
    <main className="mx-auto w-full max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-pretty">Edit Link</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/")}>
            Back to Links
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            Delete Link
          </Button>
        </div>
      </div>
      <LinkForm
        mode="edit"
        initial={{
          customer_name: link.customer_name,
          mind_file_url: link.image_url || null,
          video_url: link.video_url || null,
          thumbnail_url: link.thumbnail_url || null,
        }}
        onSubmit={onSubmit}
      />
    </main>
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Copy,
  Plus,
  Search,
  BarChart3,
  Calendar,
  Trash2,
  LinkIcon,
  MoreHorizontal,
  Edit,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { QRCodeSVG } from "qrcode.react"
import { useRouter } from "next/navigation"

type Link = {
  id: string
  slug: string
  clicks: number
  shortUrl: string
  customer_name?: string
  created_at: string
  status: "active" | "paused" | "inactive"
  mind_file?: string | null
  video?: string | null
  thumbnail?: string | null // Added for thumbnail support
}

type Props = {
  initialLinks: Link[]
}

export default function LinkTableClient({ initialLinks }: Props) {
  const router = useRouter()
  const [links, setLinks] = useState<Link[]>(initialLinks)
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [isViewQrDialogOpen, setIsViewQrDialogOpen] = useState(false)
  const [currentLink, setCurrentLink] = useState<Link | null>(null)
  const [error, setError] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const qrCodeRef = useRef<any>(null)
  const itemsPerPage = 8

  function isValidDate(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime())
  }

  // Format dates on client side
  useEffect(() => {
    setLinks(
      initialLinks.map((link) => {
        try {
          const created_at = link.created_at ? new Date(link.created_at) : new Date()
          return {
            ...link,
            created_at: isValidDate(created_at) ? format(created_at, "MMM d, yyyy") : "Invalid date",
            shortUrl: link.shortUrl || `${process.env.NEXT_PUBLIC_MAIN_URL}?f=${link.slug}`,
          }
        } catch (error) {
          console.error("Error formatting dates for link:", link.id, error)
          return {
            ...link,
            created_at: "Invalid date",
            shortUrl: link.shortUrl || `${process.env.NEXT_PUBLIC_MAIN_URL}?f=${link.slug}`,
          }
        }
      }),
    )
  }, [initialLinks])

  // Filter links based on search term
  const filteredLinks = links.filter(
    (link) =>
      link.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (link.customer_name && link.customer_name.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  // Calculate pagination
  const totalPages = Math.ceil(filteredLinks.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentLinks = filteredLinks.slice(startIndex, endIndex)

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard!")
    } catch (err) {
      toast.error("Failed to copy link")
      console.error("Failed to copy:", err)
    }
  }

  const downloadQrCode = () => {
    if (qrCodeRef.current) {
      const canvas = qrCodeRef.current.querySelector("svg")
      if (canvas) {
        const svgData = new XMLSerializer().serializeToString(canvas)
        const canvasElement = document.createElement("canvas")
        const ctx = canvasElement.getContext("2d")
        const img = new Image()
        img.onload = () => {
          canvasElement.width = img.width
          canvasElement.height = img.height
          ctx?.drawImage(img, 0, 0)
          const url = canvasElement.toDataURL("image/png")
          const link = document.createElement("a")
          link.href = url
          link.download = `qr-code-${currentLink?.customer_name || "link"}.png`
          link.click()
        }
        img.src = "data:image/svg+xml;base64," + btoa(svgData)
      }
    }
  }

  const handleDeleteLink = async (linkId: string) => {
    const confirmed = window.confirm("Delete this link and all its associated files? This cannot be undone.")
    if (!confirmed) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/links", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: linkId }),
      })

      if (!response.ok) throw new Error("Failed to delete link")

      setLinks(links.filter((link) => link.id !== linkId))
      toast.success("Link and its files deleted successfully!")
    } catch (error) {
      toast.error("Failed to delete link")
      console.error("Error deleting link:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const openEditPage = (link: Link) => {
    router.push(`/links/${link.id}/edit`)
  }

  const openCreatePage = () => {
    router.push("/links/new")
  }

  const openViewQrDialog = (link: Link) => {
    setCurrentLink(link)
    setQrCodeUrl(link.shortUrl)
    setIsViewQrDialogOpen(true)
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <Card className="shadow-lg border-0 bg-gradient-to-r from-purple-50 to-gray-50">
        <CardHeader className="pb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-800">Link Management</CardTitle>
              <p className="text-gray-600 mt-2">Shorten, track, and manage your links</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search links..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10 border-gray-200 focus:border-purple-500"
                />
              </div>
              <Button onClick={openCreatePage} className="bg-purple-600 hover:bg-purple-700 text-white shadow-md">
                <Plus className="w-4 h-4 mr-2" />
                Create New Link
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <LinkIcon className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                {searchTerm ? "No matching links found" : "No links created yet"}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? "Try adjusting your search query" : "Get started by creating your first short link"}
              </p>
              <Button onClick={openCreatePage} className="bg-purple-600 hover:bg-purple-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Link
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Short URL</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Clicks</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Customer Name</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentLinks.map((link, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <code className="text-purple-600 bg-purple-50 px-2 py-1 rounded-full text-sm font-medium">
                              {link.shortUrl}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(link.shortUrl)}
                              className="h-8 w-8 p-0 hover:bg-purple-100"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <BarChart3 className="h-4 w-4 text-purple-500" />
                            <span className="font-semibold text-gray-900">{link.clicks}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-gray-600">{link.customer_name || "-"}</span>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(link.status ?? "active")}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{link.created_at}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem className="cursor-pointer" onClick={() => openViewQrDialog(link)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View QR Code
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" onClick={() => openEditPage(link)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Link
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteLink(link.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Link
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredLinks.length)} of {filteredLinks.length} links
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="hover:bg-purple-50 cursor-pointer"
                  >
                    <ChevronLeft />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 ${
                            currentPage === pageNum ? "bg-purple-600 text-white" : "border-gray-300 hover:bg-purple-50"
                          }`}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="hover:bg-purple-50 cursor-pointer"
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* View QR Code Dialog remains unchanged */}
      <Dialog open={isViewQrDialogOpen} onOpenChange={setIsViewQrDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-800">QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            <p className="text-gray-700">Scan or download the QR code for {currentLink?.customer_name || "link"}:</p>
            <div ref={qrCodeRef}>
              <QRCodeSVG value={qrCodeUrl || ""} size={200} />
            </div>
            <div className="flex space-x-3">
              <Button onClick={downloadQrCode} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Download className="w-4 h-4 mr-2" />
                Download QR Code
              </Button>
              <Button
                onClick={() => {
                  setIsViewQrDialogOpen(false)
                  setQrCodeUrl(null)
                  setCurrentLink(null)
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Active</Badge>
    case "paused":
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Paused</Badge>
    default:
      return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Inactive</Badge>
  }
}

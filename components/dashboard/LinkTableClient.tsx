/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Copy,
  Plus,
  Search,
  BarChart3,
  Calendar,
  Trash2,
  Link as LinkIcon,
  MoreHorizontal,
  Edit,
  Eye,
  Download,
  Play,
  Video,
  Image as ImageIcon,
  FileCode,
  Upload,
  X,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useRouter } from "next/navigation"
import QRDesigner from "./QRDesigner"

type Link = {
  id: string;
  slug: string;
  scans: number;
  shortUrl: string;
  customer_name?: string;
  created_at: string;
  status: 'active' | 'inactive';
  mind_file?: string | null;
  video?: string | null;
  thumbnail?: string | null;
  mind_file_url?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
};

type Props = {
  initialLinks: Link[];
};

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function LinkTableClient({ initialLinks }: Props) {
  const router = useRouter()
  const [links, setLinks] = useState<Link[]>(initialLinks);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewQrDialogOpen, setIsViewQrDialogOpen] = useState(false);
  const [isMediaPreviewOpen, setIsMediaPreviewOpen] = useState(false);
  const [selectedMediaLink, setSelectedMediaLink] = useState<Link | null>(null);
  const [activeMediaTab, setActiveMediaTab] = useState<'all' | 'video' | 'thumbnail' | 'mind'>('all');
  const [currentLink, setCurrentLink] = useState<Link | null>(null);
  const [error, setError] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  // Create form state & client previews
  const [newLinkData, setNewLinkData] = useState({
    customer_name: '',
    slug: '',
    mind_file: null as File | null,
    video: null as File | null,
    thumbnail: null as File | null,
  });
  const [createThumbnailPreview, setCreateThumbnailPreview] = useState<string | null>(null);
  const [createVideoPreview, setCreateVideoPreview] = useState<string | null>(null);

  // Edit form state & client previews
  const [editData, setEditData] = useState({
    customer_name: '',
    slug: '',
    mind_file: null as File | null,
    video: null as File | null,
    thumbnail: null as File | null,
    removeThumbnail: false,
    removeVideo: false,
    removeMindFile: false,
  });
  const [editThumbnailPreview, setEditThumbnailPreview] = useState<string | null>(null);
  const [editVideoPreview, setEditVideoPreview] = useState<string | null>(null);

  const itemsPerPage = 8;
  const qrCodeRef = useRef<any>(null);

  function isValidDate(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  // Format dates on client side and map Supabase URLs
  useEffect(() => {
    setLinks(
      initialLinks.map((link) => {
        try {
          const created_at = link.created_at ? new Date(link.created_at) : new Date();
          return {
            ...link,
            created_at: isValidDate(created_at) ? format(created_at, 'MMM d, yyyy') : 'Invalid date',
            shortUrl: link.shortUrl || `${process.env.NEXT_PUBLIC_MAIN_URL}?f=${link.slug}`,
            mind_file: link.mind_file || link.mind_file_url || null,
            video: link.video || link.video_url || null,
            thumbnail: link.thumbnail || link.thumbnail_url || null,
          };
        } catch (error) {
          console.error('Error formatting dates for link:', link.id, error);
          return {
            ...link,
            created_at: 'Invalid date',
            shortUrl: link.shortUrl || `${process.env.NEXT_PUBLIC_MAIN_URL}?f=${link.slug}`,
            mind_file: link.mind_file || link.mind_file_url || null,
            video: link.video || link.video_url || null,
            thumbnail: link.thumbnail || link.thumbnail_url || null,
          };
        }
      })
    );
  }, [initialLinks]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (createThumbnailPreview) URL.revokeObjectURL(createThumbnailPreview);
      if (createVideoPreview) URL.revokeObjectURL(createVideoPreview);
      if (editThumbnailPreview) URL.revokeObjectURL(editThumbnailPreview);
      if (editVideoPreview) URL.revokeObjectURL(editVideoPreview);
    };
  }, [createThumbnailPreview, createVideoPreview, editThumbnailPreview, editVideoPreview]);

  // Filter links based on search term
  const filteredLinks = links.filter(
    (link) =>
      link.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (link.customer_name && link.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredLinks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLinks = filteredLinks.slice(startIndex, endIndex);

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy link');
      console.error('Failed to copy:', err);
    }
  };

  const handleDuplicateLink = async (link: Link) => {
    setIsLoading(true);
    try {
      const payload = {
        customer_name: `${link.customer_name || 'Link'} (Copy)`,
        mind_file_url: link.mind_file || "",
        video_url: link.video || "",
        thumbnail_url: link.thumbnail || "",
      };

      const response = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to duplicate link");
      }

      const data = await response.json();
      const formattedLink: Link = {
        ...data,
        shortUrl: `${process.env.NEXT_PUBLIC_MAIN_URL}?f=${data.slug}`,
        created_at: format(new Date(), 'MMM d, yyyy'),
        status: 'active',
        scans: 0,
        customer_name: data.customer_name,
        mind_file: data.mind_file_url || null,
        video: data.video_url || null,
        thumbnail: data.thumbnail_url || null,
      };

      setLinks((prev) => [formattedLink, ...prev]);
      toast.success("Link duplicated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to duplicate link");
      console.error("Error duplicating link:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFile = async (file: File | null, fileType: 'mind_file' | 'video' | 'thumbnail'): Promise<string | null> => {
    if (!file) return null;

    setIsLoading(true);
    const toastId = toast.loading(`Uploading ${fileType}...`);

    try {
      const response = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType, fileSize: file.size }),
      });

      if (!response.ok) throw new Error('Failed to get upload credentials');

      const { presignedUrl, uploadParams } = await response.json();

      const formData = new FormData();
      formData.append('file', file);

      if (uploadParams) {
        Object.keys(uploadParams).forEach(key => {
          formData.append(key, uploadParams[key]);
        });
      }

      const uploadResponse = await fetch(presignedUrl, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error?.message || 'Failed to upload file to Cloudinary');
      }

      const uploadResult = await uploadResponse.json();
      toast.success(`Uploaded ${fileType} successfully!`);
      return uploadResult.secure_url;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Upload failed');
      toast.error(error.message);
      setError(error.message);
      return null;
    } finally {
      toast.dismiss(toastId);
      setIsLoading(false);
    }
  };

  const resetCreateForm = () => {
    if (createThumbnailPreview) URL.revokeObjectURL(createThumbnailPreview);
    if (createVideoPreview) URL.revokeObjectURL(createVideoPreview);
    setCreateThumbnailPreview(null);
    setCreateVideoPreview(null);
    setNewLinkData({
      customer_name: '',
      slug: '',
      mind_file: null,
      video: null,
      thumbnail: null,
    });
    setError('');
  };

  const handleCreateThumbnailChange = (file: File | null) => {
    if (createThumbnailPreview) URL.revokeObjectURL(createThumbnailPreview);
    if (file) {
      setNewLinkData(prev => ({ ...prev, thumbnail: file }));
      setCreateThumbnailPreview(URL.createObjectURL(file));
    } else {
      setNewLinkData(prev => ({ ...prev, thumbnail: null }));
      setCreateThumbnailPreview(null);
    }
  };

  const handleCreateVideoChange = (file: File | null) => {
    if (createVideoPreview) URL.revokeObjectURL(createVideoPreview);
    if (file) {
      setNewLinkData(prev => ({ ...prev, video: file }));
      setCreateVideoPreview(URL.createObjectURL(file));
    } else {
      setNewLinkData(prev => ({ ...prev, video: null }));
      setCreateVideoPreview(null);
    }
  };

  const handleCreateLink = async () => {
    setIsLoading(true);
    setError('');

    if (!newLinkData.customer_name.trim()) {
      setError('Please enter a customer name');
      setIsLoading(false);
      return;
    }

    if (newLinkData.mind_file) {
      if (!newLinkData.mind_file.name.endsWith('.mind')) {
        setError('Please upload a valid .mind file');
        setIsLoading(false);
        return;
      }
      if (newLinkData.mind_file.size > 5 * 1024 * 1024) {
        setError('Mind file size must be less than 5MB');
        setIsLoading(false);
        return;
      }
    }

    if (newLinkData.video) {
      const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
      if (!validVideoTypes.includes(newLinkData.video.type)) {
        setError('Please upload a valid video (MP4, WebM, or OGG)');
        setIsLoading(false);
        return;
      }
      if (newLinkData.video.size > 100 * 1024 * 1024) {
        setError('Video size must be less than 100MB');
        setIsLoading(false);
        return;
      }
    }

    if (newLinkData.thumbnail) {
      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validImageTypes.includes(newLinkData.thumbnail.type)) {
        setError('Please upload a valid image thumbnail (JPEG, PNG, GIF, WebP)');
        setIsLoading(false);
        return;
      }
      if (newLinkData.thumbnail.size > 2 * 1024 * 1024) {
        setError('Thumbnail size must be less than 2MB');
        setIsLoading(false);
        return;
      }
    }

    try {
      const mind_file_url = await uploadFile(newLinkData.mind_file, 'mind_file');
      const video_url = await uploadFile(newLinkData.video, 'video');
      const thumbnail_url = await uploadFile(newLinkData.thumbnail, 'thumbnail');

      const response = await fetch('/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: newLinkData.customer_name,
          mind_file_url: mind_file_url || '',
          video_url: video_url || '',
          thumbnail_url: thumbnail_url || '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create link');
      }

      const data = await response.json();
      const formattedLink: Link = {
        ...data,
        shortUrl: `${process.env.NEXT_PUBLIC_MAIN_URL}?f=${data.slug}`,
        created_at: format(new Date(), 'MMM d, yyyy'),
        status: 'active',
        scans: 0,
        customer_name: data.customer_name,
        mind_file: data.mind_file_url || null,
        video: data.video_url || null,
        thumbnail: data.thumbnail_url || null,
      };

      setLinks((prev) => [formattedLink, ...prev]);
      setQrCodeUrl(formattedLink.shortUrl);
      toast.success('Link created successfully!', {
        action: {
          label: 'Copy',
          onClick: () => copyToClipboard(formattedLink.shortUrl),
        },
      });
      resetCreateForm();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Failed to create link');
      setError(error.message);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (link: Link) => {
    setCurrentLink(link);
    if (editThumbnailPreview) URL.revokeObjectURL(editThumbnailPreview);
    if (editVideoPreview) URL.revokeObjectURL(editVideoPreview);
    setEditThumbnailPreview(null);
    setEditVideoPreview(null);
    setEditData({
      customer_name: link.customer_name || '',
      slug: link.slug || '',
      mind_file: null,
      video: null,
      thumbnail: null,
      removeThumbnail: false,
      removeVideo: false,
      removeMindFile: false,
    });
    setError('');
    setIsEditDialogOpen(true);
  };

  const handleEditThumbnailChange = (file: File | null) => {
    if (editThumbnailPreview) URL.revokeObjectURL(editThumbnailPreview);
    if (file) {
      setEditData(prev => ({ ...prev, thumbnail: file, removeThumbnail: false }));
      setEditThumbnailPreview(URL.createObjectURL(file));
    } else {
      setEditData(prev => ({ ...prev, thumbnail: null }));
      setEditThumbnailPreview(null);
    }
  };

  const handleEditVideoChange = (file: File | null) => {
    if (editVideoPreview) URL.revokeObjectURL(editVideoPreview);
    if (file) {
      setEditData(prev => ({ ...prev, video: file, removeVideo: false }));
      setEditVideoPreview(URL.createObjectURL(file));
    } else {
      setEditData(prev => ({ ...prev, video: null }));
      setEditVideoPreview(null);
    }
  };

  const handleUpdateLink = async () => {
    if (!currentLink) return;

    setIsLoading(true);
    setError('');

    if (!editData.customer_name.trim()) {
      setError('Please enter a customer name');
      setIsLoading(false);
      return;
    }

    if (!editData.slug.trim()) {
      setError('Please enter a custom slug');
      setIsLoading(false);
      return;
    }

    const slugRegex = /^[a-zA-Z0-9_-]+$/;
    if (!slugRegex.test(editData.slug.trim())) {
      setError('Slug must only contain letters, numbers, hyphens, and underscores');
      setIsLoading(false);
      return;
    }

    if (editData.mind_file) {
      if (!editData.mind_file.name.endsWith('.mind')) {
        setError('Please upload a valid .mind file');
        setIsLoading(false);
        return;
      }
      if (editData.mind_file.size > 5 * 1024 * 1024) {
        setError('Mind file size must be less than 5MB');
        setIsLoading(false);
        return;
      }
    }

    if (editData.video) {
      const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
      if (!validVideoTypes.includes(editData.video.type)) {
        setError('Please upload a valid video (MP4, WebM, or OGG)');
        setIsLoading(false);
        return;
      }
      if (editData.video.size > 100 * 1024 * 1024) {
        setError('Video size must be less than 100MB');
        setIsLoading(false);
        return;
      }
    }

    if (editData.thumbnail) {
      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validImageTypes.includes(editData.thumbnail.type)) {
        setError('Please upload a valid image thumbnail (JPEG, PNG, GIF, WebP)');
        setIsLoading(false);
        return;
      }
      if (editData.thumbnail.size > 2 * 1024 * 1024) {
        setError('Thumbnail size must be less than 2MB');
        setIsLoading(false);
        return;
      }
    }

    try {
      let mind_file_url = currentLink.mind_file || '';
      if (editData.removeMindFile) {
        mind_file_url = '';
      } else if (editData.mind_file) {
        const uploaded = await uploadFile(editData.mind_file, 'mind_file');
        if (uploaded) mind_file_url = uploaded;
      }

      let video_url = currentLink.video || '';
      if (editData.removeVideo) {
        video_url = '';
      } else if (editData.video) {
        const uploaded = await uploadFile(editData.video, 'video');
        if (uploaded) video_url = uploaded;
      }

      let thumbnail_url = currentLink.thumbnail || '';
      if (editData.removeThumbnail) {
        thumbnail_url = '';
      } else if (editData.thumbnail) {
        const uploaded = await uploadFile(editData.thumbnail, 'thumbnail');
        if (uploaded) thumbnail_url = uploaded;
      }

      const response = await fetch('/api/links', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: currentLink.id,
          customer_name: editData.customer_name.trim(),
          slug: editData.slug.trim(),
          mind_file_url: mind_file_url,
          video_url: video_url,
          thumbnail_url: thumbnail_url,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update link');
      }

      const data = await response.json();
      const updatedLinkObj: Link = {
        ...data,
        shortUrl: `${process.env.NEXT_PUBLIC_MAIN_URL}?f=${data.slug}`,
        created_at: format(new Date(data.created_at || Date.now()), 'MMM d, yyyy'),
        mind_file: data.mind_file_url || null,
        video: data.video_url || null,
        thumbnail: data.thumbnail_url || null,
      };

      setLinks((prev) => prev.map((link) => (link.id === currentLink.id ? updatedLinkObj : link)));
      
      // Update selectedMediaLink if it's currently open
      if (selectedMediaLink?.id === currentLink.id) {
        setSelectedMediaLink(updatedLinkObj);
      }

      toast.success('Link updated successfully!');
      setIsEditDialogOpen(false);
      setCurrentLink(null);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update link';
      toast.error(errorMsg);
      setError(errorMsg);
      console.error('Error updating link:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/links', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: linkId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete link');
      }

      setLinks(links.filter((link) => link.id !== linkId));
      if (selectedMediaLink?.id === linkId) {
        setIsMediaPreviewOpen(false);
        setSelectedMediaLink(null);
      }
      toast.success('Link deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete link');
      console.error('Error deleting link:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (link: Link) => {
    const newStatus = link.status === 'active' ? 'inactive' : 'active';
    setIsLoading(true);
    try {
      const response = await fetch('/api/links', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: link.id, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle status');
      }

      const data = await response.json();
      setLinks(links.map((l) => (l.id === link.id ? { ...l, status: data.status } : l)));
      toast.success('Status updated successfully!');
    } catch (error) {
      toast.error('Failed to toggle status');
      console.error('Error toggling status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openViewQrDialog = (link: Link) => {
    setCurrentLink(link);
    setQrCodeUrl(link.shortUrl);
    setIsViewQrDialogOpen(true);
  };

  const openMediaPreview = (link: Link, tab: 'all' | 'video' | 'thumbnail' | 'mind' = 'all') => {
    setSelectedMediaLink(link);
    setActiveMediaTab(tab);
    setIsMediaPreviewOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Active</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Inactive</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader className="pb-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900 tracking-tight">AR Link & Media Hub</CardTitle>
              <p className="text-gray-500 text-sm mt-1">Manage, preview, and upload your MindAR targets, thumbnails, and interactive video assets.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by customer or slug..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 border-gray-200 focus:border-blue-500 rounded-lg text-sm"
                />
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
                setIsCreateDialogOpen(open);
                if (!open) {
                  setQrCodeUrl(null);
                  resetCreateForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm rounded-lg font-medium">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Link
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-gray-900">
                      Create New Short Link & Upload Media
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-5 py-4">
                    {qrCodeUrl ? (
                      <div className="flex flex-col items-center space-y-4">
                        <QRDesigner
                          isOpen={true}
                          onClose={() => {
                            setIsCreateDialogOpen(false);
                            setQrCodeUrl(null);
                            resetCreateForm();
                          }}
                          url={qrCodeUrl}
                          title={newLinkData.customer_name || "New Link QR"}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="customer_name" className="text-sm font-semibold text-gray-700">
                            Customer Name *
                          </Label>
                          <Input
                            id="customer_name"
                            placeholder="e.g. Acme Wedding Frame"
                            value={newLinkData.customer_name}
                            onChange={(e) =>
                              setNewLinkData({ ...newLinkData, customer_name: e.target.value })
                            }
                            className="border-gray-200 focus:border-blue-500 rounded-lg"
                          />
                        </div>

                        {/* Thumbnail Upload & Preview */}
                        <div className="space-y-2 p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="thumbnail" className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                              <ImageIcon className="w-4 h-4 text-blue-600" />
                              <span>Thumbnail Image</span>
                              <span className="text-xs text-gray-400 font-normal">(Optional, max 2MB)</span>
                            </Label>
                            {createThumbnailPreview && (
                              <button
                                type="button"
                                onClick={() => handleCreateThumbnailChange(null)}
                                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                              >
                                <X className="w-3 h-3" /> Remove
                              </button>
                            )}
                          </div>

                          {createThumbnailPreview ? (
                            <div className="flex items-center gap-4 p-2.5 bg-white border border-blue-200 rounded-lg">
                              <img
                                src={createThumbnailPreview}
                                alt="Thumbnail preview"
                                className="w-16 h-16 object-cover rounded-md border border-gray-200"
                              />
                              <div className="text-xs space-y-1">
                                <Badge className="bg-blue-100 text-blue-700 font-normal">Selected</Badge>
                                <p className="font-medium text-gray-700 truncate max-w-[220px]">
                                  {newLinkData.thumbnail?.name}
                                </p>
                                <p className="text-gray-400">
                                  {newLinkData.thumbnail ? formatBytes(newLinkData.thumbnail.size) : ''}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <Input
                              id="thumbnail"
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                              onChange={(e) => handleCreateThumbnailChange(e.target.files?.[0] || null)}
                              className="border-gray-200 bg-white cursor-pointer"
                            />
                          )}
                        </div>

                        {/* Video Upload & Preview */}
                        <div className="space-y-2 p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="video" className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                              <Video className="w-4 h-4 text-indigo-600" />
                              <span>Video Asset</span>
                              <span className="text-xs text-gray-400 font-normal">(Optional, MP4/WebM, max 100MB)</span>
                            </Label>
                            {createVideoPreview && (
                              <button
                                type="button"
                                onClick={() => handleCreateVideoChange(null)}
                                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                              >
                                <X className="w-3 h-3" /> Remove
                              </button>
                            )}
                          </div>

                          {createVideoPreview ? (
                            <div className="space-y-2 bg-white p-3 border border-indigo-200 rounded-lg">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-gray-800 truncate max-w-[240px]">
                                  {newLinkData.video?.name}
                                </span>
                                <span className="text-gray-500">
                                  {newLinkData.video ? formatBytes(newLinkData.video.size) : ''}
                                </span>
                              </div>
                              <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-h-48 flex items-center justify-center">
                                <video
                                  src={createVideoPreview}
                                  controls
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            </div>
                          ) : (
                            <Input
                              id="video"
                              type="file"
                              accept="video/mp4,video/webm,video/ogg"
                              onChange={(e) => handleCreateVideoChange(e.target.files?.[0] || null)}
                              className="border-gray-200 bg-white cursor-pointer"
                            />
                          )}
                        </div>

                        {/* Mind File Upload */}
                        <div className="space-y-2 p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="mind_file" className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                              <FileCode className="w-4 h-4 text-purple-600" />
                              <span>AR Mind File (.mind)</span>
                              <span className="text-xs text-gray-400 font-normal">(Optional, max 5MB)</span>
                            </Label>
                            {newLinkData.mind_file && (
                              <button
                                type="button"
                                onClick={() => setNewLinkData(prev => ({ ...prev, mind_file: null }))}
                                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                              >
                                <X className="w-3 h-3" /> Remove
                              </button>
                            )}
                          </div>

                          {newLinkData.mind_file ? (
                            <div className="flex items-center justify-between p-3 bg-white border border-purple-200 rounded-lg text-xs">
                              <div className="flex items-center gap-2">
                                <FileCode className="w-5 h-5 text-purple-600" />
                                <div>
                                  <p className="font-semibold text-gray-800">{newLinkData.mind_file.name}</p>
                                  <p className="text-gray-400">{formatBytes(newLinkData.mind_file.size)}</p>
                                </div>
                              </div>
                              <Badge className="bg-purple-100 text-purple-800">Ready</Badge>
                            </div>
                          ) : (
                            <Input
                              id="mind_file"
                              type="file"
                              accept=".mind"
                              onChange={(e) =>
                                setNewLinkData({ ...newLinkData, mind_file: e.target.files?.[0] || null })
                              }
                              className="border-gray-200 bg-white cursor-pointer"
                            />
                          )}
                        </div>

                        {error && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs flex items-center gap-2">
                            <X className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                          </div>
                        )}

                        <div className="flex justify-end space-x-3 pt-3">
                          <Button
                            variant="outline"
                            onClick={() => setIsCreateDialogOpen(false)}
                            className="border-gray-300 hover:bg-gray-50"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleCreateLink}
                            disabled={isLoading || !newLinkData.customer_name}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                          >
                            {isLoading ? 'Creating & Uploading...' : 'Create Link'}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <LinkIcon className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-1">
                {searchTerm ? 'No matching links found' : 'No links created yet'}
              </h3>
              <p className="text-gray-500 text-sm mb-6 max-w-sm">
                {searchTerm ? 'Try adjusting your search query or check the customer name.' : 'Get started by creating your first AR short link with mind targets and videos.'}
              </p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Link
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <tr>
                      <th className="text-left py-3.5 px-4">Link & Customer</th>
                      <th className="text-left py-3.5 px-4">Thumbnail</th>
                      <th className="text-left py-3.5 px-4">Video Asset</th>
                      <th className="text-left py-3.5 px-4">Mind Target</th>
                      <th className="text-left py-3.5 px-4">Scans</th>
                      <th className="text-left py-3.5 px-4">Status</th>
                      <th className="text-left py-3.5 px-4">Created</th>
                      <th className="text-right py-3.5 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentLinks.map((link) => (
                      <tr key={link.id} className="hover:bg-blue-50/40 transition-colors">
                        {/* Link & Customer */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                              <span>{link.customer_name || 'Unnamed Link'}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <code className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs font-mono font-medium">
                                {link.slug}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(link.shortUrl)}
                                className="h-6 w-6 p-0 hover:bg-blue-100 text-gray-400 hover:text-blue-600 rounded"
                                title="Copy short link"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </td>

                        {/* Thumbnail Preview */}
                        <td className="py-3.5 px-4">
                          {link.thumbnail ? (
                            <div
                              onClick={() => openMediaPreview(link, 'thumbnail')}
                              className="group relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shadow-2xs cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all hover:scale-105"
                              title="Click to preview thumbnail"
                            >
                              <img
                                src={link.thumbnail}
                                alt={link.customer_name || 'Thumbnail'}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => openEditDialog(link)}
                              className="w-12 h-12 rounded-lg border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/60 transition-colors"
                              title="No thumbnail - Click to upload"
                            >
                              <ImageIcon className="w-4 h-4 mb-0.5 text-gray-400" />
                              <span className="text-[9px] font-medium">+ Add</span>
                            </button>
                          )}
                        </td>

                        {/* Video Preview */}
                        <td className="py-3.5 px-4">
                          {link.video ? (
                            <button
                              onClick={() => openMediaPreview(link, 'video')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 shadow-2xs transition-all hover:scale-102"
                              title="Click to watch video preview"
                            >
                              <Play className="w-3.5 h-3.5 fill-indigo-600 text-indigo-600" />
                              <span>Play Video</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => openEditDialog(link)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-dashed border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-400 text-xs hover:bg-blue-50/50 transition-colors"
                              title="No video - Click to upload"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Video</span>
                            </button>
                          )}
                        </td>

                        {/* Mind File Preview */}
                        <td className="py-3.5 px-4">
                          {link.mind_file ? (
                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => openMediaPreview(link, 'mind')}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200 shadow-2xs transition-all"
                                title="View .mind file details"
                              >
                                <FileCode className="w-3.5 h-3.5 text-purple-600" />
                                <span>.mind file</span>
                              </button>
                              <a
                                href={link.mind_file}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                                title="Download .mind file"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          ) : (
                            <button
                              onClick={() => openEditDialog(link)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-dashed border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-400 text-xs hover:bg-blue-50/50 transition-colors"
                              title="No mind file - Click to upload"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add .mind</span>
                            </button>
                          )}
                        </td>

                        {/* Scans */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-1.5">
                            <BarChart3 className="h-4 w-4 text-blue-500" />
                            <span className="font-semibold text-gray-900">{link.scans}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">{getStatusBadge(link.status ?? 'active')}</td>

                        {/* Created Date */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-1.5 text-gray-500 text-xs">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            <span>{link.created_at}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg">
                                <MoreHorizontal className="h-4 w-4 text-gray-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem className="cursor-pointer" onClick={() => openMediaPreview(link, 'all')}>
                                <Eye className="mr-2 h-4 w-4 text-blue-600" />
                                Preview All Media
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" onClick={() => openEditDialog(link)}>
                                <Edit className="mr-2 h-4 w-4 text-indigo-600" />
                                Edit Link & Upload
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" onClick={() => openViewQrDialog(link)}>
                                <Eye className="mr-2 h-4 w-4 text-purple-600" />
                                View QR Code
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" onClick={() => handleToggleStatus(link)}>
                                <Edit className="mr-2 h-4 w-4 text-gray-500" />
                                {link.status === 'active' ? 'Deactivate Link' : 'Activate Link'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => handleDuplicateLink(link)}
                              >
                                <Copy className="mr-2 h-4 w-4 text-gray-500" />
                                Duplicate Link
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
              <div className="bg-gray-50/80 px-4 py-3.5 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-xs text-gray-500 font-medium">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredLinks.length)} of {filteredLinks.length} links
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="border-gray-200 hover:bg-blue-50 text-xs"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 p-0 text-xs ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'border-gray-200 hover:bg-blue-50 text-gray-700'
                          }`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="border-gray-200 hover:bg-blue-50 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Full Media Preview Dialog */}
      <Dialog open={isMediaPreviewOpen} onOpenChange={setIsMediaPreviewOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between pr-6">
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span>Media Preview</span>
                  {selectedMediaLink?.customer_name && (
                    <span className="text-base font-normal text-gray-500">
                      — {selectedMediaLink.customer_name}
                    </span>
                  )}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                    {selectedMediaLink?.slug}
                  </code>
                  <button
                    onClick={() => selectedMediaLink && copyToClipboard(selectedMediaLink.shortUrl)}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy AR Link</span>
                  </button>
                </div>
              </div>
            </div>
          </DialogHeader>

          {selectedMediaLink && (
            <div className="space-y-6 py-3">
              {/* Tab Selector */}
              <div className="flex border-b border-gray-200 gap-1">
                {(['all', 'video', 'thumbnail', 'mind'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveMediaTab(tab)}
                    className={`pb-2.5 px-3.5 text-xs font-semibold capitalize border-b-2 transition-all ${
                      activeMediaTab === tab
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {tab === 'all'
                      ? 'All Assets'
                      : tab === 'video'
                      ? 'Video Player'
                      : tab === 'thumbnail'
                      ? 'Thumbnail'
                      : 'Mind File'}
                  </button>
                ))}
              </div>

              {/* Video Section */}
              {(activeMediaTab === 'all' || activeMediaTab === 'video') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-indigo-600" />
                      <span>Video Asset Preview</span>
                    </Label>
                    {selectedMediaLink.video && (
                      <a
                        href={selectedMediaLink.video}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open Video in New Tab</span>
                      </a>
                    )}
                  </div>

                  {selectedMediaLink.video ? (
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center shadow-inner border border-gray-800">
                      <video
                        src={selectedMediaLink.video}
                        controls
                        className="w-full h-full max-h-[380px] object-contain"
                        poster={selectedMediaLink.thumbnail || undefined}
                      />
                    </div>
                  ) : (
                    <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                      <Video className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 font-medium">No video uploaded for this link yet.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => {
                          setIsMediaPreviewOpen(false);
                          openEditDialog(selectedMediaLink);
                        }}
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        Upload Video
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Thumbnail Section */}
              {(activeMediaTab === 'all' || activeMediaTab === 'thumbnail') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      <span>Thumbnail Image Preview</span>
                    </Label>
                    {selectedMediaLink.thumbnail && (
                      <a
                        href={selectedMediaLink.thumbnail}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>View Full Image</span>
                      </a>
                    )}
                  </div>

                  {selectedMediaLink.thumbnail ? (
                    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-xs bg-gray-50 flex items-center justify-center p-4">
                      <img
                        src={selectedMediaLink.thumbnail}
                        alt={selectedMediaLink.customer_name || 'Thumbnail'}
                        className="max-h-[300px] w-auto max-w-full rounded-lg object-contain shadow-xs"
                      />
                    </div>
                  ) : (
                    <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                      <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 font-medium">No thumbnail image uploaded yet.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => {
                          setIsMediaPreviewOpen(false);
                          openEditDialog(selectedMediaLink);
                        }}
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        Upload Thumbnail
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Mind File Section */}
              {(activeMediaTab === 'all' || activeMediaTab === 'mind') && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-purple-600" />
                    <span>MindAR Tracking File (.mind)</span>
                  </Label>

                  {selectedMediaLink.mind_file ? (
                    <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                          <FileCode className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">Target Feature Mind File</h4>
                          <p className="text-xs text-gray-500">
                            Required by the AR web experience to detect and track frame targets.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={selectedMediaLink.mind_file}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-medium">
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                            Download .mind
                          </Button>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                      <FileCode className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 font-medium">No AR .mind file compiled yet.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 text-purple-600 border-purple-200 hover:bg-purple-50"
                        onClick={() => {
                          setIsMediaPreviewOpen(false);
                          openEditDialog(selectedMediaLink);
                        }}
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        Upload .mind File
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsMediaPreviewOpen(false);
                    openViewQrDialog(selectedMediaLink);
                  }}
                  className="w-full sm:w-auto text-gray-700 border-gray-200"
                >
                  <Eye className="w-4 h-4 mr-2 text-purple-600" />
                  View & Download QR
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    onClick={() => {
                      setIsMediaPreviewOpen(false);
                      openEditDialog(selectedMediaLink);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit & Replace Media
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsMediaPreviewOpen(false)}
                    className="border-gray-200"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Link & Upload Media Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Edit Link & Upload Media Assets
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-customer_name" className="text-sm font-semibold text-gray-700">
                Customer Name *
              </Label>
              <Input
                id="edit-customer_name"
                placeholder="Enter customer name"
                value={editData.customer_name}
                onChange={(e) => setEditData({ ...editData, customer_name: e.target.value })}
                className="border-gray-200 focus:border-blue-500 rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-slug" className="text-sm font-semibold text-gray-700">
                Slug (URL Key) *
              </Label>
              <Input
                id="edit-slug"
                placeholder="Enter custom slug"
                value={editData.slug}
                onChange={(e) => setEditData({ ...editData, slug: e.target.value })}
                className="border-gray-200 focus:border-blue-500 rounded-lg font-mono text-sm"
              />
            </div>

            {/* Thumbnail Edit / Upload Section */}
            <div className="space-y-2 p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-thumbnail" className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <span>Thumbnail Image</span>
                </Label>
                {editThumbnailPreview ? (
                  <button
                    type="button"
                    onClick={() => handleEditThumbnailChange(null)}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Cancel New Image
                  </button>
                ) : currentLink?.thumbnail && !editData.removeThumbnail ? (
                  <button
                    type="button"
                    onClick={() => setEditData(prev => ({ ...prev, removeThumbnail: true }))}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete Current Image
                  </button>
                ) : editData.removeThumbnail ? (
                  <button
                    type="button"
                    onClick={() => setEditData(prev => ({ ...prev, removeThumbnail: false }))}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Restore Current Image
                  </button>
                ) : null}
              </div>

              {/* Preview Display */}
              {editThumbnailPreview ? (
                <div className="flex items-center gap-3 p-2 bg-blue-50/60 border border-blue-200 rounded-lg">
                  <img
                    src={editThumbnailPreview}
                    alt="New preview"
                    className="w-16 h-16 object-cover rounded-md border border-blue-300"
                  />
                  <div className="text-xs space-y-1">
                    <Badge className="bg-blue-600 text-white font-normal">New image to upload</Badge>
                    <p className="font-semibold text-gray-800 truncate max-w-[200px]">{editData.thumbnail?.name}</p>
                    <p className="text-gray-500">{editData.thumbnail ? formatBytes(editData.thumbnail.size) : ''}</p>
                  </div>
                </div>
              ) : currentLink?.thumbnail && !editData.removeThumbnail ? (
                <div className="flex items-center gap-3 p-2 bg-white border border-gray-200 rounded-lg">
                  <img
                    src={currentLink.thumbnail}
                    alt="Current thumbnail"
                    className="w-16 h-16 object-cover rounded-md border border-gray-200"
                  />
                  <div className="text-xs space-y-1">
                    <Badge variant="outline" className="text-gray-600 border-gray-300 font-normal">Current Live Image</Badge>
                    <p className="text-gray-500">Select a new file below to replace it.</p>
                  </div>
                </div>
              ) : editData.removeThumbnail ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Thumbnail will be removed upon saving.</span>
                </div>
              ) : null}

              <Input
                id="edit-thumbnail"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={(e) => handleEditThumbnailChange(e.target.files?.[0] || null)}
                className="border-gray-200 bg-white cursor-pointer mt-2"
              />
            </div>

            {/* Video Edit / Upload Section */}
            <div className="space-y-2 p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-video" className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-indigo-600" />
                  <span>Video Asset</span>
                </Label>
                {editVideoPreview ? (
                  <button
                    type="button"
                    onClick={() => handleEditVideoChange(null)}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Cancel New Video
                  </button>
                ) : currentLink?.video && !editData.removeVideo ? (
                  <button
                    type="button"
                    onClick={() => setEditData(prev => ({ ...prev, removeVideo: true }))}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete Current Video
                  </button>
                ) : editData.removeVideo ? (
                  <button
                    type="button"
                    onClick={() => setEditData(prev => ({ ...prev, removeVideo: false }))}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Restore Current Video
                  </button>
                ) : null}
              </div>

              {/* Video Player Display */}
              {editVideoPreview ? (
                <div className="space-y-2 bg-blue-50/50 p-2.5 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between text-xs">
                    <Badge className="bg-indigo-600 text-white font-normal">New video to upload</Badge>
                    <span className="text-gray-500 font-medium">
                      {editData.video ? `${editData.video.name} (${formatBytes(editData.video.size)})` : ''}
                    </span>
                  </div>
                  <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-h-48 flex items-center justify-center">
                    <video src={editVideoPreview} controls className="w-full h-full object-contain" />
                  </div>
                </div>
              ) : currentLink?.video && !editData.removeVideo ? (
                <div className="space-y-2 bg-white p-2.5 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant="outline" className="text-gray-600 border-gray-300 font-normal">Current Live Video</Badge>
                    <a
                      href={currentLink.video}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Open in tab
                    </a>
                  </div>
                  <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-h-48 flex items-center justify-center">
                    <video src={currentLink.video} controls className="w-full h-full object-contain" />
                  </div>
                </div>
              ) : editData.removeVideo ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Video asset will be removed upon saving.</span>
                </div>
              ) : null}

              <Input
                id="edit-video"
                type="file"
                accept="video/mp4,video/webm,video/ogg"
                onChange={(e) => handleEditVideoChange(e.target.files?.[0] || null)}
                className="border-gray-200 bg-white cursor-pointer mt-2"
              />
            </div>

            {/* Mind File Edit / Upload Section */}
            <div className="space-y-2 p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-mind_file" className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-purple-600" />
                  <span>AR Mind File (.mind)</span>
                </Label>
                {editData.mind_file ? (
                  <button
                    type="button"
                    onClick={() => setEditData(prev => ({ ...prev, mind_file: null }))}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Cancel New .mind
                  </button>
                ) : currentLink?.mind_file && !editData.removeMindFile ? (
                  <button
                    type="button"
                    onClick={() => setEditData(prev => ({ ...prev, removeMindFile: true }))}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete Current .mind
                  </button>
                ) : editData.removeMindFile ? (
                  <button
                    type="button"
                    onClick={() => setEditData(prev => ({ ...prev, removeMindFile: false }))}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Restore Current .mind
                  </button>
                ) : null}
              </div>

              {editData.mind_file ? (
                <div className="flex items-center justify-between p-2.5 bg-purple-50 border border-purple-200 rounded-lg text-xs">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-semibold text-gray-800">{editData.mind_file.name}</p>
                      <p className="text-gray-500">{formatBytes(editData.mind_file.size)}</p>
                    </div>
                  </div>
                  <Badge className="bg-purple-600 text-white font-normal">New File</Badge>
                </div>
              ) : currentLink?.mind_file && !editData.removeMindFile ? (
                <div className="flex items-center justify-between p-2.5 bg-white border border-gray-200 rounded-lg text-xs">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-semibold text-gray-800">Current .mind Target</p>
                      <a
                        href={currentLink.mind_file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <Download className="w-3 h-3" /> Download file
                      </a>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-gray-600 font-normal">Active</Badge>
                </div>
              ) : editData.removeMindFile ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>.mind target file will be removed upon saving.</span>
                </div>
              ) : null}

              <Input
                id="edit-mind_file"
                type="file"
                accept=".mind"
                onChange={(e) =>
                  setEditData({ ...editData, mind_file: e.target.files?.[0] || null, removeMindFile: false })
                }
                className="border-gray-200 bg-white cursor-pointer mt-2"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs flex items-center gap-2">
                <X className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-3">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateLink}
                disabled={isLoading || !editData.customer_name || !editData.slug}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {isLoading ? 'Saving & Uploading...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View QR Code Dialog */}
      <QRDesigner
        isOpen={isViewQrDialogOpen}
        onClose={() => {
          setIsViewQrDialogOpen(false);
          setQrCodeUrl(null);
          setCurrentLink(null);
        }}
        url={qrCodeUrl || ""}
        title={currentLink?.customer_name || "Link QR"}
      />
    </div>
  );
}

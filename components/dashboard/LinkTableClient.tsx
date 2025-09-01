'use client';
import { useState, useEffect } from 'react';
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
  Eye,
  Edit,
  MoreHorizontal,
  ExternalLink,
  BarChart3,
  Calendar,
  Trash2,
  Link as LinkIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, addWeeks, addMonths, parseISO, isAfter } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Link = {
  id: string;
  slug: string;
  clicks: number;
  shortUrl: string;
  target_url: string;
  created_at: string;
  status: 'active' | 'paused' | 'inactive';
  title?: string;
  expires_at?: string | null;
};

type Props = {
  initialLinks: Link[];
};

type ExpirationOption = '1day' | '1week' | '1month' | 'never' | 'custom';

export default function LinkTableClient({ initialLinks }: Props) {
  const [links, setLinks] = useState<Link[]>(initialLinks);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentLink, setCurrentLink] = useState<Link | null>(null);
  const [error, setError] = useState("");
  const [newLinkData, setNewLinkData] = useState({
    target_url: '',
    title: '',
    expires_at: '1week' as ExpirationOption,
    expires_at_date: ''
  });
  const itemsPerPage = 8;

  function isValidDate(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  // Format dates on client side
  useEffect(() => {
    setLinks(initialLinks.map(link => {
      try {
        const created_at = link.created_at ? new Date(link.created_at) : new Date();
        const expires_at = link.expires_at && link.expires_at !== 'Never' ? new Date(link.expires_at) : null;

        return {
          ...link,
          created_at: isValidDate(created_at) ? format(created_at, 'MMM d, yyyy') : 'Invalid date',
          expires_at: expires_at && isValidDate(expires_at) ? format(expires_at, 'MMM d, yyyy') : 'Never',
          shortUrl: link.shortUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/${link.slug}`
        };
      } catch (error) {
        console.error('Error formatting dates for link:', link.id, error);
        return {
          ...link,
          created_at: 'Invalid date',
          expires_at: 'Never',
          shortUrl: link.shortUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/${link.slug}`
        };
      }
    }));
  }, [initialLinks]);

  // Filter links based on search term
  const filteredLinks = links.filter(
    (link) =>
      link.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.target_url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (link.title && link.title.toLowerCase().includes(searchTerm.toLowerCase()))
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

  const calculateExpirationDate = (option: ExpirationOption, customDate?: string): string | null => {
    const now = new Date();

    switch (option) {
      case '1day':
        return addDays(now, 1).toISOString();
      case '1week':
        return addWeeks(now, 1).toISOString();
      case '1month':
        return addMonths(now, 1).toISOString();
      case 'custom':
        return customDate ? new Date(customDate).toISOString() : null;
      case 'never':
      default:
        return null;
    }
  };

  const handleCreateLink = async () => {
    setIsLoading(true);
    setError('');

    // Validate URL format
    try {
      new URL(newLinkData.target_url);
    } catch {
      setError('Please enter a valid URL (e.g., https://example.com)');
      setIsLoading(false);
      return;
    }

    // Validate custom date if selected
    if (newLinkData.expires_at === 'custom' && newLinkData.expires_at_date) {
      const selectedDate = new Date(newLinkData.expires_at_date);
      if (!isAfter(selectedDate, new Date())) {
        setError('Expiration date must be in the future');
        setIsLoading(false);
        return;
      }
    }

    try {
      const expiresAt = calculateExpirationDate(
        newLinkData.expires_at,
        newLinkData.expires_at_date
      );

      const response = await fetch('/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUrl: newLinkData.target_url,
          title: newLinkData.title || undefined,
          expires_at: expiresAt
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create link');
      }

      const data = await response.json();
      const formattedLink = {
        ...data,
        shortUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/${data.slug}`,
        created_at: format(new Date(), 'MMM d, yyyy'),
        expires_at: data.expires_at ? format(new Date(data.expires_at), 'MMM d, yyyy') : 'Never',
        status: 'active',
        clicks: 0
      };

      setLinks(prev => [formattedLink, ...prev]);
      toast.success('Link created successfully!', {
        action: {
          label: 'Copy',
          onClick: () => copyToClipboard(formattedLink.shortUrl),
        },
      });
      setIsCreateDialogOpen(false);
      setNewLinkData({
        target_url: '',
        title: '',
        expires_at: '1week',
        expires_at_date: ''
      });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Failed to create link');
      setError(error.message);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateLink = async () => {
    if (!currentLink) return;

    setIsLoading(true);
    setError('');

    // Validate custom date if selected
    if (newLinkData.expires_at === 'custom' && newLinkData.expires_at_date) {
      const selectedDate = new Date(newLinkData.expires_at_date);
      if (!isAfter(selectedDate, new Date())) {
        setError('Expiration date must be in the future');
        setIsLoading(false);
        return;
      }
    }

    try {
      const expiresAt = calculateExpirationDate(
        newLinkData.expires_at,
        newLinkData.expires_at_date
      );

      const response = await fetch('/api/links', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: currentLink.id,
          target_url: newLinkData.target_url,
          title: newLinkData.title,
          expires_at: expiresAt
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update link');
      }

      const data = await response.json();
      const updatedLinks = links.map(link =>
        link.id === currentLink.id ? {
          ...data,
          shortUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/${data.slug}`,
          created_at: format(new Date(data.created_at), 'MMM d, yyyy'),
          expires_at: data.expires_at ? format(new Date(data.expires_at), 'MMM d, yyyy') : 'Never'
        } : link
      );

      setLinks(updatedLinks);
      toast.success('Link updated successfully!');
      setIsEditDialogOpen(false);
      setCurrentLink(null);
    } catch (error) {
      toast.error('Failed to update link');
      console.error('Error updating link:', error);
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

      setLinks(links.filter(link => link.id !== linkId));
      toast.success('Link deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete link');
      console.error('Error deleting link:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (link: Link) => {
    setCurrentLink(link);

    // Determine the expires_at state for the edit form
    let expiresAtOption: ExpirationOption = 'never';
    let expiresAtDate = '';

    if (link.expires_at && link.expires_at !== 'Never') {
      expiresAtOption = 'custom';
      try {
        expiresAtDate = format(parseISO(link.expires_at), 'yyyy-MM-dd');
      } catch (e) {
        console.error('Error parsing expiration date:', e);
        expiresAtOption = 'never';
      }
    }

    setNewLinkData({
      target_url: link.target_url,
      title: link.title || '',
      expires_at: expiresAtOption,
      expires_at_date: expiresAtDate
    });
    setIsEditDialogOpen(true);
  };

  const handleExternalRoute = (url: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Paused</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Inactive</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <Card className="shadow-lg border-0 bg-gradient-to-r from-green-50 to-gray-50">
        <CardHeader className="pb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-800">
                Link Management
              </CardTitle>
              <p className="text-gray-600 mt-2">
                Shorten, track, and manage your links
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search links..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 border-gray-200 focus:border-green-500"
                />
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700 text-white shadow-md">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Link
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-gray-800">Create New Short Link</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="target_url" className="text-sm font-medium text-gray-700">
                        Destination URL *
                      </Label>
                      <Input
                        id="target_url"
                        placeholder="https://example.com/your-long-url"
                        value={newLinkData.target_url}
                        onChange={(e) =>
                          setNewLinkData({ ...newLinkData, target_url: e.target.value })
                        }
                        className="border-gray-200 focus:border-green-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                        Title (Optional)
                      </Label>
                      <Input
                        id="title"
                        placeholder="My awesome link"
                        value={newLinkData.title}
                        onChange={(e) =>
                          setNewLinkData({ ...newLinkData, title: e.target.value })
                        }
                        className="border-gray-200 focus:border-green-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expires_at" className="text-sm font-medium text-gray-700">
                        Expiration
                      </Label>
                      <div className="flex items-center gap-2">
                        <Select
                          value={newLinkData.expires_at}
                          onValueChange={(value) => setNewLinkData({
                            ...newLinkData,
                            expires_at: value as ExpirationOption
                          })}
                        >
                          <SelectTrigger className="w-[180px] border-gray-200 focus:border-green-500">
                            <SelectValue placeholder="Select expiration" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1day">1 Day</SelectItem>
                            <SelectItem value="1week">1 Week</SelectItem>
                            <SelectItem value="1month">1 Month</SelectItem>
                            <SelectItem value="never">Never</SelectItem>
                            <SelectItem value="custom">Custom Date</SelectItem>
                          </SelectContent>
                        </Select>
                        {newLinkData.expires_at === 'custom' && (
                          <Input
                            type="date"
                            value={newLinkData.expires_at_date}
                            onChange={(e) => setNewLinkData({
                              ...newLinkData,
                              expires_at_date: e.target.value
                            })}
                            className="flex-1 border-gray-200 focus:border-green-500"
                            min={format(new Date(), 'yyyy-MM-dd')}
                          />
                        )}
                      </div>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      className="border-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateLink}
                      disabled={isLoading || !newLinkData.target_url}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isLoading ? 'Creating...' : 'Create Link'}
                    </Button>
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
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                {searchTerm ? 'No matching links found' : 'No links created yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm
                  ? 'Try adjusting your search query'
                  : 'Get started by creating your first short link'}
              </p>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Link
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Short URL</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Clicks</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Original URL</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Expires</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentLinks.map((link, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <code className="text-green-600 bg-green-50 px-2 py-1 rounded-full text-sm font-medium">
                              {link.shortUrl}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(link.shortUrl)}
                              className="h-8 w-8 p-0 hover:bg-green-100"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <BarChart3 className="h-4 w-4 text-green-500" />
                            <span className="font-semibold text-gray-900">
                              {link.clicks.toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2 max-w-xs sm:max-w-sm cursor-pointer" onClick={() => handleExternalRoute(link.target_url)}>
                            <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate text-gray-600" title={link.target_url}>
                              {link.target_url}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(link.status ?? 'active')}</td>
                        <td className="py-3 px-4 text-gray-600">
                          {link.expires_at}
                        </td>
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
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => openEditDialog(link)}
                              >
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
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredLinks.length)} of{' '}
                  {filteredLinks.length} links
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="border-gray-300 hover:bg-green-50"
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
                          className={`w-10 h-10 ${currentPage === pageNum
                            ? 'bg-green-600 text-white'
                            : 'border-gray-300 hover:bg-green-50'
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
                    className="border-gray-300 hover:bg-green-50"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Link Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-800">Edit Short Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-target_url" className="text-sm font-medium text-gray-700">
                Destination URL *
              </Label>
              <Input
                id="edit-target_url"
                placeholder="https://example.com/your-long-url"
                value={newLinkData.target_url}
                onChange={(e) =>
                  setNewLinkData({ ...newLinkData, target_url: e.target.value })
                }
                className="border-gray-200 focus:border-green-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="text-sm font-medium text-gray-700">
                Title
              </Label>
              <Input
                id="edit-title"
                placeholder="My awesome link"
                value={newLinkData.title}
                onChange={(e) =>
                  setNewLinkData({ ...newLinkData, title: e.target.value })
                }
                className="border-gray-200 focus:border-green-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-expires_at" className="text-sm font-medium text-gray-700">
                Expiration
              </Label>
              <div className="flex items-center gap-2">
                <Select
                  value={newLinkData.expires_at}
                  onValueChange={(value) => setNewLinkData({
                    ...newLinkData,
                    expires_at: value as ExpirationOption
                  })}
                >
                  <SelectTrigger className="w-[180px] border-gray-200 focus:border-green-500">
                    <SelectValue placeholder="Select expiration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1day">1 Day</SelectItem>
                    <SelectItem value="1week">1 Week</SelectItem>
                    <SelectItem value="1month">1 Month</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="custom">Custom Date</SelectItem>
                  </SelectContent>
                </Select>
                {newLinkData.expires_at === 'custom' && (
                  <Input
                    type="date"
                    value={newLinkData.expires_at_date}
                    onChange={(e) => setNewLinkData({
                      ...newLinkData,
                      expires_at_date: e.target.value
                    })}
                    className="flex-1 border-gray-200 focus:border-green-500"
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                )}
              </div>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateLink}
              disabled={isLoading || !newLinkData.target_url}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
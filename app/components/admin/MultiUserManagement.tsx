'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/app/components/ui/table';
import { 
  Search, 
  Users, 
  CheckCircle, 
  XCircle,
  Shield,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  fullName: string;
  name: string;
  role: string;
  multiUser: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    managedUsers: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function MultiUserManagement() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  // Fetch users
  const fetchUsers = async (page = 1, searchTerm = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/admin/multi-user?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch enterprise users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchUsers(currentPage, search);
    }
  }, [session, currentPage, search]);

  // Toggle multi-user permission
  const handleToggleMultiUser = async (userId: string, currentValue: boolean) => {
    try {
      setUpdatingUser(userId);
      const response = await fetch('/api/admin/multi-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          multiUser: !currentValue
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update permission');
      }

      const data = await response.json();
      toast.success(data.message);
      
      // Update the user in the list
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, multiUser: !currentValue }
          : user
      ));
    } catch (error) {
      console.error('Error updating multi-user permission:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update permission');
    } finally {
      setUpdatingUser(null);
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please sign in to manage multi-user permissions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Multi-User Management</h1>
          <p className="text-muted-foreground">
            Grant or revoke multi-user permissions for Enterprise accounts.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-blue-500" />
          <span className="text-sm font-medium text-blue-600">Admin Panel</span>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="flex items-center justify-between">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search enterprise users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {pagination?.total || 0} enterprise users
            </span>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Enterprise Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">No enterprise users found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Multi-User</TableHead>
                  <TableHead>Team Members</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.fullName || user.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span className="text-sm">Inactive</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={user.multiUser}
                          onCheckedChange={() => handleToggleMultiUser(user.id, user.multiUser)}
                          disabled={updatingUser === user.id}
                        />
                        <span className="text-sm">
                          {user.multiUser ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {user._count.managedUsers}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={user.multiUser ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {user.multiUser ? 'Can Manage Team' : 'Single User'}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === pagination.pages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Multi-User Permissions</h3>
              <p className="text-sm text-blue-700 mt-1">
                When enabled, Enterprise users can create and manage their own team members. 
                Only Asvara admins can grant or revoke these permissions.
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• Enterprise users with multi-user enabled can add team members</li>
                <li>• Team members are regular USER accounts managed by the Enterprise user</li>
                <li>• Enterprise users can only create USER roles, not ADMIN or ENTERPRISE</li>
                <li>• All team member activities are tracked under the Enterprise account</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

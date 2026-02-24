"use client";

import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@jordan6699/washlab-backend/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Clock,
  Building2,
  LogIn,
  LogOut,
  Filter,
  Download,
  Timer,
  Search,
} from 'lucide-react';
import { format, startOfToday, endOfToday } from 'date-fns';
import { Id } from '@jordan6699/washlab-backend/dataModel';

const Attendance = () => {
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [searchQuery, setSearchQuery] = useState('');

  // Fix: useMemo so this doesn't re-create on every render and cause infinite loop
  const { startDate, endDate } = useMemo(() => {
    const now = Date.now();
    switch (dateRange) {
      case 'today':
        return { startDate: startOfToday().getTime(), endDate: endOfToday().getTime() };
      case 'week':
        return { startDate: now - 7 * 24 * 60 * 60 * 1000, endDate: now };
      case 'month':
        return { startDate: now - 30 * 24 * 60 * 60 * 1000, endDate: now };
      default:
        return { startDate: 0, endDate: now };
    }
  }, [dateRange]);

  const branchesResult = useQuery(api.admin.getBranches, {
    includeInactive: false,
    paginationOpts: { numItems: 100, cursor: null },
  });
  const branches = branchesResult?.page || [];

  const attendanceLogs = useQuery(
    api.admin.getAttendanceLogs,
    branchFilter !== 'all'
      ? {
          branchId: branchFilter as Id<'branches'>,
          startDate,
          endDate,
          limit: 500,
        }
      : {
          startDate,
          endDate,
          limit: 500,
        }
  );

  const filteredLogs = useMemo(() => {
    return (attendanceLogs || []).filter((log) => {
      if (statusFilter === 'active' && !log.isActive) return false;
      if (statusFilter === 'completed' && log.isActive) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          log.attendant?.name?.toLowerCase().includes(query) ||
          log.attendant?.email?.toLowerCase().includes(query) ||
          log.branch?.name?.toLowerCase().includes(query) ||
          log.branch?.code?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [attendanceLogs, statusFilter, searchQuery]);

  const stats = useMemo(() => ({
    total: filteredLogs.length,
    active: filteredLogs.filter((l) => l.isActive).length,
    completed: filteredLogs.filter((l) => !l.isActive).length,
    totalHours:
      filteredLogs
        .filter((l) => l.durationMinutes !== null)
        .reduce((sum, l) => sum + (l.durationMinutes || 0), 0) / 60,
  }), [filteredLogs]);

  const formatDuration = (minutes: number | null) => {
    if (minutes === null) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getElapsedTime = (clockInAt: number) => {
    const diff = Date.now() - clockInAt;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const dateRangeLabel = {
    today: 'Today',
    week: 'Last 7 Days',
    month: 'Last 30 Days',
    all: 'All Time',
  }[dateRange];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance Logs</h1>
          <p className="text-muted-foreground mt-2">
            View and manage staff attendance records across all branches
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All attendance records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <LogIn className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Currently clocked in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <LogOut className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Clock-out records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Timer className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalHours.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">Worked this period</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search staff or branch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch._id} value={branch._id}>
                    {branch.name} ({branch.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="completed">Completed Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>
                {filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
            <Badge variant="outline">{dateRangeLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="font-semibold text-lg mb-2">No attendance records</h3>
              <p className="text-muted-foreground">
                {searchQuery || branchFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No attendance records found for the selected period'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                            {log.attendant?.name
                              ?.split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase() || '??'}
                          </div>
                          <div>
                            <p className="font-medium">{log.attendant?.name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">
                              {log.attendant?.email || 'No email'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{log.branch?.name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">
                              {log.branch?.code || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.isActive ? (
                          <Badge className="bg-green-500 hover:bg-green-600">
                            <LogIn className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <LogOut className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{format(new Date(log.clockInAt), 'h:mm a')}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(log.clockInAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.clockOutAt ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{format(new Date(log.clockOutAt), 'h:mm a')}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(log.clockOutAt), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.isActive ? (
                          <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                            <Timer className="w-4 h-4" />
                            <span>{getElapsedTime(log.clockInAt)}</span>
                          </div>
                        ) : (
                          <span className="text-sm font-medium">
                            {formatDuration(log.durationMinutes)}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;
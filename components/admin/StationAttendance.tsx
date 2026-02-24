'use client';

import { useQuery } from 'convex/react';
import { api } from '@jordan6699/washlab-backend/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Users as UsersIcon,
  Timer,
  LogIn,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

/**
 * Station/Branch Attendance Page
 * Shows active attendance grouped by branch/station
 */
const StationAttendance = () => {
  // Get branch attendance summary
  const branchSummaries = useQuery(api.admin.getBranchAttendanceSummary) || [];

  // Calculate overall stats
  const overallStats = {
    totalBranches: branchSummaries.length,
    totalActive: branchSummaries.reduce((sum, s) => sum + s.activeCount, 0),
    totalBranchesWithActivity: branchSummaries.filter((s) => s.activeCount > 0).length,
  };

  const getElapsedTime = (clockInAt: number) => {
    const now = Date.now();
    const diff = now - clockInAt;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (branchSummaries === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading station attendance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Station Attendance</h1>
          <p className="text-muted-foreground mt-2">
            View active attendance by branch/station
          </p>
        </div>
        <Link href="/dashboard/attendance">
          <Button variant="outline" size="sm">
            View All Logs
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Branches</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalBranchesWithActivity}</div>
            <p className="text-xs text-muted-foreground">Branches with active attendants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active</CardTitle>
            <UsersIcon className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overallStats.totalActive}</div>
            <p className="text-xs text-muted-foreground">Attendants currently clocked in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Branches</CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{overallStats.totalBranches}</div>
            <p className="text-xs text-muted-foreground">All monitored branches</p>
          </CardContent>
        </Card>
      </div>

      {/* Branch Attendance Cards */}
      {branchSummaries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="font-semibold text-lg mb-2">No Active Attendance</h3>
            <p className="text-muted-foreground">
              No attendants are currently clocked in at any station
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {branchSummaries.map((summary) => (
            <Card key={summary.branch._id} className="overflow-hidden">
              <CardHeader className="bg-muted/50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {summary.branch.code}
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {summary.branch.name}
                        {summary.branch.terminalId && (
                          <Badge variant="outline" className="ml-2">
                            Terminal: {summary.branch.terminalId}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {summary.activeCount} active attendant
                        {summary.activeCount !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-green-500 hover:bg-green-600">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {summary.attendances.map((attendance) => {
                    const clockInTime = new Date(attendance.clockInAt);
                    return (
                      <div
                        key={attendance.attendanceId}
                        className="p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400 font-semibold">
                              {attendance.attendant?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                            </div>
                            <div>
                              <p className="font-medium">{attendance.attendant?.name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">
                                {attendance.attendant?.email || 'No email'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-sm font-medium flex items-center gap-2">
                                <LogIn className="w-4 h-4 text-green-500" />
                                {format(clockInTime, 'h:mm a')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(clockInTime, { addSuffix: true })}
                              </p>
                            </div>
                            <div className="text-right border-l pl-6">
                              <p className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                                <Timer className="w-4 h-4" />
                                {getElapsedTime(attendance.clockInAt)}
                              </p>
                              <p className="text-xs text-muted-foreground">Elapsed time</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StationAttendance;

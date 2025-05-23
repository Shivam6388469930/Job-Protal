"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/dashboard/Header';
import JobsTable from '@/components/dashboard/JobsTable';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { isAuthenticated, getAuthToken } from '@/app/uitlis/auth';

// Interface for application data
interface Application {
  id: string;
  jobId: string;
  fullName: string;
  email: string;
  phone: string;
  resume: string;
  coverLetter?: string;
  appliedDate: string;
  status: 'pending' | 'reviewed' | 'interview' | 'rejected' | 'accepted';
  job: {
    title: string;
    company: string;
    location: string;
    type?: string;
    logo?: string;
  } | null;
}

// Convert application data to format expected by JobsTable
const formatApplicationsForTable = (applications: Application[]) => {
  return applications.map(app => ({
    id: app.id,
    title: app.job?.title || 'Unknown Job',
    company: app.job?.company || 'Unknown Company',
    location: app.job?.location || 'Unknown Location',
    status: mapStatus(app.status),
    date: new Date(app.appliedDate).toLocaleDateString(),
  }));
};

// Map backend status to UI status
const mapStatus = (status: Application['status']): 'applied' | 'interview' | 'rejected' | 'offer' => {
  switch (status) {
    case 'pending':
    case 'reviewed':
      return 'applied';
    case 'interview':
      return 'interview';
    case 'rejected':
      return 'rejected';
    case 'accepted':
      return 'offer';
    default:
      return 'applied';
  }
};

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'applied' | 'interview' | 'offer' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      console.log('User not authenticated, redirecting to login');
      router.push('/login');
      return;
    }

    const fetchApplications = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching applications from API...');

        // Get auth token
        const token = getAuthToken();
        if (!token) {
          console.error('No authentication token found');
          throw new Error('Authentication required');
        }

        try {
          console.log('Making authenticated API request...');
          const response = await fetch('/api/user/applications', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          console.log('API response status:', response.status);

          if (!response.ok) {
            console.error(`API error: ${response.status} ${response.statusText}`);
            throw new Error(`Failed to fetch applications: ${response.status}`);
          }

          // Check if response is JSON
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.error('Non-JSON response received:', contentType);
            throw new Error('Server returned non-JSON response');
          }

          const data = await response.json();
          console.log('Applications data received:', data);

          if (data.applications && Array.isArray(data.applications)) {
            setApplications(data.applications);
          } else {
            console.warn('No applications array in response or empty applications array');
            setApplications([]);
          }
        } catch (fetchError) {
          console.error('API fetch error:', fetchError);
          if (fetchError instanceof Error) {
            console.error('Error details:', fetchError.message);
            console.error('Error stack:', fetchError.stack);
          }

          // Use mock data as fallback
          console.log('Using mock application data as fallback');
          const mockApplications: Application[] = [
            {
              id: 'app1',
              jobId: '1',
              fullName: 'John Doe',
              email: 'john@example.com',
              phone: '1234567890',
              resume: 'resume.pdf',
              appliedDate: new Date().toISOString(),
              status: 'pending',
              job: {
                title: 'Frontend Developer',
                company: 'Tech Corp',
                location: 'Remote',
                type: 'Full-time'
              }
            },
            {
              id: 'app2',
              jobId: '2',
              fullName: 'John Doe',
              email: 'john@example.com',
              phone: '1234567890',
              resume: 'resume.pdf',
              appliedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'interview',
              job: {
                title: 'Backend Developer',
                company: 'Software Inc',
                location: 'New York',
                type: 'Full-time'
              }
            }
          ];

          setApplications(mockApplications);
        }
      } catch (error) {
        console.error('Error in application fetching process:', error);
        setError('Failed to load your applications. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, [router]);

  // Filter applications based on active filter and search query
  const filteredApplications = applications.filter(app => {
    // Filter by status
    if (activeFilter !== 'all') {
      const mappedStatus = mapStatus(app.status);
      if (mappedStatus !== activeFilter) {
        return false;
      }
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        (app.job?.title || '').toLowerCase().includes(query) ||
        (app.job?.company || '').toLowerCase().includes(query) ||
        (app.job?.location || '').toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Format applications for the table
  const tableData = formatApplicationsForTable(filteredApplications);

  return (
    <div>
      <Header title="My Applications" />
      <main className="p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-medium text-gray-900">All Applications</h2>
            <p className="text-gray-500">Track and manage your job applications</p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline">Filter</Button>
            <Link href="/jobs">
              <Button variant="primary">Browse Jobs</Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex space-x-4">
                <Button
                  variant={activeFilter === 'all' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={activeFilter === 'applied' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveFilter('applied')}
                >
                  Applied
                </Button>
                <Button
                  variant={activeFilter === 'interview' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveFilter('interview')}
                >
                  Interview
                </Button>
                <Button
                  variant={activeFilter === 'offer' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveFilter('offer')}
                >
                  Offer
                </Button>
                <Button
                  variant={activeFilter === 'rejected' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveFilter('rejected')}
                >
                  Rejected
                </Button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search applications..."
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading your applications...</p>
            </div>
          ) : tableData.length > 0 ? (
            <JobsTable jobs={tableData} type="applications" />
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-600 mb-4">You haven&apos;t applied to any jobs yet.</p>
              <Link href="/jobs">
                <Button variant="primary">Browse Jobs</Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

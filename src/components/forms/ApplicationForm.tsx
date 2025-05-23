"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { JobPost } from '@/components/ui/JobCard';
import { isValidObjectId } from '@/app/uitlis/helpers/jobConverter';

interface ApplicationFormProps {
  job: JobPost;
  onSuccess?: (applicationId: string) => void;
}

const ApplicationForm: React.FC<ApplicationFormProps> = ({ job, onSuccess }) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    resume: '',
    coverLetter: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resumeFileName, setResumeFileName] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real application, you would upload the file to a storage service
      // and get back a URL. For this example, we'll just store the file name.
      setFormData(prev => ({ ...prev, resume: file.name }));
      setResumeFileName(file.name);

      // Clear error
      if (errors.resume) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.resume;
          return newErrors;
        });
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.resume) {
      newErrors.resume = 'Resume is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Ensure job has an ID
    if (!job.id) {
      setErrors(prev => ({
        ...prev,
        submit: 'Job ID is missing. Please try again or contact support.',
      }));
      return;
    }

    // Log job ID information
    console.log('Submitting application with job ID:', job.id);
    console.log('Is MongoDB ObjectId:', isValidObjectId(job.id));

    setIsSubmitting(true);

    try {
      console.log('Submitting application for job:', job.id);
      console.log('Form data:', { ...formData, resume: formData.resume ? 'File selected' : 'No file' });

      let response;
      let usedFallback = false;

      try {
        // Try the main API endpoint first
        console.log('Trying primary API endpoint...');
        response = await fetch('/api/applications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jobId: job.id,
            ...formData,
          }),
        });

        console.log('Primary API response status:', response.status);
      } catch (primaryError) {
        console.error('Primary API endpoint failed:', primaryError);

        // Try the fallback test endpoint
        console.log('Trying fallback test API endpoint...');
        response = await fetch('/api/test-application', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jobId: job.id,
            ...formData,
          }),
        });

        console.log('Fallback API response status:', response.status);
        usedFallback = true;
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response received:', contentType);
        // Try to get the response text for debugging
        const responseText = await response.text();
        console.error('Response text (first 500 chars):', responseText.substring(0, 500));
        throw new Error(`Server returned non-JSON response (${response.status}). Please check server logs.`);
      }

      // Parse the response
      let data;
      try {
        data = await response.json();
        console.log('Response data:', data);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        throw new Error('Failed to parse server response. Please try again.');
      }

      // Check for error response
      if (!response.ok) {
        const errorMessage = data && data.error
          ? data.error
          : `Server returned error (${response.status})`;
        throw new Error(errorMessage);
      }

      // Validate the response data
      if (!data || !data.application || !data.application.id) {
        console.error('Invalid response data:', data);
        throw new Error('Server returned invalid data. Please try again.');
      }

      // Handle success
      console.log('Application submitted successfully:', data.application.id);

      // Show a message if the fallback was used
      if (usedFallback) {
        alert('Your application was submitted in test mode. In a production environment, this would be saved to a database.');
      }

      if (onSuccess) {
        onSuccess(data.application.id);
      } else {
        // Add a query parameter to indicate if the fallback was used
        router.push(`/jobs/${job.id}/application-success?applicationId=${data.application.id}${usedFallback ? '&testMode=true' : ''}`);
      }
    } catch (error: any) {
      console.error('Error submitting application:', error);
      setErrors(prev => ({
        ...prev,
        submit: error.message || 'Failed to submit application. Please try again.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
          Full Name *
        </label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.fullName ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.fullName && (
          <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number *
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.phone ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.phone && (
          <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
        )}
      </div>

      <div>
        <label htmlFor="resume" className="block text-sm font-medium text-gray-700 mb-1">
          Resume/CV *
        </label>
        <div className="flex items-center">
          <input
            type="file"
            id="resume"
            name="resume"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="resume"
            className={`cursor-pointer px-4 py-2 border rounded-md ${
              errors.resume ? 'border-red-500' : 'border-gray-300'
            } bg-white hover:bg-gray-50`}
          >
            Choose File
          </label>
          <span className="ml-3 text-sm text-gray-500">
            {resumeFileName || 'No file chosen'}
          </span>
        </div>
        {errors.resume && (
          <p className="mt-1 text-sm text-red-600">{errors.resume}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Accepted formats: PDF, DOC, DOCX. Max size: 5MB.
        </p>
      </div>

      <div>
        <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700 mb-1">
          Cover Letter (Optional)
        </label>
        <textarea
          id="coverLetter"
          name="coverLetter"
          value={formData.coverLetter}
          onChange={handleChange}
          rows={5}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Tell us why you're a good fit for this position..."
        />
      </div>

      {errors.submit && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
          {errors.submit}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          loadingText="Submitting..."
        >
          Submit Application
        </Button>
      </div>
    </form>
  );
};

export default ApplicationForm;

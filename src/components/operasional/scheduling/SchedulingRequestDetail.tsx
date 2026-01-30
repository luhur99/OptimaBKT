"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Edit, CheckCircle, XCircle, Calendar, User, MapPin, Phone, Clock, DollarSign, FileText, Truck, Building, Tag, Info, FileUp } from 'lucide-react';
import { ApprovalDialog } from './ApprovalDialog'; // Pastikan ini named import
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogTrigger } from '@/components/ui/dialog'; // Import Dialog dan DialogTrigger

interface SchedulingRequest {
  id: string;
  sr_number: string;
  type: string;
  full_address: string;
  landmark: string;
  requested_date: string;
  requested_time: string;
  contact_person: string;
  phone_number: string;
  payment_method: string;
  status: 'pending' | 'approved' | 'rejected' | 'rescheduled' | 'cancelled' | 'in_progress' | 'completed';
  notes: string;
  created_at: string;
  customer_name: string;
  company_name: string;
  vehicle_details: string;
  assigned_technician_id: string | null;
  technician_name: string | null;
  product_category: string | null;
  do_number: string | null;
  invoice_id: string | null;
  invoice_status: string | null;
  document_url: string | null;
}

const SchedulingRequestDetail = () => {
  const { id } = useParams();
  const router = useRouter();
  const [request, setRequest] = useState<SchedulingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false); // State untuk dialog persetujuan
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchRequestDetail();
    }
  }, [id]);

  const fetchRequestDetail = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('scheduling_requests')
      .select(`
        *,
        technicians (name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching scheduling request:', error.message);
      setError('Failed to load scheduling request details.');
      toast({
        title: "Error",
        description: "Failed to load scheduling request details.",
        variant: "destructive",
      });
    } else {
      setRequest({
        ...data,
        technician_name: data.technicians?.name || null,
      } as SchedulingRequest);
    }
    setLoading(false);
  };

  const handleApprovalSubmit = async (approvalData: { assignedTechnicianId: string; notes: string; status: 'approved' | 'rejected' }) => {
    if (!request) return;

    setLoading(true);
    const { assignedTechnicianId, notes, status } = approvalData;

    const updatePayload: any = {
      status: status,
      notes: notes,
    };

    if (status === 'approved') {
      updatePayload.assigned_technician_id = assignedTechnicianId;
    } else if (status === 'rejected') {
      updatePayload.assigned_technician_id = null; // Clear technician if rejected
    }

    const { error } = await supabase
      .from('scheduling_requests')
      .update(updatePayload)
      .eq('id', request.id);

    if (error) {
      console.error('Error updating scheduling request status:', error.message);
      toast({
        title: "Error",
        description: `Failed to ${status} scheduling request: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Scheduling request successfully ${status}.`,
      });
      fetchRequestDetail(); // Refresh data
    }
    setLoading(false);
    setIsApprovalDialogOpen(false); // Tutup dialog setelah submit
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen text-neon-cyan">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
  }

  if (!request) {
    return <div className="flex justify-center items-center h-screen text-gray-400">No scheduling request found.</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-500';
      case 'approved': return 'text-green-500';
      case 'rejected': return 'text-red-500';
      case 'rescheduled': return 'text-orange-500';
      case 'cancelled': return 'text-red-700';
      case 'in_progress': return 'text-blue-500';
      case 'completed': return 'text-purple-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="container mx-auto p-6 bg-deep-charcoal text-gray-100 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-neon-cyan hover:text-neon-cyan/80"
        >
          <ArrowLeft className="mr-2 h-5 w-5" /> Back
        </Button>
        <h1 className="text-3xl font-bold text-neon-cyan">Scheduling Request Details</h1>
        <div>
          {request.status === 'pending' && (
            <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-neon-cyan text-deep-charcoal hover:bg-neon-cyan/80 neon-glow-hover transition-all duration-300">
                  Approve/Reject Request
                </Button>
              </DialogTrigger>
              <ApprovalDialog
                isOpen={isApprovalDialogOpen}
                onClose={() => setIsApprovalDialogOpen(false)}
                onSubmit={handleApprovalSubmit}
                request={request}
              />
            </Dialog>
          )}
          {/* Add other action buttons here based on status and user roles */}
        </div>
      </div>

      <Card className="glassmorphism border border-gray-700 shadow-lg">
        <CardHeader className="border-b border-gray-700">
          <CardTitle className="text-2xl text-neon-cyan flex items-center">
            <Tag className="mr-2 h-6 w-6" /> {request.sr_number}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold text-neon-cyan mb-4">Request Information</h2>
            <div className="space-y-3">
              <p className="flex items-center text-gray-300"><Info className="mr-2 h-4 w-4 text-blue-400" /> Type: <span className="ml-2 font-medium">{request.type}</span></p>
              <p className="flex items-center text-gray-300"><Calendar className="mr-2 h-4 w-4 text-purple-400" /> Requested Date: <span className="ml-2 font-medium">{request.requested_date}</span></p>
              <p className="flex items-center text-gray-300"><Clock className="mr-2 h-4 w-4 text-teal-400" /> Requested Time: <span className="ml-2 font-medium">{request.requested_time || 'N/A'}</span></p>
              <p className="flex items-center text-gray-300"><User className="mr-2 h-4 w-4 text-yellow-400" /> Contact Person: <span className="ml-2 font-medium">{request.contact_person}</span></p>
              <p className="flex items-center text-gray-300"><Phone className="mr-2 h-4 w-4 text-green-400" /> Phone Number: <span className="ml-2 font-medium">{request.phone_number || 'N/A'}</span></p>
              <p className="flex items-center text-gray-300"><DollarSign className="mr-2 h-4 w-4 text-lime-400" /> Payment Method: <span className="ml-2 font-medium">{request.payment_method || 'N/A'}</span></p>
              <p className="flex items-center text-gray-300"><span className={`ml-2 font-bold ${getStatusColor(request.status)}`}>Status: {request.status.replace(/_/g, ' ').toUpperCase()}</span></p>
              {request.notes && <p className="flex items-start text-gray-300"><FileText className="mr-2 h-4 w-4 text-orange-400 mt-1" /> Notes: <span className="ml-2 font-medium">{request.notes}</span></p>}
              {request.product_category && <p className="flex items-center text-gray-300"><Tag className="mr-2 h-4 w-4 text-pink-400" /> Product Category: <span className="ml-2 font-medium">{request.product_category}</span></p>}
              {request.do_number && <p className="flex items-center text-gray-300"><Truck className="mr-2 h-4 w-4 text-indigo-400" /> DO Number: <span className="ml-2 font-medium">{request.do_number}</span></p>}
              {request.invoice_id && <p className="flex items-center text-gray-300"><FileText className="mr-2 h-4 w-4 text-cyan-400" /> Invoice ID: <span className="ml-2 font-medium">{request.invoice_id}</span></p>}
              {request.invoice_status && <p className="flex items-center text-gray-300"><FileText className="mr-2 h-4 w-4 text-cyan-400" /> Invoice Status: <span className="ml-2 font-medium">{request.invoice_status}</span></p>}
              {request.document_url && (
                <p className="flex items-center text-gray-300">
                  <FileUp className="mr-2 h-4 w-4 text-emerald-400" /> Document:
                  <a href={request.document_url} target="_blank" rel="noopener noreferrer" className="ml-2 font-medium text-blue-400 hover:underline">
                    View Document
                  </a>
                </p>
              )}
            </div>
          </div>

          <Separator orientation="vertical" className="hidden md:block bg-gray-700" />
          <Separator orientation="horizontal" className="md:hidden bg-gray-700" />

          <div>
            <h2 className="text-xl font-semibold text-neon-cyan mb-4">Location & Assignment</h2>
            <div className="space-y-3">
              <p className="flex items-start text-gray-300"><MapPin className="mr-2 h-4 w-4 text-red-400 mt-1" /> Full Address: <span className="ml-2 font-medium">{request.full_address}</span></p>
              {request.landmark && <p className="flex items-start text-gray-300"><MapPin className="mr-2 h-4 w-4 text-red-400 mt-1" /> Landmark: <span className="ml-2 font-medium">{request.landmark}</span></p>}
              {request.company_name && <p className="flex items-center text-gray-300"><Building className="mr-2 h-4 w-4 text-indigo-400" /> Company Name: <span className="ml-2 font-medium">{request.company_name}</span></p>}
              {request.customer_name && <p className="flex items-center text-gray-300"><User className="mr-2 h-4 w-4 text-yellow-400" /> Customer Name: <span className="ml-2 font-medium">{request.customer_name}</span></p>}
              {request.vehicle_details && <p className="flex items-center text-gray-300"><Truck className="mr-2 h-4 w-4 text-orange-400" /> Vehicle Details: <span className="ml-2 font-medium">{request.vehicle_details}</span></p>}
              {request.assigned_technician_id && (
                <p className="flex items-center text-gray-300"><User className="mr-2 h-4 w-4 text-cyan-400" /> Assigned Technician: <span className="ml-2 font-medium">{request.technician_name || 'N/A'}</span></p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SchedulingRequestDetail;
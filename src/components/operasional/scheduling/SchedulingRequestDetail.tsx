import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Edit, CheckCircle, XCircle, Calendar, User, MapPin, Phone, Clock, DollarSign, FileText, Truck, Building, Tag, Info, FileUp } from 'lucide-react';
import { ApprovalDialog } from './ApprovalDialog';
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogTrigger } from '@/components/ui/dialog';

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

interface SchedulingRequestDetailProps {
  request: SchedulingRequest; // Menerima request sebagai prop
  onUpdate: () => void; // Callback untuk memberitahu parent agar memperbarui data
  onClose: () => void; // Callback untuk menutup detail panel
}

const SchedulingRequestDetail = ({ request: initialRequest, onUpdate, onClose }: SchedulingRequestDetailProps) => {
  const navigate = useNavigate();
  const [request, setRequest] = useState<SchedulingRequest>(initialRequest);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setRequest(initialRequest);
  }, [initialRequest]);

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
      onUpdate(); // Trigger parent to refresh data
    }
    setLoading(false);
    setIsApprovalDialogOpen(false); // Tutup dialog setelah submit
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full text-neon-cyan">Updating request...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-full text-red-500">{error}</div>;
  }

  if (!request) {
    return <div className="flex justify-center items-center h-full text-gray-400">No scheduling request selected.</div>;
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
    <Card className="glassmorphism border border-gray-700 shadow-lg h-full flex flex-col">
      <CardHeader className="border-b border-gray-700 pb-3"> {/* Reduced padding */}
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-neon-cyan flex items-center"> {/* Reduced font size */}
            <Tag className="mr-2 h-5 w-5" /> {request.sr_number} {/* Reduced icon size */}
          </CardTitle>
          <Button variant="ghost" onClick={onClose} className="text-neon-cyan hover:text-neon-cyan/80">
            <ArrowLeft className="mr-2 h-4 w-4" /> Close Details {/* Reduced icon size */}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-5 flex-1 overflow-y-auto"> {/* Reduced padding */}
        <div className="flex items-center justify-between mb-5"> {/* Reduced margin */}
          <h1 className="text-2xl font-bold text-neon-cyan">Scheduling Request Details</h1> {/* Reduced font size */}
          <div>
            {request.status === 'pending' && (
              <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-neon-cyan text-deep-charcoal hover:bg-neon-cyan/80 neon-glow-hover transition-all duration-300 text-sm py-2 px-3"> {/* Reduced button text size */}
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
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* Reduced gap */}
          <div>
            <h2 className="text-lg font-semibold text-neon-cyan mb-3">Request Information</h2> {/* Reduced font size */}
            <div className="space-y-2"> {/* Reduced space */}
              <p className="flex items-center text-sm text-gray-300"><Info className="mr-2 h-4 w-4 text-blue-400" /> Type: <span className="ml-2 font-medium">{request.type}</span></p>
              <p className="flex items-center text-sm text-gray-300"><Calendar className="mr-2 h-4 w-4 text-purple-400" /> Requested Date: <span className="ml-2 font-medium">{request.requested_date}</span></p>
              <p className="flex items-center text-sm text-gray-300"><Clock className="mr-2 h-4 w-4 text-teal-400" /> Requested Time: <span className="ml-2 font-medium">{request.requested_time || 'N/A'}</span></p>
              <p className="flex items-center text-sm text-gray-300"><User className="mr-2 h-4 w-4 text-yellow-400" /> Contact Person: <span className="ml-2 font-medium">{request.contact_person}</span></p>
              <p className="flex items-center text-sm text-gray-300"><Phone className="mr-2 h-4 w-4 text-green-400" /> Phone Number: <span className="ml-2 font-medium">{request.phone_number || 'N/A'}</span></p>
              <p className="flex items-center text-sm text-gray-300"><DollarSign className="mr-2 h-4 w-4 text-lime-400" /> Payment Method: <span className="ml-2 font-medium">{request.payment_method || 'N/A'}</span></p>
              <p className="flex items-center text-sm text-gray-300"><span className={`ml-2 font-bold ${getStatusColor(request.status)}`}>Status: {request.status.replace(/_/g, ' ').toUpperCase()}</span></p>
              {request.notes && <p className="flex items-start text-sm text-gray-300"><FileText className="mr-2 h-4 w-4 text-orange-400 mt-1" /> Notes: <span className="ml-2 font-medium">{request.notes}</span></p>}
              {request.product_category && <p className="flex items-center text-sm text-gray-300"><Tag className="mr-2 h-4 w-4 text-pink-400" /> Product Category: <span className="ml-2 font-medium">{request.product_category}</span></p>}
              {request.do_number && <p className="flex items-center text-sm text-gray-300"><Truck className="mr-2 h-4 w-4 text-indigo-400" /> DO Number: <span className="ml-2 font-medium">{request.do_number}</span></p>}
              {request.invoice_id && <p className="flex items-center text-sm text-gray-300"><FileText className="mr-2 h-4 w-4 text-cyan-400" /> Invoice ID: <span className="ml-2 font-medium">{request.invoice_id}</span></p>}
              {request.invoice_status && <p className="flex items-center text-sm text-gray-300"><FileText className="mr-2 h-4 w-4 text-cyan-400" /> Invoice Status: <span className="ml-2 font-medium">{request.invoice_status}</span></p>}
              {request.document_url && (
                <p className="flex items-center text-sm text-gray-300">
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
            <h2 className="text-lg font-semibold text-neon-cyan mb-3">Location & Assignment</h2> {/* Reduced font size */}
            <div className="space-y-2"> {/* Reduced space */}
              <p className="flex items-start text-sm text-gray-300"><MapPin className="mr-2 h-4 w-4 text-red-400 mt-1" /> Full Address: <span className="ml-2 font-medium">{request.full_address}</span></p>
              {request.landmark && <p className="flex items-start text-sm text-gray-300"><MapPin className="mr-2 h-4 w-4 text-red-400 mt-1" /> Landmark: <span className="ml-2 font-medium">{request.landmark}</span></p>}
              {request.company_name && <p className="flex items-center text-sm text-gray-300"><Building className="mr-2 h-4 w-4 text-indigo-400" /> Company Name: <span className="ml-2 font-medium">{request.company_name}</span></p>}
              {request.customer_name && <p className="flex items-center text-sm text-gray-300"><User className="mr-2 h-4 w-4 text-yellow-400" /> Customer Name: <span className="ml-2 font-medium">{request.customer_name}</span></p>}
              {request.vehicle_details && <p className="flex items-center text-sm text-gray-300"><Truck className="mr-2 h-4 w-4 text-orange-400" /> Vehicle Details: <span className="ml-2 font-medium">{request.vehicle_details}</span></p>}
              {request.assigned_technician_id && (
                <p className="flex items-center text-sm text-gray-300"><User className="mr-2 h-4 w-4 text-cyan-400" /> Assigned Technician: <span className="ml-2 font-medium">{request.technician_name || 'N/A'}</span></p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SchedulingRequestDetail;
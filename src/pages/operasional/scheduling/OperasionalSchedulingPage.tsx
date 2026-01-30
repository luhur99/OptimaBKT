import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { showError } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Calendar as CalendarIcon, PlusCircle, Search, Filter, Edit, Eye, Trash2, CheckCircle2, XCircle, Clock, RefreshCcw, FileText, Download, Upload } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton"; // Menambahkan import Skeleton

// Define types for scheduling requests
interface SchedulingRequest {
  id: string;
  user_id: string;
  type: string;
  full_address: string;
  landmark: string | null;
  requested_date: string;
  requested_time: string | null;
  contact_person: string;
  payment_method: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  sr_number: string | null;
  invoice_id: string | null;
  customer_id: string | null;
  vehicle_details: string | null;
  company_name: string | null;
  customer_name: string | null;
  phone_number: string | null;
  updated_at: string;
  technician_name: string | null;
  product_category: string | null;
  do_number: string | null;
  assigned_technician_id: string | null;
  sales_id: string | null;
  technician_type: string | null;
  external_technician_name: string | null;
  invoice_status: string | null;
  document_url: string | null;
}

// Define types for technicians
interface Technician {
  id: string;
  name: string;
  type: string;
}

// Define types for customers
interface Customer {
  id: string;
  customer_name: string;
  company_name: string | null;
}

const OperasionalSchedulingPage: React.FC = () => {
  const { profile } = useAuthSession();
  const queryClient = useQueryClient();

  const [newRequest, setNewRequest] = useState<Partial<SchedulingRequest>>({
    type: "",
    full_address: "",
    requested_date: format(new Date(), "yyyy-MM-dd"),
    contact_person: "",
    status: "pending",
  });
  const [selectedRequest, setSelectedRequest] = useState<SchedulingRequest | null>(null);
  const [isNewRequestDialogOpen, setIsNewRequestDialogOpen] = useState(false);
  const [isViewRequestDialogOpen, setIsViewRequestDialogOpen] = useState(false);
  const [isEditRequestDialogOpen, setIsEditRequestDialogOpen] = useState(false);
  const [isUploadDocumentDialogOpen, setIsUploadDocumentDialogOpen] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Fetch Scheduling Requests
  const { data: schedulingRequests, isLoading: isLoadingRequests, error: requestsError } = useQuery<SchedulingRequest[]>({
    queryKey: ["schedulingRequests", activeTab, searchTerm, filterStatus],
    queryFn: async () => {
      let query = supabase.from("scheduling_requests").select("*");

      if (activeTab !== "all") {
        query = query.eq("status", activeTab);
      }
      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }
      if (searchTerm) {
        query = query.or(
          `sr_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,full_address.ilike.%${searchTerm}%`
        );
      }

      // Order by created_at in descending order (newest first)
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch Technicians
  const { data: technicians, isLoading: isLoadingTechnicians, error: techniciansError } = useQuery<Technician[]>({
    queryKey: ["technicians"],
    queryFn: async () => {
      const { data, error } = await supabase.from("technicians").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch Customers
  const { data: customers, isLoading: isLoadingCustomers, error: customersError } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (requestsError) {
      showError("Error fetching scheduling requests: " + requestsError.message);
    }
    if (techniciansError) {
      showError("Error fetching technicians: " + techniciansError.message);
    }
    if (customersError) {
      showError("Error fetching customers: " + customersError.message);
    }
  }, [requestsError, techniciansError, customersError]);

  const createRequestMutation = useMutation({
    mutationFn: async (request: Partial<SchedulingRequest>) => {
      const { data, error } = await supabase.from("scheduling_requests").insert(request).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedulingRequests"] });
      setIsNewRequestDialogOpen(false);
      toast.success("Scheduling request created successfully!");
    },
    onError: (error: Error) => {
      showError("Failed to create scheduling request: " + error.message);
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: async (request: SchedulingRequest) => {
      const { data, error } = await supabase.from("scheduling_requests").update(request).eq("id", request.id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedulingRequests"] });
      setIsEditRequestDialogOpen(false);
      setIsViewRequestDialogOpen(false); // Close view dialog if open
      toast.success("Scheduling request updated successfully!");
    },
    onError: (error: Error) => {
      showError("Failed to update scheduling request: " + error.message);
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scheduling_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedulingRequests"] });
      toast.success("Scheduling request deleted successfully!");
    },
    onError: (error: Error) => {
      showError("Failed to delete scheduling request: " + error.message);
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${id}.${fileExt}`;
      const filePath = `scheduling_documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error("Failed to get public URL for the document.");
      }

      const { error: updateError } = await supabase
        .from("scheduling_requests")
        .update({ document_url: publicUrlData.publicUrl })
        .eq("id", id);

      if (updateError) throw updateError;

      return publicUrlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedulingRequests"] });
      setIsUploadDocumentDialogOpen(false);
      setDocumentFile(null);
      toast.success("Document uploaded successfully!");
    },
    onError: (error: Error) => {
      showError("Failed to upload document: " + error.message);
    },
  });

  const handleCreateRequest = async () => {
    if (!profile?.id) {
      showError("User not authenticated.");
      return;
    }
    createRequestMutation.mutate({ ...newRequest, user_id: profile.id });
  };

  const handleUpdateRequest = async () => {
    if (selectedRequest) {
      updateRequestMutation.mutate(selectedRequest);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    deleteRequestMutation.mutate(id);
  };

  const handleUploadDocument = async () => {
    if (selectedRequest && documentFile) {
      uploadDocumentMutation.mutate({ id: selectedRequest.id, file: documentFile });
    } else {
      showError("No request selected or no file chosen.");
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "default";
      case "approved":
        return "success";
      case "in_progress":
        return "info";
      case "completed":
        return "secondary";
      case "rejected":
        return "destructive";
      case "rescheduled":
        return "warning";
      case "cancelled":
        return "outline";
      default:
        return "default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "approved":
        return "Approved";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      case "rejected":
        return "Rejected";
      case "rescheduled":
        return "Rescheduled";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const getRoleBasedActions = (request: SchedulingRequest) => {
    const actions = [];
    if (profile?.role === "SUPER_ADMIN" || profile?.role === "OPERASIONAL_DIV") {
      actions.push(
        <Button key="edit" variant="ghost" size="icon" onClick={() => { setSelectedRequest(request); setIsEditRequestDialogOpen(true); }}>
          <Edit className="h-4 w-4 text-blue-500" />
        </Button>,
        <AlertDialog key="delete">
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the scheduling request.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDeleteRequest(request.id)}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>,
        <Dialog key="upload">
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setSelectedRequest(request)}>
              <Upload className="h-4 w-4 text-green-500" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document for SR: {request.sr_number}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label htmlFor="document" className="text-right">Document File</Label>
              <Input
                id="document"
                type="file"
                onChange={(e) => setDocumentFile(e.target.files ? e.target.files[0] : null)}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleUploadDocument} disabled={!documentFile || uploadDocumentMutation.isPending}>
                {uploadDocumentMutation.isPending ? "Uploading..." : "Upload Document"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }
    // Add technician specific actions if needed
    if (profile?.role === "TECHNICIAN" && request.assigned_technician_id === profile.id) {
      // Technician can update status to 'in_progress' or 'completed'
      if (request.status === "approved" || request.status === "rescheduled") {
        actions.push(
          <Button key="start" variant="ghost" size="icon" onClick={() => {
            setSelectedRequest({ ...request, status: "in_progress" });
            setIsEditRequestDialogOpen(true);
          }}>
            <Clock className="h-4 w-4 text-yellow-500" />
          </Button>
        );
      }
      if (request.status === "in_progress") {
        actions.push(
          <Button key="complete" variant="ghost" size="icon" onClick={() => {
            setSelectedRequest({ ...request, status: "completed" });
            setIsEditRequestDialogOpen(true);
          }}>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </Button>
        );
      }
    }
    return actions;
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-[calc(100vh-60px)] rounded-lg border border-gray-700">
      <ResizablePanel defaultSize={50} minSize={30}>
        <div className="p-4 h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="bg-midnight-blue border border-gray-700">
              <TabsTrigger value="all" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">All</TabsTrigger>
              <TabsTrigger value="pending" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Pending</TabsTrigger>
              <TabsTrigger value="approved" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Approved</TabsTrigger>
              <TabsTrigger value="in_progress" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">In Progress</TabsTrigger>
              <TabsTrigger value="completed" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Completed</TabsTrigger>
              <TabsTrigger value="rejected" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Rejected</TabsTrigger>
              <TabsTrigger value="rescheduled" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Rescheduled</TabsTrigger>
              <TabsTrigger value="cancelled" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Cancelled</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search SR number, customer, address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm bg-midnight-blue border-gray-700 text-gray-200 placeholder:text-gray-500"
              />
              <Button variant="outline" size="icon" className="bg-midnight-blue border-gray-700 text-neon-cyan hover:bg-gray-800">
                <Search className="h-4 w-4" />
              </Button>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px] bg-midnight-blue border-gray-700 text-gray-200">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent className="bg-midnight-blue border-gray-700 text-gray-200">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Dialog open={isNewRequestDialogOpen} onOpenChange={setIsNewRequestDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-neon-cyan text-deep-charcoal hover:bg-neon-cyan/90">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create New Request
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] bg-midnight-blue text-gray-200 border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-neon-cyan">Create New Scheduling Request</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="type" className="text-right">Type</Label>
                    <Select
                      value={newRequest.type || ""}
                      onValueChange={(value) => setNewRequest({ ...newRequest, type: value })}
                    >
                      <SelectTrigger className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200">
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent className="bg-midnight-blue border-gray-700 text-gray-200">
                        <SelectItem value="INSTALLATION">Installation</SelectItem>
                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                        <SelectItem value="REPAIR">Repair</SelectItem>
                        <SelectItem value="SURVEY">Survey</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="customer_id" className="text-right">Customer</Label>
                    <Select
                      value={newRequest.customer_id || ""}
                      onValueChange={(value) => setNewRequest({ ...newRequest, customer_id: value })}
                    >
                      <SelectTrigger className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200">
                        <SelectValue placeholder="Select Customer" />
                      </SelectTrigger>
                      <SelectContent className="bg-midnight-blue border-gray-700 text-gray-200">
                        {isLoadingCustomers ? (
                          <SelectItem value="loading" disabled>Loading customers...</SelectItem>
                        ) : (
                          customers?.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.customer_name} {customer.company_name ? `(${customer.company_name})` : ""}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="customer_name" className="text-right">Customer Name</Label>
                    <Input
                      id="customer_name"
                      value={newRequest.customer_name || ""}
                      onChange={(e) => setNewRequest({ ...newRequest, customer_name: e.target.value })}
                      className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="company_name" className="text-right">Company Name</Label>
                    <Input
                      id="company_name"
                      value={newRequest.company_name || ""}
                      onChange={(e) => setNewRequest({ ...newRequest, company_name: e.target.value })}
                      className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phone_number" className="text-right">Phone Number</Label>
                    <Input
                      id="phone_number"
                      value={newRequest.phone_number || ""}
                      onChange={(e) => setNewRequest({ ...newRequest, phone_number: e.target.value })}
                      className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="full_address" className="text-right">Full Address</Label>
                    <Textarea
                      id="full_address"
                      value={newRequest.full_address || ""}
                      onChange={(e) => setNewRequest({ ...newRequest, full_address: e.target.value })}
                      className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="landmark" className="text-right">Landmark</Label>
                    <Input
                      id="landmark"
                      value={newRequest.landmark || ""}
                      onChange={(e) => setNewRequest({ ...newRequest, landmark: e.target.value })}
                      className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="requested_date" className="text-right">Requested Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "col-span-3 justify-start text-left font-normal bg-deep-charcoal border-gray-700 text-gray-200",
                            !newRequest.requested_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newRequest.requested_date ? format(new Date(newRequest.requested_date), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-midnight-blue border-gray-700">
                        <Calendar
                          mode="single"
                          selected={newRequest.requested_date ? new Date(newRequest.requested_date) : undefined}
                          onSelect={(date) => setNewRequest({ ...newRequest, requested_date: date ? format(date, "yyyy-MM-dd") : "" })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="requested_time" className="text-right">Requested Time</Label>
                    <Input
                      id="requested_time"
                      type="time"
                      value={newRequest.requested_time || ""}
                      onChange={(e) => setNewRequest({ ...newRequest, requested_time: e.target.value })}
                      className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="contact_person" className="text-right">Contact Person</Label>
                    <Input
                      id="contact_person"
                      value={newRequest.contact_person || ""}
                      onChange={(e) => setNewRequest({ ...newRequest, contact_person: e.target.value })}
                      className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="payment_method" className="text-right">Payment Method</Label>
                    <Select
                      value={newRequest.payment_method || ""}
                      onValueChange={(value) => setNewRequest({ ...newRequest, payment_method: value })}
                    >
                      <SelectTrigger className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200">
                        <SelectValue placeholder="Select Payment Method" />
                      </SelectTrigger>
                      <SelectContent className="bg-midnight-blue border-gray-700 text-gray-200">
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="TRANSFER">Transfer</SelectItem>
                        <SelectItem value="CREDIT">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="product_category" className="text-right">Product Category</Label>
                    <Select
                      value={newRequest.product_category || ""}
                      onValueChange={(value) => setNewRequest({ ...newRequest, product_category: value })}
                    >
                      <SelectTrigger className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200">
                        <SelectValue placeholder="Select Product Category" />
                      </SelectTrigger>
                      <SelectContent className="bg-midnight-blue border-gray-700 text-gray-200">
                        <SelectItem value="CCTV">CCTV</SelectItem>
                        <SelectItem value="FIBER_OPTIC">Fiber Optic</SelectItem>
                        <SelectItem value="NETWORKING">Networking</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="vehicle_details" className="text-right">Vehicle Details</Label>
                    <Input
                      id="vehicle_details"
                      value={newRequest.vehicle_details || ""}
                      onChange={(e) => setNewRequest({ ...newRequest, vehicle_details: e.target.value })}
                      className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="assigned_technician_id" className="text-right">Assigned Technician</Label>
                    <Select
                      value={newRequest.assigned_technician_id || ""}
                      onValueChange={(value) => setNewRequest({ ...newRequest, assigned_technician_id: value })}
                    >
                      <SelectTrigger className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200">
                        <SelectValue placeholder="Select Technician" />
                      </SelectTrigger>
                      <SelectContent className="bg-midnight-blue border-gray-700 text-gray-200">
                        {isLoadingTechnicians ? (
                          <SelectItem value="loading" disabled>Loading technicians...</SelectItem>
                        ) : (
                          technicians?.map((tech) => (
                            <SelectItem key={tech.id} value={tech.id}>
                              {tech.name} ({tech.type})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="technician_type" className="text-right">Technician Type</Label>
                    <Select
                      value={newRequest.technician_type || ""}
                      onValueChange={(value) => setNewRequest({ ...newRequest, technician_type: value })}
                    >
                      <SelectTrigger className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200">
                        <SelectValue placeholder="Select Technician Type" />
                      </SelectTrigger>
                      <SelectContent className="bg-midnight-blue border-gray-700 text-gray-200">
                        <SelectItem value="INTERNAL">Internal</SelectItem>
                        <SelectItem value="EXTERNAL">External</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newRequest.technician_type === "EXTERNAL" && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="external_technician_name" className="text-right">External Technician Name</Label>
                      <Input
                        id="external_technician_name"
                        value={newRequest.external_technician_name || ""}
                        onChange={(e) => setNewRequest({ ...newRequest, external_technician_name: e.target.value })}
                        className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="notes" className="text-right">Notes</Label>
                    <Textarea
                      id="notes"
                      value={newRequest.notes || ""}
                      onChange={(e) => setNewRequest({ ...newRequest, notes: e.target.value })}
                      className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateRequest} disabled={createRequestMutation.isPending}>
                    {createRequestMutation.isPending ? "Creating..." : "Create Request"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isLoadingRequests ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full bg-gray-700" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-gray-700 overflow-hidden">
              <Table className="min-w-full divide-y divide-gray-700">
                <TableHeader className="bg-midnight-blue">
                  <TableRow>
                    <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">SR Number</TableHead>
                    <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Customer</TableHead>
                    <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</TableHead>
                    <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</TableHead>
                    <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</TableHead>
                    <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Assigned Technician</TableHead>
                    <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-deep-charcoal divide-y divide-gray-800">
                  {schedulingRequests?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-gray-400">No scheduling requests found.</TableCell>
                    </TableRow>
                  ) : (
                    schedulingRequests?.map((request) => (
                      <TableRow key={request.id} className="hover:bg-gray-800 transition-colors">
                        <TableCell className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-200">{request.sr_number || "N/A"}</TableCell>
                        <TableCell className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{request.customer_name || "N/A"}</TableCell>
                        <TableCell className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{request.type}</TableCell>
                        <TableCell className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">{format(new Date(request.requested_date), "PPP")}</TableCell>
                        <TableCell className="px-4 py-2 whitespace-nowrap text-sm">
                          <Badge variant={getStatusBadgeVariant(request.status)}>{getStatusText(request.status)}</Badge>
                        </TableCell>
                        <TableCell className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">
                          {technicians?.find(tech => tech.id === request.assigned_technician_id)?.name || request.external_technician_name || "N/A"}
                        </TableCell>
                        <TableCell className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedRequest(request); setIsViewRequestDialogOpen(true); }}>
                              <Eye className="h-4 w-4 text-gray-400" />
                            </Button>
                            {getRoleBasedActions(request)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle className="bg-gray-700 hover:bg-neon-cyan" />
      <ResizablePanel defaultSize={50} minSize={30}>
        <div className="p-4 h-full bg-midnight-blue rounded-r-lg">
          <h2 className="text-xl font-bold text-neon-cyan mb-4">Request Details</h2>
          {selectedRequest ? (
            <div className="grid gap-4 text-gray-300">
              <p><strong>SR Number:</strong> {selectedRequest.sr_number || "N/A"}</p>
              <p><strong>Type:</strong> {selectedRequest.type}</p>
              <p><strong>Customer Name:</strong> {selectedRequest.customer_name || "N/A"}</p>
              <p><strong>Company Name:</strong> {selectedRequest.company_name || "N/A"}</p>
              <p><strong>Phone Number:</strong> {selectedRequest.phone_number || "N/A"}</p>
              <p><strong>Full Address:</strong> {selectedRequest.full_address}</p>
              <p><strong>Landmark:</strong> {selectedRequest.landmark || "N/A"}</p>
              <p><strong>Requested Date:</strong> {format(new Date(selectedRequest.requested_date), "PPP")}</p>
              <p><strong>Requested Time:</strong> {selectedRequest.requested_time || "N/A"}</p>
              <p><strong>Contact Person:</strong> {selectedRequest.contact_person}</p>
              <p><strong>Payment Method:</strong> {selectedRequest.payment_method || "N/A"}</p>
              <p><strong>Status:</strong> <Badge variant={getStatusBadgeVariant(selectedRequest.status)}>{getStatusText(selectedRequest.status)}</Badge></p>
              <p><strong>Notes:</strong> {selectedRequest.notes || "N/A"}</p>
              <p><strong>Created At:</strong> {format(new Date(selectedRequest.created_at), "PPP p")}</p>
              <p><strong>Last Updated:</strong> {format(new Date(selectedRequest.updated_at), "PPP p")}</p>
              <p><strong>Product Category:</strong> {selectedRequest.product_category || "N/A"}</p>
              <p><strong>Vehicle Details:</strong> {selectedRequest.vehicle_details || "N/A"}</p>
              <p><strong>Assigned Technician:</strong> {technicians?.find(tech => tech.id === selectedRequest.assigned_technician_id)?.name || selectedRequest.external_technician_name || "N/A"}</p>
              <p><strong>Technician Type:</strong> {selectedRequest.technician_type || "N/A"}</p>
              <p><strong>DO Number:</strong> {selectedRequest.do_number || "N/A"}</p>
              <p><strong>Invoice ID:</strong> {selectedRequest.invoice_id || "N/A"}</p>
              <p><strong>Invoice Status:</strong> {selectedRequest.invoice_status || "N/A"}</p>
              {selectedRequest.document_url && (
                <Button variant="outline" className="mt-4 bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30" onClick={() => window.open(selectedRequest.document_url!, "_blank")}>
                  <Download className="mr-2 h-4 w-4" /> View Document
                </Button>
              )}
            </div>
          ) : (
            <p className="text-gray-400">Select a scheduling request to view details.</p>
          )}
        </div>
      </ResizablePanel>

      {/* Edit Request Dialog */}
      <Dialog open={isEditRequestDialogOpen} onOpenChange={setIsEditRequestDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-midnight-blue text-gray-200 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-neon-cyan">Edit Scheduling Request: {selectedRequest?.sr_number}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-type" className="text-right">Type</Label>
              <Select
                value={selectedRequest?.type || ""}
                onValueChange={(value) => setSelectedRequest({ ...selectedRequest!, type: value })}
              >
                <SelectTrigger id="edit-type" className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent className="bg-midnight-blue border-gray-700 text-gray-200">
                  <SelectItem value="INSTALLATION">Installation</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="REPAIR">Repair</SelectItem>
                  <SelectItem value="SURVEY">Survey</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-customer_id" className="text-right">Customer</Label>
              <Select
                value={selectedRequest?.customer_id || ""}
                onValueChange={(value) => setSelectedRequest({ ...selectedRequest!, customer_id: value })}
              >
                <SelectTrigger id="edit-customer_id" className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200">
                  <SelectValue placeholder="Select Customer" />
                </SelectTrigger>
                <SelectContent className="bg-midnight-blue border-gray-700 text-gray-200">
                  {isLoadingCustomers ? (
                    <SelectItem value="loading" disabled>Loading customers...</SelectItem>
                  ) : (
                    customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.customer_name} {customer.company_name ? `(${customer.company_name})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-customer_name" className="text-right">Customer Name</Label>
              <Input
                id="edit-customer_name"
                value={selectedRequest?.customer_name || ""}
                onChange={(e) => setSelectedRequest({ ...selectedRequest!, customer_name: e.target.value })}
                className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-company_name" className="text-right">Company Name</Label>
              <Input
                id="edit-company_name"
                value={selectedRequest?.company_name || ""}
                onChange={(e) => setSelectedRequest({ ...selectedRequest!, company_name: e.target.value })}
                className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-phone_number" className="text-right">Phone Number</Label>
              <Input
                id="edit-phone_number"
                value={selectedRequest?.phone_number || ""}
                onChange={(e) => setSelectedRequest({ ...selectedRequest!, phone_number: e.target.value })}
                className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-full_address" className="text-right">Full Address</Label>
              <Textarea
                id="edit-full_address"
                value={selectedRequest?.full_address || ""}
                onChange={(e) => setSelectedRequest({ ...selectedRequest!, full_address: e.target.value })}
                className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-landmark" className="text-right">Landmark</Label>
              <Input
                id="edit-landmark"
                value={selectedRequest?.landmark || ""}
                onChange={(e) => setSelectedRequest({ ...selectedRequest!, landmark: e.target.value })}
                className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-requested_date" className="text-right">Requested Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "col-span-3 justify-start text-left font-normal bg-deep-charcoal border-gray-700 text-gray-200",
                      !selectedRequest?.requested_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedRequest?.requested_date ? format(new Date(selectedRequest.requested_date), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-midnight-blue border-gray-700">
                  <Calendar
                    mode="single"
                    selected={selectedRequest?.requested_date ? new Date(selectedRequest.requested_date) : undefined}
                    onSelect={(date) => setSelectedRequest({ ...selectedRequest!, requested_date: date ? format(date, "yyyy-MM-dd") : "" })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-requested_time" className="text-right">Requested Time</Label>
              <Input
                id="edit-requested_time"
                type="time"
                value={selectedRequest?.requested_time || ""}
                onChange={(e) => setSelectedRequest({ ...selectedRequest!, requested_time: e.target.value })}
                className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-contact_person" className="text-right">Contact Person</Label>
              <Input
                id="edit-contact_person"
                value={selectedRequest?.contact_person || ""}
                onChange={(e) => setSelectedRequest({ ...selectedRequest!, contact_person: e.target.value })}
                className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-payment_method" className="text-right">Payment Method</Label>
              <Select
                value={selectedRequest?.payment_method || ""}
                onValueChange={(value) => setSelectedRequest({ ...selectedRequest!, payment_method: value })}
              >
                <SelectTrigger id="edit-payment_method" className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200">
                  <SelectValue placeholder="Select Payment Method" />
                </SelectTrigger>
                <SelectContent className="bg-midnight-blue border-gray-700 text-gray-200">
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                  <SelectItem value="CREDIT">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-product_category" className="text-right">Product Category</Label>
              <Select
                value={selectedRequest?.product_category || ""}
                onValueChange={(value) => setSelectedRequest({ ...selectedRequest!, product_category: value })}
              >
                <SelectTrigger id="edit-product_category" className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200">
                  <SelectValue placeholder="Select Product Category" />
                </SelectTrigger>
                <SelectContent className="bg-midnight-blue border-gray-700 text-gray-200">
                  <SelectItem value="CCTV">CCTV</SelectItem>
                  <SelectItem value="FIBER_OPTIC">Fiber Optic</SelectItem>
                  <SelectItem value="NETWORKING">Networking</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-vehicle_details" className="text-right">Vehicle Details</Label>
              <Input
                id="edit-vehicle_details"
                value={selectedRequest?.vehicle_details || ""}
                onChange={(e) => setSelectedRequest({ ...selectedRequest!, vehicle_details: e.target.value })}
                className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-assigned_technician_id" className="text-right">Assigned Technician</Label>
              <Select
                value={selectedRequest?.assigned_technician_id || ""}
                onValueChange={(value) => setSelectedRequest({ ...selectedRequest!, assigned_technician_id: value })}
              >
                <SelectTrigger id="edit-assigned_technician_id" className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200">
                  <SelectValue placeholder="Select Technician" />
                </SelectTrigger>
                <SelectContent className="bg-midnight-blue border-gray-700 text-gray-200">
                  {isLoadingTechnicians ? (
                    <SelectItem value="loading" disabled>Loading technicians...</SelectItem>
                  ) : (
                    technicians?.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.name} ({tech.type})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-technician_type" className="text-right">Technician Type</Label>
              <Select
                value={selectedRequest?.technician_type || ""}
                onValueChange={(value) => setSelectedRequest({ ...selectedRequest!, technician_type: value })}
              >
                <SelectTrigger id="edit-technician_type" className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200">
                  <SelectValue placeholder="Select Technician Type" />
                </SelectTrigger>
                <SelectContent className="bg-midnight-blue border-gray-700 text-gray-200">
                  <SelectItem value="INTERNAL">Internal</SelectItem>
                  <SelectItem value="EXTERNAL">External</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedRequest?.technician_type === "EXTERNAL" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-external_technician_name" className="text-right">External Technician Name</Label>
                <Input
                  id="edit-external_technician_name"
                  value={selectedRequest?.external_technician_name || ""}
                  onChange={(e) => setSelectedRequest({ ...selectedRequest!, external_technician_name: e.target.value })}
                  className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200"
                />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-status" className="text-right">Status</Label>
              <Select
                value={selectedRequest?.status || ""}
                onValueChange={(value) => setSelectedRequest({ ...selectedRequest!, status: value })}
              >
                <SelectTrigger id="edit-status" className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent className="bg-midnight-blue border-gray-700 text-gray-200">
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-notes" className="text-right">Notes</Label>
              <Textarea
                id="edit-notes"
                value={selectedRequest?.notes || ""}
                onChange={(e) => setSelectedRequest({ ...selectedRequest!, notes: e.target.value })}
                className="col-span-3 bg-deep-charcoal border-gray-700 text-gray-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateRequest} disabled={updateRequestMutation.isPending}>
              {updateRequestMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ResizablePanelGroup>
  );
};

export default OperasionalSchedulingPage;
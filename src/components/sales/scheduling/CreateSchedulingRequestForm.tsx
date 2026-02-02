"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface Customer {
  id: string;
  customer_name: string;
  company_name?: string;
  address?: string;
  phone_number?: string;
}

interface Technician {
  id: string;
  name: string;
  type: 'internal' | 'external';
}

const formSchema = z.object({
  customer_id: z.string().optional(), // New field for selected customer ID
  customerName: z.string().min(2, { message: "Customer name must be at least 2 characters." }),
  companyName: z.string().optional(),
  phoneNumber: z.string().min(10, { message: "Phone number must be at least 10 characters." }),
  contactPerson: z.string().min(2, { message: "Contact person must be at least 2 characters." }),
  fullAddress: z.string().min(5, { message: "Full address must be at least 5 characters." }),
  landmark: z.string().optional(),
  requestedDate: z.date({ required_error: "A date for the request is required." }),
  requestedTime: z.string().optional(),
  type: z.enum(["INSTALLATION", "SERVICE", "SERVICE_UNBILL", "DELIVERY"], { required_error: "Please select a request type." }),
  productCategory: z.enum(["gps_tracker", "dashcam", "OTHER"]).optional(),
  vehicleDetails: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: z.enum(["Cash", "Transfer", "DP", "Lainnya"]).optional(), // Updated to enum
  assignedTechnicianId: z.string().optional(),
  technicianName: z.string().optional(),
  technicianType: z.enum(["INTERNAL", "EXTERNAL"]).optional(),
  externalTechnicianName: z.string().optional(),
});

interface CreateSchedulingRequestFormProps {
  onFormSubmit?: () => void;
}

export const CreateSchedulingRequestForm = ({ onFormSubmit }: CreateSchedulingRequestFormProps) => {
  const [activeTab, setActiveTab] = useState("customer-contact");
  const [openCustomerCombobox, setOpenCustomerCombobox] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_id: "",
      customerName: "",
      companyName: "",
      phoneNumber: "",
      contactPerson: "",
      fullAddress: "",
      landmark: "",
      requestedTime: "",
      type: "INSTALLATION",
      productCategory: "gps_tracker",
      vehicleDetails: "",
      notes: "",
      paymentMethod: "Cash", // Default to Cash
      technicianType: "INTERNAL",
      externalTechnicianName: "",
    },
  });

  const { data: customers, isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id, customer_name, company_name, address, phone_number");
      if (error) throw error;
      return data;
    },
  });

  const { data: technicians, isLoading: isLoadingTechnicians } = useQuery<Technician[]>({
    queryKey: ["technicians"],
    queryFn: async () => {
      const { data, error } = await supabase.from("technicians").select("id, name, type");
      if (error) throw error;
      return data;
    },
  });

  const selectedCustomerId = form.watch("customer_id");

  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers?.find(c => c.id === selectedCustomerId);
      if (customer) {
        form.setValue("customerName", customer.customer_name);
        form.setValue("companyName", customer.company_name || "");
        form.setValue("phoneNumber", customer.phone_number || "");
        form.setValue("fullAddress", customer.address || "");
        // contactPerson and landmark are not in customers table, so they remain editable or default
      }
    } else {
      // If no customer is selected, allow manual input by clearing values
      form.setValue("customerName", "");
      form.setValue("companyName", "");
      form.setValue("phoneNumber", "");
      form.setValue("fullAddress", "");
    }
  }, [selectedCustomerId, customers, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const payload = {
      customer_id: values.customer_id || null, // Include customer_id if selected
      customer_name: values.customerName,
      company_name: values.companyName,
      phone_number: values.phoneNumber,
      contact_person: values.contactPerson,
      full_address: values.fullAddress,
      landmark: values.landmark,
      requested_date: format(values.requestedDate, "yyyy-MM-dd"),
      requested_time: values.requestedTime,
      type: values.type,
      product_category: values.productCategory,
      vehicle_details: values.vehicleDetails,
      notes: values.notes,
      payment_method: values.paymentMethod,
      status: "pending",
      assigned_technician_id: values.technicianType === "INTERNAL" ? values.assignedTechnicianId : null,
      technician_name: values.technicianType === "INTERNAL" ? values.technicianName : values.externalTechnicianName,
      technician_type: values.technicianType,
      external_technician_name: values.technicianType === "EXTERNAL" ? values.externalTechnicianName : null,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    };

    const { error } = await supabase.from("scheduling_requests").insert([payload]);

    if (error) {
      toast.error("Failed to create scheduling request.", {
        description: error.message,
      });
      console.error("Error creating scheduling request:", error);
    } else {
      toast.success("Scheduling request created successfully!");
      form.reset();
      setActiveTab("customer-contact");
      if (onFormSubmit) onFormSubmit();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4 text-gray-300">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-midnight-blue border border-gray-700">
            <TabsTrigger value="customer-contact" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Customer & Contact</TabsTrigger>
            <TabsTrigger value="scheduling-details" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Scheduling Details</TabsTrigger>
            <TabsTrigger value="product-notes" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Product & Notes</TabsTrigger>
            <TabsTrigger value="technician-assignment" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Technician Assignment</TabsTrigger>
          </TabsList>

          <TabsContent value="customer-contact" className="space-y-4">
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-gray-300">Select Existing Customer (Optional)</FormLabel>
                  <Popover open={openCustomerCombobox} onOpenChange={setOpenCustomerCombobox}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between glassmorphism border border-gray-700 text-gray-300 hover:bg-gray-800",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? customers?.find((customer) => customer.id === field.value)?.customer_name
                            : "Select customer or enter new details"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0 glassmorphism border border-gray-700">
                      <Command>
                        <CommandInput placeholder="Search customer..." className="text-gray-300" />
                        <CommandList>
                          <CommandEmpty>No customer found.</CommandEmpty>
                          <CommandGroup>
                            {customers?.map((customer) => (
                              <CommandItem
                                value={customer.customer_name}
                                key={customer.id}
                                onSelect={() => {
                                  form.setValue("customer_id", customer.id);
                                  setOpenCustomerCombobox(false);
                                }}
                                className="text-gray-300 hover:bg-gray-800/50"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    customer.id === field.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {customer.customer_name} ({customer.company_name || 'Individual'})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Customer Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Customer Name" {...field} className="bg-gray-800 border-gray-700 text-gray-300" disabled={!!selectedCustomerId} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Company Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Company Name" {...field} className="bg-gray-800 border-gray-700 text-gray-300" disabled={!!selectedCustomerId} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Phone Number" {...field} className="bg-gray-800 border-gray-700 text-gray-300" disabled={!!selectedCustomerId} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Contact Person</FormLabel>
                  <FormControl>
                    <Input placeholder="Contact Person" {...field} className="bg-gray-800 border-gray-700 text-gray-300" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fullAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Full Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Full Address" {...field} className="bg-gray-800 border-gray-700 text-gray-300" disabled={!!selectedCustomerId} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="landmark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Landmark (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Landmark" {...field} className="bg-gray-800 border-gray-700 text-gray-300" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="scheduling-details" className="space-y-4">
            <FormField
              control={form.control}
              name="requestedDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-gray-300">Requested Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal bg-gray-800 border-gray-700 text-gray-300",
                            !field.value && "text-gray-500"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700 text-gray-300" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription className="text-gray-500">
                    The date for the requested service.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="requestedTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Requested Time (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 09:00 AM - 12:00 PM" {...field} className="bg-gray-800 border-gray-700 text-gray-300" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Request Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-300">
                        <SelectValue placeholder="Select a request type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-gray-800 border-gray-700 text-gray-300">
                      <SelectItem value="INSTALLATION">Installation</SelectItem>
                      <SelectItem value="SERVICE">Service</SelectItem>
                      <SelectItem value="SERVICE_UNBILL">Service Unbill</SelectItem>
                      <SelectItem value="DELIVERY">Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-gray-500">
                    The type of service being requested.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Payment Method (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-300">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-gray-800 border-gray-700 text-gray-300">
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Transfer">Transfer</SelectItem>
                      <SelectItem value="DP">DP</SelectItem>
                      <SelectItem value="Lainnya">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="product-notes" className="space-y-4">
            <FormField
              control={form.control}
              name="productCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Product Category (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-300">
                        <SelectValue placeholder="Select a product category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-gray-800 border-gray-700 text-gray-300">
                      <SelectItem value="gps_tracker">GPS Tracker</SelectItem>
                      <SelectItem value="dashcam">Dashcam</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-gray-500">
                    The category of product related to the service.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vehicleDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Vehicle Details (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Car, Motorcycle, Van" {...field} className="bg-gray-800 border-gray-700 text-gray-300" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any additional notes or special instructions" {...field} className="bg-gray-800 border-gray-700 text-gray-300" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="technician-assignment" className="space-y-4">
            <FormField
              control={form.control}
              name="technicianType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-gray-300">Technician Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="INTERNAL" />
                        </FormControl>
                        <FormLabel className="font-normal text-gray-400">
                          Internal Technician
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="EXTERNAL" />
                        </FormControl>
                        <FormLabel className="font-normal text-gray-400">
                          External Technician
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("technicianType") === "INTERNAL" && (
              <FormField
                control={form.control}
                name="assignedTechnicianId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Assigned Technician</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        const selectedTech = technicians?.find((tech) => tech.id === value);
                        form.setValue("technicianName", selectedTech?.name || "");
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-300">
                          <SelectValue placeholder="Select an internal technician" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-gray-800 border-gray-700 text-gray-300">
                        {isLoadingTechnicians ? (
                          <SelectItem value="loading" disabled>Loading technicians...</SelectItem>
                        ) : (
                          technicians?.map((tech) => (
                            <SelectItem key={tech.id} value={tech.id}>
                              {tech.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-gray-500">
                      Select an internal technician for this request.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {form.watch("technicianType") === "EXTERNAL" && (
              <FormField
                control={form.control}
                name="externalTechnicianName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">External Technician Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter external technician's name" {...field} className="bg-gray-800 border-gray-700 text-gray-300" />
                    </FormControl>
                    <FormDescription className="text-gray-500">
                      Enter the name of the external technician.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </TabsContent>
        </Tabs>
        <Button type="submit" className="w-full bg-neon-cyan hover:bg-neon-cyan/90 text-gray-900 font-bold py-2 px-4 rounded-md shadow-neon-glow transition-all duration-200">
          Submit Request
        </Button>
      </form>
    </Form>
  );
};

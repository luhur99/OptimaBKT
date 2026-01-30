import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { showSuccess, showError } from "@/utils/toast";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Customer {
  id: string;
  customer_name: string;
  company_name?: string;
  address?: string;
  phone_number?: string;
}

interface CreateSchedulingRequestFormProps {
  onFormSubmit: () => void;
}

const formSchema = z.object({
  customer_id: z.string().min(1, { message: "Customer is required." }),
  customer_name: z.string().min(1, { message: "Customer name is required." }),
  company_name: z.string().optional(),
  type: z.enum(["INSTALLATION", "SERVICE", "SERVICE_UNBILL", "DELIVERY"], {
    required_error: "Please select a request type.",
  }),
  full_address: z.string().min(1, { message: "Full address is required." }),
  landmark: z.string().optional(),
  requested_date: z.date({
    required_error: "A requested date is required.",
  }),
  requested_time: z.string().optional(),
  contact_person: z.string().min(1, { message: "Contact person is required." }),
  phone_number: z.string().min(1, { message: "Phone number is required." }),
  payment_method: z.enum(["COD", "TRANSFER", "PAYMENT_GATEWAY", "DP", "OTHER"], { // Updated to enum
    required_error: "Please select a payment method.",
  }),
  notes: z.string().optional(),
  vehicle_details: z.string().optional(),
  product_category: z.enum(["SIAP_JUAL", "RUSAK", "MAINTENANCE", "GPS_TRACKER", "DASHCAM"]).optional(),
});

export function CreateSchedulingRequestForm({ onFormSubmit }: CreateSchedulingRequestFormProps) {
  const { session } = useAuthSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [openCustomerCombobox, setOpenCustomerCombobox] = useState(false);
  const [activeTab, setActiveTab] = useState("customer-contact"); // State for active tab

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_id: "",
      customer_name: "",
      company_name: "",
      type: "INSTALLATION",
      full_address: "",
      landmark: "",
      requested_date: new Date(),
      requested_time: "",
      contact_person: "",
      phone_number: "",
      payment_method: "COD", // Default payment method
      notes: "",
      vehicle_details: "",
      product_category: undefined,
    },
  });

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, customer_name, company_name, address, phone_number");

      if (error) {
        console.error("Error fetching customers:", error);
        showError("Failed to load customers for autosuggest.");
      } else {
        setCustomers(data || []);
      }
    };
    fetchCustomers();
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("scheduling_requests")
        .insert({
          user_id: session?.user?.id,
          customer_id: values.customer_id,
          customer_name: values.customer_name,
          company_name: values.company_name,
          type: values.type,
          full_address: values.full_address,
          landmark: values.landmark,
          requested_date: format(values.requested_date, "yyyy-MM-dd"),
          requested_time: values.requested_time,
          contact_person: values.contact_person,
          phone_number: values.phone_number,
          payment_method: values.payment_method,
          notes: values.notes,
          vehicle_details: values.vehicle_details,
          product_category: values.product_category,
          status: "pending", // Default status
          invoice_status: "DRAFT", // Default invoice status
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      showSuccess(`Scheduling request ${data.sr_number} created successfully!`);
      form.reset();
      setActiveTab("customer-contact"); // Reset to first tab
      onFormSubmit();
    } catch (error: any) {
      showError(error.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4 text-gray-300">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-midnight-blue border border-gray-700">
            <TabsTrigger value="customer-contact" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Customer & Contact</TabsTrigger>
            <TabsTrigger value="request-details" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Request Details</TabsTrigger>
            <TabsTrigger value="location-notes" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Location & Notes</TabsTrigger>
          </TabsList>
          <TabsContent value="customer-contact" className="mt-4 space-y-6">
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-gray-300">Customer</FormLabel>
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
                            ? customers.find((customer) => customer.id === field.value)?.customer_name
                            : "Select customer"}
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
                            {customers.map((customer) => (
                              <CommandItem
                                value={customer.customer_name}
                                key={customer.id}
                                onSelect={() => {
                                  form.setValue("customer_id", customer.id);
                                  form.setValue("customer_name", customer.customer_name);
                                  form.setValue("company_name", customer.company_name || "");
                                  form.setValue("full_address", customer.address || "");
                                  form.setValue("phone_number", customer.phone_number || "");
                                  form.setValue("contact_person", customer.customer_name); // Default contact person
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
                                {customer.customer_name} ({customer.company_name || "Individual"})
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
              name="contact_person"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Contact Person</FormLabel>
                  <FormControl>
                    <Input placeholder="Name of contact person" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Phone Number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="e.g., +628123456789" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Company Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., PT. ABC Jaya" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="request-details" className="mt-4 space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Request Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="glassmorphism border border-gray-700 text-gray-300">
                        <SelectValue placeholder="Select request type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="glassmorphism border border-gray-700 text-gray-300">
                      <SelectItem value="INSTALLATION">Instalasi</SelectItem>
                      <SelectItem value="SERVICE">Service</SelectItem>
                      <SelectItem value="SERVICE_UNBILL">Service Unbill</SelectItem>
                      <SelectItem value="DELIVERY">Kirim</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="requested_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-gray-300">Requested Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal glassmorphism border border-gray-700 text-gray-300 hover:bg-gray-800",
                              !field.value && "text-muted-foreground"
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
                      <PopoverContent className="w-auto p-0 glassmorphism border border-gray-700" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                          className="text-gray-300"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requested_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Requested Time (Optional)</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="product_category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Product Category (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} >
                    <FormControl>
                      <SelectTrigger className="glassmorphism border border-gray-700 text-gray-300">
                        <SelectValue placeholder="Select product category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="glassmorphism border border-gray-700 text-gray-300">
                      <SelectItem value="SIAP_JUAL">Siap Jual</SelectItem>
                      <SelectItem value="RUSAK">Rusak</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      <SelectItem value="GPS_TRACKER">GPS Tracker</SelectItem>
                      <SelectItem value="DASHCAM">Dashcam</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Payment Method (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="glassmorphism border border-gray-700 text-gray-300">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="glassmorphism border border-gray-700 text-gray-300">
                      <SelectItem value="COD">COD</SelectItem>
                      <SelectItem value="TRANSFER">Transfer</SelectItem>
                      <SelectItem value="PAYMENT_GATEWAY">Payment Gateway Qris / VA</SelectItem>
                      <SelectItem value="DP">DP</SelectItem>
                      <SelectItem value="OTHER">Lain - Lain</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vehicle_details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Vehicle Details (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Car type, License plate" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="location-notes" className="mt-4 space-y-6">
            <FormField
              control={form.control}
              name="full_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Full Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Customer's full address" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
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
                    <Input placeholder="e.g., Near ABC Mall" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
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
                  <FormLabel className="text-gray-300">Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any specific instructions or details" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>

        <Button type="submit" className="w-full bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300" disabled={isSubmitting}>
          {isSubmitting ? "Submitting Request..." : "Submit Scheduling Request"}
        </Button>
      </form>
    </Form>
  );
}
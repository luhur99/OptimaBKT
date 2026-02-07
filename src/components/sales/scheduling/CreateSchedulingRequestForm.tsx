"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type FieldErrors, useForm } from "react-hook-form";
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
  customerName: z.string().min(2, { message: "Nama customer minimal 2 karakter." }),
  companyName: z.string().optional(),
  phoneNumber: z.string().min(10, { message: "Nomor telepon minimal 10 karakter." }),
  contactPerson: z.string().min(2, { message: "Nama PIC minimal 2 karakter." }),
  fullAddress: z.string().min(5, { message: "Alamat lengkap minimal 5 karakter." }),
  landmark: z.string().optional(),
  requestedDate: z.date({ required_error: "Tanggal permintaan wajib diisi." }),
  requestedTime: z.string().optional(),
  type: z.enum(["INSTALLATION", "SERVICE", "SERVICE_UNBILL", "DELIVERY"], { required_error: "Jenis permintaan wajib dipilih." }),
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
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const userId = authData?.user?.id;

    if (authError || !userId) {
      toast.error("You must be signed in to create a scheduling request.");
      return;
    }

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
      user_id: userId,
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

  const handleValidationError = (errors: FieldErrors<z.infer<typeof formSchema>>) => {
    const firstError = Object.values(errors)[0];
    const message = firstError?.message || "Periksa kembali isian wajib.";
    toast.error(String(message));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, handleValidationError)} className="space-y-6 p-4 text-gray-300">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-midnight-blue border border-gray-700">
            <TabsTrigger value="customer-contact" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Customer & Kontak</TabsTrigger>
            <TabsTrigger value="scheduling-details" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Detail Penjadwalan</TabsTrigger>
            <TabsTrigger value="product-notes" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Produk & Catatan</TabsTrigger>
            <TabsTrigger value="technician-assignment" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Penugasan Teknisi</TabsTrigger>
          </TabsList>

          <TabsContent value="customer-contact" className="space-y-4">
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-gray-300">Pilih Customer (Opsional)</FormLabel>
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
                            : "Pilih customer atau isi data baru"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0 glassmorphism border border-gray-700">
                      <Command>
                        <CommandInput placeholder="Cari customer..." className="text-gray-300" />
                        <CommandList>
                          <CommandEmpty>Customer tidak ditemukan.</CommandEmpty>
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
                  <FormLabel className="text-gray-300">Nama Customer <span className="text-red-400">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Nama customer" {...field} className="bg-gray-800 border-gray-700 text-gray-300" disabled={!!selectedCustomerId} />
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
                  <FormLabel className="text-gray-300">Nama Perusahaan (Opsional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Nama perusahaan" {...field} className="bg-gray-800 border-gray-700 text-gray-300" disabled={!!selectedCustomerId} />
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
                  <FormLabel className="text-gray-300">Nomor Telepon <span className="text-red-400">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="08xxxxxxxxxx" {...field} className="bg-gray-800 border-gray-700 text-gray-300" disabled={!!selectedCustomerId} />
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
                  <FormLabel className="text-gray-300">Nama PIC <span className="text-red-400">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Nama PIC" {...field} className="bg-gray-800 border-gray-700 text-gray-300" />
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
                  <FormLabel className="text-gray-300">Alamat Lengkap <span className="text-red-400">*</span></FormLabel>
                  <FormControl>
                    <Textarea placeholder="Alamat lengkap" {...field} className="bg-gray-800 border-gray-700 text-gray-300" disabled={!!selectedCustomerId} />
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
                  <FormLabel className="text-gray-300">Patokan (Opsional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Patokan lokasi" {...field} className="bg-gray-800 border-gray-700 text-gray-300" />
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
                  <FormLabel className="text-gray-300">Tanggal Permintaan <span className="text-red-400">*</span></FormLabel>
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
                            <span>Pilih tanggal</span>
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
                    Tanggal untuk layanan yang diminta.
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
                  <FormLabel className="text-gray-300">Waktu Permintaan (Opsional)</FormLabel>
                  <FormControl>
                    <Input placeholder="contoh: 09:00 - 12:00" {...field} className="bg-gray-800 border-gray-700 text-gray-300" />
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
                  <FormLabel className="text-gray-300">Jenis Permintaan <span className="text-red-400">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-300">
                        <SelectValue placeholder="Pilih jenis permintaan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-gray-800 border-gray-700 text-gray-300">
                      <SelectItem value="INSTALLATION">Instalasi</SelectItem>
                      <SelectItem value="SERVICE">Service</SelectItem>
                      <SelectItem value="SERVICE_UNBILL">Service Non Tagihan</SelectItem>
                      <SelectItem value="DELIVERY">Pengiriman</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-gray-500">
                    Jenis layanan yang diminta.
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
                  <FormLabel className="text-gray-300">Metode Pembayaran (Opsional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-300">
                        <SelectValue placeholder="Pilih metode pembayaran" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-gray-800 border-gray-700 text-gray-300">
                      <SelectItem value="Cash">Tunai</SelectItem>
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
                  <FormLabel className="text-gray-300">Kategori Produk (Opsional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-300">
                        <SelectValue placeholder="Pilih kategori produk" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-gray-800 border-gray-700 text-gray-300">
                      <SelectItem value="gps_tracker">GPS Tracker</SelectItem>
                      <SelectItem value="dashcam">Dashcam</SelectItem>
                      <SelectItem value="OTHER">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-gray-500">
                    Kategori produk terkait layanan.
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
                  <FormLabel className="text-gray-300">Detail Kendaraan (Opsional)</FormLabel>
                  <FormControl>
                    <Input placeholder="contoh: Mobil, Motor, Van" {...field} className="bg-gray-800 border-gray-700 text-gray-300" />
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
                  <FormLabel className="text-gray-300">Catatan (Opsional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Catatan atau instruksi tambahan" {...field} className="bg-gray-800 border-gray-700 text-gray-300" />
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
                  <FormLabel className="text-gray-300">Tipe Teknisi</FormLabel>
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
                          Teknisi Internal
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="EXTERNAL" />
                        </FormControl>
                        <FormLabel className="font-normal text-gray-400">
                          Teknisi Eksternal
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
                    <FormLabel className="text-gray-300">Teknisi Internal</FormLabel>
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
                          <SelectValue placeholder="Pilih teknisi internal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-gray-800 border-gray-700 text-gray-300">
                        {isLoadingTechnicians ? (
                          <SelectItem value="loading" disabled>Memuat data teknisi...</SelectItem>
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
                      Pilih teknisi internal untuk permintaan ini.
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
                    <FormLabel className="text-gray-300">Nama Teknisi Eksternal</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan nama teknisi eksternal" {...field} className="bg-gray-800 border-gray-700 text-gray-300" />
                    </FormControl>
                    <FormDescription className="text-gray-500">
                      Masukkan nama teknisi eksternal.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </TabsContent>
        </Tabs>
        <Button type="submit" className="w-full bg-neon-cyan hover:bg-neon-cyan/90 text-gray-900 font-bold py-2 px-4 rounded-md shadow-neon-glow transition-all duration-200">
          Kirim Permintaan
        </Button>
      </form>
    </Form>
  );
};

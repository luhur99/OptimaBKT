import React, { useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/auth-session";
import { showSuccess, showError } from "@/utils/toast";
import { User, MapPin } from "lucide-react";

interface QuickAddCustomerSupplierFormProps {
  onQuickAddSuccess: (type: "customer" | "supplier") => void;
  onClose: () => void;
  defaultType?: "customer" | "supplier";
}

const formSchema = z.object({
  entry_type: z.enum(["customer", "supplier"], {
    required_error: "Please select an entry type.",
  }),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  company_name: z.string().optional(),
  address: z.string().optional(),
  phone_number: z.string().optional(),
  email: z.string().email({ message: "Please enter a valid email address." }).optional().or(z.literal("")),
  customer_type: z.enum(["INDIVIDUAL", "COMPANY"]).optional(),
  contact_person: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.entry_type === "customer") {
    if (!data.customer_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Customer type is required for customers.",
        path: ["customer_type"],
      });
    }
  }
  if (data.entry_type === "supplier") {
    if (!data.contact_person) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Contact person is required for suppliers.",
        path: ["contact_person"],
      });
    }
  }
});

export function QuickAddCustomerSupplierForm({
  onQuickAddSuccess,
  onClose,
  defaultType = "customer",
}: QuickAddCustomerSupplierFormProps) {
  const { session } = useAuthSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entry_type: defaultType,
      name: "",
      company_name: "",
      address: "",
      phone_number: "",
      email: "",
      customer_type: "INDIVIDUAL",
      contact_person: "",
      notes: "",
    },
  });

  const entryType = form.watch("entry_type");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (values.entry_type === "customer") {
        const { error } = await supabase.from("customers").insert({
          user_id: session?.user?.id,
          customer_name: values.name,
          company_name: values.company_name,
          address: values.address,
          phone_number: values.phone_number,
          customer_type: values.customer_type,
        });
        if (error) throw new Error(error.message);
        showSuccess(`Customer '${values.name}' added successfully!`);
      } else {
        const { error } = await supabase.from("suppliers").insert({
          user_id: session?.user?.id,
          name: values.name,
          contact_person: values.contact_person,
          phone_number: values.phone_number,
          email: values.email,
          address: values.address,
          notes: values.notes,
        });
        if (error) throw new Error(error.message);
        showSuccess(`Supplier '${values.name}' added successfully!`);
      }
      form.reset();
      onQuickAddSuccess(values.entry_type);
      onClose();
    } catch (error: any) {
      showError(error.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 text-gray-300">
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-800">
          <FormField
            control={form.control}
            name="entry_type"
            render={({ field }) => (
              <FormItem className="space-y-0 w-full">
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex space-x-6 h-10 items-center justify-center"
                  >
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="customer" className="border-neon-cyan text-neon-cyan" />
                      </FormControl>
                      <FormLabel className="font-medium text-neon-cyan cursor-pointer">
                        Customer
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="supplier" className="border-neon-cyan text-neon-cyan" />
                      </FormControl>
                      <FormLabel className="font-medium text-neon-cyan cursor-pointer">
                        Supplier
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-900 border border-gray-800 p-1">
            <TabsTrigger
              value="info"
              className="data-[state=active]:bg-neon-cyan data-[state=active]:text-midnight-blue transition-all"
            >
              <User className="w-4 h-4 mr-2" /> Informasi
            </TabsTrigger>
            <TabsTrigger
              value="contact"
              className="data-[state=active]:bg-neon-cyan data-[state=active]:text-midnight-blue transition-all"
            >
              <MapPin className="w-4 h-4 mr-2" /> Kontak
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 min-h-[220px]">
            <TabsContent value="info" className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{entryType === "customer" ? "Customer Name" : "Supplier Name"}</FormLabel>
                    <FormControl>
                      <Input placeholder={entryType === "customer" ? "John Doe" : "PT. Maju Mundur"} {...field} className="glassmorphism border border-gray-700 text-gray-300 focus:border-neon-cyan" />
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
                    <FormLabel>Company Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., PT. ABC Jaya" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {entryType === "customer" ? (
                <FormField
                  control={form.control}
                  name="customer_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="glassmorphism border border-gray-700 text-gray-300">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="glassmorphism border border-gray-700 bg-midnight-blue text-gray-300">
                          <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                          <SelectItem value="COMPANY">Company</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="contact_person"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input placeholder="Nama contact person" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </TabsContent>

            <TabsContent value="contact" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="0812..." {...field} className="glassmorphism border border-gray-700 text-gray-300" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="mail@pt.com" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Alamat lengkap..." {...field} className="glassmorphism border border-gray-700 text-gray-300 min-h-[80px]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {entryType === "supplier" && (
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Catatan tambahan" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </TabsContent>
          </div>
        </Tabs>

        <div className="pt-4">
          <Button
            type="submit"
            className="w-full bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300 h-11 text-lg font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Adding..." : `Tambah ${entryType === "customer" ? "Customer" : "Supplier"}`}
          </Button>
        </div>
      </form>
    </Form>
  );
}

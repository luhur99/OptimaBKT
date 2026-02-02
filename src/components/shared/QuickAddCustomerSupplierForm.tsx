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
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session"; // Import useAuthSession
import { showSuccess, showError } from "@/utils/toast";

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
  customer_type: z.enum(["INDIVIDUAL", "COMPANY"]).optional(), // Only for customer
  contact_person: z.string().optional(), // Only for supplier
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
  const { session } = useAuthSession(); // Use the simplified useAuthSession
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entry_type: defaultType,
      name: "",
      company_name: "",
      address: "",
      phone_number: "",
      email: "",
      customer_type: "INDIVIDUAL", // Default for customer
      contact_person: "",
      notes: "",
    },
  });

  const entryType = form.watch("entry_type");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (!session?.user?.id) {
        throw new Error("User not authenticated.");
      }
      if (values.entry_type === "customer") {
        const { error } = await supabase.from("customers").insert({
          user_id: session.user.id, // Use session.user.id directly
          customer_name: values.name,
          company_name: values.company_name,
          address: values.address,
          phone_number: values.phone_number,
          customer_type: values.customer_type,
        });
        if (error) throw new Error(error.message);
        showSuccess(`Customer '${values.name}' added successfully!`);
      } else { // supplier
        const { error } = await supabase.from("suppliers").insert({
          user_id: session.user.id, // Use session.user.id directly
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 text-gray-300">
        <FormField
          control={form.control}
          name="entry_type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Add As</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="customer" className="border-neon-cyan text-neon-cyan focus:ring-neon-cyan" />
                    </FormControl>
                    <FormLabel className="font-normal text-gray-300">
                      Customer
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="supplier" className="border-neon-cyan text-neon-cyan focus:ring-neon-cyan" />
                    </FormControl>
                    <FormLabel className="font-normal text-gray-300">
                      Supplier
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{entryType === "customer" ? "Customer Name" : "Supplier Name"}</FormLabel>
              <FormControl>
                <Input placeholder={entryType === "customer" ? "John Doe" : "PT. Maju Mundur"} {...field} className="glassmorphism border border-gray-700 text-gray-300" />
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

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Full address" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
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
              <FormLabel>Phone Number (Optional)</Label>
              <FormControl>
                <Input type="tel" placeholder="e.g., +628123456789" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
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
                <Input type="email" placeholder="email@example.com" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {entryType === "customer" && (
          <FormField
            control={form.control}
            name="customer_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="glassmorphism border border-gray-700 text-gray-300">
                      <SelectValue placeholder="Select customer type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="glassmorphism border border-gray-700 text-gray-300">
                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                    <SelectItem value="COMPANY">Company</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {entryType === "supplier" && (
          <FormField
            control={form.control}
            name="contact_person"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Person</FormLabel>
                <FormControl>
                  <Input placeholder="Name of contact person at supplier" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {entryType === "supplier" && (
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (Optional)</Label>
                <FormControl>
                  <Textarea placeholder="Any specific notes about the supplier" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" className="w-full bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300" disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : `Add ${entryType === "customer" ? "Customer" : "Supplier"}`}
        </Button>
      </form>
    </Form>
  );
}
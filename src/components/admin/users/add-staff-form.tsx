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
import { showSuccess, showError } from "@/utils/toast";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client"; // Ensure supabase is imported
import { useAuthSession } from "@/hooks/use-auth-session"; // Import useAuthSession

const formSchema = z.object({
  full_name: z.string().min(2, {
    message: "Full Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
  role: z.enum([
    "SUPER_ADMIN",
    "OPERASIONAL_DIV",
    "SALES_DIV",
    "TECHNICIAN",
    "ACCOUNTING",
    "USER",
  ]),
});

interface AddStaffFormProps {
  onStaffAdded: () => void;
  onClose: () => void;
}

export function AddStaffForm({ onStaffAdded, onClose }: AddStaffFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { session } = useAuthSession(); // Use the simplified useAuthSession
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      role: "USER",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (!session?.access_token) {
        throw new Error("User not authenticated.");
      }
      const response = await fetch(
        `https://hhhzugqimtypijkdxxsm.supabase.co/functions/v1/create-staff-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`, // Use session.access_token directly
          },
          body: JSON.stringify(values),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create staff user.");
      }

      showSuccess("Staff user created successfully!");
      form.reset();
      onStaffAdded();
      onClose();
    } catch (error: any) {
      showError(error.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
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
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john.doe@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
                  <SelectItem value="OPERASIONAL_DIV">OPERASIONAL_DIV</SelectItem>
                  <SelectItem value="SALES_DIV">SALES_DIV</SelectItem>
                  <SelectItem value="TECHNICIAN">TECHNICIAN</SelectItem>
                  <SelectItem value="ACCOUNTING">ACCOUNTING</SelectItem>
                  <SelectItem value="USER">USER</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Add Staff"}
        </Button>
      </form>
    </Form>
  );
}
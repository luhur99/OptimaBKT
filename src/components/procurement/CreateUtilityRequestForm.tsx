"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type FieldErrors, useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/auth-session";
import { showSuccess, showError } from "@/utils/toast";

interface CreateUtilityRequestFormProps {
  onURCreated: () => void;
}

const formSchema = z
  .object({
    item_name: z.string().min(1, { message: "Produk wajib diisi." }),
    supplier_name: z.string().optional(),
    supplier_url: z.string().url({ message: "URL supplier tidak valid." }).optional().or(z.literal("")),
    quantity: z.coerce.number().min(1, { message: "Jumlah minimal 1." }),
    unit_price: z.coerce.number().min(0, { message: "Harga beli harus 0 atau lebih." }),
    notes: z.string().optional(),
  })
  .refine((values) => {
    const name = values.supplier_name?.trim();
    const url = values.supplier_url?.trim();
    return !!name || !!url;
  }, {
    message: "Supplier URL atau Store Name wajib diisi.",
    path: ["supplier_name"],
  });

export function CreateUtilityRequestForm({ onURCreated }: CreateUtilityRequestFormProps) {
  const { session, profile } = useAuthSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      item_name: "",
      supplier_name: "",
      supplier_url: "",
      quantity: 1,
      unit_price: 0,
      notes: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (!session?.user?.id) {
        showError("You must be signed in to create a utility request.");
        setIsSubmitting(false);
        return;
      }

      const total_price = values.quantity * values.unit_price;

      const { data: newUR, error: urError } = await supabase
        .from("utility_requests")
        .insert({
          user_id: session.user.id,
          item_name: values.item_name,
          quantity: values.quantity,
          unit_price: values.unit_price,
          total_price,
          supplier_name: values.supplier_name || null,
          supplier_url: values.supplier_url || null,
          notes: values.notes,
          status: "pending",
        })
        .select("id, ur_number")
        .single();

      if (urError) {
        throw new Error(urError.message);
      }

      showSuccess(`Utility Request ${newUR.ur_number} created successfully!`);
      form.reset();
      onURCreated();
    } catch (error: any) {
      showError(error.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleValidationError = (errors: FieldErrors<z.infer<typeof formSchema>>) => {
    const firstError = Object.values(errors)[0];
    const message = firstError?.message || "Periksa kembali isian wajib.";
    showError(String(message));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, handleValidationError)} className="space-y-4 text-gray-300">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FormLabel>Request By</FormLabel>
            <Input value={profile?.full_name || "User"} disabled className="bg-gray-900/40 border-gray-700 text-gray-400" />
          </div>
          <FormField
            control={form.control}
            name="item_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product <span className="text-red-400">*</span></FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Nama barang"
                    className="bg-gray-900/40 border-gray-700 text-gray-200"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="supplier_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier / Store Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Nama toko atau supplier"
                    className="bg-gray-900/40 border-gray-700 text-gray-200"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="supplier_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier URL</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="https://supplier.example"
                    className="bg-gray-900/40 border-gray-700 text-gray-200"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qty <span className="text-red-400">*</span></FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    {...field}
                    className="bg-gray-900/40 border-gray-700 text-gray-200"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unit_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Harga Beli Satuan <span className="text-red-400">*</span></FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    {...field}
                    className="bg-gray-900/40 border-gray-700 text-gray-200"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormItem>
            <FormLabel>Total Price</FormLabel>
            <FormControl>
              <Input
                value={(form.watch("quantity") * form.watch("unit_price")).toLocaleString("id-ID")}
                disabled
                className="bg-gray-900/40 border-gray-700 text-gray-400"
              />
            </FormControl>
          </FormItem>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Tambahkan catatan..."
                  className="bg-gray-900/40 border-gray-700 text-gray-200"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="bg-neon-cyan text-midnight-blue hover:bg-neon-cyan/90"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Utility Request"}
        </Button>
      </form>
    </Form>
  );
}

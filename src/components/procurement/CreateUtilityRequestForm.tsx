import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type FieldErrors, useFieldArray, useForm } from "react-hook-form";
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

const itemSchema = z.object({
  item_name: z.string().min(1, { message: "Produk wajib diisi." }),
  quantity: z.coerce.number().min(1, { message: "Jumlah minimal 1." }),
  unit_price: z.coerce.number().min(0, { message: "Harga harus 0 atau lebih." }),
});

const formSchema = z
  .object({
    items: z.array(itemSchema).min(1, { message: "Minimal 1 item." }),
    supplier_name: z.string().optional(),
    supplier_url: z
      .string()
      .url({ message: "URL supplier tidak valid." })
      .optional()
      .or(z.literal("")),
    notes: z.string().optional(),
  })
  .refine(
    (values) => {
      const name = values.supplier_name?.trim();
      const url = values.supplier_url?.trim();
      return !!name || !!url;
    },
    {
      message: "Supplier URL atau Store Name wajib diisi.",
      path: ["supplier_name"],
    }
  );

type FormValues = z.infer<typeof formSchema>;

export function CreateUtilityRequestForm({ onURCreated }: CreateUtilityRequestFormProps) {
  const { session, profile } = useAuthSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [{ item_name: "", quantity: 1, unit_price: 0 }],
      supplier_name: "",
      supplier_url: "",
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");

  const grandTotal = watchedItems.reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
  }, 0);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      if (!session?.user?.id) {
        showError("You must be signed in to create a utility request.");
        return;
      }

      // Step 1 — insert the UR header (1 UR number per submission)
      const { data: newUR, error: urError } = await supabase
        .from("utility_requests")
        .insert({
          user_id: session.user.id,
          supplier_name: values.supplier_name || null,
          supplier_url: values.supplier_url || null,
          notes: values.notes || null,
          total_price: grandTotal,
          status: "pending",
        })
        .select("id, ur_number")
        .single();

      if (urError) throw new Error(urError.message);

      // Step 2 — insert all line items referencing the new UR
      const itemRows = values.items.map((item) => ({
        ur_id: newUR.id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
      }));

      const { error: itemsError } = await supabase
        .from("utility_request_items")
        .insert(itemRows);

      if (itemsError) throw new Error(itemsError.message);

      showSuccess(
        `Utility Request ${newUR.ur_number} created with ${values.items.length} item${values.items.length > 1 ? "s" : ""}.`
      );
      form.reset();
      onURCreated();
    } catch (error: any) {
      showError(error.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleValidationError = (errors: FieldErrors<FormValues>) => {
    const firstError = Object.values(errors)[0];
    const message =
      firstError && "message" in firstError
        ? (firstError.message as string)
        : "Periksa kembali isian wajib.";
    showError(message);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, handleValidationError)}
        className="space-y-4 text-gray-300"
      >
        {/* Requester */}
        <div className="space-y-2">
          <FormLabel>Request By</FormLabel>
          <Input
            value={profile?.full_name || "User"}
            disabled
            className="bg-gray-900/40 border-gray-700 text-gray-400 max-w-sm"
          />
        </div>

        {/* Supplier info */}
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

        {/* Items table */}
        <div className="space-y-2">
          <FormLabel>Items</FormLabel>

          {/* Header row */}
          <div className="hidden md:grid md:grid-cols-[1fr_80px_130px_110px_36px] gap-2 px-1">
            <span className="text-xs text-gray-500">
              Product <span className="text-red-400">*</span>
            </span>
            <span className="text-xs text-gray-500">
              Qty <span className="text-red-400">*</span>
            </span>
            <span className="text-xs text-gray-500">
              Harga Satuan <span className="text-red-400">*</span>
            </span>
            <span className="text-xs text-gray-500">Total</span>
            <span />
          </div>

          {/* Item rows */}
          <div className="space-y-2">
            {fields.map((field, index) => {
              const qty = Number(watchedItems[index]?.quantity) || 0;
              const price = Number(watchedItems[index]?.unit_price) || 0;
              const itemTotal = qty * price;

              return (
                <div
                  key={field.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_80px_130px_110px_36px] gap-2 items-start"
                >
                  <FormField
                    control={form.control}
                    name={`items.${index}.item_name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="md:hidden text-xs text-gray-500">
                          Product <span className="text-red-400">*</span>
                        </FormLabel>
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
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="md:hidden text-xs text-gray-500">
                          Qty <span className="text-red-400">*</span>
                        </FormLabel>
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
                    name={`items.${index}.unit_price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="md:hidden text-xs text-gray-500">
                          Harga Satuan <span className="text-red-400">*</span>
                        </FormLabel>
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
                    <FormLabel className="md:hidden text-xs text-gray-500">
                      Total
                    </FormLabel>
                    <FormControl>
                      <Input
                        value={itemTotal.toLocaleString("id-ID")}
                        disabled
                        className="bg-gray-900/40 border-gray-700 text-gray-400"
                      />
                    </FormControl>
                  </FormItem>
                  <div className="flex items-start pt-0 md:pt-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10 w-9 h-9 mt-0"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ item_name: "", quantity: 1, unit_price: 0 })}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            + Add Item
          </Button>
        </div>

        {/* Grand total */}
        <div className="flex justify-end border-t border-gray-700 pt-3">
          <div className="text-right space-y-0.5">
            <p className="text-sm text-gray-400">Grand Total</p>
            <p className="text-xl font-bold text-neon-cyan">
              Rp {grandTotal.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        {/* Notes */}
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

"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type FieldErrors, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Check, ChevronsUpDown, CirclePlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/auth-session";
import { showSuccess, showError } from "@/utils/toast";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Product {
  id: string;
  kode_barang: string;
  nama_barang: string;
  satuan?: string;
  harga_beli: number;
  harga_jual?: number;
}

interface Supplier {
  id: string;
  name: string;
}

interface WarehouseCategory {
  name: string;
  code: string;
}

interface CreatePurchaseRequestFormProps {
  onPRCreated: () => void;
}

const productItemSchema = z.object({
  product_id: z.string().min(1, { message: "Produk wajib dipilih." }),
  qty: z.coerce.number().min(1, { message: "Qty minimal 1." }),
  harga_beli_satuan: z.coerce.number().min(0, { message: "Harga tidak valid." }),
  suggested_selling_price: z.coerce.number().min(0).optional(),
});

const formSchema = z.object({
  items: z.array(productItemSchema).min(1, { message: "Minimal satu produk." }),
  supplier_id: z.string().min(1, { message: "Supplier wajib dipilih." }),
  target_warehouse_category: z.string().min(1, { message: "Kategori gudang tujuan wajib dipilih." }),
  notes: z.string().optional(),
  ppn: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function CreatePurchaseRequestForm({ onPRCreated }: CreatePurchaseRequestFormProps) {
  const { session } = useAuthSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouseCategories, setWarehouseCategories] = useState<WarehouseCategory[]>([]);
  const [openSupplierCombobox, setOpenSupplierCombobox] = useState(false);
  const [openProductCombobox, setOpenProductCombobox] = useState<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [{ product_id: "", qty: 1, harga_beli_satuan: 0, suggested_selling_price: 0 }],
      supplier_id: "",
      target_warehouse_category: "",
      notes: "",
      ppn: false,
    },
  });

  useEffect(() => {
    const fetchDependencies = async () => {
      const [{ data: productsData, error: productsError }, { data: suppliersData, error: suppliersError }, { data: categoriesData, error: categoriesError }] = await Promise.all([
        supabase.from("products").select("id, kode_barang, nama_barang, satuan, harga_beli, harga_jual"),
        supabase.from("suppliers").select("id, name"),
        supabase.from("warehouse_categories").select("name, code"),
      ]);
      if (productsError) showError("Failed to load products.");
      else setProducts(productsData || []);
      if (suppliersError) showError("Failed to load suppliers.");
      else setSuppliers(suppliersData || []);
      if (categoriesError) showError("Failed to load warehouse categories.");
      else setWarehouseCategories(categoriesData || []);
    };
    fetchDependencies();
  }, []);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      if (!session?.user?.id) {
        showError("You must be signed in to create a purchase request.");
        return;
      }

      const itemsWithProduct = values.items.map((item) => {
        const product = products.find((p) => p.id === item.product_id);
        if (!product) throw new Error("Selected product not found.");
        return { ...item, product };
      });

      const { data: newPR, error: prError } = await supabase
        .from("purchase_requests")
        .insert({
          user_id: session.user.id,
          supplier_id: values.supplier_id,
          notes: values.notes,
          target_warehouse_category: values.target_warehouse_category,
          status: "pending",
          ppn: values.ppn ?? false,
        })
        .select("id, pr_number")
        .single();

      if (prError) throw new Error(prError.message);

      const poItems = itemsWithProduct.map((item) => {
        const qty = item.qty;
        const unitPrice = item.harga_beli_satuan;
        const subtotal = qty * unitPrice;
        return {
          pr_id: newPR.id,
          product_id: item.product.id,
          qty_request: qty,
          harga_beli_satuan: unitPrice,
          subtotal: subtotal,
          suggested_selling_price: item.suggested_selling_price ?? item.product.harga_jual ?? 0,
          satuan: item.product.satuan ?? "",
          item_name: item.product.nama_barang,
          item_code: item.product.kode_barang,
        };
      });

      const { error: poItemError } = await supabase.from("po_items").insert(poItems);

      if (poItemError) {
        await supabase.from("purchase_requests").delete().eq("id", newPR.id);
        throw new Error(`Failed to create PO items: ${poItemError.message}`);
      }

      showSuccess(`Purchase Request ${newPR.pr_number} created successfully!`);
      form.reset();
      onPRCreated();
    } catch (error: any) {
      showError(error.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleValidationError = (errors: FieldErrors<FormValues>) => {
    const firstError = Object.values(errors)[0];
    const message = (firstError as any)?.message || "Periksa kembali isian wajib.";
    showError(String(message));
  };

  const items = form.watch("items");
  const ppnEnabled = form.watch("ppn");

  const subtotalSum = items.reduce((sum, item) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.harga_beli_satuan) || 0;
    return sum + qty * price;
  }, 0);
  const ppnAmount = ppnEnabled ? Math.round(subtotalSum * 0.11) : 0;
  const grandTotal = subtotalSum + ppnAmount;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, handleValidationError)} className="space-y-4 text-gray-300">

        {/* Product Items Table */}
        <div>
          <FormLabel>Item Produk <span className="text-red-400">*</span></FormLabel>
          <div className="relative w-full overflow-auto mt-2 mb-2">
            <table className="w-full caption-bottom text-sm text-gray-300">
              <thead className="glassmorphism border-b border-gray-700">
                <tr>
                  <th className="h-10 px-3 text-left font-medium text-neon-cyan">Produk</th>
                  <th className="h-10 px-3 text-left font-medium text-neon-cyan w-[80px]">Qty</th>
                  <th className="h-10 px-3 text-left font-medium text-neon-cyan w-[140px]">Harga Satuan (Rp)</th>
                  <th className="h-10 px-3 text-left font-medium text-neon-cyan w-[140px]">Subtotal (Rp)</th>
                  <th className="h-10 px-3 text-left font-medium text-neon-cyan w-[50px]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const qty = Number(item.qty) || 0;
                  const price = Number(item.harga_beli_satuan) || 0;
                  const subtotal = qty * price;
                  return (
                    <tr key={idx} className="border-b border-gray-800">
                      {/* Product picker */}
                      <td className="p-2">
                        <Popover
                          open={openProductCombobox === idx}
                          onOpenChange={(open) => setOpenProductCombobox(open ? idx : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between glassmorphism border border-gray-700 hover:bg-gray-800",
                                !item.product_id && "text-muted-foreground"
                              )}
                            >
                              {item.product_id
                                ? products.find((p) => p.id === item.product_id)?.nama_barang
                                : "Pilih produk"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0 glassmorphism border border-gray-700">
                            <Command>
                              <CommandInput placeholder="Cari produk..." className="text-gray-300" />
                              <CommandList>
                                <CommandEmpty>Produk tidak ditemukan.</CommandEmpty>
                                <CommandGroup>
                                  {products.map((product) => (
                                    <CommandItem
                                      value={product.nama_barang}
                                      key={product.id}
                                      onSelect={() => {
                                        const newItems = [...items];
                                        newItems[idx] = {
                                          ...newItems[idx],
                                          product_id: product.id,
                                          harga_beli_satuan: product.harga_beli ?? 0,
                                          suggested_selling_price: product.harga_jual ?? 0,
                                        };
                                        form.setValue("items", newItems);
                                        setOpenProductCombobox(null);
                                      }}
                                      className="text-gray-300 hover:bg-gray-800/50"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          product.id === item.product_id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {product.nama_barang} ({product.kode_barang})
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </td>
                      {/* Qty */}
                      <td className="p-2">
                        <Input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx] = { ...newItems[idx], qty: Number(e.target.value) };
                            form.setValue("items", newItems);
                          }}
                          className="glassmorphism border border-gray-700 text-gray-300 w-full"
                        />
                      </td>
                      {/* Unit Price */}
                      <td className="p-2">
                        <Input
                          type="number"
                          min={0}
                          value={item.harga_beli_satuan}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx] = { ...newItems[idx], harga_beli_satuan: Number(e.target.value) };
                            form.setValue("items", newItems);
                          }}
                          className="glassmorphism border border-gray-700 text-gray-300 w-full"
                        />
                      </td>
                      {/* Subtotal (computed) */}
                      <td className="p-2 font-medium text-gray-200">
                        {subtotal.toLocaleString("id-ID")}
                      </td>
                      {/* Delete */}
                      <td className="p-2">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const newItems = items.filter((_, i) => i !== idx);
                            form.setValue("items", newItems.length ? newItems : [{ product_id: "", qty: 1, harga_beli_satuan: 0, suggested_selling_price: 0 }]);
                          }}
                          className="bg-red-600 text-white hover:bg-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={5} className="p-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full glassmorphism border border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/20 transition-all duration-300"
                      onClick={() => form.setValue("items", [...items, { product_id: "", qty: 1, harga_beli_satuan: 0, suggested_selling_price: 0 }])}
                    >
                      <CirclePlus className="mr-2 h-4 w-4" /> Tambah Item
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-3 flex flex-col items-end space-y-1 text-sm text-gray-300 border-t border-gray-700 pt-3">
            <div className="flex justify-between w-full max-w-xs">
              <span>Subtotal:</span>
              <span className="font-medium">Rp {subtotalSum.toLocaleString("id-ID")}</span>
            </div>

            {/* PPN Toggle inline */}
            <div className="flex items-center gap-3 w-full max-w-xs justify-between">
              <FormField
                control={form.control}
                name="ppn"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 mb-0">
                    <div className="flex items-center gap-2 bg-neon-cyan/5 px-3 py-1.5 rounded-full border border-neon-cyan/20">
                      <FormLabel className="text-xs font-bold text-gray-300 cursor-pointer uppercase tracking-tighter mb-0">
                        PPN 11%
                      </FormLabel>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={field.value}
                        onClick={() => field.onChange(!field.value)}
                        className={cn(
                          "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none",
                          field.value ? "bg-neon-cyan" : "bg-input"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                            field.value ? "translate-x-4" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>
                  </FormItem>
                )}
              />
              <span className="font-medium">
                {ppnEnabled ? `Rp ${ppnAmount.toLocaleString("id-ID")}` : "—"}
              </span>
            </div>

            <div className="flex justify-between w-full max-w-xs border-t border-gray-600 pt-1">
              <span className="font-bold text-neon-cyan">Grand Total:</span>
              <span className="font-bold text-neon-cyan">Rp {grandTotal.toLocaleString("id-ID")}</span>
            </div>
          </div>
        </div>

        {/* Supplier */}
        <FormField
          control={form.control}
          name="supplier_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Supplier <span className="text-red-400">*</span></FormLabel>
              <Popover open={openSupplierCombobox} onOpenChange={setOpenSupplierCombobox}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between glassmorphism border border-gray-700 text-gray-300 hover:bg-gray-800",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? suppliers.find((s) => s.id === field.value)?.name
                        : "Pilih supplier"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 glassmorphism border border-gray-700">
                  <Command>
                    <CommandInput placeholder="Cari supplier..." className="text-gray-300" />
                    <CommandList>
                      <CommandEmpty>Supplier tidak ditemukan.</CommandEmpty>
                      <CommandGroup>
                        {suppliers.map((supplier) => (
                          <CommandItem
                            value={supplier.name}
                            key={supplier.id}
                            onSelect={() => {
                              form.setValue("supplier_id", supplier.id);
                              setOpenSupplierCombobox(false);
                            }}
                            className="text-gray-300 hover:bg-gray-800/50"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                supplier.id === field.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {supplier.name}
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

        {/* Target Warehouse Category */}
        <FormField
          control={form.control}
          name="target_warehouse_category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kategori Gudang Tujuan <span className="text-red-400">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="glassmorphism border border-gray-700 text-gray-300">
                    <SelectValue placeholder="Pilih gudang tujuan" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="glassmorphism border border-gray-700 text-gray-300">
                  {warehouseCategories.map((category) => (
                    <SelectItem key={category.code} value={category.code}>
                      {category.name} ({category.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Catatan (Opsional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Catatan atau instruksi khusus"
                  {...field}
                  className="glassmorphism border border-gray-700 text-gray-300"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Mengirim PR..." : "Kirim PR"}
        </Button>
      </form>
    </Form>
  );
}

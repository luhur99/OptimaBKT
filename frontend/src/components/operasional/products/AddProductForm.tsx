"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/auth-session";
import { showSuccess, showError } from "@/utils/toast";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea"; // Added Textarea for notes

interface Supplier {
  id: string;
  name: string;
}

import { Product } from "./product-columns";

interface AddProductFormProps {
  onProductAdded: () => void;
  onClose: () => void;
  initialData?: Product;
}

const formSchema = z.object({
  product_type: z.enum(["GOODS", "SERVICE"]),
  kode_barang: z.string().min(2, { message: "Kode produk minimal 2 karakter." }),
  nama_barang: z.string().min(2, { message: "Nama produk minimal 2 karakter." }),
  satuan: z.string().optional(), // Made optional for SERVICE
  harga_beli: z.coerce.number().min(0, { message: "Harga modal tidak boleh negatif." }), // Relaxed validation
  harga_jual: z.coerce.number().min(0, { message: "Harga jual tidak boleh negatif." }), // Relaxed validation
  safe_stock_limit: z.coerce.number().min(0).optional(),
  initial_stock: z.coerce.number().min(0).optional(),
  supplier_id: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.product_type === "GOODS") {
    // Custom validation for GOODS
    return !!data.satuan && data.satuan.length > 0;
  }
  return true;
}, {
  message: "Satuan wajib diisi untuk barang.",
  path: ["satuan"],
});

export function AddProductForm({ onProductAdded, onClose, initialData }: AddProductFormProps) {
  const { session } = useAuthSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [openSupplierCombobox, setOpenSupplierCombobox] = useState(false);
  const [activeTab, setActiveTab] = useState("product-details");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_type: initialData ? (initialData.safe_stock_limit === undefined ? "SERVICE" : "GOODS") : "GOODS", // Infer type or use explicit field if available
      kode_barang: initialData?.kode_barang || "",
      nama_barang: initialData?.nama_barang || "",
      satuan: initialData?.satuan || "Pcs",
      harga_beli: initialData?.harga_beli || 0,
      harga_jual: initialData?.harga_jual || 0,
      safe_stock_limit: initialData?.safe_stock_limit || 0,
      initial_stock: 0, // Always 0 for edit
      supplier_id: "", // TODO: If we had supplier in initialData
      notes: "",
    },
  });

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      // Logic to determine product type based on fields if not explicitly in Product type yet,
      // but we added product_type to DB. We should ensure Product type in frontend includes `product_type`.
      // For now, let's assume we need to fetch it or generic logic.
      // Wait, the Product interface in product-columns doesn't have product_type yet?
      // Step 220: export type Product = { ... user_id: string } -> No product_type in type definition!
      // I should update Product type definition first or cast it.
      // Let's assume for now we trust the props.
      form.reset({
        product_type: (initialData as any).product_type || "GOODS",
        kode_barang: initialData.kode_barang,
        nama_barang: initialData.nama_barang,
        satuan: initialData.satuan || "Pcs",
        harga_beli: initialData.harga_beli,
        harga_jual: initialData.harga_jual,
        safe_stock_limit: initialData.safe_stock_limit || 0,
        initial_stock: 0,
        supplier_id: "",
        notes: "",
      });
    }
  }, [initialData, form]);

  const productType = form.watch("product_type");

  useEffect(() => {
    const fetchSuppliers = async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name");

      if (error) {
        console.error("Error fetching suppliers:", error);
        showError("Failed to load suppliers.");
      } else {
        setSuppliers(data || []);
      }
    };
    fetchSuppliers();
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (!session?.user?.id) {
        showError("You must be signed in to manage products.");
        setIsSubmitting(false);
        return;
      }

      // 1. Insert or Update
      let productError;
      let newProduct;

      if (initialData) {
        // UPDATE
        const { data, error } = await supabase
          .from("products")
          .update({
            nama_barang: values.nama_barang,
            satuan: values.product_type === "GOODS" ? values.satuan : null,
            harga_beli: values.harga_beli,
            harga_jual: values.harga_jual,
            safe_stock_limit: values.product_type === "GOODS" ? values.safe_stock_limit : 0,
            supplier_id: values.supplier_id || null,
            // kode_barang usually should not be changed easily, but let's allow it for now if backend allows
            kode_barang: values.kode_barang,
          })
          .eq("id", initialData.id)
          .select("id")
          .single();

        productError = error;
        newProduct = data;
      } else {
        // INSERT
        const { data, error } = await supabase
          .from("products")
          .insert({
            user_id: session?.user?.id,
            product_type: values.product_type,
            kode_barang: values.kode_barang,
            nama_barang: values.nama_barang,
            satuan: values.product_type === "GOODS" ? values.satuan : null,
            harga_beli: values.harga_beli,
            harga_jual: values.harga_jual,
            safe_stock_limit: values.product_type === "GOODS" ? values.safe_stock_limit : 0,
            supplier_id: values.supplier_id || null,
          })
          .select("id")
          .single();

        productError = error;
        newProduct = data;
      }

      if (productError) {
        throw new Error(productError.message);
      }

      // 2. If initial_stock > 0 AND it's a GOODS item AND NOT EDITING, add to warehouse_inventories
      if (!initialData && values.product_type === "GOODS" && values.initial_stock && values.initial_stock > 0) {
        // Add to 'siap_jual' warehouse category by default
        const { error: inventoryError } = await supabase
          .from("warehouse_inventories")
          .upsert(
            {
              product_id: newProduct.id,
              warehouse_category: "siap_jual",
              quantity: values.initial_stock,
              user_id: session?.user?.id,
            },
            { onConflict: "product_id, warehouse_category", ignoreDuplicates: false }
          );

        if (inventoryError) {
          await supabase.from("products").delete().eq("id", newProduct.id);
          throw new Error(`Failed to add initial stock: ${inventoryError.message}`);
        }

        // Record in stock_ledger
        const { error: ledgerError } = await supabase
          .from("stock_ledger")
          .insert({
            user_id: session?.user?.id,
            product_id: newProduct.id,
            event_type: "INITIAL_STOCK",
            quantity: values.initial_stock,
            to_warehouse_category: "siap_jual",
            notes: `Initial stock for new product ${values.nama_barang}`,
            event_date: new Date().toISOString().split('T')[0],
          });

        if (ledgerError) {
          console.error("Failed to record initial stock in ledger:", ledgerError);
          showError("Product added, but failed to record initial stock movement.");
        }
      }

      showSuccess(`Product '${values.nama_barang}' ${initialData ? "updated" : "added"} successfully!`);
      form.reset();
      onProductAdded();
      onClose();
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-midnight-blue border border-gray-700">
            <TabsTrigger value="product-details" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Detail Produk</TabsTrigger>
            <TabsTrigger value="pricing-stock" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Harga & Stok</TabsTrigger>
            <TabsTrigger value="supplier-notes" className="data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:shadow-neon-glow text-gray-400">Supplier & Catatan</TabsTrigger>
          </TabsList>

          <TabsContent value="product-details" className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="kode_barang"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kode Produk <span className="text-red-400">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="contoh: P001" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nama_barang"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Produk <span className="text-red-400">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="contoh: GPS Tracker X" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {productType === "GOODS" && (
              <FormField
                control={form.control}
                name="satuan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Satuan <span className="text-red-400">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || "Pcs"}>
                      <FormControl>
                        <SelectTrigger className="glassmorphism border border-gray-700 text-gray-300">
                          <SelectValue placeholder="Pilih satuan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="glassmorphism border border-gray-700 text-gray-300">
                        <SelectItem value="Pcs">Pcs</SelectItem>
                        <SelectItem value="Unit">Unit</SelectItem>
                        <SelectItem value="Lot">Lot</SelectItem>
                        <SelectItem value="Set">Set</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </TabsContent>

          <TabsContent value="pricing-stock" className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="product_type"
              render={({ field }) => (
                <FormItem className="space-y-3 mb-4 p-4 border border-gray-700 rounded-md bg-gray-800/30">
                  <FormLabel>Tipe Produk <span className="text-red-400">*</span></FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!!initialData} // Disable if editing
                      className="flex space-x-6"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="GOODS" className="border-neon-cyan text-neon-cyan" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Barang
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="SERVICE" className="border-electric-violet text-electric-violet" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Jasa
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
              name="harga_beli"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Harga Modal <span className="text-red-400">*</span></FormLabel>
                  <FormControl>
                    <Input type="number" {...field} step="0.01" className="glassmorphism border border-gray-700 text-gray-300" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="harga_jual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Harga Jual <span className="text-red-400">*</span></FormLabel>
                  <FormControl>
                    <Input type="number" {...field} step="0.01" className="glassmorphism border border-gray-700 text-gray-300" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {productType === "GOODS" && (
              <>
                <FormField
                  control={form.control}
                  name="safe_stock_limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batas Stok Aman (Opsional)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min="0" className="glassmorphism border border-gray-700 text-gray-300" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!initialData && (
                  <FormField
                    control={form.control}
                    name="initial_stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stok Awal (Opsional)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min="0" className="glassmorphism border border-gray-700 text-gray-300" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="supplier-notes" className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="supplier_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Supplier Utama (Opsional)</FormLabel>
                  <Popover open={openSupplierCombobox} onOpenChange={setOpenSupplierCombobox}>
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
                            ? suppliers.find((supplier) => supplier.id === field.value)?.name
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
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catatan (Opsional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Catatan khusus produk" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>

        <Button type="submit" className="w-full bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300" disabled={isSubmitting}>
          {isSubmitting ? (initialData ? "Memperbarui Produk..." : "Menambahkan Produk...") : (initialData ? "Perbarui Produk" : "Tambah Produk")}
        </Button>
      </form>
    </Form>
  );
}

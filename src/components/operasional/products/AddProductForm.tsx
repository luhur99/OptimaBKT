"use client";

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
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { showSuccess, showError } from "@/utils/toast";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Supplier {
  id: string;
  name: string;
}

interface AddProductFormProps {
  onProductAdded: () => void;
  onClose: () => void;
}

const formSchema = z.object({
  kode_barang: z.string().min(2, { message: "Product Code must be at least 2 characters." }),
  nama_barang: z.string().min(2, { message: "Product Name must be at least 2 characters." }),
  satuan: z.string().min(1, { message: "Unit is required." }),
  harga_beli: z.coerce.number().min(0.01, { message: "Purchase Price must be greater than 0." }),
  harga_jual: z.coerce.number().min(0.01, { message: "Selling Price must be greater than 0." }),
  safe_stock_limit: z.coerce.number().min(0, { message: "Safe Stock Limit cannot be negative." }),
  initial_stock: z.coerce.number().min(0, { message: "Initial Stock cannot be negative." }).optional(),
  supplier_id: z.string().optional(),
});

export function AddProductForm({ onProductAdded, onClose }: AddProductFormProps) {
  const { session } = useAuthSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [openSupplierCombobox, setOpenSupplierCombobox] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kode_barang: "",
      nama_barang: "",
      satuan: "Pcs", // Default unit
      harga_beli: 0,
      harga_jual: 0,
      safe_stock_limit: 0,
      initial_stock: 0,
      supplier_id: "",
    },
  });

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
      // 1. Insert into products table
      const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert({
          user_id: session?.user?.id,
          kode_barang: values.kode_barang,
          nama_barang: values.nama_barang,
          satuan: values.satuan,
          harga_beli: values.harga_beli,
          harga_jual: values.harga_jual,
          safe_stock_limit: values.safe_stock_limit,
          supplier_id: values.supplier_id || null,
          stok_sekarang: values.initial_stock || 0, // Set initial stock directly
        })
        .select("id")
        .single();

      if (productError) {
        throw new Error(productError.message);
      }

      // 2. If initial_stock > 0, add to warehouse_inventories and stock_ledger
      if (values.initial_stock && values.initial_stock > 0) {
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
          // Attempt to rollback product creation if inventory fails
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
          // This is a critical failure, manual intervention might be needed for full rollback
          console.error("Failed to record initial stock in ledger:", ledgerError);
          showError("Product added, but failed to record initial stock movement.");
        }
      }

      showSuccess(`Product '${values.nama_barang}' added successfully!`);
      form.reset();
      onProductAdded();
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
          name="kode_barang"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Code</FormLabel>
              <FormControl>
                <Input placeholder="e.g., P001" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
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
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Laptop XYZ" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="satuan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="glassmorphism border border-gray-700 text-gray-300">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="glassmorphism border border-gray-700 text-gray-300">
                  <SelectItem value="Pcs">Pcs</SelectItem>
                  <SelectItem value="Dus">Dus</SelectItem>
                  <SelectItem value="Kg">Kg</SelectItem>
                  <SelectItem value="Liter">Liter</SelectItem>
                  <SelectItem value="Meter">Meter</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="harga_beli"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purchase Price</FormLabel>
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
              <FormLabel>Selling Price</FormLabel>
              <FormControl>
                <Input type="number" {...field} step="0.01" className="glassmorphism border border-gray-700 text-gray-300" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="safe_stock_limit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Safe Stock Limit</FormLabel>
              <FormControl>
                <Input type="number" {...field} min="0" className="glassmorphism border border-gray-700 text-gray-300" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="initial_stock"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initial Stock (Optional)</FormLabel>
              <FormControl>
                <Input type="number" {...field} min="0" className="glassmorphism border border-gray-700 text-gray-300" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="supplier_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Primary Supplier (Optional)</FormLabel>
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
                        : "Select supplier"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 glassmorphism border border-gray-700">
                  <Command>
                    <CommandInput placeholder="Search supplier..." className="text-gray-300" />
                    <CommandList>
                      <CommandEmpty>No supplier found.</CommandEmpty>
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

        <Button type="submit" className="w-full bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300" disabled={isSubmitting}>
          {isSubmitting ? "Adding Product..." : "Add Product"}
        </Button>
      </form>
    </Form>
  );
}
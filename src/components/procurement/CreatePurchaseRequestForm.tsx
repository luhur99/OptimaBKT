"use client";

import { useState, useEffect } from "react";
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
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { showSuccess, showError } from "@/utils/toast";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Product {
  id: string;
  kode_barang: string;
  nama_barang: string;
  satuan?: string;
  harga_beli: number;
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

const formSchema = z.object({
  product_id: z.string().min(1, { message: "Product is required." }),
  supplier_id: z.string().min(1, { message: "Supplier is required." }),
  quantity: z.coerce.number().min(1, { message: "Quantity must be at least 1." }),
  unit_price: z.coerce.number().min(0.01, { message: "Unit price must be greater than 0." }),
  suggested_selling_price: z.coerce.number().min(0.01, { message: "Suggested selling price must be greater than 0." }),
  target_warehouse_category: z.string().min(1, { message: "Target warehouse category is required." }),
  notes: z.string().optional(),
});

export function CreatePurchaseRequestForm({ onPRCreated }: CreatePurchaseRequestFormProps) {
  const { session } = useAuthSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouseCategories, setWarehouseCategories] = useState<WarehouseCategory[]>([]);
  const [openProductCombobox, setOpenProductCombobox] = useState(false);
  const [openSupplierCombobox, setOpenSupplierCombobox] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_id: "",
      supplier_id: "",
      quantity: 1,
      unit_price: 0,
      suggested_selling_price: 0,
      target_warehouse_category: "",
      notes: "",
    },
  });

  // Watch the product_id field from the form
  const selectedProductId = form.watch("product_id");

  useEffect(() => {
    const fetchDependencies = async () => {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, kode_barang, nama_barang, satuan, harga_beli");

      if (productsError) {
        console.error("Error fetching products:", productsError);
        showError("Failed to load products.");
      } else {
        setProducts(productsData || []);
      }

      const { data: suppliersData, error: suppliersError } = await supabase
        .from("suppliers")
        .select("id, name");

      if (suppliersError) {
        console.error("Error fetching suppliers:", suppliersError);
        showError("Failed to load suppliers.");
      } else {
        setSuppliers(suppliersData || []);
      }

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("warehouse_categories")
        .select("name, code");

      if (categoriesError) {
        console.error("Error fetching warehouse categories:", categoriesError);
        showError("Failed to load warehouse categories.");
      } else {
        setWarehouseCategories(categoriesData || []);
      }
    };
    fetchDependencies();
  }, []);

  useEffect(() => {
    const product = products.find(p => p.id === selectedProductId);
    if (product) {
      form.setValue("unit_price", product.harga_beli);
    }
  }, [selectedProductId, products, form]); // Now selectedProductId is correctly in the dependency array

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const product = products.find(p => p.id === values.product_id);
      if (!product) {
        showError("Selected product not found.");
        setIsSubmitting(false);
        return;
      }

      const total_price = values.quantity * values.unit_price;

      const { data, error } = await supabase
        .from("purchase_requests")
        .insert({
          user_id: session?.user?.id,
          product_id: values.product_id,
          supplier_id: values.supplier_id,
          item_name: product.nama_barang,
          item_code: product.kode_barang,
          quantity: values.quantity,
          unit_price: values.unit_price,
          suggested_selling_price: values.suggested_selling_price,
          total_price: total_price,
          notes: values.notes,
          target_warehouse_category: values.target_warehouse_category,
          satuan: product.satuan,
          status: "pending", // Default status
        })
        .select("pr_number")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      showSuccess(`Purchase Request ${data.pr_number} created successfully!`);
      form.reset();
      onPRCreated();
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
          name="product_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Product</FormLabel>
              <Popover open={openProductCombobox} onOpenChange={setOpenProductCombobox}>
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
                        ? products.find((product) => product.id === field.value)?.nama_barang
                        : "Select product"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 glassmorphism border border-gray-700">
                  <Command>
                    <CommandInput placeholder="Search product..." className="text-gray-300" />
                    <CommandList>
                      <CommandEmpty>No product found.</CommandEmpty>
                      <CommandGroup>
                        {products.map((product) => (
                          <CommandItem
                            value={product.nama_barang}
                            key={product.id}
                            onSelect={() => {
                              form.setValue("product_id", product.id);
                              setOpenProductCombobox(false);
                            }}
                            className="text-gray-300 hover:bg-gray-800/50"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                product.id === field.value ? "opacity-100" : "opacity-0"
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
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="supplier_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Supplier</FormLabel>
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

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input type="number" {...field} min="1" className="glassmorphism border border-gray-700 text-gray-300" />
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
              <FormLabel>Unit Price (Harga Beli)</FormLabel>
              <FormControl>
                <Input type="number" {...field} step="0.01" className="glassmorphism border border-gray-700 text-gray-300" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="suggested_selling_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Suggested Selling Price</FormLabel>
              <FormControl>
                <Input type="number" {...field} step="0.01" className="glassmorphism border border-gray-700 text-gray-300" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="target_warehouse_category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Warehouse Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="glassmorphism border border-gray-700 text-gray-300">
                    <SelectValue placeholder="Select target warehouse" />
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

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Any specific instructions or details" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300" disabled={isSubmitting}>
          {isSubmitting ? "Submitting PR..." : "Submit Purchase Request"}
        </Button>
      </form>
    </Form>
  );
}
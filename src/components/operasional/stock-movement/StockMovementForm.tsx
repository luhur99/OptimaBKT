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
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";

type Product = {
  id: string;
  nama_barang: string;
  kode_barang: string;
};

type WarehouseCategory = {
  name: string;
  code: string;
};

interface StockMovementFormProps {
  onMoveSuccess: () => void;
}

const formSchema = z.object({
  product_id: z.string().min(1, { message: "Product is required." }),
  from_warehouse_category: z.string().min(1, { message: "Source warehouse is required." }),
  to_warehouse_category: z.string().min(1, { message: "Destination warehouse is required." }),
  quantity: z.coerce.number().min(1, { message: "Quantity must be at least 1." }),
});

export function StockMovementForm({ onMoveSuccess }: StockMovementFormProps) {
  const { session } = useAuthSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouseCategories, setWarehouseCategories] = useState<WarehouseCategory[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_id: "",
      from_warehouse_category: "",
      to_warehouse_category: "",
      quantity: 1,
    },
  });

  useEffect(() => {
    const fetchDependencies = async () => {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, nama_barang, kode_barang");

      if (productsError) {
        console.error("Error fetching products:", productsError);
        showError("Failed to load products.");
      } else {
        setProducts(productsData || []);
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `https://hhhzugqimtypijkdxxsm.supabase.co/functions/v1/move-stock`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(values),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to move stock.");
      }

      showSuccess("Stock moved successfully!");
      form.reset();
      onMoveSuccess();
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
            <FormItem>
              <FormLabel>Product</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="glassmorphism border border-gray-700 text-gray-300">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="glassmorphism border border-gray-700 text-gray-300">
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.nama_barang} ({product.kode_barang})
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
          name="from_warehouse_category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>From Warehouse</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="glassmorphism border border-gray-700 text-gray-300">
                    <SelectValue placeholder="Select source warehouse" />
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
          name="to_warehouse_category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>To Warehouse</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="glassmorphism border border-gray-700 text-gray-300">
                    <SelectValue placeholder="Select destination warehouse" />
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
        <Button type="submit" className="w-full bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300" disabled={isSubmitting}>
          {isSubmitting ? "Moving Stock..." : "Move Stock"}
        </Button>
      </form>
    </Form>
  );
}
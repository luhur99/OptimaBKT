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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/auth-session";
import { showSuccess, showError } from "@/utils/toast";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Product = {
  id: string;
  nama_barang: string;
  kode_barang: string;
};

type WarehouseCategory = {
  name: string;
  code: string;
};

interface StockAdjustmentFormProps {
  onAdjustmentSuccess: () => void;
}

const formSchema = z.object({
  product_id: z.string().min(1, { message: "Produk wajib dipilih." }),
  warehouse_category: z.string().min(1, { message: "Kategori gudang wajib dipilih." }),
  adjustment_type: z.enum(["add", "deduct"], {
    required_error: "Tipe penyesuaian wajib dipilih.",
  }),
  quantity: z.coerce.number().min(1, { message: "Jumlah minimal 1." }),
  notes: z.string().min(10, { message: "Catatan wajib diisi minimal 10 karakter." }),
});

export function StockAdjustmentForm({ onAdjustmentSuccess }: StockAdjustmentFormProps) {
  const { session } = useAuthSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouseCategories, setWarehouseCategories] = useState<WarehouseCategory[]>([]);
  const [openProductCombobox, setOpenProductCombobox] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_id: "",
      warehouse_category: "",
      adjustment_type: "add",
      quantity: 1,
      notes: "",
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
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!baseUrl) {
        showError("Supabase URL is not configured.");
        setIsSubmitting(false);
        return;
      }

      if (!session?.access_token) {
        showError("You must be signed in to adjust stock.");
        setIsSubmitting(false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(
        `${baseUrl}/functions/v1/adjust-stock`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(values),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to adjust stock.");
      }

      showSuccess("Stock adjusted successfully!");
      form.reset();
      onAdjustmentSuccess();
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
        <FormField
          control={form.control}
          name="product_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Produk <span className="text-red-400">*</span></FormLabel>
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
                        : "Pilih produk"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
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
          name="warehouse_category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kategori Gudang <span className="text-red-400">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="glassmorphism border border-gray-700 text-gray-300">
                    <SelectValue placeholder="Pilih kategori gudang" />
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
          name="adjustment_type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Tipe Penyesuaian <span className="text-red-400">*</span></FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="add" className="border-neon-cyan text-neon-cyan focus:ring-neon-cyan" />
                    </FormControl>
                    <FormLabel className="font-normal text-gray-300">
                      Tambah Stok
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="deduct" className="border-neon-cyan text-neon-cyan focus:ring-neon-cyan" />
                    </FormControl>
                    <FormLabel className="font-normal text-gray-300">
                      Kurangi Stok
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
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jumlah <span className="text-red-400">*</span></FormLabel>
              <FormControl>
                <Input type="number" {...field} min="1" className="glassmorphism border border-gray-700 text-gray-300" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Catatan (Alasan penyesuaian) <span className="text-red-400">*</span></FormLabel>
              <FormControl>
                <Textarea placeholder="contoh: Stock opname tahunan, barang rusak, barang hilang" {...field} className="glassmorphism border border-gray-700 text-gray-300" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300" disabled={isSubmitting}>
          {isSubmitting ? "Menyesuaikan Stok..." : "Sesuaikan Stok"}
        </Button>
      </form>
    </Form>
  );
}

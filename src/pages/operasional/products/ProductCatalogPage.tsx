import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/use-auth-session";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddProductForm } from "@/components/operasional/products/AddProductForm";
import { ProductTable } from "@/components/operasional/products/ProductTable";
import { columns } from "@/components/operasional/products/product-columns";

// Re-define Product interface to ensure it matches the select query and table columns
interface Product {
  id: string;
  kode_barang: string;
  nama_barang: string;
  satuan?: string;
  harga_beli: number;
  harga_jual: number;
  safe_stock_limit: number;
  stok_sekarang: number;
  updated_at: string;
  user_id: string; // Ensure this is included as per RLS policy
}

const ProductCatalogPage = () => {
  const { session, profile, isLoading: isAuthLoading } = useAuthSession();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    console.log("Attempting to fetch products...");
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          kode_barang,
          nama_barang,
          satuan,
          harga_beli,
          harga_jual,
          safe_stock_limit,
          stok_sekarang,
          updated_at,
          user_id
        `);

      if (error) {
        // Log all available error details for better debugging
        console.error("Error fetching products:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        showError(`Failed to load product catalog: ${error.message}`);
      } else {
        console.log("Products fetched successfully:", data);
        setProducts(data || []);
      }
    } catch (err: any) {
      console.error("Unexpected error during product fetch:", err.message);
      showError(`An unexpected error occurred: ${err.message}`);
    } finally {
      setIsLoadingProducts(false);
      console.log("Finished product fetch attempt.");
    }
  };

  useEffect(() => {
    if (!isAuthLoading) {
      if (!session) {
        console.log("Not authenticated, redirecting to /");
        navigate("/");
        return;
      }
      console.log("User authorized, initiating product fetch.");
      fetchProducts();
    }
  }, [isAuthLoading, session, profile, navigate]);

  if (isAuthLoading || isLoadingProducts) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10 space-y-6">
          <Skeleton className="h-10 w-1/2 bg-gray-700" />
          <Skeleton className="h-[500px] w-full bg-gray-800" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen text-gray-400">
          Unauthorized access.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-neon-cyan">Product Catalog</h1>
        <Dialog open={isAddProductDialogOpen} onOpenChange={setIsAddProductDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] glassmorphism border border-electric-violet/30">
            <DialogHeader>
              <DialogTitle className="text-neon-cyan">Add New Product</DialogTitle>
              <DialogDescription className="text-gray-400">
                Fill in the details to add a new product to the catalog.
              </DialogDescription>
            </DialogHeader>
            <AddProductForm
              onProductAdded={() => {
                fetchProducts();
                setIsAddProductDialogOpen(false);
              }}
              onClose={() => setIsAddProductDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="h-[calc(100vh-180px)] pr-4">
        {products.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-md p-4 radar-grid-background">
            <p>No products found in the catalog. Initiating scan...</p>
          </div>
        ) : (
          <ProductTable columns={columns} data={products} />
        )}
      </ScrollArea>
    </DashboardLayout>
  );
};

export default ProductCatalogPage;
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/use-auth-session";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import DashboardLayout from "@/layouts/DashboardLayout";
import { ProductCard } from "@/components/operasional/products/ProductCard"; // Import the new ProductCard

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
}

const ProductCatalogPage = () => {
  const { session, profile, isLoading: isAuthLoading } = useAuthSession();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
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
        updated_at
      `);

    if (error) {
      console.error("Error fetching products:", error);
      showError("Failed to load product catalog.");
    } else {
      setProducts(data || []);
    }
    setIsLoadingProducts(false);
  };

  useEffect(() => {
    if (!isAuthLoading) {
      if (!session) {
        navigate("/");
        return;
      }
      // Only SUPER_ADMIN and OPERASIONAL_DIV can access this page
      if (profile?.role !== "OPERASIONAL_DIV" && profile?.role !== "SUPER_ADMIN") {
        navigate("/dashboard");
        showError("You do not have permission to access this page.");
        return;
      }
      fetchProducts();
    }
  }, [isAuthLoading, session, profile, navigate]);

  if (isAuthLoading || isLoadingProducts) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10 space-y-6">
          <Skeleton className="h-10 w-1/2 bg-gray-700" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-[200px] w-full bg-gray-800" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session || (profile?.role !== "OPERASIONAL_DIV" && profile?.role !== "SUPER_ADMIN")) {
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
      <h1 className="text-3xl font-bold mb-6 text-neon-cyan">Product Catalog</h1>

      <ScrollArea className="h-[calc(100vh-180px)] pr-4"> {/* Adjust height based on header/footer */}
        {products.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-md p-4 radar-grid-background">
            <p>No products found in the catalog. Initiating scan...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"> {/* Bento Grid */}
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </ScrollArea>
    </DashboardLayout>
  );
};

export default ProductCatalogPage;
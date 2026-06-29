import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/auth-session";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
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
import { getColumns, Product } from "@/components/operasional/products/product-columns";
import { TableToolbar } from "@/components/shared/TableToolbar";
import { DatePreset, buildExportColumns, exportToCsv, filterRows, getDateRange } from "@/utils/table-tools";

// Product interface imported from product-columns

const ProductCatalogPage = () => {
  const { session, profile, isLoading: isAuthLoading } = useAuthSession();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("custom");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsAddProductDialogOpen(true);
  };

  const handleDelete = async (product: Product) => {
    if (product.stok_sekarang > 0) {
      showError(`Cannot delete product '${product.nama_barang}' because it still has stock (${product.stok_sekarang}). Please adjust stock to 0 first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete '${product.nama_barang}'? This action cannot be undone.`)) {
      return;
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      console.error("Error deleting product:", error);
      showError("Failed to delete product.");
    } else {
      showSuccess(`Product '${product.nama_barang}' deleted successfully.`);
      fetchProducts();
    }
  };

  const tableColumns = getColumns(handleEdit, handleDelete);

  const dateRange = useMemo(
    () => getDateRange(datePreset, startDate, endDate),
    [datePreset, startDate, endDate]
  );

  const filteredProducts = useMemo(
    () =>
      filterRows(
        products,
        searchValue,
        dateRange,
        (row) => (row.updated_at ? new Date(row.updated_at) : null)
      ),
    [products, searchValue, dateRange]
  );

  const exportColumns = useMemo(() => buildExportColumns<Product>(tableColumns), [tableColumns]);

  const handleExport = () => {
    exportToCsv("products", exportColumns, filteredProducts);
  };

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
        <Dialog open={isAddProductDialogOpen} onOpenChange={(open) => {
          setIsAddProductDialogOpen(open);
          if (!open) setEditingProduct(null);
        }}>
          <DialogTrigger asChild>
            <Button className="bg-electric-violet text-white hover:bg-electric-violet/80 neon-violet-glow-hover transition-all duration-300">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] glassmorphism border border-electric-violet/30">
            <DialogHeader>
              <DialogTitle className="text-neon-cyan">{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
              <DialogDescription className="text-gray-400">
                {editingProduct ? "Update existing product details." : "Fill in the details to add a new product to the catalog."}
              </DialogDescription>
            </DialogHeader>
            <AddProductForm
              initialData={editingProduct || undefined}
              onProductAdded={() => {
                fetchProducts();
                setIsAddProductDialogOpen(false);
                setEditingProduct(null);
              }}
              onClose={() => {
                setIsAddProductDialogOpen(false);
                setEditingProduct(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <TableToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          datePreset={datePreset}
          onDatePresetChange={setDatePreset}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onExport={handleExport}
          exportDisabled={filteredProducts.length === 0}
          searchPlaceholder="Cari produk..."
        />
      </div>

      <ScrollArea className="h-[calc(100vh-180px)] pr-4">
        {filteredProducts.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-md p-4 radar-grid-background">
            <p>No products found in the catalog. Initiating scan...</p>
          </div>
        ) : (
          <ProductTable columns={tableColumns} data={filteredProducts} />
        )}
      </ScrollArea>
    </DashboardLayout>
  );
};

export default ProductCatalogPage;

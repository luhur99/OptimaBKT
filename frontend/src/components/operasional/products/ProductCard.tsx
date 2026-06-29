import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, DollarSign, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

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

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const isLowStock = product.stok_sekarang <= product.safe_stock_limit;
  const stockPercentage = (product.stok_sekarang / (product.safe_stock_limit * 2 || 1)) * 100; // Max 2x safe limit for progress bar

  return (
    <Card
      className={cn(
        "glassmorphism border transition-all duration-300 relative overflow-hidden",
        "hover:neon-glow", // Glow on hover
        isLowStock ? "border-red-600/40" : "border-neon-cyan/30"
      )}
    >
      {isLowStock && (
        <div className="absolute top-0 right-0 bg-red-600/60 text-white text-xs px-2 py-1 rounded-bl-lg flex items-center gap-1 animate-pulse-glow">
          <AlertTriangle className="h-3 w-3" /> Low Stock!
        </div>
      )}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium text-neon-cyan">
          {product.nama_barang}
        </CardTitle>
        <Package className="h-5 w-5 text-electric-violet" />
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-gray-400">
          Code: <Badge variant="secondary" className="bg-gray-700 text-gray-200">{product.kode_barang}</Badge>
        </p>
        <p className="text-sm text-gray-400">
          Unit: <span className="text-gray-300">{product.satuan || "N/A"}</span>
        </p>
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-400">
            Sell Price: <span className="font-semibold text-neon-cyan">Rp {product.harga_jual.toLocaleString("id-ID")}</span>
          </p>
          <p className="text-sm text-gray-400">
            Buy Price: <span className="font-semibold text-gray-300">Rp {product.harga_beli.toLocaleString("id-ID")}</span>
          </p>
        </div>
        <div className="pt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Current Stock: <span className={cn("font-bold", isLowStock ? "text-red-400" : "text-neon-cyan")}>{product.stok_sekarang}</span></span>
            <span>Safe Limit: {product.safe_stock_limit}</span>
          </div>
          <Progress
            value={stockPercentage}
            className={cn(
              "h-2",
              isLowStock ? "[&>*]:bg-red-500" : "[&>*]:bg-neon-cyan"
            )}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Last Updated: {new Date(product.updated_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
};

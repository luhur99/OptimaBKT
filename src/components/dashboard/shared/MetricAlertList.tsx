import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LucideIcon, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertItem {
    id: string;
    title: string;
    subtitle?: string;
    value?: string | number;
    status?: string;
    link?: string;
    statusColor?: string;
}

interface MetricAlertListProps {
    title: string;
    icon: LucideIcon;
    items: AlertItem[];
    isLoading?: boolean;
    emptyMessage?: string;
    className?: string;
    viewAllLink?: string;
}

export const MetricAlertList: React.FC<MetricAlertListProps> = ({
    title,
    icon: Icon,
    items,
    isLoading,
    emptyMessage = "No items found",
    className,
    viewAllLink,
}) => {
    return (
        <Card className={cn("glassmorphism border border-neon-cyan/30 flex flex-col h-full", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold text-neon-cyan flex items-center uppercase tracking-tighter">
                    <Icon className="mr-2 h-5 w-5 text-electric-violet" />
                    {title}
                </CardTitle>
                {viewAllLink && (
                    <Button variant="ghost" size="sm" asChild className="text-xs text-gray-400 hover:text-neon-cyan">
                        <Link to={viewAllLink}>View All</Link>
                    </Button>
                )}
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden pt-4">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-12 w-full bg-gray-800/50 animate-pulse rounded-lg" />
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="h-24 flex flex-col items-center justify-center text-gray-500 border border-dashed border-gray-800 rounded-lg">
                        <p className="text-sm italic">{emptyMessage}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="group flex items-center justify-between p-3 rounded-xl bg-gray-900/40 border border-gray-800/50 hover:border-neon-cyan/30 transition-all duration-300"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-200 truncate">{item.title}</p>
                                    {item.subtitle && <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>}
                                </div>
                                <div className="flex items-center space-x-3 ml-4">
                                    {item.status && (
                                        <Badge
                                            className={cn(
                                                "text-[10px] px-2 py-0 uppercase font-black",
                                                item.statusColor || "bg-gray-700 text-gray-300"
                                            )}
                                        >
                                            {item.status}
                                        </Badge>
                                    )}
                                    {item.value !== undefined && (
                                        <p className="text-sm font-bold text-neon-cyan whitespace-nowrap">{item.value}</p>
                                    )}
                                    {item.link ? (
                                        <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-gray-600 hover:text-neon-cyan p-0">
                                            <Link to={item.link}>
                                                <ChevronRight className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    ) : (
                                        <div className="w-8 h-8" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

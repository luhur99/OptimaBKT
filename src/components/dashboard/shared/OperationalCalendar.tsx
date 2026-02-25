import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { format, isSameDay, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { AlertTriangle, Info, Clock, MapPin, Tag, CalendarClock, Loader2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CalendarEvent {
    id: string;
    date: string;
    time?: string;
    title: string;
    type: "SR" | "DO";
    status: string;
    technician_id?: string;
    technician_name?: string;
    requested_time?: string;
    full_address?: string;
    request_type?: string;
    created_by_name?: string;
}

interface OperationalCalendarProps {
    title: string;
    events: CalendarEvent[];
    type: "SR" | "TECH";
    className?: string;
}

// Distinct color palette for technicians
const TECH_COLORS = [
    { dot: "bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.6)]", badge: "bg-cyan-500/20 text-cyan-400", border: "border-cyan-500/30" },
    { dot: "bg-orange-400 shadow-[0_0_5px_rgba(251,146,60,0.6)]", badge: "bg-orange-500/20 text-orange-400", border: "border-orange-500/30" },
    { dot: "bg-pink-400 shadow-[0_0_5px_rgba(244,114,182,0.6)]", badge: "bg-pink-500/20 text-pink-400", border: "border-pink-500/30" },
    { dot: "bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.6)]", badge: "bg-emerald-500/20 text-emerald-400", border: "border-emerald-500/30" },
    { dot: "bg-violet-400 shadow-[0_0_5px_rgba(167,139,250,0.6)]", badge: "bg-violet-500/20 text-violet-400", border: "border-violet-500/30" },
    { dot: "bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.6)]", badge: "bg-amber-500/20 text-amber-400", border: "border-amber-500/30" },
    { dot: "bg-rose-400 shadow-[0_0_5px_rgba(251,113,133,0.6)]", badge: "bg-rose-500/20 text-rose-400", border: "border-rose-500/30" },
    { dot: "bg-sky-400 shadow-[0_0_5px_rgba(56,189,248,0.6)]", badge: "bg-sky-500/20 text-sky-400", border: "border-sky-500/30" },
];

const DEFAULT_TECH_COLOR = { dot: "bg-gray-400", badge: "bg-gray-500/20 text-gray-400", border: "border-gray-500/30" };

export const OperationalCalendar: React.FC<OperationalCalendarProps> = ({
    title,
    events,
    type,
    className,
}) => {
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
    const [modalOpen, setModalOpen] = React.useState(false);
    const [modalDetails, setModalDetails] = React.useState<CalendarEvent[]>([]);
    const [isFetchingDetails, setIsFetchingDetails] = React.useState(false);

    // Build a stable technician → color map from all events
    const techColorMap = React.useMemo(() => {
        const map = new Map<string, typeof TECH_COLORS[0]>();
        const uniqueTechs: string[] = [];
        events.forEach(e => {
            const key = e.technician_id || e.technician_name;
            if (key && !map.has(key)) {
                uniqueTechs.push(key);
                map.set(key, TECH_COLORS[uniqueTechs.length - 1] || DEFAULT_TECH_COLOR);
            }
        });
        return map;
    }, [events]);

    const getTechColor = (event: CalendarEvent) => {
        const key = event.technician_id || event.technician_name;
        return key ? (techColorMap.get(key) || DEFAULT_TECH_COLOR) : DEFAULT_TECH_COLOR;
    };

    const getEventsForDay = (date: Date) => {
        return events.filter((event) => {
            try {
                return isSameDay(parseISO(event.date), date);
            } catch {
                return false;
            }
        });
    };

    const getCollisionsForDay = (date: Date) => {
        if (type !== "TECH") return [];
        const dayEvents = getEventsForDay(date).filter(e => e.type === "DO");
        const collisions: { time: string; technicians: string[] }[] = [];
        const timeGroups: Record<string, CalendarEvent[]> = {};
        dayEvents.forEach(e => {
            const time = e.time || "unknown";
            if (!timeGroups[time]) timeGroups[time] = [];
            timeGroups[time].push(e);
        });
        Object.entries(timeGroups).forEach(([time, items]) => {
            const techCounts: Record<string, string[]> = {};
            items.forEach(item => {
                if (item.technician_id) {
                    if (!techCounts[item.technician_id]) techCounts[item.technician_id] = [];
                    techCounts[item.technician_id].push(item.technician_name || "Unknown");
                }
            });
            const collidingTechs = Object.values(techCounts)
                .filter(names => names.length > 1)
                .map(names => names[0]);
            if (collidingTechs.length > 0) collisions.push({ time, technicians: collidingTechs });
        });
        return collisions;
    };

    const handleDaySelect = async (date: Date | undefined) => {
        setSelectedDate(date);
        const dayEvents = date ? getEventsForDay(date) : [];

        if (!date || dayEvents.length === 0) {
            setModalOpen(false);
            setModalDetails([]);
            return;
        }

        setModalOpen(true);
        setIsFetchingDetails(true);
        setModalDetails([]);

        const ids = dayEvents.map(e => e.id);

        try {
            if (type === "SR") {
                const { data, error } = await supabase
                    .from("scheduling_requests")
                    .select("id, sr_number, status, requested_date, requested_time, customer_name, full_address, type, user_id")
                    .in("id", ids);
                if (!error && data) {
                    // Fetch creator names from profiles
                    const userIds = [...new Set(data.map((sr: any) => sr.user_id).filter(Boolean))];
                    const profileMap: Record<string, string> = {};
                    if (userIds.length > 0) {
                        const { data: profilesData } = await supabase
                            .from("profiles")
                            .select("id, full_name")
                            .in("id", userIds);
                        if (profilesData) {
                            profilesData.forEach((p: any) => { profileMap[p.id] = p.full_name; });
                        }
                    }
                    setModalDetails(data.map((sr: any) => ({
                        id: sr.id,
                        date: sr.requested_date,
                        title: `${sr.sr_number} - ${sr.customer_name}`,
                        type: "SR" as const,
                        status: sr.status,
                        requested_time: sr.requested_time,
                        full_address: sr.full_address,
                        request_type: sr.type,
                        created_by_name: profileMap[sr.user_id] || undefined,
                    })));
                }
            } else {
                const { data, error } = await supabase
                    .from("delivery_orders")
                    .select(`
                        id, do_number, delivery_date, delivery_time, status,
                        scheduling_requests!request_id (
                            full_address, type, customer_name,
                            assigned_technician_id, technician_name
                        )
                    `)
                    .in("id", ids);
                if (!error && data) {
                    setModalDetails(data.map((do_item: any) => {
                        const sr = Array.isArray(do_item.scheduling_requests)
                            ? do_item.scheduling_requests[0]
                            : do_item.scheduling_requests;
                        const orig = dayEvents.find(e => e.id === do_item.id);
                        return {
                            id: do_item.id,
                            date: do_item.delivery_date,
                            time: do_item.delivery_time,
                            title: orig?.title || `${do_item.do_number}`,
                            type: "DO" as const,
                            status: do_item.status,
                            technician_id: orig?.technician_id,
                            technician_name: orig?.technician_name,
                            full_address: sr?.full_address,
                            request_type: sr?.type,
                        };
                    }));
                }
            }
        } catch (err) {
            console.error("[Calendar] fetch details error:", err);
        } finally {
            setIsFetchingDetails(false);
        }
    };

    const getDayContent = (date: Date) => {
        const dayEvents = getEventsForDay(date);
        const collisions = getCollisionsForDay(date);
        if (dayEvents.length === 0) return null;
        return (
            <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-1">
                {collisions.length > 0 ? (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex -space-x-1">
                                    <AlertTriangle className="h-3 w-3 text-red-500 animate-pulse" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-deep-charcoal border-red-500/50 text-white p-2">
                                <p className="text-xs font-bold text-red-400 uppercase">Jadwal Bertabrakan!</p>
                                {collisions.map((c, idx) => (
                                    <div key={idx} className="mt-1">
                                        <p className="text-[10px] font-semibold">{c.time}: {c.technicians.join(", ")}</p>
                                    </div>
                                ))}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ) : (
                    <div className="flex space-x-0.5">
                        {dayEvents.slice(0, 3).map((event, idx) => {
                            let dotColor = "bg-gray-400";
                            if (type === "SR") {
                                switch (event.status.toLowerCase()) {
                                    case "completed": dotColor = "bg-green-500"; break;
                                    case "approved": dotColor = "bg-blue-500"; break;
                                    case "pending": dotColor = "bg-yellow-500"; break;
                                    case "rejected": dotColor = "bg-red-500"; break;
                                    default: dotColor = "bg-purple-500";
                                }
                            } else {
                                dotColor = getTechColor(event).dot;
                            }
                            return <div key={idx} className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />;
                        })}
                        {dayEvents.length > 3 && <span className="text-[8px] text-gray-400">+{dayEvents.length - 3}</span>}
                    </div>
                )}
            </div>
        );
    };


    return (
        <>
            <Card className={cn("glassmorphism border border-neon-cyan/30 h-full", className)}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold text-neon-cyan flex items-center uppercase tracking-tighter">
                        <Info className="mr-2 h-5 w-5 text-electric-violet" />
                        {title}
                    </CardTitle>
                    {type === "TECH" && techColorMap.size > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {Array.from(techColorMap.entries()).map(([key, color]) => {
                                const techName = events.find(e => (e.technician_id || e.technician_name) === key)?.technician_name || key;
                                return (
                                    <div key={key} className="flex items-center gap-1">
                                        <div className={cn("h-2.5 w-2.5 rounded-full", color.dot)} />
                                        <span className="text-[10px] text-gray-400 font-medium">{techName}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-0 flex flex-col items-center">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDaySelect}
                        className="rounded-md border-none"
                        classNames={{
                            day: cn("h-14 w-14 p-0 font-normal aria-selected:opacity-100 relative hover:bg-neon-cyan/10 transition-colors cursor-pointer"),
                            day_selected: "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/30",
                            day_today: "bg-accent/30 text-accent-foreground font-bold",
                        }}
                        components={{
                            DayContent: ({ date }) => (
                                <div className="w-full h-full flex flex-col items-center justify-center relative">
                                    <span className="text-sm z-10">{date.getDate()}</span>
                                    {getDayContent(date)}
                                </div>
                            ),
                        }}
                    />
                    <p className="text-[10px] text-gray-600 italic pb-3">Klik tanggal untuk melihat detail jadwal</p>
                </CardContent>
            </Card>

            {/* Detail Modal */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="bg-gray-950 border border-neon-cyan/30 text-white max-w-lg max-h-[80vh] flex flex-col">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="text-neon-cyan font-black uppercase tracking-wider flex items-center gap-2">
                            <CalendarClock className="h-5 w-5 text-electric-violet" />
                            {selectedDate && format(selectedDate, "dd MMMM yyyy", { locale: localeId })}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-500">
                            {isFetchingDetails ? "Memuat..." : `${modalDetails.length} jadwal`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar space-y-3 py-2">
                        {isFetchingDetails ? (
                            <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">Memuat data...</span>
                            </div>
                        ) : modalDetails.length === 0 ? (
                            <p className="text-sm text-gray-600 italic text-center py-8">Tidak ada jadwal</p>
                        ) : (
                            modalDetails.map((e, idx) => {
                                const techColor = getTechColor(e);
                                const isTech = type === "TECH";
                                const statusBadgeClass =
                                    e.status.toLowerCase() === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                    e.status.toLowerCase() === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                    e.status.toLowerCase() === 'approved' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                    'bg-purple-500/20 text-purple-400 border-purple-500/30';

                                return (
                                    <div key={idx} className={cn("rounded-xl border p-4 bg-gray-900/60", isTech ? techColor.border : "border-gray-700/60")}>
                                        {/* Header */}
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                {isTech && (
                                                    <div className={cn("h-3 w-3 rounded-full shrink-0 mt-0.5", techColor.dot)} />
                                                )}
                                                <p className="text-sm font-bold text-white leading-tight">{e.title}</p>
                                            </div>
                                            {isTech ? (
                                                <Badge className={cn("text-[10px] py-0.5 px-2 shrink-0 border", techColor.badge, techColor.border)}>
                                                    {e.technician_name || "N/A"}
                                                </Badge>
                                            ) : (
                                                <Badge className={cn("text-[10px] py-0.5 px-2 shrink-0 border", statusBadgeClass)}>
                                                    {e.status.toUpperCase()}
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Info rows */}
                                        <div className="space-y-2">
                                            {e.time && (
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5 w-32 shrink-0">
                                                        <Clock className="h-3.5 w-3.5 text-gray-500" />
                                                        <span className="text-xs text-gray-500">Waktu</span>
                                                    </div>
                                                    <span className="text-sm text-gray-200 font-medium">{e.time}</span>
                                                </div>
                                            )}
                                            {e.requested_time && (
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5 w-32 shrink-0">
                                                        <Clock className="h-3.5 w-3.5 text-neon-cyan/70" />
                                                        <span className="text-xs text-gray-500">Waktu Permintaan</span>
                                                    </div>
                                                    <span className="text-sm text-neon-cyan font-medium">{e.requested_time}</span>
                                                </div>
                                            )}
                                            {e.request_type && (
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5 w-32 shrink-0">
                                                        <Tag className="h-3.5 w-3.5 text-electric-violet/70" />
                                                        <span className="text-xs text-gray-500">Jenis Permintaan</span>
                                                    </div>
                                                    <span className="text-sm text-electric-violet font-medium">{e.request_type}</span>
                                                </div>
                                            )}
                                            {e.full_address && (
                                                <div className="flex items-start gap-3">
                                                    <div className="flex items-center gap-1.5 w-32 shrink-0 mt-0.5">
                                                        <MapPin className="h-3.5 w-3.5 text-gray-500" />
                                                        <span className="text-xs text-gray-500">Alamat Lengkap</span>
                                                    </div>
                                                    <span className="text-sm text-gray-300 leading-snug">{e.full_address}</span>
                                                </div>
                                            )}
                                            {e.created_by_name && (
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5 w-32 shrink-0">
                                                        <User className="h-3.5 w-3.5 text-gray-500" />
                                                        <span className="text-xs text-gray-500">Dibuat oleh</span>
                                                    </div>
                                                    <span className="text-sm text-gray-200 font-medium">{e.created_by_name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

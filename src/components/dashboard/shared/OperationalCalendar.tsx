import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { format, isSameDay, parseISO } from "date-fns";
import { AlertTriangle, Info } from "lucide-react";

interface CalendarEvent {
    id: string;
    date: string;
    time?: string;
    title: string;
    type: "SR" | "DO";
    status: string;
    technician_id?: string;
    technician_name?: string;
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
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());

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

    // Function to get events for a specific day
    const getEventsForDay = (date: Date) => {
        return events.filter((event) => {
            try {
                const eventDate = parseISO(event.date);
                return isSameDay(eventDate, date);
            } catch (e) {
                return false;
            }
        });
    };

    // Logic to detect technician collisions (same date, same time, same tech)
    const getCollisionsForDay = (date: Date) => {
        if (type !== "TECH") return [];

        const dayEvents = getEventsForDay(date).filter(e => e.type === "DO");
        const collisions: { time: string; technicians: string[] }[] = [];

        // Group by time
        const timeGroups: Record<string, CalendarEvent[]> = {};
        dayEvents.forEach(e => {
            const time = e.time || "unknown";
            if (!timeGroups[time]) timeGroups[time] = [];
            timeGroups[time].push(e);
        });

        // Check each time group for duplicate technicians
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

            if (collidingTechs.length > 0) {
                collisions.push({ time, technicians: collidingTechs });
            }
        });

        return collisions;
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
                    onSelect={setSelectedDate}
                    className="rounded-md border-none"
                    classNames={{
                        day: cn("h-14 w-14 p-0 font-normal aria-selected:opacity-100 relative hover:bg-neon-cyan/10 transition-colors"),
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

                {/* Detail view for selected date */}
                {selectedDate && (
                    <div className="w-full p-4 border-t border-gray-800/50 bg-gray-900/40">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                            Detail: {format(selectedDate, "dd MMMM yyyy")}
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {getEventsForDay(selectedDate).length === 0 ? (
                                <p className="text-xs text-gray-600 italic">Tidak ada jadwal</p>
                            ) : (
                                getEventsForDay(selectedDate).map((e, idx) => {
                                    const techColor = getTechColor(e);
                                    const isTech = type === "TECH";
                                    return (
                                    <div key={idx} className={cn("flex items-center justify-between p-2 rounded-lg bg-gray-800/30 border", isTech ? techColor.border : "border-gray-700/50")}>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-200 truncate">{e.title}</p>
                                            <p className="text-[10px] text-gray-500">
                                                {e.time && <span className="mr-2">{e.time}</span>}
                                                {e.technician_name && (
                                                    <span className={cn("font-semibold", isTech ? techColor.badge.split(" ")[1] : "")}>
                                                        {e.technician_name}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        {isTech ? (
                                            <Badge className={cn("text-[8px] py-0 px-1", techColor.badge)}>
                                                {e.technician_name || "N/A"}
                                            </Badge>
                                        ) : (
                                            <Badge className={cn("text-[8px] py-0 px-1",
                                                e.status.toLowerCase() === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                    e.status.toLowerCase() === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        e.status.toLowerCase() === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                                                            'bg-purple-500/20 text-purple-400'
                                            )}>
                                                {e.status.toUpperCase()}
                                            </Badge>
                                        )}
                                    </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

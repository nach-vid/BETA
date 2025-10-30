
"use client";

import * as React from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  add,
  sub,
  isToday as isTodayDateFns,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { DayLog } from "@/app/log-day/page";
import { useRouter } from "next/navigation";

interface DailyPnl {
  pnl: number;
  tradeCount: number;
  isLogged: boolean;
}

interface TradeCalendarProps {
    logs: DayLog[];
}

export function TradeCalendar({ logs }: TradeCalendarProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [today, setToday] = React.useState<Date | null>(null);
  const [dailyPnl, setDailyPnl] = React.useState<Record<string, DailyPnl>>({});

  React.useEffect(() => {
    const initializeCalendar = () => {
      setToday(new Date());
      
        try {
          const pnl: Record<string, DailyPnl> = {};
          logs.forEach((log) => {
            if (!log.date) return;
            const logDate = new Date(log.date);
            const dayKey = format(logDate, "yyyy-MM-dd");
            
            if (!pnl[dayKey]) {
              pnl[dayKey] = { pnl: 0, tradeCount: 0, isLogged: false };
            }

            const dayPnl = log.trades?.reduce((sum, trade) => sum + (trade.pnl || 0), 0) || 0;
            const hasImage = log.trades?.some(t => !!t.analysisImage);
            
            pnl[dayKey].pnl += dayPnl;
            pnl[dayKey].tradeCount += log.trades?.length || 0;
            
            pnl[dayKey].isLogged = dayPnl !== 0 || (hasImage && dayPnl === 0);
          });
          setDailyPnl(pnl);
        } catch (error) {
          console.error("Failed to parse trade logs from props", error);
          setDailyPnl({});
        }
    };
    
    initializeCalendar();

  }, [logs]);

  const firstDayOfCurrentMonth = startOfMonth(currentDate);

  const days = eachDayOfInterval({
    start: startOfWeek(firstDayOfCurrentMonth),
    end: endOfWeek(endOfMonth(firstDayOfCurrentMonth)),
  });


  function nextMonth() {
    setCurrentDate(add(currentDate, { months: 1 }));
  }

  function prevMonth() {
    setCurrentDate(sub(currentDate, { months: 1 }));
  }
  
  const isToday = (day: Date) => {
    if (!today) return false;
    return isTodayDateFns(day);
  }

  const handleDayClick = (day: Date) => {
    const dayKey = format(day, "yyyy-MM-dd");
    router.push(`/log-day?date=${dayKey}`);
  };


  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-normal font-headline">
          {format(currentDate, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-t border-l border-border/20 text-xs text-center font-normal text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-2 border-r border-b border-border/20">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-l border-border/20">
        {days.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const pnlData = dailyPnl[dayKey];
          const isCurrentMonth = isSameMonth(day, currentDate);
          
          let dayStyles: React.CSSProperties = {};
           if (pnlData?.isLogged) {
                if (pnlData.pnl > 0) {
                    dayStyles.borderColor = 'hsl(var(--chart-1))';
                } else if (pnlData.pnl < 0) {
                    dayStyles.borderColor = 'hsl(var(--destructive))';
                } else {
                    dayStyles.borderColor = 'hsl(var(--ring))';
                }
            }

          return (
            <div
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              className={cn(
                "relative flex flex-col justify-start text-xs transition-colors border-r border-b border p-1 h-20",
                 isCurrentMonth ? "cursor-pointer hover:bg-accent/50" : "text-muted-foreground/50 bg-transparent cursor-pointer hover:bg-accent/50",
                pnlData?.isLogged ? 'border-2' : 'border-border/20'
              )}
              style={dayStyles}
            >
                <>
                  <time
                    dateTime={format(day, "yyyy-MM-dd")}
                    className={cn(
                      "font-semibold text-[10px] ml-auto z-10",
                       !isCurrentMonth && "text-muted-foreground",
                      isToday(day) && "flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px]"
                    )}
                  >
                    {isCurrentMonth ? format(day, "d") : null}
                  </time>

                  {pnlData?.isLogged ? (
                    <div className="absolute inset-0 flex items-center justify-center font-bold text-sm z-10 p-1">
                      {pnlData.pnl !== 0 ? (
                        <span className={cn('text-center', pnlData.pnl > 0 && "text-[hsl(var(--chart-1))]", pnlData.pnl < 0 && "text-destructive")}>
                            {pnlData.pnl.toLocaleString("en-US", {
                              style: "currency",
                              currency: "USD",
                              maximumFractionDigits: 0,
                            })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-normal text-[10px] text-center">No Trade</span>
                      )}
                    </div>
                  ) : null}
                </>
            </div>
          );
        })}
      </div>
    </div>
  );
}

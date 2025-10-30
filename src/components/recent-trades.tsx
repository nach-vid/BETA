
"use client";

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";
import type { DayLog } from '@/app/log-day/page';

interface FlatTrade {
    id: string;
    date: Date;
    instrument: string;
    profitOrLoss: number;
    isNoTrade: boolean;
}

interface RecentTradesProps {
    logs: DayLog[];
}

export function RecentTrades({ logs }: RecentTradesProps) {
    const [recentTrades, setRecentTrades] = React.useState<FlatTrade[]>([]);

    React.useEffect(() => {
        if (logs) {
            const flatTrades: FlatTrade[] = logs.flatMap((log, logIndex) => {
                const hasImage = log.trades?.some(t => !!t.analysisImage);
                
                return log.trades.map((trade, tradeIndex) => ({
                    id: `${logIndex}-${tradeIndex}`,
                    date: new Date(log.date),
                    instrument: trade.instrument,
                    profitOrLoss: trade.pnl,
                    isNoTrade: hasImage && trade.pnl === 0
                }));
            })
            .filter(trade => trade.profitOrLoss !== 0 || trade.isNoTrade)
            .sort((a, b) => b.date.getTime() - a.date.getTime());
            
            setRecentTrades(flatTrades);
        }
    }, [logs]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline text-lg font-normal">Recent Trades</CardTitle>
      </CardHeader>
      <CardContent className="pt-2 flex-1 min-h-0">
        <ScrollArea className="h-full">
            {recentTrades.length > 0 ? (
                <ul className="space-y-4 pr-4">
                    {recentTrades.map(trade => (
                        <li key={trade.id} className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="w-10 text-center">
                                    <p className="font-semibold text-sm">{format(trade.date, "d")}</p>
                                    <p className="text-xs text-muted-foreground">{format(trade.date, "MMM")}</p>
                                </div>
                                <p className="font-semibold text-sm w-16 truncate">{trade.instrument}</p>
                            </div>
                            {trade.isNoTrade ? (
                                <p className="text-sm text-muted-foreground text-right min-w-[80px]">No Trade</p>
                            ) : (
                                <p className={cn("font-bold text-sm text-right min-w-[80px]", trade.profitOrLoss > 0 ? "text-[hsl(var(--chart-1))]" : "text-destructive")}>
                                    {trade.profitOrLoss.toLocaleString("en-US", { style: "currency", currency: "USD"})}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>No recent trades</p>
                </div>
            )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

    
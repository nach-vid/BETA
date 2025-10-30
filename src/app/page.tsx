
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { Settings } from "lucide-react";

import { TradeCalendar } from "@/components/trade-calendar";
import { RecentTrades } from "@/components/recent-trades";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import type { DayLog } from "./log-day/page";
import { ProgressTracker } from "@/components/progress-tracker";
import { getTradeLogs } from "@/lib/firestore";
import { SettingsDialog } from "@/components/settings-dialog";
import { LoadingSpinner } from "@/components/loading-spinner";


export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [allLogs, setAllLogs] = React.useState<DayLog[]>([]);
  const [stats, setStats] = React.useState({
      netPnl: 0,
      avgWin: 0,
      winRate: 0,
  });
  const [isClient, setIsClient] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  React.useEffect(() => {
        setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  const fetchLogs = React.useCallback(async () => {
    if (user) {
        const logs = await getTradeLogs(user.uid);
        setAllLogs(logs);
    }
  }, [user]);

  React.useEffect(() => {
    if (isClient) {
      fetchLogs();
    }
  }, [isClient, fetchLogs]);

  React.useEffect(() => {
    if (allLogs.length > 0) {
        try {
            const allTrades = allLogs.flatMap(log => log.trades.map(t => ({...t, date: new Date(log.date)})));
            const tradesWithPnl = allTrades.filter(trade => trade.pnl !== 0);

            const netPnl = allTrades.reduce((acc, trade) => acc + (trade.pnl || 0), 0);
            const winningTrades = allTrades.filter(trade => (trade.pnl || 0) > 0);
            const avgWin = winningTrades.length > 0
              ? winningTrades.reduce((acc, trade) => acc + (trade.pnl || 0), 0) / winningTrades.length
              : 0;
            const winRate = tradesWithPnl.length > 0 ? (winningTrades.length / tradesWithPnl.length) * 100 : 0;
            
            setStats({ netPnl, avgWin, winRate });
        } catch (e) {
            console.error("Failed to parse trade logs", e);
        }
    }
  }, [allLogs]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  if (loading || !user) {
    return (
        <div className="flex items-center justify-center h-screen">
            <LoadingSpinner />
        </div>
    );
  }

  return (
    <>
      <SettingsDialog 
        isOpen={isSettingsOpen} 
        onOpenChange={setIsSettingsOpen} 
        onLogout={handleLogout}
      />
      <div className="flex flex-col h-screen text-foreground">
        <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 md:px-8 border-b border-border/20 bg-background/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)}>
                <Settings />
                <span>Settings</span>
              </Button>
          </div>
          <Button variant="outline" asChild>
            <Link href="/log-day">Log Day</Link>
          </Button>
        </header>

        <main className="flex-1 p-4 overflow-auto">
          <div className="mx-auto w-full max-w-7xl">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  {isClient && <TradeCalendar logs={allLogs} />}
                </div>
                <div className="md:col-span-1">
                  <RecentTrades logs={allLogs} />
                </div>
                <div className="col-span-1">
                  <StatCard 
                      title="Net P&L" 
                      value={stats.netPnl.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0})} 
                  />
                </div>
                <div className="col-span-1">
                  <StatCard 
                      title="Avg Trade Win" 
                      value={stats.avgWin.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0})}
                    />
                </div>
                <div className="col-span-1">
                  <StatCard 
                      title="Win Rate" 
                      value={`${stats.winRate.toFixed(0)}%`}
                    />
                </div>
                <div className="col-span-1">
                  <ProgressTracker logs={allLogs} />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

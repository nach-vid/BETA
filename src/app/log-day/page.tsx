
"use client";

import * as React from "react";
import { format } from "date-fns";
import { Plus, CalendarIcon, Upload, X, ChevronsUpDown, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/auth-context";
import { getDayLog, saveDayLog } from "@/lib/firestore";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useDebouncedCallback } from "use-debounce";


const sessionTradeSchema = z.object({
  sessionName: z.string(),
  action: z.enum(["none", "consolidation", "displacement", "retracement", "reversal"]).default("none"),
  direction: z.enum(["none", "up", "down"]).default("none"),
  sweep: z.enum(["none", "high", "low", "both"]).default("none"),
});

const tradeSchema = z.object({
  instrument: z.string().min(1, "Instrument is required."),
  model: z.string().optional().default(""),
  pnl: z.coerce.number().optional(),
  entryTime: z.string().optional().default(""),
  exitTime: z.string().optional().default(""),
  contracts: z.coerce.number().optional(),
  tradeTp: z.coerce.number().optional(),
  tradeSl: z.coerce.number().optional(),
  totalPoints: z.coerce.number().optional(),
  analysisImage: z.string().optional().default(""),
  analysisText: z.string().optional().default(""),
  sessions: z.array(sessionTradeSchema).optional(),
  chartPerformance: z.string().optional().default(""),
});

const dayLogSchema = z.object({
  date: z.date(),
  notes: z.string().optional().default(""),
  trades: z.array(tradeSchema),
});

export type DayLog = z.infer<typeof dayLogSchema>;

const sessionOptions = ["Asia", "London", "New York", "Lunch", "PM"];
const chartPerformanceOptions = ["Consolidation", "Small Move", "Hit TP", "Hit SL", "Hit SL and then TP", "Expansion Up", "Expansion Down"];
const instrumentOptions = ["MNQ", "NQ", "ES", "MES"];
const instrumentPointValues: { [key: string]: number } = {
    "MNQ": 2,
    "NQ": 20,
    "ES": 50,
    "MES": 5,
};

const defaultSessions = sessionOptions.map(name => ({
  sessionName: name,
  action: "none" as const,
  direction: "none" as const,
  sweep: "none" as const
}));

const emptyTrade = {
    instrument: "NQ",
    model: "",
    pnl: 0,
    entryTime: "",
    exitTime: "",
    contracts: 0,
    tradeTp: 0,
    tradeSl: 0,
    totalPoints: 0,
    analysisImage: "",
    analysisText: "",
    chartPerformance: "",
    sessions: defaultSessions,
};


const TradeDataField = ({ label, children }: { label: string, children: React.ReactNode }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <Collapsible className="py-3 border-b border-border/20" open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full group cursor-pointer">
                <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">{label}</span>
                <Plus className={cn("h-4 w-4 ml-2 transition-transform", isOpen && "rotate-45")} />
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="mt-2 space-y-2">
                    {children}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
};


export default function LogDayPage() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const { user, loading } = useAuth();
    
    const [models, setModels] = React.useState<string[]>([]);
    const [popoverOpen, setPopoverOpen] = React.useState(false);
    const [newModel, setNewModel] = React.useState('');
    const [isPnlManuallySet, setIsPnlManuallySet] = React.useState(false);
    
    const form = useForm<z.infer<typeof dayLogSchema>>({
        resolver: zodResolver(dayLogSchema),
        defaultValues: {
            date: new Date(),
            notes: "",
            trades: [emptyTrade],
        },
    });

    const performSave = React.useCallback(async (data: DayLog) => {
        if (!user) return;
        try {
            await saveDayLog(user.uid, data);
            const dayKey = format(new Date(data.date), 'yyyy-MM-dd');
            localStorage.setItem(`dayLog-${dayKey}`, JSON.stringify(data));
        } catch (error) {
            console.error("Autosave failed", error);
            toast({
                title: "Autosave Failed",
                description: "Could not save your changes.",
                variant: "destructive",
            });
        }
    }, [user, toast]);

    const debouncedSave = useDebouncedCallback((data: DayLog) => {
        performSave(data);
    }, 2000);

    React.useEffect(() => {
        const subscription = form.watch((value) => {
            debouncedSave(value as DayLog);
        });
        return () => subscription.unsubscribe();
    }, [form, debouncedSave]);

    const handleBackClick = async () => {
        await performSave(form.getValues());
        router.push('/');
    };

    const updatePnl = React.useCallback(() => {
        if (isPnlManuallySet) return;

        const instrument = form.getValues("trades.0.instrument") || "NQ";
        const points = form.getValues("trades.0.totalPoints") || 0;
        const contracts = form.getValues("trades.0.contracts") || 0;

        const pointValue = instrumentPointValues[instrument] || 0;
        const calculatedPnl = points * pointValue * contracts;

        if (form.getValues("trades.0.pnl") !== calculatedPnl) {
            form.setValue("trades.0.pnl", calculatedPnl, { shouldDirty: true });
        }
    }, [form, isPnlManuallySet]);
    
    React.useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);
    
    React.useEffect(() => {
        const savedModels = localStorage.getItem('trade-models');
        if (savedModels) {
            setModels(JSON.parse(savedModels));
        }
    }, []);

    const addModel = (model: string) => {
        const updatedModels = [...models, model];
        setModels(updatedModels);
        localStorage.setItem('trade-models', JSON.stringify(updatedModels));
        form.setValue('trades.0.model', model, { shouldDirty: true });
        setNewModel('');
        setPopoverOpen(false);
    };

    const deleteModel = (modelToDelete: string) => {
        const updatedModels = models.filter(m => m !== modelToDelete);
        setModels(updatedModels);
        localStorage.setItem('trade-models', JSON.stringify(updatedModels));
        if (form.getValues('trades.0.model') === modelToDelete) {
            form.setValue('trades.0.model', '');
        }
    };

    
    React.useEffect(() => {
        if (!user) return;

        const dateParam = searchParams.get('date');
        const date = dateParam ? new Date(dateParam) : new Date();
        const dayKey = format(date, 'yyyy-MM-dd');
        
        const loadData = async () => {
            const localDataStr = localStorage.getItem(`dayLog-${dayKey}`);
            let dataToLoad: DayLog | null = null;
            
            if (localDataStr) {
                try {
                    dataToLoad = JSON.parse(localDataStr) as DayLog;
                } catch (e) {
                    console.error("Failed to parse localStorage data", e);
                }
            }

            if (!dataToLoad) {
                dataToLoad = await getDayLog(user.uid, date);
                if (dataToLoad) {
                    localStorage.setItem(`dayLog-${dayKey}`, JSON.stringify(dataToLoad));
                }
            }
            
            if (dataToLoad) {
                const savedTrade = dataToLoad.trades?.[0] || {};
                const sessionMap = new Map((savedTrade.sessions || []).map((s: any) => [s.sessionName, s]));
                const fullSessions = sessionOptions.map(name => {
                    const savedSession = sessionMap.get(name);
                    return {
                        sessionName: name,
                        action: savedSession?.action || "none",
                        direction: savedSession?.direction || "none",
                        sweep: savedSession?.sweep || "none",
                    };
                });

                form.reset({
                    date: new Date(dataToLoad.date),
                    notes: dataToLoad.notes || "",
                    trades: [{ ...emptyTrade, ...savedTrade, sessions: fullSessions }],
                });
            } else {
                form.reset({
                    date: date,
                    notes: "",
                    trades: [emptyTrade],
                });
            }
        };

        loadData();
    }, [searchParams, user, form]);
    
    const handleImagePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
        const items = event.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        form.setValue("trades.0.analysisImage", e.target?.result as string, { shouldDirty: true });
                    };
                    reader.readAsDataURL(file);
                }
            }
        }
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                form.setValue("trades.0.analysisImage", e.target?.result as string, { shouldDirty: true });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const analysisImage = form.watch("trades.0.analysisImage");
    const pnlValue = form.watch("trades.0.pnl") || 0;
    const pnlColorClass = pnlValue > 0 ? 'text-[hsl(var(--chart-1))]' : pnlValue < 0 ? 'text-destructive' : 'text-foreground';
    const filteredModels = models.filter(m => m.toLowerCase().includes(newModel.toLowerCase()));

    if (loading || !user) {
        return (
            <div className="flex items-center justify-center h-screen">
                <LoadingSpinner />
            </div>
        );
    }
    
    return (
        <div className="flex flex-col min-h-screen text-foreground">
            <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 md:px-8 border-b border-border/20 bg-background/95 backdrop-blur-sm">
                <div className="w-10">
                    <Button variant="ghost" size="icon" onClick={handleBackClick}>
                        <ArrowLeft />
                    </Button>
                </div>
                <h1 className="text-xl font-bold font-headline text-center">
                    Recap for {format(form.watch("date"), "M/d/yy")}
                </h1>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 p-4 md:p-6">
                <Form {...form}>
                    <form onSubmit={(e) => e.preventDefault()}>
                        <div className="mx-auto w-full max-w-6xl">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="font-headline text-base font-normal">PNL</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <FormField
                                                control={form.control}
                                                name="trades.0.pnl"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <div className="flex items-center">
                                                                <span className={cn("text-3xl font-bold", pnlColorClass)}>
                                                                    $
                                                                </span>
                                                                <Input
                                                                    type="number"
                                                                    placeholder="0"
                                                                    className={cn(
                                                                        "p-0 h-auto border-0 text-3xl font-bold bg-transparent focus-visible:ring-0",
                                                                        "flex-1",
                                                                        pnlColorClass,
                                                                        "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                    )}
                                                                    {...field}
                                                                    value={field.value === 0 ? '' : (field.value ?? '')}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        field.onChange(value === '' ? 0 : Number(value));
                                                                        setIsPnlManuallySet(true);
                                                                    }}
                                                                    onBlur={() => {
                                                                        const pnl = form.getValues("trades.0.pnl");
                                                                        if (pnl === null || pnl === 0) {
                                                                            setIsPnlManuallySet(false);
                                                                            updatePnl();
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </CardContent>
                                    </Card>
                                    <Card onPaste={handleImagePaste} className="overflow-hidden">
                                         <CardHeader>
                                            <CardTitle className="font-headline text-base font-normal">Chart</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="flex flex-col text-left">
                                            {analysisImage ? (
                                                 <div className="w-full">
                                                    <div className="relative w-full">
                                                        <Image src={analysisImage} alt="Trade analysis" width={0} height={0} sizes="100vw" style={{ width: '100%', height: 'auto' }} />
                                                    </div>
                                                    <div className="p-2">
                                                        <FormField
                                                            control={form.control}
                                                            name="trades.0.analysisText"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormControl>
                                                                        <Input className="bg-transparent border-0 p-0 h-auto text-sm placeholder:text-gray-400" placeholder="Add a short description..." {...field} />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground h-[350px]">
                                                    <Upload className="h-8 w-8" />
                                                    <p className="text-sm font-medium">Paste or upload an image of your trade.</p>
                                                     <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                                        Upload File
                                                    </Button>
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        onChange={handleImageUpload}
                                                        className="hidden"
                                                        accept="image/*"
                                                    />
                                                </div>
                                            )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="font-headline text-base font-normal">Notes</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4">
                                            <FormField
                                                control={form.control}
                                                name="notes"
                                                render={({ field }) => (
                                                    <FormItem>
                                                    <FormControl>
                                                        <Textarea className="bg-transparent border-0 p-0 focus-visible:ring-0 text-base min-h-[100px]" placeholder="General notes for the day..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="lg:col-span-1">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="font-headline text-base font-normal">Trade Data</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0">
                                                <div className="py-3">
                                                    <FormField
                                                        control={form.control}
                                                        name="trades.0.instrument"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <RadioGroup
                                                                        onValueChange={(value) => {
                                                                            field.onChange(value);
                                                                            setIsPnlManuallySet(false);
                                                                            setTimeout(updatePnl, 0);
                                                                        }}
                                                                        value={field.value}
                                                                        className="flex items-center space-x-2"
                                                                    >
                                                                        {instrumentOptions.map((opt) => (
                                                                            <FormItem key={opt} className="flex items-center space-x-1 space-y-0">
                                                                                <FormControl>
                                                                                    <RadioGroupItem value={opt} id={opt} className="peer sr-only" />
                                                                                </FormControl>
                                                                                <FormLabel
                                                                                    htmlFor={opt}
                                                                                    className="flex h-7 cursor-pointer items-center justify-center rounded-none border border-input bg-transparent px-2 py-1 text-xs font-semibold ring-offset-background hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground"
                                                                                >
                                                                                    {opt}
                                                                                </FormLabel>
                                                                            </FormItem>
                                                                        ))}
                                                                    </RadioGroup>
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                <div className="py-3 border-t border-border/20">
                                                    <FormField
                                                        control={form.control}
                                                        name="date"
                                                        render={({ field }) => (
                                                            <FormItem className="flex flex-col space-y-2">
                                                                <FormLabel className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Date</FormLabel>
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                    <FormControl>
                                                                        <Button
                                                                        variant={"ghost"}
                                                                        className={cn(
                                                                            "w-full justify-start text-left font-normal p-0 h-auto text-base hover:bg-transparent hover:text-foreground",
                                                                            !field.value && "text-muted-foreground"
                                                                        )}
                                                                        >
                                                                        {field.value ? (
                                                                            format(field.value, "PPP")
                                                                        ) : (
                                                                            <span>Pick a date</span>
                                                                        )}
                                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                        </Button>
                                                                    </FormControl>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-auto p-0" align="start">
                                                                    <Calendar
                                                                        mode="single"
                                                                        selected={field.value}
                                                                        onSelect={(date) => {
                                                                            if (date) {
                                                                                performSave(form.getValues());
                                                                                router.push(`/log-day?date=${format(date, 'yyyy-MM-dd')}`);
                                                                            }
                                                                        }}
                                                                        disabled={(date) =>
                                                                        date > new Date() || date < new Date("1900-01-01")
                                                                        }
                                                                        initialFocus
                                                                    />
                                                                    </PopoverContent>
                                                                </Popover>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                        />
                                                </div>
                                                
                                                <div className="space-y-0">
                                                     <TradeDataField label="Model">
                                                        <FormField
                                                            control={form.control}
                                                            name="trades.0.model"
                                                            render={({ field }) => (
                                                                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                                                    <PopoverTrigger asChild>
                                                                        <Button
                                                                            variant="outline"
                                                                            role="combobox"
                                                                            className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                                                        >
                                                                            {field.value || "Select a model"}
                                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-[300px] p-0">
                                                                        <div className="p-2">
                                                                            <Input 
                                                                                placeholder="Search or create new..."
                                                                                value={newModel}
                                                                                onChange={(e) => setNewModel(e.target.value)}
                                                                            />
                                                                        </div>
                                                                        <ScrollArea className="h-[200px]">
                                                                            {filteredModels.map(model => (
                                                                                <div key={model} className="flex items-center justify-between p-2 hover:bg-accent">
                                                                                    <button
                                                                                        type="button"
                                                                                        className="flex-1 text-left text-sm"
                                                                                        onClick={() => {
                                                                                            form.setValue('trades.0.model', model, { shouldDirty: true });
                                                                                            setPopoverOpen(false);
                                                                                        }}
                                                                                    >
                                                                                        {model}
                                                                                    </button>
                                                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteModel(model)}>
                                                                                        <X className="h-4 w-4" />
                                                                                    </Button>
                                                                                </div>
                                                                            ))}
                                                                            {filteredModels.length === 0 && newModel && (
                                                                                <div className="p-2 text-center text-sm text-muted-foreground">No models found.</div>
                                                                            )}
                                                                        </ScrollArea>
                                                                        {newModel && !models.map(m => m.toLowerCase()).includes(newModel.toLowerCase()) && (
                                                                            <div className="p-2 border-t border-border/20">
                                                                                <Button type="button" className="w-full" onClick={() => addModel(newModel)}>
                                                                                    Create "{newModel}"
                                                                                </Button>
                                                                            </div>
                                                                        )}
                                                                    </PopoverContent>
                                                                </Popover>
                                                            )}
                                                        />
                                                    </TradeDataField>
                                                    <TradeDataField label="Entry / Exit Time">
                                                        <div className="flex justify-start gap-2">
                                                            <FormField
                                                                control={form.control}
                                                                name="trades.0.entryTime"
                                                                render={({ field }) => <Input type="time" {...field} />}
                                                            />
                                                            <FormField
                                                                control={form.control}
                                                                name="trades.0.exitTime"
                                                                render={({ field }) => <Input type="time" {...field} />}
                                                            />
                                                        </div>
                                                    </TradeDataField>
                                                    <TradeDataField label="Contracts">
                                                         <FormField
                                                            control={form.control}
                                                            name="trades.0.contracts"
                                                            render={({ field }) => <Input type="number" placeholder="0" {...field} 
                                                            onChange={(e) => {
                                                                field.onChange(e.target.value === '' ? null : e.target.valueAsNumber);
                                                                setIsPnlManuallySet(false);
                                                                setTimeout(updatePnl, 0);
                                                            }} />}
                                                        />
                                                    </TradeDataField>
                                                    <TradeDataField label="Points">
                                                        <FormField
                                                            control={form.control}
                                                            name="trades.0.totalPoints"
                                                            render={({ field }) => <Input type="number" placeholder="0" {...field} 
                                                            onChange={(e) => {
                                                                field.onChange(e.target.value === '' ? null : e.target.valueAsNumber);
                                                                setIsPnlManuallySet(false);
                                                                setTimeout(updatePnl, 0);
                                                            }}/>}
                                                        />
                                                    </TradeDataField>
                                                    <TradeDataField label="TP / SL">
                                                        <div className="flex gap-2">
                                                             <FormField
                                                                control={form.control}
                                                                name="trades.0.tradeTp"
                                                                render={({ field }) => <Input type="number" placeholder="TP" {...field} onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)} />}
                                                            />
                                                             <FormField
                                                                control={form.control}
                                                                name="trades.0.tradeSl"
                                                                render={({ field }) => <Input type="number" placeholder="SL" {...field} onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)} />}
                                                            />
                                                        </div>
                                                    </TradeDataField>
                                                    <TradeDataField label="Sessions">
                                                        <div className="space-y-2">
                                                            {(form.watch('trades.0.sessions') || []).map((session, index) => {
                                                              const selectedAction = session.action;
                                                              return (
                                                                <div key={index} className="space-y-2 p-2 border border-border/20 rounded-md">
                                                                    <div className="flex gap-2 items-center justify-between">
                                                                        <span className="flex-1 font-semibold text-sm">{sessionOptions[index]}</span>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 gap-2">
                                                                        <FormField
                                                                            control={form.control}
                                                                            name={`trades.0.sessions.${index}.action`}
                                                                            render={({ field }) => (
                                                                                <Select onValueChange={field.onChange} value={field.value || "none"}>
                                                                                    <FormControl>
                                                                                        <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
                                                                                    </FormControl>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="none">-</SelectItem>
                                                                                        <SelectItem value="consolidation">Consolidation</SelectItem>
                                                                                        <SelectItem value="displacement">Displacement</SelectItem>
                                                                                        <SelectItem value="retracement">Retracement</SelectItem>
                                                                                        <SelectItem value="reversal">Reversal</SelectItem>
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            )}
                                                                        />
                                                                        {selectedAction && selectedAction !== 'none' && selectedAction !== 'consolidation' && (
                                                                            <FormField
                                                                                control={form.control}
                                                                                name={`trades.0.sessions.${index}.direction`}
                                                                                render={({ field }) => (
                                                                                    <Select onValueChange={field.onChange} value={field.value || "none"}>
                                                                                        <FormControl>
                                                                                            <SelectTrigger><SelectValue placeholder="Direction" /></SelectTrigger>
                                                                                        </FormControl>
                                                                                        <SelectContent>
                                                                                            <SelectItem value="none">-</SelectItem>
                                                                                            <SelectItem value="up">Expansion Up</SelectItem>
                                                                                            <SelectItem value="down">Expansion Down</SelectItem>
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                )}
                                                                            />
                                                                        )}
                                                                        {selectedAction && selectedAction !== 'none' && (
                                                                          <FormField
                                                                                control={form.control}
                                                                                name={`trades.0.sessions.${index}.sweep`}
                                                                                render={({ field }) => (
                                                                                    <Select onValueChange={field.onChange} value={field.value || "none"}>
                                                                                        <FormControl>
                                                                                            <SelectTrigger><SelectValue placeholder="Sweep" /></SelectTrigger>
                                                                                        </FormControl>
                                                                                        <SelectContent>
                                                                                            <SelectItem value="none">-</SelectItem>
                                                                                            <SelectItem value="high">Sweep High</SelectItem>
                                                                                            <SelectItem value="low">Sweep Low</SelectItem>
                                                                                            <SelectItem value="both">Sweep Both</SelectItem>
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                )}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )})}
                                                        </div>
                                                    </TradeDataField>
                                                     <TradeDataField label="Chart Performance">
                                                        <FormField
                                                            control={form.control}
                                                            name="trades.0.chartPerformance"
                                                            render={({ field }) => (
                                                                <Select onValueChange={field.onChange} value={field.value}>
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Select performance..." />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {chartPerformanceOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        />
                                                    </TradeDataField>
                                                </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    </form>
                </Form>
            </main>
        </div>
    );
}

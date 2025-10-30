
"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

interface StatCardProps {
    title: string;
    value?: string;
    children?: React.ReactNode;
}

export function StatCard({ title, value, children }: StatCardProps) {
  return (
    <Card className="text-center h-28 flex flex-col justify-center">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="font-headline text-sm font-normal text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {value && <p className="text-4xl font-bold font-headline text-foreground">{value}</p>}
        {children}
      </CardContent>
    </Card>
  )
}

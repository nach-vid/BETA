
"use client";

import { useAuth } from "@/context/auth-context";
import { useEffect } from "react";

export function TitleManager() {
    const { user, loading } = useAuth();

    useEffect(() => {
        if (loading) {
            document.title = "TradeLight - Loading...";
        } else if (user) {
            document.title = `TradeLight - ${user.displayName || user.email}`;
        } else {
            document.title = "TradeLight - Logged Out";
        }
    }, [user, loading]);

    return null;
}


"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { updateProfile } from "firebase/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

const themes = [
    { name: "Light", value: "light", colors: ["#FFFFFF", "#09090b"] },
    { name: "Default", value: "theme-default", colors: ["#080808", "#FAFAFA"] },
    { name: "Zinc", value: "theme-zinc", colors: ["#18181B", "#FAFAFA"] },
    { name: "Rose", value: "theme-rose", colors: ["#1f000b", "#fff0f3"] },
    { name: "Blue", value: "theme-blue", colors: ["#0A192F", "#A8D8FF"] },
];

const fonts = [
    { name: "Default", value: "font-body" },
    { name: "Mono", value: "font-mono" },
];

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onLogout: () => void;
}

export function SettingsDialog({ isOpen, onOpenChange, onLogout }: SettingsDialogProps) {
  const { user, loading, refreshUser } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [selectedTheme, setSelectedTheme] = useState("");
  const [selectedFont, setSelectedFont] = useState("");
  const [particlesEnabled, setParticlesEnabled] = useState(false);
  const [particleDensity, setParticleDensity] = useState(40);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (user) {
      setDisplayName(user.displayName || "");
    }
    const storedTheme = localStorage.getItem("app-theme") || "theme-default";
    const storedFont = localStorage.getItem("app-font") || "font-body";
    const storedParticles = localStorage.getItem("app-particles") === "true";
    const storedDensity = localStorage.getItem("app-particles-density");

    setSelectedTheme(storedTheme);
    setSelectedFont(storedFont);
    setParticlesEnabled(storedParticles);
    setParticleDensity(storedDensity ? parseInt(storedDensity, 10) : 40);
    
  }, [user]);

  const handleThemeChange = (theme: string) => {
    localStorage.setItem("app-theme", theme);
    setSelectedTheme(theme);
    window.dispatchEvent(new CustomEvent('onLocalStorageChange'));
  };
  
  const handleFontChange = (font: string) => {
    localStorage.setItem("app-font", font);
    setSelectedFont(font);
    window.dispatchEvent(new CustomEvent('onLocalStorageChange'));
  };

  const handleParticlesChange = (enabled: boolean) => {
    localStorage.setItem("app-particles", String(enabled));
    setParticlesEnabled(enabled);
    window.dispatchEvent(new CustomEvent('onLocalStorageChange'));
  };
  
  const handleDensityChange = (value: number[]) => {
      setParticleDensity(value[0]);
  }
  
  const handleDensityCommit = (value: number[]) => {
      localStorage.setItem("app-particles-density", String(value[0]));
      window.dispatchEvent(new CustomEvent('onLocalStorageChange'));
  }

  const handleNameSave = async () => {
    if (user) {
      try {
        await updateProfile(user, { displayName });
        toast({
          title: "Success",
          description: "Your display name has been updated.",
        });
        if (refreshUser) refreshUser();
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to update display name.",
          variant: "destructive",
        });
      }
    }
  };
  
  if (loading || !isClient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your account and preferences.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
            <div className="space-y-2">
                <Label>Email</Label>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <div className="flex gap-2">
                <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                />
                <Button onClick={handleNameSave}>Save</Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Theme</Label>
            <div className="flex items-center gap-2 flex-wrap">
                {themes.map((theme) => (
                    <button
                        key={theme.value}
                        onClick={() => handleThemeChange(theme.value)}
                        className={cn(
                            "flex flex-col items-center gap-2 rounded-md p-2 border-2 transition-colors",
                            selectedTheme === theme.value ? "border-primary" : "border-transparent"
                        )}
                    >
                        <div className="flex gap-1">
                            <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: theme.colors[0] }}></div>
                            <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: theme.colors[1] }}></div>
                        </div>
                        <span className="text-xs font-medium">{theme.name}</span>
                    </button>
                ))}
            </div>
          </div>

           <div className="space-y-2">
            <Label>Font</Label>
            <RadioGroup
                value={selectedFont}
                onValueChange={handleFontChange}
                className="flex items-center space-x-2"
            >
                {fonts.map((font) => (
                    <div key={font.value} className="flex items-center space-x-1 space-y-0">
                        <RadioGroupItem value={font.value} id={font.value} className="peer sr-only" />
                        <Label htmlFor={font.value} className="flex h-7 cursor-pointer items-center justify-center rounded-none border border-input bg-transparent px-2 py-1 text-xs font-semibold ring-offset-background hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground">
                            {font.name}
                        </Label>
                    </div>
                ))}
            </RadioGroup>
          </div>

          <div className="space-y-4">
             <Label>Effects</Label>
              <div className="flex items-center justify-between">
                <Label htmlFor="particles-switch" className="font-normal">Particle Background</Label>
                <Switch
                  id="particles-switch"
                  checked={particlesEnabled}
                  onCheckedChange={handleParticlesChange}
                />
              </div>
              {particlesEnabled && (
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label className="font-normal">Particle Density</Label>
                        <span className="text-xs text-muted-foreground">{particleDensity}</span>
                    </div>
                    <Slider
                        value={[particleDensity]}
                        onValueChange={handleDensityChange}
                        onValueCommit={handleDensityCommit}
                        max={150}
                        step={10}
                    />
                </div>
              )}
          </div>
          
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={onLogout}>Log Out</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

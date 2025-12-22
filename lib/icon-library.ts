import * as LucideIcons from "lucide-react";

export interface TacticalIcon {
    id: string;
    icon: any;
    category: "Operational" | "Hospitality" | "BOH" | "Achievement" | "Creative";
}

export const TACTICAL_ICONS: TacticalIcon[] = [
    // --- ACHIEVEMENT ---
    { id: "Trophy", icon: LucideIcons.Trophy, category: "Achievement" },
    { id: "Crown", icon: LucideIcons.Crown, category: "Achievement" },
    { id: "Medal", icon: LucideIcons.Medal, category: "Achievement" },
    { id: "Award", icon: LucideIcons.Award, category: "Achievement" },
    { id: "Star", icon: LucideIcons.Star, category: "Achievement" },
    { id: "Gem", icon: LucideIcons.Gem, category: "Achievement" },
    { id: "Sparkles", icon: LucideIcons.Sparkles, category: "Achievement" },
    { id: "CheckCircle", icon: LucideIcons.CheckCircle2, category: "Achievement" },

    // --- HOSPITALITY & FOH ---
    { id: "Heart", icon: LucideIcons.Heart, category: "Hospitality" },
    { id: "Smile", icon: LucideIcons.Smile, category: "Hospitality" },
    { id: "Coffee", icon: LucideIcons.Coffee, category: "Hospitality" },
    { id: "Sun", icon: LucideIcons.Sun, category: "Hospitality" },
    { id: "Glass", icon: LucideIcons.GlassWater, category: "Hospitality" },
    { id: "Utensils", icon: LucideIcons.Utensils, category: "Hospitality" },
    { id: "Pizza", icon: LucideIcons.Pizza, category: "Hospitality" },
    { id: "IceCream", icon: LucideIcons.IceCream, category: "Hospitality" },
    { id: "Cake", icon: LucideIcons.Cake, category: "Hospitality" },
    { id: "Handshake", icon: LucideIcons.Handshake, category: "Hospitality" },

    // --- BOH & KITCHEN ---
    { id: "ChefHat", icon: LucideIcons.ChefHat, category: "BOH" },
    { id: "Flame", icon: LucideIcons.Flame, category: "BOH" },
    { id: "Pot", icon: LucideIcons.CookingPot, category: "BOH" }, // Replaced Knife
    { id: "Timer", icon: LucideIcons.Timer, category: "BOH" },
    { id: "Thermometer", icon: LucideIcons.Thermometer, category: "BOH" },
    { id: "Droplets", icon: LucideIcons.Droplets, category: "BOH" },
    { id: "Trash", icon: LucideIcons.Trash2, category: "BOH" },
    { id: "Refrigerator", icon: LucideIcons.Refrigerator, category: "BOH" },

    // --- OPERATIONAL & TACTICAL ---
    { id: "Zap", icon: LucideIcons.Zap, category: "Operational" },
    { id: "Shield", icon: LucideIcons.Shield, category: "Operational" },
    { id: "Target", icon: LucideIcons.Target, category: "Operational" },
    { id: "Crosshair", icon: LucideIcons.Crosshair, category: "Operational" },
    { id: "Rocket", icon: LucideIcons.Rocket, category: "Operational" },
    { id: "Activity", icon: LucideIcons.Activity, category: "Operational" },
    { id: "Fingerprint", icon: LucideIcons.Fingerprint, category: "Operational" },
    { id: "Compass", icon: LucideIcons.Compass, category: "Operational" },
    { id: "Anchor", icon: LucideIcons.Anchor, category: "Operational" },
    { id: "Map", icon: LucideIcons.Map, category: "Operational" },
    { id: "Radar", icon: LucideIcons.Radar, category: "Operational" },
    { id: "Flag", icon: LucideIcons.Flag, category: "Operational" },
    { id: "Gauge", icon: LucideIcons.Gauge, category: "Operational" },
    { id: "Cpu", icon: LucideIcons.Cpu, category: "Operational" },
    { id: "Terminal", icon: LucideIcons.Terminal, category: "Operational" },

    // --- CREATIVE & SYMBOLIC ---
    { id: "Palette", icon: LucideIcons.Palette, category: "Creative" },
    { id: "Feather", icon: LucideIcons.Feather, category: "Creative" },
    { id: "Moon", icon: LucideIcons.Moon, category: "Creative" },
    { id: "Mountain", icon: LucideIcons.Mountain, category: "Creative" },
    { id: "Tree", icon: LucideIcons.TreeDeciduous, category: "Creative" },
    { id: "Ghost", icon: LucideIcons.Ghost, category: "Creative" },
    { id: "Bird", icon: LucideIcons.Bird, category: "Creative" },
    { id: "Fish", icon: LucideIcons.Fish, category: "Creative" },
    { id: "Dog", icon: LucideIcons.Dog, category: "Creative" },
    { id: "Cat", icon: LucideIcons.Cat, category: "Creative" },
    { id: "Bomb", icon: LucideIcons.Bomb, category: "Creative" },
    { id: "Binoculars", icon: LucideIcons.Binoculars, category: "Creative" },
    { id: "Camera", icon: LucideIcons.Camera, category: "Creative" },
    { id: "Gamepad", icon: LucideIcons.Gamepad2, category: "Creative" },
    { id: "Music", icon: LucideIcons.Music, category: "Creative" },
    { id: "Plane", icon: LucideIcons.Plane, category: "Creative" },
    { id: "Puzzle", icon: LucideIcons.Puzzle, category: "Creative" },
    { id: "Gift", icon: LucideIcons.Gift, category: "Creative" },
    { id: "Lightbulb", icon: LucideIcons.Lightbulb, category: "Creative" },
    { id: "Magnet", icon: LucideIcons.Magnet, category: "Creative" },
    { id: "Umbrella", icon: LucideIcons.Umbrella, category: "Creative" },
];
type LanguageSwitcherProps = {
value?: "uk" | "en" | "fr";
onChange?: (language: "uk" | "en" | "fr") => void;
};

export function LanguageSwitcher({ value = "uk", onChange }: LanguageSwitcherProps) {
return (
<label className="flex items-center gap-2 text-sm text-muted-foreground">
<span>Language</span>
<select
className="h-8 rounded-md border border-input bg-background px-2 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
value={value}
onChange={(event) => onChange?.(event.target.value as "uk" | "en" | "fr")}
>
<option value="uk">Українська</option>
<option value="en">English</option>
<option value="fr">Français</option>
</select>
</label>
);
}


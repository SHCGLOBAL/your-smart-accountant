import { Languages } from "lucide-react";
import { LANGUAGES, useI18n, type LangCode } from "@/lib/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  compact?: boolean;
  className?: string;
}

export function LanguageSwitcher({ compact, className }: Props) {
  const { lang, setLang, t } = useI18n();
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Languages className="h-4 w-4 text-muted-foreground" />
      {!compact && (
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {t("common.language")}
        </span>
      )}
      <Select value={lang} onValueChange={(v) => setLang(v as LangCode)}>
        <SelectTrigger className={compact ? "h-8 w-[130px]" : "h-9 w-[160px]"}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((l) => (
            <SelectItem key={l.code} value={l.code}>
              <span className="flex items-center gap-2">
                <span>{l.native}</span>
                <span className="text-xs text-muted-foreground">({l.label})</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

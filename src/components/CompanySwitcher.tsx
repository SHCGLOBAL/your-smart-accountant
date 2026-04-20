import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCompany } from "@/lib/company-context";

export function CompanySwitcher() {
  const { memberships, activeMembership, setActiveCompanyId } = useCompany();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2 min-w-[180px] justify-between">
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="truncate text-sm font-medium">
              {activeMembership?.companies.name ?? "No company"}
            </span>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[260px]">
        {memberships.length === 0 && (
          <div className="px-2 py-3 text-xs text-muted-foreground">No companies yet</div>
        )}
        {memberships.map((m) => (
          <DropdownMenuItem
            key={m.company_id}
            onClick={() => setActiveCompanyId(m.company_id)}
            className="flex items-center justify-between"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium">{m.companies.name}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {m.role}
              </span>
            </div>
            {activeMembership?.company_id === m.company_id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/app/companies" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>New / manage companies</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

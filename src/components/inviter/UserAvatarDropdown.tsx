/**
 * User Avatar Dropdown
 * Shows user avatar with dropdown menu for logout
 */

import { useTranslation } from "react-i18next";
import { LogOut, User, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VRCHAT_GROUP } from "@/config/vrchat.config";

interface UserAvatarDropdownProps {
  displayName?: string;
  avatarUrl?: string;
  onLogout: () => void;
}

export function UserAvatarDropdown({
  displayName,
  avatarUrl,
  onLogout,
}: UserAvatarDropdownProps) {
  const { t } = useTranslation();

  // Get initials for avatar fallback
  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="focus-visible:ring-ring flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          title={displayName}
        >
          <Avatar className="h-9 w-9 cursor-pointer border-2 border-green-500/50 transition-all hover:border-green-500">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-green-500/20 text-xs font-medium text-green-500">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="flex items-center gap-2 text-sm font-medium leading-none">
              <User className="h-3 w-3" />
              {displayName || "Unknown"}
            </p>
            <p className="text-muted-foreground flex items-center gap-2 text-xs leading-none">
              <Users className="h-3 w-3" />
              {VRCHAT_GROUP.GROUP_NAME}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onLogout}
          className="cursor-pointer text-red-500 focus:bg-red-500/10 focus:text-red-500"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t("statusLogout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

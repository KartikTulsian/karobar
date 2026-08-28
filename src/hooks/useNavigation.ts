import { ExtendedRole, navigationRegistry } from "@/config/navigation";
import { useTenantStore } from "@/store/useTenantStore";
import { useMemo } from "react";

export function useNavigation() {
    const activeTenant = useTenantStore((state) => state.activeTenant);
    const currentRole: ExtendedRole = (activeTenant?.role as ExtendedRole) || "owner";

    const visibleGroups = useMemo(() => {
        return navigationRegistry
            .map((group) => {
                const filteredItems = group.items.filter((item) => 
                    item.roles.includes(currentRole)
                );
                return { ...group, items: filteredItems };
            })
            .filter((group) => group.items.length > 0);
    }, [currentRole]);

    return {
        menuGroups: visibleGroups,
        currentRole,
        businessName: activeTenant?.businessName || "Karobar",
    };
}
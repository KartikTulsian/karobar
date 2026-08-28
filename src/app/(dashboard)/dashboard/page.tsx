"use client";

import CustomerDashboard from "@/components/dashboard/customer/CustomerDashboard";
import ManagerDashboard from "@/components/dashboard/manager/ManagerDashboard";
import OwnerDashboard from "@/components/dashboard/owner/OwnerDashboard";
import StaffDashboard from "@/components/dashboard/staff/StaffDashboard";
import { useNavigation } from "@/hooks/useNavigation";



export default function DiagnosticDashBoardPage() {
  const { currentRole } = useNavigation();

  switch (currentRole) {
    case "owner":
      return <OwnerDashboard />;
    case "manager":
      return <ManagerDashboard />;
    case "staff":
      return <StaffDashboard />;
    case "customer":
      return <CustomerDashboard />;
    default:
      return <div>Unauthorized or Role Not Found</div>;
  }

  // return (
  //   <div className="space-y-4">
  //     <div className="p-6 bg-white border border-slte-200 rounded-xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
  //       <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
  //         Welcome to {businessName}
  //       </h1>
  //       <p className="text-sm text-slate-500 mt-1">
  //         Your active access tier is configured as: <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase text-xs tracking-wider">[{currentRole}]</span>
  //       </p>
  //     </div>
  //   </div>
  // );
}

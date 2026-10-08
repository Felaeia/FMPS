import { Outlet } from "react-router-dom";
import { SideBarNavigation } from "../../../common/sideBarNavigation";

export default function Scoutline_Layout() {
  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <SideBarNavigation onAddPage={() => console.log("Add page clicked")} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

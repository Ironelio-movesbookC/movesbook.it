"use client";

import { Menu, Settings, ChevronDown } from "lucide-react";


type TopBarActionsProps = {
    onGeneralSettings: () => void;
    onHelpInfo: () => void;
};


export default function TopBarActions({
    onGeneralSettings,
    onHelpInfo
}: TopBarActionsProps) {

    return (
        <div className="flex items-center gap-2">
            <button className="text-gray-600">
                <Menu size={24} />
            </button>
            <button onClick={onHelpInfo} className="h-[28px] px-3 bg-white border border-gray-300 rounded-sm text-[13px]">
                ❓ Help Info
            </button>
            <button onClick={onGeneralSettings} className="text-gray-500">
                <Settings size={22} />
            </button>
            <button className="h-[28px] px-3 bg-[#333333] text-white rounded-sm text-[13px] flex items-center gap-1">
                Insert data
                <ChevronDown size={14} />
            </button>
            <button className="h-[28px] px-3 bg-white border border-gray-300 rounded-sm text-[13px] flex items-center gap-1">
                Archive data
                <ChevronDown size={14} />
            </button>
        </div>
    );
}
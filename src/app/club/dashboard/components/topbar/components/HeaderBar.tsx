"use client";

import {
    Bell,
    FileText,
    Heart,
    Home,
    Info,
    List,
    MessageCircle,
    PlayCircle
} from "lucide-react";


type HeaderBarProps = {
    onHelpInfo: () => void;
};


export default function HeaderBar({
    onHelpInfo
}: HeaderBarProps) {

    return (
        <div className="h-[120px] w-full bg-[#eeeeee] border-b border-gray-400 flex items-center justify-between px-4 z-10">
            <div className="flex items-center gap-3">
                <div className="w-[55px] h-[70px] flex items-center justify-center">
                    🕘
                </div>
                <div className="flex flex-col gap-2">
                    <div className="h-[40px] w-[220px] bg-[#b8bbd2] rounded px-3 flex items-center text-blue-900 text-[14px]">
                        /users/club_user_faccess
                    </div>
                    <div className="flex gap-2">
                        <div className="h-[28px] px-3 bg-green-600 text-white rounded flex items-center text-[12px]">
                            2026-12-31 Current
                        </div>
                        <div className="h-[28px] px-3 bg-white rounded border border-gray-300 text-blue-700 flex items-center text-[12px]">
                            497 msg(s)
                        </div>
                    </div>
                </div>
            </div>

            <button onClick={onHelpInfo} className="h-[78px] w-[155px] bg-[#75a9d8] text-white rounded text-[14px]">
                FAQs of the Page
            </button>

            <div className="h-[62px] px-3 bg-[#eeeeee] border border-gray-500 rounded-lg flex items-center gap-3">
                <MessageCircle size={23} />
                <Bell size={22} />
                <Info size={22} className="text-blue-500" />
                <PlayCircle size={32} className="text-red-600" />
                <List size={25} />
                <FileText size={22} />

                <div className="h-[35px] border-l border-gray-400" />
                <Heart size={25} />
                <Heart size={22} />
                <Home size={25} />
                <Info size={22} className="text-blue-500" />
                <FileText size={22} />
            </div>
        </div>
    );
}
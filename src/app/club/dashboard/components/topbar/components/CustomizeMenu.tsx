"use client";


import { ActiveSubMenuType } from "../types";


type CustomizeMenuProps = {
    isOpen: boolean;
    onOpenSubMenu: (menu: ActiveSubMenuType) => void;
};


export default function CustomizeMenu({
    isOpen,
    onOpenSubMenu
}: CustomizeMenuProps) {


    if (!isOpen) {
        return null;
    }


    return (
        <div className="absolute right-0 top-[36px] w-[240px] bg-[#d9f2fb] border border-gray-400 shadow-lg z-50 text-[13px]">
            <div className="absolute -top-[8px] right-[10px] w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-gray-400">
            </div>

            <div className="m-1 px-2 py-1 bg-[#fffbd0] border border-gray-400 font-medium">
                Customize menus & other
            </div>

            <div className="px-4 py-2 leading-[22px] text-gray-800">
                <div onClick={() => onOpenSubMenu("newPosts")} className="cursor-pointer hover:bg-white">
                    - Your list of New Posts
                </div>
                <div onClick={() => onOpenSubMenu("myPosts")} className="cursor-pointer hover:bg-white">
                    - Your list of My Posts
                </div>
                <div onClick={() => onOpenSubMenu("banner")} className="cursor-pointer hover:bg-white">
                    - Banner menu for your visitors
                </div>
            </div>
        </div>
    );
}
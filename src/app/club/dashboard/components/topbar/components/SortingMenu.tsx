"use client";

import { ActiveSubMenuType, MenuDataType } from "../types";


type SortingMenuProps = {
    isOpen: boolean;
    activeSubMenu: ActiveSubMenuType;
    menuData: MenuDataType;
    checkedItems: Record<string, boolean[]>;
    onCheckboxChange: (index: number) => void;
    onSwapItem: (direction: number, index: number) => void;
    onSave: () => void;
    onCancel: () => void;
    onReset: () => void;
    onClose: () => void;
};


export default function SortingMenu({
    isOpen,
    activeSubMenu,
    menuData,
    checkedItems,
    onCheckboxChange,
    onSwapItem,
    onSave,
    onCancel,
    onReset,
    onClose
}: SortingMenuProps) {


    if (!isOpen) {
        return null;
    }


    const items = menuData[activeSubMenu].items;
    const checked = checkedItems[activeSubMenu] || [];

    return (
        <div className="absolute right-[250px] top-[55px] w-[270px] bg-white shadow-xl z-[60]">
            <div className="h-[30px] mx-1 mt-1 bg-[#fff200] border border-gray-700 px-2 flex items-center justify-between text-[13px] font-bold">
                <span>
                    {menuData[activeSubMenu].title}
                </span>
                <button onClick={onClose} className="w-[16px] h-[16px] bg-black text-white rounded-full flex items-center justify-center text-[11px]">
                    ×
                </button>
            </div>

            <div className="p-2 max-h-[200px] overflow-y-auto">
                {items.map((item, index) => (
                    <div key={item.name} className="h-[38px] flex items-center gap-2 px-1 border-b border-gray-200 cursor-pointer group transition-colors duration-150 hover:bg-[#ffc]">
                        <input
                            type="checkbox"
                            checked={checked[index] ?? true}
                            onChange={() => onCheckboxChange(index)}
                            className="w-[14px] h-[14px] cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                        />
                        {activeSubMenu === "myPosts" && (
                            <div className={`w-[12px] h-[12px] rounded-full ${checked[index] ? "bg-green-500" : "bg-red-500"}`}>
                            </div>
                        )}
                        <div className="w-[25px] text-center">
                            {item.icon}
                        </div>
                        <span className="flex-1 text-gray-700 text-[14px]">
                            {item.name}
                        </span>
                        <div className="flex flex-col items-center justify-center w-[18px] opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSwapItem(-1, index);
                                }}
                                title="Move Up"
                                className="h-[12px] text-yellow-500 text-[14px] leading-[10px] font-bold hover:text-orange-600"
                            >
                                ▲
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSwapItem(1, index);
                                }}
                                title="Move Down"
                                className="h-[12px] text-yellow-500 text-[14px] leading-[10px] font-bold hover:text-orange-600"
                            >
                                ▼
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex gap-1 p-2">
                <button onClick={onSave} className="h-[32px] px-4 bg-gradient-to-b from-gray-600 to-gray-900 text-white rounded text-[13px] hover:from-gray-700 hover:to-gray-950">
                    Save
                </button>
                <button onClick={onCancel} className="h-[32px] px-4 bg-gradient-to-b from-gray-600 to-gray-900 text-white rounded text-[13px] hover:from-gray-700 hover:to-gray-950">
                    Cancel
                </button>
                <button onClick={onReset} className="h-[32px] px-4 bg-gradient-to-b from-gray-600 to-gray-900 text-white rounded text-[13px] hover:from-gray-700 to-gray-950">
                    Reset Default
                </button>
            </div>
        </div>
    );
}
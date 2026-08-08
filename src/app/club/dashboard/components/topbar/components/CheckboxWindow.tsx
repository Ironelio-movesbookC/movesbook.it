"use client";

import { ActiveSubMenuType, MenuDataType } from "../types";


type CheckboxWindowProps = {
    isOpen: boolean;
    itemIndex: number;
    activeSubMenu: ActiveSubMenuType;
    menuData: MenuDataType;
    checkedItems: Record<string, boolean[]>;
    onToggle: () => void;
    onClose: () => void;
    onToggleClose: () => void;
};


export default function CheckboxWindow({
    isOpen,
    itemIndex,
    activeSubMenu,
    menuData,
    checkedItems,
    onToggle,
    onClose,
    onToggleClose
}: CheckboxWindowProps) {


    if (!isOpen) {
        return null;
    }


    const isSelected =
        checkedItems[activeSubMenu]?.[itemIndex] ?? true;


    const itemName =
        menuData[activeSubMenu]?.items?.[itemIndex]?.name ?? "";



    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
            <div className="w-[320px] bg-white rounded-lg shadow-2xl">
                <div className="h-[40px] bg-gradient-to-r from-gray-600 to-gray-800 text-white px-4 flex items-center justify-between rounded-t-lg">
                    <div className="flex items-center gap-2">
                        {activeSubMenu === "myPosts" && (
                            <div className={`w-[16px] h-[16px] rounded-full ${isSelected ? "bg-green-500" : "bg-red-500"}`}>
                            </div>
                        )}
                        <span className="text-[15px] font-bold">
                            CHECKBOX WINDOW
                        </span>
                    </div>
                    <button onClick={onClose} className="w-[20px] h-[20px] bg-black text-white rounded-full flex items-center justify-center text-[12px] hover:bg-gray-800">
                        ×
                    </button>
                </div>
                <div className="p-4">
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex flex-col items-center gap-3">
                            <span className="text-gray-600 text-sm">
                                {itemName}
                            </span>
                            <button onClick={onToggle} className={`w-[80px] h-[80px] rounded-full flex items-center justify-center transition-all duration-300 ${isSelected ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}`}>
                                <span className="text-white text-3xl">
                                    {isSelected ? "✓" : "✗"}
                                </span>
                            </button>
                            <span className="text-gray-600 text-sm font-medium">
                                {isSelected
                                    ? "Selected (Green)"
                                    : "Unselected (Red)"
                                }
                            </span>
                        </div>

                        <div className="text-center text-gray-500 text-xs px-4">
                            <p>
                                Click the large circle to toggle selection.
                            </p>
                            <p className="mt-1">
                                When deselected (red), the item will be placed at the bottom when you save and reload the settings.
                            </p>
                        </div>

                        <div className="flex gap-3 mt-2">
                            <button onClick={onClose} className="h-[32px] px-5 bg-gray-200 text-gray-700 rounded text-[13px] hover:bg-gray-300">
                                Close
                            </button>
                            <button onClick={onToggleClose} className="h-[32px] px-5 bg-blue-500 text-white rounded text-[13px] hover:bg-blue-600">
                                Toggle & Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
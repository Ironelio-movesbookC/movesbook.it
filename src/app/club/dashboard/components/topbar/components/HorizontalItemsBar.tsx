"use client";

import { MutableRefObject } from "react";
import { MenuItemType } from "../types";


type HorizontalItemsBarProps = {
    visible: boolean;
    items: MenuItemType[];
    onScroll: (direction: "left" | "right") => void;
    containerRef: MutableRefObject<HTMLDivElement | null>;
};


export default function HorizontalItemsBar({
    visible,
    items,
    onScroll,
    containerRef
}: HorizontalItemsBarProps) {


    if (!visible) {
        return null;
    }


    return (
        <div className="relative w-full bg-white border-b border-gray-300 shadow-md">
            <div className="flex items-center py-2 px-3">
                <button onClick={() => onScroll("left")} className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200 mr-2">
                    ←
                </button>

                <div ref={containerRef} className="flex-1 overflow-x-auto whitespace-nowrap hide-scrollbar-webkit">
                    <div className="inline-flex gap-3">
                        {items.map((item, index) => (
                            <div key={index} className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors">
                                <span className="text-lg">
                                    {item.icon}
                                </span>
                                <span className="text-sm text-gray-700 font-medium">
                                    {item.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <button onClick={() => onScroll("right")} className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200 ml-2">
                    →
                </button>
            </div>
        </div>
    );
}
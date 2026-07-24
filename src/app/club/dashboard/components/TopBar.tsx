"use client";

import { useState, useEffect, useRef } from "react";
import { Menu, Settings, ChevronDown } from "lucide-react";

type MenuItemType = {
    name: string;
    icon: string;
};

type MenuSectionType = {
    title: string;
    items: MenuItemType[];
};

type MenuDataType = {
    newPosts: MenuSectionType;
    myPosts: MenuSectionType;
    banner: MenuSectionType;
};

type ActiveSubMenuType = "newPosts" | "myPosts" | "banner";

// Define initial state for each menu type
const initialMenuData: MenuDataType = {
    newPosts: {
        title: "List Sorting for post input list",
        items: [
            { name: "Thoughts", icon: "💬" },
            { name: "Weight measure", icon: "⚖" },
            { name: "Body measure", icon: "📏" },
            { name: "Appointments", icon: "✔" },
            { name: "Anniversary", icon: "▣" },
            { name: "Things to do", icon: "📄" },
            { name: "Diet", icon: "🍎" },
            { name: "Feeling status", icon: "🙂" },
            { name: "Photos", icon: "📷" },
            { name: "Videos", icon: "📡" },
            { name: "Healthy injury", icon: "➕" },
            { name: "Workouts", icon: "⏱️" },
            { name: "Events", icon: "📅" },
            { name: "Music", icon: "🎵" },
            { name: "Locations", icon: "🎯" },
            { name: "Blogs", icon: "📋" },
            { name: "Race", icon: "🔍" },
            { name: "Things to buy", icon: "🛒" },
            { name: "Travels", icon: "✈️" },
            { name: "Best Results", icon: "🎯" },
            { name: "Record", icon: "🏅" },
            { name: "Sport events", icon: "🏰" },
        ]
    },
    myPosts: {
        title: "Achieve posts list settings",
        items: [
            { name: "Thoughts", icon: "📝" },
            { name: "Music", icon: "🎵" },
            { name: "Locations", icon: "🎯" },
            { name: "Travels", icon: "✈️" },
            { name: "Photos", icon: "📷" },
            { name: "Videos", icon: "📡" }
        ]
    },
    banner: {
        title: "Banner menu Settings for visitors",
        items: [
            { name: "My group", icon: "🏠" },
            { name: "My lists", icon: "👤" },
            { name: "Anniversary", icon: "▣" },
            { name: "Appointment", icon: "✔️" },
            { name: "Blog", icon: "📋" },
            { name: "Body measure", icon: "📐" },
            { name: "Diet", icon: "🍎" },
            { name: "Favourite friends", icon: "⭐" },
            { name: "Feeling status", icon: "🙂" },
            { name: "Followed friends", icon: "🔗" },
            { name: "Friends", icon: "☆" },
            { name: "Healthy injury", icon: "⊞" },
            { name: "Locations", icon: "🎯" },
            { name: "Music", icon: "🎵" },
            { name: "My clubs", icon: "💳" },
            { name: "My coaches", icon: "👤" },
            { name: "My teams", icon: "👥" },
            { name: "Pages that I like ", icon: "♡" },
            { name: "Photos", icon: "📷" },
            { name: "Race", icon: "🎯" },
            { name: "Record", icon: "🏅" },
            { name: "Share friends", icon: "🔗" },
            { name: "Sport events", icon: "🏰" },
            { name: "Statistics", icon: "📊" },
            { name: "Things to buy", icon: "🛒" },
            { name: "Things to do", icon: "📄" },
            { name: "Thoughts", icon: "💬" },
            { name: "Videos", icon: "📡" },
            { name: "Weight measure", icon: "⚖" },
            { name: "Workouts", icon: "⏱️" },

        ]
    }
};

// Storage keys for localStorage
const STORAGE_KEYS = {
    NEW_POSTS: 'topbar_new_posts_menu',
    MY_POSTS: 'topbar_my_posts_menu',
    BANNER: 'topbar_banner_menu',
    ACTIVE_SUB_MENU: 'topbar_active_sub_menu',
    CHECKED_NEW_POSTS: 'topbar_checked_new_posts',
    CHECKED_MY_POSTS: 'topbar_checked_my_posts',
    CHECKED_BANNER: 'topbar_checked_banner'
};

type ToastType = {
    id: number;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
};

export default function TopBar() {
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [showSortingMenu, setShowSortingMenu] = useState(false);
    const [activeSubMenu, setActiveSubMenu] = useState<ActiveSubMenuType>("newPosts");
    const [menuData, setMenuData] = useState<MenuDataType>(initialMenuData);
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean[]>>({
        newPosts: Array(initialMenuData.newPosts.items.length).fill(true),
        myPosts: Array(initialMenuData.myPosts.items.length).fill(true),
        banner: Array(initialMenuData.banner.items.length).fill(true),
    });
    const [savedCheckedItems, setSavedCheckedItems] = useState<Record<string, boolean[]>>({
        newPosts: Array(initialMenuData.newPosts.items.length).fill(true),
        myPosts: Array(initialMenuData.myPosts.items.length).fill(true),
        banner: Array(initialMenuData.banner.items.length).fill(true),
    });
    const [toasts, setToasts] = useState<ToastType[]>([]);
    const toastIdCounter = useRef(0);
    const menuSystemRef = useRef<HTMLDivElement>(null);
    const [showItems, setShowItems] = useState<false | 'newPosts' | 'myPosts'>(false);
    const itemsContainerRef = useRef<HTMLDivElement>(null);
    const [checkboxWindowState, setCheckboxWindowState] = useState<{ isOpen: boolean, itemIndex: number }>({ isOpen: false, itemIndex: -1 });

    // Load saved data from localStorage on component mount
    useEffect(() => {
        const loadSavedData = () => {
            try {
                // Load menu data
                const savedNewPosts = localStorage.getItem(STORAGE_KEYS.NEW_POSTS);
                const savedMyPosts = localStorage.getItem(STORAGE_KEYS.MY_POSTS);
                const savedBanner = localStorage.getItem(STORAGE_KEYS.BANNER);
                const savedActiveSubMenu = localStorage.getItem(STORAGE_KEYS.ACTIVE_SUB_MENU);

                // Load checked items
                const savedCheckedNewPosts = localStorage.getItem(STORAGE_KEYS.CHECKED_NEW_POSTS);
                const savedCheckedMyPosts = localStorage.getItem(STORAGE_KEYS.CHECKED_MY_POSTS);
                const savedCheckedBanner = localStorage.getItem(STORAGE_KEYS.CHECKED_BANNER);

                const updatedMenuData = { ...initialMenuData };
                const updatedCheckedItems = { ...checkedItems };

                if (savedNewPosts) {
                    updatedMenuData.newPosts.items = JSON.parse(savedNewPosts);
                }
                if (savedMyPosts) {
                    updatedMenuData.myPosts.items = JSON.parse(savedMyPosts);
                }
                if (savedBanner) {
                    updatedMenuData.banner.items = JSON.parse(savedBanner);
                }

                // Load checked items
                // Initialize checked items based on loaded menu data (all true by default)
                updatedCheckedItems.newPosts = Array(updatedMenuData.newPosts.items.length).fill(true);
                updatedCheckedItems.myPosts = Array(updatedMenuData.myPosts.items.length).fill(true);
                updatedCheckedItems.banner = Array(updatedMenuData.banner.items.length).fill(true);

                // Override with saved checked items if they exist and match length
                if (savedCheckedNewPosts) {
                    const parsed = JSON.parse(savedCheckedNewPosts);
                    if (parsed.length === updatedMenuData.newPosts.items.length) {
                        updatedCheckedItems.newPosts = parsed;
                    }
                }
                if (savedCheckedMyPosts) {
                    const parsed = JSON.parse(savedCheckedMyPosts);
                    if (parsed.length === updatedMenuData.myPosts.items.length) {
                        updatedCheckedItems.myPosts = parsed;
                    }
                }
                if (savedCheckedBanner) {
                    const parsed = JSON.parse(savedCheckedBanner);
                    if (parsed.length === updatedMenuData.banner.items.length) {
                        updatedCheckedItems.banner = parsed;
                    }
                }

                // For My Posts: sort items so unselected (red) items appear at bottom when loading saved settings
                if (savedMyPosts && savedCheckedMyPosts) {
                    const loadedMyPostsItems = JSON.parse(savedMyPosts);
                    const loadedMyPostsChecked = JSON.parse(savedCheckedMyPosts);

                    if (loadedMyPostsItems.length === loadedMyPostsChecked.length && loadedMyPostsItems.length > 0) {
                        // Create arrays of selected and unselected items
                        const selectedItems: MenuItemType[] = [];
                        const selectedChecked: boolean[] = [];
                        const unselectedItems: MenuItemType[] = [];
                        const unselectedChecked: boolean[] = [];

                        // Separate items based on checked state
                        loadedMyPostsItems.forEach((item: MenuItemType, index: number) => {
                            if (loadedMyPostsChecked[index]) {
                                selectedItems.push(item);
                                selectedChecked.push(true);
                            } else {
                                unselectedItems.push(item);
                                unselectedChecked.push(false);
                            }
                        });

                        // Combine: selected items first, then unselected items
                        updatedMenuData.myPosts.items = [...selectedItems, ...unselectedItems];
                        updatedCheckedItems.myPosts = [...selectedChecked, ...unselectedChecked];
                    }
                }

                setMenuData(updatedMenuData);
                setCheckedItems(updatedCheckedItems);
                setSavedCheckedItems(JSON.parse(JSON.stringify(updatedCheckedItems)));
                
                // Dispatch initial banner update event after loading saved data
                if (typeof window !== 'undefined') {
                    const bannerItems = updatedMenuData.banner.items;
                    const bannerChecked = updatedCheckedItems.banner;
                    
                    if (bannerItems.length === bannerChecked.length) {
                        console.log('Dispatching initial banner update after load:', {
                            itemCount: bannerItems.length,
                            checkedCount: bannerChecked.filter(Boolean).length
                        });
                        const bannerUpdateEvent = new CustomEvent('bannerMenuUpdated', {
                            detail: {
                                items: bannerItems,
                                checked: bannerChecked
                            }
                        });
                        window.dispatchEvent(bannerUpdateEvent);
                    }
                }
                if (savedActiveSubMenu) {
                    // Validate that the saved value is a valid ActiveSubMenuType
                    if (savedActiveSubMenu === "newPosts" || savedActiveSubMenu === "myPosts" || savedActiveSubMenu === "banner") {
                        setActiveSubMenu(savedActiveSubMenu);
                    }
                }
            } catch (error) {
                console.error("Error loading saved data:", error);
            }
        };

        loadSavedData();
    }, []);

    // Close menus and new posts items when clicking outside menu system
    useEffect(() => {
        // Do not close menus by clicking outside.
        // Menus are closed only by settings icon or explicit close buttons.
        return;
    }, []);

    // Add CSS to hide scrollbar for WebKit browsers
    useEffect(() => {
        // Check if style already exists
        if (!document.querySelector('style[data-scrollbar-hide]')) {
            const style = document.createElement('style');
            style.setAttribute('data-scrollbar-hide', 'true');
            style.textContent = `
                .hide-scrollbar-webkit::-webkit-scrollbar {
                    display: none;
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

    const showToast = (message: string, type: ToastType['type'] = 'success') => {
        const id = ++toastIdCounter.current;
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto remove toast after 3 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, 3000);
    };

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const scrollItems = (direction: 'left' | 'right') => {
        if (!itemsContainerRef.current) return;

        const container = itemsContainerRef.current;
        const scrollAmount = 200; // pixels to scroll

        // Check bounds before scrolling
        if (direction === 'left') {
            // Can scroll left if scrollLeft > 0
            if (container.scrollLeft > 0) {
                container.scrollLeft = Math.max(0, container.scrollLeft - scrollAmount);
            }
        } else {
            // Can scroll right if not at the end
            const maxScroll = container.scrollWidth - container.clientWidth;
            if (container.scrollLeft < maxScroll) {
                container.scrollLeft = Math.min(maxScroll, container.scrollLeft + scrollAmount);
            }
        }
    };

    const swapItem = (direction: number, index: number) => {
        // Always use the provided index (from arrow click)
        const itemToMove = index;

        const target = itemToMove + direction;
        const currentItems = [...menuData[activeSubMenu].items];
        const currentChecked = checkedItems[activeSubMenu] ? [...checkedItems[activeSubMenu]] : [];

        if (target < 0 || target >= currentItems.length) {
            return;
        }

        // Safety check: ensure checked array matches items array
        if (currentChecked.length !== currentItems.length) {
            return;
        }

        // Swap items
        const tempItem = currentItems[itemToMove];
        currentItems[itemToMove] = currentItems[target];
        currentItems[target] = tempItem;

        // Swap checked states
        const tempChecked = currentChecked[itemToMove];
        currentChecked[itemToMove] = currentChecked[target];
        currentChecked[target] = tempChecked;

        // Update menu data state
        setMenuData(prev => ({
            ...prev,
            [activeSubMenu]: {
                ...prev[activeSubMenu],
                items: currentItems
            }
        } as MenuDataType));

        // Update checked items state
        setCheckedItems(prev => ({
            ...prev,
            [activeSubMenu]: currentChecked
        }));

        // No visual selection - items only show active state on hover
        // The moved item does not get permanently selected
    };

    const discardUnsavedChanges = () => {
        setCheckedItems(
            JSON.parse(JSON.stringify(savedCheckedItems))
        );
    };

    const handleMainMenuItemClick = (menuType: ActiveSubMenuType) => {

        // discard checkbox changes that were not saved
        discardUnsavedChanges();

        if (menuType === "newPosts" || menuType === "myPosts") {
            setShowItems(prev => prev === menuType ? false : menuType);
            setShowSortingMenu(false);
            setShowSettingsMenu(false);
        }

        setActiveSubMenu(menuType);

        localStorage.setItem(
            STORAGE_KEYS.ACTIVE_SUB_MENU,
            menuType
        );
    };

    const openSubMenu = (menu: ActiveSubMenuType) => {

        // discard changes before opening another settings menu
        discardUnsavedChanges();

        setActiveSubMenu(menu);
        setShowSortingMenu(true);

        localStorage.setItem(
            STORAGE_KEYS.ACTIVE_SUB_MENU,
            menu
        );
    };

    const toggleSettings = () => {

        if (showSettingsMenu || showSortingMenu) {

            discardUnsavedChanges();

            setShowSettingsMenu(false);
            setShowSortingMenu(false);

        } else {
            setShowSettingsMenu(true);
        }
    };

    const handleSave = () => {
        try {
            // For My Posts: create reordered version for storage (selected first, then unselected)
            // For other menus: save current order
            const createMyPostsReorderedForStorage = (
                items: MenuItemType[],
                checked: boolean[]
            ) => {
                const selectedItems: MenuItemType[] = [];
                const selectedChecked: boolean[] = [];
                const unselectedItems: MenuItemType[] = [];
                const unselectedChecked: boolean[] = [];

                items.forEach((item, index) => {
                    if (checked[index]) {
                        selectedItems.push(item);
                        selectedChecked.push(true);
                    } else {
                        unselectedItems.push(item);
                        unselectedChecked.push(false);
                    }
                });

                return {
                    items: [...selectedItems, ...unselectedItems],
                    checked: [...selectedChecked, ...unselectedChecked]
                };
            };

            // For My Posts: save reordered version (selected items first)
            const myPostsStorage = createMyPostsReorderedForStorage(
                menuData.myPosts.items,
                checkedItems.myPosts
            );

            // For New Posts and Banner: save current order (items stay where they are)
            localStorage.setItem(
                STORAGE_KEYS.NEW_POSTS,
                JSON.stringify(menuData.newPosts.items)
            );

            localStorage.setItem(
                STORAGE_KEYS.MY_POSTS,
                JSON.stringify(myPostsStorage.items)
            );

            localStorage.setItem(
                STORAGE_KEYS.BANNER,
                JSON.stringify(menuData.banner.items)
            );

            localStorage.setItem(
                STORAGE_KEYS.CHECKED_NEW_POSTS,
                JSON.stringify(checkedItems.newPosts)
            );

            localStorage.setItem(
                STORAGE_KEYS.CHECKED_MY_POSTS,
                JSON.stringify(myPostsStorage.checked)
            );

            localStorage.setItem(
                STORAGE_KEYS.CHECKED_BANNER,
                JSON.stringify(checkedItems.banner)
            );

            // Dispatch custom event to notify DarkSidebar about banner updates
            if (typeof window !== 'undefined') {
                // Ensure arrays are synchronized before dispatching
                const bannerItems = menuData.banner.items;
                const bannerChecked = checkedItems.banner;
                
                // Safety check: ensure arrays have same length
                if (bannerItems.length === bannerChecked.length) {
                    console.log('Dispatching banner update event:', {
                        itemCount: bannerItems.length,
                        checkedCount: bannerChecked.filter(Boolean).length
                    });
                    const bannerUpdateEvent = new CustomEvent('bannerMenuUpdated', {
                        detail: {
                            items: bannerItems,
                            checked: bannerChecked
                        }
                    });
                    window.dispatchEvent(bannerUpdateEvent);
                } else {
                    console.error('Banner items and checked arrays have different lengths:', {
                        itemsLength: bannerItems.length,
                        checkedLength: bannerChecked.length,
                        items: bannerItems.map(i => i.name),
                        checked: bannerChecked
                    });
                }
            }

            showToast(
                'Settings saved successfully!',
                'success'
            );
            setSavedCheckedItems({
                newPosts: JSON.parse(JSON.stringify(checkedItems.newPosts)),
                myPosts: JSON.parse(JSON.stringify(myPostsStorage.checked)),
                banner: JSON.parse(JSON.stringify(checkedItems.banner)),
            });
        } catch (error) {
            console.error(
                "Error saving data:",
                error
            );
        }
    };

    const handleCancel = () => {

        // restore previous saved checkbox state
        setCheckedItems(
            JSON.parse(JSON.stringify(savedCheckedItems))
        );

        setShowSortingMenu(false);
        setShowSettingsMenu(false);
    };

    const handleCheckboxChange = (index: number) => {
        setCheckedItems(prev => {
            const currentChecked = prev[activeSubMenu];
            // Safety check: ensure the array exists and index is valid
            if (!currentChecked || currentChecked.length === 0 || index < 0 || index >= currentChecked.length) {
                return prev;
            }
            return {
                ...prev,
                [activeSubMenu]: currentChecked.map((checked, i) =>
                    i === index ? !checked : checked
                )
            };
        });
    };

    const handleReset = () => {
        // Reset to initial state
        setMenuData(initialMenuData);
        setCheckedItems({
            newPosts: Array(initialMenuData.newPosts.items.length).fill(true),
            myPosts: Array(initialMenuData.myPosts.items.length).fill(true),
            banner: Array(initialMenuData.banner.items.length).fill(true),
        });

        // Clear saved data from localStorage
        localStorage.removeItem(STORAGE_KEYS.NEW_POSTS);
        localStorage.removeItem(STORAGE_KEYS.MY_POSTS);
        localStorage.removeItem(STORAGE_KEYS.BANNER);
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_SUB_MENU);
        localStorage.removeItem(STORAGE_KEYS.CHECKED_NEW_POSTS);
        localStorage.removeItem(STORAGE_KEYS.CHECKED_MY_POSTS);
        localStorage.removeItem(STORAGE_KEYS.CHECKED_BANNER);

        // Show toast notification
        showToast('Settings reset to default!', 'info');

        // Dispatch custom event to notify DarkSidebar about banner reset
        if (typeof window !== 'undefined') {
            const bannerUpdateEvent = new CustomEvent('bannerMenuUpdated', {
                detail: {
                    items: initialMenuData.banner.items,
                    checked: Array(initialMenuData.banner.items.length).fill(true)
                }
            });
            window.dispatchEvent(bannerUpdateEvent);
        }

        // Force a refresh to show initial data - already done by state updates above
        // The state updates will trigger re-render automatically

        // NO alert displayed, menu stays open
        // setShowSortingMenu(false); // REMOVED - don't close menu
        // setShowSettingsMenu(false); // REMOVED - don't close menu
    };

    const getCurrentMenuItems = () => {
        const items = menuData[activeSubMenu].items;
        const checked = checkedItems[activeSubMenu] || [];

        return items.map((item, index) => ({
            item,
            index,
            selected: checked[index] ?? true,
        }));
    };

    return (
        <div className="relative h-[44px] w-full bg-[#eeeeee] border-b border-gray-400 flex items-center justify-between px-3">
            <div className="flex items-center gap-2">
                <button className="text-gray-600">
                    <Menu size={24} />
                </button>
                <button className="h-[28px] px-3 bg-white border border-gray-300 rounded-sm text-[13px]">
                    ❓ Help Info
                </button>
                <button className="text-gray-500">
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

            <div className="flex items-center gap-2 relative" ref={menuSystemRef}>
                <button
                    onClick={() => handleMainMenuItemClick("newPosts")}
                    className="h-[28px] px-4 bg-black text-white rounded-sm text-[13px] hover:bg-gray-800"
                >
                    New Post
                </button>
                <button
                    onClick={() => handleMainMenuItemClick("myPosts")}
                    className="h-[28px] px-4 bg-white border border-gray-300 rounded-sm text-[13px] hover:bg-gray-50"
                >
                    My Posts
                </button>

                <div className="relative">
                    <button onClick={toggleSettings} className="h-[28px] w-[28px] bg-white border border-gray-300 rounded-full flex items-center justify-center">
                        <Settings size={16} className="text-gray-500" />
                    </button>
                    {showSettingsMenu && (
                        <div className="absolute right-0 top-[36px] w-[240px] bg-[#d9f2fb] border border-gray-400 shadow-lg z-50 text-[13px]">
                            <div className="absolute -top-[8px] right-[10px] w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-gray-400"></div>
                            <div className="m-1 px-2 py-1 bg-[#fffbd0] border border-gray-400 font-medium">
                                Customize menus & other
                            </div>
                            <div className="px-4 py-2 leading-[22px] text-gray-800">
                                <div onClick={() => openSubMenu("newPosts")} className="cursor-pointer hover:bg-white">
                                    - Your list of New Posts
                                </div>
                                <div onClick={() => openSubMenu("myPosts")} className="cursor-pointer hover:bg-white">
                                    - Your list of My Posts
                                </div>
                                <div onClick={() => openSubMenu("banner")} className="cursor-pointer hover:bg-white">
                                    - Banner menu for your visitors
                                </div>
                            </div>
                        </div>
                    )}

                    {showSortingMenu && (
                        <div className="absolute right-[250px] top-[55px] w-[270px] bg-white shadow-xl z-[60]">
                            <div className="h-[30px] mx-1 mt-1 bg-[#fff200] border border-gray-700 px-2 flex items-center justify-between text-[13px] font-bold">
                                <span>
                                    {menuData[activeSubMenu].title}
                                </span>
                                <button onClick={() => {
                                    setCheckedItems(
                                        JSON.parse(JSON.stringify(savedCheckedItems))
                                    );

                                    setShowSortingMenu(false);
                                    setShowSettingsMenu(false);
                                }} className="w-[16px] h-[16px] bg-black text-white rounded-full flex items-center justify-center text-[11px]">
                                    ×
                                </button>
                            </div>

                            <div className="p-2 max-h-[200px] overflow-y-auto">
                                {getCurrentMenuItems().map(({ item, index, selected }) => (
                                    <div
                                        key={item.name}
                                        className="h-[38px] flex items-center gap-2 px-1 border-b border-gray-200 cursor-pointer group transition-colors duration-150 hover:bg-[#ffc]"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={() => handleCheckboxChange(index)}
                                            className="w-[14px] h-[14px] cursor-pointer"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        {activeSubMenu === "myPosts" && (
                                            <div
                                                className={`w-[12px] h-[12px] rounded-full ${selected ? "bg-green-500" : "bg-red-500"
                                                    }`}
                                            />
                                        )}
                                        <div className="w-[25px] text-center">
                                            {item.icon}
                                        </div>
                                        <span className="flex-1 text-gray-700 text-[14px]">
                                            {item.name}
                                        </span>
                                        <div className="flex flex-col items-center justify-center w-[18px] opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => {
                                                e.stopPropagation();
                                                // Move the item without selecting it visually
                                                swapItem(-1, index);
                                            }} title="Move Up" className="h-[12px] text-yellow-500 text-[14px] leading-[10px] font-bold hover:text-orange-600">
                                                ▲
                                            </button>
                                            <button onClick={(e) => {
                                                e.stopPropagation();
                                                // Move the item without selecting it visually
                                                swapItem(1, index);
                                            }} title="Move Down" className="h-[12px] text-yellow-500 text-[14px] leading-[10px] font-bold hover:text-orange-600">
                                                ▼
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-1 p-2">
                                <button
                                    onClick={handleSave}
                                    className="h-[32px] px-4 bg-gradient-to-b from-gray-600 to-gray-900 text-white rounded text-[13px] hover:from-gray-700 hover:to-gray-950"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="h-[32px] px-4 bg-gradient-to-b from-gray-600 to-gray-900 text-white rounded text-[13px] hover:from-gray-700 hover:to-gray-950"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReset}
                                    className="h-[32px] px-4 bg-gradient-to-b from-gray-600 to-gray-900 text-white rounded text-[13px] hover:from-gray-700 hover:to-gray-950"
                                >
                                    Reset Default
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <button className="text-gray-600">
                    <Menu size={24} />
                </button>
            </div>

            {/* Checkbox Window Modal */}
            {checkboxWindowState.isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
                    <div className="w-[320px] bg-white rounded-lg shadow-2xl">
                        {/* Header with status circle */}
                        <div className="h-[40px] bg-gradient-to-r from-gray-600 to-gray-800 text-white px-4 flex items-center justify-between rounded-t-lg">
                            <div className="flex items-center gap-2">
                                {/* Status circle indicator */}
                                {activeSubMenu === "myPosts" && (
                                    <div className={`w-[16px] h-[16px] rounded-full ${checkedItems[activeSubMenu]?.[checkboxWindowState.itemIndex]
                                        ? "bg-green-500"
                                        : "bg-red-500"
                                        }`} />
                                )}
                                <span className="text-[15px] font-bold">CHECKBOX WINDOW</span>
                            </div>
                            <button
                                onClick={() => setCheckboxWindowState({ isOpen: false, itemIndex: -1 })}
                                className="w-[20px] h-[20px] bg-black text-white rounded-full flex items-center justify-center text-[12px] hover:bg-gray-800"
                            >
                                ×
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            <div className="flex flex-col items-center gap-4">
                                {/* Large toggle circle */}
                                <div className="flex flex-col items-center gap-3">
                                    <span className="text-gray-600 text-sm">
                                        {checkboxWindowState.itemIndex >= 0 &&
                                            menuData[activeSubMenu]?.items?.[checkboxWindowState.itemIndex]?.name}
                                    </span>
                                    <button
                                        onClick={() => {
                                            if (checkboxWindowState.itemIndex >= 0) {
                                                handleCheckboxChange(checkboxWindowState.itemIndex);
                                            }
                                        }}
                                        className={`w-[80px] h-[80px] rounded-full flex items-center justify-center transition-all duration-300 ${checkboxWindowState.itemIndex >= 0 &&
                                            checkedItems[activeSubMenu]?.[checkboxWindowState.itemIndex]
                                            ? "bg-green-500 hover:bg-green-600"
                                            : "bg-red-500 hover:bg-red-600"
                                            }`}
                                    >
                                        <span className="text-white text-3xl">
                                            {checkboxWindowState.itemIndex >= 0 &&
                                                checkedItems[activeSubMenu]?.[checkboxWindowState.itemIndex]
                                                ? "✓"
                                                : "✗"}
                                        </span>
                                    </button>
                                    <span className="text-gray-600 text-sm font-medium">
                                        {checkboxWindowState.itemIndex >= 0 &&
                                            checkedItems[activeSubMenu]?.[checkboxWindowState.itemIndex]
                                            ? "Selected (Green)"
                                            : "Unselected (Red)"}
                                    </span>
                                </div>

                                {/* Description */}
                                <div className="text-center text-gray-500 text-xs px-4">
                                    <p>Click the large circle to toggle selection.</p>
                                    <p className="mt-1">
                                        When deselected (red), the item will be placed at the bottom
                                        when you save and reload the settings.
                                    </p>
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-3 mt-2">
                                    <button
                                        onClick={() => setCheckboxWindowState({ isOpen: false, itemIndex: -1 })}
                                        className="h-[32px] px-5 bg-gray-200 text-gray-700 rounded text-[13px] hover:bg-gray-300"
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (checkboxWindowState.itemIndex >= 0) {
                                                handleCheckboxChange(checkboxWindowState.itemIndex);
                                            }
                                            setCheckboxWindowState({ isOpen: false, itemIndex: -1 });
                                        }}
                                        className="h-[32px] px-5 bg-blue-500 text-white rounded text-[13px] hover:bg-blue-600"
                                    >
                                        Toggle & Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Horizontal Scrollable Items */}
            {showItems && (
                <div className="absolute left-0 top-full w-full bg-white border-b border-gray-300 shadow-md z-40">
                    <div className="flex items-center py-2 px-3">
                        {/* Left arrow button */}
                        <button
                            onClick={() => scrollItems('left')}
                            className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200 mr-2"
                        >
                            ←
                        </button>

                        {/* Scrollable items container (hidden scrollbar) */}
                        <div
                            ref={itemsContainerRef}
                            className="flex-1 overflow-x-auto whitespace-nowrap hide-scrollbar-webkit"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            <div className="inline-flex gap-3">
                                {showItems === 'newPosts' ? (
                                    // New Posts items
                                    menuData.newPosts.items.map((item, index) => (
                                        <div
                                            key={index}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                                        >
                                            <span className="text-lg">{item.icon}</span>
                                            <span className="text-sm text-gray-700 font-medium">{item.name}</span>
                                        </div>
                                    ))
                                ) : (
                                    // My Posts items
                                    menuData.myPosts.items.map((item, index) => (
                                        <div
                                            key={index}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                                        >
                                            <span className="text-lg">{item.icon}</span>
                                            <span className="text-sm text-gray-700 font-medium">{item.name}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Right arrow button */}
                        <button
                            onClick={() => scrollItems('right')}
                            className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200 ml-2"
                        >
                            →
                        </button>
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`min-w-[300px] max-w-sm rounded-lg border p-4 shadow-lg transform transition-all duration-300 ease-in-out ${toast.type === 'success'
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : toast.type === 'info'
                                ? 'bg-blue-50 border-blue-200 text-blue-800'
                                : toast.type === 'warning'
                                    ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                                    : 'bg-red-50 border-red-200 text-red-800'
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`flex-shrink-0 mt-0.5 ${toast.type === 'success'
                                ? 'text-green-500'
                                : toast.type === 'info'
                                    ? 'text-blue-500'
                                    : toast.type === 'warning'
                                        ? 'text-yellow-500'
                                        : 'text-red-500'
                                }`}>
                                {toast.type === 'success' && '✓'}
                                {toast.type === 'info' && 'ℹ'}
                                {toast.type === 'warning' && '⚠'}
                                {toast.type === 'error' && '✗'}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium">{toast.message}</p>
                            </div>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
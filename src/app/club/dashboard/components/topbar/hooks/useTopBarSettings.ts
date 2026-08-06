"use client";

import { useEffect, useRef, useState } from "react";

import {
    ActiveSubMenuType,
    CheckedItemsType,
    MenuDataType,
    MenuItemType,
    ToastType
} from "../types";

import {
    initialMenuData,
    STORAGE_KEYS
} from "../constants";


export default function useTopBarSettings() {


    const createDefaultChecked = (): CheckedItemsType => ({
        newPosts: Array(initialMenuData.newPosts.items.length).fill(true),
        myPosts: Array(initialMenuData.myPosts.items.length).fill(true),
        banner: Array(initialMenuData.banner.items.length).fill(true)
    });

    const [menuData, setMenuData] = useState<MenuDataType>(structuredClone(initialMenuData));
    const [showHelpInfo, setShowHelpInfo] = useState(false);
    const [visitorBannerItems, setVisitorBannerItems] = useState<MenuItemType[]>([]);
    const [activeSubMenu, setActiveSubMenu] = useState<ActiveSubMenuType>("newPosts");
    const [checkedItems, setCheckedItems] = useState<CheckedItemsType>(createDefaultChecked());
    const [savedCheckedItems, setSavedCheckedItems] = useState<CheckedItemsType>(createDefaultChecked());
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [showSortingMenu, setShowSortingMenu] = useState(false);
    const [showGeneralSettingsMenu, setShowGeneralSettingsMenu] = useState(false);
    const [showItems, setShowItems] = useState<false | "newPosts" | "myPosts">(false);
    const [checkboxWindowState, setCheckboxWindowState] = useState({ isOpen: false, itemIndex: -1 });
    const [toasts, setToasts] = useState<ToastType[]>([]);
    const toastCounter = useRef(0);

    useEffect(() => {
        const loadSettings = () => {
            try {
                const loadedMenuData = structuredClone(initialMenuData);
                const loadedChecked = createDefaultChecked();

                const savedMyPosts = localStorage.getItem(STORAGE_KEYS.MY_POSTS);
                const savedNewPosts = localStorage.getItem(STORAGE_KEYS.NEW_POSTS);
                const savedBanner = localStorage.getItem(STORAGE_KEYS.BANNER);

                const savedCheckedMyPosts = localStorage.getItem(STORAGE_KEYS.CHECKED_MY_POSTS);
                const savedCheckedNewPosts = localStorage.getItem(STORAGE_KEYS.CHECKED_NEW_POSTS);
                const savedCheckedBanner = localStorage.getItem(STORAGE_KEYS.CHECKED_BANNER);

                if (savedMyPosts) loadedMenuData.myPosts.items = JSON.parse(savedMyPosts);
                if (savedNewPosts) loadedMenuData.newPosts.items = JSON.parse(savedNewPosts);
                if (savedBanner) loadedMenuData.banner.items = JSON.parse(savedBanner);

                if (savedCheckedMyPosts) loadedChecked.myPosts = JSON.parse(savedCheckedMyPosts);
                if (savedCheckedNewPosts) loadedChecked.newPosts = JSON.parse(savedCheckedNewPosts);
                if (savedCheckedBanner) loadedChecked.banner = JSON.parse(savedCheckedBanner);

                setMenuData(loadedMenuData);
                setCheckedItems(loadedChecked);
                setSavedCheckedItems(structuredClone(loadedChecked));

                setVisitorBannerItems(loadedMenuData.banner.items.filter((_, index) => loadedChecked.banner[index]));

                // Notify DarkSidebar about initial banner state
                if (typeof window !== "undefined") {
                    const bannerUpdateEvent = new CustomEvent("bannerMenuUpdated", {
                        detail: {
                            items: loadedMenuData.banner.items,
                            checked: loadedChecked.banner
                        }
                    });
                    window.dispatchEvent(bannerUpdateEvent);
                }
            } catch (error) {
                console.error("Failed to load top bar settings", error);
            }
        };

        loadSettings();
    }, []);
    const showToast = (message: string, type: ToastType["type"] = "success") => {
        const id = ++toastCounter.current;

        setToasts(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts(prev => prev.filter(item => item.id !== id));
        }, 3000);
    };

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(item => item.id !== id));
    };

    const discardUnsavedChanges = () => {
        setCheckedItems(structuredClone(savedCheckedItems));
    };

    const toggleHelpInfo = () => {
        setShowHelpInfo(prev => !prev);
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

    const toggleGeneralSettings = () => {

        setShowGeneralSettingsMenu(prev => !prev);

        setShowSettingsMenu(false);

        setShowSortingMenu(false);

    };
    const openSubMenu = (menu: ActiveSubMenuType) => {
        discardUnsavedChanges();
        setActiveSubMenu(menu);
        setShowSortingMenu(true);

        localStorage.setItem(STORAGE_KEYS.ACTIVE_SUB_MENU, menu);
    };

    const handleMainMenuItemClick = (menuType: ActiveSubMenuType) => {
        discardUnsavedChanges();

        if (menuType === "newPosts" || menuType === "myPosts") {
            setShowItems(prev => prev === menuType ? false : menuType);
        }

        setActiveSubMenu(menuType);
    };

    const handleCheckboxChange = (index: number) => {
        setCheckedItems(prev => ({
            ...prev,
            [activeSubMenu]: prev[activeSubMenu].map((value, itemIndex) => itemIndex === index ? !value : value)
        }));
    };

    const reorderMyPosts = (items: MenuItemType[], checked: boolean[]) => {
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

    const handleSave = () => {
        /*
            My Posts:
            Selected items stay on top.
            Red items move down only after SAVE.
        */
        const myPostsResult = reorderMyPosts(menuData.myPosts.items, checkedItems.myPosts);

        /*
            Banner:
            Do NOT reorder.
            Only selected items appear on visitor page.
        */
        const visitorBanner = menuData.banner.items.filter((_, index) => checkedItems.banner[index]);

        const updatedMenuData = {
            ...menuData,
            myPosts: {
                ...menuData.myPosts,
                items: myPostsResult.items
            },
            banner: {
                ...menuData.banner
            }
        };

        const updatedCheckedItems = {
            ...checkedItems,
            myPosts: myPostsResult.checked
        };

        setMenuData(updatedMenuData);
        setCheckedItems(updatedCheckedItems);
        setVisitorBannerItems(visitorBanner);

        localStorage.setItem(STORAGE_KEYS.MY_POSTS, JSON.stringify(myPostsResult.items));
        localStorage.setItem(STORAGE_KEYS.CHECKED_MY_POSTS, JSON.stringify(myPostsResult.checked));

        localStorage.setItem(STORAGE_KEYS.BANNER, JSON.stringify(menuData.banner.items));
        localStorage.setItem(STORAGE_KEYS.CHECKED_BANNER, JSON.stringify(checkedItems.banner));

        if (typeof window !== "undefined") {
            const bannerItems = menuData.banner.items;
            const bannerChecked = checkedItems.banner;

            if (bannerItems.length === bannerChecked.length) {
                console.log("TopBar: Dispatching banner update event", {
                    itemCount: bannerItems.length,
                    checkedCount: bannerChecked.filter(Boolean).length
                });

                window.dispatchEvent(new CustomEvent("bannerMenuUpdated", {
                    detail: {
                        items: bannerItems,
                        checked: bannerChecked
                    }
                }));
            } else {
                console.error("TopBar: Banner arrays mismatch", {
                    itemsLength: bannerItems.length,
                    checkedLength: bannerChecked.length
                });
            }
        }

        localStorage.setItem(STORAGE_KEYS.NEW_POSTS, JSON.stringify(menuData.newPosts.items));
        localStorage.setItem(STORAGE_KEYS.CHECKED_NEW_POSTS, JSON.stringify(checkedItems.newPosts));

        setSavedCheckedItems({
            newPosts: structuredClone(checkedItems.newPosts),
            myPosts: structuredClone(myPostsResult.checked),
            banner: structuredClone(checkedItems.banner)
        });

        showToast("Settings saved successfully!", "success");
    };

    const handleCancel = () => {
        discardUnsavedChanges();
        setShowSortingMenu(false);
        setShowSettingsMenu(false);
    };

    const handleReset = () => {
        const resetData = structuredClone(initialMenuData);
        const resetChecked = createDefaultChecked();

        setMenuData(resetData);
        setCheckedItems(resetChecked);
        setSavedCheckedItems(structuredClone(resetChecked));
        setVisitorBannerItems(resetData.banner.items);

        localStorage.clear();

        if (typeof window !== "undefined") {
            const bannerItems = resetData.banner.items;
            const bannerChecked = resetChecked.banner;

            if (bannerItems.length === bannerChecked.length) {
                console.log("TopBar: Dispatching banner reset event", {
                    itemCount: bannerItems.length,
                    checkedCount: bannerChecked.filter(Boolean).length
                });

                window.dispatchEvent(new CustomEvent("bannerMenuUpdated", {
                    detail: {
                        items: bannerItems,
                        checked: bannerChecked
                    }
                }));
            } else {
                console.error("TopBar: Banner arrays mismatch on reset", {
                    itemsLength: bannerItems.length,
                    checkedLength: bannerChecked.length
                });
            }
        }

        showToast("Settings reset to default!", "info");
    };

    const swapItem = (direction: number, index: number) => {
        const items = [...menuData[activeSubMenu].items];
        const checked = [...checkedItems[activeSubMenu]];
        const target = index + direction;

        if (target < 0 || target >= items.length) {
            return;
        }

        [items[index], items[target]] = [items[target], items[index]];
        [checked[index], checked[target]] = [checked[target], checked[index]];

        setMenuData(prev => ({
            ...prev,
            [activeSubMenu]: {
                ...prev[activeSubMenu],
                items
            }
        }));

        setCheckedItems(prev => ({
            ...prev,
            [activeSubMenu]: checked
        }));
    };



    return {
        menuData,
        visitorBannerItems,
        activeSubMenu,
        checkedItems,
        showSettingsMenu,
        showSortingMenu,
        showGeneralSettingsMenu,
        showItems,
        checkboxWindowState,
        setCheckboxWindowState,
        toasts,
        toggleSettings,
        toggleGeneralSettings,
        openSubMenu,
        handleMainMenuItemClick,
        handleCheckboxChange,
        handleSave,
        handleCancel,
        handleReset,
        swapItem,
        removeToast,
        showHelpInfo,
        toggleHelpInfo,
    };

}       
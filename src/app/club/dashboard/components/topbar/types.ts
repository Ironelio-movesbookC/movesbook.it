export type MenuItemType = {
    name: string;
    icon: string;
};


export type MenuSectionType = {
    title: string;
    items: MenuItemType[];
};


export type MenuDataType = {
    newPosts: MenuSectionType;
    myPosts: MenuSectionType;
    banner: MenuSectionType;
};


export type ActiveSubMenuType =
    | "newPosts"
    | "myPosts"
    | "banner";


export type CheckedItemsType = {
    newPosts: boolean[];
    myPosts: boolean[];
    banner: boolean[];
};


export type ToastType = {
    id: number;
    message: string;
    type: "success" | "info" | "warning" | "error";
};


export type CheckboxWindowState = {
    isOpen: boolean;
    itemIndex: number;
};
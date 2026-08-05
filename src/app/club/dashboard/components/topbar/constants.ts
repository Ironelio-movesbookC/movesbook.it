import { MenuDataType } from "./types";


export const initialMenuData: MenuDataType = {
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
            { name: "Sport events", icon: "🏰" }
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
            { name: "Pages that I like", icon: "♡" },
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
            { name: "Workouts", icon: "⏱️" }
        ]
    }
};


export const STORAGE_KEYS = {
    NEW_POSTS: "topbar_new_posts_menu",
    MY_POSTS: "topbar_my_posts_menu",
    BANNER: "topbar_banner_menu",
    ACTIVE_SUB_MENU: "topbar_active_sub_menu",
    CHECKED_NEW_POSTS: "topbar_checked_new_posts",
    CHECKED_MY_POSTS: "topbar_checked_my_posts",
    CHECKED_BANNER: "topbar_checked_banner"
};
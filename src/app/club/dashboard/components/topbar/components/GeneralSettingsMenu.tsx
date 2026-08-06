"use client";


type GeneralSettingsMenuProps = {
    isOpen: boolean;
};


const menuSections = [
    {
        title: "General settings and targets",
        items: [
            {
                icon: "▣",
                label: "Dashboard"
            }
        ]
    },
    {
        title: "Social",
        items: [
            {
                icon: "✓",
                label: "Permissions and notifies settings"
            },
            {
                icon: "🔗",
                label: "Manage shared friends"
            },
            {
                icon: "♥",
                label: "Manage your followers"
            },
            {
                icon: "▣",
                label: "Go to general personal setting page"
            }
        ]
    },
    {
        title: "Training and health",
        items: [
            {
                icon: "◩",
                label: "Build quickly your next weekly plan"
            },
            {
                icon: "◉",
                label: "Workouts and sessions"
            },
            {
                icon: "◌",
                label: "Diet targets"
            },
            {
                icon: "⚑",
                label: "Weight and body targets"
            }
        ]
    }
];


export default function GeneralSettingsMenu({
    isOpen
}: GeneralSettingsMenuProps) {


    if (!isOpen) {
        return null;
    }


    return (
        <div className="absolute left-0 top-[44px] w-[260px] bg-[#eeeeee] border-2 border-red-500 shadow-lg z-[100] text-[13px]">
            {menuSections.map((section) => (
                <div key={section.title}>
                    <div className="bg-[#6d91bd] text-white text-center font-bold py-1">
                        {section.title}
                    </div>

                    {section.items.map((item) => (
                        <div key={item.label} className="px-2 py-1 flex items-center gap-2 hover:bg-white cursor-pointer">
                            <span className="w-[16px]">
                                {item.icon}
                            </span>
                            <span>
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
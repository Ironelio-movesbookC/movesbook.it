import React, { useState } from 'react';
import { 
  Tag, 
  ChevronDown, 
  ChevronRight,
  User, 
  Users, 
  Headphones, 
  Layers, 
  CheckSquare, 
  Package, 
  Settings, 
  Sliders, 
  LayoutTemplate, 
  Image, 
  MessageSquare, 
  Mail,
  Lock,
  FileText,
  HelpCircle,
  Globe,
  Edit,
  ShoppingCart,
  Star,
  Monitor,
  Dumbbell,
  Shirt,
  Utensils,
  Share2,
  Briefcase,
  Smartphone,
  Flag,
  Languages,
  Database,
  Key,
  LogOut,
  Trash2
} from 'lucide-react';

// Define types for sidebar items
interface SidebarItemType {
  label: string;
  icon?: any;
  hasLock?: boolean;
  hasSubmenu?: boolean;
  subItems?: SidebarItemType[];
  href?: string;
  id?: string;
}

interface SidebarSectionType {
  id: string;
  label: string;
  items: SidebarItemType[];
}

const SystemDashboardSidebar = () => {
  // State for open sections (main categories)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    staff: true,
    subscriptions: true,
    system: true,
    messages: true,
    infos: false,
    faqs: false,
    html: false,
    promotions: false,
    settings_users: false,
    technical: false,
    general: false,
    management: false,
    apps: false,
    countries: false,
    operative: false,
    passwords: false,
    other: false
  });

  // State for open sub-sections (nested menus)
  const [openSubSections, setOpenSubSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleSubSection = (subSection: string) => {
    setOpenSubSections(prev => ({ ...prev, [subSection]: !prev[subSection] }));
  };

  // Define the sidebar data structure based on PHP implementation
  const sidebarData: SidebarSectionType[] = [
    {
      id: 'staff',
      label: 'Staff enabled',
      items: [
        { label: 'Super Admin', icon: User },
        { label: 'Co-administrators', icon: Users },
        { label: 'Operators', icon: Headphones }
      ]
    },
    {
      id: 'subscriptions',
      label: 'Subscriptions',
      items: [
        { label: 'Versions', icon: Layers },
        { label: 'Functions enabled', icon: CheckSquare },
        { label: 'Packages infos', icon: Package },
        { label: 'Other Settings', icon: Settings }
      ]
    },
    {
      id: 'system',
      label: 'System mainpage',
      items: [
        { 
          label: 'General', 
          icon: Sliders, 
          hasSubmenu: true,
          id: 'system_general',
          subItems: [
            { label: 'Frame settings' },
            { label: 'Links settings' }
          ]
        },
        { 
          label: 'Top Banner', 
          icon: LayoutTemplate, 
          hasSubmenu: true,
          id: 'system_topbanner',
          subItems: [
            { label: 'Why Movesbook' },
            { label: 'Newsletters' },
            { label: 'References' },
            { label: 'About us' },
            { label: 'Product infos' }
          ]
        },
        { 
          label: 'Main banner', 
          icon: Image, 
          hasSubmenu: true,
          id: 'system_mainbanner',
          subItems: [
            { label: 'Banner Tours' },
            { label: 'Sport banners' }
          ]
        }
      ]
    },
    {
      id: 'messages',
      label: 'Messages for users',
      items: [
        { 
          label: 'Messages auto', 
          icon: MessageSquare, 
          hasSubmenu: true,
          id: 'msg_auto',
          subItems: [
            { label: 'Messages at the login' },
            { label: 'Messages at the logout' },
            { label: 'After purchase ID cards' }
          ]
        },
        { 
          label: 'Mail auto', 
          icon: Mail, 
          hasSubmenu: true,
          id: 'mail_auto',
          subItems: [
            { label: 'Confirm activation' },
            { label: 'Invoice sending' }
          ]
        },
        {
          label: 'Info pressing buttons',
          icon: HelpCircle,
          hasSubmenu: true,
          id: 'info_buttons',
          subItems: [
            { label: 'Info last releases' },
            { label: 'QR code info' }
          ]
        },
        {
          label: 'Invites',
          icon: Share2,
          hasSubmenu: true,
          id: 'invites',
          subItems: [
            { label: 'Invite friends content' },
            { label: 'Invite social content' }
          ]
        }
      ]
    },
    {
      id: 'infos',
      label: 'Infos & Help docs',
      items: [
        {
          label: 'Info for users',
          icon: FileText,
          hasSubmenu: true,
          id: 'info_users',
          subItems: [
            { label: 'Our standards' },
            { label: 'Info & Intro' },
            { label: 'YouTube Link' },
            { label: 'User manual' }, // This technically has another level deep in PHP, keeping simple for now
            { label: 'Tutorial video' },
            { label: 'FAQs' },
            { label: 'Info copyright' },
            { label: 'Revenues for the club' }
          ]
        },
        { label: 'Documents Linked to the Page', icon: FileText },
        { label: 'Help system', icon: HelpCircle }
      ]
    },
    {
      id: 'faqs',
      label: 'Management Of FAQS',
      items: [
        { label: 'Editor', icon: Edit },
        { label: 'Management of the FAQS', icon: Settings },
        { label: 'Display of the FAQS', icon: Monitor }
      ]
    },
    {
      id: 'html',
      label: 'HTML builder',
      items: [
        {
          label: 'for Movebook users',
          icon: Globe,
          hasSubmenu: true,
          id: 'html_users',
          subItems: [
            { label: 'Document editor' },
            { label: 'Index for HTMLs' },
            { label: 'Processes for HTMLs' },
            { label: 'Displayed in mainpage' },
            { label: 'Items linked in mainpage' }
          ]
        },
        {
          label: 'Edited by Clubs',
          icon: Briefcase,
          hasSubmenu: true,
          id: 'html_clubs',
          subItems: [
            { label: 'Documents to mail' },
            { label: 'News of the club' }
          ]
        }
      ]
    },
    {
      id: 'promotions',
      label: 'Promotions',
      items: [
        { label: 'Catalog of products', icon: ShoppingCart },
        {
          label: 'Sponsors',
          icon: Star,
          hasSubmenu: true,
          id: 'promo_sponsors',
          subItems: [
            { label: 'Sponsors in Mainpage' },
            { label: 'Investors of ads plans' }
          ]
        },
        {
          label: 'Advertisings',
          icon: Monitor,
          hasSubmenu: true,
          id: 'promo_ads',
          subItems: [
            { label: 'Price list setting' },
            { label: 'Ad plans purchased' },
            { label: 'Ad spaces for clubs' }
          ]
        }
      ]
    },
    {
      id: 'settings_users',
      label: 'Settings for users',
      items: [
        { label: 'Single users', icon: User },
        { label: 'Coaches', icon: User },
        { label: 'Teams', icon: Users },
        { label: 'Groups', icon: Users },
        { label: 'Clubs', icon: Briefcase }
      ]
    },
    {
      id: 'technical',
      label: 'Technical settings',
      items: [
        { label: 'Gym machines' },
        { label: 'Sport devices enabled' },
        { label: 'Clothes', icon: Shirt },
        { label: 'Other settings' }
      ]
    },
    {
      id: 'general',
      label: 'General settings',
      items: [
        { label: 'User types' },
        { 
          label: 'Sports', 
          hasSubmenu: true,
          id: 'gen_sports',
          subItems: [
            { label: 'List of the sports' },
            { label: 'Workouts icons' },
            { label: 'Sports banners' }
          ]
        },
        {
          label: 'Activities for users',
          hasSubmenu: true,
          id: 'gen_activities',
          subItems: [
            { label: 'Activities for the user profile' },
            { label: 'Activities for the clubs' }
          ]
        },
        { label: 'Foods And Dishes', icon: Utensils },
        { label: 'Path for social buttons', icon: Share2 }
      ]
    },
    {
      id: 'management',
      label: 'Management section',
      items: [
        { label: 'Club management info' },
        {
          label: 'Management',
          hasSubmenu: true,
          id: 'mgmt_main',
          subItems: [
            { label: 'Club password requests' },
            { label: 'Enablings management' },
            { label: 'Set functions enabled' },
            { label: 'Access control audio setting' },
            { label: 'Defaultsettings' }
          ]
        },
        { label: 'Help support', icon: HelpCircle }
      ]
    },
    {
      id: 'apps',
      label: 'Movesbook Apps',
      items: [
        { label: 'Subscription setting' },
        { label: 'Html editor for app' },
        { label: 'Terms & Conditions' },
        { label: 'Policy & Privacy' },
        { label: 'Preferences' },
        { label: 'Partners' }
      ]
    },
    {
      id: 'countries',
      label: 'Countries & Languages',
      items: [
        { label: 'Countries settings', icon: Flag },
        {
          label: 'Languages',
          icon: Languages,
          hasSubmenu: true,
          id: 'lang_main',
          subItems: [
            { label: 'Set official languages' },
            { label: 'Languages settings' },
            { label: 'Languages long texts' }
          ]
        }
      ]
    },
    {
      id: 'operative',
      label: 'Operative Tools',
      items: [
        { label: 'Back Office', icon: Database },
        { label: 'CK Editor plugin' },
        { label: 'CK-Finder media folder' },
        { label: 'Newsletters editor' },
        { label: 'Assistance with chat service' }
      ]
    },
    {
      id: 'passwords',
      label: 'Passwords of access',
      items: [
        { label: 'S-Admin passwod', icon: Key },
        { label: 'Passwords Help & Language' },
        { label: 'Passwords other sections' }
      ]
    },
    {
      id: 'other',
      label: 'Other items',
      items: [
        { label: 'Back to S-Admin page', icon: User },
        { label: 'Deletions', icon: Trash2 },
        { label: 'Log out & Exit', icon: LogOut }
      ]
    }
  ];

  const SidebarItem = ({ 
    item, 
    onClick 
  }: { 
    item: SidebarItemType, 
    onClick?: () => void 
  }) => {
    const Icon = item.icon || ChevronRight;
    const isOpen = item.id ? openSubSections[item.id] : false;

    return (
      <div className="mb-[5px]">
        <a 
          href="#" 
          onClick={(e) => {
            e.preventDefault();
            if (item.hasSubmenu && item.id) {
              toggleSubSection(item.id);
            }
            if (onClick) onClick();
          }}
          className="relative block py-[10px] pr-0 pl-[45px] bg-[#4e4e4e] border border-[#7f7f7f] text-white hover:bg-[#5e5e5e] transition-colors"
        >
          <div className="absolute left-[8px] top-[6px] w-[24px]">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <span className="text-[13px] font-bold text-white flex items-center gap-1">
            {item.label}
            {item.hasLock && <Lock className="w-3 h-3 text-white ml-1" />}
          </span>
          {item.hasSubmenu && (
            <div className="absolute right-[13px] top-[8px]">
              <ChevronDown className={`w-4 h-4 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          )}
        </a>
        
        {/* Render submenu if open */}
        {item.hasSubmenu && isOpen && item.subItems && (
          <div className="pl-[35px] pt-[5px]">
            {item.subItems.map((subItem, idx) => (
              <SubMenuItem key={idx} label={subItem.label} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const SubMenuItem = ({ label }: { label: string }) => (
    <div className="mb-[5px]">
      <a href="#" className="relative block py-[10px] pr-0 pl-[45px] bg-[#4e4e4e] border border-[#7f7f7f] text-white hover:bg-[#5e5e5e] transition-colors">
        <div className="absolute left-[8px] top-[6px] w-[24px]">
          <ChevronRight className="w-5 h-5 text-white" />
        </div>
        <span className="text-[13px] font-bold text-white">{label}</span>
      </a>
    </div>
  );

  return (
    <div className="w-[280px] flex-shrink-0 bg-[#2b2b2b] pb-1 min-h-screen">
      {sidebarData.map((section) => (
        <div key={section.id} className="mb-[1px] bg-[#2b2b2b]">
          <h4 className="m-0 bg-[#004040] relative">
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); toggleSection(section.id); }}
              className="block py-[10px] px-[35px] pl-[45px] text-white font-bold text-[15px]"
            >
              <span className="absolute left-[10px] top-[8px] w-[22px]">
                <Tag className="w-5 h-5 text-white" />
              </span>
              <span className="title">{section.label}</span>
              <span className="absolute right-[13px] top-[8px]">
                <ChevronDown className={`w-4 h-4 text-white transition-transform ${!openSections[section.id] ? '-rotate-90' : ''}`} />
              </span>
            </a>
          </h4>
          
          {openSections[section.id] && (
            <div className="p-[10px]">
              {section.items.map((item, idx) => (
                <SidebarItem key={idx} item={item} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SystemDashboardSidebar;


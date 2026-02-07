'use client';

import { 
  User, 
  Users, 
  Shield, 
  ShieldCheck,
  Map as MapIcon, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Settings,
  ClipboardList,
  ClipboardCheck,
  Bookmark,
  Gift,
  AlignJustify,
  PoundSterling,
  UserCircle,
  ShoppingBasket,
  Truck,
  CreditCard,
  Smartphone,
  QrCode,
  Radio,
  Badge,
  Triangle,
  Repeat,
  AlarmClock,
  LogIn,
  Puzzle,
  MessageCircle,
  Star,
  HelpCircle,
  Lightbulb,
  AlertTriangle,
  Bug,
  BellOff,
  Mail,
  UserX,
  Hand,
  History,
  Globe,
  MessageSquare,
  AlertCircle,
  Clipboard,
  Music,
  Megaphone,
  Target,
  Code,
  Plug,
  CalendarPlus,
  Calendar,
  Search,
  UserPlus,
  BookUser
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function AdminLeftSidebar() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    stats: true,
    promo: false,
    club: false,
    accounts: false,
    membership: false,
    logins: false,
    relationships: false,
    messages: false,
    blocks: false,
    reference: false,
    news: false,
    music: false,
    advertisements: false,
    development: false,
    events: false,
    lastViewed: true,
    friends: true,
    onlineFriends: true,
    friendCategories: true
  });

  const [lastViewedCount, setLastViewedCount] = useState("1");
  const [lastViewedToggles, setLastViewedToggles] = useState({
    singleUsers: true,
    coaches: true,
    groups: true,
    clubs: true
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="w-64 bg-[#2b2b2b] text-white flex flex-col h-full flex-shrink-0 overflow-y-auto p-1 gap-1">
      {/* Dashboard Settings */}
      <div className="mb-0">
        <div className="bg-[#7d0e1f] px-4 py-3 font-bold text-sm uppercase flex items-center justify-center border border-[#aeaeae] relative">
          Dashboard settings
        </div>
        
        {/* Admins & Operators Sub-section */}
        <div className="mt-1">
          <div className="bg-[#a348a5] px-4 py-2 font-bold text-sm text-white">
            Admins & Operators
          </div>
          
          {/* Add Links */}
          <div className="bg-[#2b2b2b] text-white text-[10px] flex justify-center gap-4 py-1 font-bold">
             <Link href="/admin/add-co-admin" className="hover:underline">+ Add a co-admin</Link>
             <Link href="/admin/add-operator" className="hover:underline">+ Add a new operator</Link>
          </div>

          {/* Blue Tabs */}
          <Link href="/admin/profile" className="flex items-center gap-3 px-3 py-2 bg-[#005c99] hover:bg-[#004d80] transition border border-white text-sm mb-1">
            <div className="w-9 h-9 relative border border-gray-400 flex-shrink-0">
               <img src="/admin-avatar.jpg" alt="Admin" className="w-full h-full object-cover" />
            </div>
            <div className="bg-black border border-white p-0.5 rounded-sm flex-shrink-0">
                <User className="w-4 h-4 text-white" />
            </div>
            <div className="font-bold text-white">Movesbook Main Admin</div>
          </Link>
          
          <Link href="/admin/co-admins" className="flex items-center gap-3 px-3 py-2 bg-[#005c99] hover:bg-[#004d80] transition border border-white text-sm mb-1">
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <div className="bg-black border border-white p-0.5 rounded-full flex-shrink-0">
                <User className="w-3 h-3 text-white" />
            </div>
            <div className="font-bold text-white">Co-admins</div>
          </Link>

          {/* Breakline */}
          <div className="h-1 bg-[#2b2b2b]"></div>
          
          <Link href="/admin/operators" className="flex items-center gap-3 px-3 py-2 bg-[#005c99] hover:bg-[#004d80] transition border border-white text-sm mb-1">
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
                 <Users className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <div className="bg-black border border-white p-0.5 rounded-full flex-shrink-0">
                <User className="w-3 h-3 text-white" />
            </div>
            <div className="font-bold text-white">Operators</div>
          </Link>
        </div>
      </div>

      {/* Map Overview */}
      <div className="mb-0 mt-1">
        <div className="bg-[#058592] px-4 py-2 font-bold text-sm flex items-center justify-center text-white">
          Map overview
        </div>
        <div className="bg-[#2b2b2b] py-4 flex justify-center">
           <div className="w-48 h-24 relative">
              <img src="/assets/map.jpg" alt="Map Overview" className="object-contain w-full h-full" />
           </div>
        </div>
      </div>

      {/* Totals and Statistics */}
      <div className="mb-0 mt-1">
        <button 
          onClick={() => toggleSection('stats')}
          className="w-full bg-[#058592] px-4 py-2 font-bold text-sm text-white flex items-center justify-between hover:bg-[#046c76] transition"
        >
          <span>Totals and statistics</span>
          <Triangle className="w-4 h-4 text-white fill-[#ff8d00] rotate-180" />
        </button>
        
        {openSections.stats && (
          <div className="bg-[#2b2b2b] mt-1 space-y-1">
            <Link href="/admin/statistics/overview" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm">
              <ClipboardList className="w-4 h-4 text-white" />
              <span>Overview totals</span>
            </Link>
            <Link href="/admin/statistics/recovery" className="flex items-center gap-3 px-3 py-2 bg-[#941751] border border-[#aeaeae] hover:bg-[#7a1343] transition text-sm">
              <ClipboardList className="w-4 h-4 text-white" />
              <span>Recovery plan</span>
            </Link>
            <Link href="/admin/statistics/logins" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm">
              <ClipboardCheck className="w-4 h-4 text-white" />
              <span>Users Login</span>
            </Link>
            <Link href="/admin/statistics/access" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm">
              <Bookmark className="w-4 h-4 text-white" />
              <span>Access to advertisings</span>
            </Link>
          </div>
        )}
      </div>

      {/* Promote with Promocodes */}
      <div className="mb-0 mt-1">
        <button 
          onClick={() => toggleSection('promo')}
          className="w-full bg-[#058592] px-4 py-2 font-bold text-sm text-white flex items-center justify-between hover:bg-[#046c76] transition"
        >
          <span>Promote with Promocodes</span>
          <Triangle className="w-4 h-4 text-white fill-[#ff8d00] rotate-180" />
        </button>
        
        {openSections.promo && (
          <div className="bg-[#2b2b2b] mt-1 space-y-1">
            <Link href="/admin/promocode/subscription" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm">
              <Gift className="w-4 h-4 text-white" />
              <span>Subscriptions with Promocode</span>
            </Link>
          </div>
        )}
      </div>

      {/* Club options */}
      <div className="mb-0 mt-1">
        <button 
          onClick={() => toggleSection('club')}
          className="w-full bg-[#058592] px-4 py-2 font-bold text-sm text-white flex items-center justify-between hover:bg-[#046c76] transition"
        >
          <span>Club options</span>
          <Triangle className="w-4 h-4 text-white fill-[#ff8d00] rotate-180" />
        </button>
        
        {openSections.club && (
          <div className="bg-[#2b2b2b] mt-1 space-y-1">
            <Link href="/admin/clubs/subscription" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm">
              <AlignJustify className="w-4 h-4 text-white" />
              <span>Subscription of clubs</span>
            </Link>
            <Link href="/admin/clubs/subscriptions-list" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm justify-between">
              <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-white" />
                  <span>Subscriptions</span>
              </div>
              <Triangle className="w-3 h-3 text-white fill-white rotate-180" />
            </Link>
          </div>
        )}
      </div>

      {/* List of payments */}
      <div className="mb-0 mt-1">
          <Link href="/admin/payments" className="flex items-center gap-3 px-4 py-3 bg-[#7d0e1f] border border-[#aeaeae] hover:bg-[#630b18] transition text-sm font-bold text-white uppercase">
               <PoundSterling className="w-4 h-4 text-white" />
               <span>List of the payments</span>
          </Link>
      </div>

      {/* Club accounts Section (Moved) */}
      <div className="mb-0 mt-1">
          <div className="bg-[#009292] px-4 py-2 font-bold text-sm text-[#e8f30c]">
            Club accounts
          </div>
          
          {/* Accounts Tab */}
          <div className="bg-[#2b2b2b] mt-1">
             <button 
                onClick={() => toggleSection('accounts')}
                className="w-full flex items-center justify-between px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white"
             >
                <div className="flex items-center gap-3">
                    <UserCircle className="w-4 h-4 text-white" />
                    <span>Accounts</span>
                </div>
                <Triangle className="w-3 h-3 text-white fill-white rotate-180" />
             </button>
          </div>
      </div>

      {/* Identification cards Section (Moved) */}
      <div className="mb-0 mt-1">
          <div className="bg-[#009292] px-4 py-2 font-bold text-sm text-[#e8f30c]">
            Identification cards
          </div>
          
          <div className="bg-[#2b2b2b] mt-1 space-y-1">
             {/* Product purchased - Identification cards */}
             <Link href="/admin/products/identification" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
                <ShoppingBasket className="w-4 h-4 text-white" />
                <span>Product purchased - Identification cards</span>
             </Link>

             {/* Order purchased */}
             <Link href="/admin/orders" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
                <Truck className="w-4 h-4 text-white" />
                <span>Order purchased</span>
             </Link>

             {/* Subtabs */}
             {['Badges', 'Rfids', 'QR Codes', 'Smartcards', 'Hardware'].map((item) => (
                <Link key={item} href={`/admin/cards/${item.toLowerCase().replace(' ', '-')}`} className="flex items-center justify-between px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white ml-auto w-[85%]">
                   <div className="flex items-center gap-3">
                      {item === 'Badges' && <Badge className="w-4 h-4 text-white" />}
                      {item === 'Rfids' && <Radio className="w-4 h-4 text-white" />}
                      {item === 'QR Codes' && <QrCode className="w-4 h-4 text-white" />}
                      {item === 'Smartcards' && <CreditCard className="w-4 h-4 text-white" />}
                      {item === 'Hardware' && <Smartphone className="w-4 h-4 text-white" />}
                      <span>{item}</span>
                   </div>
                   <Triangle className="w-3 h-3 text-white fill-white rotate-180" />
                </Link>
             ))}
          </div>
      </div>

      {/* Membership subscriptions */}
      <div className="mb-0 mt-1">
        <button 
          onClick={() => toggleSection('membership')}
          className="w-full bg-[#058592] px-4 py-2 font-bold text-sm text-white flex items-center justify-between hover:bg-[#046c76] transition"
        >
          <span>Membership subscriptions</span>
          <Triangle className="w-4 h-4 text-white fill-[#ff8d00] rotate-180" />
        </button>
        
        {openSections.membership && (
          <div className="bg-[#2b2b2b] mt-1 space-y-1">
            <Link href="/admin/membership/by-type" className="flex items-center gap-3 px-3 py-2 bg-[#941751] border border-[#aeaeae] hover:bg-[#7a1343] transition text-sm text-white">
              <AlignJustify className="w-4 h-4 text-white" />
              <span>Subscriptions by user type</span>
            </Link>
            
            <Link href="/admin/membership/checking" className="flex items-center gap-3 px-3 py-2 bg-black border border-[#aeaeae] hover:bg-[#1a1a1a] transition text-sm text-white">
               <Repeat className="w-4 h-4 text-white" />
               <span>Memberships checking</span>
            </Link>

            <Link href="/admin/membership/requests" className="flex items-center gap-3 px-3 py-2 bg-black border border-[#aeaeae] hover:bg-[#1a1a1a] transition text-sm text-white">
               <AlarmClock className="w-4 h-4 text-white" />
               <span>Requests of Membership</span>
            </Link>

            <Link href="/admin/membership/structure" className="flex items-center gap-3 px-3 py-2 bg-black border border-[#aeaeae] hover:bg-[#1a1a1a] transition text-sm text-white">
               <Settings className="w-4 h-4 text-white" />
               <span>Structure of subscriptions</span>
            </Link>
          </div>
        )}
      </div>

      {/* List of payments Again */}
      <div className="mb-0 mt-1">
          <Link href="/admin/payments" className="flex items-center gap-3 px-4 py-3 bg-[#7d0e1f] border border-[#aeaeae] hover:bg-[#630b18] transition text-sm font-bold text-white uppercase">
               <PoundSterling className="w-4 h-4 text-white" />
               <span>List of the payments</span>
          </Link>
      </div>

      {/* Logins Section */}
      <div className="mb-0 mt-1">
        <button 
          onClick={() => toggleSection('logins')}
          className="w-full bg-[#058592] px-4 py-2 font-bold text-sm text-white flex items-center justify-between hover:bg-[#046c76] transition"
        >
          <span>Logins</span>
          <Triangle className="w-4 h-4 text-white fill-[#ff8d00] rotate-180" />
        </button>
        
        {openSections.logins && (
          <div className="bg-[#2b2b2b] mt-1 space-y-1">
            <Link href="/admin/logins/users" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <LogIn className="w-4 h-4 text-white" />
               <span>Logins about users</span>
            </Link>

            <Link href="/admin/logins/operators" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <LogIn className="w-4 h-4 text-[#a348a5]" />
               <span>Logins about operators</span>
            </Link>

            <Link href="/admin/logins/editors" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <Puzzle className="w-4 h-4 text-white" />
               <span>Logins editors and developers</span>
            </Link>
          </div>
        )}
      </div>

      {/* Relationships with customers */}
      <div className="mb-0 mt-1">
        <button 
          onClick={() => toggleSection('relationships')}
          className="w-full bg-[#058592] px-4 py-2 font-bold text-sm text-white flex items-center justify-between hover:bg-[#046c76] transition"
        >
          <span>Relationships with customers</span>
          <Triangle className="w-4 h-4 text-white fill-[#ff8d00] rotate-180" />
        </button>
        
        {openSections.relationships && (
          <div className="bg-[#2b2b2b] mt-1 space-y-1">
            <Link href="/admin/relationships/notifies" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <MessageCircle className="w-4 h-4 text-white" />
               <span>Notifies for the club staff</span>
            </Link>

            <Link href="/admin/relationships/reviews" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <Star className="w-4 h-4 text-white" />
               <span>Reviews</span>
            </Link>

            <Link href="/admin/relationships/questions" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <HelpCircle className="w-4 h-4 text-white" />
               <span>Questions from the users</span>
            </Link>

            <Link href="/admin/relationships/suggestions" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <Lightbulb className="w-4 h-4 text-white" />
               <span>Suggestions</span>
            </Link>

            <Link href="/admin/relationships/problems" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <AlertTriangle className="w-4 h-4 text-white" />
               <span>Problems</span>
            </Link>

            <Link href="/admin/relationships/bugs" className="flex items-center gap-3 px-3 py-2 bg-black border border-[#aeaeae] hover:bg-[#1a1a1a] transition text-sm text-[#e8f30c]">
               <Bug className="w-4 h-4 text-white" />
               <span>Bugs And fixed errors</span>
            </Link>

            <Link href="/admin/relationships/comments" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <BellOff className="w-4 h-4 text-white" />
               <span>Comments inappropriate</span>
            </Link>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="mb-0 mt-1">
        <button 
          onClick={() => toggleSection('messages')}
          className="w-full bg-[#058592] px-4 py-2 font-bold text-sm text-white flex items-center justify-between hover:bg-[#046c76] transition"
        >
          <span>Messages</span>
          <Triangle className="w-4 h-4 text-white fill-[#ff8d00] rotate-180" />
        </button>
        
        {openSections.messages && (
          <div className="bg-[#2b2b2b] mt-1 space-y-1">
            <Link href="/admin/messages/general" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <Mail className="w-4 h-4 text-white" />
               <span>Messages from users and club\teams</span>
            </Link>
            
            <Link href="/admin/messages/inbox" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" stroke="#ff0000" />
               </svg>
               <span>Messages inbox from the users</span>
            </Link>

            <Link href="/admin/messages/outbox" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" stroke="#ff0000" />
               </svg>
               <span>Message sendbox to the users</span>
            </Link>
          </div>
        )}
      </div>

      {/* Blocks and extensions */}
      <div className="mb-0 mt-1">
        <button 
          onClick={() => toggleSection('blocks')}
          className="w-full bg-[#058592] px-4 py-2 font-bold text-sm text-white flex items-center justify-between hover:bg-[#046c76] transition"
        >
          <span>Blocks and extensions</span>
          <Triangle className="w-4 h-4 text-white fill-[#ff8d00] rotate-180" />
        </button>
        
        {openSections.blocks && (
          <div className="bg-[#2b2b2b] mt-1 space-y-1">
            <Link href="/admin/blocks/users" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <UserX className="w-4 h-4 text-white" />
               <span>Users Blocked</span>
            </Link>
            
            <Link href="/admin/blocks/accounts" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <Hand className="w-4 h-4 text-white" />
               <span>Block accounts and Id cards</span>
            </Link>

            <Link href="/admin/blocks/extended" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <History className="w-4 h-4 text-white" />
               <span>Users with extended subscription</span>
            </Link>
          </div>
        )}
      </div>

      {/* Reference users and feedbacks */}
      <div className="mb-0 mt-1">
        <button 
          onClick={() => toggleSection('reference')}
          className="w-full bg-[#058592] px-4 py-2 font-bold text-sm text-white flex items-center justify-between hover:bg-[#046c76] transition"
        >
          <span>Reference users and feedbacks</span>
          <Triangle className="w-4 h-4 text-white fill-[#ff8d00] rotate-180" />
        </button>
        
        {openSections.reference && (
          <div className="bg-[#2b2b2b] mt-1 space-y-1">
            <Link href="/admin/reference/best" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <Star className="w-4 h-4 text-white fill-white" />
               <span>Best users</span>
            </Link>
            
            <Link href="/admin/reference/list" className="flex items-center justify-between px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <div className="flex items-center gap-3">
                   <div className="bg-white rounded-full p-0.5 flex items-center justify-center">
                       <Star className="w-3 h-3 text-black fill-black" />
                   </div>
                   <span>List of refrence users</span>
               </div>
               <div className="bg-white text-black text-xs font-bold px-1.5 rounded-sm">12</div>
            </Link>

            <Link href="/admin/reference/testimonials" className="flex items-center justify-between px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <div className="flex items-center gap-3">
                   <div className="relative">
                       <MessageSquare className="w-4 h-4 text-white" />
                       <Star className="w-2 h-2 text-black fill-black absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                   </div>
                   <span>Customer testimonials</span>
               </div>
               <div className="bg-white text-black text-xs font-bold px-1.5 rounded-sm">5</div>
            </Link>

            <Link href="/admin/reference/feedbacks" className="flex items-center justify-between px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <div className="flex items-center gap-3">
                   <MessageSquare className="w-4 h-4 text-white" />
                   <span>Feedbacks posted</span>
               </div>
               <div className="bg-white text-black text-xs font-bold px-1.5 rounded-sm">3</div>
            </Link>
          </div>
        )}
      </div>

      {/* News and articles */}
      <div className="mb-0 mt-1">
        <button 
          onClick={() => toggleSection('news')}
          className="w-full bg-[#058592] px-4 py-2 font-bold text-sm text-white flex items-center justify-between hover:bg-[#046c76] transition"
        >
          <span>News and articles</span>
          <Triangle className="w-4 h-4 text-white fill-[#ff8d00] rotate-180" />
        </button>
        
        {openSections.news && (
          <div className="bg-[#2b2b2b] mt-1 space-y-1">
            <Link href="/admin/news/general" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <AlertCircle className="w-4 h-4 text-white" />
               <span>News</span>
            </Link>
            
            <Link href="/admin/news/links" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <Globe className="w-4 h-4 text-white" />
               <span>News through links</span>
            </Link>

            <Link href="/admin/news/clubs" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <Clipboard className="w-4 h-4 text-white" />
               <span>News from clubs</span>
            </Link>
          </div>
        )}
      </div>

      {/* Music */}
      <div className="mb-0 mt-1">
        <button 
          onClick={() => toggleSection('music')}
          className="w-full bg-[#058592] px-4 py-2 font-bold text-sm text-white flex items-center justify-between hover:bg-[#046c76] transition"
        >
          <span>Music</span>
          <Triangle className="w-4 h-4 text-white fill-[#ff8d00] rotate-180" />
        </button>
        
        {openSections.music && (
          <div className="bg-[#2b2b2b] mt-1 space-y-1">
            <Link href="/admin/medias/index" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <Music className="w-4 h-4 text-white" />
               <span>Music Tracked From Users</span>
            </Link>
            
            <Link href="/admin/medias/settings" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <Settings className="w-4 h-4 text-white" />
               <span>Settings</span>
            </Link>
          </div>
        )}
      </div>

      {/* Advertisements */}
      <div className="mb-0 mt-1">
        <button 
          onClick={() => toggleSection('advertisements')}
          className="w-full bg-[#058592] px-4 py-2 font-bold text-sm text-white flex items-center justify-between hover:bg-[#046c76] transition"
        >
          <span>Advertisements</span>
          <Triangle className="w-4 h-4 text-white fill-[#ff8d00] rotate-180" />
        </button>
        
        {openSections.advertisements && (
          <div className="bg-[#2b2b2b] mt-1 space-y-1">
            <Link href="/admin/subscription/ads" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <Megaphone className="w-4 h-4 text-white" />
               <span>Ads for clubs users</span>
            </Link>
            
            <Link href="/admin/users/ads" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <Target className="w-4 h-4 text-white" />
               <span>Third party ads</span>
            </Link>
          </div>
        )}
      </div>

      {/* Development */}
      <div className="mb-0 mt-1">
        <button 
          onClick={() => toggleSection('development')}
          className="w-full bg-[#058592] px-4 py-2 font-bold text-sm text-white flex items-center justify-between hover:bg-[#046c76] transition"
        >
          <span>Development</span>
          <Triangle className="w-4 h-4 text-white fill-[#ff8d00] rotate-180" />
        </button>
        
        {openSections.development && (
          <div className="bg-[#2b2b2b] mt-1 space-y-1">
            <Link href="/admin/users/developers" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <Code className="w-4 h-4 text-white" />
               <span>Developers</span>
            </Link>
            
            <Link href="/admin/users/plugins" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <Plug className="w-4 h-4 text-white" />
               <span>Plugins</span>
            </Link>
          </div>
        )}
      </div>

      {/* Events */}
      <div className="mb-0 mt-1">
        <button 
          onClick={() => toggleSection('events')}
          className="w-full bg-[#058592] px-4 py-2 font-bold text-sm text-white flex items-center justify-between hover:bg-[#046c76] transition"
        >
          <span>Events</span>
          <Triangle className="w-4 h-4 text-white fill-[#ff8d00] rotate-180" />
        </button>
        
        {openSections.events && (
          <div className="bg-[#2b2b2b] mt-1 space-y-1">
            <Link href="/admin/users/events/new" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <CalendarPlus className="w-4 h-4 text-white" />
               <span>New events</span>
            </Link>
            
            <Link href="/admin/users/events" className="flex items-center gap-3 px-3 py-2 bg-[#4f4f4f] border border-[#aeaeae] hover:bg-[#3d3d3d] transition text-sm text-white">
               <Calendar className="w-4 h-4 text-white" />
               <span>List of events</span>
            </Link>
            
            {/* Calendar Widget */}
            <div className="p-4 flex flex-col items-center bg-[#2b2b2b]">
                <div className="bg-[#f6f6f6] rounded-t-sm shadow-sm w-full max-w-[200px] font-sans border border-[#aeaeae]">
                    {/* Header */}
                    <div className="bg-[#1797a6] p-1.5 flex justify-between items-center text-white rounded-t-sm">
                        <ChevronLeft className="w-4 h-4 cursor-pointer hover:text-gray-200" />
                        <div className="font-bold text-sm">February 2026</div>
                        <ChevronRight className="w-4 h-4 cursor-pointer hover:text-gray-200" />
                    </div>
                    
                    {/* Weekdays */}
                    <div className="grid grid-cols-7 text-[10px] text-center bg-gradient-to-b from-white to-[#e6e6e6] border-b border-[#d3d3d3] py-1 text-[#333]">
                        <span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span>
                    </div>
                    
                    {/* Days */}
                    <div className="grid grid-cols-7 text-[11px] text-center bg-[#f7f7f7] p-0.5">
                        <span className="py-1 text-gray-300">26</span><span className="py-1 text-gray-300">27</span><span className="py-1 text-gray-300">28</span><span className="py-1 text-gray-300">29</span><span className="py-1 text-gray-300">30</span><span className="py-1 text-gray-300">31</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">1</span>
                        <span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">2</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">3</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">4</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">5</span><span className="py-1 bg-[#1797a6] text-white cursor-pointer shadow-sm border border-[#0f6f7a]">6</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">7</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">8</span>
                        <span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">9</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">10</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">11</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">12</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">13</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">14</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">15</span>
                        <span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">16</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">17</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">18</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">19</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">20</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">21</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">22</span>
                        <span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">23</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">24</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">25</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">26</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">27</span><span className="py-1 hover:bg-[#e0e0e0] cursor-pointer text-[#333]">28</span><span className="py-1 text-gray-300">1</span>
                    </div>
                </div>
                
                {/* Settings Button */}
                <div className="w-full max-w-[200px] flex justify-end mt-1">
                    <button className="bg-[#dcdcdc] hover:bg-[#c0c0c0] text-black text-[11px] font-bold px-3 py-0.5 rounded-sm border border-[#aeaeae] shadow-sm">
                        Settings
                    </button>
                </div>
            </div>
          </div>
        )}
      </div>

      {/* Last Viewed */}
      <div className="mb-0 mt-1">
        <div className="w-full bg-[#5c6b7f] px-4 py-2 font-bold text-sm text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Last Viewed</span>
            <select 
              value={lastViewedCount}
              onChange={(e) => setLastViewedCount(e.target.value)}
              className="bg-white text-black text-xs px-1 py-0.5 rounded-sm outline-none cursor-pointer"
            >
              <option value="1">1</option>
              <option value="3">3</option>
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
            </select>
          </div>
          <button onClick={() => toggleSection('lastViewed')}>
            <Triangle className={`w-4 h-4 text-white fill-[#ff8d00] transition-transform ${openSections.lastViewed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {openSections.lastViewed && (
          <div className="bg-[#2b2b2b]">
            {/* Single Users */}
            <div className="border-b border-[#3d3d3d]">
              <div 
                className="px-4 py-1.5 text-xs text-white bg-[#333] flex justify-between items-center cursor-pointer hover:bg-[#3d3d3d]"
                onClick={() => setLastViewedToggles({...lastViewedToggles, singleUsers: !lastViewedToggles.singleUsers})}
              >
                <span>Single Users</span>
                <Triangle className={`w-2 h-2 text-white fill-white transition-transform ${lastViewedToggles.singleUsers ? 'rotate-180' : ''}`} />
              </div>
              {lastViewedToggles.singleUsers && (
                <div className="p-2 space-y-2">
                  <div className="flex gap-2 items-start">
                    <div className="w-8 h-8 bg-gray-600 rounded-sm overflow-hidden flex-shrink-0">
                      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alessia" alt="Alessia" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-xs text-white">
                      <div className="font-bold text-[#e6e6e6]">Alessia Panda</div>
                      <div className="text-[#aeaeae]">Athletic</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Coaches */}
            <div className="border-b border-[#3d3d3d]">
              <div 
                className="px-4 py-1.5 text-xs text-white bg-[#333] flex justify-between items-center cursor-pointer hover:bg-[#3d3d3d]"
                onClick={() => setLastViewedToggles({...lastViewedToggles, coaches: !lastViewedToggles.coaches})}
              >
                <span>Coaches</span>
                <Triangle className={`w-2 h-2 text-white fill-white transition-transform ${lastViewedToggles.coaches ? 'rotate-180' : ''}`} />
              </div>
              {lastViewedToggles.coaches && (
                <div className="p-2 space-y-2">
                  <div className="flex gap-2 items-start">
                    <div className="w-8 h-8 bg-gray-600 rounded-sm overflow-hidden flex-shrink-0">
                      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=pitter" alt="pitter" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-xs text-white">
                      <div className="font-bold text-[#e6e6e6]">pitter</div>
                      <div className="text-[#aeaeae]">...</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Groups */}
            <div className="border-b border-[#3d3d3d]">
              <div 
                className="px-4 py-1.5 text-xs text-white bg-[#333] flex justify-between items-center cursor-pointer hover:bg-[#3d3d3d]"
                onClick={() => setLastViewedToggles({...lastViewedToggles, groups: !lastViewedToggles.groups})}
              >
                <span>Groups</span>
                <Triangle className={`w-2 h-2 text-white fill-white transition-transform ${lastViewedToggles.groups ? 'rotate-180' : ''}`} />
              </div>
              {lastViewedToggles.groups && (
                <div className="p-2 text-xs text-[#aeaeae] italic">No groups viewed</div>
              )}
            </div>

            {/* Clubs */}
            <div className="border-b border-[#3d3d3d]">
              <div 
                className="px-4 py-1.5 text-xs text-white bg-[#333] flex justify-between items-center cursor-pointer hover:bg-[#3d3d3d]"
                onClick={() => setLastViewedToggles({...lastViewedToggles, clubs: !lastViewedToggles.clubs})}
              >
                <span>Clubs</span>
                <Triangle className={`w-2 h-2 text-white fill-white transition-transform ${lastViewedToggles.clubs ? 'rotate-180' : ''}`} />
              </div>
              {lastViewedToggles.clubs && (
                <div className="p-2 space-y-2">
                  <div className="flex gap-2 items-start">
                    <div className="w-8 h-8 bg-gray-600 rounded-sm overflow-hidden flex-shrink-0">
                      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Ironelio" alt="Ironelio" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-xs text-white">
                      <div className="font-bold text-[#e6e6e6]">Ironelio Buonocore</div>
                      <div className="text-[#aeaeae]"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Friends */}
      <div className="mb-0 mt-1">
        <button 
          onClick={() => toggleSection('friends')}
          className="w-full bg-[#058592] px-4 py-2 font-bold text-sm text-white flex items-center justify-between hover:bg-[#046c76] transition"
        >
          <span>FRIENDS</span>
          <Triangle className="w-4 h-4 text-white fill-[#ff8d00] rotate-180" />
        </button>
        
        {openSections.friends && (
          <div className="bg-[#2b2b2b] p-2 space-y-2">
            <div className="flex justify-between items-center text-xs">
                <span className="text-white font-bold">Updated 13 min ago</span>
                <button className="bg-[#058592] text-white px-2 py-0.5 text-[10px] rounded-sm hover:bg-[#046c76]">View All</button>
            </div>
            
            <button className="w-full bg-black border border-white/20 text-white py-1.5 px-3 flex items-center gap-2 text-xs font-bold hover:bg-gray-900 transition">
                <UserPlus className="w-4 h-4" />
                <span>Invite Friends</span>
            </button>
            
            <div className="space-y-1 text-xs pl-6">
                 <Link href="#" className="flex items-center gap-2 text-gray-300 hover:text-white hover:underline">
                    <span>Search new friends</span>
                 </Link>
                 <Link href="#" className="flex items-center gap-2 text-gray-300 hover:text-white hover:underline">
                    <span>Friendship requests</span>
                 </Link>
            </div>
          </div>
        )}
      </div>

      {/* Online Friends */}
      <div className="mb-0 mt-1">
        <div className="w-full bg-[#5c6b7f] px-4 py-1 font-bold text-sm text-white border-b border-[#6c7b8f]">
          Online Friends
        </div>
        
        {openSections.onlineFriends && (
          <div className="bg-[#e6e6e6] p-2">
             <div className="bg-[#fcf8e3] border border-[#d6d6d6] flex items-center px-2 py-1 mb-2">
                <input type="text" placeholder="Amici in Chat" className="bg-transparent text-xs w-full outline-none text-gray-700 placeholder-gray-500" />
                <Search className="w-4 h-4 text-black" />
             </div>
             
             <div className="grid grid-cols-8 gap-0.5">
                {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-400 overflow-hidden">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="User" className="w-full h-full object-cover" />
                    </div>
                ))}
             </div>
          </div>
        )}
      </div>

      {/* Categories of friends */}
      <div className="mb-0 mt-1">
        <div className="w-full bg-[#5c6b7f] px-4 py-1 font-bold text-sm text-white border-b border-[#6c7b8f]">
          Categories of friends
        </div>
        
        {openSections.friendCategories && (
          <div className="bg-[#333] mt-0.5">
             <Link href="#" className="flex items-center justify-between px-3 py-2 bg-[#4f4f4f] border-b border-[#3d3d3d] hover:bg-[#3d3d3d] transition text-sm text-white group">
                <div className="flex items-center gap-3">
                   <BookUser className="w-4 h-4 text-white" />
                   <span className="font-bold text-xs">My customers</span>
                </div>
                <div className="bg-[#aeaeae] text-white text-[10px] font-bold px-1 rounded-sm group-hover:bg-[#999]">20+</div>
             </Link>
             
             <Link href="#" className="flex items-center justify-between px-3 py-2 bg-[#4f4f4f] border-b border-[#3d3d3d] hover:bg-[#3d3d3d] transition text-sm text-white group">
                <div className="flex items-center gap-3">
                   <Users className="w-4 h-4 text-white" />
                   <span className="font-bold text-xs">Users of my Country</span>
                </div>
                <div className="bg-[#aeaeae] text-white text-[10px] font-bold px-1 rounded-sm group-hover:bg-[#999]">20+</div>
             </Link>
             
             <Link href="#" className="flex items-center justify-between px-3 py-2 bg-[#4f4f4f] border-b border-[#3d3d3d] hover:bg-[#3d3d3d] transition text-sm text-white group">
                <div className="flex items-center gap-3">
                   <Star className="w-4 h-4 text-white" />
                   <span className="font-bold text-xs">My favorites</span>
                </div>
                <div className="bg-[#aeaeae] text-white text-[10px] font-bold px-1 rounded-sm group-hover:bg-[#999]">20+</div>
             </Link>
          </div>
        )}
      </div>
      
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  User, 
  Users, 
  Phone,
  Mail,
  Facebook,
  Linkedin,
  Instagram,
  Twitter,
  Menu,
  X,
  Globe,
  Dumbbell,
  LogOut,
  User as UserIcon,
  Shield,
  Trophy,
  Briefcase,
  UserCircle,
  Users2,
  Building2,
  MessageCircle,
  Newspaper,
  ShoppingCart,
  Megaphone,
  ShoppingBag
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';

// Map language codes to flag file names
const getFlagFileName = (code: string): string => {
  const flagMap: Record<string, string> = {
    'en': 'en.png',
    'fr': 'fr.png',
    'de': 'de.png',
    'it': 'it.png',
    'es': 'es.png',
    'pt': 'por.png',
    'ru': 'rus.png',
    'hi': 'ind.png',
    'zh': 'chin.png',
    'ar': 'arab.png',
    'ja': 'jap.png',      // Japanese flag
    'id': 'id.png',       // Indonesian flag
  };
  return flagMap[code] || 'en.png';
};

interface ModernNavbarProps {
  onLoginClick?: () => void;
  onAdminClick?: () => void;
}

export default function ModernNavbar({ onLoginClick, onAdminClick }: ModernNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, requireAuth, login } = useAuth();
  const { currentLanguage, setLanguage, t, availableLanguages } = useLanguage();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'username' | 'question' | 'reset'>('username');
  const [forgotPasswordUsername, setForgotPasswordUsername] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState('');
  
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Check if admin is logged in
  useEffect(() => {
    const checkAdminStatus = () => {
      const adminData = localStorage.getItem('adminUser');
      if (adminData) {
        setIsAdmin(true);
        setAdminUser(JSON.parse(adminData));
      } else {
        setIsAdmin(false);
        setAdminUser(null);
      }
    };
    
    checkAdminStatus();
    
    // Listen for storage changes
    window.addEventListener('storage', checkAdminStatus);
    return () => window.removeEventListener('storage', checkAdminStatus);
  }, []);

  // Track last visited page for each user type
  useEffect(() => {
    if (typeof window !== 'undefined' && pathname) {
      // Save last visited page for each user type
      if (pathname.startsWith('/admin/')) {
        localStorage.setItem('lastAdminPage', pathname);
      } else if (pathname.startsWith('/athlete/')) {
        localStorage.setItem('lastAthletePage', pathname);
      } else if (pathname.startsWith('/coach/')) {
        localStorage.setItem('lastCoachPage', pathname);
      } else if (pathname.startsWith('/team/')) {
        localStorage.setItem('lastTeamPage', pathname);
      } else if (pathname.startsWith('/group/')) {
        localStorage.setItem('lastGroupPage', pathname);
      } else if (pathname.startsWith('/club/')) {
        localStorage.setItem('lastClubPage', pathname);
      }
    }
  }, [pathname]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setIsLanguageDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    { href: '/', label: t('nav_home'), icon: Home },
    // Removed non-existent routes: /athletes, /coaches, /teams, /groups, /clubs
    { href: '/testimonials', label: 'Testimonials', icon: MessageCircle },
    { href: '/blog', label: t('nav_blog'), icon: MessageCircle },
    { href: '/athlete/dashboard?open=news', label: t('nav_news'), icon: Newspaper },
    { href: '/news-by-movesbook', label: t('nav_news_by_movesbook'), icon: Newspaper },
    { href: '/sell-buy', label: 'Sell/Buy', icon: ShoppingCart },
    { href: '/job-offers', label: 'Jobs', icon: Briefcase },
    { href: '/promote-yourself', label: 'Promote', icon: Megaphone },
    { href: '/our-shop', label: 'Shop', icon: ShoppingBag },
  ];

  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook', color: 'hover:text-blue-400' },
    { icon: Linkedin, href: '#', label: 'LinkedIn', color: 'hover:text-blue-500' },
    { icon: Instagram, href: '#', label: 'Instagram', color: 'hover:text-pink-500' },
    { icon: Twitter, href: '#', label: 'Twitter', color: 'hover:text-blue-400' },
  ];

  // Get current language display code
  const currentLangDisplay = currentLanguage.toUpperCase();

  const handleLogout = () => {
    logout();
    setIsUserDropdownOpen(false);
    setIsMobileMenuOpen(false);
    router.push('/');
  };

  const handleAdminLogout = () => {
    // Clear admin credentials
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setIsAdmin(false);
    setAdminUser(null);
    setIsUserDropdownOpen(false);
    setIsMobileMenuOpen(false);
    
    // Redirect to homepage
    router.push('/');
  };

  const handleProtectedLinkClick = (href: string, event: React.MouseEvent) => {
    // All navigation items are now public - no protection needed
    setIsMobileMenuOpen(false);
  };

  const handleForgotPasswordClick = () => {
    setShowForgotPasswordModal(true);
    setForgotPasswordStep('username');
    setForgotPasswordUsername('');
    setSecurityQuestion('');
    setSecurityAnswer('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotPasswordError('');
    setForgotPasswordSuccess('');
    setIsMobileMenuOpen(false);
  };

  const handleForgotPasswordSubmit = async () => {
    setForgotPasswordError('');
    setForgotPasswordSuccess('');

    if (forgotPasswordStep === 'username') {
      if (!forgotPasswordUsername.trim()) {
        setForgotPasswordError('Please enter your username or email');
        return;
      }

      try {
        const response = await fetch('/api/auth/get-security-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: forgotPasswordUsername })
        });

        const data = await response.json();

        if (response.ok && data.question) {
          setSecurityQuestion(data.question);
          setForgotPasswordStep('question');
        } else {
          setForgotPasswordError(data.error || 'User not found or no security question set');
        }
      } catch (error) {
        setForgotPasswordError('Failed to retrieve security question');
      }
    } else if (forgotPasswordStep === 'question') {
      if (!securityAnswer.trim()) {
        setForgotPasswordError('Please answer the security question');
        return;
      }

      try {
        const response = await fetch('/api/auth/verify-security-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: forgotPasswordUsername,
            answer: securityAnswer
          })
        });

        const data = await response.json();

        if (response.ok && data.verified) {
          setForgotPasswordStep('reset');
        } else {
          setForgotPasswordError(data.error || 'Incorrect answer');
        }
      } catch (error) {
        setForgotPasswordError('Failed to verify answer');
      }
    } else if (forgotPasswordStep === 'reset') {
      if (!newPassword || !confirmPassword) {
        setForgotPasswordError('Please fill in both password fields');
        return;
      }

      if (newPassword.length < 6) {
        setForgotPasswordError('Password must be at least 6 characters');
        return;
      }

      if (newPassword !== confirmPassword) {
        setForgotPasswordError('Passwords do not match');
        return;
      }

      try {
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: forgotPasswordUsername,
            answer: securityAnswer,
            newPassword: newPassword
          })
        });

        const data = await response.json();

        if (response.ok) {
          setForgotPasswordSuccess('Password reset successfully! You can now login.');
          setTimeout(() => {
            setShowForgotPasswordModal(false);
          }, 2000);
        } else {
          setForgotPasswordError(data.error || 'Failed to reset password');
        }
      } catch (error) {
        setForgotPasswordError('Failed to reset password');
      }
    }
  };

  const handleAdminClick = () => {
    // If admin is already logged in, redirect to last admin page or dashboard
    if (isAdmin) {
      const lastAdminPage = localStorage.getItem('lastAdminPage');
      router.push(lastAdminPage || '/admin/dashboard');
      setIsMobileMenuOpen(false);
    } else {
      // Show admin login modal
      if (onAdminClick) {
        onAdminClick();
      }
      setIsMobileMenuOpen(false);
    }
  };

  const handleDashboardClick = () => {
    // Close dropdowns
    setIsUserDropdownOpen(false);
    setIsMobileMenuOpen(false);
    
    // Redirect to appropriate dashboard based on user type
    if (user) {
      router.push('/athlete/dashboard');
    } else {
      // Fallback: redirect to home if user is not available
      router.push('/');
    }
  };

  const handleInlineLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('Please enter both username and password');
      return;
    }

    // Auto-cleanup old tokens before login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminToken');

    setIsLoggingIn(true);
    setLoginError('');

    try {
      // Check if this looks like an admin login attempt (common admin usernames/emails)
      const isLikelyAdmin = loginUsername.toLowerCase() === 'admin' || 
                           loginUsername.toLowerCase() === 'admin@movesbook.com' ||
                           loginUsername.toLowerCase().includes('admin');
      
      let response;
      let data;
      
      if (isLikelyAdmin) {
        // Try admin login first to avoid 401 noise
        response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginUsername,
          password: loginPassword
        })
      });

        data = await response.json();

        if (response.ok && data.user) {
          // Admin login successful
          localStorage.setItem('adminToken', data.token);
          localStorage.setItem('adminUser', JSON.stringify(data.user));
          
          // Clear form
          setLoginUsername('');
          setLoginPassword('');
          setLoginError('');
          
          // Redirect to admin dashboard
          router.push('/admin/dashboard');
          return;
        }
      }

      // Try regular user login
      response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginUsername,
          password: loginPassword
        })
      });

      data = await response.json();

      // If regular login fails and we haven't tried admin yet, try admin login
      if (!response.ok && !isLikelyAdmin) {
        response = await fetch('/api/auth/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: loginUsername,
            password: loginPassword
          })
        });

        data = await response.json();

        if (response.ok && data.user) {
          // Admin login successful
          localStorage.setItem('adminToken', data.token);
          localStorage.setItem('adminUser', JSON.stringify(data.user));
          
          // Clear form
          setLoginUsername('');
          setLoginPassword('');
          setLoginError('');
          
          // Redirect to admin dashboard
          router.push('/admin/dashboard');
          return;
        }
      }

      if (response.ok && data.user) {
        // Regular user login successful
        // Use the login function from useAuth (token first, then user)
        // The login function will automatically redirect to the appropriate dashboard
        login(data.token, data.user);
        
        // Clear form
        setLoginUsername('');
        setLoginPassword('');
        setLoginError('');
      } else {
        setLoginError(data.error || 'Invalid username or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('An error occurred. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <>
      {/* Premium Main Navigation */}
      <nav className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 shadow-2xl border-b border-purple-600 sticky top-0 z-50" style={{ overflow: 'visible' }}>
        <div className="max-w-full px-4 sm:px-6 lg:px-8" style={{ overflow: 'visible' }}>
          {/* Top Bar with Contact Info & Language */}
          <div className="flex justify-between items-center py-3 border-b border-cyan-500 border-opacity-30" style={{ overflow: 'visible' }}>
            {/* Contact Information */}
            <div className="hidden md:flex items-center space-x-6 text-cyan-100">
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span className="font-medium text-xs sm:text-sm">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span className="font-medium text-xs sm:text-sm">info@movesbook.com</span>
              </div>
            </div>

            {/* Top Navigation Links - Left and Right Groups */}
            <div className="hidden xl:flex items-center flex-1 justify-between mx-8  text-cyan-100">
              {/* Left Group */}
              <div className="flex items-center gap-6">
                <Link href="/why-movesbook" className="hover:text-white transition-colors duration-200 font-semibold whitespace-nowrap px-2 py-1">
                  {t('nav_why_movesbook')}
                </Link>
                <Link href="/dealers" className="hover:text-white transition-colors duration-200 font-semibold whitespace-nowrap px-2 py-1">
                  {t('nav_dealers')}
                </Link>
                <Link href="/subscribe-newsletter" className="hover:text-white transition-colors duration-200 font-semibold whitespace-nowrap px-2 py-1">
                  {t('nav_subscribe_newsletter')}
                </Link>
                <Link href="/references" className="hover:text-white transition-colors duration-200 font-semibold whitespace-nowrap px-2 py-1">
                  {t('nav_references')}
                </Link>
                <Link href="/about-us" className="hover:text-white transition-colors duration-200 font-semibold whitespace-nowrap px-2 py-1">
                  {t('nav_about')}
                </Link>
              </div>

              {/* Right Group */}
              <div className="flex items-center gap-6">
                <Link href="/support" className="hover:text-white transition-colors duration-200 font-semibold whitespace-nowrap px-2 py-1">
                  {t('nav_support')}
                </Link>
                <Link href="/forum" className="hover:text-white transition-colors duration-200 font-semibold whitespace-nowrap px-2 py-1">
                  {t('nav_forum')}
                </Link>
                <Link href="/blog" className="hover:text-white transition-colors duration-200 font-semibold whitespace-nowrap px-2 py-1">
                  {t('nav_blog')}
                </Link>
              </div>
            </div>

            {/* Language & Social */}
            <div className="flex items-center space-x-4">
              {/* Language Selector */}
              <div className="relative" ref={languageDropdownRef} style={{ zIndex: 150 }}>
                <button
                  onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                  className="flex items-center space-x-2 text-cyan-100 hover:text-white transition-all duration-200 px-3 py-1 rounded-lg hover:bg-white hover:bg-opacity-10"
                >
                  <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0 relative">
                    <Image 
                      src={`/flags/${getFlagFileName(currentLanguage)}`}
                      alt={`${currentLangDisplay} flag`}
                      fill
                      sizes="20px"
                      className="object-cover"
                    />
                  </div>
                  <span className="font-medium">{currentLangDisplay}</span>
                </button>
                
                {isLanguageDropdownOpen && (
                  <div 
                    className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 transition-colors"
                    style={{ 
                      zIndex: 9999,
                      position: 'absolute'
                    }}
                  >
                    <div className="p-2">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-100 dark:border-gray-700 mb-1">
                        Select Language
                      </div>
                      {availableLanguages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code);
                            setIsLanguageDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 font-medium flex items-center gap-3 ${
                            currentLanguage === lang.code ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' : 'text-gray-700 dark:text-gray-200'
                          }`}
                        >
                          <div className="w-7 h-7 rounded overflow-hidden flex-shrink-0 relative">
                            <Image 
                              src={`/flags/${getFlagFileName(lang.code)}`}
                              alt={`${lang.name} flag`}
                              fill
                              sizes="28px"
                              className="object-cover"
                            />
                          </div>
                          <span className="flex-1">{lang.name}</span>
                          {currentLanguage === lang.code && (
                            <span className="text-cyan-600 font-bold">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Social Media Links */}
              <div className="flex items-center space-x-3 border-l border-cyan-500 border-opacity-30 pl-4">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      className={`text-cyan-100 ${social.color} transition-all duration-200 hover:opacity-80`}
                      aria-label={social.label}
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Navigation Bar */}
          <div className="flex justify-between items-center h-20 relative" style={{ overflow: 'visible' }}>
            {/* Logo */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <div className="relative">
                <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center">
                  <Image
                    src="/sidelogo.png"
                    alt="Movesbook Logo"
                    width={64}
                    height={64}
                    className="object-contain scale-x-[-1] w-full h-full"
                    priority
                  />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  Movesbook
                </h1>
                <p className="text-cyan-200 text-xs font-light">Elite Training Platform</p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center justify-center flex-1 mx-2 lg:mx-4 overflow-hidden">
              <div className="flex items-center gap-1 lg:gap-2 justify-center overflow-x-auto scrollbar-hide">
                {menuItems.map((item, index) => {
                  const isActive = pathname === item.href;
                  const isHome = item.href === '/';
                  const isPublicRoute = isHome || item.href === '/testimonials' || item.href === '/athlete/dashboard?open=news' || item.href === '/sell-buy' || item.href === '/job-offers' || item.href === '/promote-yourself' || item.href === '/our-shop' || item.href === '/news-by-movesbook';
                  const canAccess = isPublicRoute || isAuthenticated;
                  
                  return (
                    <Link
                      key={item.href}
                      href={canAccess ? item.href : '#'}
                      onClick={(e) => {
                        if (!canAccess) {
                          e.preventDefault();
                          handleProtectedLinkClick(item.href, e);
                        } else {
                          handleProtectedLinkClick(item.href, e);
                        }
                      }}
                      className={`px-2 lg:px-4 py-2.5 rounded-xl text-xs lg:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-2xl'
                          : canAccess
                          ? 'text-cyan-100 hover:bg-white hover:bg-opacity-10 hover:text-white'
                          : 'text-cyan-100 opacity-60'
                      } ${isHome ? 'mr-8' : ''}`}
                      style={canAccess ? {} : { cursor: 'default' }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* User Actions */}
            <div className="hidden lg:flex items-center space-x-4 flex-shrink-0" style={{ overflow: 'visible', position: 'relative', zIndex: 100 }}>
              {isAdmin ? (
                /* Admin Logged In - Show Admin Button and Logout */
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleAdminClick}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-500 bg-opacity-10 hover:bg-opacity-20 rounded-xl border border-red-500 border-opacity-30 transition-all duration-300 cursor-pointer"
                  >
                    <Shield className="w-5 h-5 text-red-400" />
                    <span className="text-white font-medium">{adminUser?.name || 'Admin'}</span>
                  </button>
                  <button
                    onClick={handleAdminLogout}
                    className="flex items-center space-x-2 px-4 py-3 bg-red-500 bg-opacity-20 hover:bg-opacity-30 text-white rounded-xl transition-all duration-300 font-semibold"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('btn_logout')}</span>
                  </button>
                </div>
              ) : isAuthenticated ? (
                /* User Dropdown */
                <div className="relative" ref={userDropdownRef} style={{ zIndex: 150 }}>
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center space-x-2 p-2 rounded-2xl hover:bg-white hover:bg-opacity-10 transition-all duration-300"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-white truncate max-w-32">
                        {user?.name}
                      </p>
                    </div>
                  </button>

                  {isUserDropdownOpen && (
                    <div 
                      className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 transition-colors"
                      style={{ 
                        zIndex: 9999,
                        position: 'absolute',
                        overflow: 'visible'
                      }}
                    >
                      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <p className="font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                      </div>
                      
                      <div className="p-2">
                        <button
                          onClick={handleDashboardClick}
                          className="w-full flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Home className="w-4 h-4 mr-3" />
                          Dashboard
                        </button>

                        <button
                          onClick={() => {
                            router.push('/profile');
                            setIsUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <User className="w-4 h-4 mr-3" />
                          Profile
                        </button>
                        
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <LogOut className="w-4 h-4 mr-3" />
                          {t('nav_logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Inline Login Form */
                <div className="flex flex-col items-end gap-1">
                  <form onSubmit={handleInlineLogin} className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Username"
                      value={loginUsername}
                      onChange={(e) => {
                        setLoginUsername(e.target.value);
                        setLoginError('');
                      }}
                      className="px-3 py-2 bg-white bg-opacity-10 border border-cyan-500 border-opacity-30 rounded-lg text-white placeholder-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all text-sm w-40"
                      disabled={isLoggingIn}
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        setLoginError('');
                      }}
                      className="px-3 py-2 bg-white bg-opacity-10 border border-cyan-500 border-opacity-30 rounded-lg text-white placeholder-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all text-sm w-40"
                      disabled={isLoggingIn}
                      onKeyPress={(e) => e.key === 'Enter' && handleInlineLogin()}
                    />
                  <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                      {isLoggingIn ? '...' : 'Login'}
                  </button>
                  </form>
                  {loginError && (
                    <span className="text-xs text-red-300 px-2">{loginError}</span>
                  )}
                  <div className="flex items-center gap-3 px-2">
                    <Link
                      href="/register"
                      className="text-xs text-green-300 hover:text-green-100 font-semibold underline transition-colors"
                    >
                      Sign up Free
                    </Link>
                    <span className="text-gray-500">•</span>
                  <button
                      onClick={handleForgotPasswordClick}
                      className="text-xs text-cyan-200 hover:text-white underline transition-colors"
                  >
                      Forgot Password?
                  </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex-shrink-0">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-3 bg-white bg-opacity-10 rounded-2xl hover:bg-opacity-20 transition-all duration-300 text-white"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="lg:hidden py-6 border-t border-cyan-500 border-opacity-30">
              <div className="flex flex-col space-y-3">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href;
                  const isHome = item.href === '/';
                  const isPublicRoute = isHome || item.href === '/testimonials' || item.href === '/athlete/dashboard?open=news' || item.href === '/sell-buy' || item.href === '/job-offers' || item.href === '/promote-yourself' || item.href === '/our-shop';
                  const canAccess = isPublicRoute || isAuthenticated;
                  
                  return (
                    <Link
                      key={item.href}
                      href={canAccess ? item.href : '#'}
                      onClick={(e) => {
                        if (!canAccess) {
                          e.preventDefault();
                          handleProtectedLinkClick(item.href, e);
                        } else {
                          handleProtectedLinkClick(item.href, e);
                        }
                      }}
                      className={`text-center px-6 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-2xl'
                          : canAccess
                          ? 'text-cyan-100 hover:bg-white hover:bg-opacity-10'
                          : 'text-cyan-100 opacity-60'
                      }`}
                      style={canAccess ? {} : { cursor: 'default' }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                
                <div className="pt-4 border-t border-cyan-500 border-opacity-30 space-y-3">
                  {isAdmin ? (
                    /* Admin Logged In - Mobile View */
                    <>
                      <button
                        onClick={handleAdminClick}
                        className="w-full px-6 py-3 bg-red-500 bg-opacity-10 hover:bg-opacity-20 rounded-2xl border border-red-500 border-opacity-30 transition-all duration-300"
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <Shield className="w-4 h-4 text-red-400" />
                          <p className="text-white font-semibold text-sm">{t('nav_admin_access')}</p>
                        </div>
                        <p className="text-white font-semibold text-sm">{adminUser?.name}</p>
                        <p className="text-red-200 text-xs">{adminUser?.email}</p>
                      </button>
                      <button
                        onClick={handleAdminLogout}
                        className="w-full flex items-center px-6 py-4 text-red-300 hover:bg-red-500 hover:bg-opacity-20 rounded-2xl transition-all duration-300 font-semibold"
                      >
                        <LogOut className="w-5 h-5 mr-3" />
                        {t('nav_admin_logout')}
                      </button>
                    </>
                  ) : isAuthenticated ? (
                    <>
                      <div className="px-6 py-3 bg-white bg-opacity-10 rounded-2xl">
                        <p className="text-white font-semibold text-sm">{user?.name}</p>
                        <p className="text-cyan-200 text-xs">{user?.email}</p>
                      </div>
                      <button
                        onClick={handleDashboardClick}
                        className="w-full flex items-center px-6 py-4 text-cyan-100 hover:bg-white hover:bg-opacity-10 rounded-2xl transition-all duration-300 font-semibold"
                      >
                        <Home className="w-5 h-5 mr-3" />
                        Dashboard
                      </button>
                      <button
                        onClick={() => {
                          router.push('/profile');
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full flex items-center px-6 py-4 text-cyan-100 hover:bg-white hover:bg-opacity-10 rounded-2xl transition-all duration-300 font-semibold"
                      >
                        <User className="w-5 h-5 mr-3" />
                        Profile
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-6 py-4 text-red-400 hover:bg-red-500 hover:bg-opacity-20 rounded-2xl transition-all duration-300 font-semibold"
                      >
                        <LogOut className="w-5 h-5 mr-3" />
                        {t('nav_logout')}
                      </button>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <form onSubmit={handleInlineLogin} className="space-y-3">
                        <input
                          type="text"
                          placeholder="Username"
                          value={loginUsername}
                          onChange={(e) => {
                            setLoginUsername(e.target.value);
                            setLoginError('');
                          }}
                          className="w-full px-4 py-3 bg-white bg-opacity-10 border border-cyan-500 border-opacity-30 rounded-xl text-white placeholder-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
                          disabled={isLoggingIn}
                        />
                        <input
                          type="password"
                          placeholder="Password"
                          value={loginPassword}
                          onChange={(e) => {
                            setLoginPassword(e.target.value);
                            setLoginError('');
                          }}
                          className="w-full px-4 py-3 bg-white bg-opacity-10 border border-cyan-500 border-opacity-30 rounded-xl text-white placeholder-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
                          disabled={isLoggingIn}
                        />
                        {loginError && (
                          <p className="text-sm text-red-300 px-2">{loginError}</p>
                        )}
                      <button
                          type="submit"
                          disabled={isLoggingIn}
                          className="w-full px-6 py-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          {isLoggingIn ? 'Logging in...' : 'Login'}
                      </button>
                      </form>
                      
                      {/* Links below Login */}
                      <div className="flex items-center justify-center gap-3 px-2">
                        <Link
                          href="/register"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="text-sm text-green-300 hover:text-green-100 font-semibold underline transition-colors"
                        >
                          Sign up Free
                        </Link>
                        <span className="text-gray-500">•</span>
                      <button
                          onClick={handleForgotPasswordClick}
                          className="text-sm text-cyan-200 hover:text-white underline transition-colors"
                      >
                          Forgot Password?
                      </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Forgot Password</h2>
              <button
                onClick={() => setShowForgotPasswordModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            {forgotPasswordError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {forgotPasswordError}
              </div>
            )}

            {forgotPasswordSuccess && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                {forgotPasswordSuccess}
              </div>
            )}

            {forgotPasswordStep === 'username' && (
              <div>
                <p className="text-gray-600 mb-4">
                  Enter your username or email to retrieve your security question.
                </p>
                <input
                  type="text"
                  value={forgotPasswordUsername}
                  onChange={(e) => setForgotPasswordUsername(e.target.value)}
                  placeholder="Username or Email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent mb-4"
                  onKeyPress={(e) => e.key === 'Enter' && handleForgotPasswordSubmit()}
                />
                <button
                  onClick={handleForgotPasswordSubmit}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Next
                </button>
              </div>
            )}

            {forgotPasswordStep === 'question' && (
              <div>
                <p className="text-gray-600 mb-2">Security Question:</p>
                <div className="mb-4 p-3 bg-gray-100 rounded-lg">
                  <p className="font-semibold text-gray-800">{securityQuestion}</p>
                </div>
                <input
                  type="text"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="Your Answer"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent mb-4"
                  onKeyPress={(e) => e.key === 'Enter' && handleForgotPasswordSubmit()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setForgotPasswordStep('username')}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleForgotPasswordSubmit}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Verify
                  </button>
                </div>
              </div>
            )}

            {forgotPasswordStep === 'reset' && (
              <div>
                <p className="text-gray-600 mb-4">
                  Enter your new password.
                </p>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New Password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent mb-3"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent mb-4"
                  onKeyPress={(e) => e.key === 'Enter' && handleForgotPasswordSubmit()}
                />
                <button
                  onClick={handleForgotPasswordSubmit}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Reset Password
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

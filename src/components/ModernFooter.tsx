'use client';

import Link from 'next/link';
import { 
  Phone,
  Mail,
  MapPin,
  Facebook,
  Linkedin,
  Instagram,
  Twitter,
  ArrowRight
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ModernFooter() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: t('footer_quick_links'),
      links: [
        { label: t('nav_home'), href: '/' },
        { label: t('nav_about'), href: '/about' },
        { label: t('footer_services'), href: '/services' },
        { label: t('footer_pricing'), href: '/pricing' },
        { label: t('nav_blog'), href: '/blog' },
        { label: t('nav_contact'), href: '/contact' },
      ],
    },
    {
      title: t('footer_services'),
      links: [
        { label: t('footer_personal_training'), href: '/services/personal' },
        { label: t('footer_group_classes'), href: '/services/group' },
        { label: t('footer_nutrition_plans'), href: '/services/nutrition' },
        { label: t('footer_progress_tracking'), href: '/services/tracking' },
        { label: t('footer_workout_plans'), href: '/services/workouts' },
        { label: t('footer_online_coaching'), href: '/services/coaching' },
      ],
    },
    {
      title: t('nav_support'),
      links: [
        { label: t('footer_help'), href: '/help' },
        { label: t('footer_faq'), href: '/faqs' },
        { label: t('footer_privacy'), href: '/privacy' },
        { label: t('footer_terms'), href: '/terms' },
        { label: t('footer_cookie_policy'), href: '/cookies' },
        { label: t('footer_sitemap'), href: '/sitemap' },
      ],
    },
  ];

  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Twitter, href: '#', label: 'Twitter' },
  ];

  return (
    <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-white relative z-20">
      {/* Main Footer Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 max-w-full">
          {/* Company Info */}
          <div>
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">W</span>
              </div>
              <div className="ml-3">
                <h3 className="text-2xl font-bold">Movesbook</h3>
                <p className="text-blue-200 text-sm">{t('footer_tagline')}</p>
              </div>
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed">
              {t('footer_description')}
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center text-gray-300">
                <Phone className="w-4 h-4 mr-3 text-blue-400" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center text-gray-300">
                <Mail className="w-4 h-4 mr-3 text-blue-400" />
                <span>info@Movesbook.com</span>
              </div>
              <div className="flex items-center text-gray-300">
                <MapPin className="w-4 h-4 mr-3 text-blue-400" />
                <span>123 Fitness St, Sport City, SC 12345</span>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="text-lg font-semibold mb-6 text-white">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="flex items-center text-gray-300 hover:text-white transition-colors duration-200 group"
                    >
                      <ArrowRight className="w-3 h-3 mr-2 transform group-hover:translate-x-1 transition-transform" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Sponsors Video Box */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-white">
              {t('footer_sponsors_video')}
            </h4>
            <div className="bg-gray-800 rounded-xl overflow-hidden aspect-video">
              <video
                className="w-full h-full object-cover"
                controls
                autoPlay
                loop
                muted
                playsInline
                poster="/images/sponsor-poster.jpg.png"
              >
                <source src="/videos/sponsors.mp4" type="video/mp4" />
                {t('footer_video_not_supported')}
              </video>
            </div>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="mt-12 pt-8 border-t border-gray-700">
          <div className="flex flex-col lg:flex-row justify-between items-center">
            <div className="mb-6 lg:mb-0">
              <h4 className="text-xl font-semibold mb-2">{t('footer_stay_updated')}</h4>
              <p className="text-gray-300">{t('footer_newsletter_subtitle')}</p>
            </div>
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full lg:w-auto">
              <input
                type="email"
                placeholder={t('footer_email_placeholder')}
                className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 flex-1 min-w-0"
              />
              <button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl">
                {t('footer_subscribe')}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-400 text-sm">
              {t('footer_copyright').replace('2024', currentYear.toString())}
            </div>
            
            {/* Social Links */}
            <div className="flex items-center space-x-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors duration-200 group"
                    aria-label={social.label}
                  >
                    <Icon className="w-5 h-5 text-gray-400 group-hover:text-white" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
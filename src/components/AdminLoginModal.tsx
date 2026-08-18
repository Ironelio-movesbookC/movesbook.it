'use client';

import { useState, useEffect } from 'react';
import { X, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { persistAdminLoginSession } from '@/lib/panelSession';

interface AdminLoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSwitchToUserLogin?: () => void;
}

export default function AdminLoginModal({ isOpen, onClose, onSwitchToUserLogin }: AdminLoginModalProps) {
    const { t } = useLanguage();
    const [formData, setFormData] = useState({
        identifier: '', // Can be email or username
        password: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    // Auto-cleanup old tokens when modal opens
    useEffect(() => {
        if (isOpen) {
            // Clear any old/invalid tokens automatically
            console.log('🔧 Auto-cleaning authentication tokens...');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('adminUser');
            localStorage.removeItem('adminToken');
            localStorage.removeItem('superAdminUser');
        }
        
        if (!isOpen) {
            // Reset form data when modal is closed
            setFormData({
                identifier: '',
                password: ''
            });
            setError('');
            setIsLoading(false);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            console.log('Attempting admin login with:', formData.identifier);
            
            const response = await fetch('/api/auth/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();
            console.log('Admin login response:', data);

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            console.log('Admin login successful!');

            // Also set superAdminUser when isSuperAdmin so OGP News/Music recognize Super Admin
            persistAdminLoginSession(data.token, data.user);

            // Close modal and redirect to admin dashboard
            onClose();
            window.location.href = '/admin/dashboard';

        } catch (error: any) {
            console.error('Admin login error:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-md">
            <div className="relative w-full max-w-md">
                {/* Transparent Card with Glass Effect - Admin Theme */}
                <div className="bg-white bg-opacity-10 backdrop-blur-xl rounded-3xl shadow-2xl border border-red-500 border-opacity-30 p-8">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-white hover:text-red-200 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Modal Content */}
                    <div className="text-center mb-8">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 bg-opacity-20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4">
                            <Shield className="w-8 h-8 text-red-300" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">
                            {t('admin_portal')}
                        </h2>
                        <p className="text-red-100">
                            {t('admin_restricted_access')}
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500 bg-opacity-20 backdrop-blur-sm border border-red-400 border-opacity-30 text-red-200 px-4 py-3 rounded-xl mb-6">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off" key={isOpen ? 'admin-open' : 'admin-closed'}>
                        <div>
                            <label htmlFor="admin-login-identifier" className="block text-sm font-medium text-white mb-2">
                                {t('admin_email_or_username')}
                            </label>
                            <input
                                type="text"
                                id="admin-login-identifier"
                                name="admin-login-id"
                                autoComplete="new-password"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck="false"
                                required
                                value={formData.identifier}
                                onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                                className="w-full px-4 py-3 bg-white bg-opacity-10 backdrop-blur-sm border border-red-500 border-opacity-30 rounded-xl text-white placeholder-red-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all duration-200"
                                placeholder={t('admin_email_placeholder')}
                            />
                        </div>

                        <div>
                            <label htmlFor="admin-login-password" className="block text-sm font-medium text-white mb-2">
                                {t('auth_password')}
                            </label>
                            <input
                                type="password"
                                id="admin-login-password"
                                name="admin-login-pwd"
                                autoComplete="new-password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-3 bg-white bg-opacity-10 backdrop-blur-sm border border-red-500 border-opacity-30 rounded-xl text-white placeholder-red-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all duration-200"
                                placeholder={t('admin_password_placeholder')}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 px-6 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-2xl"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    {t('admin_authenticating')}
                                </div>
                            ) : (
                                t('admin_access_dashboard')
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-red-200 text-sm">
                            {t('admin_not_admin')}{' '}
                            <button
                                onClick={() => {
                                    onClose();
                                    if (onSwitchToUserLogin) {
                                        setTimeout(() => onSwitchToUserLogin(), 100);
                                    }
                                }}
                                className="text-white font-semibold hover:text-red-200 transition-colors underline"
                            >
                                {t('admin_back_to_user_login')}
                            </button>
                        </p>
                    </div>
                </div>

                {/* Decorative Glow Effect - Red Theme for Admin */}
                <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-red-600 rounded-3xl blur-xl opacity-20 -z-10"></div>
            </div>
        </div>
    );
}


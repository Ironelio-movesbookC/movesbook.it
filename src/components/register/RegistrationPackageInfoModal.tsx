'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import {
  formatRegistrationPrice,
  getPackageReviewRows,
  getUserTypeReviewLabel,
  getVersionColumnsForUserType,
  type RegistrationUserType,
} from '@/lib/registration/waysToGetStarted';

type RegistrationPackageInfoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userType: RegistrationUserType;
  lang: string;
};

export default function RegistrationPackageInfoModal({
  isOpen,
  onClose,
  userType,
  lang,
}: RegistrationPackageInfoModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const versionColumns = getVersionColumnsForUserType(userType);
  const packages = getPackageReviewRows(userType, lang);
  const userTypeLabel = getUserTypeReviewLabel(userType);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-label="Close"
      />

      <div className="relative z-10 flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-[#e8861a] shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-4 sm:px-6 pt-5 pb-3">
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-4xl font-bold italic text-white uppercase tracking-wide">
              Product Review
            </h2>
            <p className="mt-2 text-sm sm:text-base text-white/95 max-w-2xl leading-snug">
              Sign-up today for a free Training Log account and get unprecedented insight into
              your workouts
            </p>
          </div>
          <div className="flex shrink-0 gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="bg-[#444] hover:bg-[#222] text-white text-xs sm:text-sm font-bold px-4 py-2 rounded shadow"
            >
              Back
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-2 sm:px-4 pb-4">
          <div className="min-w-[640px] border border-[#cf7614] bg-[#e8861a]">
            <table className="w-full border-collapse text-white">
              <thead>
                <tr className="border-b border-[#cf7614]">
                  <th
                    rowSpan={2}
                    className="border-r border-[#cf7614] px-3 py-3 text-left align-bottom w-[42%]"
                  >
                    <div className="text-sm font-bold uppercase">Package</div>
                  </th>
                  <th
                    colSpan={versionColumns.length}
                    className="border-b border-[#cf7614] px-2 py-2 text-center text-sm font-bold uppercase"
                  >
                    {userTypeLabel}
                  </th>
                </tr>
                <tr className="border-b border-[#cf7614]">
                  {versionColumns.map((version) => (
                    <th
                      key={version.key}
                      className="border-r border-[#cf7614] last:border-r-0 px-2 py-2 text-center align-top min-w-[88px]"
                    >
                      <div className="text-xs sm:text-sm font-bold leading-tight">
                        {version.label}
                      </div>
                      <div className="mt-1 text-[11px] sm:text-xs font-semibold text-[#fff3d6]">
                        {formatRegistrationPrice(version.price)}
                      </div>
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-[#cf7614] bg-[#d97a14]">
                  <td className="border-r border-[#cf7614] px-3 py-2 text-xs font-semibold italic text-white/95">
                    Prices for one your account
                  </td>
                  {versionColumns.map((version) => (
                    <td
                      key={`price-${version.key}`}
                      className="border-r border-[#cf7614] last:border-r-0 px-2 py-2 text-center text-xs font-semibold text-[#fff3d6]"
                    >
                      {formatRegistrationPrice(version.price)}
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {packages.length === 0 ? (
                  <tr>
                    <td
                      colSpan={versionColumns.length + 1}
                      className="px-4 py-8 text-center text-sm text-white/90"
                    >
                      No published packages available.
                    </td>
                  </tr>
                ) : (
                  packages.map((pkg, index) => (
                    <tr
                      key={pkg.id}
                      className={`border-b border-[#cf7614] ${
                        index % 2 === 0 ? 'bg-[#e8861a]' : 'bg-[#df8018]'
                      }`}
                    >
                      <td className="border-r border-[#cf7614] px-3 py-3 align-top">
                        <div className="font-bold text-sm uppercase leading-snug mb-1">
                          {pkg.title}
                        </div>
                        <p className="text-xs text-white/90 leading-relaxed line-clamp-3">
                          {pkg.description || '—'}
                        </p>
                      </td>
                      {versionColumns.map((version) => {
                        const enabled = pkg.tiers[version.key] ?? false;
                        return (
                          <td
                            key={`${pkg.id}-${version.key}`}
                            className="border-r border-[#cf7614] last:border-r-0 px-2 py-3 text-center align-middle"
                          >
                            {enabled ? (
                              <Check
                                className="mx-auto h-6 w-6 text-[#7cfc00] stroke-[3]"
                                aria-label="Included"
                              />
                            ) : (
                              <span className="inline-block h-6 w-6" aria-hidden />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 sm:hidden text-white/80 hover:text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>,
    document.body,
  );
}

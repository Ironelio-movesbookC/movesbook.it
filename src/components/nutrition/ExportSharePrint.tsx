'use client';

import React, { useState } from 'react';
import { Download, Share2, Printer, X } from 'lucide-react';

interface ExportSharePrintProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'day' | 'week' | 'plan';
  id: string;
  data?: any;
}

export default function ExportSharePrint({
  isOpen,
  onClose,
  type,
  id,
  data
}: ExportSharePrintProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'share' | 'print'>('export');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf'>('json');
  const [shareMethod, setShareMethod] = useState<'link' | 'email' | 'social'>('link');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExport = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/nutrition/export?format=${exportFormat}&type=${type}&id=${id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      if (exportFormat === 'json' || exportFormat === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workout-${type}-${id}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (exportFormat === 'pdf') {
        const data = await response.json();
        // For PDF, you would integrate a library like jsPDF here
        alert('PDF export will be available soon. Data is ready for PDF generation.');
      }

      alert(`${exportFormat.toUpperCase()} export successful!`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShare = async () => {
    setIsProcessing(true);
    try {
      if (shareMethod === 'link') {
        const shareUrl = `${window.location.origin}/shared/${type}/${id}`;
        await navigator.clipboard.writeText(shareUrl);
        alert('Share link copied to clipboard!');
      } else if (shareMethod === 'email') {
        const subject = `Workout ${type} - ${id}`;
        const body = `Check out my workout: ${window.location.origin}/shared/${type}/${id}`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      } else if (shareMethod === 'social') {
        alert('Social sharing will be available soon!');
      }
    } catch (error) {
      console.error('Share error:', error);
      alert('Sharing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    // Use browser's native print dialog
    // This will print the current page with all CSS print styles applied
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-lg font-bold">Export, Share & Print</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'export'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Download size={16} className="inline mr-2" />
            Export
          </button>
          <button
            onClick={() => setActiveTab('share')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'share'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Share2 size={16} className="inline mr-2" />
            Share
          </button>
          <button
            onClick={() => setActiveTab('print')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'print'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Printer size={16} className="inline mr-2" />
            Print
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {activeTab === 'export' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Export your workout data in various formats
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Format:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="json"
                      checked={exportFormat === 'json'}
                      onChange={(e) => setExportFormat(e.target.value as any)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">JSON</div>
                      <div className="text-xs text-gray-500">Raw data format, good for backups</div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={(e) => setExportFormat(e.target.value as any)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">CSV</div>
                      <div className="text-xs text-gray-500">Spreadsheet format, good for analysis</div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="pdf"
                      checked={exportFormat === 'pdf'}
                      onChange={(e) => setExportFormat(e.target.value as any)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">PDF</div>
                      <div className="text-xs text-gray-500">Document format, good for sharing</div>
                    </div>
                  </label>
                </div>
              </div>
              <button
                onClick={handleExport}
                disabled={isProcessing}
                className="w-full px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isProcessing ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
              </button>
            </div>
          )}

          {activeTab === 'share' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Share your workout with others
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share via:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="link"
                      checked={shareMethod === 'link'}
                      onChange={(e) => setShareMethod(e.target.value as any)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">Copy Link</div>
                      <div className="text-xs text-gray-500">Share a direct link to this workout</div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="email"
                      checked={shareMethod === 'email'}
                      onChange={(e) => setShareMethod(e.target.value as any)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">Email</div>
                      <div className="text-xs text-gray-500">Send via email</div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="social"
                      checked={shareMethod === 'social'}
                      onChange={(e) => setShareMethod(e.target.value as any)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">Social Media</div>
                      <div className="text-xs text-gray-500">Share on social platforms</div>
                    </div>
                  </label>
                </div>
              </div>
              <button
                onClick={handleShare}
                disabled={isProcessing}
                className="w-full px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {isProcessing ? 'Sharing...' : 'Share'}
              </button>
            </div>
          )}

          {activeTab === 'print' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Print your workout in a formatted layout
              </p>
              <div className="bg-gray-50 p-4 rounded">
                <h4 className="font-medium mb-2">Print Options:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✓ Include workout details</li>
                  <li>✓ Include nutrition_foods</li>
                  <li>✓ Include nutrition_components</li>
                  <li>✓ Print-friendly layout</li>
                </ul>
              </div>
              <button
                onClick={handlePrint}
                className="w-full px-4 py-2 text-white bg-purple-600 rounded hover:bg-purple-700"
              >
                Open Print Dialog
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-3 flex justify-end rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


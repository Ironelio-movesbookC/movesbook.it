'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, GripVertical, ArrowUpAZ, ArrowDownZA, Save, X, Download, Globe, Image as ImageIcon, Smile, Grid3x3, List, ArrowUpDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToolsData } from '@/hooks/useToolsData';
import {
  Period,
  WorkoutSection,
  BodyBuildingTechnique,
  Sport,
  Equipment,
  Exercise,
  Device,
  IconType,
  ToolsTab,
  SUPPORTED_LANGUAGES,
  DEFAULT_SPORTS,
  filterBySearch,
  filterByCategory,
  reorderItems
} from '@/constants/tools.constants';
import { SPORTS_LIST, getSportDisplayName } from '@/constants/moveframe.constants';

interface ToolsSettingsProps {
  isAdmin?: boolean;
  userType?: string;
}

export default function ToolsSettings({ isAdmin = false, userType = 'ATHLETE' }: ToolsSettingsProps = {}) {
  const { t, currentLanguage } = useLanguage();
  
  // Use custom hook for data management
  const {
    periods,
    sections,
    bodyBuildingTechniques,
    sports,
    equipment,
    exercises,
    devices,
    iconType,
    isLoadingIconPreference,
    isSavingToDatabase,
    lastSavedTime,
    setPeriods,
    setSections,
    setBodyBuildingTechniques,
    setSports,
    setEquipment,
    setExercises,
    setDevices,
    setIconType,
    setIsSavingToDatabase,
    setLastSavedTime,
    loadToolsSettingsFromDatabase,
    saveToLocalStorage,
    saveToDatabase
  } = useToolsData();
  
  const [activeTab, setActiveTab] = useState<ToolsTab>('periods');
  const [editingItem, setEditingItem] = useState<Period | WorkoutSection | null>(null);
  const [editItemTranslations, setEditItemTranslations] = useState<Record<string, { title: string; description: string }>>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', code: '', description: '', color: '#3b82f6', sports: [] as string[] });
  const [newItemTranslations, setNewItemTranslations] = useState<Record<string, { title: string; description: string }>>({});
  const [activeInputLanguage, setActiveInputLanguage] = useState('en');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [draggedSport, setDraggedSport] = useState<string | null>(null);
  const [dragOverSport, setDragOverSport] = useState<string | null>(null);
  const [showEquipmentDialog, setShowEquipmentDialog] = useState(false);
  const [showExerciseDialog, setShowExerciseDialog] = useState(false);
  const [showDeviceDialog, setShowDeviceDialog] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const [showEditSportDialog, setShowEditSportDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Equipment view and sort state
  const [equipmentViewMode, setEquipmentViewMode] = useState<'cards' | 'table'>('cards');
  const [equipmentSortField, setEquipmentSortField] = useState<'name' | 'category' | 'company' | 'startDate'>('name');
  const [equipmentSortDirection, setEquipmentSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Language-specific defaults state
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage || 'en');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  
  // Get current user ID for ownership checking
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  useEffect(() => {
    // Get user ID from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUserId(user.id || null);
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
      }
    }
    
    // Mark initial load as complete after first render
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 500); // Wait 500ms for all data to load
    
    return () => clearTimeout(timer);
  }, []);
  
  // Auto-update selected language when user's language changes
  useEffect(() => {
    if (currentLanguage) {
      setSelectedLanguage(currentLanguage);
    }
  }, [currentLanguage]);
  
  // Equipment sorting function
  const sortEquipment = (equipmentList: Equipment[]) => {
    return [...equipmentList].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';
      
      switch (equipmentSortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case 'company':
          aValue = (a.company || '').toLowerCase();
          bValue = (b.company || '').toLowerCase();
          break;
        case 'startDate':
          aValue = a.startDate ? new Date(a.startDate).getTime() : 0;
          bValue = b.startDate ? new Date(b.startDate).getTime() : 0;
          break;
      }
      
      if (equipmentSortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };
  
  // Handle equipment column sort
  const handleEquipmentSort = (field: 'name' | 'category' | 'company' | 'startDate') => {
    if (equipmentSortField === field) {
      setEquipmentSortDirection(equipmentSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setEquipmentSortField(field);
      setEquipmentSortDirection('asc');
    }
  };
  
  // Data loading is now handled by useToolsData hook
  // All loading functions removed - handled by useToolsData hook

  // Manual save handler (uses hook)
  const handleManualSave = async () => {
    await saveToDatabase();
    alert('✅ All tools settings saved to database successfully!');
  };

  // Use refs to track previous values and prevent unnecessary re-renders
  const prevPeriodsRef = useRef<Period[]>([]);
  const prevSectionsRef = useRef<WorkoutSection[]>([]);
  const prevBodyBuildingTechniquesRef = useRef<BodyBuildingTechnique[]>([]);
  const prevSportsRef = useRef<Sport[]>([]);
  const prevEquipmentRef = useRef<Equipment[]>([]);
  const prevExercisesRef = useRef<Exercise[]>([]);
  const prevDevicesRef = useRef<Device[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced auto-save (uses hook)
  useEffect(() => {
    // Don't auto-save during initial load
    if (isInitialLoad) {
      console.log('⏭️ Skipping auto-save: initial load in progress');
      // Update refs on initial load
      prevPeriodsRef.current = periods;
      prevSectionsRef.current = sections;
      prevBodyBuildingTechniquesRef.current = bodyBuildingTechniques;
      prevSportsRef.current = sports;
      prevEquipmentRef.current = equipment;
      prevExercisesRef.current = exercises;
      prevDevicesRef.current = devices;
      return;
    }
    
    // Don't auto-save if data is being loaded initially
    if (periods.length === 0 && sections.length === 0 && sports.length === 0) {
      return;
    }
    
    // Check if data actually changed (deep comparison by length and IDs)
    const periodsChanged = JSON.stringify(periods) !== JSON.stringify(prevPeriodsRef.current);
    const sectionsChanged = JSON.stringify(sections) !== JSON.stringify(prevSectionsRef.current);
    const techniquesChanged = JSON.stringify(bodyBuildingTechniques) !== JSON.stringify(prevBodyBuildingTechniquesRef.current);
    const sportsChanged = JSON.stringify(sports) !== JSON.stringify(prevSportsRef.current);
    const equipmentChanged = JSON.stringify(equipment) !== JSON.stringify(prevEquipmentRef.current);
    const exercisesChanged = JSON.stringify(exercises) !== JSON.stringify(prevExercisesRef.current);
    const devicesChanged = JSON.stringify(devices) !== JSON.stringify(prevDevicesRef.current);
    
    if (!periodsChanged && !sectionsChanged && !techniquesChanged && !sportsChanged && !equipmentChanged && !exercisesChanged && !devicesChanged) {
      console.log('⏭️ Skipping auto-save: no changes detected');
      return;
    }
    
    // Don't trigger auto-save if a save is already in progress
    if (isSavingToDatabase) {
      console.log('⏭️ Skipping auto-save: save already in progress');
      return;
    }
    
    console.log('💾 Auto-save triggered: changes detected');
    if (periodsChanged) console.log('  - Periods changed');
    if (sectionsChanged) console.log('  - Sections changed');
    if (techniquesChanged) console.log('  - Techniques changed');
    
    // Save to localStorage immediately (backup)
    saveToLocalStorage(periods, sections, bodyBuildingTechniques, sports, equipment, exercises, devices);
    
    // Clear any pending save timeout
    if (saveTimeoutRef.current) {
      console.log('⏱️  Cancelling previous save timeout (debouncing)');
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce database save (wait 1 second after last change)
    saveTimeoutRef.current = setTimeout(() => {
      console.log('💾 Saving to database...');
      saveToDatabase().then(() => {
        console.log('✅ Database save complete');
        saveTimeoutRef.current = null;
      }).catch((error) => {
        console.error('❌ Database save failed:', error);
        saveTimeoutRef.current = null;
      });
    }, 1000);
    
    // Update refs immediately so next change is detected
    prevPeriodsRef.current = periods;
    prevSectionsRef.current = sections;
    prevBodyBuildingTechniquesRef.current = bodyBuildingTechniques;
    prevSportsRef.current = sports;
    prevEquipmentRef.current = equipment;
    prevExercisesRef.current = exercises;
    prevDevicesRef.current = devices;
    
    // Cleanup function - only clear timeout, don't return it
    return () => {
      // Don't cancel if save is in progress, just cancel pending timeout
      if (saveTimeoutRef.current) {
        console.log('🧹 Cleanup: clearing pending save timeout');
        clearTimeout(saveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periods, sections, bodyBuildingTechniques, sports, equipment, exercises, devices, isInitialLoad, isSavingToDatabase]);

  const getActiveItems = () => {
    if (activeTab === 'periods') return periods;
    if (activeTab === 'sections') return sections;
    if (activeTab === 'bodyBuildingTechniques') return bodyBuildingTechniques;
    return sections;
  };

  const setActiveItems = (items: Period[] | WorkoutSection[] | BodyBuildingTechnique[]) => {
    if (activeTab === 'periods') {
      setPeriods(items as Period[]);
    } else if (activeTab === 'sections') {
      setSections(items as WorkoutSection[]);
    } else if (activeTab === 'bodyBuildingTechniques') {
      setBodyBuildingTechniques(items as BodyBuildingTechnique[]);
    }
  };

  const handleAdd = () => {
    if (isAdmin) {
      // Admin: Validate that at least one language has a title
      const hasAtLeastOneTitle = Object.values(newItemTranslations).some(trans => trans.title.trim());
      
      if (!hasAtLeastOneTitle) {
        alert('Please enter a title in at least one language');
        return;
      }

      // Validate character limits for all languages
      for (const [lang, trans] of Object.entries(newItemTranslations)) {
        if (trans.title && trans.title.length > 30) {
          alert(`Title in ${lang.toUpperCase()} must be 30 characters or less`);
          return;
        }
        if (trans.description && trans.description.length > 255) {
          alert(`Description in ${lang.toUpperCase()} must be 255 characters or less`);
          return;
        }
      }
    } else {
      // Non-Admin: Only validate current language
      if (!newItem.title || !newItem.title.trim()) {
        alert('Please enter a title');
        return;
      }
      if (newItem.title.length > 30) {
        alert('Title must be 30 characters or less');
        return;
      }
      if (newItem.description && newItem.description.length > 255) {
        alert('Description must be 255 characters or less');
        return;
      }
    }

    const items = getActiveItems();
    const newId = Date.now().toString();
    
    // Use current language translation for the main entry (database)
    const currentLangData = isAdmin 
      ? (newItemTranslations[currentLanguage] || newItemTranslations['en'] || { title: '', description: '' })
      : { title: newItem.title, description: newItem.description };
    
    const newEntry = {
      id: newId,
      title: isAdmin 
        ? (currentLangData.title || Object.values(newItemTranslations).find(t => t.title)?.title || '')
        : newItem.title,
      description: currentLangData.description || '',
      color: newItem.color,
      order: items.length,
      isUserCreated: !isAdmin, // Tag user-created items
      ...(activeTab === 'sections' && { code: newItem.code || '' }), // Add code field for sections
      ...(activeTab === 'bodyBuildingTechniques' && { sports: newItem.sports || [] }) // Add sports field for execution techniques
    };

    // Save translations to localStorage
    const itemType = activeTab === 'periods' ? 'periods' : 'sections';
    
    if (isAdmin) {
      // Admin: Save for all languages
      SUPPORTED_LANGUAGES.forEach(lang => {
        const langData = newItemTranslations[lang.code];
        if (langData && (langData.title || langData.description)) {
          // Load existing language library
          const storageKey = `tools_${itemType}_${lang.code}`;
          const existingDataStr = localStorage.getItem(storageKey);
          const existingData = existingDataStr ? JSON.parse(existingDataStr) : [];
          
          // Add new item with translations
          const langEntry = {
            id: newId,
            title: langData.title || '',
            description: langData.description || '',
            color: newItem.color,
            order: items.length,
            isUserCreated: false,
          };
          
          existingData.push(langEntry);
          localStorage.setItem(storageKey, JSON.stringify(existingData));
        }
      });
    } else {
      // Non-Admin: Only save for current language
      const storageKey = `tools_${itemType}_${selectedLanguage}`;
      const existingDataStr = localStorage.getItem(storageKey);
      const existingData = existingDataStr ? JSON.parse(existingDataStr) : [];
      
      const langEntry = {
        id: newId,
        title: newItem.title,
        description: newItem.description,
        color: newItem.color,
        order: items.length,
        isUserCreated: true,
      };
      
      existingData.push(langEntry);
      localStorage.setItem(storageKey, JSON.stringify(existingData));
    }

    setActiveItems([...items, newEntry]);
    setNewItem({ title: '', code: '', description: '', color: '#3b82f6', sports: [] as string[] });
    setNewItemTranslations({});
    setActiveInputLanguage('en');
    setShowAddDialog(false);
  };

  const handleEdit = (item: Period | WorkoutSection) => {
    // Check if user owns this item
    if (currentUserId && item.userId && item.userId !== currentUserId) {
      alert('⚠️ You cannot edit this item because it was not created by you.\n\nOnly items you created can be edited.');
      return;
    }
    
    setEditingItem({ ...item });
    
    // Initialize translations with current values from the database item
    // Since periods/sections are now in Prisma database (not localStorage language libraries),
    // we initialize all languages with the same values from the database
    const translations: Record<string, { title: string; description: string }> = {};
    
    SUPPORTED_LANGUAGES.forEach(lang => {
      // Initialize with current database values
      translations[lang.code] = {
        title: item.title || '',
        description: item.description || ''
      };
      
      // Also try to load from localStorage for backward compatibility
      const itemType = activeTab === 'periods' ? 'periods' : 'sections';
      const storageKey = `tools_${itemType}_${lang.code}`;
      const existingDataStr = localStorage.getItem(storageKey);
      if (existingDataStr) {
        try {
          const existingData = JSON.parse(existingDataStr);
          const existingItem = existingData.find((i: any) => i.id === item.id);
          if (existingItem) {
            translations[lang.code] = {
              title: existingItem.title || item.title || '',
              description: existingItem.description || item.description || ''
            };
          }
        } catch (e) {
          console.error(`Error loading ${lang.code} translation:`, e);
        }
      }
    });
    
    setEditItemTranslations(translations);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;

    if (isAdmin) {
      // Admin: Validate that at least English OR Italian is filled (MANDATORY)
      const hasEnglish = editItemTranslations['en']?.title && editItemTranslations['en'].title.trim() !== '';
      const hasItalian = editItemTranslations['it']?.title && editItemTranslations['it'].title.trim() !== '';
      
      if (!hasEnglish && !hasItalian) {
        alert('❌ MANDATORY: At least English or Italian translation is required!\n\nPlease fill in the title for:\n• English (EN) OR\n• Italian (IT)\n\nOne of these two languages must be filled.');
        return;
      }

      // Validate all language translations
      for (const [lang, trans] of Object.entries(editItemTranslations)) {
        if (trans.title && trans.title.length > 30) {
          alert(`Title in ${lang.toUpperCase()} must be 30 characters or less`);
          return;
        }
        if (trans.description && trans.description.length > 255) {
          alert(`Description in ${lang.toUpperCase()} must be 255 characters or less`);
          return;
        }
      }

      // Update the editingItem with the current language's values (use English as default)
      const currentLangData = editItemTranslations[currentLanguage] || editItemTranslations['en'] || Object.values(editItemTranslations)[0];
      if (currentLangData) {
        editingItem.title = currentLangData.title || editingItem.title;
        editingItem.description = currentLangData.description || editingItem.description;
      }
    } else {
      // Non-Admin: Validate current language only
      if (!editingItem.title || !editingItem.title.trim()) {
        alert('Please enter a title');
        return;
      }
      if (editingItem.title.length > 30) {
        alert('Title must be 30 characters or less');
        return;
      }
      if (editingItem.description && editingItem.description.length > 255) {
        alert('Description must be 255 characters or less');
        return;
      }
    }

    console.log('💾 Saving edited item:', {
      id: editingItem.id,
      title: editingItem.title,
      description: editingItem.description,
      currentLanguage,
      translationsKeys: Object.keys(editItemTranslations)
    });

    // Update in current state - Force new array reference for React to detect changes
    const items = getActiveItems();
    const updated = [...items].map(item => 
      item.id === editingItem.id ? { ...editingItem } : item
    );
    setActiveItems(updated);
    
    console.log('✅ State updated with:', updated);
    
    // Save to language libraries
    const itemType = activeTab === 'periods' ? 'periods' : 'sections';
    
    if (isAdmin) {
      // Admin: Save to all language libraries
      SUPPORTED_LANGUAGES.forEach(lang => {
        const langData = editItemTranslations[lang.code];
        if (langData && (langData.title || langData.description)) {
          const storageKey = `tools_${itemType}_${lang.code}`;
          const existingDataStr = localStorage.getItem(storageKey);
          const existingData = existingDataStr ? JSON.parse(existingDataStr) : [];
          
          // Find and update the item
          const itemIndex = existingData.findIndex((i: any) => i.id === editingItem.id);
          if (itemIndex >= 0) {
            existingData[itemIndex] = {
              ...existingData[itemIndex],
              title: langData.title || '',
              description: langData.description || '',
              color: editingItem.color,
              ...(activeTab === 'sections' && { code: (editingItem as any).code || '' })
            };
          } else {
            // Add if doesn't exist
            existingData.push({
              id: editingItem.id,
              title: langData.title || '',
              description: langData.description || '',
              color: editingItem.color,
              order: existingData.length,
            ...(activeTab === 'sections' && { code: (editingItem as any).code || '' })
          });
        }
        
        localStorage.setItem(storageKey, JSON.stringify(existingData));
        }
      });
    } else {
      // Non-Admin: Only save to current language
      const storageKey = `tools_${itemType}_${selectedLanguage}`;
      const existingDataStr = localStorage.getItem(storageKey);
      const existingData = existingDataStr ? JSON.parse(existingDataStr) : [];
      
      const itemIndex = existingData.findIndex((i: any) => i.id === editingItem.id);
      if (itemIndex >= 0) {
        existingData[itemIndex] = {
          ...existingData[itemIndex],
          title: editingItem.title,
          description: editingItem.description,
          color: editingItem.color,
          ...(activeTab === 'sections' && { code: (editingItem as any).code || '' })
        };
      } else {
        // Add if doesn't exist
        existingData.push({
          id: editingItem.id,
          title: editingItem.title,
          description: editingItem.description,
          color: editingItem.color,
          order: existingData.length,
          isUserCreated: true,
          ...(activeTab === 'sections' && { code: (editingItem as any).code || '' })
        });
      }
      
      localStorage.setItem(storageKey, JSON.stringify(existingData));
    }
    
    setEditingItem(null);
    setEditItemTranslations({});
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this item?')) return;
    
    const items = getActiveItems();
    const updated = items.filter(item => item.id !== id);
    setActiveItems(updated);
  };

  const handleSortAZ = () => {
    const items = getActiveItems();
    const sorted = [...items].sort((a, b) => a.title.localeCompare(b.title));
    setActiveItems(sorted.map((item, index) => ({ ...item, order: index })));
  };

  const handleSortZA = () => {
    const items = getActiveItems();
    const sorted = [...items].sort((a, b) => b.title.localeCompare(a.title));
    setActiveItems(sorted.map((item, index) => ({ ...item, order: index })));
  };

  const handleDragStart = (id: string) => {
    setDraggedItem(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === id) return;

    const items = getActiveItems();
    const draggedIndex = items.findIndex(item => item.id === draggedItem);
    const targetIndex = items.findIndex(item => item.id === id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newItems = [...items];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, removed);

    setActiveItems(newItems.map((item, index) => ({ ...item, order: index })));
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedItem(null);
  };

  // Language-specific defaults handlers
  const saveLanguageDefaults = async () => {
    setShowPasswordDialog(true);
  };

  const loadLanguageDefaults = async () => {
    setShowLoadDialog(true);
  };

  const handlePasswordSubmit = async () => {
    if (!superAdminPassword.trim()) {
      alert(`❌ Please enter ${isAdmin ? 'Super Admin' : 'your'} password`);
      return;
    }

    try {
      // Verify password first
      const token = localStorage.getItem('token');
      console.log('🔐 Token from localStorage:', token ? 'Present' : 'Missing');
      
      const verifyEndpoint = isAdmin 
        ? '/api/admin/super-admin/verify' 
        : '/api/user/verify-password';
      
      console.log('🔐 Using endpoint:', verifyEndpoint);
      console.log('🔐 Is admin mode:', isAdmin);
      
      const verifyHeaders: HeadersInit = { 'Content-Type': 'application/json' };
      if (!isAdmin && token) {
        verifyHeaders['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('🔐 Request headers:', verifyHeaders);
      
      const verifyResponse = await fetch(verifyEndpoint, {
        method: 'POST',
        headers: verifyHeaders,
        body: JSON.stringify({ password: superAdminPassword })
      });

      console.log('🔐 Verify response status:', verifyResponse.status);
      const verifyData = await verifyResponse.json();
      console.log('🔐 Verify response data:', verifyData);
      
      if (!verifyData.valid) {
        alert(`❌ Invalid password`);
        return;
      }

      const toolsData = {
        periods,
        sections,
        sports,
        equipment,
        exercises,
        devices
      };

      if (isAdmin) {
        // Admin mode: Save as language defaults
        const response = await fetch('/api/admin/tools-defaults/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: selectedLanguage,
            toolsData,
            password: superAdminPassword
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          const languageName = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || selectedLanguage;
          alert(`✅ Success! ALL settings saved as ${languageName.toUpperCase()} defaults!\n\n📋 Saved to ${languageName.toUpperCase()}:\n✓ Periods, Sections, Sports\n✓ Equipment, Exercises, Library, Devices\n\n👥 These settings are now available for ${languageName}-speaking users when they click "Load Admin Defaults" button.`);
          setShowPasswordDialog(false);
          setSuperAdminPassword('');
        } else {
          console.error('❌ Save failed:', data);
          alert(`❌ ${data.error || 'Failed to save defaults'}\n\nDetails: ${data.details || 'No additional details'}`);
        }
      } else {
        // Personal mode: Save to user's personal settings
        if (!token) {
          alert('❌ Please login to save settings');
          return;
        }

        const response = await fetch('/api/user/settings/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            toolsSettings: toolsData
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          alert('✅ Personal settings saved successfully!');
          setShowPasswordDialog(false);
          setSuperAdminPassword('');
        } else {
          console.error('❌ Save failed:', data);
          alert(`❌ ${data.error || 'Failed to save settings'}\n\nDetails: ${data.details || 'No additional details'}`);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error saving settings');
    }
  };

  // Auto-load language terms when language is selected
  const loadLanguageTerms = async (languageCode: string) => {
    try {
      console.log('🌍 Loading terms for language:', languageCode);
      const response = await fetch(`/api/admin/tools-defaults/load?language=${languageCode}`);
      const data = await response.json();

      if (response.ok && data.toolsData) {
        // Load and force re-render with new array references
        if (data.toolsData.periods) {
          setPeriods([...data.toolsData.periods]);
        }
        if (data.toolsData.sections) {
          setSections([...data.toolsData.sections]);
        }
        if (data.toolsData.sports) {
          setSports([...data.toolsData.sports]);
        }
        if (data.toolsData.equipment) {
          setEquipment([...data.toolsData.equipment]);
        }
        if (data.toolsData.exercises) {
          setExercises([...data.toolsData.exercises]);
        }
        if (data.toolsData.devices) {
          setDevices([...data.toolsData.devices]);
        }
        console.log('✅ Terms loaded for', languageCode);
      } else {
        console.log('ℹ️ No data found for', languageCode);
      }
    } catch (error) {
      console.error('Error loading language terms:', error);
    }
  };

  // Handle Load Admin Defaults (for non-admin users)
  const handleLoadAdminDefaults = async () => {
    const languageName = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || selectedLanguage;
    
    const confirmed = window.confirm(
      `⚠️ Warning\n\n` +
      `Loading the Admin settings will load the settings made by Movesbook in ${languageName}.\n\n` +
      `They will substitute all the previous Default settings loaded by you but will not affect the items inserted by you manually.\n\n` +
      `Do you want to continue?`
    );
    
    if (!confirmed) return;
    
    try {
      console.log('📥 Loading Admin defaults for language:', selectedLanguage);
      const response = await fetch(`/api/admin/tools-defaults/load?language=${selectedLanguage}`);
      const data = await response.json();

      if (response.ok && data.toolsData) {
        // Get current user-created items (items with isUserCreated flag)
        const userPeriods = periods.filter((p: any) => p.isUserCreated);
        const userSections = sections.filter((s: any) => s.isUserCreated);
        const userEquipment = equipment.filter((e: any) => e.isUserCreated);
        const userExercises = exercises.filter((ex: any) => ex.isUserCreated);
        const userDevices = devices.filter((d: any) => d.isUserCreated);
        
        // Load admin defaults and merge with user-created items
        if (data.toolsData.periods) {
          setPeriods([...data.toolsData.periods, ...userPeriods]);
        }
        if (data.toolsData.sections) {
          setSections([...data.toolsData.sections, ...userSections]);
        }
        if (data.toolsData.sports) {
          setSports([...data.toolsData.sports]); // Sports are read-only for users
        }
        if (data.toolsData.equipment) {
          setEquipment([...data.toolsData.equipment, ...userEquipment]);
        }
        if (data.toolsData.exercises) {
          setExercises([...data.toolsData.exercises, ...userExercises]);
        }
        if (data.toolsData.devices) {
          setDevices([...data.toolsData.devices, ...userDevices]);
        }
        
        alert(`✅ Success!\n\nAdmin defaults for ${languageName} have been loaded.\n\nYour manually created items have been preserved.`);
        console.log('✅ Admin defaults loaded, user items preserved');
      } else {
        alert(`❌ No admin defaults found for ${languageName}`);
      }
    } catch (error) {
      console.error('Error loading admin defaults:', error);
      alert('❌ Error loading admin defaults. Please try again.');
    }
  };

  // Get display title with fallback to English or Italian (in RED if not in selected language)
  const getDisplayTitle = (item: any): { text: string; isRed: boolean } => {
    // Try selected language first
    if (item.title && item.title.trim() !== '') {
      return { text: item.title, isRed: false };
    }
    
    // Fallback to English
    const storageKeyEn = activeTab === 'periods' ? 'tools_periods_en' : activeTab === 'sections' ? 'tools_sections_en' : null;
    if (storageKeyEn) {
      const enData = localStorage.getItem(storageKeyEn);
      if (enData) {
        try {
          const parsed = JSON.parse(enData);
          const enItem = parsed.find((i: any) => i.id === item.id);
          if (enItem && enItem.title && enItem.title.trim() !== '') {
            return { text: enItem.title, isRed: true };
          }
        } catch (e) {}
      }
    }
    
    // Fallback to Italian
    const storageKeyIt = activeTab === 'periods' ? 'tools_periods_it' : activeTab === 'sections' ? 'tools_sections_it' : null;
    if (storageKeyIt) {
      const itData = localStorage.getItem(storageKeyIt);
      if (itData) {
        try {
          const parsed = JSON.parse(itData);
          const itItem = parsed.find((i: any) => i.id === item.id);
          if (itItem && itItem.title && itItem.title.trim() !== '') {
            return { text: itItem.title, isRed: true };
          }
        } catch (e) {}
      }
    }
    
    return { text: item.title || 'Untitled', isRed: false };
  };

  const handleLoadConfirm = async () => {
    try {
      // Load from the selected language
      const response = await fetch(`/api/admin/tools-defaults/load?language=${selectedLanguage}`);
      const data = await response.json();

      if (response.ok && data.toolsData) {
        const languageName = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name;
        
        console.log('📥 Loading data for language:', selectedLanguage);
        console.log('📦 Loaded periods:', data.toolsData.periods);
        
        // SMART MERGE: Preserve existing periods, update translations only
        // This prevents losing workouts when loading new language settings
        if (data.toolsData.periods) {
          const loadedPeriods = [...data.toolsData.periods];
          const existingPeriods = [...periods];
          
          // Create a merged array: keep existing IDs, update translations
          const mergedPeriods = existingPeriods.map(existing => {
            // Try to find a matching period by title/name from loaded data
            const matchingLoaded = loadedPeriods.find(loaded => 
              loaded.title?.toLowerCase() === existing.title?.toLowerCase()
            );
            
            if (matchingLoaded) {
              // Update translations but keep the same ID
              console.log(`🔄 Updating period: ${existing.title} (ID preserved)`);
              return {
                ...matchingLoaded,
                id: existing.id // CRITICAL: Keep the original ID to preserve workout links
              };
            }
            
            // Keep existing period unchanged if no match found
            return existing;
          });
          
          // Add any new periods from loaded data that don't exist yet
          loadedPeriods.forEach(loaded => {
            const alreadyExists = mergedPeriods.some(merged => 
              merged.title?.toLowerCase() === loaded.title?.toLowerCase()
            );
            if (!alreadyExists) {
              console.log(`➕ Adding new period: ${loaded.title}`);
              mergedPeriods.push(loaded);
            }
          });
          
          console.log('✅ Setting merged periods (IDs preserved):', mergedPeriods);
          setPeriods(mergedPeriods);
          
          // Also save to localStorage for this language to ensure persistence
          const storageKey = `tools_periods_${selectedLanguage}`;
          localStorage.setItem(storageKey, JSON.stringify(mergedPeriods));
        }
        if (data.toolsData.sections) {
          const loadedSections = [...data.toolsData.sections];
          const existingSections = [...sections];
          
          // Same smart merge for sections
          const mergedSections = existingSections.map(existing => {
            const matchingLoaded = loadedSections.find(loaded => 
              loaded.title?.toLowerCase() === existing.title?.toLowerCase()
            );
            
            if (matchingLoaded) {
              console.log(`🔄 Updating section: ${existing.title} (ID preserved)`);
              return {
                ...matchingLoaded,
                id: existing.id // CRITICAL: Keep the original ID
              };
            }
            
            return existing;
          });
          
          // Add new sections
          loadedSections.forEach(loaded => {
            const alreadyExists = mergedSections.some(merged => 
              merged.title?.toLowerCase() === loaded.title?.toLowerCase()
            );
            if (!alreadyExists) {
              console.log(`➕ Adding new section: ${loaded.title}`);
              mergedSections.push(loaded);
            }
          });
          
          console.log('✅ Setting merged sections (IDs preserved):', mergedSections);
          setSections(mergedSections);
          
          const storageKey = `tools_sections_${selectedLanguage}`;
          localStorage.setItem(storageKey, JSON.stringify(mergedSections));
        }
        if (data.toolsData.sports) {
          const loadedSports = [...data.toolsData.sports];
          console.log('✅ Setting sports:', loadedSports);
          setSports(loadedSports);
        }
        if (data.toolsData.equipment) {
          setEquipment([...data.toolsData.equipment]);
        }
        if (data.toolsData.exercises) {
          setExercises([...data.toolsData.exercises]);
        }
        if (data.toolsData.devices) {
          setDevices([...data.toolsData.devices]);
        }
        
        // Force a re-render by toggling a state
        setTimeout(() => {
          console.log('🔄 Data loaded and state updated');
        }, 100);
        
        alert(`✅ ${languageName} default settings loaded successfully!\n\n📋 All settings loaded (ALL TABS):\n• Periods (${data.toolsData.periods?.length || 0} items)\n• Sections (${data.toolsData.sections?.length || 0} items)\n• Sports\n• Equipment, Exercises, Library, Devices\n\n📝 Next Steps:\n1. Navigate to ANY tab and edit/translate items\n2. Select target language from dropdown (e.g., Russian)\n3. Click "Save to [Language]" to save ALL tabs\n\n💡 Example: Load Spanish → Edit Sports/Periods → Select Russian → Save to RU`);
        setShowLoadDialog(false);
      } else {
        const languageName = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name;
        alert(`ℹ️ No default settings found for ${languageName}.\n\nPlease create defaults for this language by:\n1. Loading English defaults if available\n2. Translating the items\n3. Saving them as ${languageName} defaults`);
        setShowLoadDialog(false);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error loading defaults');
    }
  };

  // Sports-specific handlers
  const handleSportDragStart = (id: string) => {
    console.log('🎯 Drag start:', id);
    setDraggedSport(id);
  };

  const handleSportDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSport(id);
  };

  const handleSportDragEnd = () => {
    console.log('✅ Sport drag ended');
    setDraggedSport(null);
    setDragOverSport(null);
  };

  // Use DEFAULT_SPORTS as fallback if sports array is empty
  const activeSports = (sports && sports.length > 0) ? sports : DEFAULT_SPORTS;

  const handleSportDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedSport || draggedSport === targetId) {
      setDraggedSport(null);
      setDragOverSport(null);
      return;
    }

    console.log('📦 Dropping sport:', draggedSport, 'onto:', targetId);

    // IMPORTANT: Work with the actual sports state, not activeSports
    // If sports is empty, we need to first initialize it with DEFAULT_SPORTS
    const sportsToUse = (sports && sports.length > 0) ? sports : DEFAULT_SPORTS;
    console.log('🔍 Using sports array:', sportsToUse.length, 'sports');
    
    const draggedIndex = sportsToUse.findIndex(sport => sport.id === draggedSport);
    const targetIndex = sportsToUse.findIndex(sport => sport.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      console.error('❌ Sport not found in array. Dragged:', draggedSport, 'Target:', targetId);
      console.error('Available sport IDs:', sportsToUse.map(s => s.id));
      setDraggedSport(null);
      setDragOverSport(null);
      return;
    }

    const newSports = [...sportsToUse];
    const [removed] = newSports.splice(draggedIndex, 1);
    newSports.splice(targetIndex, 0, removed);

    // Update top5 status and order based on new positions
    const updated = newSports.map((sport, index) => ({
      ...sport,
      order: index,
      isTop5: index < 5
    }));

    console.log('💾 Updating sports order:', updated.map(s => s.name));
    console.log('✅ Setting sports state - this should trigger auto-save');
    setSports(updated);
    setDraggedSport(null);
    setDragOverSport(null);
  };
  const top5Sports = activeSports.filter(s => s.isTop5).sort((a, b) => a.order - b.order);
  const otherSports = activeSports.filter(s => !s.isTop5).sort((a, b) => a.order - b.order);

  // Handle icon type change
  const handleIconTypeChange = async (newType: IconType) => {
    setIconType(newType);
    
    // Save to user settings
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sportIconType: newType })
      });
    } catch (error) {
      console.error('Error saving icon type preference:', error);
    }
  };

  // Map sport names to icon filenames
  const getSportIconFilename = (sportName: string): string => {
    const iconMap: Record<string, string> = {
      'Swimming': 'swimming.jpg',
      'Running': 'running.jpg',
      'Cycling': 'cycling.jpg',
      'Weightlifting': 'weights.jpg',
      'Football/Soccer': 'Technical/soccer.jpg',
      'Basketball': 'Technical/basketball.jpg',
      'Tennis': 'Technical/tennis.jpg',
      'Volleyball': 'volley.jpg',
      'Boxing': 'boxe.jpg',
      'Martial Arts': 'Technical/martial_arts.jpg',
      'Rowing': 'rowing.jpg',
      'Yoga': 'yoga.jpg',
      'Gymnastics': 'gymnastics.jpg',
      'Skiing': 'skiing.jpg',
      'Surfing': 'surfing.jpg',
      'Golf': 'golf.jpg',
      'Baseball': 'Technical/baseball.jpg',
      'Ice Hockey': 'ice_hockey.jpg',
      'Rugby': 'Technical/rugby.jpg',
      'Climbing': 'climbing.jpg',
    };
    return iconMap[sportName] || 'running.jpg';
  };

  // Render sport icon based on type
  const renderSportIcon = (sport: Sport) => {
    if (iconType === 'emoji') {
      return <div className="w-8 h-8 flex items-center justify-center text-2xl flex-shrink-0">{sport.icon}</div>;
    } else {
      return (
        <img 
          src={`/icons/${getSportIconFilename(sport.name)}`} 
          alt={sport.name}
          className="w-8 h-8 object-cover rounded flex-shrink-0"
        />
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Tools Settings</h2>
        <p className="text-gray-600 mt-1">Manage your workout periods, sections, sports, and equipment</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('periods')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'periods'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Periods
        </button>
        <button
          onClick={() => setActiveTab('sections')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'sections'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Workout Sections
        </button>
        <button
          onClick={() => setActiveTab('bodyBuildingTechniques')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'bodyBuildingTechniques'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Execution Techniques
        </button>
        {/* Main Sports tab - only for Admin */}
        {isAdmin && (
          <button
            onClick={() => setActiveTab('sports')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'sports'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Main Sports
          </button>
        )}
        <button
          onClick={() => setActiveTab('equipment')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'equipment'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Personal Equipment
        </button>
        <button
          onClick={() => setActiveTab('equipmentFactories')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'equipmentFactories'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Sports Equipment Factories
        </button>
        <button
          onClick={() => setActiveTab('muscles')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'muscles'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Muscles Settings
        </button>
        <button
          onClick={() => setActiveTab('sportsEquipment')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'sportsEquipment'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Sports Equipment
        </button>
        <button
          onClick={() => setActiveTab('exercises')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'exercises'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Exercise Bank
        </button>
        <button
          onClick={() => setActiveTab('myLibrary')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'myLibrary'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          My Library of Exercises
        </button>
        <button
          onClick={() => setActiveTab('devices')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'devices'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Device Enabled
        </button>
      </div>

      {/* Language Defaults - Admin Only */}
      <div className="grid grid-cols-1 gap-3">
        
        {/* Instructions Banner - HIDDEN (code preserved for future use) */}
        <div className="hidden bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
          <h4 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            {isAdmin ? 'Multi-Language Settings Workflow (Admin)' : 'Personal Settings Workflow'}
          </h4>
          {isAdmin ? (
            <>
              <ol className="text-sm text-indigo-800 space-y-1 ml-6 list-decimal">
                <li><strong>Select Language:</strong> Choose a language from the dropdown - terms load automatically</li>
                <li><strong>Add/Edit:</strong> When adding or editing items, fill translations in ALL languages you want</li>
                <li><strong>Required:</strong> ⚠️ At least <span className="font-bold text-red-600">English OR Italian</span> must be filled (mandatory)</li>
                <li><strong>Missing Translations:</strong> Items without translation in selected language appear in <span className="font-bold text-red-600">RED</span> (English/Italian fallback)</li>
              </ol>
              <p className="text-xs text-indigo-600 mt-2 italic">
                <strong>💡 Example:</strong> Add "Special Period" with EN/FR/IT → Select RU → Item appears in RED (needs Russian translation)
              </p>
            </>
          ) : (
            <>
              <ol className="text-sm text-indigo-800 space-y-1 ml-6 list-decimal">
                <li><strong>Select Language:</strong> Choose your language - terms load automatically</li>
                <li><strong>Load Defaults:</strong> Click "Load Admin Defaults" to get Movesbook's settings in your language</li>
                <li><strong>Add/Edit:</strong> Create or edit items in your language - they're automatically saved</li>
                <li><strong>Your Items:</strong> Items you create manually are preserved when loading admin defaults</li>
              </ol>
              <p className="text-xs text-indigo-600 mt-2 italic">
                <strong>💡 Tip:</strong> All settings are automatically available in your workout panels - no save button needed!
              </p>
            </>
          )}
          <p className="text-xs text-purple-600 mt-2 font-semibold">
            ✅ This applies to: Periods, Sections, {isAdmin ? 'Sports, ' : ''}Equipment, Exercises, Library, Devices
          </p>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-4 p-4 bg-white border-2 border-indigo-300 rounded-lg shadow-sm">
          <Globe className="w-5 h-5 text-indigo-500" />
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">Display Language:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => {
                setSelectedLanguage(e.target.value);
                // Auto-load terms for selected language
                loadLanguageTerms(e.target.value);
              }}
              className="px-3 py-2 text-sm font-medium border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name} ({lang.code.toUpperCase()})</option>
              ))}
            </select>
          </div>
          
          {/* For non-admin: Show Load Admin Defaults button */}
          {!isAdmin && (
            <button
              onClick={handleLoadAdminDefaults}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md font-medium"
              title="Load Movesbook default settings in your language"
            >
              <Download className="w-4 h-4" />
              Load Admin Defaults
            </button>
          )}
          
          <div className="text-xs text-gray-600 flex-1">
            <span className="font-semibold">ℹ️ Note:</span> Terms without translation will appear in <span className="text-red-600 font-bold">RED</span> (English or Italian fallback)
          </div>
        </div>
      </div>

      {/* Periods, Sections & Execution Techniques Tab Content */}
      {(activeTab === 'periods' || activeTab === 'sections' || activeTab === 'bodyBuildingTechniques') && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex justify-between items-center">
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddDialog(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add New
              </button>
              <button
                onClick={handleSortAZ}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                <ArrowUpAZ className="w-4 h-4" />
                A-Z
              </button>
              <button
                onClick={handleSortZA}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                <ArrowDownZA className="w-4 h-4" />
                Z-A
              </button>
            </div>
            <div className="text-sm text-gray-600">
              Drag to reorder • {getActiveItems().length} items
            </div>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getActiveItems().map((item) => (
              <div
                key={item.id}
                draggable={true}
                onDragStart={() => handleDragStart(item.id)}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                className={`bg-white rounded-xl border-2 p-4 cursor-move transition ${
                  draggedItem === item.id 
                    ? 'opacity-50 border-blue-500' 
                    : currentUserId && item.userId && item.userId !== currentUserId
                      ? 'border-gray-300 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <h3 className={`font-semibold truncate ${getDisplayTitle(item).isRed ? 'text-red-600' : 'text-gray-900'}`}>
                        {getDisplayTitle(item).text}
                      </h3>
                      {currentUserId && item.userId && item.userId !== currentUserId && (
                        <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full flex-shrink-0">
                          Read-only
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(item)}
                      disabled={!!(currentUserId && item.userId && item.userId !== currentUserId)}
                      className={`p-2 rounded-lg transition ${
                        currentUserId && item.userId && item.userId !== currentUserId
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-blue-600 hover:bg-blue-50'
                      }`}
                      title={currentUserId && item.userId && item.userId !== currentUserId ? 'Cannot edit - not created by you' : 'Edit'}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={!!(currentUserId && item.userId && item.userId !== currentUserId)}
                      className={`p-2 rounded-lg transition ${
                        currentUserId && item.userId && item.userId !== currentUserId
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                      title={currentUserId && item.userId && item.userId !== currentUserId ? 'Cannot delete - not created by you' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {getActiveItems().length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-600 mb-4">No items yet. Click "Add New" to get started!</p>
            </div>
          )}
        </div>
      )}

      {/* Main Sports Tab - Only for Admin */}
      {activeTab === 'sports' && isAdmin && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Organize Your Sports by Preference</h3>
                <p className="text-gray-600 text-sm">
                  Drag sports to reorder them. Your <span className="font-semibold text-blue-600">Top 5 sports</span> will appear as quick access shortcuts throughout the app.
                </p>
                <p className="text-blue-600 text-xs mt-2">
                  <strong>💡 Tip:</strong> Sports listed here and their settings can be loaded in your user settings by pressing the "Load Admin Defaults" button, which will load sports in your current language.
                </p>
              </div>
            </div>
          </div>

          {/* Icon Type Selector */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Icon Type Preference
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => handleIconTypeChange('emoji')}
                disabled={isLoadingIconPreference}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                  iconType === 'emoji'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <Smile className="w-5 h-5" />
                <span className="font-medium">Colored Icons (Emoji)</span>
                <span className="text-xl ml-1">🏊🚴🏃</span>
              </button>
              
              <button
                onClick={() => handleIconTypeChange('bw_icons')}
                disabled={isLoadingIconPreference}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                  iconType === 'bw_icons'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <ImageIcon className="w-5 h-5" />
                <span className="font-medium">Black & White Icons</span>
                <div className="flex gap-1 ml-1">
                  <img src="/icons/swimming.jpg" alt="" className="w-6 h-6 rounded" />
                  <img src="/icons/cycling.jpg" alt="" className="w-6 h-6 rounded" />
                  <img src="/icons/running.jpg" alt="" className="w-6 h-6 rounded" />
                </div>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {iconType === 'emoji' 
                ? 'System emoji icons - colorful and consistent across devices' 
                : 'Custom black & white sport icons from image library'
              }
            </p>
          </div>

          {/* Top 5 Sports - Quick Access */}
          <div className="bg-white rounded-2xl border-2 border-blue-500 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-2xl">⭐</span>
                Top 5 Sports - Quick Access
              </h3>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
                {top5Sports.length}/5
              </span>
            </div>

            <div className="space-y-2">
              {top5Sports.map((sport, index) => (
                <div
                  key={sport.id}
                  draggable={true}
                  onDragStart={() => handleSportDragStart(sport.id)}
                  onDragOver={(e) => handleSportDragOver(e, sport.id)}
                  onDrop={(e) => handleSportDrop(e, sport.id)}
                  onDragEnd={handleSportDragEnd}
                  className={`flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 cursor-move transition ${
                    draggedSport === sport.id ? 'opacity-50 border-blue-500' : dragOverSport === sport.id ? 'border-blue-400' : 'border-blue-200 hover:border-blue-300'
                  }`}
                >
                  <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  
                  {renderSportIcon(sport)}

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{sport.name}</span>
                      <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded">
                        #{index + 1}
                      </span>
                    </div>
                    <span className="text-xs text-gray-600">Quick access sport</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSport(sport);
                      setShowEditSportDialog(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Edit sport name for translation"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <div className="text-sm text-blue-600 font-semibold">
                    Top {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Other Sports */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Other Sports</h3>
              <span className="text-sm text-gray-600">
                {otherSports.length} sports
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {otherSports.map((sport, index) => (
                <div
                  key={sport.id}
                  draggable={true}
                  onDragStart={() => handleSportDragStart(sport.id)}
                  onDragOver={(e) => handleSportDragOver(e, sport.id)}
                  onDrop={(e) => handleSportDrop(e, sport.id)}
                  onDragEnd={handleSportDragEnd}
                  className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg border cursor-move transition ${
                    draggedSport === sport.id ? 'opacity-50 border-gray-400' : dragOverSport === sport.id ? 'border-gray-400' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  
                  {iconType === 'emoji' ? (
                    <div className="w-6 h-6 flex items-center justify-center text-xl flex-shrink-0">
                      {sport.icon}
                    </div>
                  ) : (
                    <img 
                      src={`/icons/${getSportIconFilename(sport.name)}`} 
                      alt={sport.name}
                      className="w-6 h-6 object-cover rounded flex-shrink-0"
                    />
                  )}

                  <span className="font-medium text-gray-700 flex-1">{sport.name}</span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSport(sport);
                      setShowEditSportDialog(true);
                    }}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                    title="Edit sport name for translation"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <span className="text-xs text-gray-500">
                    #{5 + index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h4 className="font-semibold text-gray-900 mb-3">How to Use:</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">1.</span>
                <span>Drag any sport from "Other Sports" to the "Top 5" section to add it to quick access</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">2.</span>
                <span>Drag sports within "Top 5" to change their priority order</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">3.</span>
                <span>Drag a sport from "Top 5" to "Other Sports" to remove it from quick access</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">4.</span>
                <span>Your Top 5 sports will appear as shortcuts when creating workouts</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Personal Equipment Tab */}
      {activeTab === 'equipment' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex justify-between items-center">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditingEquipment({ 
                    id: '', 
                    name: '', 
                    picture: '',
                    category: '', 
                    sports: [],
                    company: '',
                    description: '', 
                    inStock: true,
                    startDate: '',
                    durationAlarm: { days: undefined, km: undefined, time: '' }
                  });
                  setShowEquipmentDialog(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add Equipment
              </button>
              
              {/* View Toggle */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setEquipmentViewMode('cards')}
                  className={`px-3 py-2 flex items-center gap-2 transition ${
                    equipmentViewMode === 'cards'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  title="Card View"
                >
                  <Grid3x3 className="w-4 h-4" />
                  Cards
                </button>
                <button
                  onClick={() => setEquipmentViewMode('table')}
                  className={`px-3 py-2 flex items-center gap-2 transition border-l border-gray-300 ${
                    equipmentViewMode === 'table'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  title="Table View"
                >
                  <List className="w-4 h-4" />
                  Table
                </button>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="Cardio">Cardio</option>
                <option value="Weights">Weights</option>
                <option value="Accessories">Accessories</option>
                <option value="Machines">Machines</option>
                <option value="Clothes">Clothes</option>
                <option value="Shoes">Shoes</option>
                <option value="Beverages">Beverages</option>
                <option value="Sport devices">Sport devices</option>
              </select>
              <div className="text-sm text-gray-600">
                {equipment.filter(e => categoryFilter === 'all' || e.category === categoryFilter).length} items
              </div>
            </div>
          </div>

          {/* Equipment Cards View */}
          {equipmentViewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortEquipment(equipment.filter(e => categoryFilter === 'all' || e.category === categoryFilter))
                .map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {item.picture && (
                      <img src={item.picture} alt={item.name} className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 mb-1 truncate">{item.name}</h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                        {item.category}
                      </span>
                      {item.company && (
                        <p className="text-xs text-gray-500 mt-1">{item.company}</p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditingEquipment(item);
                          setShowEquipmentDialog(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this equipment?')) {
                            setEquipment(equipment.filter(e => e.id !== item.id));
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Sports Tags */}
                  {item.sports && item.sports.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.sports.map((sportId, index) => {
                        const sport = sports.find(s => s.id === sportId);
                        return sport ? (
                          <span key={index} className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                            {sport.icon} {sport.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                  
                  {/* Athlete fields */}
                  {!isAdmin && item.startDate && (
                    <div className="mb-3 p-2 bg-blue-50 rounded-lg text-xs">
                      <p className="text-gray-700"><strong>Start:</strong> {new Date(item.startDate).toLocaleDateString()}</p>
                      {item.durationAlarm && (
                        <p className="text-gray-700 mt-1">
                          <strong>Alarm:</strong> 
                          {item.durationAlarm.days && ` ${item.durationAlarm.days}d`}
                          {item.durationAlarm.km && ` ${item.durationAlarm.km}km`}
                          {item.durationAlarm.time && ` ${item.durationAlarm.time}`}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${item.inStock ? 'text-green-600' : 'text-red-600'}`}>
                      {item.inStock ? '✓ In Stock' : '✗ Out of Stock'}
                    </span>
                    <button
                      onClick={() => {
                        setEquipment(equipment.map(e => 
                          e.id === item.id ? { ...e, inStock: !e.inStock } : e
                        ));
                      }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Toggle
                    </button>
                  </div>
                </div>
                ))}
            </div>
          )}
          
          {/* Equipment Table View */}
          {equipmentViewMode === 'table' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition"
                      onClick={() => handleEquipmentSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Name
                        {equipmentSortField === 'name' && (
                          <ArrowUpDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition"
                      onClick={() => handleEquipmentSort('category')}
                    >
                      <div className="flex items-center gap-2">
                        Category
                        {equipmentSortField === 'category' && (
                          <ArrowUpDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition"
                      onClick={() => handleEquipmentSort('company')}
                    >
                      <div className="flex items-center gap-2">
                        Company
                        {equipmentSortField === 'company' && (
                          <ArrowUpDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    {!isAdmin && (
                      <th 
                        className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition"
                        onClick={() => handleEquipmentSort('startDate')}
                      >
                        <div className="flex items-center gap-2">
                          Date Start
                          {equipmentSortField === 'startDate' && (
                            <ArrowUpDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                    )}
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortEquipment(equipment.filter(e => categoryFilter === 'all' || e.category === categoryFilter))
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {item.picture && (
                              <img src={item.picture} alt={item.name} className="w-10 h-10 object-cover rounded border border-gray-200 flex-shrink-0" />
                            )}
                            <div>
                              <div className="font-semibold text-gray-900">{item.name}</div>
                              {item.sports && item.sports.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {item.sports.slice(0, 2).map((sportId, index) => {
                                    const sport = sports.find(s => s.id === sportId);
                                    return sport ? (
                                      <span key={index} className="text-xs">
                                        {sport.icon}
                                      </span>
                                    ) : null;
                                  })}
                                  {item.sports.length > 2 && (
                                    <span className="text-xs text-gray-500">+{item.sports.length - 2}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700">{item.company || '—'}</div>
                        </td>
                        {!isAdmin && (
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-700">
                              {item.startDate ? new Date(item.startDate).toLocaleDateString() : '—'}
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingEquipment(item);
                                setShowEquipmentDialog(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this equipment?')) {
                                  setEquipment(equipment.filter(e => e.id !== item.id));
                                }
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {equipment.filter(e => categoryFilter === 'all' || e.category === categoryFilter).length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-600">No equipment found. Click "Add Equipment" to get started!</p>
            </div>
          )}
        </div>
      )}

      {/* Sports Equipment Factories Tab */}
      {activeTab === 'equipmentFactories' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-2xl">🏭</span>
              Sports Equipment Factories
            </h3>
            <p className="text-gray-600 text-sm">
              Manage sports equipment manufacturers and factory information. This section is available for{' '}
              <span className="font-semibold text-purple-600">all users</span>.
            </p>
          </div>

          {/* Placeholder Content */}
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">🏭</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Sports Equipment Factories</h3>
            <p className="text-gray-600 mb-4">
              Add and manage sports equipment manufacturers, factory locations, and supplier information.
            </p>
            <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold">
              <Plus className="w-4 h-4 inline-block mr-2" />
              Add Factory
            </button>
          </div>
        </div>
      )}

      {/* Muscles Settings Tab */}
      {activeTab === 'muscles' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-2xl">💪</span>
              Muscles Settings
            </h3>
            <p className="text-gray-600 text-sm">
              Configure muscle groups, anatomical references, and training targets. Admin only section.
            </p>
          </div>

          {/* Placeholder Content */}
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">💪</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Muscles Settings</h3>
            <p className="text-gray-600 mb-4">
              Define muscle groups, add anatomical descriptions, and set training parameters.
            </p>
            <button className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold">
              <Plus className="w-4 h-4 inline-block mr-2" />
              Add Muscle Group
            </button>
          </div>
        </div>
      )}

      {/* Sports Equipment Tab */}
      {activeTab === 'sportsEquipment' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-2xl">⚽</span>
              Sports Equipment
            </h3>
            <p className="text-gray-600 text-sm">
              Manage all types of sports equipment and gear. This section is available for{' '}
              <span className="font-semibold text-cyan-600">all users</span>.
            </p>
          </div>

          {/* Placeholder Content */}
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">⚽</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Sports Equipment</h3>
            <p className="text-gray-600 mb-4">
              Add sports-specific equipment, accessories, and gear for your training sessions.
            </p>
            <button className="px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition font-semibold">
              <Plus className="w-4 h-4 inline-block mr-2" />
              Add Equipment
            </button>
          </div>
        </div>
      )}

      {/* Exercises Tab */}
      {activeTab === 'exercises' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex justify-between items-center">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditingExercise({ 
                    id: '', 
                    name: '', 
                    category: '', 
                    description: '', 
                    equipment: [],
                    difficulty: 'Beginner',
                    muscleGroups: []
                  });
                  setShowExerciseDialog(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add Exercise
              </button>
            </div>
            <div className="flex gap-3 items-center">
              <input
                type="text"
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="Strength">Strength</option>
                <option value="Cardio">Cardio</option>
                <option value="Flexibility">Flexibility</option>
                <option value="Balance">Balance</option>
              </select>
              <div className="text-sm text-gray-600">
                {exercises.filter(ex => 
                  (categoryFilter === 'all' || ex.category === categoryFilter) &&
                  (searchQuery === '' || ex.name.toLowerCase().includes(searchQuery.toLowerCase()))
                ).length} exercises
              </div>
            </div>
          </div>

          {/* Exercises Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Difficulty</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Equipment</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Muscle Groups</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {exercises
                  .filter(ex => 
                    (categoryFilter === 'all' || ex.category === categoryFilter) &&
                    (searchQuery === '' || ex.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  )
                  .map((exercise) => (
                    <tr key={exercise.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{exercise.name}</div>
                        <div className="text-xs text-gray-500">{exercise.description}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                          {exercise.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          exercise.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' :
                          exercise.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {exercise.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          {exercise.equipment.length > 0 ? exercise.equipment.join(', ') : 'None'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {exercise.muscleGroups.map((muscle, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                              {muscle}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingExercise(exercise);
                              setShowExerciseDialog(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this exercise?')) {
                                setExercises(exercises.filter(e => e.id !== exercise.id));
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {exercises.filter(ex => 
            (categoryFilter === 'all' || ex.category === categoryFilter) &&
            (searchQuery === '' || ex.name.toLowerCase().includes(searchQuery.toLowerCase()))
          ).length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-600">No exercises found. Try adjusting your search or add a new exercise!</p>
            </div>
          )}
        </div>
      )}

      {/* My Library of Exercises Tab */}
      {activeTab === 'myLibrary' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl border border-green-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-2xl">📚</span>
              My Library of Exercises
            </h3>
            <p className="text-gray-600 text-sm">
              Your personal collection of custom exercises and workout routines. This section is available for{' '}
              <span className="font-semibold text-green-600">all users</span>.
            </p>
          </div>

          {/* Placeholder Content */}
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">My Library of Exercises</h3>
            <p className="text-gray-600 mb-4">
              Create and save your own custom exercises, workout templates, and training programs.
            </p>
            <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold">
              <Plus className="w-4 h-4 inline-block mr-2" />
              Add Custom Exercise
            </button>
          </div>
        </div>
      )}

      {/* Device Enabled Tab */}
      {activeTab === 'devices' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-2xl">📱</span>
              Device Management - Super Admin Only
            </h3>
            <p className="text-gray-600 text-sm mb-3">
              Add new devices and their descriptions that will be shown to users when they select their Services.
            </p>
            <div className="bg-white rounded-lg p-3 border border-purple-100">
              <p className="text-xs text-gray-500">
                <strong className="text-purple-700">Note:</strong> Device communication protocols will be synced and linked to official reading protocols in future updates. 
                Users will be able to configure their personal device settings after login.
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex justify-between items-center">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditingDevice({ 
                    id: '', 
                    name: '', 
                    brand: '',
                    model: '',
                    codekey: '',
                    type: 'Watch',
                    compatibility: [],
                    isEnabled: true,
                    syncProtocol: '',
                    description: ''
                  });
                  setShowDeviceDialog(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add Device
              </button>
            </div>
            <div className="flex gap-3 items-center">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Device Types</option>
                <option value="Watch">Smart Watches</option>
                <option value="Tracker">Fitness Trackers</option>
                <option value="Monitor">Heart Rate Monitors</option>
                <option value="Scale">Smart Scales</option>
                <option value="Sensor">Sensors</option>
                <option value="Other">Other Devices</option>
              </select>
              <div className="text-sm text-gray-600">
                {devices.filter(d => categoryFilter === 'all' || d.type === categoryFilter).length} devices
              </div>
            </div>
          </div>

          {/* Devices Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices
              .filter(d => categoryFilter === 'all' || d.type === categoryFilter)
              .map((device) => (
                <div
                  key={device.id}
                  className={`bg-white rounded-xl border-2 p-5 transition ${
                    device.isEnabled ? 'border-green-200 bg-green-50/30' : 'border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900">{device.name}</h3>
                        <span className={`w-3 h-3 rounded-full ${device.isEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{device.brand} {device.model}</p>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                          {device.type}
                        </span>
                        {device.codekey && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-mono font-bold rounded border border-orange-300">
                            {device.codekey}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingDevice(device);
                          setShowDeviceDialog(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this device?')) {
                            setDevices(devices.filter(d => d.id !== device.id));
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{device.description}</p>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500">Sync:</span>
                      <span className="text-xs text-gray-700 font-medium">{device.syncProtocol}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500">Compatible:</span>
                      <div className="flex flex-wrap gap-1">
                        {device.compatibility.map((comp, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                            {comp}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <span className={`text-sm font-semibold ${device.isEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                      {device.isEnabled ? '✓ Enabled' : '✗ Disabled'}
                    </span>
                    <button
                      onClick={() => {
                        setDevices(devices.map(d => 
                          d.id === device.id ? { ...d, isEnabled: !d.isEnabled } : d
                        ));
                      }}
                      className="text-xs text-purple-600 hover:underline font-medium"
                    >
                      Toggle
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {devices.filter(d => categoryFilter === 'all' || d.type === categoryFilter).length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-600">No devices found. Click "Add Device" to register a compatible device!</p>
            </div>
          )}

          {/* Device Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-gray-900">{devices.length}</div>
              <div className="text-sm text-gray-600">Total Devices</div>
            </div>
            <div className="bg-white rounded-xl border border-green-200 p-4">
              <div className="text-2xl font-bold text-green-600">{devices.filter(d => d.isEnabled).length}</div>
              <div className="text-sm text-gray-600">Enabled</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-gray-600">{devices.filter(d => !d.isEnabled).length}</div>
              <div className="text-sm text-gray-600">Disabled</div>
            </div>
          </div>
        </div>
      )}

      {/* Add Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">
              Add New {activeTab === 'periods' ? 'Period' : activeTab === 'sections' ? 'Section' : 'Execution Technique'}
            </h3>
            
            {/* Info Banner */}
            <div className="mb-6 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-700" />
                <span className="text-sm font-semibold text-blue-900">
                  Edit in all languages simultaneously - changes save to all language libraries at once!
                </span>
              </div>
            </div>
            
            {/* Global Fields (Code & Color) */}
            <div className="space-y-4 mb-6">
              {activeTab === 'sections' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Code <span className="text-gray-500">(max 5 characters, same for all languages)</span>
                  </label>
                  <input
                    type="text"
                    value={newItem.code || ''}
                    onChange={(e) => {
                      const value = e.target.value.slice(0, 5).toUpperCase();
                      setNewItem({ ...newItem, code: value });
                    }}
                    placeholder="Enter code..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                    maxLength={5}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {(newItem.code || '').length}/5 - Short code for compact display
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Color <span className="text-gray-500">(same for all languages)</span>
                </label>
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    style={{ backgroundColor: newItem.color }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'color';
                      input.value = newItem.color;
                      input.onchange = (e) => setNewItem({ ...newItem, color: (e.target as HTMLInputElement).value });
                      input.click();
                    }}
                  />
                  <input
                    type="text"
                    value={newItem.color}
                    onChange={(e) => setNewItem({ ...newItem, color: e.target.value })}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Per-Language Fields */}
            {isAdmin ? (
              // Admin: Show all languages
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-800 border-b pb-2">Translations</h4>
                
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <div key={lang.code} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-md font-bold text-sm">
                        {lang.code.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-700">{lang.name}</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Title <span className="text-gray-400">(max 30 chars)</span>
                        </label>
                        <input
                          type="text"
                          value={newItemTranslations[lang.code]?.title || ''}
                          onChange={(e) => {
                            const value = e.target.value.slice(0, 30);
                            setNewItemTranslations({
                              ...newItemTranslations,
                              [lang.code]: {
                                title: value,
                                description: newItemTranslations[lang.code]?.description || ''
                              }
                            });
                          }}
                          placeholder={`Enter ${lang.name} title...`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          maxLength={30}
                        />
                        <div className="text-xs text-gray-400 mt-0.5">
                          {(newItemTranslations[lang.code]?.title || '').length}/30
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Description <span className="text-gray-400">(max 255 chars)</span>
                        </label>
                        <textarea
                          value={newItemTranslations[lang.code]?.description || ''}
                          onChange={(e) => {
                            const value = e.target.value.slice(0, 255);
                            setNewItemTranslations({
                              ...newItemTranslations,
                              [lang.code]: {
                                title: newItemTranslations[lang.code]?.title || '',
                                description: value
                              }
                            });
                          }}
                          placeholder={`Enter ${lang.name} description...`}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          maxLength={255}
                        />
                        <div className="text-xs text-gray-400 mt-0.5">
                          {(newItemTranslations[lang.code]?.description || '').length}/255
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Non-Admin: Only show current language fields
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Title <span className="text-gray-500">(max 30 chars)</span>
                  </label>
                  <input
                    type="text"
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value.slice(0, 30) })}
                    placeholder="Enter title..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={30}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {newItem.title.length}/30
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description <span className="text-gray-500">(max 255 chars)</span>
                  </label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value.slice(0, 255) })}
                    placeholder="Enter description..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={255}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {newItem.description.length}/255
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleAdd}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
              >
                {isAdmin ? '💾 Save to All Languages' : '💾 Save'}
              </button>
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setNewItem({ title: '', code: '', description: '', color: '#3b82f6', sports: [] as string[] });
                  setNewItemTranslations({});
                  setActiveInputLanguage('en');
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">
              Edit {activeTab === 'periods' ? 'Period' : activeTab === 'sections' ? 'Section' : 'Execution Technique'}
            </h3>
            
            {/* Info Banner - Only for Admin */}
            {isAdmin && (
              <div className="mb-6 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-700" />
                  <span className="text-sm font-semibold text-blue-900">
                    Edit in all languages simultaneously - changes save to all language libraries at once!
                  </span>
                </div>
              </div>
            )}

            {/* Global Fields (Code & Color) */}
            <div className="space-y-4 mb-6">
              {activeTab === 'sections' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Code <span className="text-gray-500">(max 5 characters, same for all languages)</span>
                  </label>
                  <input
                    type="text"
                    value={(editingItem as any).code || ''}
                    onChange={(e) => {
                      const value = e.target.value.slice(0, 5).toUpperCase();
                      setEditingItem({ ...editingItem, code: value } as any);
                    }}
                    placeholder="Enter code..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                    maxLength={5}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {((editingItem as any).code || '').length}/5 - Short code for compact display
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Color <span className="text-gray-500">(same for all languages)</span>
                </label>
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    style={{ backgroundColor: editingItem.color }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'color';
                      input.value = editingItem.color;
                      input.onchange = (e) => setEditingItem({ ...editingItem, color: (e.target as HTMLInputElement).value });
                      input.click();
                    }}
                  />
                  <input
                    type="text"
                    value={editingItem.color}
                    onChange={(e) => setEditingItem({ ...editingItem, color: e.target.value })}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Per-Language Fields */}
            {isAdmin ? (
              // Admin: Show all languages
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-800 border-b pb-2">Translations</h4>
                
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <div key={lang.code} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-md font-bold text-sm">
                        {lang.code.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-700">{lang.name}</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Title <span className="text-gray-400">(max 30 chars)</span>
                        </label>
                        <input
                          type="text"
                          value={editItemTranslations[lang.code]?.title || ''}
                          onChange={(e) => {
                            const value = e.target.value.slice(0, 30);
                            setEditItemTranslations({
                              ...editItemTranslations,
                              [lang.code]: {
                                title: value,
                                description: editItemTranslations[lang.code]?.description || ''
                              }
                            });
                          }}
                          placeholder={`Enter ${lang.name} title...`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          maxLength={30}
                        />
                        <div className="text-xs text-gray-400 mt-0.5">
                          {(editItemTranslations[lang.code]?.title || '').length}/30
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Description <span className="text-gray-400">(max 255 chars)</span>
                        </label>
                        <textarea
                          value={editItemTranslations[lang.code]?.description || ''}
                          onChange={(e) => {
                            const value = e.target.value.slice(0, 255);
                            setEditItemTranslations({
                              ...editItemTranslations,
                              [lang.code]: {
                                title: editItemTranslations[lang.code]?.title || '',
                                description: value
                              }
                            });
                          }}
                          placeholder={`Enter ${lang.name} description...`}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          maxLength={255}
                        />
                        <div className="text-xs text-gray-400 mt-0.5">
                          {(editItemTranslations[lang.code]?.description || '').length}/255
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Non-Admin: Only show current language fields
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Title <span className="text-gray-500">(max 30 chars)</span>
                  </label>
                  <input
                    type="text"
                    value={editingItem.title}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value.slice(0, 30) })}
                    placeholder="Enter title..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={30}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {editingItem.title.length}/30
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description <span className="text-gray-500">(max 255 chars)</span>
                  </label>
                  <textarea
                    value={editingItem.description}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value.slice(0, 255) })}
                    placeholder="Enter description..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={255}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {editingItem.description.length}/255
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isAdmin ? '💾 Save to All Languages' : '💾 Save'}
              </button>
              <button
                onClick={() => setEditingItem(null)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Equipment Dialog */}
      {showEquipmentDialog && editingEquipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full my-8">
            <h3 className="text-2xl font-bold mb-6">
              {editingEquipment.id ? 'Edit Equipment' : 'Add New Equipment'}
            </h3>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={editingEquipment.name}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Equipment name"
                />
              </div>

              {/* Picture */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Picture</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // For now, store as data URL. In production, upload to server
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditingEquipment({ ...editingEquipment, picture: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    style={{ position: 'relative', zIndex: 1 }}
                  />
                  {editingEquipment.picture && (
                    <img src={editingEquipment.picture} alt="Preview" className="w-16 h-16 object-cover rounded-lg border-2 border-gray-300" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Upload an image of the equipment</p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                <select
                  value={editingEquipment.category}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  <option value="Cardio">Cardio</option>
                  <option value="Weights">Weights</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Machines">Machines</option>
                  <option value="Clothes">Clothes</option>
                  <option value="Shoes">Shoes</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Sport devices">Sport devices</option>
                </select>
              </div>

              {/* Sport Tags */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Sport *</label>
                <div className="border border-gray-300 rounded-lg p-3 min-h-[100px]">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editingEquipment.sports?.map((sportId, index) => {
                      const sport = sports.find(s => s.id === sportId);
                      return sport ? (
                        <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {sport.icon} {sport.name}
                          <button
                            onClick={() => {
                              setEditingEquipment({
                                ...editingEquipment,
                                sports: editingEquipment.sports?.filter((_, i) => i !== index) || []
                              });
                            }}
                            className="ml-1 hover:text-blue-900"
                          >
                            ×
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                  <select
                    onChange={(e) => {
                      const sportId = e.target.value;
                      console.log('Sport selected:', sportId);
                      console.log('Current equipment sports:', editingEquipment.sports);
                      
                      if (sportId && editingEquipment && !editingEquipment.sports?.includes(sportId)) {
                        const updatedSports = [...(editingEquipment.sports || []), sportId];
                        console.log('Updating sports to:', updatedSports);
                        
                        setEditingEquipment({
                          ...editingEquipment,
                          sports: updatedSports
                        });
                      }
                      // Reset select to default
                      setTimeout(() => {
                        e.target.value = '';
                      }, 0);
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white cursor-pointer"
                    value=""
                  >
                    <option value="" disabled>+ Add sport</option>
                    {(sports && sports.length > 0 ? sports : DEFAULT_SPORTS)
                      .filter(s => !editingEquipment?.sports?.includes(s.id))
                      .map(sport => (
                        <option key={sport.id} value={sport.id}>
                          {sport.icon} {sport.name}
                        </option>
                      ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1">Select one or more sports this equipment is used for</p>
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Company</label>
                <input
                  type="text"
                  value={editingEquipment.company || ''}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, company: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Manufacturer or brand name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={editingEquipment.description}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Equipment description"
                />
              </div>

              {/* Athlete-specific fields */}
              {!isAdmin && (
                <>
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-semibold text-gray-700 mb-3">Athlete Tracking</h4>
                    
                    {/* Start Date */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={editingEquipment.startDate || ''}
                        onChange={(e) => setEditingEquipment({ ...editingEquipment, startDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Duration Alarm */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Duration Alarm</label>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Days (autofilled)</label>
                          <input
                            type="number"
                            value={editingEquipment.durationAlarm?.days || ''}
                            onChange={(e) => setEditingEquipment({
                              ...editingEquipment,
                              durationAlarm: {
                                ...editingEquipment.durationAlarm,
                                days: parseInt(e.target.value) || undefined
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Days"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Km (autofilled)</label>
                          <input
                            type="number"
                            value={editingEquipment.durationAlarm?.km || ''}
                            onChange={(e) => setEditingEquipment({
                              ...editingEquipment,
                              durationAlarm: {
                                ...editingEquipment.durationAlarm,
                                km: parseInt(e.target.value) || undefined
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Km"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Time (autofilled)</label>
                          <input
                            type="text"
                            value={editingEquipment.durationAlarm?.time || ''}
                            onChange={(e) => setEditingEquipment({
                              ...editingEquipment,
                              durationAlarm: {
                                ...editingEquipment.durationAlarm,
                                time: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="HH:MM:SS"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Set automatic alarms based on usage duration</p>
                    </div>
                  </div>
                </>
              )}

              {/* In Stock */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="inStock"
                  checked={editingEquipment.inStock}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, inStock: e.target.checked })}
                  className="w-5 h-5 text-blue-600"
                />
                <label htmlFor="inStock" className="text-sm font-semibold text-gray-700">
                  In Stock
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  if (!editingEquipment.name || !editingEquipment.category) {
                    alert('Please fill in all required fields (Name, Category, Sport)');
                    return;
                  }
                  if (!editingEquipment.sports || editingEquipment.sports.length === 0) {
                    alert('Please select at least one sport');
                    return;
                  }
                  if (editingEquipment.id) {
                    setEquipment(equipment.map(e => e.id === editingEquipment.id ? editingEquipment : e));
                  } else {
                    setEquipment([...equipment, { ...editingEquipment, id: Date.now().toString(), isUserCreated: !isAdmin }]);
                  }
                  setShowEquipmentDialog(false);
                  setEditingEquipment(null);
                }}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                {editingEquipment.id ? 'Save' : 'Add'}
              </button>
              <button
                onClick={() => {
                  setShowEquipmentDialog(false);
                  setEditingEquipment(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Dialog */}
      {showExerciseDialog && editingExercise && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full my-8">
            <h3 className="text-2xl font-bold mb-6">
              {editingExercise.id ? 'Edit Exercise' : 'Add New Exercise'}
            </h3>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Exercise Name</label>
                  <input
                    type="text"
                    value={editingExercise.name}
                    onChange={(e) => setEditingExercise({ ...editingExercise, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Exercise name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                  <select
                    value={editingExercise.category}
                    onChange={(e) => setEditingExercise({ ...editingExercise, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select</option>
                    <option value="Strength">Strength</option>
                    <option value="Cardio">Cardio</option>
                    <option value="Flexibility">Flexibility</option>
                    <option value="Balance">Balance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty</label>
                  <select
                    value={editingExercise.difficulty}
                    onChange={(e) => setEditingExercise({ ...editingExercise, difficulty: e.target.value as 'Beginner' | 'Intermediate' | 'Advanced' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    value={editingExercise.description}
                    onChange={(e) => setEditingExercise({ ...editingExercise, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Exercise description"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Required Equipment (comma-separated)</label>
                  <input
                    type="text"
                    value={editingExercise.equipment.join(', ')}
                    onChange={(e) => setEditingExercise({ ...editingExercise, equipment: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Dumbbells, Bench, Resistance Bands"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Muscle Groups (comma-separated)</label>
                  <input
                    type="text"
                    value={editingExercise.muscleGroups.join(', ')}
                    onChange={(e) => setEditingExercise({ ...editingExercise, muscleGroups: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Chest, Triceps, Shoulders"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  if (!editingExercise.name || !editingExercise.category) {
                    alert('Please fill in all required fields');
                    return;
                  }
                  if (editingExercise.id) {
                    setExercises(exercises.map(e => e.id === editingExercise.id ? editingExercise : e));
                  } else {
                    setExercises([...exercises, { ...editingExercise, id: Date.now().toString(), isUserCreated: !isAdmin }]);
                  }
                  setShowExerciseDialog(false);
                  setEditingExercise(null);
                }}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                {editingExercise.id ? 'Save' : 'Add'}
              </button>
              <button
                onClick={() => {
                  setShowExerciseDialog(false);
                  setEditingExercise(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Device Dialog */}
      {showDeviceDialog && editingDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full my-8">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-2xl">📱</span>
                {editingDevice.id ? 'Edit Device' : 'Add New Compatible Device'}
              </h3>
              {editingDevice.codekey && (
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 border-2 border-purple-300 rounded-lg">
                  <span className="text-xs font-semibold text-purple-700">CODEKEY:</span>
                  <span className="text-sm font-bold text-purple-900 tracking-wider">{editingDevice.codekey}</span>
                </div>
              )}
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Device Name *</label>
                  <input
                    type="text"
                    value={editingDevice.name}
                    onChange={(e) => setEditingDevice({ ...editingDevice, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., GARMIN FORERUNNER 945"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Codekey *</label>
                  <input
                    type="text"
                    value={editingDevice.codekey || ''}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9\-_]/g, '');
                      setEditingDevice({ ...editingDevice, codekey: value });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono font-bold tracking-wider"
                    placeholder="e.g., GARM-FR945"
                    maxLength={20}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Unique protocol identifier (uppercase, numbers, - and _ only)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Brand *</label>
                  <input
                    type="text"
                    value={editingDevice.brand}
                    onChange={(e) => setEditingDevice({ ...editingDevice, brand: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Apple, Garmin, Fitbit"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Model</label>
                  <input
                    type="text"
                    value={editingDevice.model}
                    onChange={(e) => setEditingDevice({ ...editingDevice, model: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Series 9, Forerunner 945"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Device Type *</label>
                  <select
                    value={editingDevice.type}
                    onChange={(e) => setEditingDevice({ ...editingDevice, type: e.target.value as Device['type'] })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Watch">Smart Watch</option>
                    <option value="Tracker">Fitness Tracker</option>
                    <option value="Monitor">Heart Rate Monitor</option>
                    <option value="Scale">Smart Scale</option>
                    <option value="Sensor">Sensor</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sync Protocol *</label>
                  <input
                    type="text"
                    value={editingDevice.syncProtocol}
                    onChange={(e) => setEditingDevice({ ...editingDevice, syncProtocol: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Bluetooth LE, HealthKit, Garmin API, ANT+"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Compatibility (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editingDevice.compatibility.join(', ')}
                    onChange={(e) => setEditingDevice({ 
                      ...editingDevice, 
                      compatibility: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., iOS, Android, Windows, macOS, Bluetooth, Wi-Fi"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description (Shown to Users)</label>
                  <textarea
                    value={editingDevice.description}
                    onChange={(e) => setEditingDevice({ ...editingDevice, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter description that users will see when selecting this device in their Services"
                  />
                </div>

                <div className="col-span-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="deviceEnabled"
                      checked={editingDevice.isEnabled}
                      onChange={(e) => setEditingDevice({ ...editingDevice, isEnabled: e.target.checked })}
                      className="w-5 h-5 text-purple-600"
                    />
                    <label htmlFor="deviceEnabled" className="text-sm font-semibold text-gray-700">
                      Make this device available to users
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 ml-8">
                    When enabled, users will see this device option in their Services and can select it for workout tracking
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  if (!editingDevice.name || !editingDevice.brand || !editingDevice.codekey || !editingDevice.syncProtocol) {
                    alert('Please fill in all required fields (Name, Brand, Codekey, Sync Protocol)');
                    return;
                  }
                  // Check for duplicate codekey
                  const existingDevice = devices.find(d => d.codekey === editingDevice.codekey && d.id !== editingDevice.id);
                  if (existingDevice) {
                    alert(`⚠️ Codekey "${editingDevice.codekey}" is already in use by "${existingDevice.name}".\n\nEach device must have a unique codekey.`);
                    return;
                  }
                  if (editingDevice.id) {
                    setDevices(devices.map(d => d.id === editingDevice.id ? editingDevice : d));
                  } else {
                    setDevices([...devices, { ...editingDevice, id: Date.now().toString(), isUserCreated: !isAdmin }]);
                  }
                  setShowDeviceDialog(false);
                  setEditingDevice(null);
                }}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
              >
                {editingDevice.id ? 'Save Device' : 'Add Device'}
              </button>
              <button
                onClick={() => {
                  setShowDeviceDialog(false);
                  setEditingDevice(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Dialog (Admin or Personal) */}
      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">
              🔐 {isAdmin ? 'Super Admin Authentication' : 'Confirm Your Identity'}
            </h3>
            <p className="text-gray-600 mb-4">
              {isAdmin ? (
                <>
                  You are about to save <strong>ALL CURRENT SETTINGS FROM ALL TABS</strong> as <strong>DEFAULT</strong> for <strong>{SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}</strong>.
                </>
              ) : (
                <>
                  Please enter your password to confirm and save your <strong>personal settings</strong>.
                </>
              )}
            </p>
            {isAdmin && (
              <div className="text-sm text-orange-700 bg-orange-50 p-3 rounded-lg mb-4 space-y-2">
                <p><strong>📌 What will be saved to {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name.toUpperCase()}:</strong></p>
                <ul className="list-disc ml-5 space-y-1">
                  <li><strong>Periods:</strong> All periods from Periods tab</li>
                  <li><strong>Sections:</strong> All sections from Sections tab</li>
                  <li><strong>Sports:</strong> All sports from Main Sports tab</li>
                  <li><strong>Equipment:</strong> All equipment from Personal Equipment tab</li>
                  <li><strong>Exercises:</strong> All exercises from Exercise Bank tab</li>
                  <li><strong>Library:</strong> All exercises from My Library tab</li>
                  <li><strong>Devices:</strong> All devices from Device Enabled tab</li>
                </ul>
                <p className="pt-2 font-semibold"><strong>👥 For users:</strong> All these settings will be available when they click "Load Admin Defaults" button.</p>
              </div>
            )}
            {!isAdmin && (
              <div className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg mb-4">
                <p><strong>💾 Saving Your Personal Settings:</strong></p>
                <p className="mt-1">These settings will be saved to your account only and will not affect other users.</p>
              </div>
            )}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isAdmin ? 'Super Admin Password:' : 'Your Password:'}
              </label>
              <input
                type="password"
                value={superAdminPassword}
                onChange={(e) => setSuperAdminPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="Enter password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePasswordSubmit}
                className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold"
              >
                {isAdmin ? 'Save Defaults' : 'Save My Settings'}
              </button>
              <button
                onClick={() => {
                  setShowPasswordDialog(false);
                  setSuperAdminPassword('');
                }}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Language Defaults Dialog */}
      {showLoadDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">📥 Load {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name} Defaults</h3>
            <p className="text-gray-600 mb-4">
              Load default tools settings for <strong>{SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}</strong>?
            </p>
            <div className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg mb-3">
              <p className="font-semibold mb-1">📖 How it works:</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li>Loads {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name} defaults for ALL tabs</li>
                <li>You can edit/translate items in any tab (Sports, Equipment, etc.)</li>
                <li>Select a different language if needed (e.g., Russian)</li>
                <li>Click "Save to [Language]" to save ALL tabs at once</li>
              </ol>
            </div>
            <p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg mb-4">
              ⚠️ <strong>Note:</strong> This will replace ALL current unsaved changes in ALL tabs with the {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name} defaults.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleLoadConfirm}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
              >
                Load {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}
              </button>
              <button
                onClick={() => setShowLoadDialog(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sport Dialog */}
      {showEditSportDialog && editingSport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-6">
              ✏️ Edit Sport - Translation
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Sport Name</label>
                <input
                  type="text"
                  value={editingSport.name}
                  onChange={(e) => setEditingSport({ ...editingSport, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter sport name in your language"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Translate the sport name into {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Sport Icon (Emoji)</label>
                <input
                  type="text"
                  value={editingSport.icon}
                  onChange={(e) => setEditingSport({ ...editingSport, icon: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-2xl text-center"
                  placeholder="🏊‍♂️"
                  maxLength={5}
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can change the emoji icon if needed
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  <strong>💡 Tip:</strong> After translating all sports, click "Save as DEFAULT" at the top to save them for {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  if (!editingSport.name.trim()) {
                    alert('Please enter a sport name');
                    return;
                  }
                  setSports(sports.map(s => s.id === editingSport.id ? editingSport : s));
                  setShowEditSportDialog(false);
                  setEditingSport(null);
                }}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={() => {
                  setShowEditSportDialog(false);
                  setEditingSport(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Load Admin-Created Language Defaults
 * - Loads default settings created by admins for a specific language
 * - Users can load these as a template for their personal settings
 * - Users then save their customized version to their user_settings
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || 'en';

    // Load all default settings for the specified language
    let colorDefaults, toolsDefaults, favouritesDefaults, myBestDefaults, gridDefaults;
    
    try {
      [colorDefaults, toolsDefaults, favouritesDefaults] = await Promise.all([
        prisma.colorDefaults.findUnique({ where: { language } }),
        prisma.toolsDefaults.findUnique({ where: { language } }),
        prisma.favouritesDefaults.findUnique({ where: { language } })
      ]);
      
      // Try to load new models if they exist
      if ((prisma as any).myBestDefaults) {
        myBestDefaults = await (prisma as any).myBestDefaults.findUnique({ where: { language } });
      }
      if ((prisma as any).gridDefaults) {
        gridDefaults = await (prisma as any).gridDefaults.findUnique({ where: { language } });
      }
    } catch (error) {
      console.error('Error loading some defaults:', error);
    }

    // If no defaults found for this language, try to load English defaults as fallback
    if (!colorDefaults && !toolsDefaults && !favouritesDefaults) {
      let colorDefaultsEn, toolsDefaultsEn, favouritesDefaultsEn, myBestDefaultsEn, gridDefaultsEn;
      
      try {
        [colorDefaultsEn, toolsDefaultsEn, favouritesDefaultsEn] = await Promise.all([
          prisma.colorDefaults.findUnique({ where: { language: 'en' } }),
          prisma.toolsDefaults.findUnique({ where: { language: 'en' } }),
          prisma.favouritesDefaults.findUnique({ where: { language: 'en' } })
        ]);
        
        if ((prisma as any).myBestDefaults) {
          myBestDefaultsEn = await (prisma as any).myBestDefaults.findUnique({ where: { language: 'en' } });
        }
        if ((prisma as any).gridDefaults) {
          gridDefaultsEn = await (prisma as any).gridDefaults.findUnique({ where: { language: 'en' } });
        }
      } catch (error) {
        console.error('Error loading English defaults:', error);
      }

      return NextResponse.json({
        success: true,
        language: 'en', // Fallback to English
        settings: {
          colorSettings: colorDefaultsEn?.data || {},
          toolsSettings: toolsDefaultsEn?.data || {},
          favouritesSettings: favouritesDefaultsEn?.data || {},
          myBestSettings: myBestDefaultsEn?.data || {},
          gridSettings: gridDefaultsEn?.data || {}
        }
      });
    }

    return NextResponse.json({
      success: true,
      language,
      settings: {
        colorSettings: colorDefaults?.data || {},
        toolsSettings: toolsDefaults?.data || {},
        favouritesSettings: favouritesDefaults?.data || {},
        myBestSettings: myBestDefaults?.data || {},
        gridSettings: gridDefaults?.data || {}
      }
    });
  } catch (error) {
    console.error('Error loading default settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load default settings' },
      { status: 500 }
    );
  }
}


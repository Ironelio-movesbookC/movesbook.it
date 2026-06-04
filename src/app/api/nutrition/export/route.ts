import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/nutrition/export - Export workouts as JSON, CSV, or PDF
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // json, csv, pdf
    const type = searchParams.get('type'); // day, week, month, plan
    const id = searchParams.get('id'); // ID of the item to export

    console.log('📤 Exporting meals:', { format, type, id });

    let data: any = null;

    // Fetch data based on type
    switch (type) {
      case 'day':
        data = await prisma.nutritionDay.findUnique({
          where: { id: id! },
          include: {
            meals: {
              include: {
                sports: true,
                nutritionFoods: {
                  include: {
                    nutritionComponents: true,
                    section: true
                  }
                }
              }
            },
            period: true
          }
        });
        // Verify user ownership
        if (data && data.userId !== decoded.userId) {
          return NextResponse.json({ error: 'Unauthorized - not your workout day' }, { status: 403 });
        }
        break;

      case 'week':
        data = await prisma.nutritionWeek.findUnique({
          where: { id: id! },
          include: {
            nutritionPlan: {
              select: { userId: true }
            },
            days: {
              include: {
                meals: {
                  include: {
                    sports: true,
                    nutritionFoods: {
                      include: {
                        nutritionComponents: true,
                        section: true
                      }
                    }
                  }
                },
                period: true
              }
            }
          }
        });
        // Verify user ownership through nutritionPlan (works even if no days exist)
        if (!data) {
          return NextResponse.json({ error: 'Week not found' }, { status: 404 });
        }
        if (data.nutritionPlan?.userId !== decoded.userId) {
          return NextResponse.json({ error: 'Unauthorized - not your workout week' }, { status: 403 });
        }
        break;

      case 'plan':
        data = await prisma.nutritionPlan.findFirst({
          where: { 
            userId: decoded.userId,
            type: 'CURRENT_WEEKS'
          },
          include: {
            weeks: {
              include: {
                days: {
                  include: {
                    meals: {
                      include: {
                        sports: true,
                        nutritionFoods: {
                          include: {
                            nutritionComponents: true,
                            section: true
                          }
                        }
                      }
                    },
                    period: true
                  }
                }
              }
            }
          }
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    }

    // Format data based on requested format
    switch (format) {
      case 'json':
        return NextResponse.json(data, {
          headers: {
            'Content-Disposition': `attachment; filename="workout-${type}-${id}.json"`
          }
        });

      case 'csv':
        const csv = convertToCSV(data, type);
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="workout-${type}-${id}.csv"`
          }
        });

      case 'pdf':
        // For PDF, we'll return JSON with a special flag
        // The frontend can use a library like jsPDF to generate the PDF
        return NextResponse.json({ 
          data,
          format: 'pdf',
          message: 'Use frontend PDF library to generate PDF from this data'
        });

      default:
        return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('❌ Error exporting meals:', error);
    return NextResponse.json(
      { error: 'Failed to export workouts', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to convert data to CSV
function convertToCSV(data: any, type: string): string {
  const rows: string[] = [];

  if (type === 'day') {
    rows.push('Date,Workout,NutritionFood,Distance,Speed,Pace,Reps');
    
    data.workouts?.forEach((workout: any) => {
      workout.nutritionFoods?.forEach((mf: any) => {
        rows.push([
          new Date(data.date).toLocaleDateString(),
          workout.name || 'Workout',
          mf.description || '',
          mf.distance || '',
          mf.speed || '',
          mf.pace || '',
          mf.nutritionComponents?.length || 0
        ].join(','));
      });
    });
  } else if (type === 'week') {
    rows.push('Date,Day,Workout,NutritionFoods,Total Distance');
    
    data.days?.forEach((day: any) => {
      const totalNutritionFoods = day.workouts?.reduce((sum: number, w: any) => 
        sum + (w.nutritionFoods?.length || 0), 0);
      const totalDistance = day.workouts?.reduce((sum: number, w: any) =>
        sum + (w.nutritionFoods?.reduce((s: number, mf: any) => s + (mf.distance || 0), 0) || 0), 0);
      
      rows.push([
        new Date(day.date).toLocaleDateString(),
        new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' }),
        day.workouts?.length || 0,
        totalNutritionFoods,
        totalDistance
      ].join(','));
    });
  }

  return rows.join('\n');
}

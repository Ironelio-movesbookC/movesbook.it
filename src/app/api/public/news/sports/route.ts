import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sports = [
      { id: '1', name: 'Athletic' },
      { id: '2', name: 'American football' },
      { id: '3', name: 'Baseball' },
      { id: '4', name: 'Basketball' },
      { id: '9', name: 'Cycling' },
      { id: '10', name: 'Fitness' },
      { id: '11', name: 'Martial arts' },
      { id: '12', name: 'Mountain Bike' },
      { id: '13', name: 'Rugby' },
      { id: '14', name: 'Running' },
      { id: '15', name: 'Soccer' },
      { id: '16', name: 'Swim' },
      { id: '17', name: 'Tennis' },
      { id: '18', name: 'Triathlon' },
      { id: '19', name: 'Volley' },
      { id: '26', name: 'Gym' },
      { id: '28', name: 'Body Building' },
      { id: '29', name: 'Boxing' },
      { id: '30', name: 'Gymnastic' },
      { id: '31', name: 'Others' },
    ];

    return NextResponse.json(sports);
  } catch (error: any) {
    console.error('Error fetching sports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sports', details: error.message },
      { status: 500 }
    );
  }
}

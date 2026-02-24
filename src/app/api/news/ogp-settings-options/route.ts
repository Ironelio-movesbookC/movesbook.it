import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ALL_LANGUAGES } from '@/constants/language.constants';
import { UserType, SportType } from '@prisma/client';

const USER_TYPE_LABELS: Record<string, string> = {
  ATHLETE: 'Athlete',
  COACH: 'Coach',
  TEAM: 'Team',
  TEAM_MANAGER: 'Team Manager',
  CLUB: 'Club',
  CLUB_TRAINER: 'Club Trainer',
  GROUP: 'Group',
  GROUP_ADMIN: 'Group Admin',
  ADMIN: 'Admin',
};

const SPORT_TYPE_LABELS: Record<string, string> = {
  SWIM: 'Swimming',
  BIKE: 'Cycling',
  MTB: 'Mountain Bike',
  SPINNING: 'Spinning',
  RUN: 'Running',
  BODY_BUILDING: 'Body Building',
  ROWING: 'Rowing',
  CANOEING: 'Canoeing',
  SKATE: 'Skate',
  GYMNASTIC: 'Gymnastic',
  STRETCHING: 'Stretching',
  PILATES: 'Pilates',
  YOGA: 'Yoga',
  SKI: 'Ski',
  SNOWBOARD: 'Snowboard',
  SOCCER: 'Soccer',
  BASKETBALL: 'Basketball',
  TENNIS: 'Tennis',
  VOLLEYBALL: 'Volleyball',
  GOLF: 'Golf',
  BOXING: 'Boxing',
  MARTIAL_ARTS: 'Martial arts',
  CLIMBING: 'Climbing',
  HIKING: 'Hiking',
  WALKING: 'Walking',
  DANCING: 'Dancing',
  CALISTENIC: 'Calisthenic',
  CROSSFIT: 'Crossfit',
  SPARTAN: 'Spartan',
  TRIATHLON: 'Triathlon',
  TRACK_FIELD: 'Track & Field',
  TECHNICAL_MOVES: 'Technical Moves',
  FREE_MOVES: 'Free Moves',
};

export async function GET() {
  try {
    const userTypes = (Object.keys(UserType) as UserType[]).filter((t) => t !== 'ADMIN').map((value) => ({
      value,
      label: USER_TYPE_LABELS[value] ?? value,
    }));

    const countries = await prisma.user.findMany({
      where: { country: { not: null } },
      select: { country: true },
      distinct: ['country'],
    });
    const countryList = Array.from(new Set(countries.map((u) => u.country).filter(Boolean) as string[])).sort();

    const languages = ALL_LANGUAGES.map((l) => ({ value: l.code, label: `${l.code} (${l.name})` }));

    const sports = (Object.keys(SportType) as SportType[]).map((value) => ({
      value,
      label: SPORT_TYPE_LABELS[value] ?? value.replace(/_/g, ' '),
    }));

    return NextResponse.json({ userTypes, countries: countryList, languages, sports });
  } catch (e) {
    console.error('GET /api/news/ogp-settings-options', e);
    return NextResponse.json({ error: 'Failed to load options' }, { status: 500 });
  }
}

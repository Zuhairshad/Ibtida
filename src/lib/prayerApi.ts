const API_KEY = process.env.EXPO_PUBLIC_PRAYER_API_KEY ?? '';

// Base URL to be confirmed by user — returns null until configured
export async function fetchPrayerTimesFromApi(
  _lat: number,
  _lng: number,
  _date: Date
): Promise<null> {
  return null;
}

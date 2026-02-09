import { NextResponse } from 'next/server';
import { aggregateSales } from '@/lib/aggregator/service';

const API_KEY_HEADER = 'x-api-key';

export async function POST(request: Request) {
  const expectedKey = process.env.X_API_KEY;
  if (!expectedKey) {
    console.error('AGGREGATOR_API_KEY env var is not configured');
    return NextResponse.json(
      { message: 'Server misconfiguration' },
      { status: 500 }
    );
  }

  const providedKey = request.headers.get(API_KEY_HEADER);
  if (providedKey !== expectedKey) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Run aggregation in background (fire-and-forget)
    aggregateSales().catch((err) => {
      console.error('Aggregator error:', err);
    });

    return NextResponse.json(
      { message: 'Aggregation started', status: 'accepted' },
      { status: 202 }
    );
  } catch (error) {
    console.error('Failed to start aggregation', error);
    return NextResponse.json(
      { message: 'Failed to start aggregation' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const { fileName } = await req.json();

  if (!fileName)
    return NextResponse.json({ error: 'File name required' }, { status: 400 });

  /* ------------------------------------------------------------------ */
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    timestamp,
    folder: 'user_uploads',
    public_id: fileName.split('.')[0],          // strip extension
  };

  /* ------------------------------------------------------------------ */
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  const signature = crypto
    .createHash('sha256')
    .update(
      Object.keys(params)
        .sort()
        .map((k) => `${k}=${(params as any)[k]}`)
        .join('&') + apiSecret,
    )
    .digest('hex');

  return NextResponse.json({
    ...params,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
}

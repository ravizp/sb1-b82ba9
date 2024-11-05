import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { database } from '@/db/config';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const { message, planId, clerkId, imageData } = await req.json();
    
    let imageUrl = null;
    if (imageData) {
      const uploadResponse = await cloudinary.uploader.upload(imageData, {
        folder: 'chat-images',
      });
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = {
      planId,
      clerkId,
      message,
      imageUrl,
      createdAt: new Date(),
    };

    const result = await database.collection('Discussions').insertOne(newMessage);
    
    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get('planId');
    
    if (!planId) {
      return NextResponse.json({ success: false, error: 'Plan ID is required' }, { status: 400 });
    }

    const messages = await database
      .collection('Discussions')
      .find({ planId })
      .sort({ createdAt: 1 })
      .toArray();

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch messages' }, { status: 500 });
  }
}
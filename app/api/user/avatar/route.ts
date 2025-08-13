import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}'),
});

const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'docbare-uploads';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const formData = await req.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json({ 
        error: 'No image file provided' 
      }, { status: 400 });
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json({ 
        error: 'File must be an image' 
      }, { status: 400 });
    }

    // Validate file size (5MB limit)
    if (imageFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'Image size must be less than 5MB' 
      }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    
    // Generate unique filename
    const fileExtension = imageFile.name.split('.').pop() || 'jpg';
    const fileName = `avatars/${session.user.id}-${Date.now()}.${fileExtension}`;

    // Upload to Google Cloud Storage
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    await file.save(buffer, {
      metadata: {
        contentType: imageFile.type,
      },
      public: true,
    });

    // Get public URL
    const imageUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    // Update user profile with new image URL
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        image: imageUrl,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      imageUrl,
      message: 'Profile picture uploaded successfully'
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload image' 
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Remove image URL from user profile
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        image: null,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Profile picture removed successfully'
    });

  } catch (error) {
    console.error('Avatar removal error:', error);
    return NextResponse.json({ 
      error: 'Failed to remove profile picture' 
    }, { status: 500 });
  }
}

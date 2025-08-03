#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface BackupData {
  users: any[];
  chatSessions: any[];
  chatMessages: any[];
  documents: any[];
  ragQueryLogs: any[];
  documentChunkMetadata: any[];
  subscriptions: any[];
  apiKeys: any[];
  auditLogs: any[];
  services: any[];
  subscriptionPlans: any[];
  blogPosts: any[];
  blogSubmissions: any[];
  blogTags: any[];
  blogAttachments: any[];
  blogAuthors: any[];
  blogVersions: any[];
}

async function backupDatabase(): Promise<BackupData> {
  console.log('🔄 Backing up database...');
  
  try {
    const backup: BackupData = {
      users: await prisma.user.findMany(),
      chatSessions: await prisma.chatSession.findMany(),
      chatMessages: await prisma.chatMessage.findMany(),
      documents: await prisma.document.findMany(),
      ragQueryLogs: await prisma.ragQueryLog.findMany(),
      documentChunkMetadata: await prisma.documentChunkMetadata.findMany(),
      subscriptions: await prisma.subscription.findMany(),
      apiKeys: await prisma.apiKey.findMany(),
      auditLogs: await prisma.auditLog.findMany(),
      services: await prisma.service.findMany(),
      subscriptionPlans: await prisma.subscriptionPlan.findMany(),
      blogPosts: await prisma.blogPost.findMany(),
      blogSubmissions: await prisma.blogSubmission.findMany(),
      blogTags: await prisma.blogTag.findMany(),
      blogAttachments: await prisma.blogAttachment.findMany(),
      blogAuthors: await prisma.blogAuthor.findMany(),
      blogVersions: await prisma.blogVersion.findMany(),
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(__dirname, '..', 'backups', `backup-${timestamp}.json`);
    
    // Ensure backups directory exists
    const backupsDir = path.dirname(backupPath);
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`✅ Database backed up to: ${backupPath}`);
    
    return backup;
  } catch (error) {
    console.error('❌ Failed to backup database:', error);
    throw error;
  }
}

async function restoreDatabase(backup: BackupData): Promise<void> {
  console.log('🔄 Restoring database...');
  
  try {
    // Restore in order to maintain foreign key relationships
    await prisma.service.createMany({ data: backup.services, skipDuplicates: true });
    await prisma.subscriptionPlan.createMany({ data: backup.subscriptionPlans, skipDuplicates: true });
    await prisma.user.createMany({ data: backup.users, skipDuplicates: true });
    await prisma.subscription.createMany({ data: backup.subscriptions, skipDuplicates: true });
    await prisma.apiKey.createMany({ data: backup.apiKeys, skipDuplicates: true });
    await prisma.auditLog.createMany({ data: backup.auditLogs, skipDuplicates: true });
    await prisma.chatSession.createMany({ data: backup.chatSessions, skipDuplicates: true });
    await prisma.chatMessage.createMany({ data: backup.chatMessages, skipDuplicates: true });
    await prisma.document.createMany({ data: backup.documents, skipDuplicates: true });
    await prisma.ragQueryLog.createMany({ data: backup.ragQueryLogs, skipDuplicates: true });
    await prisma.documentChunkMetadata.createMany({ data: backup.documentChunkMetadata, skipDuplicates: true });
    await prisma.blogAuthor.createMany({ data: backup.blogAuthors, skipDuplicates: true });
    await prisma.blogTag.createMany({ data: backup.blogTags, skipDuplicates: true });
    await prisma.blogPost.createMany({ data: backup.blogPosts, skipDuplicates: true });
    await prisma.blogSubmission.createMany({ data: backup.blogSubmissions, skipDuplicates: true });
    await prisma.blogAttachment.createMany({ data: backup.blogAttachments, skipDuplicates: true });
    await prisma.blogVersion.createMany({ data: backup.blogVersions, skipDuplicates: true });
    
    console.log('✅ Database restored successfully');
  } catch (error) {
    console.error('❌ Failed to restore database:', error);
    throw error;
  }
}

async function safeMigration(): Promise<void> {
  console.log('🚀 Starting safe migration process...');
  
  let backup: BackupData | null = null;
  
  try {
    // Step 1: Backup current data
    backup = await backupDatabase();
    
    // Step 2: Generate Prisma client
    console.log('🔄 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Step 3: Push schema changes (safe, won't reset data)
    console.log('🔄 Pushing schema changes...');
    execSync('npx prisma db push', { stdio: 'inherit' });
    
    // Step 4: Verify data integrity
    console.log('🔄 Verifying data integrity...');
    const userCount = await prisma.user.count();
    const sessionCount = await prisma.chatSession.count();
    
    console.log(`✅ Verification complete: ${userCount} users, ${sessionCount} sessions`);
    
    console.log('🎉 Safe migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    // Ask user if they want to restore
    if (backup) {
      console.log('🔄 Would you like to restore the backup? (y/n)');
      process.stdin.once('data', async (data) => {
        const answer = data.toString().trim().toLowerCase();
        if (answer === 'y' || answer === 'yes') {
          try {
            await restoreDatabase(backup!);
            console.log('✅ Database restored from backup');
          } catch (restoreError) {
            console.error('❌ Failed to restore database:', restoreError);
          }
        }
        process.exit(1);
      });
    } else {
      console.log('❌ No backup available for restoration');
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the safe migration
if (require.main === module) {
  safeMigration().catch(console.error);
}

export { safeMigration, backupDatabase, restoreDatabase }; 
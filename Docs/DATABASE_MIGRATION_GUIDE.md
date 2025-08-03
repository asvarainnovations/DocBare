# Database Migration Guide

## 🚨 **CRITICAL: Preventing Data Loss**

Your database is getting reset because of how Prisma migrations are being handled. This guide will help you implement safe migration practices.

## 🔧 **Safe Migration Commands**

### **✅ SAFE Commands (Use These)**
```bash
# Push schema changes without resetting data
npm run db:push

# Generate Prisma client
npm run db:generate

# Safe migration with backup
npm run safe-migration

# View database in browser
npm run db:studio
```

### **❌ DANGEROUS Commands (Avoid These)**
```bash
# This will RESET your database!
npx prisma migrate dev

# This will also reset your database!
npx prisma migrate reset

# Only use in development with no important data
npx prisma db push --force-reset
```

## 🛡️ **Safe Migration Process**

### **Step 1: Always Backup First**
```bash
# Create a backup before any changes
npm run db:backup
```

### **Step 2: Use Safe Migration Script**
```bash
# Run the safe migration script
npm run safe-migration
```

This script will:
1. ✅ Backup all your data
2. ✅ Generate Prisma client
3. ✅ Push schema changes safely
4. ✅ Verify data integrity
5. ✅ Offer restoration if something goes wrong

### **Step 3: Verify Changes**
```bash
# Check your database
npm run db:studio
```

## 📋 **Migration Workflow**

### **For Schema Changes:**
```bash
# 1. Backup current data
npm run db:backup

# 2. Make changes to prisma/schema.prisma

# 3. Run safe migration
npm run safe-migration

# 4. Verify in Prisma Studio
npm run db:studio
```

### **For Production Deployments:**
```bash
# 1. Create migration file (without applying)
npm run db:migrate

# 2. Review the generated migration file
# 3. Apply migration safely
npm run db:deploy
```

## 🔍 **Why Your Database Gets Reset**

### **Common Causes:**
1. **`prisma migrate dev`** - Resets database in development
2. **`prisma migrate reset`** - Explicitly resets database
3. **Schema conflicts** - When schema doesn't match database state
4. **Migration history issues** - Corrupted migration files

### **Solutions:**
1. **Use `prisma db push`** instead of `prisma migrate dev`
2. **Always backup** before making changes
3. **Use safe migration script** for complex changes
4. **Check migration history** regularly

## 🛠️ **Troubleshooting**

### **If Database Gets Reset:**
```bash
# 1. Check if you have a recent backup
ls -la backups/

# 2. Restore from backup
node scripts/restore-backup.js backup-YYYY-MM-DD-HH-MM-SS.json

# 3. Re-run safe migration
npm run safe-migration
```

### **If Migration Fails:**
```bash
# 1. Check Prisma Studio for current state
npm run db:studio

# 2. Reset Prisma client
npm run db:generate

# 3. Try safe migration again
npm run safe-migration
```

### **If Schema Conflicts:**
```bash
# 1. Check current database state
npx prisma db pull

# 2. Compare with your schema
# 3. Resolve conflicts manually
# 4. Use safe migration
```

## 📊 **Database Backup Strategy**

### **Automatic Backups:**
```bash
# Add to your deployment pipeline
npm run db:backup
```

### **Backup Locations:**
- `backups/` - Local backups
- Cloud storage (Google Cloud Storage)
- Database snapshots (if available)

### **Backup Frequency:**
- **Before every migration** - Automatic
- **Daily** - Scheduled backup
- **Before deployments** - Manual backup

## 🔐 **Production Considerations**

### **Safe Production Migrations:**
```bash
# 1. Create migration file
npm run db:migrate

# 2. Review migration file
# 3. Test on staging environment
# 4. Apply to production
npm run db:deploy
```

### **Rollback Strategy:**
```bash
# 1. Keep previous migration files
# 2. Use database backups
# 3. Have rollback scripts ready
```

## 📝 **Best Practices**

### **✅ DO:**
- Always backup before migrations
- Use `prisma db push` for development
- Test migrations on staging first
- Keep migration files in version control
- Monitor database state regularly

### **❌ DON'T:**
- Use `prisma migrate dev` on production data
- Skip backups before changes
- Ignore migration conflicts
- Delete migration files without understanding
- Run migrations without testing

## 🚀 **Quick Reference**

| Command | Purpose | Safe? |
|---------|---------|-------|
| `npm run db:push` | Push schema changes | ✅ |
| `npm run db:generate` | Generate Prisma client | ✅ |
| `npm run safe-migration` | Safe migration with backup | ✅ |
| `npm run db:studio` | View database | ✅ |
| `npm run db:backup` | Create backup | ✅ |
| `npx prisma migrate dev` | Development migration | ❌ |
| `npx prisma migrate reset` | Reset database | ❌ |

## 🆘 **Emergency Recovery**

### **If All Data is Lost:**
1. **Check backups** in `backups/` directory
2. **Restore from latest backup**
3. **Re-run safe migration**
4. **Verify data integrity**

### **Contact Support:**
- Check migration logs
- Review backup files
- Document what happened
- Prevent future occurrences

---

**Remember: Always backup before making any database changes!** 🛡️ 
# Firestore Indexes Setup

## Overview

This document explains how Firestore indexes are configured and deployed for the DocBare application.

## Index Configuration

All Firestore indexes are defined in `firestore.indexes.json` at the project root. This file is used by Firebase CLI to deploy indexes to Firestore.

## Current Indexes

### Document Collections
- **documents**: `userId` + `uploadDate` (desc)
- **chat_sessions**: `userId` + `createdAt` (desc)  
- **chat_messages**: `sessionId` + `createdAt` (asc)
- **document_analyses**: `userId` + `createdAt` (desc)
- **document_analyses**: `documentId` + `analysisType` + `createdAt` (desc)

### Agent Memory Collection
- **agent_memory**: `sessionId` + `userId` + `accessedAt` (desc)
- **agent_memory**: `sessionId` + `userId` + `type` + `accessedAt` (desc)
- **agent_memory**: `userId` + `accessedAt` (desc)
- **agent_memory**: `userId` + `type` + `accessedAt` (desc)

## Deployment

### Automatic Deployment
```bash
npm run deploy:firestore-indexes
```

### Manual Deployment
1. **Authenticate with Firebase:**
   ```bash
   firebase login --reauth
   ```

2. **Deploy indexes:**
   ```bash
   firebase deploy --only firestore:indexes
   ```

### Manual Setup via Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/v1/r/project/utopian-pride-462008-j4/firestore/indexes)
2. Click "Create Index"
3. Add the required composite indexes as defined in `firestore.indexes.json`

## Index Building Time

After deployment, Firestore indexes may take several minutes to build, especially for large collections. During this time, queries requiring these indexes may fail with "The query requires an index" errors.

## Troubleshooting

### Common Issues

1. **Authentication Error:**
   ```
   Authentication Error: Your credentials are no longer valid
   ```
   **Solution:** Run `firebase login --reauth`

2. **Index Not Found Error:**
   ```
   The query requires an index
   ```
   **Solution:** 
   - Wait for indexes to finish building (check Firebase Console)
   - Verify indexes are deployed correctly
   - Check if the query matches the index structure

3. **Index Building Failed:**
   - Check Firebase Console for index status
   - Verify index configuration in `firestore.indexes.json`
   - Ensure collection and field names match exactly

### Monitoring Index Status

1. Go to Firebase Console → Firestore → Indexes
2. Check the status of each index:
   - **Building**: Index is being created
   - **Enabled**: Index is ready for use
   - **Error**: Index creation failed

## Best Practices

1. **Define indexes before deploying queries** that require them
2. **Use composite indexes** for queries with multiple filters and ordering
3. **Monitor index usage** in Firebase Console to optimize performance
4. **Test queries** in development before deploying to production
5. **Keep index definitions** in version control (`firestore.indexes.json`)

## Adding New Indexes

1. **Update `firestore.indexes.json`:**
   ```json
   {
     "collectionGroup": "collection_name",
     "queryScope": "COLLECTION",
     "fields": [
       { "fieldPath": "field1", "order": "ASCENDING" },
       { "fieldPath": "field2", "order": "DESCENDING" }
     ]
   }
   ```

2. **Deploy the indexes:**
   ```bash
   npm run deploy:firestore-indexes
   ```

3. **Wait for index building** to complete before testing queries

## Related Files

- `firestore.indexes.json` - Index definitions
- `scripts/deploy-firestore-indexes.js` - Deployment script
- `lib/memory.ts` - Memory system using these indexes
- `app/api/query/route.ts` - Query API using memory system 
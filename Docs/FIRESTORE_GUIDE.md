# Firestore Guide

## Firestore Security & Indexes

- Firestore security rules enforce per-user access for all collections (documents, chunks, embeddings, sessions, feedback, etc.).
- Composite indexes are required for listing documents and chat sessions by userId and date. See `firestore.indexes.json`.
- To deploy rules and indexes:
  ```bash
  firebase deploy --only firestore:rules,firestore:indexes
  ```

## Adding New Firestore Indexes

If you encounter Firestore errors about missing composite indexes (e.g., when running a query that requires an index), follow these steps to add and deploy new indexes:

1. **Trigger the Query:**
   - Run the query in your app or via the Firebase Console that causes the index error.
   - Firestore will show an error message with a link to create the required index.

2. **Get the Index Definition:**
   - Click the link in the error message, or copy the suggested index JSON from the error details.
   - Example error:
     > "Firestore: The query requires a composite index. You can create it here: https://console.firebase.google.com/..."

3. **Update `firestore.indexes.json`:**
   - Open the `firestore.indexes.json` file in your project root.
   - Add the new index definition under the `indexes` array. Make sure to preserve valid JSON structure.
   - Example:
     ```json
     {
       "collectionGroup": "documents",
       "queryScope": "COLLECTION",
       "fields": [
         { "fieldPath": "userId", "order": "ASCENDING" },
         { "fieldPath": "createdAt", "order": "DESCENDING" }
       ]
     }
     ```

4. **Deploy the Indexes:**
   - Use the Firebase CLI to deploy the updated indexes:
     ```bash
     firebase deploy --only firestore:indexes
     ```
   - This will update Firestore with any new or changed indexes from your `firestore.indexes.json` file.

5. **Wait for Index Build:**
   - After deployment, Firestore may take a few minutes to build the new index.
   - You can monitor index build progress in the [Firebase Console > Firestore Indexes](https://console.firebase.google.com/).

6. **Test the Query Again:**
   - Once the index is built, re-run your query to confirm the error is resolved.

**Tips:**
- Always keep `firestore.indexes.json` under version control (Git) so your team and CI/CD can deploy the same indexes.
- If you remove or change queries, you may want to clean up unused indexes in the console.
- For more info, see [Firestore Indexes documentation](https://firebase.google.com/docs/firestore/query-data/indexing).

## Seeding Firestore (Dev/Test)

- Use the provided seeding script to populate Firestore with sample users, documents, and chunks for development/testing:
  ```bash
  npm run seed-firestore
  # or
  yarn seed-firestore
  ``` 
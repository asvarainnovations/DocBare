# Admin Dashboard Documentation

## Overview

The Asvara Admin Dashboard is a comprehensive feedback management system designed for the Asvara Company team to monitor and manage user feedback from the DocBare platform.

## Features

### 1. Dashboard Home (`/admin`)
- **Quick Stats Cards**: Display total feedbacks, good vs. bad percentage, and active users
- **Call-to-Action**: Direct link to view all feedback
- **Real-time Data**: Live statistics from the database

### 2. Feedbacks Page (`/admin/feedbacks`)
- **User List**: Table showing all users who have given feedback
- **Search & Filter**: Filter by user email/name and date range
- **User Statistics**: Shows total chats, good/bad feedback counts, and last activity
- **Interactive Rows**: Click on any user to view their detailed feedback

### 3. User Feedback Detail (`/admin/feedbacks/[userId]`)
- **User Profile**: Display user information and avatar
- **Feedback Statistics**: Aggregate counts for the selected user
- **Chat Sessions List**: All chat sessions with feedback badges
- **Chat Transcript**: Full conversation with feedback markers
- **Feedback Comments**: User comments for bad responses
- **Admin Actions**: Mark resolved and add admin notes

## Database Schema

### New Models Added

#### Admin Model
```prisma
model Admin {
  id        String   @id @default(uuid())
  userId    String   @unique
  createdAt DateTime @default(now())
  createdBy String?  // References another admin who invited them
  active    Boolean  @default(true)
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdByAdmin Admin? @relation("AdminInvites", fields: [createdBy], references: [id])
  invitedAdmins Admin[] @relation("AdminInvites")
  invites   AdminInvite[]
  
  @@index([userId])
  @@index([createdBy])
}
```

#### AdminInvite Model
```prisma
model AdminInvite {
  code        String   @id // Random 32-char token
  email       String
  invitedBy   String?  // References admin who created the invite
  createdAt   DateTime @default(now())
  expiresAt   DateTime
  redeemed    Boolean  @default(false)
  redeemedAt  DateTime?
  
  invitedByAdmin Admin? @relation(fields: [invitedBy], references: [id])
  
  @@index([email])
  @@index([code])
}
```

#### Feedback Model
```prisma
model Feedback {
  id           String   @id @default(uuid())
  userId       String
  sessionId    String
  messageIndex Int?
  rating       String   // 'good' | 'bad'
  comments     String?
  createdAt    DateTime @default(now())
  isResolved   Boolean  @default(false)
  resolvedAt   DateTime?
  resolvedBy   String?
  adminNotes   String?
  
  user         User     @relation(fields: [userId], references: [id])
  session      ChatSession @relation(fields: [sessionId], references: [id])
  
  @@index([userId])
  @@index([sessionId])
  @@index([createdAt])
}
```

## API Endpoints

### Dashboard Stats
- `GET /api/admin/dashboard/stats` - Get dashboard statistics

### User Management
- `GET /api/admin/feedbacks/users` - Get all users with feedback
- `GET /api/admin/feedbacks/users/[userId]` - Get specific user details
- `GET /api/admin/feedbacks/users/[userId]/chats` - Get user's chat sessions

### Chat Management
- `GET /api/admin/feedbacks/chats/[chatId]` - Get detailed chat transcript with feedback

### Feedback Management
- `POST /api/feedback` - Submit new feedback (updated to use PostgreSQL)
- `GET /api/feedback/[sessionId]` - Get feedback for a session (updated to use PostgreSQL)

### Admin Management
- `POST /api/admin/invites` - Create admin invitation
- `GET /api/admin/invites` - List pending invitations
- `GET /api/admin/invites/validate?code=...` - Validate invite code
- `POST /api/admin/signup` - Complete admin signup with invite

## Setup Instructions

### 1. Database Migration
```bash
# Generate Prisma client
npx prisma generate

# Run migrations (if needed)
npx prisma migrate dev --name add_admin_and_feedback_models
```

### 2. Create First Admin
```bash
# Create the first admin user (only run once)
npx tsx scripts/seed-first-admin.ts
```

### 3. Seed Sample Data (Optional)
```bash
# Run the seeding script to populate with sample data
npx tsx scripts/seed-admin-data.ts
```

### 4. Access the Dashboard
Navigate to `/admin` in your browser to access the admin dashboard.

**Default Admin Credentials:**
- Email: `admin@asvara.com`
- Password: `admin123`

⚠️ **Important:** Change the default password immediately after first login!

## Adding New Admin Users

### Method 1: Using the Admin Dashboard (Recommended)
1. **Login to Admin Dashboard**: Access `/admin` with your admin credentials
2. **Navigate to Settings**: Click on "Settings" in the sidebar
3. **Go to Admins Tab**: Click on the "Admins" tab
4. **Invite New Admin**: Click "Invite Admin" button
5. **Enter Email**: Provide the email address of the person you want to invite
6. **Send Invitation**: The system will generate a secure invite link
7. **Share Invite Link**: Send the generated link to the new admin via email

### Method 2: Using API Directly
```bash
# Create admin invitation via API
curl -X POST http://localhost:3000/api/admin/invites \
  -H "Content-Type: application/json" \
  -d '{"email": "newadmin@example.com"}'
```

### Complete Invitation Flow
1. **Admin A** creates invitation for `newadmin@example.com`
2. **System** generates secure 32-character invite code
3. **Admin A** sends invite link: `/admin/signup?invite=abc123...`
4. **New Admin** clicks link and validates invite
5. **New Admin** completes signup form with password
6. **System** creates user account + admin record
7. **Invite** is marked as redeemed and logged

### Security Features
- **Time-limited**: Invites expire after 24 hours
- **Single-use**: Each invite can only be used once
- **Email validation**: Must match the invited email address
- **Audit trail**: Complete tracking of who invited whom
- **Secure tokens**: 32-character random hex codes

## UI/UX Features

### Dark Theme
- Consistent charcoal background with white text
- Electric blue accents for interactive elements
- Modern, clean design matching the main application

### Responsive Design
- Mobile-friendly with collapsible sidebar
- Tablet and desktop optimized layouts
- Touch-friendly interactions

### Interactive Elements
- Hover effects on table rows and buttons
- Smooth transitions and animations
- Loading states and skeleton screens

## Admin Invitation System

### How It Works
1. **Generate Invite**: Existing admin creates invitation via API or admin panel
2. **Send Invite**: Invitation link is sent to the new admin's email
3. **Validate Invite**: New admin clicks link and system validates the invite code
4. **Complete Signup**: Admin creates account with the validated invite
5. **Activate Account**: Admin record is created and invite is marked as redeemed

### Security Features
- **Time-limited invites**: Invites expire after 24 hours
- **Single-use codes**: Each invite can only be used once
- **Email validation**: Email must match the invited email address
- **Audit trail**: All invitations and redemptions are logged
- **Secure tokens**: 32-character random hex codes for invites

### Invitation Flow
```
Admin A → Creates Invite → Sends to admin@example.com
↓
admin@example.com → Clicks Link → Validates Invite
↓
admin@example.com → Completes Signup → Account Created
↓
Admin A → Can see new admin in admin list
```

## Security Considerations

### Current Implementation
- Invitation-based admin system with secure invite codes
- Admin authentication through existing user system
- Audit trail for all admin invitations and creations
- Secure middleware protection for admin routes

### Production Recommendations
- Implement proper session-based authentication
- Add two-factor authentication for admin accounts
- Secure API endpoints with admin-only access
- Add comprehensive audit logging for admin actions
- Implement email notifications for admin invitations
- Add admin role hierarchy and permissions

## Customization

### Styling
The dashboard uses Tailwind CSS classes and can be customized by modifying:
- `app/admin/components/AdminSidebar.tsx`
- `app/admin/components/AdminHeader.tsx`
- Individual page components

### Adding New Features
1. Create new API endpoints in `app/api/admin/`
2. Add new pages in `app/admin/`
3. Update sidebar navigation in `AdminSidebar.tsx`
4. Add new database models if needed

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in environment variables
   - Run `npx prisma generate` to update client

2. **Missing Data**
   - Run the seeding script: `npx tsx scripts/seed-admin-data.ts`
   - Check if feedback exists in the database

3. **Styling Issues**
   - Ensure Tailwind CSS is properly configured
   - Check for missing CSS classes

### Debug Mode
Enable debug logging by setting `DEBUG=true` in your environment variables.

## Future Enhancements

### Planned Features
- [x] Admin invitation system
- [x] Admin authentication system
- [ ] Export feedback data to CSV/PDF
- [ ] Advanced filtering and search
- [ ] Real-time notifications
- [ ] Feedback analytics and charts
- [ ] Bulk actions for feedback management
- [ ] Email notifications for new feedback
- [ ] Feedback response templates
- [ ] Admin role hierarchy
- [ ] Two-factor authentication for admins
- [ ] Admin activity audit logs

### Technical Improvements
- [ ] Add comprehensive error handling
- [ ] Implement caching for better performance
- [ ] Add unit and integration tests
- [ ] Optimize database queries
- [ ] Add API rate limiting

## Support

For issues or questions about the admin dashboard:
1. Check this documentation
2. Review the code comments
3. Check the console for error messages
4. Verify database connectivity and data

---

**Note**: This admin dashboard is designed specifically for Asvara Company's internal use and should be properly secured before deployment to production. 
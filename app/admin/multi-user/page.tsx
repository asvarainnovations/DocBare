import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
// import MultiUserManagement from '@/components/admin/MultiUserManagement';

export default async function AdminMultiUserPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true }
  });

  if (user?.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold">Multi-User Management</h1>
      <p className="text-muted-foreground">
        Grant or revoke multi-user permissions for Enterprise accounts.
      </p>
      <div className="mt-8 p-4 border rounded-lg">
        <p>Multi-user management interface coming soon...</p>
      </div>
    </div>
  );
}

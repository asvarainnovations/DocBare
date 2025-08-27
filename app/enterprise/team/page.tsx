import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
// import UserManagement from '@/components/enterprise/UserManagement';

export default async function EnterpriseTeamPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  // Check if user is enterprise with multi-user permission
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { 
      role: true, 
      multiUser: true 
    }
  });

  if (!user || user.role !== 'ENTERPRISE' || !user.multiUser) {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold">Team Management</h1>
      <p className="text-muted-foreground">
        Manage your team members and their access to the platform.
      </p>
      <div className="mt-8 p-4 border rounded-lg">
        <p>Team management interface coming soon...</p>
      </div>
    </div>
  );
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAdminData() {
  try {
    console.log('🌱 Starting admin data seeding...');

    // Create sample users
    const users = await Promise.all([
      prisma.user.upsert({
        where: { email: 'alice@email.com' },
        update: {},
        create: {
          email: 'alice@email.com',
          passwordHash: 'hashed_password',
          fullName: 'Alice Singh',
          name: 'Alice Singh',
          image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
        }
      }),
      prisma.user.upsert({
        where: { email: 'bob@email.com' },
        update: {},
        create: {
          email: 'bob@email.com',
          passwordHash: 'hashed_password',
          fullName: 'Bob Patel',
          name: 'Bob Patel',
          image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
        }
      }),
      prisma.user.upsert({
        where: { email: 'sophia@email.com' },
        update: {},
        create: {
          email: 'sophia@email.com',
          passwordHash: 'hashed_password',
          fullName: 'Sophia Carter',
          name: 'Sophia Carter',
          image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
        }
      })
    ]);

    console.log('✅ Users created:', users.length);

    // Create sample chat sessions
    const chatSessions = await Promise.all([
      // Alice's chat sessions
      prisma.chatSession.create({
        data: {
          userId: users[0].id,
          messages: {
            create: [
              {
                role: 'USER',
                content: 'Can you help me review this lease agreement?'
              },
              {
                role: 'ASSISTANT',
                content: 'Of course! Please share the lease agreement with me.'
              },
              {
                role: 'USER',
                content: 'Here it is. [LeaseAgreement.pdf]'
              },
              {
                role: 'ASSISTANT',
                content: 'I\'ve reviewed the document. There are a few clauses that need clarification.'
              },
              {
                role: 'USER',
                content: 'Which clauses specifically?'
              },
              {
                role: 'ASSISTANT',
                content: 'Clauses 3, 7, and 12 require further review.'
              }
            ]
          }
        }
      }),
      prisma.chatSession.create({
        data: {
          userId: users[0].id,
          messages: {
            create: [
              {
                role: 'USER',
                content: 'I need help with contract negotiation'
              },
              {
                role: 'ASSISTANT',
                content: 'I\'d be happy to help you with contract negotiation. What type of contract are you working with?'
              },
              {
                role: 'USER',
                content: 'It\'s a software development contract'
              },
              {
                role: 'ASSISTANT',
                content: 'Great! Software development contracts have several key areas to focus on. Let me break down the important clauses for you.'
              }
            ]
          }
        }
      }),
      // Bob's chat sessions
      prisma.chatSession.create({
        data: {
          userId: users[1].id,
          messages: {
            create: [
              {
                role: 'USER',
                content: 'What are the legal requirements for starting a business?'
              },
              {
                role: 'ASSISTANT',
                content: 'The legal requirements for starting a business vary by location and business type. Let me provide you with a general overview.'
              },
              {
                role: 'USER',
                content: 'I\'m in California and want to start an LLC'
              },
              {
                role: 'ASSISTANT',
                content: 'For an LLC in California, you\'ll need to file Articles of Organization with the Secretary of State.'
              }
            ]
          }
        }
      }),
      // Sophia's chat sessions
      prisma.chatSession.create({
        data: {
          userId: users[2].id,
          messages: {
            create: [
              {
                role: 'USER',
                content: 'Review Lease Agreement'
              },
              {
                role: 'ASSISTANT',
                content: 'I\'d be happy to help you review your lease agreement. Please share the document with me.'
              },
              {
                role: 'USER',
                content: 'Here it is. [LeaseAgreement.pdf]'
              },
              {
                role: 'ASSISTANT',
                content: 'I\'ve reviewed the document. There are a few clauses that need clarification.'
              },
              {
                role: 'USER',
                content: 'Which clauses specifically?'
              },
              {
                role: 'ASSISTANT',
                content: 'Clauses 3, 7, and 12 require further review.'
              }
            ]
          }
        }
      })
    ]);

    console.log('✅ Chat sessions created:', chatSessions.length);

    // Create sample feedback
    const feedbacks = await Promise.all([
      // Alice's feedback
      prisma.feedback.create({
        data: {
          userId: users[0].id,
          sessionId: chatSessions[0].id,
          messageIndex: 3, // Assistant's response about clauses
          rating: 'good',
          comments: null
        }
      }),
      prisma.feedback.create({
        data: {
          userId: users[0].id,
          sessionId: chatSessions[0].id,
          messageIndex: 5, // Assistant's response about specific clauses
          rating: 'bad',
          comments: 'The response was not helpful. It was too vague and didn\'t provide specific details about the clauses.'
        }
      }),
      prisma.feedback.create({
        data: {
          userId: users[0].id,
          sessionId: chatSessions[1].id,
          messageIndex: 1, // Assistant's response about contract negotiation
          rating: 'good',
          comments: null
        }
      }),
      prisma.feedback.create({
        data: {
          userId: users[0].id,
          sessionId: chatSessions[1].id,
          messageIndex: 3, // Assistant's response about software development contracts
          rating: 'good',
          comments: null
        }
      }),
      // Bob's feedback
      prisma.feedback.create({
        data: {
          userId: users[1].id,
          sessionId: chatSessions[2].id,
          messageIndex: 1, // Assistant's response about legal requirements
          rating: 'good',
          comments: null
        }
      }),
      prisma.feedback.create({
        data: {
          userId: users[1].id,
          sessionId: chatSessions[2].id,
          messageIndex: 3, // Assistant's response about California LLC
          rating: 'bad',
          comments: 'This response was incomplete. I needed more specific information about filing requirements and costs.'
        }
      }),
      // Sophia's feedback
      prisma.feedback.create({
        data: {
          userId: users[2].id,
          sessionId: chatSessions[3].id,
          messageIndex: 3, // Assistant's response about clauses
          rating: 'good',
          comments: null
        }
      }),
      prisma.feedback.create({
        data: {
          userId: users[2].id,
          sessionId: chatSessions[3].id,
          messageIndex: 5, // Assistant's response about specific clauses
          rating: 'bad',
          comments: 'The response was not helpful. It was too vague and didn\'t provide specific details about the clauses.'
        }
      })
    ]);

    console.log('✅ Feedback created:', feedbacks.length);

    console.log('🎉 Admin data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Users: ${users.length}`);
    console.log(`- Chat Sessions: ${chatSessions.length}`);
    console.log(`- Feedback: ${feedbacks.length}`);

  } catch (error) {
    console.error('❌ Error seeding admin data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
seedAdminData(); 
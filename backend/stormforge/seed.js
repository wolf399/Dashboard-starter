import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create customers
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Rachel Green',
      email: 'rachel.g@mail.com',
      phone: '+1 (555) 789-0123',
      company: 'Central Perk',
      status: 'ACTIVE',
      tags: 'new-user,mobile',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'David Martinez',
      email: 'david.m@example.org',
      phone: '+1 (555) 456-7890',
      company: 'Martinez Solutions',
      status: 'ACTIVE',
      tags: 'premium,frequent',
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      name: 'Jenny Wilson',
      email: 'jenny.v@outlook.com',
      phone: '+1 (555) 321-0987',
      company: 'Wilson & Co',
      status: 'INACTIVE',
      tags: 'billing',
    },
  });

  console.log('✅ Customers created');

  // Create tickets
  const ticket1 = await prisma.ticket.create({
    data: {
      subject: 'Issue with order #12345',
      description: 'I have not received my order yet.',
      status: 'OPEN',
      priority: 'HIGH',
      customerId: customer1.id,
      messages: {
        create: [
          { body: 'Hello, I have not received my order yet.', senderType: 'CUSTOMER' },
          { body: "Thanks for reaching out. We're checking on your order.", senderType: 'AGENT' },
        ],
      },
    },
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      subject: 'Login error on Mobile App',
      description: 'The app shows a white screen after the splash page.',
      status: 'PENDING',
      priority: 'MEDIUM',
      customerId: customer2.id,
      messages: {
        create: [
          { body: 'The app shows a white screen after the splash page.', senderType: 'CUSTOMER' },
          { body: 'Hi David, are you on the latest version of iOS?', senderType: 'AGENT' },
        ],
      },
    },
  });

  const ticket3 = await prisma.ticket.create({
    data: {
      subject: 'Refund for duplicate charge',
      description: 'I was charged twice. Please refund the $29.00 duplicate.',
      status: 'CLOSED',
      priority: 'LOW',
      customerId: customer3.id,
      messages: {
        create: [
          { body: 'I was charged twice. Please refund the $29.00 duplicate.', senderType: 'CUSTOMER' },
        ],
      },
    },
  });

  console.log('✅ Tickets and messages created');
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
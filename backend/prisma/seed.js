import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // Clean DB
    await prisma.ticket.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.user.deleteMany();

    // Create Admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
        data: {
            name: 'Admin User',
            email: 'admin@helpdesk.local',
            password: hashedPassword,
            role: 'ADMIN',
        },
    });

    // Create Agents
    const agent1Password = await bcrypt.hash('agent123', 10);
    const agent1 = await prisma.user.create({
        data: {
            name: 'John Doe (Agent)',
            email: 'john@helpdesk.local',
            password: agent1Password,
            role: 'AGENT',
        },
    });

    const agent2 = await prisma.user.create({
        data: {
            name: 'Jane Smith (Agent)',
            email: 'jane@helpdesk.local',
            password: agent1Password,
            role: 'AGENT',
        },
    });

    // Create Customers
    const customer1 = await prisma.customer.create({
        data: {
            name: 'Acme Corp',
            email: 'contact@acme.com',
            phone: '+1-555-0101',
            company: 'Acme Corporation',
            status: 'ACTIVE',
            tags: JSON.stringify(['enterprise', 'vip']),
        },
    });

    const customer2 = await prisma.customer.create({
        data: {
            name: 'TechFlow',
            email: 'support@techflow.io',
            phone: '+1-555-0202',
            company: 'TechFlow Inc',
            status: 'ACTIVE',
            tags: JSON.stringify(['startup']),
        },
    });

    // Create Tickets
    await prisma.ticket.create({
        data: {
            subject: 'Unable to login to dashboard',
            description: 'Customer reports getting a 500 error when trying to access the analytics dashboard.',
            status: 'OPEN',
            priority: 'HIGH',
            customerId: customer1.id,
            assignedAgentId: agent1.id,
        },
    });

    await prisma.ticket.create({
        data: {
            subject: 'Billing discrepancy for last month',
            description: 'The invoice amount does not match the usage metrics.',
            status: 'PENDING',
            priority: 'MEDIUM',
            customerId: customer1.id,
            assignedAgentId: agent2.id,
        },
    });

    await prisma.ticket.create({
        data: {
            subject: 'Request for custom integration',
            description: 'Wants to know if we can build a custom integration with their internal CRM.',
            status: 'CLOSED',
            priority: 'LOW',
            customerId: customer2.id,
            assignedAgentId: admin.id,
        },
    });

    console.log('Database seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

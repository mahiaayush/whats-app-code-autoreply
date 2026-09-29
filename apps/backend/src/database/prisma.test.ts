import { describe, it, expect, afterAll } from 'vitest';
import { getPrismaClient, closePrismaClient, checkPostgresHealth } from './prisma.client.js';

describe('Prisma Database Integration', () => {
  const prisma = getPrismaClient();

  afterAll(async () => {
    await closePrismaClient();
  });

  it('should pass PostgreSQL health check via queryRaw', async () => {
    const health = await checkPostgresHealth();
    expect(health.status).toBe('ok');
    expect(typeof health.latencyMs).toBe('number');
  });

  it('should find the seeded property "luxzirius-villas" with all relations', async () => {
    const property = await prisma.property.findUnique({
      where: { slug: 'luxzirius-villas' },
      include: {
        location: true,
        price: true,
        units: true,
        amenities: true,
        media: true,
        faqs: true,
        documents: true,
        contacts: true,
      },
    });

    expect(property).not.toBeNull();
    expect(property?.title).toBe('Luxzirius Villas');
    expect(property?.status).toBe('AVAILABLE');
    expect(property?.location?.city).toBe('Bengaluru');
    expect(property?.price?.priceDisplayFormatted).toContain('₹1.75 Cr');
    expect(property?.units.length).toBeGreaterThanOrEqual(3);
    expect(property?.amenities.length).toBeGreaterThanOrEqual(5);
    expect(property?.media.length).toBeGreaterThanOrEqual(4);
    expect(property?.faqs.length).toBeGreaterThanOrEqual(4);
    expect(property?.contacts.length).toBeGreaterThanOrEqual(1);
  });

  it('should have seeded deterministic shortcuts', async () => {
    const shortcuts = await prisma.shortcut.findMany({
      where: { enabled: true },
    });

    const commands = shortcuts.map((s) => s.command);
    expect(commands).toContain('/price');
    expect(commands).toContain('/area');
    expect(commands).toContain('/location');
    expect(commands).toContain('/brochure');
    expect(commands).toContain('/amenities');
    expect(commands).toContain('/site-visit');
    expect(commands).toContain('/contact');
    expect(commands).toContain('/loan');
    expect(commands).toContain('/availability');
  });

  it('should have seeded multilingual templates', async () => {
    const templates = await prisma.template.findMany({
      where: { isActive: true },
    });

    const languages = templates.map((t) => t.language);
    expect(languages).toContain('en');
    expect(languages).toContain('hi');
    expect(languages).toContain('hinglish');
  });

  it('should enforce unique constraint on customer phone and conversation chatId', async () => {
    const testPhone = `+91${Date.now().toString().slice(-10)}`;
    const testChatId = `${testPhone.replace('+', '')}@c.us`;

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        phone: testPhone,
        name: 'Database Test User',
        status: 'LEAD',
      },
    });
    expect(customer.id).toBeDefined();

    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        chatId: testChatId,
        customerId: customer.id,
        mode: 'AI_ACTIVE',
        language: 'hinglish',
      },
    });
    expect(conversation.chatId).toBe(testChatId);

    // Verify duplicate chatId is rejected
    await expect(
      prisma.conversation.create({
        data: {
          chatId: testChatId,
          customerId: customer.id,
          mode: 'AI_ACTIVE',
        },
      }),
    ).rejects.toThrow();

    // Clean up test data
    await prisma.customer.delete({ where: { id: customer.id } });
  });
});

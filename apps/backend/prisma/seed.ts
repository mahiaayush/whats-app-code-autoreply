import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database with demo property: Luxzirius Villas...');

  // 1. Seed Property: Luxzirius Villas
  const propertySlug = 'luxzirius-villas';

  const property = await prisma.property.upsert({
    where: { slug: propertySlug },
    update: {},
    create: {
      slug: propertySlug,
      title: 'Luxzirius Villas',
      tagline: 'Exclusive Luxury Living by the Lake',
      description:
        'DEMO PROPERTY: Luxzirius Villas is a private gated enclave featuring 3BHK and 4BHK contemporary luxury villas with landscaped gardens, smart home automation, and private plunge pools.',
      status: 'AVAILABLE',
      developerName: 'Luxzirius Realty Pvt Ltd (Demo)',
      reraRegistrationNumber: 'PRM/KA/RERA/1251/310/PR/000000/DEMO',
      possessionDate: 'December 2026 (Estimated)',
      location: {
        create: {
          address: 'Survey No. 42, Lakeview Road, Tech Corridor',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560100',
          landmark: 'Adjacent to Green Valley Golf Course (Demo)',
          googleMapsUrl: 'https://maps.google.com/?q=12.9716,77.5946',
          latitude: 12.9716,
          longitude: 77.5946,
          connectivityHighlights: [
            '10 mins to Outer Ring Road Tech Parks',
            '15 mins to International Schools',
            '35 mins to International Airport via Expressway',
          ],
        },
      },
      price: {
        create: {
          startingPrice: BigInt(17500000), // ₹1.75 Cr
          maxPrice: BigInt(32000000), // ₹3.20 Cr
          pricePerSqFt: 7800,
          currency: 'INR',
          priceDisplayFormatted: '₹1.75 Cr - ₹3.20 Cr',
          bookingAmount: BigInt(500000), // ₹5 Lakh
          paymentPlans: [
            '10:80:10 Construction Linked Plan (CLP)',
            '20:80 Subvention Scheme Available',
            'Special Festive Down-Payment Plan',
          ],
          maintenanceCharges: '₹4.50 per sq.ft / month',
        },
      },
      units: {
        create: [
          {
            unitType: '3BHK Luxury Villa',
            carpetAreaSqFt: 2250,
            superBuiltUpAreaSqFt: 2850,
            basePrice: BigInt(17500000),
            priceDisplay: '₹1.75 Cr',
            floorPlanUrl: 'https://placehold.co/800x600/png?text=3BHK+Floor+Plan+Demo',
            unitsAvailable: 8,
          },
          {
            unitType: '4BHK Grand Villa',
            carpetAreaSqFt: 3100,
            superBuiltUpAreaSqFt: 3900,
            basePrice: BigInt(26500000),
            priceDisplay: '₹2.65 Cr',
            floorPlanUrl: 'https://placehold.co/800x600/png?text=4BHK+Floor+Plan+Demo',
            unitsAvailable: 4,
          },
          {
            unitType: '5BHK Presidential Villa',
            carpetAreaSqFt: 4200,
            superBuiltUpAreaSqFt: 5100,
            basePrice: BigInt(32000000),
            priceDisplay: '₹3.20 Cr',
            floorPlanUrl: 'https://placehold.co/800x600/png?text=5BHK+Floor+Plan+Demo',
            unitsAvailable: 2,
          },
        ],
      },
      amenities: {
        create: [
          {
            category: 'Clubhouse & Leisure',
            name: '25,000 sq.ft Clubhouse',
            description: 'Includes heated indoor pool, grand banquet hall, and lounge.',
            icon: 'building',
          },
          {
            category: 'Sports & Fitness',
            name: 'Olympic-size Swimming Pool',
            description: 'Temperature-controlled outdoor pool with sun deck.',
            icon: 'water',
          },
          {
            category: 'Sports & Fitness',
            name: 'Tennis & Squash Courts',
            description: 'Floodlit acrylic tennis courts and squash arena.',
            icon: 'activity',
          },
          {
            category: 'Security',
            name: '3-Tier 24/7 Security',
            description: 'RFID boom barriers, CCTV surveillance, and video door phones.',
            icon: 'shield',
          },
          {
            category: 'Eco Living',
            name: 'Solar Powered & Rainwater Harvesting',
            description: 'Zero discharge green development.',
            icon: 'sun',
          },
        ],
      },
      media: {
        create: [
          {
            type: 'IMAGE',
            title: 'Luxzirius Villas Exterior Elevation',
            url: 'https://placehold.co/1200x800/png?text=Luxzirius+Villas+Elevation+Demo',
            thumbnailUrl: 'https://placehold.co/300x200/png?text=Thumbnail',
            isHero: true,
            orderIndex: 0,
          },
          {
            type: 'IMAGE',
            title: 'Villa Private Pool & Garden',
            url: 'https://placehold.co/1200x800/png?text=Private+Pool+Demo',
            thumbnailUrl: 'https://placehold.co/300x200/png?text=Pool+Thumb',
            isHero: false,
            orderIndex: 1,
          },
          {
            type: 'VIDEO',
            title: '3D Virtual Walkthrough Tour',
            url: 'https://example.com/demo-walkthrough-video',
            thumbnailUrl: 'https://placehold.co/300x200/png?text=Video+Tour',
            isHero: false,
            orderIndex: 2,
          },
          {
            type: 'BROCHURE',
            title: 'Official Project Brochure PDF',
            url: 'https://example.com/demo-luxzirius-brochure.pdf',
            isHero: false,
            orderIndex: 3,
          },
        ],
      },
      faqs: {
        create: [
          {
            question: 'What is the starting price for Luxzirius Villas?',
            answer:
              'The starting price for a 3BHK Luxury Villa at Luxzirius Villas is ₹1.75 Cr, while 4BHK Grand Villas start from ₹2.65 Cr onwards.',
            category: 'Pricing',
            keywords: ['price', 'cost', 'starting price', 'kitne ka hai', 'price kya hai'],
          },
          {
            question: 'What is the carpet area and plot size?',
            answer:
              '3BHK villas feature 2,250 sq.ft carpet area (2,850 sq.ft SBA), 4BHK villas feature 3,100 sq.ft carpet area (3,900 sq.ft SBA), and 5BHK villas offer 4,200 sq.ft carpet area.',
            category: 'Dimensions',
            keywords: ['area', 'carpet area', 'sqft', 'square feet', 'size', 'kitna area hai'],
          },
          {
            question: 'Where is Luxzirius Villas located?',
            answer:
              'Luxzirius Villas is located at Survey No. 42, Lakeview Road in the East Tech Corridor, Bengaluru, just 10 minutes from major IT parks.',
            category: 'Location',
            keywords: ['location', 'where', 'address', 'kaha hai', 'landmarks'],
          },
          {
            question: 'Which banks have approved home loans for this project?',
            answer:
              'Home loans are pre-approved by major institutions including HDFC Bank, SBI, ICICI Bank, and Axis Bank with competitive interest rates.',
            category: 'Finance',
            keywords: ['loan', 'bank loan', 'sbi', 'hdfc', 'emi', 'finance'],
          },
        ],
      },
      documents: {
        create: [
          {
            title: 'Luxzirius Villas E-Brochure',
            type: 'BROCHURE',
            fileUrl: 'https://example.com/demo-luxzirius-brochure.pdf',
            fileSizeBytes: 4500000,
          },
          {
            title: 'Floor Plans Master Booklet',
            type: 'FLOOR_PLAN',
            fileUrl: 'https://example.com/demo-luxzirius-floorplans.pdf',
            fileSizeBytes: 3200000,
          },
        ],
      },
      contacts: {
        create: [
          {
            role: 'Lead Property Advisor',
            name: 'Vikram Malhotra (Demo)',
            phone: '+919876543210',
            email: 'advisor@luxzirius-demo.com',
            availabilityHours: '9:00 AM - 7:00 PM IST',
          },
        ],
      },
    },
  });

  console.log(`Created demo property: ${property.title} (slug: ${property.slug})`);

  // 2. Seed Standard Shortcuts
  const shortcuts = [
    {
      command: '/price',
      name: 'Property Pricing',
      description: 'Provides exact verified starting price and pricing breakdown',
      targetIntent: 'PROPERTY_PRICE',
      naturalLanguagePhrases: [
        'price kya hai',
        'villa kitne ka hai',
        'what is the price',
        'cost of villa',
        'price list',
        'kitna rate hai',
      ],
      responseTemplate:
        'Luxzirius Villas starting price is ₹1.75 Cr for 3BHK villas (2,250 sq.ft) and ₹2.65 Cr for 4BHK grand villas (3,100 sq.ft). Would you like to review the complete pricing breakdown?',
    },
    {
      command: '/area',
      name: 'Property Area & Dimensions',
      description: 'Provides verified carpet area and built-up area sizes',
      targetIntent: 'PROPERTY_AREA',
      naturalLanguagePhrases: [
        'villa ka area kitna hai',
        'area kitna hai',
        'carpet area kya hai',
        'what is the area',
        'plot size',
        'dimensions of villa',
      ],
      responseTemplate:
        'Luxzirius Villas offers 3 configurations:\n• 3BHK: 2,250 sq.ft carpet (2,850 sq.ft SBA)\n• 4BHK: 3,100 sq.ft carpet (3,900 sq.ft SBA)\n• 5BHK: 4,200 sq.ft carpet (5,100 sq.ft SBA)',
    },
    {
      command: '/location',
      name: 'Location & Connectivity',
      description: 'Provides project address, landmark, and connectivity details',
      targetIntent: 'PROPERTY_LOCATION',
      naturalLanguagePhrases: [
        'where is the project located',
        'location kaha hai',
        'project location',
        'address kya hai',
        'how to reach',
      ],
      responseTemplate:
        'Luxzirius Villas is located on Lakeview Road, Tech Corridor, Bengaluru. Highlights:\n• 10 mins to Outer Ring Road IT corridor\n• 15 mins to International Schools\n• Map link: https://maps.google.com/?q=12.9716,77.5946',
    },
    {
      command: '/amenities',
      name: 'Amenities & Facilities',
      description: 'Lists clubhouse, pool, sports, and green features',
      targetIntent: 'PROPERTY_AMENITIES',
      naturalLanguagePhrases: [
        'amenities kya hai',
        'swimming pool hai',
        'facilities kya hai',
        'what amenities are available',
        'clubhouse details',
      ],
      responseTemplate:
        'Luxzirius Villas features world-class amenities including a 25,000 sq.ft Clubhouse, Olympic Swimming Pool, Tennis & Squash Courts, 3-tier security, and solar eco-systems.',
    },
    {
      command: '/brochure',
      name: 'Download Brochure',
      description: 'Shares project brochure download link',
      targetIntent: 'PROPERTY_BROCHURE',
      naturalLanguagePhrases: ['brochure bhejo', 'send brochure', 'pdf brochure', 'details pdf'],
      responseTemplate:
        'Here is the official brochure for Luxzirius Villas: https://example.com/demo-luxzirius-brochure.pdf',
    },
    {
      command: '/site-visit',
      name: 'Schedule Site Visit',
      description: 'Assists customer in scheduling an in-person site tour',
      targetIntent: 'PROPERTY_SITE_VISIT',
      naturalLanguagePhrases: [
        'site visit karni hai',
        'schedule visit',
        'can i visit the site',
        'kal visit kar sakte hai',
      ],
      responseTemplate:
        'We would be delighted to host you at Luxzirius Villas! Please let us know your preferred date and time, and our sales team will confirm your VIP site tour.',
    },
    {
      command: '/loan',
      name: 'Bank Loan Information',
      description: 'Pre-approved banks and financing assistance',
      targetIntent: 'PROPERTY_LOAN',
      naturalLanguagePhrases: ['bank loan milega', 'sbi approved', 'home loan emi', 'loan process'],
      responseTemplate:
        'Luxzirius Villas is pre-approved for home loans up to 80% with HDFC Bank, State Bank of India (SBI), ICICI, and Axis Bank with tailored payment schemes.',
    },
    {
      command: '/contact',
      name: 'Sales Advisor Contact',
      description: 'Provides direct advisor contact details',
      targetIntent: 'PROPERTY_CONTACT',
      naturalLanguagePhrases: ['call me', 'advisor number', 'kisse baat kare', 'contact number'],
      responseTemplate:
        'You can reach our Senior Property Advisor Vikram Malhotra directly at +919876543210 (9:00 AM - 7:00 PM IST).',
    },
    {
      command: '/availability',
      name: 'Current Unit Availability',
      description: 'Verified real-time villa availability',
      targetIntent: 'PROPERTY_AVAILABILITY',
      naturalLanguagePhrases: [
        'units available hai',
        'is it sold out',
        'kitne villas bache hai',
        'availability batao',
      ],
      responseTemplate:
        'Luxzirius Villas currently has 8 units of 3BHK and 4 units of 4BHK villas available for immediate booking.',
    },
  ];

  for (const s of shortcuts) {
    await prisma.shortcut.upsert({
      where: { command: s.command },
      update: {
        naturalLanguagePhrases: s.naturalLanguagePhrases,
        responseTemplate: s.responseTemplate,
      },
      create: s,
    });
  }
  console.log(`Seeded ${shortcuts.length} deterministic shortcuts.`);

  // 3. Seed Multilingual Templates (English, Hindi, Hinglish)
  const templates = [
    {
      slug: 'price-luxzirius-villas-en',
      name: 'Price Inquiry (English)',
      intent: 'PROPERTY_PRICE',
      language: 'en',
      templateText:
        'The starting price for {{propertyName}} is {{startingPrice}} for 3BHK villas ({{carpetArea}} sq.ft). 4BHK Grand Villas are priced from {{maxPrice}} onwards.',
      requiredPlaceholders: ['propertyName', 'startingPrice', 'carpetArea', 'maxPrice'],
    },
    {
      slug: 'price-luxzirius-villas-hi',
      name: 'Price Inquiry (Hindi)',
      intent: 'PROPERTY_PRICE',
      language: 'hi',
      templateText:
        '{{propertyName}} में 3BHK विला की शुरुआती कीमत {{startingPrice}} है ({{carpetArea}} वर्ग फुट)। 4BHK विला {{maxPrice}} से शुरू होते हैं।',
      requiredPlaceholders: ['propertyName', 'startingPrice', 'carpetArea', 'maxPrice'],
    },
    {
      slug: 'price-luxzirius-villas-hinglish',
      name: 'Price Inquiry (Hinglish)',
      intent: 'PROPERTY_PRICE',
      language: 'hinglish',
      templateText:
        'Namaste! {{propertyName}} ki starting price {{startingPrice}} hai (3BHK villa, {{carpetArea}} sq.ft). 4BHK grand villas {{maxPrice}} se start hote hain.',
      requiredPlaceholders: ['propertyName', 'startingPrice', 'carpetArea', 'maxPrice'],
    },
    {
      slug: 'area-luxzirius-villas-hinglish',
      name: 'Area Inquiry (Hinglish)',
      intent: 'PROPERTY_AREA',
      language: 'hinglish',
      templateText:
        '{{propertyName}} mein 3BHK villas ka carpet area {{carpetArea}} sq.ft hai, aur 4BHK ka carpet area {{superBuiltUpArea}} sq.ft hai.',
      requiredPlaceholders: ['propertyName', 'carpetArea', 'superBuiltUpArea'],
    },
    {
      slug: 'location-luxzirius-villas-hinglish',
      name: 'Location Inquiry (Hinglish)',
      intent: 'PROPERTY_LOCATION',
      language: 'hinglish',
      templateText:
        '{{propertyName}} {{address}}, {{city}} mein located hai. Google Maps link: {{googleMapsUrl}}',
      requiredPlaceholders: ['propertyName', 'address', 'city', 'googleMapsUrl'],
    },
  ];

  for (const t of templates) {
    await prisma.template.upsert({
      where: { slug: t.slug },
      update: {
        templateText: t.templateText,
        requiredPlaceholders: t.requiredPlaceholders,
      },
      create: t,
    });
  }
  console.log(`Seeded ${templates.length} multilingual response templates.`);
  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Database seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

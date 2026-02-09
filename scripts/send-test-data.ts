import { PrismaClient } from '../app/generated/prisma/client';

const prisma = new PrismaClient();

async function sendTestData() {
  const uniqueKey = 'instance1-50-75-77';
  const storeId = 77;
  
  // Sample sales data for multiple days
  const salesData = [
    {
      idempotencyKey: `test-${Date.now()}-1`,
      uniqueKey,
      realDateTime: '2024-11-15T10:30:00.000Z',
      jobDateTime: '2024-11-15T23:59:59.000Z',
      documentNumber: 100,
      amount: 250.50,
      amountTaxable: 205.33,
      amountTax: 45.17,
      documentType: {
        id: 732,
        title: 'Scontrino RT',
        behaviorType: 'receipt'
      },
      corporate: {
        id: 50,
        title: 'gruppo enzo'
      },
      company: {
        id: 75,
        title: 'azienda 1 gruppo enzo',
        businessName: 'azienda 1 gruppo enzo'
      },
      store: {
        id: storeId,
        title: 'bar azienda 1 gruppo enzo',
        address: 'piazza poli',
        collective: 'Portici',
        province: 'NA'
      },
      author: {
        id: 117,
        title: 'enzbbi1991',
        firstname: 'Vincenzo',
        lastname: 'Birra'
      },
      device: {
        id: 151,
        title: 'PUNTO CASSA',
        type: 'cash_pos'
      },
      operator: {
        id: 52,
        title: 'Vincenzo operatore',
        firstname: 'Vincenzo',
        lastname: 'operatore'
      },
      rows: [
        {
          id: 1,
          code: '00010',
          title: 'INVENTARIO VALORIZZATO',
          quantity: 2,
          price: 50.25,
          rate: 22
        },
        {
          id: 2,
          code: '00012',
          title: 'Ciccolato in blocco',
          quantity: 3,
          price: 30.00,
          rate: 22
        },
        {
          id: 3,
          code: '00014',
          title: 'Aperol',
          quantity: 4,
          price: 25.00,
          rate: 22
        }
      ],
      payments: [
        {
          id: 151,
          title: 'Contanti',
          cashPayment: true,
          amount: 250.50
        }
      ]
    },
    {
      idempotencyKey: `test-${Date.now()}-2`,
      uniqueKey,
      realDateTime: '2024-11-15T14:20:00.000Z',
      jobDateTime: '2024-11-15T23:59:59.000Z',
      documentNumber: 101,
      amount: 180.00,
      amountTaxable: 147.54,
      amountTax: 32.46,
      documentType: {
        id: 733,
        title: 'Fattura',
        behaviorType: 'invoice'
      },
      corporate: {
        id: 50,
        title: 'gruppo enzo'
      },
      company: {
        id: 75,
        title: 'azienda 1 gruppo enzo',
        businessName: 'azienda 1 gruppo enzo'
      },
      store: {
        id: storeId,
        title: 'bar azienda 1 gruppo enzo',
        address: 'piazza poli',
        collective: 'Portici',
        province: 'NA'
      },
      author: {
        id: 117,
        title: 'enzbbi1991',
        firstname: 'Vincenzo',
        lastname: 'Birra'
      },
      device: {
        id: 151,
        title: 'PUNTO CASSA',
        type: 'cash_pos'
      },
      operator: {
        id: 52,
        title: 'Vincenzo operatore',
        firstname: 'Vincenzo',
        lastname: 'operatore'
      },
      rows: [
        {
          id: 4,
          code: '00020',
          title: 'Caffè',
          quantity: 10,
          price: 12.00,
          rate: 22
        },
        {
          id: 5,
          code: '00021',
          title: 'Cornetto',
          quantity: 5,
          price: 8.00,
          rate: 22
        }
      ],
      payments: [
        {
          id: 152,
          title: 'Carta di credito',
          cashPayment: false,
          amount: 180.00
        }
      ]
    }
  ];

  // Insert events into ingressEvent table
  for (const sale of salesData) {
    await prisma.ingressEvent.create({
      data: {
        source: 'POS',
        payload: sale,
        createdAt: new Date(),
      },
    });
  }

  console.log(`Inserted ${salesData.length} test events`);
}

sendTestData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

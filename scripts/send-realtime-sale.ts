import { PrismaClient } from '../app/generated/prisma/client';

const prisma = new PrismaClient();

async function sendRealtimeSale() {
  const sale = {
    idempotencyKey: `test-realtime-${Date.now()}`,
    uniqueKey: 'instance1-50-75-77',
    realDateTime: '2024-11-15T20:30:00.000Z',
    jobDateTime: '2024-11-15T23:59:59.000Z',
    documentNumber: 148,
    amount: 85.50,
    amountTaxable: 70.08,
    amountTax: 15.42,
    tips: 5.00,
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
      id: 77,
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
        id: 286296,
        code: '00010',
        title: 'Caffè espresso',
        quantity: 3,
        price: 1.50,
        rate: 22
      },
      {
        id: 286297,
        code: '00012',
        title: 'Cornetto alla crema',
        quantity: 2,
        price: 2.50,
        rate: 22
      },
      {
        id: 286298,
        code: '00014',
        title: 'Aperol Spritz',
        quantity: 2,
        price: 6.00,
        rate: 22
      }
    ],
    payments: [
      {
        id: 151,
        title: 'Contanti',
        cashPayment: true,
        amount: 85.50
      }
    ]
  };

  // Insert event into ingressEvent table
  await prisma.ingressEvent.create({
    data: {
      source: 'POS',
      payload: sale,
      createdAt: new Date(),
    },
  });

  console.log('Realtime sale inserted successfully!');
  console.log('Amount:', sale.amount, '€');
  console.log('Items:', sale.rows.length, 'products');
}

sendRealtimeSale()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  
  // Update Branch 4 stock to reflect exactly 1 Master Carton (2,400 tablets)
  await db.collection('branchstocks').updateOne(
    { branch: 'branch 4', productId: new mongoose.Types.ObjectId('6af579faee13a795cdccb95b') },
    { $set: { quantityInStock: 2400 } }
  );

  // Update Batch in Branch 4 to 2,400 tablets (1 Master Carton)
  await db.collection('batches').updateOne(
    { branch: 'branch 4', batchNumber: '001', product: new mongoose.Types.ObjectId('6af579faee13a795cdccb95b') },
    {
      $set: {
        product: new mongoose.Types.ObjectId('6af579faee13a795cdccb95b'),
        batchNumber: '001',
        expiryDate: new Date('2027-06-12T00:00:00.000Z'),
        branch: 'branch 4',
        packType: 'Master Carton',
        piecesPerPack: 2400,
        initialPacks: 1,
        initialQuantity: 2400,
        availableQuantity: 2400,
        costPricePerUnit: 2,
        sellingPricePerUnit: 4,
        status: 'ACTIVE'
      }
    },
    { upsert: true }
  );

  // Update Trip 1 item acceptedQuantity to 2400 tablets (1 carton) and decision to PARTIAL
  await db.collection('transfers').updateOne(
    { _id: new mongoose.Types.ObjectId('6af843edabc21ebc18e8a010'), 'transports.tripNumber': 'Trip 1' },
    {
      $set: {
        'transports.$.items.0.acceptedQuantity': 2400,
        'transports.$.items.0.rejectedQuantity': 2400,
        'transports.$.items.0.piecesPerPack': 2400,
        'transports.$.inspectionDecision': 'PARTIAL'
      }
    }
  );

  console.log('Stock and Batch for Branch 4 successfully updated to 2,400 tablets!');
  process.exit(0);
}
fix();


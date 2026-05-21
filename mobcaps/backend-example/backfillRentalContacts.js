/**
 * Backfill missing rental contactNumber from customer_accounts.
 *
 * Usage:
 *   node backfillRentalContacts.js
 */
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb+srv://mobilefabriq:mobilefabriq@cluster0.ypnfkvo.mongodb.net/FabriQ?retryWrites=true&w=majority&appName=Cluster0';

async function backfillRentalContacts() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db('FabriQ');

    const rentals = db.collection('rental_details');
    const customers = db.collection('customer_accounts');

    const cursor = rentals.find({
      $or: [
        { contactNumber: { $exists: false } },
        { contactNumber: null },
        { contactNumber: '' },
      ],
    });

    let scanned = 0;
    let updated = 0;
    let unresolved = 0;

    while (await cursor.hasNext()) {
      const rental = await cursor.next();
      scanned++;

      let customer = null;
      if (rental.customerId) {
        try {
          const customerId =
            typeof rental.customerId === 'string'
              ? new ObjectId(rental.customerId)
              : rental.customerId;
          customer = await customers.findOne({ _id: customerId });
        } catch (_) {
          customer = null;
        }
      }

      if (!customer && rental.userEmail) {
        customer = await customers.findOne({
          email: String(rental.userEmail).toLowerCase(),
        });
      }

      const contactNumber = String(
        (customer && (customer.contactNumber || customer.phoneNumber)) || ''
      ).trim();

      if (!contactNumber) {
        unresolved++;
        continue;
      }

      await rentals.updateOne(
        { _id: rental._id },
        { $set: { contactNumber } }
      );
      updated++;
    }

    console.log(
      `Backfill complete. Scanned: ${scanned}, Updated: ${updated}, Unresolved: ${unresolved}`
    );
  } catch (error) {
    console.error('Backfill failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

backfillRentalContacts();

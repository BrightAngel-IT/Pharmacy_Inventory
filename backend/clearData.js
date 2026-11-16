const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://BrightAngel:Brightangel2026@cluster0.ajpwb6i.mongodb.net/test_inventory_system?retryWrites=true&w=majority');
    console.log('Connected to MongoDB Atlas');

    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const c of collections) {
      if (c.name === 'users') {
        await mongoose.connection.db.collection(c.name).deleteMany({ role: { $ne: 'super_admin' } });
        console.log('Cleared users except super_admin');
      } else {
        await mongoose.connection.db.collection(c.name).deleteMany({});
        console.log('Cleared ' + c.name);
      }
    }

    console.log('Database cleared successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error clearing database:', err);
    process.exit(1);
  }
};

connectDB();

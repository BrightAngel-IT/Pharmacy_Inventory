const mongoose = require('mongoose');

const uri = "mongodb+srv://BrightAngel:Brightangel2026@cluster0.ajpwb6i.mongodb.net/test_inventory_system?retryWrites=true&w=majority";

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const branches = await db.collection('branches').find({}).toArray();
  console.log("Branches in DB:");
  branches.forEach(b => console.log(b.name));
  process.exit(0);
}
run().catch(console.dir);

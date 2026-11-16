const mongoose = require('mongoose');
const uri = "mongodb+srv://BrightAngel:Brightangel2026@cluster0.ajpwb6i.mongodb.net/test_inventory_system?retryWrites=true&w=majority";

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).toArray();
  console.log("Users in DB:");
  users.forEach(u => console.log(u.username, u.branch));
  process.exit(0);
}
run().catch(console.dir);

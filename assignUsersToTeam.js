require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Team = require('./models/Team');

const MONGO_URI = process.env.MONGO_URI;

// === CONFIGURATION ===
// Set this to an existing team ID, or leave blank to create a new team for all users:
const TEAM_ID = ''; // e.g. '665c1e2f8b1e2a0012345678'

async function main() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  let teamId = TEAM_ID;

  if (!teamId) {
    // Create a new team with all users as members
    const users = await User.find({});
    if (users.length === 0) {
      console.log('No users found.');
      return;
    }
    const owner = users[0];
    const team = new Team({
      name: 'Migrated Team',
      description: 'Team created for existing users',
      owner: owner._id,
      members: users.map(u => u._id)
    });
    await team.save();
    teamId = team._id;
    console.log(`Created new team with ID: ${teamId}`);
  }

  // Update all users to be part of this team
  const result = await User.updateMany(
    { team: { $exists: false } }, // Only users without a team
    { $set: { team: teamId, role: 'member' } }
  );
  console.log(`Updated ${result.nModified || result.modifiedCount} users to team ${teamId}`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 
require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('./models/Project');
const User = require('./models/User');
const Team = require('./models/Team');

const MONGO_URI = process.env.MONGO_URI;
const TEAM_ID = '63809b866e12bdc279307383'; // Your new team ID

async function main() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  // Get a user to set as createdBy (use the first user in the team)
  const team = await Team.findById(TEAM_ID).populate('members');
  if (!team || !team.members.length) {
    console.log('Team or team members not found.');
    return;
  }
  const createdBy = team.members[0]._id;

  // Update all projects to belong to the team and set createdBy
  const result = await Project.updateMany(
    {}, // Update all projects
    {
      $set: {
        team: TEAM_ID,
        createdBy: createdBy,
        status: 'active'
      },
      $unset: { owner: '', members: '' }
    }
  );
  console.log(`Updated ${result.nModified || result.modifiedCount} projects to team ${TEAM_ID}`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 
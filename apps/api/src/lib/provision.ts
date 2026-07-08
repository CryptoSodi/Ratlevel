import { db } from "./db";
import { starterQuests } from "./seedData";

/** Gives a brand-new player their starter daily/weekly quests and blank achievement rows. */
export async function provisionNewPlayer(playerId: string): Promise<void> {
  await db.quest.createMany({
    data: starterQuests().map((quest) => ({ playerId, ...quest }))
  });

  const definitions = await db.achievementDefinition.findMany({ select: { id: true } });
  await db.playerAchievement.createMany({
    data: definitions.map((def) => ({ playerId, achievementId: def.id }))
  });

  const challenges = await db.challenge.findMany({ select: { id: true } });
  await db.challengeParticipant.createMany({
    data: challenges.map((challenge) => ({ challengeId: challenge.id, playerId, joined: false, progress: 0 }))
  });
}

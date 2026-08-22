export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  createdAt: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface UnlockResult {
  success: boolean;
  alreadyUnlocked: boolean;
  achievement: Pick<Achievement, 'id' | 'key' | 'title' | 'description' | 'icon'>;
}

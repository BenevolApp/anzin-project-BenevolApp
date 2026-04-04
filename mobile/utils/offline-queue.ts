import { createMMKV } from 'react-native-mmkv';
import { supabase } from '@/utils/supabase/client';

const storage = createMMKV({ id: 'benevolapp-offline-queue' });
const QUEUE_KEY = 'pointage_queue';

export type PointageQueueEntry = {
  id: string;
  intervention_id: string;
  type: 'check_in' | 'check_out';
  timestamp: string;
};

export function enqueuePointage(entry: Omit<PointageQueueEntry, 'id'>): void {
  const queue = getQueue();
  const newEntry: PointageQueueEntry = {
    ...entry,
    id: Math.random().toString(36).slice(2),
  };
  queue.push(newEntry);
  storage.set(QUEUE_KEY, JSON.stringify(queue));
}

export function getQueue(): PointageQueueEntry[] {
  const raw = storage.getString(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PointageQueueEntry[];
  } catch {
    return [];
  }
}

function removeFromQueue(id: string): void {
  const queue = getQueue().filter((e) => e.id !== id);
  storage.set(QUEUE_KEY, JSON.stringify(queue));
}

export async function flushQueue(): Promise<number> {
  const queue = getQueue();
  if (queue.length === 0) return 0;

  let flushed = 0;

  for (const entry of queue) {
    const field = entry.type === 'check_in' ? 'check_in_time' : 'check_out_time';

    if (entry.type === 'check_in') {
      const { error } = await supabase.from('pointages').insert({
        intervention_id: entry.intervention_id,
        check_in_time: entry.timestamp,
      });
      if (!error) {
        await supabase
          .from('mission_interventions')
          .update({ status: 'done' })
          .eq('id', entry.intervention_id);
        removeFromQueue(entry.id);
        flushed++;
      }
    } else {
      const { error } = await supabase
        .from('pointages')
        .update({ [field]: entry.timestamp })
        .eq('intervention_id', entry.intervention_id);
      if (!error) {
        removeFromQueue(entry.id);
        flushed++;
      }
    }
  }

  return flushed;
}

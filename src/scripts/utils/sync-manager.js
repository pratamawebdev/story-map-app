import StoryApi from '../data/api';
import StoryDb from '../data/story-db';
import { rememberLastCreatedStoryUrl, showLocalNotification } from './service-worker';

function buildFileFromPendingStory(pendingStory) {
  if (pendingStory.photo instanceof File) {
    return pendingStory.photo;
  }

  return new File([pendingStory.photo], pendingStory.photoName, {
    type: pendingStory.photoType || pendingStory.photo?.type || 'image/jpeg',
  });
}

export async function syncPendingStories({ onUpdate } = {}) {
  if (!navigator.onLine) {
    const pendingCount = await StoryDb.countPendingStories();
    onUpdate?.({ synced: 0, failed: 0, pending: pendingCount });
    return { synced: 0, failed: 0, pending: pendingCount };
  }

  const pendingStories = await StoryDb.getPendingStories();
  let synced = 0;
  let failed = 0;

  for (const pendingStory of pendingStories) {
    try {
      await StoryApi.addStory({
        description: pendingStory.description,
        photo: buildFileFromPendingStory(pendingStory),
        lat: pendingStory.lat,
        lon: pendingStory.lon,
      });

      try {
        const latestResponse = await StoryApi.getStories({ page: 1, size: 1, location: 1 });
        const latestStory = latestResponse.listStory?.[0];
        if (latestStory?.id) {
          await rememberLastCreatedStoryUrl(`./#/stories/${latestStory.id}`);
        }
      } catch (error) {
        await rememberLastCreatedStoryUrl('./#/');
      }

      await StoryDb.deletePendingStory(pendingStory.localId);
      synced += 1;
      onUpdate?.({ synced, failed, pending: pendingStories.length - synced - failed });
    } catch (error) {
      failed += 1;
      onUpdate?.({ synced, failed, pending: pendingStories.length - synced - failed });
    }
  }

  if (synced > 0) {
    await showLocalNotification('Story offline berhasil disinkronkan', {
      body: `${synced} story tertunda berhasil dikirim ke server.`,
      data: { url: './#/' },
      actions: [{ action: 'open-story', title: 'Buka beranda' }],
    });
  }

  const pending = await StoryDb.countPendingStories();
  return { synced, failed, pending };
}

export function registerOnlineSync() {
  window.addEventListener('online', () => {
    syncPendingStories().catch((error) => {
      console.error('Gagal sinkronisasi story offline:', error);
    });
  });
}

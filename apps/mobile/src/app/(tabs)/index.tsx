import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PostCard } from '../../components/PostCard';
import { Chip, Empty, Row } from '../../components/ui';
import { api } from '../../lib/api';
import { useApproxLocation } from '../../lib/location';
import type { Page, Post } from '../../lib/types';
import { colors, space } from '../../lib/theme';

type Mode = 'for-me' | 'nearby' | 'following';
const MODES: { mode: Mode; label: string }[] = [
  { mode: 'for-me', label: 'Adatti a me' },
  { mode: 'nearby', label: 'Vicino a me' },
  { mode: 'following', label: 'Chi seguo' },
];

export default function Feed() {
  const [mode, setMode] = useState<Mode>('for-me');
  const { coords } = useApproxLocation();

  const q = useInfiniteQuery({
    queryKey: ['feed', mode, mode === 'nearby' ? coords : null],
    enabled: mode !== 'nearby' || Boolean(coords),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api<Page<Post>>('/feed', { query: { mode, cursor: pageParam, lat: coords?.lat, lng: coords?.lng } }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const posts = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <FlatList
      data={posts}
      keyExtractor={(p) => p.id}
      contentContainerStyle={{ padding: space(4), gap: space(4) }}
      ListHeaderComponent={
        <Row wrap>
          {MODES.map((m) => <Chip key={m.mode} label={m.label} selected={mode === m.mode} onPress={() => setMode(m.mode)} />)}
        </Row>
      }
      renderItem={({ item }) => <PostCard post={item} />}
      onEndReached={() => q.hasNextPage && q.fetchNextPage()}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => { void q.refetch(); }} tintColor={colors.primary} />}
      ListEmptyComponent={
        q.isLoading ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} /> : (
          <Empty text={mode === 'nearby' && !coords ? 'Attiva la posizione per vedere i posti vicini.' : 'Ancora nessun post qui. Condividi il primo posto che ti è piaciuto!'} />
        )
      }
      ListFooterComponent={q.isFetchingNextPage ? <View style={{ padding: 20 }}><ActivityIndicator color={colors.primary} /></View> : undefined}
    />
  );
}

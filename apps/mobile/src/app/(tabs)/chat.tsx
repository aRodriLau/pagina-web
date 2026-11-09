import { useCallback } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Empty } from '../../components/ui';
import { api } from '../../lib/api';
import { useSocketEvent } from '../../lib/socket';
import type { Conversation } from '../../lib/types';
import { colors, font, space } from '../../lib/theme';

export default function ChatList() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['conversations'], queryFn: () => api<{ items: Conversation[] }>('/conversations') });
  useSocketEvent('message:new', useCallback(() => { qc.invalidateQueries({ queryKey: ['conversations'] }); }, [qc]));

  return (
    <FlatList
      data={q.data?.items ?? []}
      keyExtractor={(c) => c.id}
      contentContainerStyle={{ padding: space(4), gap: space(2) }}
      ListEmptyComponent={<Empty text="Nessuna conversazione. Scrivi a chi ha pubblicato un posto per chiedere consigli!" />}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/chat/${item.id}`)} style={{ flexDirection: 'row', alignItems: 'center', padding: space(4), gap: space(3), backgroundColor: colors.surface, borderRadius: 14 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: font.lg, fontWeight: item.unread ? '800' : '600' }}>
              {item.title ?? item.members.map((m) => m.displayName).join(', ')}
            </Text>
            {item.lastMessage ? <Text numberOfLines={1} style={{ fontSize: font.md, color: colors.muted }}>{item.lastMessage.body}</Text> : null}
          </View>
          {item.unread ? <View accessibilityLabel="Non letto" style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.accent }} /> : null}
        </Pressable>
      )}
    />
  );
}

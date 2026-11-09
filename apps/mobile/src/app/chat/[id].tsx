import { useCallback, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useSocketEvent } from '../../lib/socket';
import type { Message, Page } from '../../lib/types';
import { colors, font, MIN_TOUCH, space } from '../../lib/theme';

export default function ChatRoom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<{ id: string }>('/me') });
  const key = ['messages', id];

  const q = useInfiniteQuery({
    queryKey: key,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api<Page<Message>>(`/conversations/${id}/messages`, { query: { cursor: pageParam } }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const prepend = useCallback((m: Message) => {
    qc.setQueryData<InfiniteData<Page<Message>>>(key, (data) => {
      if (!data || data.pages[0]?.items.some((x) => x.id === m.id)) return data;
      const [first, ...rest] = data.pages;
      return { ...data, pages: [{ ...first, items: [m, ...first.items] }, ...rest] };
    });
  }, [qc, id]); // eslint-disable-line react-hooks/exhaustive-deps

  useSocketEvent<Message & { conversationId: string }>('message:new', useCallback((m) => {
    if (m.conversationId === id) prepend(m);
  }, [id, prepend]));

  const send = useMutation({
    mutationFn: (body: string) => api<Message>(`/conversations/${id}/messages`, { method: 'POST', body: { body } }),
    onSuccess: (m) => { prepend(m); setText(''); },
  });

  const messages = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        inverted
        data={messages}
        keyExtractor={(m) => m.id}
        onEndReached={() => q.hasNextPage && q.fetchNextPage()}
        contentContainerStyle={{ padding: space(3), gap: space(2) }}
        renderItem={({ item }) => {
          const mine = item.senderId === me.data?.id;
          return (
            <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%', backgroundColor: mine ? colors.primary : colors.surface, padding: space(3), borderRadius: 16 }}>
              <Text style={{ fontSize: font.md, color: mine ? '#fff' : colors.text }}>{item.body}</Text>
              {item.place ? (
                <Pressable onPress={() => router.push(`/place/${item.place!.id}`)}>
                  <Text style={{ fontSize: font.sm, marginTop: 6, fontWeight: '700', color: mine ? '#fff' : colors.primary }}>📍 {item.place.name}</Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />
      <View style={{ flexDirection: 'row', gap: space(2), padding: space(3), borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Scrivi un messaggio…"
          accessibilityLabel="Messaggio"
          multiline
          style={{ flex: 1, minHeight: MIN_TOUCH, fontSize: font.lg, paddingHorizontal: space(3), borderWidth: 1, borderColor: colors.border, borderRadius: 24 }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Invia"
          disabled={!text.trim() || send.isPending}
          onPress={() => send.mutate(text.trim())}
          style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: text.trim() ? 1 : 0.5 }}
        >
          <Text style={{ color: '#fff', fontSize: font.lg, fontWeight: '700' }}>➤</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

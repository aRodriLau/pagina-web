import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Post } from '../lib/types';
import { categoryLabels, travelerLabels } from '../lib/labels';
import { colors, font, space } from '../lib/theme';

/**
 * Il post mette al centro il LUOGO, non la persona: nome del posto in alto,
 * info pratiche (con chi, quanto ho speso, età dei bimbi) e il pulsante "Utile".
 */
export function PostCard({ post }: { post: Post }) {
  const qc = useQueryClient();
  const helpful = useMutation({
    mutationFn: () => api(`/posts/${post.id}/helpful`, { method: post.markedHelpfulByMe ? 'DELETE' : 'PUT' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
      <Pressable onPress={() => router.push(`/place/${post.place.id}`)} style={{ padding: space(4), gap: 2 }}>
        <Text style={{ fontSize: font.lg, fontWeight: '700', color: colors.text }}>{post.place.name}</Text>
        <Text style={{ fontSize: font.sm, color: colors.muted }}>{categoryLabels[post.place.category]} · {post.place.city}</Text>
      </Pressable>
      {post.photos[0] ? (
        <Image
          source={post.photos[0].url}
          style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.border }}
          contentFit="cover"
          accessibilityLabel={`Foto di ${post.place.name}`}
        />
      ) : null}
      <View style={{ padding: space(4), gap: space(2) }}>
        <Text style={{ fontSize: font.md }}>{'⭐'.repeat(post.rating)}{post.costPerPerson !== null ? `  ·  ${post.costPerPerson}€ a persona` : ''}</Text>
        {post.visitedWith.length ? (
          <Text style={{ fontSize: font.sm, color: colors.muted }}>
            {post.visitedWith.map((t) => travelerLabels[t]).join('  ')}
            {post.kidsAges.length ? `  (bimbi: ${post.kidsAges.join(', ')} anni)` : ''}
          </Text>
        ) : null}
        {post.caption ? <Text style={{ fontSize: font.md, color: colors.text, lineHeight: 24 }}>{post.caption}</Text> : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: font.sm, color: colors.muted }}>di {post.author.displayName}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={post.markedHelpfulByMe ? 'Togli utile' : 'Segna come utile'}
            onPress={() => helpful.mutate()}
            style={{ minHeight: 44, paddingHorizontal: space(3), borderRadius: 22, justifyContent: 'center', backgroundColor: post.markedHelpfulByMe ? colors.primary : colors.bg }}
          >
            <Text style={{ fontSize: font.md, fontWeight: '600', color: post.markedHelpfulByMe ? '#fff' : colors.primary }}>
              👍 Utile · {post.helpfulCount}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

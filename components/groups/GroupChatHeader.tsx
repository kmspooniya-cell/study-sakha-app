import React from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { ChevronLeft, MoreVertical, Plus, Search, X } from 'lucide-react-native';
import { useTheme } from '../../lib/theme';

export interface GroupChatHeaderProps {
  groupName: string;
  shortName: string;
  accentHex: string;
  membersCount?: number;
  memberLimit?: number;
  liveMemberCount: number;
  joined: boolean;
  joining: boolean;
  showSearchButton: boolean;
  searchOpen: boolean;
  searchQuery: string;
  onBack: () => void;
  onJoin: () => void;
  onOpenMenu: () => void;
  onToggleSearch: () => void;
  onChangeSearchQuery: (q: string) => void;
}

export const GroupChatHeader = React.memo(function GroupChatHeader({
  groupName,
  shortName,
  accentHex,
  membersCount,
  memberLimit,
  liveMemberCount,
  joined,
  joining,
  showSearchButton,
  searchOpen,
  searchQuery,
  onBack,
  onJoin,
  onOpenMenu,
  onToggleSearch,
  onChangeSearchQuery,
}: GroupChatHeaderProps) {
  const { colors, f } = useTheme();

  return (
    <View
      testID="group-chat-header"
      style={{
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
      }}
    >
      <View
        style={{
          minHeight: 58,
          paddingHorizontal: 8,
          paddingVertical: 6,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Pressable
          onPress={onBack}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Back to all groups"
          testID="group-chat-back-btn"
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
          })}
        >
          <ChevronLeft size={22} color={colors.textPrimary} />
        </Pressable>

        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: accentHex,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: f(13.5) }}>
            {shortName}
          </Text>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: f(15.5),
              fontWeight: '700',
              color: colors.textPrimary,
              letterSpacing: -0.2,
            }}
          >
            {groupName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            {membersCount !== undefined && (
              <Text numberOfLines={1} style={{ fontSize: f(11.5), color: colors.textSecondary }}>
                {membersCount}
                {memberLimit !== undefined ? `/${memberLimit}` : ''} members
              </Text>
            )}
            {liveMemberCount > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: colors.green,
                  }}
                />
                <Text style={{ fontSize: f(11.5), fontWeight: '600', color: colors.green }}>
                  {liveMemberCount} studying
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          {!joined && (
            <Pressable
              onPress={onJoin}
              disabled={joining}
              accessibilityRole="button"
              accessibilityLabel="Join group"
              style={({ pressed }) => ({
                minHeight: 36,
                paddingHorizontal: 12,
                borderRadius: 18,
                backgroundColor: pressed ? colors.blue : colors.brandPrimary,
                opacity: joining ? 0.7 : 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                marginRight: 4,
              })}
            >
              {joining ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Plus size={14} color="#FFFFFF" />
                  <Text style={{ fontSize: f(12), fontWeight: '700', color: '#FFFFFF' }}>
                    Join
                  </Text>
                </>
              )}
            </Pressable>
          )}

          {joined && showSearchButton && (
            <Pressable
              onPress={onToggleSearch}
              accessibilityRole="button"
              accessibilityLabel={searchOpen ? 'Close message search' : 'Search messages'}
              accessibilityState={{ expanded: searchOpen }}
              testID="group-chat-search-btn"
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: searchOpen || pressed ? colors.surfaceAlt : 'transparent',
              })}
            >
              <Search size={20} color={searchOpen ? colors.blue : colors.textSecondary} />
            </Pressable>
          )}

          <Pressable
            onPress={onOpenMenu}
            accessibilityRole="button"
            accessibilityLabel="Group options"
            testID="group-chat-more-btn"
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
            })}
          >
            <MoreVertical size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {searchOpen && (
        <View
          style={{
            paddingHorizontal: 14,
            paddingBottom: 10,
            paddingTop: 2,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 40,
              borderRadius: 12,
              paddingHorizontal: 12,
              gap: 8,
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
            }}
          >
            <Search size={16} color={colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={onChangeSearchQuery}
              placeholder="Search messages in this channel…"
              placeholderTextColor={colors.textMuted}
              autoFocus
              returnKeyType="search"
              style={{
                flex: 1,
                fontSize: f(13.5),
                color: colors.textPrimary,
                paddingVertical: 6,
              }}
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => onChangeSearchQuery('')}
                hitSlop={8}
                accessibilityLabel="Clear search"
                style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={15} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
});

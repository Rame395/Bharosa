import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { T } from '../designSystem';

interface ProviderCardProps {
  name: string;
  isVerified: boolean;
  guarantorName: string;
  rating: string;
  priceRange: string;
  isFixedPrice: boolean;
  responseTime: string;
  onPress: () => void;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({
  name,
  isVerified,
  guarantorName,
  rating,
  priceRange,
  isFixedPrice,
  responseTime,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.headerRow}>
        <Text style={styles.name}>{name}</Text>
        {isVerified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Verified</Text>
          </View>
        )}
      </View>

      <Text style={styles.guarantorText}>Vouched by {guarantorName}</Text>
      
      <View style={styles.statsRow}>
        <Text style={styles.rating}>★ {rating}</Text>
        <Text style={styles.responseTime}>⏱ {responseTime}</Text>
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.price}>{priceRange}</Text>
        <View style={[styles.priceTypeBadge, { backgroundColor: isFixedPrice ? T.colors.success : T.colors.warning }]}>
          <Text style={styles.priceTypeText}>{isFixedPrice ? 'Fixed Price' : 'Estimate'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.colors.surface,
    borderRadius: T.radius.medium,
    padding: T.spacing.md,
    marginBottom: T.spacing.md,
    ...T.shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: T.spacing.xs,
  },
  name: {
    ...T.typography.subheading,
  },
  verifiedBadge: {
    backgroundColor: T.colors.primary,
    paddingHorizontal: T.spacing.sm,
    paddingVertical: 2,
    borderRadius: T.radius.pill,
  },
  verifiedText: {
    ...T.typography.caption,
    color: '#FFF',
    fontWeight: 'bold',
  },
  guarantorText: {
    ...T.typography.body,
    color: T.colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: T.spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: T.spacing.md,
    marginBottom: T.spacing.md,
  },
  rating: {
    ...T.typography.body,
    fontWeight: 'bold',
  },
  responseTime: {
    ...T.typography.body,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: T.colors.border,
    paddingTop: T.spacing.sm,
  },
  price: {
    ...T.typography.heading,
  },
  priceTypeBadge: {
    paddingHorizontal: T.spacing.sm,
    paddingVertical: 4,
    borderRadius: T.radius.small,
  },
  priceTypeText: {
    ...T.typography.caption,
    color: '#FFF',
    fontWeight: '600',
  }
});

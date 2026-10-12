import React from 'react'
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../lib/ui'

interface FabProps {
  onPress: () => void
  style?: ViewStyle
}

export function Fab({ onPress, style }: FabProps) {
  return (
    <TouchableOpacity
      style={[styles.fab, style]}
      onPress={onPress}
      accessibilityLabel="Quick actions"
      accessibilityRole="button"
      activeOpacity={0.8}
    >
      <Ionicons name="add" size={32} color="#fff" />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 80,
    left: '50%',
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
})

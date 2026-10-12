import React from 'react'
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native'
import { colors } from '../lib/brand'
import { Button } from '../lib/ui'

export interface BottomSheetProps {
  title?: string
  children?: React.ReactNode
  visible: boolean
  onClose: () => void
  actions?: { label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }[]
}

export const BottomSheet = ({ title, children, visible, onClose, actions }: BottomSheetProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.preventDefault()}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <View style={styles.content}>{children}</View>
          {actions && actions.length > 0 && (
            <View style={styles.actions}>
              {actions.map((a, i) => (
                <Button
                  key={i}
                  title={a.label}
                  onPress={() => { onClose(); a.onPress() }}
                  variant={a.variant ?? 'primary'}
                  style={{ flex: actions.length === 1 ? 1 : undefined, marginHorizontal: actions.length > 1 ? 4 : 0 }}
                />
              ))}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  content: { paddingBottom: 12 },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
})

import React, { useRef, useEffect, useState } from 'react'
import { View, Pressable, StyleSheet, Text, ViewStyle, TextStyle } from 'react-native'
import { gsap } from 'gsap'
import AnimatedLogo, { type AnimatedLogoPathRefs } from '../components/AnimatedLogo'
import { APP_NAME, TAGLINE, colors } from '../lib/brand'

export default function Splash({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<View>(null)
  const logoContainerRef = useRef<View>(null)
  const logoGroupRef = useRef<View>(null)
  const wordmarkRef = useRef<View>(null)
  const [showHint, setShowHint] = useState(false)
  const isLoaded = useRef(false)
  const isClicked = useRef(false)

  const l1Ref = useRef<any>(null)
  const l2Ref = useRef<any>(null)
  const l3Ref = useRef<any>(null)
  const l4Ref = useRef<any>(null)
  const l5Ref = useRef<any>(null)

  const pathRefs: AnimatedLogoPathRefs = {
    l1: l1Ref,
    l2: l2Ref,
    l3: l3Ref,
    l4: l4Ref,
    l5: l5Ref,
  }

  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleEnterRef = useRef<() => void>(() => {})

  const handleEnter = () => {
    if (isClicked.current || !isLoaded.current) return
    isClicked.current = true
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current)
    if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current)
    setShowHint(false)

    gsap.killTweensOf([
      l1Ref.current,
      l2Ref.current,
      l3Ref.current,
      l4Ref.current,
      l5Ref.current,
    ])

    const tl = gsap.timeline({
      onComplete: () => {
        onComplete()
      },
    })

    tl.to(logoGroupRef.current, {
      scale: 0.95,
      duration: 0.1,
      ease: 'power2.out',
    }, 0)
    tl.to(wordmarkRef.current, {
      x: 24,
      opacity: 0,
      duration: 0.22,
      ease: 'power2.out',
    }, 0.05)
    tl.to(logoGroupRef.current, {
      scale: 1,
      duration: 0.15,
      ease: 'power2.out',
    }, 0.1)
    tl.to(logoContainerRef.current, {
      scale: 1.08,
      duration: 0.35,
      ease: 'power3.inOut',
    }, 0.15)
    tl.to(logoContainerRef.current, {
      scale: 40,
      duration: 0.85,
      ease: 'power2.inOut',
    }, 0.4)
    tl.to([
      l1Ref.current,
      l2Ref.current,
      l3Ref.current,
      l4Ref.current,
      l5Ref.current,
    ], {
      opacity: 0,
      duration: 0.85,
      ease: 'power2.inOut',
    }, 0.4)
    tl.to(containerRef.current, {
      backgroundColor: '#000000',
      duration: 0.6,
      ease: 'power3.in',
    }, 0.9)
  }

  const handlePress = () => {
    if (isLoaded.current && !isClicked.current) {
      handleEnterRef.current()
    }
  }

  useEffect(() => {
    handleEnterRef.current = handleEnter
  })

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.15 })

    tl.fromTo(
      logoContainerRef.current,
      { scale: 0.94, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, ease: 'power2.out' }
    )
    tl.fromTo(
      l5Ref.current,
      { rotation: -5 },
      { rotation: 0, duration: 0.8, ease: 'power3.out' },
      0.15
    )
    tl.fromTo(
      l4Ref.current,
      { rotation: 8 },
      { rotation: 0, duration: 0.85, ease: 'power3.out' },
      0.12
    )
    tl.fromTo(
      l3Ref.current,
      { rotation: -10 },
      { rotation: 0, duration: 0.85, ease: 'power3.out' },
      0.1
    )
    tl.fromTo(
      l2Ref.current,
      { rotation: 14 },
      { rotation: 0, duration: 0.9, ease: 'power3.out' },
      0.08
    )
    tl.fromTo(
      l1Ref.current,
      { rotation: -18 },
      { rotation: 0, duration: 0.9, ease: 'power3.out' },
      0.05
    )
    tl.fromTo(
      wordmarkRef.current,
      { y: 12, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.7,
        ease: 'power3.out',
        onComplete: () => {
          isLoaded.current = true
          hintTimeoutRef.current = setTimeout(() => {
            if (!isClicked.current) setShowHint(true)
          }, 1200)
          autoTimeoutRef.current = setTimeout(() => {
            if (!isClicked.current) handleEnterRef.current()
          }, 3000)
        },
      },
      0.4
    )

    return () => {
      tl.kill()
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current)
      if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current)
    }
  }, [])

  return (
    <Pressable
      style={styles.pressable}
      onPress={handlePress}
    >
      <View
        ref={containerRef}
        style={styles.container}
        pointerEvents="box-none"
      >
        <View ref={logoGroupRef} style={styles.logoGroup} pointerEvents="none">
          <View
            ref={logoContainerRef}
            style={[styles.logoContainer]}
            pointerEvents="none"
          >
            <AnimatedLogo pathRefs={pathRefs} />
            {showHint && (
              <View
                style={[
                  styles.hint,
                  { borderColor: `${colors.primary}60` },
                ]}
              />
            )}
          </View>
            <View
              ref={wordmarkRef}
              style={styles.wordmark}
              pointerEvents="none"
            >
              <Text style={styles.wordmarkTitle}>{APP_NAME}</Text>
              <Text style={styles.wordmarkSubtitle}>{TAGLINE}</Text>
            </View>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create<{
  pressable: ViewStyle
  container: ViewStyle
  logoGroup: ViewStyle
  logoContainer: ViewStyle
  wordmark: ViewStyle
  wordmarkTitle: TextStyle
  wordmarkSubtitle: TextStyle
  hint: ViewStyle
}>({
  pressable: {
    flex: 1,
    backgroundColor: '#fff5f1',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff5f1',
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 26,
    paddingHorizontal: 32,
    maxWidth: 596,
  },
  logoContainer: {
    width: 230.52,
    aspectRatio: '1',
    opacity: 0,
  },
  wordmark: {
    opacity: 0,
    alignItems: 'center',
  },
  wordmarkTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.dark,
    textAlign: 'center',
  },
  wordmarkSubtitle: {
    fontSize: 13,
    color: colors.primary,
    textAlign: 'center',
    marginTop: 2,
  },
  hint: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    transform: [{ translateX: -32 }, { translateY: -32 }],
    opacity: 0.3,
  },
})

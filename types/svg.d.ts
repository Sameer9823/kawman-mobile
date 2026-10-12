declare module '*.svg' {
  import React from 'react'
  import { ViewStyle, StyleProp } from 'react-native'

  const ReactComponent: React.FC<React.SVGProps<import('react-native-svg').Svg> & {
    style?: StyleProp<ViewStyle>
  }>

  export default ReactComponent
}

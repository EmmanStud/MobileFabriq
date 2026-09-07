import { useWindowDimensions } from 'react-native';

// Baseline reference design width/height (standard mobile design frame)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const scale = (size) => (width / BASE_WIDTH) * size;
  const verticalScale = (size) => (height / BASE_HEIGHT) * size;
  // moderateScale softens the effect so text/spacing doesn't shrink as
  // aggressively as raw width ratio would (factor 0..1, 0.5 is a good default)
  const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

  return { width, height, scale, verticalScale, moderateScale };
}

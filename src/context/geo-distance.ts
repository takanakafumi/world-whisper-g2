import type { ContextSnapshot } from './context-snapshot.ts'

const earthRadiusMeters = 6_371_000
const toRadians = (degrees: number) => degrees * Math.PI / 180

export const geographicDistanceMeters = (
  first: Pick<ContextSnapshot, 'latitude' | 'longitude'>,
  second: Pick<ContextSnapshot, 'latitude' | 'longitude'>,
): number => {
  const firstLatitude = toRadians(first.latitude)
  const secondLatitude = toRadians(second.latitude)
  const latitudeDelta = secondLatitude - firstLatitude
  const longitudeDelta = toRadians(second.longitude - first.longitude)

  const haversine = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) * Math.cos(secondLatitude) *
    Math.sin(longitudeDelta / 2) ** 2

  const clampedHaversine = Math.min(1, Math.max(0, haversine))
  return earthRadiusMeters * 2 * Math.atan2(
    Math.sqrt(clampedHaversine),
    Math.sqrt(1 - clampedHaversine),
  )
}

export const accuracyAdjustedDistanceMeters = (
  first: ContextSnapshot,
  second: ContextSnapshot,
): number => {
  const accuracyAllowance = Math.max(
    first.accuracyMeters ?? 0,
    second.accuracyMeters ?? 0,
  )
  return Math.max(0, geographicDistanceMeters(first, second) - accuracyAllowance)
}

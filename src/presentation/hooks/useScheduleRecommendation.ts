import type { ScheduleRecommendationDto } from '@/application/dto/ScheduleRecommendationDto'
import { useCases } from '@/app/providers/dependencies'

import { useAsync, type UseAsyncResult } from './useAsync'

export function useScheduleRecommendation(
  passengerId: string,
): UseAsyncResult<ScheduleRecommendationDto> {
  return useAsync(() => useCases.getScheduleRecommendation.execute(passengerId), [passengerId])
}

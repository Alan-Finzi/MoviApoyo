import { useCases } from '@/app/providers/dependencies'

import { useAsync, type UseAsyncResult } from './useAsync'
import { useLiveTripUpdates } from './useLiveTripUpdates'
import type { DashboardSummaryDto } from '@/application/dto/DashboardSummaryDto'

export function useDashboardSummary(): UseAsyncResult<DashboardSummaryDto> {
  const result = useAsync(() => useCases.getDashboardSummary.execute(), [])
  useLiveTripUpdates(result.reload)
  return result
}

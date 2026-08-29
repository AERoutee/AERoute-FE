import { colorBlockedPathIcon, colorConstructionIcon, colorCrashIcon, colorHazardIcon, colorMapIssueIcon } from '@/assets'
import type { RoadReportCategory } from '@/types'

export const roadReportIcons = {
  HAZARD: colorHazardIcon,
  BLOCKED_PATH: colorBlockedPathIcon,
  CRASH: colorCrashIcon,
  CONSTRUCTION: colorConstructionIcon,
  MAP_ISSUE: colorMapIssueIcon,
} satisfies Record<RoadReportCategory, string>

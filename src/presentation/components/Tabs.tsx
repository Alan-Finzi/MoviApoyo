import { useState } from 'react'
import type { ReactNode } from 'react'

import { classNames } from '@/shared/utils/classNames'

import styles from './Tabs.module.css'

export interface TabItem {
  readonly id: string
  readonly label: string
  readonly content: ReactNode
}

interface TabsProps {
  readonly tabs: readonly TabItem[]
}

export function Tabs({ tabs }: TabsProps) {
  const firstTabId = tabs[0]?.id ?? ''
  const [activeId, setActiveId] = useState(firstTabId)
  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0]

  return (
    <div>
      <div className={styles.tabList} role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeId}
            className={classNames(styles.tab, tab.id === activeId && styles.tabActive)}
            onClick={() => setActiveId(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{activeTab?.content}</div>
    </div>
  )
}

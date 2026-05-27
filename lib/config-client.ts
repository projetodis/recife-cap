'use client'

import { useState, useEffect } from 'react'

export function useConfig(): Record<string, string> {
  const [configs, setConfigs] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(setConfigs)
      .catch(() => {})
  }, [])

  return configs
}

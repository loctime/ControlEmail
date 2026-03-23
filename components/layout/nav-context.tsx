"use client"

import { createContext, useContext } from "react"

interface NavContextValue {
  collapsed: boolean
  collapse: () => void
  toggle: () => void
}

export const NavContext = createContext<NavContextValue>({
  collapsed: false,
  collapse: () => {},
  toggle: () => {},
})

export function useNav() {
  return useContext(NavContext)
}

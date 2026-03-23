"use client"

import { createContext, useContext } from "react"

interface NavContextValue {
  collapsed: boolean
  collapse: () => void
  expand: () => void
  toggle: () => void
}

export const NavContext = createContext<NavContextValue>({
  collapsed: false,
  collapse: () => {},
  expand: () => {},
  toggle: () => {},
})

export function useNav() {
  return useContext(NavContext)
}

'use client'

import { useEffect, useState, useRef } from 'react'

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 })
  const [smoothPosition, setSmoothPosition] = useState({ x: -100, y: -100 })
  const [isHovering, setIsHovering] = useState(false)
  const [isClicking, setIsClicking] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const frameRef = useRef<number>(0)

  // Handle SSR - only render on client
  useEffect(() => {
    // Check if device has a fine pointer (mouse) - this works even on devices with both touch and mouse
    const hasMouse = window.matchMedia('(pointer: fine)').matches ||
                     window.matchMedia('(any-pointer: fine)').matches

    // Only disable on pure touch devices (no mouse available)
    const isPureTouchDevice = !hasMouse && (
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(hover: none)').matches
    )

    if (isPureTouchDevice) {
      setIsMounted(false)
      return
    }

    setIsMounted(true)

    // Mouse move handler - also check if at edge of viewport
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX
      const y = e.clientY

      // Check if mouse is at or beyond edges (leaving viewport)
      const atEdge = x <= 0 || y <= 0 || x >= window.innerWidth - 1 || y >= window.innerHeight - 1

      setPosition({ x, y })
      setIsVisible(!atEdge)
    }

    // Mouse leaves the document entirely
    const handleMouseLeave = () => {
      setIsVisible(false)
    }

    // Mouse enters the document
    const handleMouseEnter = (e: MouseEvent) => {
      const x = e.clientX
      const y = e.clientY
      // Only show if actually inside viewport
      const inside = x > 0 && y > 0 && x < window.innerWidth - 1 && y < window.innerHeight - 1
      setIsVisible(inside)
    }

    // Backup: visibilitychange and blur
    const handleVisibilityChange = () => {
      if (document.hidden) setIsVisible(false)
    }

    const handleBlur = () => setIsVisible(false)
    const handleFocus = () => setIsVisible(true)

    // Click handlers
    const handleMouseDown = () => setIsClicking(true)
    const handleMouseUp = () => setIsClicking(false)

    // Hover detection for interactive elements
    const handleElementMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const isInteractive =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('button') ||
        target.closest('a') ||
        target.hasAttribute('data-cursor-hover') ||
        target.closest('[data-cursor-hover]') ||
        window.getComputedStyle(target).cursor === 'pointer'

      setIsHovering(!!isInteractive)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.documentElement.addEventListener('mouseleave', handleMouseLeave)
    document.documentElement.addEventListener('mouseenter', handleMouseEnter)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mouseover', handleElementMouseOver)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave)
      document.documentElement.removeEventListener('mouseenter', handleMouseEnter)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mouseover', handleElementMouseOver)
      cancelAnimationFrame(frameRef.current)
    }
  }, [])

  // Smooth animation loop
  useEffect(() => {
    if (!isMounted) return

    const animate = () => {
      setSmoothPosition(prev => ({
        x: prev.x + (position.x - prev.x) * 0.15,
        y: prev.y + (position.y - prev.y) * 0.15
      }))
      frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(frameRef.current)
  }, [position, isMounted])

  // Don't render until mounted (avoids SSR issues)
  if (!isMounted) return null

  return (
    <>
      {/* Outer ring - follows with lag */}
      <div
        className="custom-cursor-ring"
        style={{
          left: smoothPosition.x,
          top: smoothPosition.y,
          opacity: isVisible ? 1 : 0,
          transform: `translate(-50%, -50%) scale(${isClicking ? 0.8 : isHovering ? 1.5 : 1})`,
          width: isHovering ? '40px' : '32px',
          height: isHovering ? '40px' : '32px',
          borderWidth: isHovering ? '2px' : '1px'
        }}
      />

      {/* Inner dot - follows cursor exactly */}
      <div
        className="custom-cursor-dot"
        style={{
          left: position.x,
          top: position.y,
          opacity: isVisible ? 1 : 0,
          transform: `translate(-50%, -50%) scale(${isClicking ? 1.5 : isHovering ? 0 : 1})`
        }}
      />
    </>
  )
}
